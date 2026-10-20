import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Bowling is "coming soon" and not marketed yet, so the bowling page is not public. The page itself
  // (src/app/bowling/page.tsx) is kept for the relaunch: delete this redirect to bring it back, and put the
  // Bowling card on the home page back to a link.
  async redirects() {
    return [{ source: '/bowling', destination: '/', permanent: false }];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
