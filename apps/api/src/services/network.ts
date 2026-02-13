import type { NetworkStatus, UsbLinkStatus, WifiClient } from "@debuggingpi/shared";

const execQuiet = async (cmd: ReadonlyArray<string>): Promise<string> => {
	try {
		const proc = Bun.spawn(cmd as string[], { stdout: "pipe", stderr: "ignore" });
		const text = await new Response(proc.stdout).text();
		await proc.exited;
		return text.trim();
	} catch {
		return "";
	}
};

const checkUsbLink = async (): Promise<UsbLinkStatus> => {
	const output = await execQuiet(["ip", "link", "show", "usb0"]);
	if (!output) return "disconnected";
	return output.includes("state UP") ? "connected" : "disconnected";
};

const checkPiZeroReachable = async (host: string): Promise<boolean> => {
	const output = await execQuiet(["ping", "-c", "1", "-W", "2", host]);
	return output.includes("1 received") || output.includes("1 packets received");
};

const getWifiClients = async (): Promise<ReadonlyArray<WifiClient>> => {
	const output = await execQuiet(["iw", "dev", "wlan0", "station", "dump"]);
	if (!output) return [];

	const stations = output.split("Station ");
	return stations
		.filter((block) => block.trim().length > 0)
		.map((block) => {
			const macMatch = block.match(/^([0-9a-f:]{17})/i);
			const signalMatch = block.match(/signal:\s*(-?\d+)/);
			return {
				mac: macMatch?.[1] ?? "unknown",
				signal: signalMatch?.[1] ? `${signalMatch[1]} dBm` : undefined,
			};
		});
};

const checkWifiApActive = async (): Promise<boolean> => {
	const output = await execQuiet([
		"nmcli",
		"-t",
		"-f",
		"NAME,TYPE,DEVICE",
		"connection",
		"show",
		"--active",
	]);
	return output.includes("DebuggingPi");
};

const getWifiSsid = async (): Promise<string> => {
	const output = await execQuiet(["nmcli", "-t", "-f", "active,ssid", "dev", "wifi"]);
	const activeLine = output.split("\n").find((line) => line.startsWith("yes:"));
	return activeLine?.split(":")[1] ?? "DebuggingPi";
};

export const getNetworkStatus = async (piZeroHost: string): Promise<NetworkStatus> => {
	const [usbLink, piZeroReachable, wifiClients, wifiApActive, wifiSsid] = await Promise.all([
		checkUsbLink(),
		checkPiZeroReachable(piZeroHost),
		getWifiClients(),
		checkWifiApActive(),
		getWifiSsid(),
	]);

	return {
		usbLink,
		piZeroReachable,
		piZeroIp: piZeroHost,
		wifiApActive,
		wifiSsid,
		wifiClients: wifiClients as WifiClient[],
	};
};
