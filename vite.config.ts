import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  root: resolve(rootDir, "src/client"),
  publicDir: resolve(rootDir, "src/client/public"),
  build: {
    outDir: resolve(rootDir, "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@shared": resolve(rootDir, "src/shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
