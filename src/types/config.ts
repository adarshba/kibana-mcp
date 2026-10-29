import { type z } from "zod";
import { type configSchema } from "@/config/schema";

export type Config = z.infer<typeof configSchema>;
