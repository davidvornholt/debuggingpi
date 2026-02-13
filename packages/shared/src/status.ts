import { z } from "zod";

export const UsbLinkStatus = z.enum(["connected", "disconnected", "unknown"]);
export type UsbLinkStatus = z.infer<typeof UsbLinkStatus>;

export const SystemMetrics = z.object({
	cpuPercent: z.number().min(0).max(100),
	memoryUsedMb: z.number().nonnegative(),
	memoryTotalMb: z.number().positive(),
	temperatureCelsius: z.number(),
	uptimeSeconds: z.number().nonnegative(),
});
export type SystemMetrics = z.infer<typeof SystemMetrics>;

export const WifiClient = z.object({
	mac: z.string(),
	signal: z.string().optional(),
});
export type WifiClient = z.infer<typeof WifiClient>;

export const NetworkStatus = z.object({
	usbLink: UsbLinkStatus,
	piZeroReachable: z.boolean(),
	piZeroIp: z.string(),
	wifiApActive: z.boolean(),
	wifiSsid: z.string(),
	wifiClients: z.array(WifiClient),
});
export type NetworkStatus = z.infer<typeof NetworkStatus>;

export const SystemStatus = z.object({
	hostname: z.string(),
	metrics: SystemMetrics,
	network: NetworkStatus,
	timestamp: z.string().datetime(),
});
export type SystemStatus = z.infer<typeof SystemStatus>;
