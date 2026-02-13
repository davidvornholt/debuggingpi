type HeaderProps = {
	readonly connected: boolean;
};

export const Header = ({ connected }: HeaderProps): React.ReactElement => (
	<header className="flex items-center justify-between border-b border-pi-border bg-pi-surface px-6 py-3">
		<div className="flex items-center gap-3">
			<div className="flex items-center gap-2">
				<svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
					<rect width="32" height="32" rx="6" fill="#0d1117" />
					<circle cx="16" cy="14" r="8" stroke="#2d9f48" strokeWidth="2" />
					<path
						d="M12 14 L14.5 16.5 L20 11"
						stroke="#2d9f48"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<text
						x="16"
						y="27"
						textAnchor="middle"
						fill="#e6edf3"
						fontFamily="monospace"
						fontSize="6"
						fontWeight="bold"
					>
						π
					</text>
				</svg>
				<h1 className="text-xl font-bold text-pi-text">Debugging Pi</h1>
			</div>
			<span className="rounded bg-pi-dark px-2 py-0.5 font-mono text-xs text-pi-muted">v0.1.0</span>
		</div>
		<div className="flex items-center gap-4">
			<div className="flex items-center gap-2">
				<div
					className={`h-2 w-2 rounded-full ${connected ? "bg-pi-green animate-pulse" : "bg-pi-red"}`}
				/>
				<span className="text-sm text-pi-muted">{connected ? "Connected" : "Disconnected"}</span>
			</div>
		</div>
	</header>
);
