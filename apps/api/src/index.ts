import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getConfig } from "./lib/config.js";
import { type RingBuffer, createRingBuffer } from "./lib/ring-buffer.js";
import { createHealthRouter } from "./routes/health.js";
import { createLogsRouter } from "./routes/logs.js";
import { createStatusRouter } from "./routes/status.js";
import { followLocalJournal } from "./services/journal.js";
import { collectPiZeroLogs } from "./services/ssh-logs.js";

const config = getConfig();
const app = new Hono();

let logBuffer: RingBuffer = createRingBuffer(config.logBufferSize);

const getBuffer = (): RingBuffer => logBuffer;
const setBuffer = (buffer: RingBuffer): void => {
	logBuffer = buffer;
};

app.use("*", cors());
app.use("*", logger());

app.route("/api/logs", createLogsRouter(getBuffer));
app.route("/api/status", createStatusRouter());
app.route("/api/health", createHealthRouter());

app.get("/api/config", (c) =>
	c.json({
		piZeroHost: config.piZeroHost,
		sshEnabled: config.sshEnabled,
		logBufferSize: config.logBufferSize,
	}),
);

app.use("/*", serveStatic({ root: "../web/dist" }));
app.use("/*", serveStatic({ root: "../web/dist", path: "index.html" }));

const journalFollower = followLocalJournal(getBuffer, setBuffer, config.journalFollowUnits);

let sshCollector: ReturnType<typeof collectPiZeroLogs> | undefined;
if (config.sshEnabled) {
	sshCollector = collectPiZeroLogs(
		getBuffer,
		setBuffer,
		config.piZeroHost,
		config.piZeroUser,
		config.sshKeyPath,
	);
}

const shutdown = (): void => {
	console.log("[debuggingpi] Shutting down...");
	journalFollower.stop();
	sshCollector?.stop();
	process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[debuggingpi] Debugging Pi API running on http://${config.host}:${config.port}`);

export default {
	port: config.port,
	hostname: config.host,
	fetch: app.fetch,
};
