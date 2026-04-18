# kibana-mcp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade TypeScript MCP server that exposes Kibana capabilities over stdio transport, publishable as an npm package with a `kibana-mcp start` CLI.

**Architecture:** Layered thin-adapter — config validates env at startup, an HTTP client handles transport concerns (auth, retry, timeout), a Kibana client maps typed methods to Kibana REST endpoints, and six tool files each export a single `Tool` value. The server layer wires tools onto an MCP `Server` instance connected to `StdioServerTransport`.

**Tech Stack:** TypeScript (strict ESM), Node.js >=20, pnpm, `@modelcontextprotocol/sdk`, `zod`, `tsup`

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | ESM package, bin, exports, deps |
| `tsconfig.json` | Strict TypeScript, NodeNext modules |
| `tsup.config.ts` | Build two entry points: server index + CLI |
| `src/config/schema.ts` | Zod env schema |
| `src/config/index.ts` | Parse env, export frozen Config |
| `src/types/kibana.ts` | Kibana API response types |
| `src/types/tool.ts` | ToolResult, StructuredError, Tool generic |
| `src/core/errors.ts` | ConfigError, KibanaError, mapToStructuredError |
| `src/clients/http.ts` | Fetch wrapper: auth, timeout, retry |
| `src/clients/kibana.ts` | Typed Kibana API methods |
| `src/tools/search-logs.ts` | `search_logs` tool |
| `src/tools/get-indices.ts` | `get_indices` tool |
| `src/tools/get-index-pattern.ts` | `get_index_pattern` tool |
| `src/tools/run-query.ts` | `run_query` tool |
| `src/tools/get-dashboards.ts` | `get_dashboards` tool |
| `src/tools/get-dashboard.ts` | `get_dashboard` tool |
| `src/server/registry.ts` | Register all tools on MCP server |
| `src/server/index.ts` | Bootstrap: config → client → server → connect |
| `bin/cli.ts` | `kibana-mcp start` CLI entry point |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialise git and pnpm**

```bash
cd /Users/adarsh.ba/breeze/kibana-mcp
git init
pnpm init
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "kibana-mcp",
  "version": "1.0.0",
  "description": "MCP server exposing Kibana capabilities over stdio",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "kibana-mcp": "./dist/cli.js"
  },
  "files": ["dist"],
  "sideEffects": false,
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.10.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": false,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": false
  },
  "include": ["src", "bin"]
}
```

- [ ] **Step 4: Write `tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/server/index.ts",
    cli: "bin/cli.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  target: "node20",
});
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
dist/
.env
*.env
```

- [ ] **Step 6: Install dependencies**

```bash
pnpm install
```

Expected: `node_modules/` populated, `pnpm-lock.yaml` created.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: project scaffold"
```

---

### Task 2: Config layer

**Files:**
- Create: `src/config/schema.ts`
- Create: `src/config/index.ts`

- [ ] **Step 1: Write `src/config/schema.ts`**

```ts
import { z } from "zod";

export const configSchema = z.object({
  kibanaUrl: z.string().url(),
  kibanaApiKey: z.string().min(1),
  timeoutMs: z.coerce.number().int().positive().default(30000),
  maxRetries: z.coerce.number().int().min(0).max(10).default(3),
});

export type Config = z.infer<typeof configSchema>;
```

- [ ] **Step 2: Write `src/config/index.ts`**

```ts
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
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/config/
git commit -m "feat: config layer with zod env validation"
```

---

### Task 3: Types layer

**Files:**
- Create: `src/types/kibana.ts`
- Create: `src/types/tool.ts`

- [ ] **Step 1: Write `src/types/kibana.ts`**

```ts
export type KibanaIndex = {
  name: string;
  health: string;
  status: string;
  docsCount: number;
  storeSize: string;
};

export type KibanaIndexPatternField = {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
};

export type KibanaIndexPattern = {
  id: string;
  title: string;
  timeFieldName: string | undefined;
  fields: KibanaIndexPatternField[];
};

export type KibanaDashboard = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
};

export type KibanaDashboardDetail = {
  id: string;
  title: string;
  description: string;
  panels: unknown[];
  updatedAt: string;
};

export type KibanaHit<T> = {
  _id: string;
  _index: string;
  _score: number | null;
  _source: T;
};

