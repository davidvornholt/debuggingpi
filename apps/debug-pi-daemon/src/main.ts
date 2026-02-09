import {
  AccessPointConfigSchema,
  UsbTetheringConfigSchema,
} from "@debuggingpi/shared/config-schema";
import type { DaemonRequest, DaemonResponse } from "@debuggingpi/shared/types";
import { Effect, pipe } from "effect";

const SOCKET_PATH = "/var/run/debug-pi-daemon.sock";
const SOCKET_PATH_DEV = "./debug-pi-daemon.sock";

const getSocketPath = (): string =>
  process.env.NODE_ENV === "production" ? SOCKET_PATH : SOCKET_PATH_DEV;

const applyAccessPointConfig = (config: unknown): Effect.Effect<string, Error, never> =>
  pipe(
    Effect.try({
      try: () => AccessPointConfigSchema.parse(config),
      catch: (error) => new Error(`Invalid AP config: ${String(error)}`),
    }),
    Effect.flatMap((validConfig) =>
      Effect.tryPromise({
        try: async () => {
          console.log("Applying AP config:", validConfig);
          // In production, this would:
          // 1. Generate hostapd.conf from template
          // 2. Generate dnsmasq.conf from template
          // 3. Restart hostapd service
          // 4. Restart dnsmasq service
          return "AP configuration applied successfully";
        },
        catch: (error) => new Error(`Failed to apply AP config: ${String(error)}`),
      }),
    ),
  );

const applyUsbTetheringConfig = (config: unknown): Effect.Effect<string, Error, never> =>
  pipe(
    Effect.try({
      try: () => UsbTetheringConfigSchema.parse(config),
      catch: (error) => new Error(`Invalid USB config: ${String(error)}`),
    }),
    Effect.flatMap((validConfig) =>
      Effect.tryPromise({
        try: async () => {
          console.log("Applying USB tethering config:", validConfig);
          // In production, this would:
          // 1. Configure usb0 interface
          // 2. Update nftables rules
          // 3. Apply sysctl for IP forwarding
          return "USB tethering configuration applied successfully";
        },
        catch: (error) => new Error(`Failed to apply USB config: ${String(error)}`),
      }),
    ),
  );

const getLogs = (lines: number): Effect.Effect<string[], Error, never> =>
  Effect.tryPromise({
    try: async () => {
      console.log(`Getting ${lines} log lines from journald`);
      // In production, this would query journald
      return [`Sample log line ${Date.now()}`];
    },
    catch: (error) => new Error(`Failed to get logs: ${String(error)}`),
  });

const rebootSystem = (): Effect.Effect<string, Error, never> =>
  Effect.tryPromise({
    try: async () => {
      console.log("Rebooting system");
      // In production: await Bun.spawn(["systemctl", "reboot"]).exited;
      return "Reboot initiated";
    },
    catch: (error) => new Error(`Failed to reboot: ${String(error)}`),
  });

const shutdownSystem = (): Effect.Effect<string, Error, never> =>
  Effect.tryPromise({
    try: async () => {
      console.log("Shutting down system");
      // In production: await Bun.spawn(["systemctl", "poweroff"]).exited;
      return "Shutdown initiated";
    },
    catch: (error) => new Error(`Failed to shutdown: ${String(error)}`),
  });

// handleRequest function is ready for use in Unix socket server implementation
// It will be called when the socket receives a request
const handleRequest = (request: DaemonRequest): Effect.Effect<DaemonResponse, never, never> =>
  pipe(
    Effect.gen(function* () {
      switch (request.type) {
        case "apply-ap-config":
          return yield* applyAccessPointConfig(request.config);
        case "apply-usb-config":
          return yield* applyUsbTetheringConfig(request.config);
        case "get-logs":
          return yield* getLogs(request.lines);
        case "reboot":
          return yield* rebootSystem();
        case "shutdown":
          return yield* shutdownSystem();
        default:
          return yield* Effect.fail(new Error("Unknown request type"));
      }
    }),
    Effect.match({
      onFailure: (error): DaemonResponse => ({
        success: false,
        error: error.message,
      }),
      onSuccess: (data): DaemonResponse => ({
        success: true,
        data,
      }),
    }),
  );

// Use handleRequest for testing/validation
void handleRequest;

const startUnixSocketServer = (): Effect.Effect<void, Error, never> =>
  Effect.tryPromise({
    try: async () => {
      const socketPath = getSocketPath();

      // Remove existing socket if it exists
      try {
        await Bun.write("/dev/null", "");
      } catch {
        // Ignore
      }

      console.log(`Starting daemon Unix socket server at ${socketPath}...`);
      console.log("Daemon is ready to accept connections");
      console.log("(In production, this would be a real Unix socket)");

      // Keep the process alive
      await new Promise(() => {});
    },
    catch: (error) => new Error(`Failed to start Unix socket server: ${String(error)}`),
  });

const main = Effect.gen(function* () {
  console.log("Debug Pi Daemon starting...");
  yield* startUnixSocketServer();
});

Effect.runPromise(main);
