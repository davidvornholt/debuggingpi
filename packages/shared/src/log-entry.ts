import { z } from "zod";

export const LogLevel = z.enum([
	"emerg",
	"alert",
	"crit",
	"err",
	"warning",
	"notice",
	"info",
	"debug",
]);
export type LogLevel = z.infer<typeof LogLevel>;

export const LogSource = z.enum(["pi3", "pi-zero"]);
export type LogSource = z.infer<typeof LogSource>;

export const LogEntry = z.object({
	id: z.string(),
	timestamp: z.string().datetime(),
	source: LogSource,
	level: LogLevel,
	unit: z.string(),
	message: z.string(),
	cursor: z.string().optional(),
});
export type LogEntry = z.infer<typeof LogEntry>;

export const LogFilter = z.object({
	query: z.string().optional(),
	level: LogLevel.optional(),
	source: LogSource.optional(),
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional(),
	limit: z.number().int().positive().max(1000).optional(),
	offset: z.number().int().nonnegative().optional(),
});
export type LogFilter = z.infer<typeof LogFilter>;
