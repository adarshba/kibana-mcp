import { z } from "zod";
import { type Tool, type SearchLogsInput, type SearchLogsOutput } from "@/types/tool";

export const searchLogsSchema = z.object({
  index: z.string().min(1).describe("Index name or pattern, e.g. logs-*"),
  query: z.string().min(1).describe("Lucene query string, e.g. level:error AND service:api"),
  from: z.iso.datetime({ offset: true }).optional().describe("Start of time range, ISO 8601 with offset"),
  to: z.iso.datetime({ offset: true }).optional().describe("End of time range, ISO 8601 with offset"),
  timeField: z.string().min(1).default("@timestamp").describe("Date field to filter and sort on; use timeFieldName from get_index_pattern"),
  size: z.number().int().min(1).max(500).default(50).describe("Number of hits to return"),
  offset: z.number().int().min(0).default(0).describe("Number of hits to skip for pagination"),
});

export const searchLogsTool: Tool<SearchLogsInput, SearchLogsOutput> = {
  name: "search_logs",
  description:
    "Search logs in a Kibana index using Lucene query syntax, newest first, with optional time range filtering and pagination.",
  inputSchema: searchLogsSchema,
  execute: async (input, client) => {
    const { hits } = await client.searchLogs(input);
    return {
      total: hits.total.value,
      hits: hits.hits.map((hit) => ({
        id: hit._id,
        index: hit._index,
        score: hit._score,
        source: hit._source,
      })),
    };
  },
};
