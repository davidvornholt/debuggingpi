import { useCallback, useEffect, useState } from "react";

export const useApi = <T>(
	url: string,
	intervalMs = 5000,
): {
	readonly data: T | undefined;
	readonly error: string | undefined;
	readonly loading: boolean;
	readonly refetch: () => void;
} => {
	const [data, setData] = useState<T | undefined>();
	const [error, setError] = useState<string | undefined>();
	const [loading, setLoading] = useState(true);

	const fetchData = useCallback(async () => {
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const json = (await response.json()) as T;
			setData(json);
			setError(undefined);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	}, [url]);

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, intervalMs);
		return () => clearInterval(interval);
	}, [fetchData, intervalMs]);

	return { data, error, loading, refetch: fetchData };
};
