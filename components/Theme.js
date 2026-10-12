'use client';

import { useEffect } from 'react';
import { saveTheme } from '@/lib/client';
import { PRINTED_THEMES, THEMES } from '@/lib/rules';

/** Put a look on the page: data-theme on <html>, plus data-printed for the printed looks. */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (PRINTED_THEMES.includes(theme)) root.dataset.printed = '';
  else delete root.dataset.printed;
}

/**
 * Dress the page in a room's look and remember it on this device, so the next loading or join
 * screen (and the home page) already match. Until the room's look is known, the page keeps the
 * one it has: the device's last look, set before first paint by the script in app/layout.js.
 */
export function useTheme(theme) {
  useEffect(() => {
    if (!THEMES[theme]) return;
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);
}
