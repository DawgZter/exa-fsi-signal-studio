import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingIncludes: {
    "/*": ["./data/seed/fsi-signal-studio/**/*.json"],
  },
  outputFileTracingExcludes: {
    "/*": ["./.local/**/*", "./next.config.ts"],
  },
};

export default nextConfig;
