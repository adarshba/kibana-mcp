import { z, type ZodSchema } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaDashboard } from "../types/kibana.js";

const inputSchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});

type Input = z.infer<typeof inputSchema>;

type Output = {
  total: number;
  items: KibanaDashboard[];
};

export const getDashboardsTool: Tool<Input, Output> = {
  name: "get_dashboards",
  description: "List Kibana dashboards with pagination.",
  inputSchema: inputSchema as ZodSchema<Input>,
  execute: async (input, client) => {
    try {
      const result = await client.getDashboards({ page: input.page, perPage: input.perPage });
      return { ok: true, data: result };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
