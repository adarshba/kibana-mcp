import { z } from "zod";
import { type KibanaIndex } from "@/types/kibana";
import { type Tool, type GetIndicesInput } from "@/types/tool";

export const getIndicesSchema = z.object({});

export const getIndicesTool: Tool<GetIndicesInput, KibanaIndex[]> = {
  name: "get_indices",
  description: "List all Elasticsearch indices available through Kibana.",
  inputSchema: getIndicesSchema,
  execute: (_input, client) => client.getIndices(),
};
