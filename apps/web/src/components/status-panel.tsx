import type { SystemStatus } from "@debuggingpi/shared";
import { useApi } from "../hooks/use-api.js";

const formatUptime = (seconds: number): string => {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	parts.push(`${minutes}m`);
	return parts.join(" ");
};

const MetricCard = ({
	label,
	value,
	unit,
	color = "text-pi-text",
}: {
	readonly label: string;
	readonly value: string | number;
	readonly unit?: string;
	readonly color?: string;
}): React.ReactElement => (
	<div className="rounded-lg border border-pi-border bg-pi-surface p-3">
		<div className="text-xs text-pi-muted">{label}</div>
		<div className={`mt-1 font-mono text-lg font-bold ${color}`}>
			{value}
			{unit && <span className="ml-1 text-xs text-pi-muted">{unit}</span>}
		</div>
	</div>
);

const getTemperatureColor = (temp: number): string => {
	if (temp >= 80) return "text-red-400";
	if (temp >= 70) return "text-yellow-300";
	return "text-pi-green";
};

const getCpuColor = (percent: number): string => {
	if (percent >= 90) return "text-red-400";
	if (percent >= 70) return "text-yellow-300";
	return "text-pi-green";
};

export const StatusPanel = (): React.ReactElement => {
	const { data: status, error, loading } = useApi<SystemStatus>("/api/status", 5000);

	if (loading && !status) {
		return (
			<div className="p-4">
				<h2 className="mb-3 text-sm font-semibold text-pi-text">System Status</h2>
				<div className="text-sm text-pi-muted">Loading...</div>
			</div>
		);
	}

	if (error && !status) {
		return (
			<div className="p-4">
				<h2 className="mb-3 text-sm font-semibold text-pi-text">System Status</h2>
				<div className="text-sm text-red-400">Error: {error}</div>
			</div>
		);
	}

	if (!status) return <div />;

	const { metrics } = status;

	return (
		<div className="p-4">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-pi-text">System Status</h2>
				<span className="font-mono text-xs text-pi-muted">{status.hostname}</span>
			</div>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<MetricCard
					label="CPU"
					value={metrics.cpuPercent}
					unit="%"
					color={getCpuColor(metrics.cpuPercent)}
				/>
				<MetricCard
					label="Memory"
					value={`${metrics.memoryUsedMb}/${metrics.memoryTotalMb}`}
					unit="MB"
					color={
						metrics.memoryUsedMb / metrics.memoryTotalMb > 0.9 ? "text-red-400" : "text-pi-text"
					}
				/>
				<MetricCard
					label="Temperature"
					value={metrics.temperatureCelsius}
					unit="°C"
					color={getTemperatureColor(metrics.temperatureCelsius)}
				/>
				<MetricCard label="Uptime" value={formatUptime(metrics.uptimeSeconds)} />
			</div>
		</div>
	);
};
