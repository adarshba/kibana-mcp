import { type McpServer } from "@modelcontextprotocol/server";
import { mapToStructuredError } from "@/core/errors";
import { type KibanaClient } from "@/types/kibana";
import { type StructuredError, type Tool, type ToolInput, type ToolOutput } from "@/types/tool";
import { searchLogsTool } from "@/tools/search-logs";
import { getIndicesTool } from "@/tools/get-indices";
import { getIndexPatternTool } from "@/tools/get-index-pattern";
import { runQueryTool } from "@/tools/run-query";
import { getDashboardsTool } from "@/tools/get-dashboards";
import { getDashboardTool } from "@/tools/get-dashboard";

const tools: Tool<ToolInput, ToolOutput>[] = [
  searchLogsTool,
  getIndicesTool,
  getIndexPatternTool,
  runQueryTool,
  getDashboardsTool,
  getDashboardTool,
];

const toContent = (value: ToolOutput | StructuredError) => [
  { type: "text" as const, text: JSON.stringify(value, null, 2) },
];

export const registerTools = (server: McpServer, client: KibanaClient): void => {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      async (input) => {
        try {
          return { content: toContent(await tool.execute(input, client)) };
        } catch (err) {
          return { content: toContent(mapToStructuredError(err instanceof Error ? err : new Error(String(err)))), isError: true };
        }
      }
    );
  }
};
