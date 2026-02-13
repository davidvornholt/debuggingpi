import { z } from "zod";

export const AppConfig = z.object({
	port: z.number().int().positive().default(8080),
	host: z.string().default("0.0.0.0"),
	logBufferSize: z.number().int().positive().default(10000),
	piZeroHost: z.string().default("192.168.7.2"),
	piZeroUser: z.string().default("pi"),
	sshKeyPath: z.string().default("/home/pi/.ssh/id_ed25519"),
	sshEnabled: z.boolean().default(true),
	journalFollowUnits: z.array(z.string()).default([]),
	pollIntervalMs: z.number().int().positive().default(5000),
});
export type AppConfig = z.infer<typeof AppConfig>;

export const loadConfig = (): AppConfig =>
	AppConfig.parse({
		port: Number(process.env.DEBUGGINGPI_PORT) || undefined,
		host: process.env.DEBUGGINGPI_HOST || undefined,
		logBufferSize: Number(process.env.DEBUGGINGPI_LOG_BUFFER_SIZE) || undefined,
		piZeroHost: process.env.DEBUGGINGPI_PI_ZERO_HOST || undefined,
		piZeroUser: process.env.DEBUGGINGPI_PI_ZERO_USER || undefined,
		sshKeyPath: process.env.DEBUGGINGPI_SSH_KEY_PATH || undefined,
		sshEnabled: process.env.DEBUGGINGPI_SSH_ENABLED !== "false",
		journalFollowUnits:
			process.env.DEBUGGINGPI_JOURNAL_UNITS?.split(",").filter(Boolean) || undefined,
		pollIntervalMs: Number(process.env.DEBUGGINGPI_POLL_INTERVAL_MS) || undefined,
	});
