# kibana-mcp Design Spec

**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

A production-grade TypeScript MCP server exposing Kibana capabilities over stdio transport. Publishable as an npm package with a `kibana-mcp start` CLI entry point.

---

## Constraints

- Language: TypeScript (strict mode)
- Runtime: Node.js >= 20
- Module system: ESM only
- Package manager: pnpm
- Transport: stdio only
- Auth: API key only (`Authorization: ApiKey <value>`)
- No comments anywhere in the codebase
- No console logs
- No unused exports
- No implicit any
- No classes unless necessary
- No tests

---

## Project Structure

```
kibana-mcp/
├── src/
│   ├── config/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── kibana.ts
│   │   └── tool.ts
│   ├── clients/
│   │   ├── http.ts
│   │   └── kibana.ts
│   ├── core/
│   │   └── errors.ts
│   ├── tools/
│   │   ├── search-logs.ts
│   │   ├── get-indices.ts
│   │   ├── get-index-pattern.ts
│   │   ├── run-query.ts
│   │   ├── get-dashboards.ts
│   │   └── get-dashboard.ts
│   └── server/
│       ├── registry.ts
│       └── index.ts
├── bin/
│   └── cli.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## Config Layer

### `src/config/schema.ts`

Zod schema validating environment variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `KIBANA_URL` | yes | — | Base URL of Kibana instance |
| `KIBANA_API_KEY` | yes | — | Raw API key value |
| `KIBANA_TIMEOUT_MS` | no | `30000` | Request timeout in milliseconds |
| `KIBANA_MAX_RETRIES` | no | `3` | Max retry attempts for transient errors |

### `src/config/index.ts`

Parses `process.env` against the schema. Throws `ConfigError` on validation failure. Exports a single frozen `Config` object. No `process.env` reads anywhere else in the codebase.

---

## Types Layer

### `src/types/kibana.ts`

TypeScript types for Kibana REST API response shapes:
- `KibanaIndex`
- `KibanaIndexPattern`
- `KibanaDashboard`
- `KibanaDashboardDetail`
- `KibanaSearchResponse<T>`
- `KibanaHit<T>`

### `src/types/tool.ts`

```ts
type ToolSuccess<T> = { ok: true; data: T }
type ToolFailure = { ok: false; error: StructuredError }
type ToolResult<T> = ToolSuccess<T> | ToolFailure

type StructuredError = {
  code: string
  message: string
  statusCode?: number
}
```

---

## Core Layer

### `src/core/errors.ts`

Error types and mappers:

- `ConfigError extends Error` — thrown when env validation fails
- `KibanaError extends Error` — thrown by HTTP client on non-2xx responses; carries `statusCode` and `message`
- `mapToStructuredError(err: unknown): StructuredError` — maps any thrown value to `StructuredError`; never rethrows

---

## Clients Layer

### `src/clients/http.ts`

```ts
type HttpClient = {
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
}

const createHttpClient = (config: Config): HttpClient
```

Responsibilities:
- Prepend `config.kibanaUrl` to all paths
- Attach `Authorization: ApiKey ${config.kibanaApiKey}` header
- Enforce `config.timeoutMs` via `AbortController`
- Retry on HTTP 429, 502, 503, 504 using exponential backoff with jitter
  - Delay formula: `min(baseMs * 2^attempt + jitter, maxMs)`
  - `baseMs = 200`, `maxMs = 10000`, jitter = random 0–100ms
  - Max `config.maxRetries` attempts before throwing
- Throw `KibanaError` on non-2xx after retries exhausted
- No business logic, no JSON transformation beyond `response.json()`

### `src/clients/kibana.ts`

```ts
type KibanaClient = {
  searchLogs: (params: SearchLogsParams) => Promise<KibanaSearchResponse<unknown>>
  getIndices: () => Promise<KibanaIndex[]>
  getIndexPattern: (id: string) => Promise<KibanaIndexPattern>
  runQuery: (params: RunQueryParams) => Promise<KibanaSearchResponse<unknown>>
  getDashboards: (params: GetDashboardsParams) => Promise<KibanaDashboard[]>
  getDashboard: (id: string) => Promise<KibanaDashboardDetail>
}

