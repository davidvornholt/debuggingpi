import { spawn } from "node:child_process";
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

const defaultConfigFromEnv = (): Config => ({
  ...defaultConfig,
  ap: {
    ...defaultConfig.ap,
    ssid: process.env.DEBUG_PI_SSID ?? defaultConfig.ap.ssid,
    passphrase: process.env.DEBUG_PI_PASSPHRASE ?? defaultConfig.ap.passphrase,
    country: process.env.DEBUG_PI_COUNTRY ?? defaultConfig.ap.country,
    subnet: process.env.DEBUG_PI_SUBNET ?? defaultConfig.ap.subnet,
    dhcpRange: {
      ...defaultConfig.ap.dhcpRange,
      start: process.env.DEBUG_PI_DHCP_START ?? defaultConfig.ap.dhcpRange.start,
      end: process.env.DEBUG_PI_DHCP_END ?? defaultConfig.ap.dhcpRange.end,
    },
  },
  usb: {
    ...defaultConfig.usb,
    enabled:
      process.env.DEBUG_PI_USB_ENABLED !== undefined
        ? process.env.DEBUG_PI_USB_ENABLED === "true"
        : defaultConfig.usb.enabled,
    address: process.env.DEBUG_PI_USB_ADDRESS ?? defaultConfig.usb.address,
  },
});

const readConfig = (): Effect.Effect<Config, DaemonError> =>
  Effect.tryPromise({
    try: () => fs.readFile(configPath, "utf-8"),
    catch: (error) => ({ _tag: "DaemonIoError", error }),
  }).pipe(
    Effect.catchAll((error) =>
      isErrnoException(error.error) && error.error.code === "ENOENT"
        ? Effect.succeed(defaultConfigFromEnv())
        : Effect.fail(daemonError(`Failed to read config: ${String(error.error)}`)),
    ),
    Effect.flatMap((raw) =>
      typeof raw === "string"
        ? Effect.try({
            try: () => ConfigSchema.parse(JSON.parse(raw)),
            catch: (error) => daemonError(`Invalid config: ${String(error)}`),
          })
        : Effect.succeed(raw),
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
  Effect.async<void, DaemonError>((resume) => {
    let resolved = false;
    const command = action === "reboot" ? "reboot" : "poweroff";
    const child = spawn("systemctl", [command]);

    child.on("error", (error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      resume(Effect.fail(daemonError(`Failed to run system action: ${error.message}`)));
    });

    child.on("close", (code) => {
      if (resolved) {
        return;
      }
      resolved = true;
      if (code === 0) {
        resume(Effect.succeed(undefined));
      } else {
        resume(Effect.fail(daemonError(`System action exited with code ${code ?? "unknown"}`)));
      }
    });
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
    let resolved = false;
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

        Promise.all(responses)
          .then((results) => {
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
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            socket.write(`${JSON.stringify({ type: "error", message })}\n`);
            socket.end();
          });
      };

      socket.on("data", handleData);
    });

    server.listen(socketPath, () => {
      resolved = true;
      resume(Effect.succeed(undefined));
    });

    server.on("error", (error) => {
      console.error("Daemon server error:", error);
      if (resolved) {
        server.close(() => {
          process.exit(1);
        });
      } else {
        resume(Effect.fail(daemonError(`Daemon server error: ${String(error)}`)));
      }
    });
  });

const program = Effect.gen(function* () {
  yield* ensureSocketDir();
  yield* removeStaleSocket();
  yield* startServer();
});

Effect.runPromise(program).catch((error) => {
  console.error("Daemon failed to start:", error);
  process.exit(1);
});
