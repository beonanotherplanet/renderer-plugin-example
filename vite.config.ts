import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/lib/index.ts",
      name: "StackflowVanillaRenderer",
      formats: ["es", "umd"],
      fileName: (format) => `stackflow-vanilla-renderer.${format}.js`,
    },
    rollupOptions: {
      external: ["@stackflow/core"],
      output: {
        globals: {
          "@stackflow/core": "StackflowCore",
        },
      },
    },
  },
  server: { open: true },
});