const createKibanaClient = (http: HttpClient): KibanaClient
```

API mappings:

| Method | HTTP | Kibana endpoint |
|---|---|---|
| `searchLogs` | POST | `/api/console/proxy?path=<index>/_search&method=POST` |
| `getIndices` | GET | `/api/index_management/indices` |
| `getIndexPattern` | GET | `/api/index_patterns/index_pattern/:id` |
| `runQuery` | POST | `/api/console/proxy?path=<index>/_search&method=POST` |
| `getDashboards` | GET | `/api/saved_objects/_find?type=dashboard&per_page=:size&page=:page` |
| `getDashboard` | GET | `/api/saved_objects/dashboard/:id` |

Each method is typed end-to-end. No error catching — `KibanaError` propagates to the tool layer.

---

## Tools Layer

Each tool file exports a single `Tool<I, O>` value:

```ts
type Tool<I, O> = {
  name: string
  description: string
  inputSchema: ZodSchema<I>
  execute: (input: I, client: KibanaClient) => Promise<ToolResult<O>>
}
```

All tools catch `KibanaError` (and any other thrown value) via `mapToStructuredError` and return `{ ok: false, error }`. Nothing rethrows to the MCP layer.

### `search_logs`

Input:
- `index` — string, required
- `query` — string (KQL or Lucene), required
- `from` — ISO 8601 string, optional
- `to` — ISO 8601 string, optional
- `size` — number, optional, default 50, max 500
- `offset` — number, optional, default 0

Output: array of normalized hit objects `{ id, index, score, source }` plus `total`.

### `get_indices`

Input: none

Output: array of `{ name, health, status, docsCount, storeSize }`.

### `get_index_pattern`

Input:
- `id` — string, required

Output: `{ id, title, timeFieldName, fields }`.

### `run_query`

Input:
- `index` — string, required
- `query` — arbitrary Elasticsearch DSL object (passthrough), required
- `size` — number, optional, default 10

Output: raw `hits` array plus `total` and `took`.

### `get_dashboards`

Input:
- `page` — number, optional, default 1
- `perPage` — number, optional, default 20, max 100

Output: array of `{ id, title, description, updatedAt }` plus `total`.

### `get_dashboard`

Input:
- `id` — string, required

Output: `{ id, title, description, panels, updatedAt }` where `panels` is the raw panel array from the saved object attributes.

---

## Server Layer

### `src/server/registry.ts`

```ts
const registerTools = (server: McpServer, client: KibanaClient): void
```

Imports all six tool objects. For each, calls `server.tool(tool.name, tool.inputSchema, handler)` where handler calls `tool.execute`, formats `ToolResult` into MCP `CallToolResult` shape.

Success path: `{ content: [{ type: "text", text: JSON.stringify(data) }] }`  
Error path: `{ content: [{ type: "text", text: JSON.stringify(error) }], isError: true }`

### `src/server/index.ts`

```ts
const start = async (): Promise<void>
```

1. Load and validate config
2. `createHttpClient(config)`
3. `createKibanaClient(http)`
4. `new McpServer({ name: "kibana-mcp", version: "1.0.0" })`
5. `registerTools(server, client)`
6. `server.connect(new StdioServerTransport())`

Wraps entire startup in try/catch; on `ConfigError` writes to `process.stderr` and exits with code 1.

---

## CLI

### `bin/cli.ts`

```
#!/usr/bin/env node
```

Parses `process.argv`. On `start` command, calls `start()` from `src/server/index.ts`. On unknown command or `--help`, prints usage to stdout and exits 0.

---

## Packaging

### `package.json`

```json
{
  "name": "kibana-mcp",
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
  "sideEffects": false,
  "engines": { "node": ">=20" }
}
```

### `tsup.config.ts`

- Entry points: `src/server/index.ts`, `bin/cli.ts`
- Format: `esm`
- `dts: true`
- `splitting: false`
- `sourcemap: false`
- `clean: true`

### `tsconfig.json`

- `target: ES2022`
- `module: NodeNext`
- `moduleResolution: NodeNext`
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`

---

## Dependencies

| Package | Role |
|---|---|
| `@modelcontextprotocol/sdk` | MCP server + stdio transport |
| `zod` | Schema validation |

Dev:
| Package | Role |
|---|---|
| `typescript` | Compiler |
| `tsup` | Build |
| `@types/node` | Node types |

---

## Error Handling Summary

| Layer | Behavior |
|---|---|
| `config/` | Throws `ConfigError` on invalid env; process exits 1 |
| `clients/http.ts` | Throws `KibanaError` on non-2xx after retries |
| `clients/kibana.ts` | Propagates `KibanaError` |
| `tools/*` | Catches all errors, returns `ToolResult { ok: false }` |
| `server/registry.ts` | Maps `ToolResult` to MCP `CallToolResult`; never throws |
| `server/index.ts` | Catches `ConfigError` at top level; writes to stderr, exits 1 |

No raw errors ever reach the MCP protocol layer.
