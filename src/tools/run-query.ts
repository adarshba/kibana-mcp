import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";

const inputSchema = z.object({
  index: z.string().min(1),
  query: z.record(z.unknown()),
  size: z.number().int().min(1).max(10000).optional(),
});

type Input = z.infer<typeof inputSchema>;

type Output = {
  took: number;
  total: number;
  hits: unknown[];
};

export const runQueryTool: Tool<Input, Output> = {
  name: "run_query",
  description:
    "Execute a raw Elasticsearch DSL query against a Kibana index and return hits and metadata.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const size = input.size ?? 10;
      const result = await client.runQuery({
        index: input.index,
        query: input.query,
        size,
      });

      return {
        ok: true,
        data: {
          took: result.took,
          total: result.hits.total.value,
          hits: result.hits.hits,
        },
      };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
