import { type Config } from "@/types/config";
import { configSchema } from "./schema";

export const loadConfig = (): Config => {
  const result = configSchema.safeParse({
    kibanaUrl: process.env["KIBANA_URL"],
    kibanaApiKey: process.env["KIBANA_API_KEY"],
    kibanaUsername: process.env["KIBANA_USERNAME"],
    kibanaPassword: process.env["KIBANA_PASSWORD"],
    kibanaCookie: process.env["KIBANA_COOKIE"],
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
