/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Must be false — Monaco + Socket.io double-mount in strict mode
};

module.exports = nextConfig;
