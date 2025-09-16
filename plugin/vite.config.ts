import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true }), // dist/index.d.ts 생성
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "StackflowVanillaRenderer",
      formats: ["es", "umd"],
      fileName: (format) =>
        format === "es" ? "vanilla-renderer.es.js" : "vanilla-renderer.umd.cjs",
    },
    rollupOptions: {
      external: ["react", "react-dom", "@stackflow/react", "@stackflow/core"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "@stackflow/react": "StackflowReact",
          "@stackflow/core": "StackflowCore",
        },
      },
    },
  },
});
