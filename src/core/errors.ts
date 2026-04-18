import { type StructuredError } from "../types/tool.js";

export class KibanaError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "KibanaError";
    this.statusCode = statusCode;
  }
}

export const mapToStructuredError = (err: unknown): StructuredError => {
  if (err instanceof KibanaError) {
    return {
      code: "KIBANA_ERROR",
      message: err.message,
      statusCode: err.statusCode,
    };
  }

  if (err instanceof Error) {
    return {
      code: "UNEXPECTED_ERROR",
      message: err.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: String(err),
  };
};
