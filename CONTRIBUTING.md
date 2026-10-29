# Contributing

## Setup

```bash
pnpm install
pnpm typecheck
pnpm build
```

Toolchain: Node ≥ 22, pnpm (pinned via `packageManager`), TypeScript 7, tsup 9. The package ships a single CLI bundle (`dist/cli.js`); there is no library export and no `.d.ts`.

## Layout

| Path | Holds |
|---|---|
| `bin/cli.ts` | CLI entry |
| `src/server/` | MCP server factory (`serveStdio`) and tool registry |
| `src/tools/` | One file per tool: exported zod schema + `Tool` object |
| `src/clients/` | HTTP client (auth, retry, timeout) and Kibana client |
| `src/config/` | Env parsing and the config zod schema |
| `src/core/constants.ts` | Every module-level constant and magic number |
| `src/core/errors.ts` | `KibanaError` and error mapping |
| `src/types/` | Every type alias |

## Code rules

- **Types live in `src/types/` only.** No `type` declarations or `z.infer` aliases anywhere else.
- **Constants live in `src/core/constants.ts` only.**
- **No `unknown` or `any`.** Opaque JSON is `JsonValue` / `JsonObject` from `src/types/json.ts`.
- **No comments in code.** Make the code say it.
- **Imports:** `@/…` for cross-folder, `./…` within a folder, no file extensions.
- **Style:** arrow-function consts, `type` over `interface`, double quotes, 2-space indent.
- **Minimal and durable:** the smallest change that handles every edge case; no speculative options or abstractions.

## Adding a tool

1. Create `src/tools/<name>.ts` exporting `<name>Schema` (zod object, every field has `.describe()`) and the `Tool<Input, Output>` object.
2. Declare `<Name>Input` (`z.infer<typeof <name>Schema>`) and any output type in `src/types/tool.ts`, and add both to the `ToolInput` / `ToolOutput` unions.
3. Register it in the `tools` array in `src/server/registry.ts`.
4. `execute` returns data and throws on failure; the registry maps errors to `{ code, message, statusCode }`.
5. Tools are read-only; the registry marks every tool `readOnlyHint`.
6. Document parameters in `README.md`.

## Kibana compatibility

Target stock Kibana 7.10+ / 8.x and AWS OpenSearch Dashboards (base path `/_plugin/kibana`).

- Reach Elasticsearch through the console proxy (`/api/console/proxy`), never version-specific Kibana APIs such as `/api/index_management` or `/api/index_patterns`.
- Read Kibana objects through `/api/saved_objects`.
- Never assume `@timestamp`; time fields come from the index pattern's `timeFieldName`.

## Auth

Exactly one of `KIBANA_API_KEY`, `KIBANA_USERNAME` + `KIBANA_PASSWORD`, or `KIBANA_COOKIE` (`name=value`, e.g. `_pomerium=…`). Config validation enforces this.

## Verification

There is no test runner yet. Before opening a PR:

1. `pnpm typecheck && pnpm build`
2. Smoke-test over stdio against a real or fake Kibana:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_indices","arguments":{}}}' \
  | KIBANA_URL=… KIBANA_COOKIE=… node dist/cli.js start
```

CI runs typecheck and build on every pull request.

## Releasing

Bump `version` in `package.json` (semver; removing or changing tool output is a major) and merge to `main`. The publish workflow releases to npm when the version changes.
