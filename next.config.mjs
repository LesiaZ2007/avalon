/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `npm run build:check` builds into a separate folder so it can run while `next dev` is up.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
