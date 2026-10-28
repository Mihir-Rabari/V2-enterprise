import type { NextConfig } from 'next';

/**
 * Minimal typed configuration for the V2 Enterprise Next.js App Router app.
 *
 * NOTE ON IMAGES: no remote image hosts are configured here on purpose.
 * Remote hosts (e.g. cdn.v2enterprise.in, legacy R2/ImageKit URLs) will be
 * added deliberately in a later migration step via `images.remotePatterns`
 * once the image pipeline is finalized by the storefront/catalog agents.
 * We intentionally avoid a permissive wildcard remotePatterns config.
 */
const nextConfig: NextConfig = {
    experimental: {
        // Set by `next upgrade --agent=security` (16.4.0 → 16.4.3 security patch).
        agentUpgrade: 'security',
    },
};

export default nextConfig;
