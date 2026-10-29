import { z } from "zod";
import { type KibanaDashboardList } from "@/types/kibana";
import { type Tool, type GetDashboardsInput } from "@/types/tool";

export const getDashboardsSchema = z.object({
  page: z.number().int().min(1).default(1).describe("Page number, starting at 1"),
  perPage: z.number().int().min(1).max(100).default(20).describe("Dashboards per page"),
});

export const getDashboardsTool: Tool<GetDashboardsInput, KibanaDashboardList> = {
  name: "get_dashboards",
  description: "List Kibana dashboards with pagination.",
  inputSchema: getDashboardsSchema,
  execute: (input, client) => client.getDashboards(input),
};
