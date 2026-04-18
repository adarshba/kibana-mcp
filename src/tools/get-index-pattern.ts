import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaIndexPattern } from "../types/kibana.js";

const inputSchema = z.object({
  id: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

export const getIndexPatternTool: Tool<Input, KibanaIndexPattern> = {
  name: "get_index_pattern",
  description: "Fetch details of a Kibana index pattern by its ID, including field definitions.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const pattern = await client.getIndexPattern(input.id);
      return { ok: true, data: pattern };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
