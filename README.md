# kibana-mcp

[![npm version](https://badge.fury.io/js/kibana-mcp.svg)](https://www.npmjs.com/package/kibana-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-blue.svg)](https://www.typescriptlang.org/)

> Model Context Protocol (MCP) server exposing Kibana capabilities to AI agents over stdio transport.

## What is MCP?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that lets AI assistants connect with external tools and data sources. This server implements MCP so your AI agent can query logs, inspect indices, and explore dashboards in Kibana.

## Features

- **Log search** — Lucene queries with time range filtering and pagination
- **Index management** — list indices, fetch index pattern field definitions
- **Kibana 7.10+ / 8.x and AWS OpenSearch Dashboards** — API key, username/password, or SSO session cookie
- **Raw ES DSL** — execute arbitrary Elasticsearch queries via Kibana
- **Dashboard access** — list and inspect Kibana dashboard configurations
- **Structured errors** — all failures return typed JSON, never raw exceptions
- **Retry with backoff** — exponential backoff with jitter on transient failures
- **MCP stdio transport** — stateless 2026-07-28 protocol plus 2025-era clients; works with Claude Desktop, Cursor, OpenCode, and any MCP-compatible client

## Installation

```bash
npm install -g kibana-mcp
```

Or use directly with npx (no install required):

```bash
npx kibana-mcp start
```

## Quick Start

1. **Set your Kibana credentials:**

```bash
export KIBANA_URL="https://your-kibana.example.com"
export KIBANA_API_KEY="your-api-key-here"
```

2. **Add to your MCP client** (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "kibana": {
      "command": "npx",
      "args": ["kibana-mcp", "start"],
      "env": {
        "KIBANA_URL": "https://your-kibana.example.com",
        "KIBANA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3. **OpenCode CLI config** (`~/.config/opencode/config.json`):

```json
{
  "mcp": {
    "kibana": {
      "type": "local",
      "command": ["npx", "kibana-mcp", "start"],
      "environment": {
        "KIBANA_URL": "https://your-kibana.example.com",
        "KIBANA_API_KEY": "your-api-key-here"
      },
      "enabled": true
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `KIBANA_URL` | yes | — | Base URL of your Kibana instance, including any base path (e.g. `https://host/_plugin/kibana` on AWS OpenSearch) |
| `KIBANA_API_KEY` | one auth method | — | Kibana API key (`Authorization: ApiKey <value>`) |
| `KIBANA_USERNAME` | one auth method | — | Basic auth username, set with `KIBANA_PASSWORD` |
| `KIBANA_PASSWORD` | one auth method | — | Basic auth password, set with `KIBANA_USERNAME` |
| `KIBANA_COOKIE` | one auth method | — | Raw `Cookie` header from a logged-in browser session (e.g. `sid=...`, `_pomerium=...`) |
| `KIBANA_TIMEOUT_MS` | no | `30000` | Request timeout in milliseconds |
| `KIBANA_MAX_RETRIES` | no | `3` | Max retry attempts for transient failures (429, 502, 503, 504) |

## Available Tools

### `search_logs`

Search logs in a Kibana index using Lucene query syntax.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `index` | string | yes | — | Index name or pattern (e.g. `logs-*`) |
| `query` | string | yes | — | Lucene query string |
| `from` | string | no | — | Start time (ISO 8601 with offset) |
| `to` | string | no | — | End time (ISO 8601 with offset) |
| `timeField` | string | no | `@timestamp` | Date field to filter and sort on (see `timeFieldName` from `get_index_pattern`) |
| `size` | number | no | `50` | Results to return (max 500) |
| `offset` | number | no | `0` | Pagination offset |

### `get_indices`

List all Elasticsearch indices available through Kibana. No parameters.

### `get_index_pattern`

Fetch details of a Kibana index pattern including all field definitions.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Index pattern ID |

### `run_query`

Execute a raw Elasticsearch DSL query against a Kibana index.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `index` | string | yes | — | Target index |
| `query` | object | yes | — | Elasticsearch DSL query object |
| `size` | number | no | `10` | Results to return (max 10000; `0` for aggregation-only queries) |

### `get_dashboards`

List Kibana dashboards with pagination.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `perPage` | number | no | `20` | Results per page (max 100) |

### `get_dashboard`

Fetch a specific Kibana dashboard including its panel configuration.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Dashboard saved object ID |

## Authentication

Set exactly one of:

- **API key** — `KIBANA_API_KEY`
- **Username / password** — `KIBANA_USERNAME` + `KIBANA_PASSWORD` (native/LDAP realm on self-hosted Kibana)
- **Session cookie** — `KIBANA_COOKIE`, for SSO or auth-proxy setups where no API key is available

### Getting a Session Cookie

1. Log in to Kibana in your browser
2. Open DevTools → **Application → Cookies** → your Kibana domain
3. Copy the session cookie as `name=value` (Kibana: `sid`; Pomerium: `_pomerium`; oauth2-proxy: `_oauth2_proxy`)
4. Set it as `KIBANA_COOKIE`, e.g. `KIBANA_COOKIE="sid=Fe26.2**..."`

The cookie expires with your session (Kibana default: 8h idle, 30d max; proxies vary). On 401 errors, copy a fresh one and restart the server.

### Getting Your API Key

1. Open Kibana in your browser
2. Navigate to **Stack Management → API keys**
3. Click **Create API key**
4. Give it a name, set appropriate privileges (read access to indices and saved objects)
5. Copy the encoded value — this is your `KIBANA_API_KEY`

## Requirements

- Node.js ≥ 22
- Kibana instance reachable with an API key, username/password, or session cookie

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © [Adarsh BA](https://github.com/adarshba)
