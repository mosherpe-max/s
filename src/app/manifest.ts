import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KOOP Refreshment Delivery',
    short_name: 'KOOP',
    description: 'On-course refreshment delivery platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#213147',
    theme_color: '#213147',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
