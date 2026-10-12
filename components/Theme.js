'use client';

import { useLayoutEffect } from 'react';
import { PRINTED_THEMES, THEMES } from '@/lib/rules';

/** Put a look on the page: data-theme on <html>, data-printed for the printed looks, and the browser bar's colour. */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (PRINTED_THEMES.includes(theme)) root.dataset.printed = '';
  else delete root.dataset.printed;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[theme].chrome);
}

/**
 * Dress the page in a look, before it paints. Room pages pass the room's look once it loads (until
 * then, nothing changes); pages outside a room pass DEFAULT_THEME, so coming back from a night
 * room puts parchment back. The first paint of a room link is handled on the server
 * (RoomThemeScript).
 */
export function useTheme(theme) {
  useLayoutEffect(() => {
    if (THEMES[theme]) applyTheme(theme);
  }, [theme]);
}

/** For server components: apply a look once mounted (covers arriving by in-app navigation). */
export function ThemeOnMount({ theme }) {
  useTheme(theme);
  return null;
}
