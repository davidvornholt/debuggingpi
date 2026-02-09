import { z } from "zod";

export const WifiRegulatoryDomainSchema = z.enum(["US", "GB", "DE", "FR", "JP", "CN", "AU", "CA"]);

export const AccessPointConfigSchema = z.object({
  enabled: z.boolean(),
  ssid: z.string().min(1).max(32),
  passphrase: z.string().min(8).max(63),
  channel: z.number().int().min(1).max(13),
  regulatoryDomain: WifiRegulatoryDomainSchema,
  subnet: z.string().ip({ version: "v4" }),
  subnetMask: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/),
  dhcpRangeStart: z.string().ip({ version: "v4" }),
  dhcpRangeEnd: z.string().ip({ version: "v4" }),
});

export const UsbTetheringConfigSchema = z.object({
  enabled: z.boolean(),
  deviceAddress: z.string().ip({ version: "v4" }),
  clientAddress: z.string().ip({ version: "v4" }),
  subnetMask: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/),
});

export const SystemConfigSchema = z.object({
  hostname: z.string().min(1).max(63),
  timezone: z.string(),
});

export const DebugPiConfigSchema = z.object({
  version: z.literal(1),
  accessPoint: AccessPointConfigSchema,
  usbTethering: UsbTetheringConfigSchema,
  system: SystemConfigSchema,
});

export type WifiRegulatoryDomain = z.infer<typeof WifiRegulatoryDomainSchema>;
export type AccessPointConfig = z.infer<typeof AccessPointConfigSchema>;
export type UsbTetheringConfig = z.infer<typeof UsbTetheringConfigSchema>;
export type SystemConfig = z.infer<typeof SystemConfigSchema>;
export type DebugPiConfig = z.infer<typeof DebugPiConfigSchema>;

export const DefaultDebugPiConfig: DebugPiConfig = {
  version: 1,
  accessPoint: {
    enabled: true,
    ssid: "DebugPi",
    passphrase: "debugpi123",
    channel: 6,
    regulatoryDomain: "US",
    subnet: "192.168.1.1",
    subnetMask: "255.255.255.0",
    dhcpRangeStart: "192.168.1.10",
    dhcpRangeEnd: "192.168.1.250",
  },
  usbTethering: {
    enabled: true,
    deviceAddress: "192.168.2.1",
    clientAddress: "192.168.2.2",
    subnetMask: "255.255.255.0",
  },
  system: {
    hostname: "debug-pi",
    timezone: "UTC",
  },
};
