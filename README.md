# kibana-mcp

[![npm version](https://badge.fury.io/js/kibana-mcp.svg)](https://www.npmjs.com/package/kibana-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

> Model Context Protocol (MCP) server exposing Kibana capabilities to AI agents over stdio transport.

## What is MCP?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that lets AI assistants connect with external tools and data sources. This server implements MCP so your AI agent can query logs, inspect indices, and explore dashboards in Kibana.

## Features

- **Log search** — KQL or Lucene queries with time range filtering and pagination
- **Index management** — list indices, fetch index pattern field definitions
- **Raw ES DSL** — execute arbitrary Elasticsearch queries via Kibana
- **Dashboard access** — list and inspect Kibana dashboard configurations
- **Structured errors** — all failures return typed JSON, never raw exceptions
- **Retry with backoff** — exponential backoff with jitter on transient failures
- **MCP stdio transport** — works with Claude Desktop, Cursor, OpenCode, and any MCP-compatible client

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
| `KIBANA_URL` | yes | — | Base URL of your Kibana instance |
| `KIBANA_API_KEY` | yes | — | Kibana API key (`Authorization: ApiKey <value>`) |
| `KIBANA_TIMEOUT_MS` | no | `30000` | Request timeout in milliseconds |
| `KIBANA_MAX_RETRIES` | no | `3` | Max retry attempts for transient failures (429, 502, 503, 504) |

## Available Tools

### `search_logs`

Search logs in a Kibana index using KQL or Lucene query syntax.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `index` | string | yes | — | Index name or pattern (e.g. `logs-*`) |
| `query` | string | yes | — | KQL or Lucene query string |
| `from` | string | no | — | Start time (ISO 8601 with offset) |
| `to` | string | no | — | End time (ISO 8601 with offset) |
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
| `size` | number | no | `10` | Results to return (max 10000) |

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

## Getting Your API Key

1. Open Kibana in your browser
2. Navigate to **Stack Management → API keys**
3. Click **Create API key**
4. Give it a name, set appropriate privileges (read access to indices and saved objects)
5. Copy the encoded value — this is your `KIBANA_API_KEY`

## Requirements

- Node.js ≥ 20.0.0
- Kibana instance with API key authentication enabled

## License

MIT © [Adarsh BA](https://github.com/adarshba)
