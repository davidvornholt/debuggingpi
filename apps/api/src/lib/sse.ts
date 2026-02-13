import type { LogEntry } from "@debuggingpi/shared";
import type { Context } from "hono";

export type SseSubscriber = {
	readonly id: string;
	readonly controller: ReadableStreamDefaultController<Uint8Array>;
};

type SseBroker = {
	readonly subscribers: Map<string, SseSubscriber>;
};

const encoder = new TextEncoder();

const broker: SseBroker = {
	subscribers: new Map(),
};

const formatSseMessage = (event: string, data: string): string =>
	`event: ${event}\ndata: ${data}\n\n`;

export const subscribe = (c: Context): Response => {
	const id = crypto.randomUUID();

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			broker.subscribers.set(id, { id, controller });

			const keepAlive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(": keepalive\n\n"));
				} catch {
					clearInterval(keepAlive);
					broker.subscribers.delete(id);
				}
			}, 15_000);

			c.req.raw.signal.addEventListener("abort", () => {
				clearInterval(keepAlive);
				broker.subscribers.delete(id);
				try {
					controller.close();
				} catch {
					// already closed
				}
			});
		},
		cancel() {
			broker.subscribers.delete(id);
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
		},
	});
};

export const broadcast = (entry: LogEntry): void => {
	const message = formatSseMessage("log", JSON.stringify(entry));
	const encoded = encoder.encode(message);

	for (const [id, subscriber] of broker.subscribers) {
		try {
			subscriber.controller.enqueue(encoded);
		} catch {
			broker.subscribers.delete(id);
		}
	}
};

export const broadcastStatus = (status: unknown): void => {
	const message = formatSseMessage("status", JSON.stringify(status));
	const encoded = encoder.encode(message);

	for (const [id, subscriber] of broker.subscribers) {
		try {
			subscriber.controller.enqueue(encoded);
		} catch {
			broker.subscribers.delete(id);
		}
	}
};

export const getSubscriberCount = (): number => broker.subscribers.size;
