import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { loadConfig } from "@/config";
import { createHttpClient } from "@/clients/http";
import { createKibanaClient } from "@/clients/kibana";
import { registerTools } from "./registry";
import pkg from "../../package.json" with { type: "json" };

export const start = async (): Promise<void> => {
  const kibana = createKibanaClient(createHttpClient(loadConfig()));

  serveStdio(() => {
    const server = new McpServer(
      { name: pkg.name, version: pkg.version },
      { capabilities: { tools: {} } }
    );
    registerTools(server, kibana);
    return server;
  });
};
