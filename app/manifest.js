import { DEFAULT_THEME, THEMES } from '@/lib/rules';

// Lets phones install Avalon to the home screen and open it full-screen like an app.
export default function manifest() {
  return {
    name: 'Avalon',
    short_name: 'Avalon',
    description: 'The Resistance: Avalon for phones around one table.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    // The installed app's splash screen, in the default look.
    background_color: THEMES[DEFAULT_THEME].chrome,
    theme_color: THEMES[DEFAULT_THEME].chrome,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