export type KibanaSearchResponse<T> = {
  took: number;
  hits: {
    total: { value: number; relation: string };
    hits: KibanaHit<T>[];
  };
};

export type KibanaSavedObjectsResponse<T> = {
  total: number;
  saved_objects: Array<{
    id: string;
    attributes: T;
    updated_at: string;
  }>;
};

export type KibanaDashboardAttributes = {
  title: string;
  description?: string;
  panelsJSON?: string;
};

export type KibanaIndexManagementIndex = {
  name: string;
  health: string;
  status: string;
  documents: { count: number };
  size: { store: string };
};

export type KibanaIndexPatternResponse = {
  index_pattern: {
    id: string;
    title: string;
    timeFieldName?: string;
    fields: Record<string, { type: string; searchable: boolean; aggregatable: boolean }>;
  };
};
```

- [ ] **Step 2: Write `src/types/tool.ts`**

```ts
import { type ZodSchema } from "zod";
import { type KibanaClient } from "../clients/kibana.js";

export type StructuredError = {
  code: string;
  message: string;
  statusCode?: number;
};

export type ToolSuccess<T> = { ok: true; data: T };
export type ToolFailure = { ok: false; error: StructuredError };
export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export type Tool<I, O> = {
  name: string;
  description: string;
  inputSchema: ZodSchema<I>;
  execute: (input: I, client: KibanaClient) => Promise<ToolResult<O>>;
};
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/
git commit -m "feat: shared kibana and tool types"
```

---

### Task 4: Core errors

**Files:**
- Create: `src/core/errors.ts`

- [ ] **Step 1: Write `src/core/errors.ts`**

```ts
import { type StructuredError } from "../types/tool.js";

export class KibanaError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "KibanaError";
    this.statusCode = statusCode;
  }
}

