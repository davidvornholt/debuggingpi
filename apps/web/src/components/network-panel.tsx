import type { SystemStatus } from "@debuggingpi/shared";
import { useApi } from "../hooks/use-api.js";

const Indicator = ({
	active,
	label,
}: { readonly active: boolean; readonly label: string }): React.ReactElement => (
	<div className="flex items-center gap-2">
		<div className={`h-2.5 w-2.5 rounded-full ${active ? "bg-pi-green" : "bg-pi-red"}`} />
		<span className="text-sm text-pi-text">{label}</span>
	</div>
);

export const NetworkPanel = (): React.ReactElement => {
	const { data: status, error, loading } = useApi<SystemStatus>("/api/status", 5000);

	if (loading && !status) {
		return (
			<div className="p-4">
				<h2 className="mb-3 text-sm font-semibold text-pi-text">Network</h2>
				<div className="text-sm text-pi-muted">Loading...</div>
			</div>
		);
	}

	if (error && !status) {
		return (
			<div className="p-4">
				<h2 className="mb-3 text-sm font-semibold text-pi-text">Network</h2>
				<div className="text-sm text-red-400">Error: {error}</div>
			</div>
		);
	}

	if (!status) return <div />;

	const { network } = status;

	return (
		<div className="p-4">
			<h2 className="mb-3 text-sm font-semibold text-pi-text">Network</h2>
			<div className="space-y-4">
				<div className="rounded-lg border border-pi-border bg-pi-surface p-3">
					<h3 className="mb-2 text-xs font-semibold uppercase text-pi-muted">WiFi AP</h3>
					<Indicator active={network.wifiApActive} label={network.wifiSsid} />
					<div className="mt-2 text-xs text-pi-muted">
						{network.wifiClients.length} client{network.wifiClients.length !== 1 ? "s" : ""}{" "}
						connected
					</div>
					{network.wifiClients.length > 0 && (
						<div className="mt-2 space-y-1">
							{network.wifiClients.map((client) => (
								<div
									key={client.mac}
									className="flex items-center justify-between font-mono text-xs"
								>
									<span className="text-pi-text">{client.mac}</span>
									{client.signal && <span className="text-pi-muted">{client.signal}</span>}
								</div>
							))}
						</div>
					)}
				</div>

				<div className="rounded-lg border border-pi-border bg-pi-surface p-3">
					<h3 className="mb-2 text-xs font-semibold uppercase text-pi-muted">USB Link</h3>
					<Indicator active={network.usbLink === "connected"} label={`USB: ${network.usbLink}`} />
					<div className="mt-2">
						<Indicator active={network.piZeroReachable} label={`Pi Zero (${network.piZeroIp})`} />
					</div>
					{network.piZeroReachable && (
						<div className="mt-2 rounded bg-pi-dark p-2 font-mono text-xs text-pi-muted">
							ssh pi@{network.piZeroIp}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
