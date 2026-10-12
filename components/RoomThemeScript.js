import { loadRoomShared } from '@/lib/store';
import { normCode } from '@/lib/game';
import { PRINTED_THEMES, THEMES } from '@/lib/rules';
import { ThemeOnMount } from './Theme';

/**
 * Server-rendered: puts a room's look on the page while its HTML is still arriving, so a room
 * link (the join screen, the loading screen, the TV) opens in the room's own look rather than
 * flashing the default first. The inline script covers opening a link; ThemeOnMount covers
 * arriving from another page in the app, where inline scripts don't run. One shared read of the
 * room per page load. An unknown room keeps the default look.
 */
export default async function RoomThemeScript({ code }) {
  let theme;
  try {
    theme = (await loadRoomShared(normCode(code)))?.settings?.theme;
  } catch {
    return null;
  }
  if (!THEMES[theme]) return null;
  const printed = PRINTED_THEMES.includes(theme) ? "r.dataset.printed=''" : 'delete r.dataset.printed';
  const chrome = `var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',${JSON.stringify(THEMES[theme].chrome)})`;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `(function(r){r.dataset.theme=${JSON.stringify(theme)};${printed};${chrome}})(document.documentElement)` }} />
      <ThemeOnMount theme={theme} />
    </>
  );
}
