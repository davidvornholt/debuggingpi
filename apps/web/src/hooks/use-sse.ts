import type { LogEntry } from "@debuggingpi/shared";
import { useCallback, useEffect, useRef, useState } from "react";

type UseSseReturn = {
	readonly entries: ReadonlyArray<LogEntry>;
	readonly connected: boolean;
	readonly paused: boolean;
	readonly togglePause: () => void;
	readonly clear: () => void;
};

const MAX_DISPLAY_ENTRIES = 2000;

export const useSse = (url: string): UseSseReturn => {
	const [entries, setEntries] = useState<ReadonlyArray<LogEntry>>([]);
	const [connected, setConnected] = useState(false);
	const [paused, setPaused] = useState(false);
	const pausedRef = useRef(paused);
	const bufferRef = useRef<LogEntry[]>([]);

	useEffect(() => {
		pausedRef.current = paused;
	}, [paused]);

	useEffect(() => {
		const eventSource = new EventSource(url);

		eventSource.onopen = () => setConnected(true);

		eventSource.addEventListener("log", (event: MessageEvent<string>) => {
			try {
				const entry = JSON.parse(event.data) as LogEntry;

				if (pausedRef.current) {
					bufferRef.current.push(entry);
					return;
				}

				setEntries((prev) => {
					const next = [...prev, entry];
					return next.length > MAX_DISPLAY_ENTRIES
						? next.slice(next.length - MAX_DISPLAY_ENTRIES)
						: next;
				});
			} catch {
				// Skip malformed entries
			}
		});

		eventSource.onerror = () => setConnected(false);

		return () => {
			eventSource.close();
			setConnected(false);
		};
	}, [url]);

	const togglePause = useCallback(() => {
		setPaused((prev) => {
			if (prev) {
				setEntries((current) => {
					const merged = [...current, ...bufferRef.current];
					bufferRef.current = [];
					return merged.length > MAX_DISPLAY_ENTRIES
						? merged.slice(merged.length - MAX_DISPLAY_ENTRIES)
						: merged;
				});
			}
			return !prev;
		});
	}, []);

	const clear = useCallback(() => {
		setEntries([]);
		bufferRef.current = [];
	}, []);

	return { entries, connected, paused, togglePause, clear };
};
