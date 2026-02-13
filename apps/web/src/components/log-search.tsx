import type { LogEntry } from "@debuggingpi/shared";
import { useCallback, useState } from "react";
import { useLogSearch } from "../hooks/use-log-search.js";

const LOG_LEVELS = [
	"",
	"emerg",
	"alert",
	"crit",
	"err",
	"warning",
	"notice",
	"info",
	"debug",
] as const;
const LOG_SOURCES = ["", "pi3", "pi-zero"] as const;

const LEVEL_COLORS: Record<string, string> = {
	emerg: "text-red-500",
	alert: "text-red-400",
	crit: "text-red-400",
	err: "text-red-300",
	warning: "text-yellow-300",
	notice: "text-blue-300",
	info: "text-sky-300",
	debug: "text-gray-400",
};

const formatTimestamp = (isoTimestamp: string): string => {
	const date = new Date(isoTimestamp);
	return date.toLocaleString("en-US", {
		hour12: false,
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
};

const HistoryRow = ({ entry }: { readonly entry: LogEntry }): React.ReactElement => {
	const levelColor = LEVEL_COLORS[entry.level] ?? "text-gray-400";
	return (
		<tr className="border-b border-pi-border/30 hover:bg-pi-surface/50">
			<td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-pi-muted">
				{formatTimestamp(entry.timestamp)}
			</td>
			<td className="px-3 py-1.5">
				<span className="rounded bg-pi-dark px-1.5 py-0.5 text-[10px] font-semibold uppercase text-pi-muted">
					{entry.source === "pi-zero" ? "Pi Zero" : "Pi 3"}
				</span>
			</td>
			<td className="px-3 py-1.5">
				<span className={`font-mono text-xs font-semibold uppercase ${levelColor}`}>
					{entry.level}
				</span>
			</td>
			<td className="px-3 py-1.5 font-mono text-xs text-pi-muted">{entry.unit}</td>
			<td className="max-w-md truncate px-3 py-1.5 font-mono text-xs text-pi-text">
				{entry.message}
			</td>
		</tr>
	);
};

export const LogSearch = (): React.ReactElement => {
	const [query, setQuery] = useState("");
	const [level, setLevel] = useState("");
	const [source, setSource] = useState("");
	const { results, loading, error, search } = useLogSearch();

	const handleSearch = useCallback(() => {
		search({
			query: query || undefined,
			level: level || undefined,
			source: source || undefined,
			limit: 200,
		});
	}, [query, level, source, search]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") handleSearch();
		},
		[handleSearch],
	);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-pi-border bg-pi-surface p-4">
				<h2 className="mb-3 text-sm font-semibold text-pi-text">Search Log History</h2>
				<div className="flex flex-wrap items-end gap-3">
					<div className="flex-1">
						<label htmlFor="search-query" className="mb-1 block text-xs text-pi-muted">
							Search
						</label>
						<input
							id="search-query"
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Search messages and units..."
							className="w-full rounded border border-pi-border bg-pi-dark px-3 py-1.5 text-sm text-pi-text placeholder-pi-muted/50 focus:border-pi-green focus:outline-none"
						/>
					</div>
					<div>
						<label htmlFor="search-level" className="mb-1 block text-xs text-pi-muted">
							Level
						</label>
						<select
							id="search-level"
							value={level}
							onChange={(e) => setLevel(e.target.value)}
							className="rounded border border-pi-border bg-pi-dark px-3 py-1.5 text-sm text-pi-text focus:border-pi-green focus:outline-none"
						>
							{LOG_LEVELS.map((l) => (
								<option key={l} value={l}>
									{l || "All levels"}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor="search-source" className="mb-1 block text-xs text-pi-muted">
							Source
						</label>
						<select
							id="search-source"
							value={source}
							onChange={(e) => setSource(e.target.value)}
							className="rounded border border-pi-border bg-pi-dark px-3 py-1.5 text-sm text-pi-text focus:border-pi-green focus:outline-none"
						>
							{LOG_SOURCES.map((s) => (
								<option key={s} value={s}>
									{s === "pi3" ? "Pi 3" : s === "pi-zero" ? "Pi Zero" : "All sources"}
								</option>
							))}
						</select>
					</div>
					<button
						type="button"
						onClick={handleSearch}
						disabled={loading}
						className="rounded bg-pi-green px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-pi-green/80 disabled:opacity-50"
					>
						{loading ? "Searching..." : "Search"}
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto bg-pi-darker">
				{error && <div className="p-4 text-sm text-red-400">Error: {error}</div>}
				{results && (
					<>
						<div className="px-4 py-2 text-xs text-pi-muted">
							Found {results.entries.length} of {results.total} total entries
						</div>
						<table className="w-full">
							<thead>
								<tr className="border-b border-pi-border bg-pi-surface/50 text-left text-xs text-pi-muted">
									<th className="px-3 py-2">Time</th>
									<th className="px-3 py-2">Source</th>
									<th className="px-3 py-2">Level</th>
									<th className="px-3 py-2">Unit</th>
									<th className="px-3 py-2">Message</th>
								</tr>
							</thead>
							<tbody>
								{results.entries.map((entry) => (
									<HistoryRow key={entry.id} entry={entry} />
								))}
							</tbody>
						</table>
						{results.entries.length === 0 && (
							<div className="p-8 text-center text-sm text-pi-muted">No matching entries found</div>
						)}
					</>
				)}
				{!results && !error && (
					<div className="flex h-full items-center justify-center text-pi-muted">
						<p>Use the search form above to query log history</p>
					</div>
				)}
			</div>
		</div>
	);
};
