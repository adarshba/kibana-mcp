import { configSchema, type Config } from "./schema.js";

const parseConfig = (): Config => {
  const result = configSchema.safeParse({
    kibanaUrl: process.env["KIBANA_URL"],
    kibanaApiKey: process.env["KIBANA_API_KEY"],
    timeoutMs: process.env["KIBANA_TIMEOUT_MS"],
    maxRetries: process.env["KIBANA_MAX_RETRIES"],
  });

  if (!result.success) {
    throw new Error(
      `Invalid configuration: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  return Object.freeze(result.data);
};

let cachedConfig: Config | undefined;

export const getConfig = (): Config => {
  if (!cachedConfig) {
    cachedConfig = Object.freeze(parseConfig());
  }
  return cachedConfig;
};

export const config: Config = new Proxy({} as Config, {
  get(_target, prop) {
    return getConfig()[prop as keyof Config];
  },
});

export type { Config };
