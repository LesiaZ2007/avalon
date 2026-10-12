/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `npm run build:check` builds into a separate folder so it can run while `next dev` is up.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Put metadata in <head> for every browser, not just bots. Next streams it into <body> by
  // default, where Chrome ignores the app manifest and iOS ignores the home-screen tags. Our
  // metadata is static, so this costs nothing.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
