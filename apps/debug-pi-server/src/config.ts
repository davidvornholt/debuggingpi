import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { Effect } from "effect";

import { ConfigSchema, defaultConfig } from "@debug-pi/shared";
import type { Config, ConfigUpdate } from "@debug-pi/shared";

export const getConfigPath = (): string =>
  process.env.DEBUG_PI_CONFIG_PATH ?? "/etc/debug-pi/config.json";

type ConfigError = {
  readonly _tag: "ConfigError";
  readonly message: string;
};

const configError = (message: string): ConfigError => ({
  _tag: "ConfigError",
  message,
});

type ConfigIoError = {
  readonly _tag: "ConfigIoError";
  readonly error: unknown;
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const readFile = (path: string): Effect.Effect<string, ConfigIoError> =>
  Effect.tryPromise({
    try: () => fs.readFile(path, "utf-8"),
    catch: (error) => ({ _tag: "ConfigIoError", error }),
  });

const writeFile = (path: string, data: string): Effect.Effect<void, ConfigError> =>
  Effect.tryPromise({
    try: () => fs.writeFile(path, data, "utf-8"),
    catch: (error) => configError(`Failed to write ${path}: ${String(error)}`),
  });

const renameFile = (from: string, to: string): Effect.Effect<void, ConfigError> =>
  Effect.tryPromise({
    try: () => fs.rename(from, to),
    catch: (error) => configError(`Failed to rename ${from}: ${String(error)}`),
  });

const removeFile = (path: string): Effect.Effect<void, ConfigError> =>
  Effect.tryPromise({
    try: () => fs.rm(path, { force: true }),
    catch: (error) => configError(`Failed to remove ${path}: ${String(error)}`),
  });

const ensureDir = (path: string): Effect.Effect<void, ConfigError> =>
  Effect.tryPromise({
    try: () => fs.mkdir(path, { recursive: true }),
    catch: (error) => configError(`Failed to create ${path}: ${String(error)}`),
  });

const parseConfig = (raw: string): Effect.Effect<Config, ConfigError> =>
  Effect.try({
    try: () => ConfigSchema.parse(JSON.parse(raw)),
    catch: (error) => configError(`Failed to parse config: ${String(error)}`),
  });

const mergeConfig = (current: Config, update: ConfigUpdate): Config => {
  return {
    ...current,
    ap: {
      ssid: update.ap?.ssid ?? current.ap.ssid,
      passphrase: update.ap?.passphrase ?? current.ap.passphrase,
      country: update.ap?.country ?? current.ap.country,
      subnet: update.ap?.subnet ?? current.ap.subnet,
      dhcpRange: {
        start: update.ap?.dhcpRange?.start ?? current.ap.dhcpRange.start,
        end: update.ap?.dhcpRange?.end ?? current.ap.dhcpRange.end,
      },
    },
    usb: {
      enabled: update.usb?.enabled ?? current.usb.enabled,
      address: update.usb?.address ?? current.usb.address,
    },
  };
};

const envString = (value: string | undefined, fallback: string): string => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return fallback;
};

const envBoolean = (value: string | undefined, fallback: boolean): boolean =>
  value !== undefined ? value === "true" : fallback;

const defaultConfigFromEnv = (): Config => {
  const ssid: string = envString(process.env.DEBUG_PI_SSID, defaultConfig.ap.ssid);
  const passphrase: string = envString(
    process.env.DEBUG_PI_PASSPHRASE,
    defaultConfig.ap.passphrase,
  );
  const country: string = envString(process.env.DEBUG_PI_COUNTRY, defaultConfig.ap.country);
  const subnet: string = envString(process.env.DEBUG_PI_SUBNET, defaultConfig.ap.subnet);
  const dhcpStart: string = envString(
    process.env.DEBUG_PI_DHCP_START,
    defaultConfig.ap.dhcpRange.start,
  );
  const dhcpEnd: string = envString(process.env.DEBUG_PI_DHCP_END, defaultConfig.ap.dhcpRange.end);
  const usbEnabled: boolean = envBoolean(
    process.env.DEBUG_PI_USB_ENABLED,
    defaultConfig.usb.enabled,
  );
  const usbAddress: string = envString(
    process.env.DEBUG_PI_USB_ADDRESS,
    defaultConfig.usb.address,
  );

  const candidate: Record<string, unknown> = {
    ap: {
      ssid,
      passphrase,
      country,
      subnet,
      dhcpRange: {
        start: dhcpStart,
        end: dhcpEnd,
      },
    },
    usb: {
      enabled: usbEnabled,
      address: usbAddress,
    },
  };

  const parsed = ConfigSchema.safeParse(candidate);
  return parsed.success ? parsed.data : defaultConfig;
};

export const loadConfig = (): Effect.Effect<Config, ConfigError> => {
  const configPath = getConfigPath();

  return readFile(configPath).pipe(
    Effect.catchAll((error) =>
      isErrnoException(error.error) && error.error.code === "ENOENT"
        ? Effect.succeed(defaultConfigFromEnv())
        : Effect.fail(configError(`Failed to read ${configPath}: ${String(error.error)}`)),
    ),
    Effect.flatMap((raw) => (typeof raw === "string" ? parseConfig(raw) : Effect.succeed(raw))),
  );
};

const uniqueTempPath = (path: string): string =>
  `${path}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

export const saveConfig = (config: Config): Effect.Effect<Config, ConfigError> => {
  const configPath = getConfigPath();
  const dir = dirname(configPath);
  const tempPath = uniqueTempPath(configPath);
  const payload = `${JSON.stringify(config, null, 2)}\n`;

  return Effect.gen(function* () {
    yield* ensureDir(dir);
    yield* writeFile(tempPath, payload);
    yield* renameFile(tempPath, configPath);

    return config;
  }).pipe(
    Effect.catchAll((error) =>
      removeFile(tempPath).pipe(
        Effect.catchAll(() => Effect.succeed(undefined)),
        Effect.flatMap(() => Effect.fail(error)),
      ),
    ),
  );
};

export const applyConfigUpdate = (update: ConfigUpdate): Effect.Effect<Config, ConfigError> =>
  Effect.flatMap(loadConfig(), (current) => saveConfig(mergeConfig(current, update)));
