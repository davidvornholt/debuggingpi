import { createConnection } from "node:net";
import { Effect } from "effect";

import { DaemonRequestSchema, DaemonResponseSchema } from "@debug-pi/shared";
import type { DaemonRequest, DaemonResponse } from "@debug-pi/shared";

export const socketPath = "/run/debug-pi.sock";

export type DaemonError = {
  readonly _tag: "DaemonError";
  readonly message: string;
};

const daemonError = (message: string): DaemonError => ({
  _tag: "DaemonError",
  message,
});

const encodeRequest = (
  request: DaemonRequest,
):
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: DaemonError } => {
  const parsed = DaemonRequestSchema.safeParse(request);
  if (!parsed.success) {
    return { ok: false, error: daemonError(parsed.error.message) };
  }
  return { ok: true, value: `${JSON.stringify(parsed.data)}\n` };
};

export const sendDaemonRequest = (
  request: DaemonRequest,
): Effect.Effect<DaemonResponse, DaemonError> =>
  Effect.async<DaemonResponse, DaemonError>((resume) => {
    let done = false;
    const encoded = encodeRequest(request);
    if (!encoded.ok) {
      done = true;
      resume(Effect.fail(encoded.error));
      return;
    }

    const socket = createConnection({ path: socketPath }, () => {
      socket.write(encoded.value);
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

      if (result.response && !done) {
        done = true;
        socket.end();
        socket.off("data", handleData);
        socket.off("error", handleError);
        socket.off("end", handleEnd);
        socket.off("close", handleClose);
        resume(Effect.succeed(result.response));
      } else if (result.error && !done) {
        done = true;
        socket.destroy();
        socket.off("data", handleData);
        socket.off("error", handleError);
        socket.off("end", handleEnd);
        socket.off("close", handleClose);
        resume(Effect.fail(result.error));
      }
    };

    const handleError = (error: Error): void => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      socket.off("data", handleData);
      socket.off("error", handleError);
      socket.off("end", handleEnd);
      socket.off("close", handleClose);
      resume(Effect.fail(daemonError(`Daemon socket error: ${error.message}`)));
    };

    const handleEnd = (): void => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      socket.off("data", handleData);
      socket.off("error", handleError);
      socket.off("end", handleEnd);
      socket.off("close", handleClose);
      resume(Effect.fail(daemonError("Daemon connection closed")));
    };

    const handleClose = (): void => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      socket.off("data", handleData);
      socket.off("error", handleError);
      socket.off("end", handleEnd);
      socket.off("close", handleClose);
      resume(Effect.fail(daemonError("Daemon connection closed")));
    };

    socket.on("data", handleData);
    socket.on("error", handleError);
    socket.on("end", handleEnd);
    socket.on("close", handleClose);
  });
