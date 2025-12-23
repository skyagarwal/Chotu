import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mangwale.com',
      },
      {
        protocol: 'https',
        hostname: '**.mangwale.ai',
      },
      {
        protocol: 'https',
        hostname: 'storage.mangwale.ai',
      },
      {
        protocol: 'https',
        hostname: 'mangwale-ai.s3.ap-south-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.ap-south-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'developers.google.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],
    unoptimized: true,
  },
  
  // Allow cross-origin requests from our domain structure
  allowedDevOrigins: [
    'chat.mangwale.ai',
    'admin.mangwale.ai',
  ],
  
  // Domain-based routing with rewrites
  async rewrites() {
    return [
      // Proxy WebSocket connections to backend
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
      // Proxy ALL API requests to backend/api/...
      // Since backend now uses global prefix 'api', we just forward the path as is.
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // chat.mangwale.ai - Root shows chat interface
      {
        source: '/',
        destination: '/chat',
        has: [
          {
            type: 'host',
            value: 'chat.mangwale.ai',
          },
        ],
      },
      // admin.mangwale.ai - Root redirects to admin dashboard
      {
        source: '/',
        destination: '/admin',
        has: [
          {
            type: 'host',
            value: 'admin.mangwale.ai',
          },
        ],
      },
    ];
  },
  
  // Ensure proper CORS for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://chat.mangwale.ai, https://admin.mangwale.ai' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
