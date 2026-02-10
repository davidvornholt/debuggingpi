import { createConnection } from "node:net";
import { Effect } from "effect";

import { DaemonRequestSchema, DaemonResponseSchema } from "@debug-pi/shared";
import type { DaemonRequest, DaemonResponse } from "@debug-pi/shared";

export const socketPath = "/run/debug-pi.sock";

type DaemonError = {
  readonly _tag: "DaemonError";
  readonly message: string;
};

const daemonError = (message: string): DaemonError => ({
  _tag: "DaemonError",
  message,
});

const encodeRequest = (request: DaemonRequest): string =>
  `${JSON.stringify(DaemonRequestSchema.parse(request))}\n`;

export const sendDaemonRequest = (
  request: DaemonRequest,
): Effect.Effect<DaemonResponse, DaemonError> =>
  Effect.async<DaemonResponse, DaemonError>((resume) => {
    const socket = createConnection({ path: socketPath }, () => {
      socket.write(encodeRequest(request));
    });

    let buffer = "";

    const handleData = (chunk: Buffer): void => {
      const text = buffer + chunk.toString("utf-8");
      const parts = text.split("\n");
      const nextBuffer = parts.at(-1) ?? "";
      const lines = parts.slice(0, -1);
      buffer = nextBuffer;

      const result = lines.reduce<{
        response: DaemonResponse | null;
        error: DaemonError | null;
      }>(
        (acc, line) => {
          if (acc.response || acc.error || line.length === 0) {
            return acc;
          }

          try {
            const response = DaemonResponseSchema.parse(JSON.parse(line));
            return { response, error: null };
          } catch (error) {
            return { response: null, error: daemonError(`Invalid response: ${String(error)}`) };
          }
        },
        { response: null, error: null },
      );

      if (result.response) {
        socket.end();
        resume(Effect.succeed(result.response));
      } else if (result.error) {
        resume(Effect.fail(result.error));
      }
    };

    const handleError = (error: Error): void => {
      resume(Effect.fail(daemonError(`Daemon socket error: ${error.message}`)));
    };

    socket.on("data", handleData);
    socket.on("error", handleError);
  });
