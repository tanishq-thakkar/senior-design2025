import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "production") {
    const api = env.VITE_API_URL ?? "";
    if (!api || api.includes("localhost") || api.includes("127.0.0.1")) {
      console.warn(
        "\n[vite] WARNING: VITE_API_URL is missing or points at localhost.\n" +
          "CloudFront will embed the wrong API base → ERR_SSL_PROTOCOL_ERROR, mixed content, or failed fetches.\n" +
          "Set VITE_API_URL=https://<your-subdomain>.trycloudflare.com in .env and run deploy again.\n" +
          "If you use .env.production, it overrides .env for production builds.\n",
      );
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
