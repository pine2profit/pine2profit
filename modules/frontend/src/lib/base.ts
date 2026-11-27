export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** Prefix for files in public/ when the site lives under a sub-path (GitHub Pages project site). */
export const withBase = (p: string) => `${BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`;

export const usd = (v: number) => `${v < 0 ? '−' : '+'}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
export const usd0 = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
