import { type StructuredError } from "@/types/tool";

export class KibanaError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "KibanaError";
    this.statusCode = statusCode;
  }
}

export const mapToStructuredError = (err: Error): StructuredError => {
  if (err instanceof KibanaError) {
    return { code: "KIBANA_ERROR", message: err.message, statusCode: err.statusCode };
  }

  return { code: "UNEXPECTED_ERROR", message: err.message };
};
