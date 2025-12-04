import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

const visNetworkStandalone = path.resolve(
  __dirname,
  "node_modules/vis-network/standalone/index.js",
);
const visNetworkStandaloneEsm = path.resolve(
  __dirname,
  "node_modules/vis-network/standalone/esm/vis-network.js",
);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "vis-network/standalone": visNetworkStandalone,
      "vis-network/standalone/esm/vis-network.js": visNetworkStandaloneEsm,
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
