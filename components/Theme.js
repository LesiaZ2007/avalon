'use client';

import { useEffect } from 'react';
import { DEFAULT_THEME, PRINTED_THEMES, THEMES } from '@/lib/rules';

/**
 * Dress the whole page in a room's theme while the room is open, and go back to the default
 * after. Printed looks also get data-printed, which their shared stylesheet layer keys on.
 */
export function useTheme(theme) {
  useEffect(() => {
    const root = document.documentElement;
    const chosen = THEMES[theme] ? theme : DEFAULT_THEME;
    root.dataset.theme = chosen;
    if (PRINTED_THEMES.includes(chosen)) root.dataset.printed = '';
    else delete root.dataset.printed;
    return () => {
      root.dataset.theme = DEFAULT_THEME;
      delete root.dataset.printed;
    };
  }, [theme]);
}
