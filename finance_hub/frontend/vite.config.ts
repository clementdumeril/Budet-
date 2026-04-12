import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS ? "/Budet-/" : "/"),
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  server: {
    host: process.env.TAURI_DEV_HOST || "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
