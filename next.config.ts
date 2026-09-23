import type { NextConfig } from "next";

// The CLI config parser is unreliable with the TypeScript version in this project.
// Use Next's supported compiler API path for production builds instead.
const nextConfig: NextConfig = {
    experimental: { useTypeScriptCli: false }
};

export default nextConfig;
