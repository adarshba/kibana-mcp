#!/usr/bin/env node
import { start } from "@/server";

const [, , command] = process.argv;

if (command === "start") {
  start().catch((err: Error) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
} else {
  process.stdout.write("Usage: kibana-mcp start\n\nEnvironment variables:\n  KIBANA_URL          Kibana base URL (required)\n  KIBANA_API_KEY      API key\n  KIBANA_USERNAME     Basic auth username (with KIBANA_PASSWORD)\n  KIBANA_PASSWORD     Basic auth password\n  KIBANA_COOKIE       Session cookie, e.g. sid=... (SSO / proxy)\n  (set exactly one auth method)\n  KIBANA_TIMEOUT_MS   Request timeout in ms (default: 30000)\n  KIBANA_MAX_RETRIES  Max retry attempts (default: 3)\n");
  process.exit(0);
}
