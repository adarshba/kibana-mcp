import { z } from "zod";
import { type Tool, type RunQueryInput, type RunQueryOutput } from "@/types/tool";

export const runQuerySchema = z.object({
  index: z.string().min(1).describe("Index name or pattern, e.g. logs-*"),
  query: z.record(z.string(), z.json()).describe("Elasticsearch _search request body, e.g. { query: { match_all: {} } }"),
  size: z.number().int().min(0).max(10000).default(10).describe("Number of hits to return; 0 for aggregation-only queries"),
});

export const runQueryTool: Tool<RunQueryInput, RunQueryOutput> = {
  name: "run_query",
  description:
    "Execute a raw Elasticsearch DSL query against a Kibana index and return hits, aggregations and metadata.",
  inputSchema: runQuerySchema,
  execute: async (input, client) => {
    const { took, hits, aggregations } = await client.runQuery(input);
    return { took, total: hits.total.value, hits: hits.hits, aggregations };
  },
};
