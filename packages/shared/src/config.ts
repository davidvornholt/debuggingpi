import { z } from "zod";

const bunEnv = (
	globalThis as { readonly Bun?: { readonly env?: Record<string, string | undefined> } }
).Bun?.env;
const processEnv = (
	globalThis as {
		readonly process?: { readonly env?: Record<string, string | undefined> };
	}
).process?.env;
const env = bunEnv ?? processEnv ?? {};

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
		port: Number(env.DEBUGGINGPI_PORT) || undefined,
		host: env.DEBUGGINGPI_HOST || undefined,
		logBufferSize: Number(env.DEBUGGINGPI_LOG_BUFFER_SIZE) || undefined,
		piZeroHost: env.DEBUGGINGPI_PI_ZERO_HOST || undefined,
		piZeroUser: env.DEBUGGINGPI_PI_ZERO_USER || undefined,
		sshKeyPath: env.DEBUGGINGPI_SSH_KEY_PATH || undefined,
		sshEnabled: env.DEBUGGINGPI_SSH_ENABLED !== "false",
		journalFollowUnits: env.DEBUGGINGPI_JOURNAL_UNITS?.split(",").filter(Boolean) || undefined,
		pollIntervalMs: Number(env.DEBUGGINGPI_POLL_INTERVAL_MS) || undefined,
	});
