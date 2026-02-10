import { z } from "zod";

const isIpv4 = (value: string): boolean => {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (part.trim() === "" || !/^[0-9]+$/.test(part)) {
      return false;
    }
    const number = Number(part);
    return number >= 0 && number <= 255 && Number.isInteger(number);
  });
};

const isCidr = (value: string): boolean => {
  const [address, mask] = value.split("/");
  if (!address || mask === undefined) {
    return false;
  }

  const maskValue = Number(mask);
  return isIpv4(address) && Number.isInteger(maskValue) && maskValue >= 0 && maskValue <= 32;
};

const DhcpRangeSchema = z
  .object({
    start: z.string().refine(isIpv4, {
      message: "DHCP start must be a valid IPv4 address",
    }),
    end: z.string().refine(isIpv4, {
      message: "DHCP end must be a valid IPv4 address",
    }),
  })
  .strict();

const ApConfigSchema = z
  .object({
    ssid: z.string().min(1),
    passphrase: z.string().min(8).max(63),
    country: z.string().min(2).max(2),
    subnet: z.string().refine(isCidr, {
      message: "Subnet must be a valid CIDR",
    }),
    dhcpRange: DhcpRangeSchema,
  })
  .strict();

const UsbConfigSchema = z
  .object({
    enabled: z.boolean(),
    address: z.string().refine(isCidr, {
      message: "USB address must be a valid CIDR",
    }),
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

// Development/debug defaults only. Override ap.ssid and ap.passphrase in production via
// config file or DEBUG_PI_* environment variables.
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
