import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "/portal/" so the built app can be served under https://octasec.ai/portal/
export default defineConfig({
  plugins: [react()],
  base: "/portal/",
  server: { port: 5173 },
});
