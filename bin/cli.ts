#!/usr/bin/env node
import { start } from "../src/server/index.js";

const [, , command] = process.argv;

if (command === "start") {
  start().catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
} else {
  process.stdout.write("Usage: kibana-mcp start\n\nEnvironment variables:\n  KIBANA_URL          Kibana base URL (required)\n  KIBANA_API_KEY      API key (required)\n  KIBANA_TIMEOUT_MS   Request timeout in ms (default: 30000)\n  KIBANA_MAX_RETRIES  Max retry attempts (default: 3)\n");
  process.exit(0);
}
