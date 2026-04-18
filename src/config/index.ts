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

export const config: Config = parseConfig();
export type { Config };
