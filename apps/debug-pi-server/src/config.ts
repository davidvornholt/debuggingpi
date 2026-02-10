import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { Effect } from "effect";

import { ConfigSchema, defaultConfig } from "@debug-pi/shared";
import type { Config, ConfigUpdate } from "@debug-pi/shared";

export const configPath = "/etc/debug-pi/config.json";

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
  const apUpdate = update.ap ?? {};
  const usbUpdate = update.usb ?? {};

  return {
    ...current,
    ap: {
      ...current.ap,
      ...apUpdate,
    },
    usb: {
      ...current.usb,
      ...usbUpdate,
    },
  };
};

export const loadConfig = (): Effect.Effect<Config, ConfigError> =>
  readFile(configPath).pipe(
    Effect.catchAll((error) =>
      isErrnoException(error.error) && error.error.code === "ENOENT"
        ? Effect.succeed(JSON.stringify(defaultConfig))
        : Effect.fail(configError(`Failed to read ${configPath}: ${String(error.error)}`)),
    ),
    Effect.flatMap(parseConfig),
  );

export const saveConfig = (config: Config): Effect.Effect<Config, ConfigError> => {
  const dir = dirname(configPath);
  const tempPath = `${configPath}.tmp`;
  const payload = `${JSON.stringify(config, null, 2)}\n`;

  return Effect.gen(function* () {
    yield* ensureDir(dir);
    yield* writeFile(tempPath, payload);
    yield* renameFile(tempPath, configPath);

    return config;
  });
};

export const applyConfigUpdate = (update: ConfigUpdate): Effect.Effect<Config, ConfigError> =>
  Effect.flatMap(loadConfig(), (current) => saveConfig(mergeConfig(current, update)));
