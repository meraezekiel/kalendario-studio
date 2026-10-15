import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't generate AGENTS.md on dev start.
  agentRules: false,
  // Keep the dev-only Next.js badge away from the tool rail in the bottom-left corner.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
