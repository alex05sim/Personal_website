import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Turbopack's dev filesystem cache (.next/dev/cache/turbopack) bloated/corrupted
    // to ~1.1 GB of oversized .sst files, which made the Rust engine attempt a
    // ~1.9 GB (0x78000000) allocation on cache load and crash. That crash detonated
    // a node worker fork bomb that consumed all system memory. Disabling the
    // persistent dev cache removes that recurring trigger (cost: slightly slower
    // cold dev startup, negligible for a site this size).
    turbopackFileSystemCacheForDev: false,

    // Tree-shake large named-export packages so only the icons/utilities actually
    // used get bundled, trimming the client JS.
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
