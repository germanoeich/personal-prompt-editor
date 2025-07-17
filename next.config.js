/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // For server builds, mark these modules as external
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'oracledb': 'oracledb',
        'mysql': 'mysql',
        'mysql2': 'mysql2',
        'pg': 'pg',
        'pg-query-stream': 'pg-query-stream',
        'tedious': 'tedious',
        'better-sqlite3': 'better-sqlite3'
      });
    } else {
      // For client builds, completely ignore these modules
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'oracledb': false,
        'mysql': false,
        'mysql2': false,
        'pg': false,
        'pg-query-stream': false,
        'tedious': false,
        'better-sqlite3': false,
        'sqlite3': false,
        'fs': false,
        'path': false,
        'net': false,
        'tls': false,
        'crypto': false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;