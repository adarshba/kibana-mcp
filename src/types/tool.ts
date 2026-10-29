import { type z, type ZodType } from "zod";
import { type getDashboardSchema } from "@/tools/get-dashboard";
import { type getDashboardsSchema } from "@/tools/get-dashboards";
import { type getIndexPatternSchema } from "@/tools/get-index-pattern";
import { type getIndicesSchema } from "@/tools/get-indices";
import { type runQuerySchema } from "@/tools/run-query";
import { type searchLogsSchema } from "@/tools/search-logs";
import { type JsonObject } from "./json";
import {
  type KibanaClient,
  type KibanaDashboardDetail,
  type KibanaDashboardList,
  type KibanaHit,
  type KibanaIndex,
  type KibanaIndexPattern,
} from "./kibana";

export type StructuredError = {
  code: string;
  message: string;
  statusCode?: number;
};

export type Tool<I, O> = {
  name: string;
  description: string;
  inputSchema: ZodType<I>;
  execute(input: I, client: KibanaClient): Promise<O>;
};

export type SearchLogsInput = z.infer<typeof searchLogsSchema>;
export type RunQueryInput = z.infer<typeof runQuerySchema>;
export type GetIndicesInput = z.infer<typeof getIndicesSchema>;
export type GetIndexPatternInput = z.infer<typeof getIndexPatternSchema>;
export type GetDashboardsInput = z.infer<typeof getDashboardsSchema>;
export type GetDashboardInput = z.infer<typeof getDashboardSchema>;

export type SearchLogsOutput = {
  total: number;
  hits: Array<{
    id: string;
    index: string;
    score: number | null;
    source: JsonObject;
  }>;
};

export type RunQueryOutput = {
  took: number;
  total: number;
  hits: KibanaHit<JsonObject>[];
  aggregations?: JsonObject;
};

export type ToolInput =
  | SearchLogsInput
  | RunQueryInput
  | GetIndicesInput
  | GetIndexPatternInput
  | GetDashboardsInput
  | GetDashboardInput;

export type ToolOutput =
  | SearchLogsOutput
  | RunQueryOutput
  | KibanaIndex[]
  | KibanaIndexPattern
  | KibanaDashboardList
  | KibanaDashboardDetail;
