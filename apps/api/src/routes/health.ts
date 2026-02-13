import { Hono } from "hono";
import { getSubscriberCount } from "../lib/sse.js";

export const createHealthRouter = (): Hono => {
	const app = new Hono();

	app.get("/", (c) =>
		c.json({
			status: "ok",
			uptime: process.uptime(),
			subscribers: getSubscriberCount(),
			timestamp: new Date().toISOString(),
		}),
	);

	return app;
};
