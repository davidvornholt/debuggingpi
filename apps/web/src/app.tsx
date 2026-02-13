import { useState } from "react";
import { Header } from "./components/header.js";
import { LogSearch } from "./components/log-search.js";
import { LogViewer } from "./components/log-viewer.js";
import { NetworkPanel } from "./components/network-panel.js";
import { StatusPanel } from "./components/status-panel.js";
import { useSse } from "./hooks/use-sse.js";

type Tab = "live" | "search";

export const App = (): React.ReactElement => {
	const [activeTab, setActiveTab] = useState<Tab>("live");
	const { entries, connected, paused, togglePause, clear } = useSse("/api/logs/stream");

	return (
		<div className="flex h-full flex-col bg-pi-darker">
			<Header connected={connected} />

			<div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_320px]">
				<div className="flex flex-col overflow-hidden">
					<div className="flex border-b border-pi-border bg-pi-surface">
						<button
							type="button"
							onClick={() => setActiveTab("live")}
							className={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === "live"
									? "border-b-2 border-pi-green text-pi-green"
									: "text-pi-muted hover:text-pi-text"
							}`}
						>
							Live Logs
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("search")}
							className={`px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === "search"
									? "border-b-2 border-pi-green text-pi-green"
									: "text-pi-muted hover:text-pi-text"
							}`}
						>
							Search History
						</button>
					</div>

					<div className="flex-1 overflow-hidden">
						{activeTab === "live" ? (
							<LogViewer
								entries={entries}
								paused={paused}
								onTogglePause={togglePause}
								onClear={clear}
							/>
						) : (
							<LogSearch />
						)}
					</div>
				</div>

				<div className="hidden flex-col overflow-y-auto border-l border-pi-border bg-pi-dark lg:flex">
					<StatusPanel />
					<div className="border-t border-pi-border" />
					<NetworkPanel />
				</div>
			</div>
		</div>
	);
};
