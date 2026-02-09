import { z } from "zod";

// Regulatory domain schema (ISO 3166-1 alpha-2 country codes)
export const RegulatoryDomainSchema = z.string().length(2).toUpperCase();

// WiFi AP configuration schema
export const APConfigSchema = z.object({
  ssid: z.string().min(1).max(32),
  passphrase: z.string().min(8).max(63),
  channel: z.number().int().min(1).max(13).default(6),
  regulatoryDomain: RegulatoryDomainSchema,
  hidden: z.boolean().default(false),
});

export type APConfig = z.infer<typeof APConfigSchema>;

// DHCP configuration schema
export const DHCPConfigSchema = z.object({
  subnet: z.string().ip().default("192.168.1.0"),
  netmask: z.string().ip().default("255.255.255.0"),
  rangeStart: z.string().ip().default("192.168.1.50"),
  rangeEnd: z.string().ip().default("192.168.1.150"),
  leaseDuration: z.string().default("12h"),
});

export type DHCPConfig = z.infer<typeof DHCPConfigSchema>;

// USB tethering configuration schema
export const USBTetherConfigSchema = z.object({
  enabled: z.boolean().default(true),
  interface: z.string().default("usb0"),
  address: z.string().ip().default("192.168.2.1"),
  netmask: z.string().ip().default("255.255.255.0"),
  dhcpRangeStart: z.string().ip().default("192.168.2.10"),
  dhcpRangeEnd: z.string().ip().default("192.168.2.50"),
});

export type USBTetherConfig = z.infer<typeof USBTetherConfigSchema>;

// System configuration schema
export const SystemConfigSchema = z.object({
  hostname: z.string().default("debug-pi"),
  timezone: z.string().default("UTC"),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

// Complete debugging pi configuration
export const DebugPiConfigSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  ap: APConfigSchema,
  dhcp: DHCPConfigSchema,
  usbTether: USBTetherConfigSchema,
  system: SystemConfigSchema,
});

export type DebugPiConfig = z.infer<typeof DebugPiConfigSchema>;

// Daemon request schemas (for Unix socket communication)
export const DaemonRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("restart-ap"),
    config: APConfigSchema,
  }),
  z.object({
    type: z.literal("restart-dhcp"),
    config: DHCPConfigSchema,
  }),
  z.object({
    type: z.literal("configure-usb-tether"),
    config: USBTetherConfigSchema,
  }),
  z.object({
    type: z.literal("get-status"),
  }),
  z.object({
    type: z.literal("get-logs"),
    service: z.string().optional(),
    lines: z.number().int().positive().default(100),
  }),
  z.object({
    type: z.literal("reboot"),
  }),
  z.object({
    type: z.literal("shutdown"),
  }),
]);

export type DaemonRequest = z.infer<typeof DaemonRequestSchema>;

// Status types
export type ServiceStatus = "active" | "inactive" | "failed" | "unknown";

export type SystemStatus = {
  hostname: string;
  uptime: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
  };
  cpuLoad: number[];
  services: {
    hostapd: ServiceStatus;
    dnsmasq: ServiceStatus;
    debugPiServer: ServiceStatus;
  };
  network: {
    ap: {
      interface: string;
      connected: number;
    };
    usb: {
      interface: string;
      connected: boolean;
    };
  };
};
