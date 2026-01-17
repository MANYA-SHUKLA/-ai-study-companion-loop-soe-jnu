/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 configuration
  reactStrictMode: true,
  // Performance optimizations - REMOVE swcMinify or use correct syntax
  // swcMinify: true, // Remove this line for Next.js 16
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Explicitly expose environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  }
}

module.exports = nextConfig