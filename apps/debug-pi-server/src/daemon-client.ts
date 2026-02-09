import { Effect } from "effect";
import { DaemonRequest, SystemStatus } from "@debug-pi/shared";
import * as net from "node:net";

const DAEMON_SOCKET_PATH = "/var/run/debug-pi-daemon.sock";

// Send a request to the daemon and get a response
export const sendDaemonRequest = <T>(
  request: DaemonRequest,
): Effect.Effect<T, Error> =>
  Effect.gen(function* () {
    return yield* Effect.async<T, Error>((resume) => {
      const client = net.createConnection(DAEMON_SOCKET_PATH);
      let responseData = "";

      client.on("connect", () => {
        client.write(JSON.stringify(request));
      });

      client.on("data", (data) => {
        responseData += data.toString();
      });

      client.on("end", () => {
        try {
          const response = JSON.parse(responseData);
          if (response.error) {
            resume(Effect.fail(new Error(response.error)));
          } else {
            resume(Effect.succeed(response.data as T));
          }
        } catch (error) {
          resume(Effect.fail(new Error(`Failed to parse daemon response: ${String(error)}`)));
        }
      });

      client.on("error", (error) => {
        resume(Effect.fail(new Error(`Daemon connection error: ${error.message}`)));
      });
    });
  });

// Get system status from daemon
export const getSystemStatus = (): Effect.Effect<SystemStatus, Error> =>
  sendDaemonRequest<SystemStatus>({ type: "get-status" });

// Get logs from daemon
export const getLogs = (
  service?: string,
  lines = 100,
): Effect.Effect<string[], Error> =>
  sendDaemonRequest<string[]>({
    type: "get-logs",
    service,
    lines,
  });

// Reboot system via daemon
export const rebootSystem = (): Effect.Effect<void, Error> =>
  sendDaemonRequest<void>({ type: "reboot" });

// Shutdown system via daemon
export const shutdownSystem = (): Effect.Effect<void, Error> =>
  sendDaemonRequest<void>({ type: "shutdown" });
