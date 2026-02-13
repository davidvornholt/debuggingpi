import type { AppConfig } from "@debuggingpi/shared";
import { loadConfig } from "@debuggingpi/shared";

let cachedConfig: AppConfig | undefined;

export const getConfig = (): AppConfig => {
	if (!cachedConfig) {
		cachedConfig = loadConfig();
	}
	return cachedConfig;
};
