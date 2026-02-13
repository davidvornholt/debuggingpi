import type { LogEntry } from "@debuggingpi/shared";
import { type RingBuffer, pushEntry } from "../lib/ring-buffer.js";
import { broadcast } from "../lib/sse.js";

type SshLogCollector = {
	readonly process: ReturnType<typeof Bun.spawn> | undefined;
	readonly stop: () => void;
	readonly isRunning: () => boolean;
};

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

const parsePiZeroLine = (line: string): LogEntry | undefined => {
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
			source: "pi-zero",
			level,
			unit: raw._SYSTEMD_UNIT ?? raw.SYSLOG_IDENTIFIER ?? "unknown",
			message: raw.MESSAGE ?? "",
			cursor: raw.__CURSOR,
		};
	} catch {
		return undefined;
	}
};

export const collectPiZeroLogs = (
	getBuffer: () => RingBuffer,
	setBuffer: (buffer: RingBuffer) => void,
	host: string,
	user: string,
	sshKeyPath: string,
): SshLogCollector => {
	let proc: ReturnType<typeof Bun.spawn> | undefined;
	let running = false;
	let retryTimeout: ReturnType<typeof setTimeout> | undefined;

	const startCollection = (): void => {
		try {
			proc = Bun.spawn(
				[
					"ssh",
					"-o",
					"StrictHostKeyChecking=no",
					"-o",
					"ConnectTimeout=5",
					"-o",
					"ServerAliveInterval=10",
					"-o",
					"ServerAliveCountMax=3",
					"-o",
					"BatchMode=yes",
					"-i",
					sshKeyPath,
					`${user}@${host}`,
					"journalctl",
					"--follow",
					"--output=json",
					"--no-pager",
					"--lines=100",
				],
				{
					stdout: "pipe",
					stderr: "ignore",
				},
			);

			running = true;
			const stdout = proc.stdout;
			if (!stdout || typeof stdout === "number") {
				running = false;
				scheduleRetry();
				return;
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

							const entry = parsePiZeroLine(trimmed);
							if (entry) {
								setBuffer(pushEntry(getBuffer(), entry));
								broadcast(entry);
							}
						}
					}
				} catch {
					// SSH disconnected
				} finally {
					running = false;
					scheduleRetry();
				}
			};

			proc.exited.then(() => {
				running = false;
				scheduleRetry();
			});

			readLoop();
		} catch {
			console.error("[ssh-logs] Failed to connect to Pi Zero W — will retry in 10s");
			running = false;
			scheduleRetry();
		}
	};

	const scheduleRetry = (): void => {
		if (retryTimeout) clearTimeout(retryTimeout);
		retryTimeout = setTimeout(() => {
			console.log("[ssh-logs] Retrying SSH connection to Pi Zero W...");
			startCollection();
		}, 10_000);
	};

	startCollection();

	return {
		process: proc,
		isRunning: () => running,
		stop: () => {
			if (retryTimeout) clearTimeout(retryTimeout);
			proc?.kill();
			running = false;
		},
	};
};
