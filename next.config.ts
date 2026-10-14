import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't generate AGENTS.md on dev start.
  agentRules: false,
};

export default nextConfig;
