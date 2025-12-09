import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const remoteApiBase = env.VITE_API_BASE_URL || "";
  const proxyTarget = remoteApiBase
    ? remoteApiBase.replace(/\/api\/?$/, "")
    : "http://localhost:8000";

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "vis-network/standalone": path.resolve(
          __dirname,
          "node_modules/vis-network/standalone/esm/vis-network.js",
        ),
      },
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: proxyTarget.startsWith("https"),
        },
      },
    },
  };
});
