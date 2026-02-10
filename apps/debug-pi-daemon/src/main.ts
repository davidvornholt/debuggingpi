import { promises as fs } from "node:fs";
import { createServer } from "node:net";
import { dirname } from "node:path";
import { Effect } from "effect";

import {
  ConfigSchema,
  DaemonRequestSchema,
  DaemonResponseSchema,
  defaultConfig,
} from "@debug-pi/shared";
import type { Config, DaemonRequest, DaemonResponse, DaemonStatus } from "@debug-pi/shared";

const socketPath = "/run/debug-pi.sock";
const configPath = "/etc/debug-pi/config.json";

type DaemonError = {
  readonly _tag: "DaemonError";
  readonly message: string;
};

const daemonError = (message: string): DaemonError => ({
  _tag: "DaemonError",
  message,
});

type DaemonIoError = {
  readonly _tag: "DaemonIoError";
  readonly error: unknown;
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const readConfig = (): Effect.Effect<Config, DaemonError> =>
  Effect.tryPromise({
    try: () => fs.readFile(configPath, "utf-8"),
    catch: (error) => ({ _tag: "DaemonIoError", error }),
  }).pipe(
    Effect.catchAll((error) =>
      isErrnoException(error.error) && error.error.code === "ENOENT"
        ? Effect.succeed(JSON.stringify(defaultConfig))
        : Effect.fail(daemonError(`Failed to read config: ${String(error.error)}`)),
    ),
    Effect.flatMap((raw) =>
      Effect.try({
        try: () => ConfigSchema.parse(JSON.parse(raw)),
        catch: (error) => daemonError(`Invalid config: ${String(error)}`),
      }),
    ),
  );

const now = (): string => new Date().toISOString();

const makeStatus = (): Effect.Effect<DaemonStatus, DaemonError> =>
  Effect.map(readConfig(), (config) => ({
    ap: {
      running: config.ap.ssid.length > 0,
    },
    usb: {
      active: config.usb.enabled,
    },
    updatedAt: now(),
  }));

const runSystemAction = (action: "reboot" | "shutdown"): Effect.Effect<void, DaemonError> =>
  Effect.try({
    try: () => {
      const command = action === "reboot" ? "reboot" : "poweroff";
      Bun.spawn(["systemctl", command]);
    },
    catch: (error) => daemonError(`Failed to run system action: ${String(error)}`),
  });

const handleRequest = (request: DaemonRequest): Effect.Effect<DaemonResponse, DaemonError> => {
  if (request.type === "status") {
    return Effect.map(makeStatus(), (status) => ({ type: "status", status }));
  }

  if (request.type === "system") {
    return Effect.gen(function* () {
      yield* runSystemAction(request.action);
      const status = yield* makeStatus();
      return { type: "system", accepted: true, status };
    });
  }

  return Effect.map(makeStatus(), (status) => ({ type: "applied", status }));
};

const ensureSocketDir = (): Effect.Effect<void, DaemonError> =>
  Effect.tryPromise({
    try: () => fs.mkdir(dirname(socketPath), { recursive: true }),
    catch: (error) => daemonError(`Failed to create socket dir: ${String(error)}`),
  });

const removeStaleSocket = (): Effect.Effect<void, DaemonError> =>
  Effect.tryPromise({
    try: () => fs.rm(socketPath, { force: true }),
    catch: (error) => daemonError(`Failed to remove socket: ${String(error)}`),
  });

const startServer = (): Effect.Effect<void, DaemonError> =>
  Effect.async<void, DaemonError>((resume) => {
    const server = createServer((socket) => {
      let buffer = "";

      const handleData = (chunk: Buffer): void => {
        const text = buffer + chunk.toString("utf-8");
        const parts = text.split("\n");
        const nextBuffer = parts.at(-1) ?? "";
        const lines = parts.slice(0, -1).filter((line) => line.length > 0);
        buffer = nextBuffer;

        const responses = lines.map((line) =>
          Effect.runPromise(
            Effect.try({
              try: () => DaemonRequestSchema.parse(JSON.parse(line)),
              catch: (error) => daemonError(`Invalid request: ${String(error)}`),
            }).pipe(
              Effect.flatMap(handleRequest),
              Effect.match({
                onFailure: (error) => ({ type: "error", message: error.message }),
                onSuccess: (response) => response,
              }),
            ),
          ),
        );

        Promise.all(responses).then((results) => {
          const payload = results
            .map((response: unknown) => {
              const parsed = DaemonResponseSchema.safeParse(response);
              const result = parsed.success
                ? parsed.data
                : { type: "error", message: parsed.error.message };
              return JSON.stringify(result);
            })
            .join("\n");

          if (payload.length > 0) {
            socket.write(`${payload}\n`);
          }
        });
      };

      socket.on("data", handleData);
    });

    server.listen(socketPath, () => {
      resume(Effect.succeed(undefined));
    });

    server.on("error", (error) => {
      resume(Effect.fail(daemonError(`Daemon server error: ${String(error)}`)));
    });
  });

const program = Effect.gen(function* () {
  yield* ensureSocketDir();
  yield* removeStaleSocket();
  yield* startServer();
});

Effect.runPromise(program).catch(() => undefined);
