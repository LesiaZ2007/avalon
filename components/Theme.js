'use client';

import { useEffect } from 'react';
import { DEFAULT_THEME, THEMES } from '@/lib/rules';

/** Dress the whole page in a room's theme while the room is open, and go back to the default after. */
export function useTheme(theme) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = THEMES[theme] ? theme : DEFAULT_THEME;
    return () => {
      root.dataset.theme = DEFAULT_THEME;
    };
  }, [theme]);
}
