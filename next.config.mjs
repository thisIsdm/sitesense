/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable larger uploads (500MB limit)
  experimental: {
    // Increase body size limit for file uploads
    bodySizeLimit: '500mb',
  },
  // Additional server configuration for large uploads
  serverRuntimeConfig: {
    // This will be available only on the server side
    maxFileSize: 500 * 1024 * 1024, // 500MB
  },
}

export default nextConfig
