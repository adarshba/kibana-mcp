import { z } from "zod";
import { type KibanaIndexPattern } from "@/types/kibana";
import { type Tool, type GetIndexPatternInput } from "@/types/tool";

export const getIndexPatternSchema = z.object({
  id: z.string().min(1).describe("Index pattern (data view) ID"),
});

export const getIndexPatternTool: Tool<GetIndexPatternInput, KibanaIndexPattern> = {
  name: "get_index_pattern",
  description: "Fetch details of a Kibana index pattern by its ID, including field definitions.",
  inputSchema: getIndexPatternSchema,
  execute: (input, client) => client.getIndexPattern(input.id),
};
