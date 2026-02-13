import type { LogEntry, LogSource } from "@debuggingpi/shared";
import { type RingBuffer, pushEntry } from "../lib/ring-buffer.js";
import { broadcast } from "../lib/sse.js";

type JournalJsonEntry = {
	readonly __REALTIME_TIMESTAMP?: string;
	readonly PRIORITY?: string;
	readonly _SYSTEMD_UNIT?: string;
	readonly SYSLOG_IDENTIFIER?: string;
	readonly MESSAGE?: string;
	readonly __CURSOR?: string;
};

const PRIORITY_MAP: Record<string, LogEntry["level"]> = {
	"0": "emerg",
	"1": "alert",
	"2": "crit",
	"3": "err",
	"4": "warning",
	"5": "notice",
	"6": "info",
	"7": "debug",
} as const;

const parseJournalLine = (line: string, source: LogSource): LogEntry | undefined => {
	try {
		const raw = JSON.parse(line) as JournalJsonEntry;
		const priority = raw.PRIORITY ?? "6";
		const level = PRIORITY_MAP[priority] ?? "info";

		const realtimeUs = raw.__REALTIME_TIMESTAMP;
		const timestamp = realtimeUs
			? new Date(Number(realtimeUs) / 1000).toISOString()
			: new Date().toISOString();

		return {
			id: crypto.randomUUID(),
			timestamp,
			source,
			level,
			unit: raw._SYSTEMD_UNIT ?? raw.SYSLOG_IDENTIFIER ?? "unknown",
			message: raw.MESSAGE ?? "",
			cursor: raw.__CURSOR,
		};
	} catch {
		return undefined;
	}
};

type JournalFollower = {
	readonly process: ReturnType<typeof Bun.spawn> | undefined;
	readonly stop: () => void;
};

export const followLocalJournal = (
	getBuffer: () => RingBuffer,
	setBuffer: (buffer: RingBuffer) => void,
	units: ReadonlyArray<string> = [],
): JournalFollower => {
	const args = ["journalctl", "--follow", "--output=json", "--no-pager", "--lines=200"];

	for (const unit of units) {
		args.push("--unit", unit);
	}

	let proc: ReturnType<typeof Bun.spawn> | undefined;

	try {
		proc = Bun.spawn(args, {
			stdout: "pipe",
			stderr: "ignore",
		});

		const stdout = proc.stdout;
		if (!stdout || typeof stdout === "number") {
			console.error("[journal] Failed to get stdout stream");
			return { process: proc, stop: () => proc?.kill() };
		}
		const reader = stdout.getReader();
		const decoder = new TextDecoder();
		let remainder = "";

		const readLoop = async (): Promise<void> => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = remainder + decoder.decode(value, { stream: true });
					const lines = chunk.split("\n");
					remainder = lines.pop() ?? "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;

						const entry = parseJournalLine(trimmed, "pi3");
						if (entry) {
							setBuffer(pushEntry(getBuffer(), entry));
							broadcast(entry);
						}
					}
				}
			} catch {
				// Process terminated
			}
		};

		readLoop();
	} catch {
		console.error("[journal] Failed to spawn journalctl — running in mock mode");
	}

	return {
		process: proc,
		stop: () => {
			proc?.kill();
		},
	};
};
