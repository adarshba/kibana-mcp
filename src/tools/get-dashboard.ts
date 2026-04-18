import { z } from "zod";
import { type Tool } from "../types/tool.js";
import { mapToStructuredError } from "../core/errors.js";
import { type KibanaDashboardDetail } from "../types/kibana.js";

const inputSchema = z.object({
  id: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;

export const getDashboardTool: Tool<Input, KibanaDashboardDetail> = {
  name: "get_dashboard",
  description: "Fetch details of a specific Kibana dashboard by ID, including its panel configuration.",
  inputSchema,
  execute: async (input, client) => {
    try {
      const dashboard = await client.getDashboard(input.id);
      return { ok: true, data: dashboard };
    } catch (err) {
      return { ok: false, error: mapToStructuredError(err) };
    }
  },
};
