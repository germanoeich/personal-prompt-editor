/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['knex', 'better-sqlite3'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side: ignore all database-related modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        stream: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;