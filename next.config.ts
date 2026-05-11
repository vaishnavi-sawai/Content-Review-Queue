import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent dirs with their own lockfile can make Turbopack pick the wrong root; @/ then points at the wrong tree.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
