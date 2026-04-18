import { z, type ZodSchema } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";

const inputSchema = z.object({
  index: z.string().min(1),
  query: z.string().min(1),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  size: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
});

type Input = z.infer<typeof inputSchema>;

type Output = {
  total: number;
  hits: Array<{
    id: string;
    index: string;
    score: number | null;
    source: unknown;
  }>;
};

export const searchLogsTool: Tool<Input, Output> = {
  name: "search_logs",
  description:
    "Search logs in a Kibana index using KQL or Lucene query syntax with optional time range filtering and pagination.",
  inputSchema: inputSchema as ZodSchema<Input>,
  execute: async (input, client) => {
    try {
      const result = await client.searchLogs({
        index: input.index,
        query: input.query,
        from: input.from,
        to: input.to,
        size: input.size,
        offset: input.offset,
      });

      return {
        ok: true,
        data: {
          total: result.hits.total.value,
          hits: result.hits.hits.map((hit) => ({
            id: hit._id,
            index: hit._index,
            score: hit._score,
            source: hit._source,
          })),
        },
      };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
