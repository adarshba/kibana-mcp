import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "bin/cli.ts" },
  format: ["esm"],
  clean: true,
  target: "node22",
});
