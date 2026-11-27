'use client';

import { useEffect, useState } from 'react';
import ioc from '@/lib';
import type { Theme } from '@/lib/types';

export type { Theme } from '@/lib/types';

export function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const t = document.documentElement.dataset.theme;
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Light/dark switch. Stores the choice in localStorage; the chart and the code editor follow via chartService. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => { setTheme(currentTheme()); }, []);
  const apply = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('pm-theme', t); } catch { /* ignore */ }
    setTheme(t);
    ioc.chartService.setTheme(t);
  };
  return (
    <button className="pill-btn" onClick={() => apply(theme === 'dark' ? 'light' : 'dark')} title="Switch theme" aria-label="Switch theme">
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}
