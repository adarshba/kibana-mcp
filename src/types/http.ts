import { type JsonObject } from "./json";

export type HttpClient = {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body?: JsonObject) => Promise<T>;
};
