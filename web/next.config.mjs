import { dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app is self-contained; pin the tracing root (a parent lockfile exists on D:).
  outputFileTracingRoot: rootDir,
  // Static HTML export -> builds to out/ with no Node runtime (SEO + nginx-friendly).
  output: "export",
  // Predictable directory output for nginx: /about -> out/about/index.html
  trailingSlash: true,
  // next/image optimizer is unavailable in static export; we don't use it, but be safe.
  images: { unoptimized: true },
  // We rely on tsc types; skip eslint during build to keep the port lean.
  eslint: { ignoreDuringBuilds: true },
  // Hide the Next.js dev-mode indicator badge (the little "N" overlay).
  devIndicators: false,
};

export default nextConfig;
