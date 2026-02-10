import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";

import { ConfigUpdateSchema } from "@debug-pi/shared";
import type { Config, ConfigUpdate, DaemonResponse } from "@debug-pi/shared";

import { applyConfigUpdate, loadConfig } from "./config";
import { sendDaemonRequest } from "./daemon-client";

const webRoot = join(import.meta.dir, "../../debug-pi-web/dist");
const resolvedWebRoot = resolve(webRoot);

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

const notFound = (): Response => new Response("Not Found", { status: 404 });
const forbidden = (): Response => jsonResponse({ error: "Forbidden" }, 403);
const authUnavailable = (): Response =>
  jsonResponse({ error: "Authentication is not configured" }, 503);

const requireAuth = (request: Request): Response | null => {
  const apiKey = process.env.DEBUG_PI_API_KEY;
  if (!apiKey) {
    return authUnavailable();
  }

  const provided = request.headers.get("x-debug-pi-key");
  return provided === apiKey ? null : forbidden();
};

const configErrorResponse = (error: { message: string }): Response => {
  const message = error.message ?? "Unknown error";
  const status =
    message.toLowerCase().includes("parse") || message.toLowerCase().includes("invalid")
      ? 400
      : 500;
  return jsonResponse({ error: message }, status);
};

const readText = (request: Request): Effect.Effect<string, Error> =>
  Effect.tryPromise({
    try: () => request.text(),
    catch: (error) => new Error(String(error)),
  });

const readRequestUpdate = (request: Request): Effect.Effect<ConfigUpdate, Error> =>
  Effect.flatMap(readText(request), (raw) =>
    Effect.try({
      try: () => ConfigUpdateSchema.parse(JSON.parse(raw)),
      catch: (error) => new Error(String(error)),
    }),
  );

const loadStatus = (): Effect.Effect<DaemonResponse, Error> =>
  sendDaemonRequest({ type: "status" }).pipe(Effect.mapError((error) => new Error(error.message)));

const applyDaemonConfig = (config: Config): Effect.Effect<DaemonResponse, Error> =>
  sendDaemonRequest({ type: "apply-config", config }).pipe(
    Effect.mapError((error) => new Error(error.message)),
  );

const sendSystemAction = (action: "reboot" | "shutdown"): Effect.Effect<DaemonResponse, Error> =>
  sendDaemonRequest({ type: "system", action }).pipe(
    Effect.mapError((error) => new Error(error.message)),
  );

const createLogStream = (): Effect.Effect<ReadableStream<Uint8Array>, Error> =>
  Effect.try({
    try: () => {
      const abortController = new AbortController();
      const process = Bun.spawn(["journalctl", "-f", "-o", "cat"], {
        stdout: "pipe",
        stderr: "pipe",
        signal: abortController.signal,
      });

      const encoder = new TextEncoder();
      let remainder = "";

      const transformer = new TransformStream<string, Uint8Array>({
        transform(chunk, controller) {
          const text = remainder + chunk;
          const parts = text.split("\n");
          const nextRemainder = parts.at(-1) ?? "";
          const lines = parts.slice(0, -1);
          remainder = nextRemainder;

          const payload = lines.reduce(
            (acc, line) => (line.length > 0 ? `${acc}data: ${line}\n\n` : acc),
            "",
          );

          if (payload.length > 0) {
            controller.enqueue(encoder.encode(payload));
          }
        },
        flush(controller) {
          if (remainder.length > 0) {
            controller.enqueue(encoder.encode(`data: ${remainder}\n\n`));
          }
        },
      });

      const logStream = process.stdout
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(transformer);

      const wrapped = new ReadableStream<Uint8Array>({
        start(controller) {
          const reader = logStream.getReader();
          const pump = (): void => {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                if (value) {
                  controller.enqueue(value);
                }
                pump();
              })
              .catch((error) => {
                controller.error(error);
              });
          };
          pump();
        },
        cancel() {
          abortController.abort();
          try {
            process.kill();
          } catch {
            return;
          }
        },
      });

      return wrapped;
    },
    catch: (error) => new Error(String(error)),
  });

const staticFileResponse = (path: string): Response =>
  existsSync(path) ? new Response(Bun.file(path)) : notFound();

const resolveAssetPath = (pathname: string): string | null => {
  let decoded = "";
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\0") || decoded.includes("..")) {
    return null;
  }

  const safePath = decoded === "/" ? "/index.html" : decoded;
  const resolved = resolve(webRoot, `.${safePath}`);

  return resolved.startsWith(`${resolvedWebRoot}/`) || resolved === resolvedWebRoot
    ? resolved
    : null;
};

const routeRequest = (request: Request): Promise<Response> => {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/api/config") {
    return Effect.runPromise(loadConfig().pipe(Effect.map((config) => jsonResponse(config))));
  }

  if (request.method === "PUT" && url.pathname === "/api/config") {
    const effect = Effect.gen(function* () {
      const update = yield* readRequestUpdate(request);
      const updated = yield* applyConfigUpdate(update);
      const applied = yield* Effect.either(applyDaemonConfig(updated));

      return jsonResponse({
        config: updated,
        applied: applied._tag === "Right",
        daemon: applied._tag === "Right" ? applied.right : applied.left.message,
      });
    }).pipe(
      Effect.match({
        onFailure: (error) => configErrorResponse(error),
        onSuccess: (response) => response,
      }),
    );

    return Effect.runPromise(effect);
  }

  if (request.method === "GET" && url.pathname === "/api/status") {
    return Effect.runPromise(loadStatus().pipe(Effect.map((status) => jsonResponse(status))));
  }

  if (request.method === "POST" && url.pathname === "/api/system/reboot") {
    const auth = requireAuth(request);
    if (auth) {
      return Promise.resolve(auth);
    }
    return Effect.runPromise(
      sendSystemAction("reboot").pipe(Effect.map((response) => jsonResponse(response))),
    );
  }

  if (request.method === "POST" && url.pathname === "/api/system/shutdown") {
    const auth = requireAuth(request);
    if (auth) {
      return Promise.resolve(auth);
    }
    return Effect.runPromise(
      sendSystemAction("shutdown").pipe(Effect.map((response) => jsonResponse(response))),
    );
  }

  if (request.method === "GET" && url.pathname === "/api/logs") {
    const effect = createLogStream().pipe(
      Effect.map(
        (stream) =>
          new Response(stream, {
            headers: {
              "content-type": "text/event-stream",
              "cache-control": "no-cache",
              connection: "keep-alive",
            },
          }),
      ),
    );

    return Effect.runPromise(effect);
  }

  if (request.method === "GET") {
    const assetPath = resolveAssetPath(url.pathname);
    return Promise.resolve(assetPath ? staticFileResponse(assetPath) : notFound());
  }

  return Promise.resolve(notFound());
};

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 3000,
  fetch: routeRequest,
});

console.log(`Server running at http://${server.hostname}:${server.port}`);
