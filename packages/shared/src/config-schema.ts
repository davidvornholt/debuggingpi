import { z } from "zod";

const DhcpRangeSchema = z
  .object({
    start: z.string().min(1),
    end: z.string().min(1),
  })
  .strict();

const ApConfigSchema = z
  .object({
    ssid: z.string().min(1),
    passphrase: z.string().min(8).max(63),
    country: z.string().min(2).max(2),
    subnet: z.string().min(1),
    dhcpRange: DhcpRangeSchema,
  })
  .strict();

const UsbConfigSchema = z
  .object({
    enabled: z.boolean(),
    address: z.string().min(1),
  })
  .strict();

export const ConfigSchema = z
  .object({
    ap: ApConfigSchema,
    usb: UsbConfigSchema,
  })
  .strict();

export const ConfigUpdateSchema = z
  .object({
    ap: ApConfigSchema.partial().optional(),
    usb: UsbConfigSchema.partial().optional(),
  })
  .strict();

export type Config = z.infer<typeof ConfigSchema>;
export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;

export const defaultConfig: Config = {
  ap: {
    ssid: "debug-pi",
    passphrase: "debug-pi-setup",
    country: "US",
    subnet: "192.168.1.1/24",
    dhcpRange: {
      start: "192.168.1.10",
      end: "192.168.1.200",
    },
  },
  usb: {
    enabled: true,
    address: "10.55.0.1/24",
  },
};
