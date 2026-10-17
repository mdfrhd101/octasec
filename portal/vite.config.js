import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "/portal/" so the built app can be served under https://octasec.ai/portal/
// dev: /api is proxied to the local API so the portal is same-origin like production
export default defineConfig({
  plugins: [react()],
  base: "/portal/",
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:5050" } },
});
