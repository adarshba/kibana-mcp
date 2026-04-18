import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaIndex } from "../types/kibana.js";

const inputSchema = z.object({});

type Input = z.infer<typeof inputSchema>;

export const getIndicesTool: Tool<Input, KibanaIndex[]> = {
  name: "get_indices",
  description: "List all Elasticsearch indices available through Kibana.",
  inputSchema,
  execute: async (_input, client) => {
    try {
      const indices = await client.getIndices();
      return { ok: true, data: indices };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
