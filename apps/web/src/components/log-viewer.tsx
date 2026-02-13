import type { LogEntry } from "@debuggingpi/shared";
import { useEffect, useRef } from "react";

type LogViewerProps = {
	readonly entries: ReadonlyArray<LogEntry>;
	readonly paused: boolean;
	readonly onTogglePause: () => void;
	readonly onClear: () => void;
};

const LEVEL_COLORS: Record<string, string> = {
	emerg: "text-red-500 bg-red-500/10",
	alert: "text-red-400 bg-red-400/10",
	crit: "text-red-400 bg-red-400/10",
	err: "text-red-300 bg-red-300/10",
	warning: "text-yellow-300 bg-yellow-300/10",
	notice: "text-blue-300 bg-blue-300/10",
	info: "text-sky-300 bg-sky-300/10",
	debug: "text-gray-400 bg-gray-400/10",
};

const SOURCE_BADGE: Record<string, { readonly label: string; readonly className: string }> = {
	pi3: { label: "Pi 3", className: "bg-pi-green/20 text-pi-green" },
	"pi-zero": { label: "Pi Zero", className: "bg-purple-500/20 text-purple-400" },
};

const formatTimestamp = (isoTimestamp: string): string => {
	const date = new Date(isoTimestamp);
	return date.toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		fractionalSecondDigits: 3,
	});
};

const LogRow = ({ entry }: { readonly entry: LogEntry }): React.ReactElement => {
	const levelColor = LEVEL_COLORS[entry.level] ?? "text-gray-400";
	const source = SOURCE_BADGE[entry.source] ?? SOURCE_BADGE["pi3"]!;

	return (
		<div className="group flex items-start gap-2 border-b border-pi-border/30 px-4 py-1 font-mono text-xs hover:bg-pi-surface/50">
			<span className="shrink-0 text-pi-muted">{formatTimestamp(entry.timestamp)}</span>
			<span
				className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${source.className}`}
			>
				{source.label}
			</span>
			<span
				className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${levelColor}`}
			>
				{entry.level}
			</span>
			<span className="shrink-0 text-pi-muted">[{entry.unit}]</span>
			<span className="min-w-0 break-all text-pi-text">{entry.message}</span>
		</div>
	);
};

export const LogViewer = ({
	entries,
	paused,
	onTogglePause,
	onClear,
}: LogViewerProps): React.ReactElement => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const autoScrollRef = useRef(true);

	useEffect(() => {
		if (autoScrollRef.current && !paused && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [entries, paused]);

	const handleScroll = (): void => {
		if (!scrollRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
		autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-pi-border bg-pi-surface px-4 py-2">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold text-pi-text">Live Logs</h2>
					<span className="rounded bg-pi-dark px-2 py-0.5 text-xs text-pi-muted">
						{entries.length} entries
					</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onTogglePause}
						className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
							paused
								? "bg-pi-green/20 text-pi-green hover:bg-pi-green/30"
								: "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
						}`}
					>
						{paused ? "▶ Resume" : "⏸ Pause"}
					</button>
					<button
						type="button"
						onClick={onClear}
						className="rounded bg-pi-dark px-3 py-1 text-xs font-medium text-pi-muted transition-colors hover:bg-pi-border hover:text-pi-text"
					>
						Clear
					</button>
				</div>
			</div>
			<div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-pi-darker">
				{entries.length === 0 ? (
					<div className="flex h-full items-center justify-center text-pi-muted">
						<p>Waiting for log entries...</p>
					</div>
				) : (
					entries.map((entry) => <LogRow key={entry.id} entry={entry} />)
				)}
			</div>
		</div>
	);
};
