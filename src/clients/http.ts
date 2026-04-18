import { type Config } from "../config/schema.js";
import { KibanaError } from "../core/errors.js";

export type HttpClient = {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
};

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 10000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const backoffDelay = (attempt: number): number => {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 100;
  return Math.min(exponential + jitter, MAX_DELAY_MS);
};

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
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(backoffDelay(attempt - 1));
    }

    const response = await executeRequest(url, init, config.timeoutMs);

    if (!RETRYABLE_STATUS_CODES.has(response.status)) {
      return response;
    }

    lastResponse = response;
  }

  throw new KibanaError(
    `Request failed after ${config.maxRetries} retries: ${lastResponse?.statusText ?? "unknown"}`,
    lastResponse?.status ?? 0
  );
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new KibanaError(text, response.status);
  }

  return response.json() as Promise<T>;
};

export const createHttpClient = (config: Config): HttpClient => {
  const headers = {
    "Content-Type": "application/json",
    "kbn-xsrf": "true",
    Authorization: `ApiKey ${config.kibanaApiKey}`,
  };

  const get = async <T>(path: string): Promise<T> => {
    const url = `${config.kibanaUrl}${path}`;
    const response = await requestWithRetry(url, { method: "GET", headers }, config);
    return handleResponse<T>(response);
  };

  const post = async <T>(path: string, body: unknown): Promise<T> => {
    const url = `${config.kibanaUrl}${path}`;
    const response = await requestWithRetry(
      url,
      { method: "POST", headers, body: JSON.stringify(body) },
      config
    );
    return handleResponse<T>(response);
  };

  return { get, post };
};
