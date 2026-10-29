import { z } from "zod";
import { DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS, MAX_RETRIES_LIMIT } from "@/core/constants";

export const configSchema = z
  .object({
    kibanaUrl: z.url(),
    kibanaApiKey: z.string().min(1).optional(),
    kibanaUsername: z.string().min(1).optional(),
    kibanaPassword: z.string().min(1).optional(),
    kibanaCookie: z.string().min(1).optional(),
    timeoutMs: z.coerce.number().int().positive().default(DEFAULT_TIMEOUT_MS),
    maxRetries: z.coerce.number().int().min(0).max(MAX_RETRIES_LIMIT).default(DEFAULT_MAX_RETRIES),
  })
  .superRefine((cfg, ctx) => {
    if (Boolean(cfg.kibanaUsername) !== Boolean(cfg.kibanaPassword)) {
      ctx.addIssue({
        code: "custom",
        path: ["kibanaUsername"],
        message: "KIBANA_USERNAME and KIBANA_PASSWORD must be set together",
      });
    }
    const modes = [cfg.kibanaApiKey, cfg.kibanaUsername ?? cfg.kibanaPassword, cfg.kibanaCookie].filter(Boolean);
    if (modes.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["auth"],
        message: "set exactly one of KIBANA_API_KEY, KIBANA_USERNAME + KIBANA_PASSWORD, or KIBANA_COOKIE",
      });
    }
  });
