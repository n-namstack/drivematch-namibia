/** @type {import('next').NextConfig} */
const nextConfig = {
  // Surface missing env vars as a build error on Vercel rather than
  // silently breaking auth at runtime.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

export default nextConfig
