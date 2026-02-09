import type { DebugPiConfig } from "@debuggingpi/shared/config-schema";
import type { ApiResponse, SystemStatus } from "@debuggingpi/shared/types";
import { Effect, pipe } from "effect";
import { readConfig, writeConfig } from "./config";

const PORT = 3000;

const getSystemStatus = (): Effect.Effect<SystemStatus, Error, never> =>
  Effect.tryPromise({
    try: async () => {
      const uptime = process.uptime();
      const memUsage = process.memoryUsage();
      return {
        uptime,
        loadAverage: [0, 0, 0] as const,
        memoryUsed: memUsage.heapUsed,
        memoryTotal: memUsage.heapTotal,
        diskUsed: 0,
        diskTotal: 0,
        temperature: null,
        interfaces: [],
      };
    },
    catch: (error) => new Error(`Failed to get system status: ${String(error)}`),
  });

const createApiResponse = <T>(effect: Effect.Effect<T, Error, never>): Promise<Response> =>
  Effect.runPromise(
    pipe(
      effect,
      Effect.match({
        onFailure: (error): ApiResponse<T> => ({
          success: false,
          error: error.message,
        }),
        onSuccess: (data): ApiResponse<T> => ({
          success: true,
          data,
        }),
      }),
      Effect.map((response) => Response.json(response)),
    ),
  );

const handleRequest = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // CORS headers for development
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET /api/status
  if (url.pathname === "/api/status" && req.method === "GET") {
    return createApiResponse(getSystemStatus());
  }

  // GET /api/config
  if (url.pathname === "/api/config" && req.method === "GET") {
    return createApiResponse(readConfig());
  }

  // PUT /api/config
  if (url.pathname === "/api/config" && req.method === "PUT") {
    const body = (await req.json()) as DebugPiConfig;
    return createApiResponse(writeConfig(body));
  }

  // GET /api/logs (SSE endpoint)
  if (url.pathname === "/api/logs" && req.method === "GET") {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const interval = setInterval(() => {
          const log = {
            timestamp: new Date().toISOString(),
            priority: "info" as const,
            unit: "debug-pi-server",
            message: `Sample log entry at ${new Date().toISOString()}`,
          };
          const data = `data: ${JSON.stringify(log)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }, 1000);

        // Clean up on close
        return () => clearInterval(interval);
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // POST /api/reboot
  if (url.pathname === "/api/reboot" && req.method === "POST") {
    return createApiResponse(
      Effect.succeed({ message: "Reboot command received (not implemented)" }),
    );
  }

  // POST /api/shutdown
  if (url.pathname === "/api/shutdown" && req.method === "POST") {
    return createApiResponse(
      Effect.succeed({ message: "Shutdown command received (not implemented)" }),
    );
  }

  return new Response("Not Found", { status: 404, headers: corsHeaders });
};

const main = Effect.gen(function* () {
  console.log(`Starting Debug Pi Server on port ${PORT}...`);

  Bun.serve({
    port: PORT,
    fetch: handleRequest,
  });

  console.log(`Server running at http://localhost:${PORT}`);

  yield* Effect.never;
});

Effect.runPromise(main);
