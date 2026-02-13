import type { SystemStatus } from "@debuggingpi/shared";
import { Hono } from "hono";
import { getConfig } from "../lib/config.js";
import { getSystemMetrics } from "../services/metrics.js";
import { getNetworkStatus } from "../services/network.js";

export const createStatusRouter = (): Hono => {
	const app = new Hono();

	app.get("/", async (c) => {
		const config = getConfig();
		const hostname = (await getHostname()) ?? "debuggingpi";

		const [metrics, network] = await Promise.all([
			getSystemMetrics(),
			getNetworkStatus(config.piZeroHost),
		]);

		const status: SystemStatus = {
			hostname,
			metrics,
			network,
			timestamp: new Date().toISOString(),
		};

		return c.json(status);
	});

	return app;
};

const getHostname = async (): Promise<string | undefined> => {
	try {
		const file = Bun.file("/etc/hostname");
		const content = await file.text();
		return content.trim();
	} catch {
		return undefined;
	}
};
