import type { LogEntry } from "@debuggingpi/shared";
import { useCallback, useState } from "react";

type LogSearchResult = {
	readonly entries: ReadonlyArray<LogEntry>;
	readonly total: number;
};

type UseLogSearchReturn = {
	readonly results: LogSearchResult | undefined;
	readonly loading: boolean;
	readonly error: string | undefined;
	readonly search: (params: SearchParams) => void;
};

type SearchParams = {
	readonly query?: string;
	readonly level?: string;
	readonly source?: string;
	readonly from?: string;
	readonly to?: string;
	readonly limit?: number;
	readonly offset?: number;
};

export const useLogSearch = (): UseLogSearchReturn => {
	const [results, setResults] = useState<LogSearchResult | undefined>();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const search = useCallback(async (params: SearchParams) => {
		setLoading(true);
		setError(undefined);

		const searchParams = new URLSearchParams();
		if (params.query) searchParams.set("q", params.query);
		if (params.level) searchParams.set("level", params.level);
		if (params.source) searchParams.set("source", params.source);
		if (params.from) searchParams.set("from", params.from);
		if (params.to) searchParams.set("to", params.to);
		if (params.limit) searchParams.set("limit", String(params.limit));
		if (params.offset) searchParams.set("offset", String(params.offset));

		try {
			const response = await fetch(`/api/logs/history?${searchParams.toString()}`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const json = (await response.json()) as LogSearchResult;
			setResults(json);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed");
		} finally {
			setLoading(false);
		}
	}, []);

	return { results, loading, error, search };
};
