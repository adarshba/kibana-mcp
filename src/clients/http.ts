import { BASE_DELAY_MS, MAX_DELAY_MS, MAX_JITTER_MS, RETRYABLE_STATUS_CODES } from "@/core/constants";
import { KibanaError } from "@/core/errors";
import { type Config } from "@/types/config";
import { type HttpClient } from "@/types/http";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const backoffDelay = (attempt: number): number =>
  Math.min(BASE_DELAY_MS * 2 ** attempt + Math.random() * MAX_JITTER_MS, MAX_DELAY_MS);

const executeRequest = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const requestWithRetry = async (
  url: string,
  init: RequestInit,
  config: Config
): Promise<Response> => {
  let response = await executeRequest(url, init, config.timeoutMs);

  for (let attempt = 0; attempt < config.maxRetries && RETRYABLE_STATUS_CODES.has(response.status); attempt++) {
    await sleep(backoffDelay(attempt));
    response = await executeRequest(url, init, config.timeoutMs);
  }

  if (RETRYABLE_STATUS_CODES.has(response.status)) {
    throw new KibanaError(`Request failed after ${config.maxRetries} retries: ${response.statusText}`, response.status);
  }

  return response;
};

const authHeader = (config: Config): Record<string, string> => {
  if (config.kibanaApiKey) {
    return { Authorization: `ApiKey ${config.kibanaApiKey}` };
  }
  if (config.kibanaCookie) {
    return { Cookie: config.kibanaCookie };
  }
  const credentials = Buffer.from(`${config.kibanaUsername}:${config.kibanaPassword}`).toString("base64");
  return { Authorization: `Basic ${credentials}` };
};

export const createHttpClient = (config: Config): HttpClient => {
  const headers = {
    "Content-Type": "application/json",
    "kbn-xsrf": "true",
    ...authHeader(config),
  };

  const request = async <T>(path: string, init: RequestInit): Promise<T> => {
    const response = await requestWithRetry(`${config.kibanaUrl}${path}`, { ...init, headers }, config);

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new KibanaError(text, response.status);
    }

    return response.json() as Promise<T>;
  };

  return {
    get: (path) => request(path, { method: "GET" }),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  };
};
