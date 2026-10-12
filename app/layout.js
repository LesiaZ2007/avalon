import { Alegreya_SC, Alegreya_Sans, Big_Shoulders, UnifrakturMaguntia, Uncial_Antiqua } from 'next/font/google';
import { Landscape } from '@/components/art';
import Parallax from '@/components/Parallax';
import { DEFAULT_THEME } from '@/lib/rules';
import './globals.css';
import './themes.css';

const display = Uncial_Antiqua({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
const heading = Alegreya_SC({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-heading', display: 'swap' });
// The printed looks (parchment, tabletop): condensed capitals for plaques and headings, and
// blackletter for the words on ballots and cards.
const plaque = Big_Shoulders({ weight: ['600', '700', '800', '900'], subsets: ['latin'], variable: '--font-plaque', display: 'swap', adjustFontFallback: false });
const blackletter = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], variable: '--font-blackletter', display: 'swap' });
const body = Alegreya_Sans({ weight: ['400', '500', '700', '800'], subsets: ['latin'], variable: '--font-body', display: 'swap' });

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
    <html lang="en" data-theme={DEFAULT_THEME} className={`${display.variable} ${heading.variable} ${body.variable} ${plaque.variable} ${blackletter.variable}`}>
      <body>
        <Landscape />
        <Parallax />
        {children}
      </body>
    </html>
  );
}
