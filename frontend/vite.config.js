import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/solana": "http://127.0.0.1:8000",
      "/patient": "http://127.0.0.1:8000",
      "/patients": "http://127.0.0.1:8000",
      "/actions": "http://127.0.0.1:8000",
      "/explain": "http://127.0.0.1:8000",
      "/counterfactual": "http://127.0.0.1:8000",
      "/narrate": "http://127.0.0.1:8000",
      "/chat": "http://127.0.0.1:8000",
      "/recently-viewed": "http://127.0.0.1:8000",
      "/save-case": "http://127.0.0.1:8000",
      "/saved-cases": "http://127.0.0.1:8000",
      "/featured-patients": "http://127.0.0.1:8000",
      "/hospital": "http://127.0.0.1:8000",
      "/credibility-anchors": "http://127.0.0.1:8000",
      "/static": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});
