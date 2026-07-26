/** @type {import('next').NextConfig} */

const dev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  basePath: dev ? '' : '/botchat-dashboard',
  assetPrefix: dev ? '' : '/botchat-dashboard',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APIURL: process.env.NEXT_PUBLIC_APIURL,
    NEXT_PUBLIC_SUPABASE: process.env.NEXT_PUBLIC_SUPABASE,
  },
  trailingSlash: true,
};

export default nextConfig;
