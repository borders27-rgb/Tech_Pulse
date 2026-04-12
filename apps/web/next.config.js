/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  ...(isGitHubPages
    ? {
        basePath: '/Tech_Pulse',
        assetPrefix: '/Tech_Pulse/'
      }
    : {})
};

module.exports = nextConfig;
