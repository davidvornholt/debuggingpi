import type { LogEntry, LogFilter } from "@debuggingpi/shared";

const DEFAULT_CAPACITY = 10_000;

export type RingBuffer = {
	readonly capacity: number;
	readonly entries: ReadonlyArray<LogEntry>;
	readonly size: number;
};

export const createRingBuffer = (capacity: number = DEFAULT_CAPACITY): RingBuffer => ({
	capacity,
	entries: [],
	size: 0,
});

export const pushEntry = (buffer: RingBuffer, entry: LogEntry): RingBuffer => {
	const nextEntries =
		buffer.entries.length >= buffer.capacity
			? [...buffer.entries.slice(1), entry]
			: [...buffer.entries, entry];

	return {
		capacity: buffer.capacity,
		entries: nextEntries,
		size: nextEntries.length,
	};
};

export const pushEntries = (buffer: RingBuffer, entries: ReadonlyArray<LogEntry>): RingBuffer =>
	entries.reduce<RingBuffer>((buf, entry) => pushEntry(buf, entry), buffer);

export const queryEntries = (buffer: RingBuffer, filter: LogFilter): ReadonlyArray<LogEntry> => {
	const limit = filter.limit ?? 100;
	const offset = filter.offset ?? 0;

	const filtered = buffer.entries.filter((entry) => {
		if (filter.level && entry.level !== filter.level) return false;
		if (filter.source && entry.source !== filter.source) return false;
		if (filter.from && entry.timestamp < filter.from) return false;
		if (filter.to && entry.timestamp > filter.to) return false;
		if (filter.query) {
			const q = filter.query.toLowerCase();
			const matchesMessage = entry.message.toLowerCase().includes(q);
			const matchesUnit = entry.unit.toLowerCase().includes(q);
			if (!matchesMessage && !matchesUnit) return false;
		}
		return true;
	});

	return filtered.slice(offset, offset + limit);
};

export const getLatestEntries = (buffer: RingBuffer, count: number): ReadonlyArray<LogEntry> =>
	buffer.entries.slice(Math.max(0, buffer.entries.length - count));
