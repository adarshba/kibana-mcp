export const DEFAULT_TIMEOUT_MS = 30000;
export const DEFAULT_MAX_RETRIES = 3;
export const MAX_RETRIES_LIMIT = 10;
export const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
export const BASE_DELAY_MS = 200;
export const MAX_DELAY_MS = 10000;
export const MAX_JITTER_MS = 100;
