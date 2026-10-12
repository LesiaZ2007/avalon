import { Alegreya_SC, Alegreya_Sans, Big_Shoulders, UnifrakturMaguntia, Uncial_Antiqua } from 'next/font/google';
import { Landscape } from '@/components/art';
import Parallax from '@/components/Parallax';
import { DEFAULT_THEME, PRINTED_THEMES, THEMES, THEME_KEY } from '@/lib/rules';
import './globals.css';
import './themes.css';

const display = Uncial_Antiqua({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
const heading = Alegreya_SC({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-heading', display: 'swap' });
// The parchment look: condensed capitals for plaques and headings, and
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

// Runs before first paint: put this device's last look on the page, so a loading or join screen
// never flashes night first. The room's own look takes over once it loads (components/Theme.js).
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(${JSON.stringify(Object.keys(THEMES))}.indexOf(t)>-1){var r=document.documentElement;r.dataset.theme=t;if(${JSON.stringify(PRINTED_THEMES)}.indexOf(t)>-1)r.dataset.printed=''}}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning className={`${display.variable} ${heading.variable} ${body.variable} ${plaque.variable} ${blackletter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Landscape />
        <Parallax />
        {children}
      </body>
    </html>
  );
}
