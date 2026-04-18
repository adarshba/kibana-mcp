import { type ZodSchema } from "zod";
import { type KibanaClient } from "../clients/kibana.js";

export type StructuredError = {
  code: string;
  message: string;
  statusCode?: number;
};

export type ToolSuccess<T> = { ok: true; data: T };
export type ToolFailure = { ok: false; error: StructuredError };
export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export type Tool<I, O> = {
  name: string;
  description: string;
  inputSchema: ZodSchema<I>;
  execute: (input: I, client: KibanaClient) => Promise<ToolResult<O>>;
};