export const mapToStructuredError = (err: unknown): StructuredError => {
  if (err instanceof KibanaError) {
    return {
      code: "KIBANA_ERROR",
      message: err.message,
      statusCode: err.statusCode,
    };
  }

  if (err instanceof Error) {
    return {
      code: "UNEXPECTED_ERROR",
      message: err.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: String(err),
  };
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/core/
git commit -m "feat: core error types and mapper"
```

---

### Task 5: HTTP client

**Files:**
- Create: `src/clients/http.ts`

- [ ] **Step 1: Write `src/clients/http.ts`**

```ts
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
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/clients/http.ts
git commit -m "feat: HTTP client with retry and timeout"
```

---

### Task 6: Kibana client

**Files:**
- Create: `src/clients/kibana.ts`

- [ ] **Step 1: Write `src/clients/kibana.ts`**

```ts
import { type HttpClient } from "./http.js";
import {
  type KibanaSearchResponse,
  type KibanaIndex,
  type KibanaIndexPattern,
  type KibanaDashboard,
  type KibanaDashboardDetail,
  type KibanaSavedObjectsResponse,
  type KibanaDashboardAttributes,
  type KibanaIndexManagementIndex,
  type KibanaIndexPatternResponse,
} from "../types/kibana.js";

export type SearchLogsParams = {
  index: string;
  query: string;
  from?: string;
  to?: string;
  size: number;
  offset: number;
};

export type RunQueryParams = {
  index: string;
  query: Record<string, unknown>;
  size: number;
};

export type GetDashboardsParams = {
  page: number;
  perPage: number;
};

export type KibanaClient = {
  searchLogs: (params: SearchLogsParams) => Promise<KibanaSearchResponse<unknown>>;
  getIndices: () => Promise<KibanaIndex[]>;
  getIndexPattern: (id: string) => Promise<KibanaIndexPattern>;
  runQuery: (params: RunQueryParams) => Promise<KibanaSearchResponse<unknown>>;
  getDashboards: (params: GetDashboardsParams) => Promise<{ total: number; items: KibanaDashboard[] }>;
  getDashboard: (id: string) => Promise<KibanaDashboardDetail>;
};

export const createKibanaClient = (http: HttpClient): KibanaClient => {
  const searchLogs = async (params: SearchLogsParams): Promise<KibanaSearchResponse<unknown>> => {
    const body: Record<string, unknown> = {
      from: params.offset,
      size: params.size,
      query: {
        bool: {
          must: [{ query_string: { query: params.query } }],
          ...(params.from || params.to
            ? {
                filter: [
                  {
                    range: {
                      "@timestamp": {
                        ...(params.from ? { gte: params.from } : {}),
                        ...(params.to ? { lte: params.to } : {}),
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      },
      sort: [{ "@timestamp": { order: "desc" } }],
    };

    const path = `/api/console/proxy?path=${encodeURIComponent(`${params.index}/_search`)}&method=POST`;
    return http.post<KibanaSearchResponse<unknown>>(path, body);
  };

  const getIndices = async (): Promise<KibanaIndex[]> => {
    const raw = await http.get<KibanaIndexManagementIndex[]>("/api/index_management/indices");
    return raw.map((idx) => ({
      name: idx.name,
      health: idx.health,
      status: idx.status,
      docsCount: idx.documents.count,
      storeSize: idx.size.store,
    }));
  };

  const getIndexPattern = async (id: string): Promise<KibanaIndexPattern> => {
    const raw = await http.get<KibanaIndexPatternResponse>(
      `/api/index_patterns/index_pattern/${encodeURIComponent(id)}`
    );
    const ip = raw.index_pattern;
    return {
      id: ip.id,
      title: ip.title,
      timeFieldName: ip.timeFieldName,
      fields: Object.entries(ip.fields).map(([name, field]) => ({
        name,
        type: field.type,
        searchable: field.searchable,
        aggregatable: field.aggregatable,
      })),
    };
  };

  const runQuery = async (params: RunQueryParams): Promise<KibanaSearchResponse<unknown>> => {
    const body = { ...params.query, size: params.size };
    const path = `/api/console/proxy?path=${encodeURIComponent(`${params.index}/_search`)}&method=POST`;
    return http.post<KibanaSearchResponse<unknown>>(path, body);
  };

  const getDashboards = async (
    params: GetDashboardsParams
  ): Promise<{ total: number; items: KibanaDashboard[] }> => {
    const path = `/api/saved_objects/_find?type=dashboard&per_page=${params.perPage}&page=${params.page}`;
    const raw = await http.get<KibanaSavedObjectsResponse<KibanaDashboardAttributes>>(path);
    return {
      total: raw.total,
      items: raw.saved_objects.map((obj) => ({
        id: obj.id,
        title: obj.attributes.title,
        description: obj.attributes.description ?? "",
        updatedAt: obj.updated_at,
      })),
    };
  };

  const getDashboard = async (id: string): Promise<KibanaDashboardDetail> => {
    const raw = await http.get<KibanaSavedObjectsResponse<KibanaDashboardAttributes>["saved_objects"][number]>(
      `/api/saved_objects/dashboard/${encodeURIComponent(id)}`
    );
    const panels: unknown[] = raw.attributes.panelsJSON
      ? (JSON.parse(raw.attributes.panelsJSON) as unknown[])
      : [];
    return {
      id: raw.id,
      title: raw.attributes.title,
      description: raw.attributes.description ?? "",
      panels,
      updatedAt: raw.updated_at,
    };
  };

  return { searchLogs, getIndices, getIndexPattern, runQuery, getDashboards, getDashboard };
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/clients/kibana.ts
git commit -m "feat: typed Kibana API client"
```

---

### Task 7: Tool — search_logs

**Files:**
- Create: `src/tools/search-logs.ts`

- [ ] **Step 1: Write `src/tools/search-logs.ts`**

```ts
import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";

const inputSchema = z.object({
  index: z.string().min(1),
  query: z.string().min(1),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  size: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
});

type Input = z.infer<typeof inputSchema>;

type Output = {
  total: number;
  hits: Array<{
    id: string;
    index: string;
    score: number | null;
    source: unknown;
  }>;
};

export const searchLogsTool: Tool<Input, Output> = {
  name: "search_logs",
  description:
    "Search logs in a Kibana index using KQL or Lucene query syntax with optional time range filtering and pagination.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const result = await client.searchLogs({
        index: input.index,
        query: input.query,
        from: input.from,
        to: input.to,
        size: input.size,
        offset: input.offset,
      });

      return {
        ok: true,
        data: {
          total: result.hits.total.value,
          hits: result.hits.hits.map((hit) => ({
            id: hit._id,
            index: hit._index,
            score: hit._score,
            source: hit._source,
          })),
        },
      };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/search-logs.ts
git commit -m "feat: search_logs tool"
```

---

### Task 8: Tool — get_indices

**Files:**
- Create: `src/tools/get-indices.ts`

- [ ] **Step 1: Write `src/tools/get-indices.ts`**

```ts
import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaIndex } from "../types/kibana.js";

const inputSchema = z.object({});

type Input = z.infer<typeof inputSchema>;

export const getIndicesTool: Tool<Input, KibanaIndex[]> = {
  name: "get_indices",
  description: "List all Elasticsearch indices available through Kibana.",
  inputSchema,
  execute: async (_input, client) => {
    try {
      const indices = await client.getIndices();
      return { ok: true, data: indices };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-indices.ts
git commit -m "feat: get_indices tool"
```

---

### Task 9: Tool — get_index_pattern

**Files:**
- Create: `src/tools/get-index-pattern.ts`

- [ ] **Step 1: Write `src/tools/get-index-pattern.ts`**

```ts
import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaIndexPattern } from "../types/kibana.js";

const inputSchema = z.object({
  id: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

export const getIndexPatternTool: Tool<Input, KibanaIndexPattern> = {
  name: "get_index_pattern",
  description: "Fetch details of a Kibana index pattern by its ID, including field definitions.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const pattern = await client.getIndexPattern(input.id);
      return { ok: true, data: pattern };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-index-pattern.ts
git commit -m "feat: get_index_pattern tool"
```

---

### Task 10: Tool — run_query

**Files:**
- Create: `src/tools/run-query.ts`

- [ ] **Step 1: Write `src/tools/run-query.ts`**

```ts
import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";

const inputSchema = z.object({
  index: z.string().min(1),
  query: z.record(z.unknown()),
  size: z.number().int().min(1).max(10000).default(10),
});

type Input = z.infer<typeof inputSchema>;

type Output = {
  took: number;
  total: number;
  hits: unknown[];
};

export const runQueryTool: Tool<Input, Output> = {
  name: "run_query",
  description:
    "Execute a raw Elasticsearch DSL query against a Kibana index and return hits and metadata.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const result = await client.runQuery({
        index: input.index,
        query: input.query,
        size: input.size,
      });

      return {
        ok: true,
        data: {
          took: result.took,
          total: result.hits.total.value,
          hits: result.hits.hits,
        },
      };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/run-query.ts
git commit -m "feat: run_query tool"
```

---

### Task 11: Tool — get_dashboards

**Files:**
- Create: `src/tools/get-dashboards.ts`

- [ ] **Step 1: Write `src/tools/get-dashboards.ts`**

```ts
import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaDashboard } from "../types/kibana.js";

const inputSchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});

type Input = z.infer<typeof inputSchema>;

type Output = {
  total: number;
  items: KibanaDashboard[];
};

export const getDashboardsTool: Tool<Input, Output> = {
  name: "get_dashboards",
  description: "List Kibana dashboards with pagination.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const result = await client.getDashboards({ page: input.page, perPage: input.perPage });
      return { ok: true, data: result };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-dashboards.ts
git commit -m "feat: get_dashboards tool"
```

---

### Task 12: Tool — get_dashboard

**Files:**
- Create: `src/tools/get-dashboard.ts`

- [ ] **Step 1: Write `src/tools/get-dashboard.ts`**

```ts
import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaDashboardDetail } from "../types/kibana.js";

const inputSchema = z.object({
  id: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

export const getDashboardTool: Tool<Input, KibanaDashboardDetail> = {
  name: "get_dashboard",
  description: "Fetch details of a specific Kibana dashboard by ID, including its panel configuration.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const dashboard = await client.getDashboard(input.id);
      return { ok: true, data: dashboard };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/get-dashboard.ts
git commit -m "feat: get_dashboard tool"
```

---

### Task 13: Server registry

**Files:**
- Create: `src/server/registry.ts`

- [ ] **Step 1: Write `src/server/registry.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type KibanaClient } from "../clients/kibana.js";
import { searchLogsTool } from "../tools/search-logs.js";
import { getIndicesTool } from "../tools/get-indices.js";
import { getIndexPatternTool } from "../tools/get-index-pattern.js";
import { runQueryTool } from "../tools/run-query.js";
import { getDashboardsTool } from "../tools/get-dashboards.js";
import { getDashboardTool } from "../tools/get-dashboard.js";
import { type Tool } from "../types/tool.js";

const tools: Tool<never, unknown>[] = [
  searchLogsTool as Tool<never, unknown>,
  getIndicesTool as Tool<never, unknown>,
  getIndexPatternTool as Tool<never, unknown>,
  runQueryTool as Tool<never, unknown>,
  getDashboardsTool as Tool<never, unknown>,
  getDashboardTool as Tool<never, unknown>,
];

export const registerTools = (server: McpServer, client: KibanaClient): void => {
  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.inputSchema.shape, async (input) => {
      const result = await tool.execute(input as never, client);

      if (result.ok) {
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result.error, null, 2) }],
        isError: true,
      };
    });
  }
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors. If the MCP SDK's `server.tool` signature differs slightly, adjust the call to match the installed SDK version while keeping the same logical structure.

- [ ] **Step 3: Commit**

```bash
git add src/server/registry.ts
git commit -m "feat: tool registry"
```

---

### Task 14: Server bootstrap

**Files:**
- Create: `src/server/index.ts`

- [ ] **Step 1: Write `src/server/index.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "../config/index.js";
import { createHttpClient } from "../clients/http.js";
import { createKibanaClient } from "../clients/kibana.js";
import { registerTools } from "./registry.js";

export const start = async (): Promise<void> => {
  const http = createHttpClient(config);
  const kibana = createKibanaClient(http);

  const server = new McpServer({
    name: "kibana-mcp",
    version: "1.0.0",
  });

  registerTools(server, kibana);

  const transport = new StdioServerTransport();
  await server.connect(transport);
};
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: server bootstrap"
```

---

### Task 15: CLI entry point

**Files:**
- Create: `bin/cli.ts`

- [ ] **Step 1: Create bin directory and write `bin/cli.ts`**

```bash
mkdir -p bin
```

```ts
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
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add bin/cli.ts
git commit -m "feat: CLI entry point"
```

---

### Task 16: Build and verify

**Files:** none created, build output verified

- [ ] **Step 1: Run build**

```bash
pnpm build
```

Expected: `dist/` directory created with `index.js`, `index.d.ts`, `cli.js`, `cli.d.ts`. No errors.

- [ ] **Step 2: Verify CLI is executable**

```bash
node dist/cli.js
```

Expected output:
```
Usage: kibana-mcp start

Environment variables:
  KIBANA_URL          Kibana base URL (required)
  KIBANA_API_KEY      API key (required)
  KIBANA_TIMEOUT_MS   Request timeout in ms (default: 30000)
  KIBANA_MAX_RETRIES  Max retry attempts (default: 3)
```

- [ ] **Step 3: Verify config fail-fast**

```bash
node dist/cli.js start
```

Expected: exits with error message about missing `KIBANA_URL` and `KIBANA_API_KEY` on stderr.

- [ ] **Step 4: Final typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add dist/ .gitignore
git commit -m "chore: production build verified"
```

---

## Self-Review Notes

- All 6 tools specified in the spec (`search_logs`, `get_indices`, `get_index_pattern`, `run_query`, `get_dashboards`, `get_dashboard`) have corresponding tasks (7–12).
- Config layer covers all 4 env vars with correct defaults.
- Error flow: `KibanaError` defined in Task 4, used in Task 5 (HTTP client), propagates through Task 6 (Kibana client), caught in Tasks 7–12 (tools) via `mapToStructuredError`.
- `ToolResult<T>` type defined in Task 3, referenced consistently in Tasks 7–13.
- `Tool<I, O>` generic uses `KibanaClient` from `clients/kibana.ts` — forward reference resolved because TypeScript resolves by type, not declaration order.
- Registry (Task 13) uses `tool.inputSchema.shape` — this is the correct zod API for `ZodObject`. For tools with `z.object({})` (empty schema), `.shape` returns `{}` which is valid.
- `run_query` input schema uses `z.record(z.unknown())` for the DSL body, matching the spec note about arbitrary ES DSL passthrough.
- No comments, no console logs, no unused exports in any file.
