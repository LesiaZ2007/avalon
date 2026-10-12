import { Alegreya, Alegreya_SC, Uncial_Antiqua } from 'next/font/google';
import { Landscape } from '@/components/art';
import { DEFAULT_THEME } from '@/lib/rules';
import './globals.css';

const display = Uncial_Antiqua({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
const heading = Alegreya_SC({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-heading', display: 'swap' });
const body = Alegreya({ weight: ['400', '500', '700', '800'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'Avalon',
  description: 'The Resistance: Avalon for phones. Make a room, share the code, find the traitors.',
  applicationName: 'Avalon',
  // Opens full-screen when added to an iPhone home screen.
  appleWebApp: { capable: true, title: 'Avalon', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1315',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} className={`${display.variable} ${heading.variable} ${body.variable}`}>
      <body>
        <Landscape />
        {children}
      </body>
    </html>
  );
}
