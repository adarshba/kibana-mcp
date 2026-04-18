import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type KibanaClient } from "../clients/kibana.js";
import { searchLogsTool } from "../tools/search-logs.js";
import { getIndicesTool } from "../tools/get-indices.js";
import { getIndexPatternTool } from "../tools/get-index-pattern.js";
import { runQueryTool } from "../tools/run-query.js";
import { getDashboardsTool } from "../tools/get-dashboards.js";
import { getDashboardTool } from "../tools/get-dashboard.js";
import { type Tool } from "../types/tool.js";

const tools = [
  searchLogsTool,
  getIndicesTool,
  getIndexPatternTool,
  runQueryTool,
  getDashboardsTool,
  getDashboardTool,
] as unknown as Tool<never, unknown>[];

export const registerTools = (server: McpServer, client: KibanaClient): void => {
  for (const tool of tools) {
    const schema = tool.inputSchema as unknown as {
      shape: Record<string, unknown>;
    };
    server.tool(
      tool.name,
      tool.description,
      schema.shape,
      async (input) => {
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
      }
    );
  }
};
