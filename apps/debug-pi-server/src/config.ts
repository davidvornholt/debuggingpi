import type { DebugPiConfig } from "@debuggingpi/shared/config-schema";
import { DebugPiConfigSchema, DefaultDebugPiConfig } from "@debuggingpi/shared/config-schema";
import { Effect, pipe } from "effect";

const CONFIG_PATH = "/etc/debug-pi/config.json";
const CONFIG_PATH_DEV = "./config.json";

const getConfigPath = (): string =>
  process.env.NODE_ENV === "production" ? CONFIG_PATH : CONFIG_PATH_DEV;

export const readConfig = (): Effect.Effect<DebugPiConfig, Error, never> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const path = getConfigPath();
        const file = Bun.file(path);
        if (!(await file.exists())) {
          return DefaultDebugPiConfig;
        }
        const text = await file.text();
        return JSON.parse(text);
      },
      catch: (error) => new Error(`Failed to read config: ${String(error)}`),
    }),
    Effect.flatMap((data) =>
      Effect.try({
        try: () => DebugPiConfigSchema.parse(data),
        catch: (error) => new Error(`Invalid config format: ${String(error)}`),
      }),
    ),
  );

export const writeConfig = (config: DebugPiConfig): Effect.Effect<void, Error, never> =>
  pipe(
    Effect.try({
      try: () => DebugPiConfigSchema.parse(config),
      catch: (error) => new Error(`Invalid config: ${String(error)}`),
    }),
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: async () => {
          const path = getConfigPath();
          const tempPath = `${path}.tmp`;
          await Bun.write(tempPath, JSON.stringify(config, null, 2));
          await Bun.write(path, await Bun.file(tempPath).text());
        },
        catch: (error) => new Error(`Failed to write config: ${String(error)}`),
      }),
    ),
  );

export const updateConfig = (
  updater: (config: DebugPiConfig) => DebugPiConfig,
): Effect.Effect<DebugPiConfig, Error, never> =>
  pipe(
    readConfig(),
    Effect.map(updater),
    Effect.flatMap((newConfig) =>
      pipe(
        writeConfig(newConfig),
        Effect.map(() => newConfig),
      ),
    ),
  );
