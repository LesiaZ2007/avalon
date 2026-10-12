// Lets phones install Avalon to the home screen and open it full-screen like an app.
export default function manifest() {
  return {
    name: 'Avalon',
    short_name: 'Avalon',
    description: 'The Resistance: Avalon for phones around one table.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e1719',
    theme_color: '#0e1719',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
