/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers configured in middleware.ts
  // This keeps them in one place for easier management

  // Disable X-Powered-By header (information disclosure)
  poweredByHeader: false,

  // Image optimization security
  images: {
    domains: [], // No external image domains allowed
    formats: ['image/webp'],
  },

  // Strict mode for better error detection
  reactStrictMode: true,
}

module.exports = nextConfig
