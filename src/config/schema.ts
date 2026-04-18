import { z } from "zod";

export const configSchema = z.object({
  kibanaUrl: z.string().url(),
  kibanaApiKey: z.string().min(1),
  timeoutMs: z.coerce.number().int().positive().default(30000),
  maxRetries: z.coerce.number().int().min(0).max(10).default(3),
});

export type Config = z.infer<typeof configSchema>;
