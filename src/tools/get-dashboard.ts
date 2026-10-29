import { z } from "zod";
import { type KibanaDashboardDetail } from "@/types/kibana";
import { type Tool, type GetDashboardInput } from "@/types/tool";

export const getDashboardSchema = z.object({
  id: z.string().min(1).describe("Dashboard saved object ID, from get_dashboards"),
});

export const getDashboardTool: Tool<GetDashboardInput, KibanaDashboardDetail> = {
  name: "get_dashboard",
  description: "Fetch details of a specific Kibana dashboard by ID, including its panel configuration.",
  inputSchema: getDashboardSchema,
  execute: (input, client) => client.getDashboard(input.id),
};
