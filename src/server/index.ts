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
