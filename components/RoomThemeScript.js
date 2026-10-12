import { loadRoomShared } from '@/lib/store';
import { normCode } from '@/lib/game';
import { PRINTED_THEMES, THEMES } from '@/lib/rules';

/**
 * Server-rendered: puts a room's look on the page while its HTML is still arriving, so a room
 * link (the join screen, the loading screen, the TV) opens in the room's own look rather than
 * flashing this device's last one first. One shared read of the room per page load.
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
  return <script dangerouslySetInnerHTML={{ __html: `(function(r){r.dataset.theme=${JSON.stringify(theme)};${printed}})(document.documentElement)` }} />;
}
