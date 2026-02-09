import { Effect, Stream, Schedule } from "effect";
import { HttpServer, HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { readConfig, updateConfig, writeConfig } from "./config.js";
import { getSystemStatus, getLogs, rebootSystem, shutdownSystem } from "./daemon-client.js";
import { DebugPiConfigSchema, APConfigSchema, DHCPConfigSchema, USBTetherConfigSchema } from "@debug-pi/shared";
import * as path from "node:path";

// Serve static files (the web UI)
const serveStatic = (filePath: string): Effect.Effect<HttpServerResponse.HttpServerResponse, Error> =>
  Effect.gen(function* () {
    const staticDir = path.join(import.meta.dir, "../../debug-pi-web/dist");
    const fullPath = path.join(staticDir, filePath);
    
    // For now, return a simple response indicating the UI would be served
    return yield* HttpServerResponse.text("UI will be served from here", { 
      status: 200,
      headers: { "Content-Type": "text/html" }
    });
  });

// Create HTTP router with all endpoints
const router = HttpRouter.empty.pipe(
  // Serve UI
  HttpRouter.get("/", Effect.flatMap(HttpServerRequest.HttpServerRequest, () => serveStatic("index.html"))),
  
  // Config endpoints
  HttpRouter.get(
    "/api/config",
    Effect.gen(function* () {
      const config = yield* readConfig();
      return yield* HttpServerResponse.json(config);
    }),
  ),
  
  HttpRouter.post(
    "/api/config",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const body = yield* Effect.tryPromise({
        try: () => req.json,
        catch: (error) => new Error(`Invalid JSON: ${String(error)}`),
      });
      
      const validated = DebugPiConfigSchema.parse(body);
      yield* writeConfig(validated);
      
      return yield* HttpServerResponse.json({ success: true });
    }),
  ),
  
  HttpRouter.patch(
    "/api/config",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const body = yield* Effect.tryPromise({
        try: () => req.json,
        catch: (error) => new Error(`Invalid JSON: ${String(error)}`),
      });
      
      const updated = yield* updateConfig(body);
      
      return yield* HttpServerResponse.json(updated);
    }),
  ),
  
  // Status endpoint
  HttpRouter.get(
    "/api/status",
    Effect.gen(function* () {
      const status = yield* getSystemStatus();
      return yield* HttpServerResponse.json(status);
    }),
  ),
  
  // System control endpoints
  HttpRouter.post(
    "/api/reboot",
    Effect.gen(function* () {
      yield* rebootSystem();
      return yield* HttpServerResponse.json({ success: true, message: "Rebooting..." });
    }),
  ),
  
  HttpRouter.post(
    "/api/shutdown",
    Effect.gen(function* () {
      yield* shutdownSystem();
      return yield* HttpServerResponse.json({ success: true, message: "Shutting down..." });
    }),
  ),
  
  // Log streaming endpoint (SSE)
  HttpRouter.get(
    "/api/logs/stream",
    Effect.gen(function* () {
      const stream = Stream.repeat(
        Effect.gen(function* () {
          const logs = yield* getLogs(undefined, 50);
          return logs.join("\n");
        }),
        Schedule.spaced("2 seconds")
      );
      
      return yield* HttpServerResponse.stream(
        stream.pipe(Stream.map((data) => `data: ${JSON.stringify({ logs: data })}\n\n`)),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        }
      );
    }),
  ),
);

// Main server program
const program = Effect.gen(function* () {
  console.log("Starting Debug Pi Server...");
  console.log("Listening on http://0.0.0.0:3000");
  
  yield* HttpServer.serve(router);
}).pipe(
  HttpServer.listen({ port: 3000, host: "0.0.0.0" }),
);

// Run the server
NodeRuntime.runMain(program.pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      console.error("Server error:", error);
      yield* Effect.fail(error);
    })
  )
));
