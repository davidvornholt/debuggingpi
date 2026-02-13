import { LogFilter } from "@debuggingpi/shared";
import { Hono } from "hono";
import type { RingBuffer } from "../lib/ring-buffer.js";
import { getLatestEntries, queryEntries } from "../lib/ring-buffer.js";
import { subscribe } from "../lib/sse.js";

export const createLogsRouter = (getBuffer: () => RingBuffer): Hono => {
	const app = new Hono();

	app.get("/stream", (c) => subscribe(c));

	app.get("/history", (c) => {
		const rawFilter = {
			query: c.req.query("q") || undefined,
			level: c.req.query("level") || undefined,
			source: c.req.query("source") || undefined,
			from: c.req.query("from") || undefined,
			to: c.req.query("to") || undefined,
			limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
			offset: c.req.query("offset") ? Number(c.req.query("offset")) : undefined,
		};

		const parseResult = LogFilter.safeParse(rawFilter);
		if (!parseResult.success) {
			return c.json({ error: "Invalid filter parameters", details: parseResult.error.issues }, 400);
		}

		const entries = queryEntries(getBuffer(), parseResult.data);
		return c.json({
			entries,
			total: getBuffer().size,
			filter: parseResult.data,
		});
	});

	app.get("/latest", (c) => {
		const count = Math.min(Number(c.req.query("count") ?? 100), 500);
		const entries = getLatestEntries(getBuffer(), count);
		return c.json({ entries });
	});

	return app;
};
