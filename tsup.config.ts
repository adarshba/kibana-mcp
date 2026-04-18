import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/server/index.ts",
    cli: "bin/cli.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  target: "node20",
});
