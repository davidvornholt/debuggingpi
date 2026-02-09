import { Effect, pipe } from "effect";
import { DebugPiConfig, DebugPiConfigSchema } from "@debug-pi/shared";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const CONFIG_PATH = "/etc/debug-pi/config.json";
const CONFIG_DIR = path.dirname(CONFIG_PATH);

// Read configuration from disk
export const readConfig = (): Effect.Effect<DebugPiConfig, Error> =>
  Effect.gen(function* () {
    try {
      const content = yield* Effect.tryPromise({
        try: () => fs.readFile(CONFIG_PATH, "utf-8"),
        catch: (error) => new Error(`Failed to read config: ${String(error)}`),
      });

      const parsed = JSON.parse(content);
      const validated = DebugPiConfigSchema.parse(parsed);
      return validated;
    } catch (error) {
      // Return default config if file doesn't exist
      if ((error as { code?: string }).code === "ENOENT") {
        return yield* getDefaultConfig();
      }
      return yield* Effect.fail(new Error(`Invalid config: ${String(error)}`));
    }
  });

// Write configuration to disk atomically
export const writeConfig = (
  config: DebugPiConfig,
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    // Validate config before writing
    const validated = DebugPiConfigSchema.parse(config);
    const content = JSON.stringify(validated, null, 2);

    // Ensure config directory exists
    yield* Effect.tryPromise({
      try: () => fs.mkdir(CONFIG_DIR, { recursive: true }),
      catch: (error) => new Error(`Failed to create config directory: ${String(error)}`),
    });

    // Write atomically using a temporary file
    const tmpPath = `${CONFIG_PATH}.tmp`;

    yield* Effect.tryPromise({
      try: () => fs.writeFile(tmpPath, content, "utf-8"),
      catch: (error) => new Error(`Failed to write temp config: ${String(error)}`),
    });

    yield* Effect.tryPromise({
      try: () => fs.rename(tmpPath, CONFIG_PATH),
      catch: (error) => new Error(`Failed to rename config: ${String(error)}`),
    });

    yield* Effect.tryPromise({
      try: () => fs.chmod(CONFIG_PATH, 0o644),
      catch: (error) => new Error(`Failed to set config permissions: ${String(error)}`),
    });
  });

// Update specific parts of the configuration
export const updateConfig = (
  updates: Partial<DebugPiConfig>,
): Effect.Effect<DebugPiConfig, Error> =>
  Effect.gen(function* () {
    const current = yield* readConfig();
    const updated = { ...current, ...updates };
    yield* writeConfig(updated);
    return updated;
  });

// Get default configuration
const getDefaultConfig = (): Effect.Effect<DebugPiConfig, Error> =>
  Effect.succeed({
    version: "1.0" as const,
    ap: {
      ssid: "DebugPi",
      passphrase: "debugpi123",
      channel: 6,
      regulatoryDomain: "US",
      hidden: false,
    },
    dhcp: {
      subnet: "192.168.1.0",
      netmask: "255.255.255.0",
      rangeStart: "192.168.1.50",
      rangeEnd: "192.168.1.150",
      leaseDuration: "12h",
    },
    usbTether: {
      enabled: true,
      interface: "usb0",
      address: "192.168.2.1",
      netmask: "255.255.255.0",
      dhcpRangeStart: "192.168.2.10",
      dhcpRangeEnd: "192.168.2.50",
    },
    system: {
      hostname: "debug-pi",
      timezone: "UTC",
    },
  });
