import type { Metadata } from 'next';
import Link from 'next/link';
import { Unbounded, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { withBase } from '@/lib/base';
import { ThemeToggle } from '@/components/ThemeToggle';

const display = Unbounded({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display', display: 'swap' });
const sans = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Can money be made on this?',
  description: 'An agent loops over Pine Script indicators and strategies with one question: can money be made on them. Chart + the agent\'s answers linked to bars.',
  icons: { icon: withBase('/icon.svg') },
};

// Applies the saved theme before first paint so there is no flash.
const themeInit = `(function(){try{var t=localStorage.getItem('pm-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>
        <header className="top">
          <div className="wrap inner">
            <Link className="brand" href="/"><span className="mark">$?</span><span>Can money be made on this?</span></Link>
            <nav><Link href="/">Scripts</Link></nav>
            <div className="right">
              <ThemeToggle />
              <a className="pill-btn ink" href="https://github.com/pine2profit" target="_blank" rel="noreferrer">GitHub ↗</a>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="wrap">
          All amounts are on a notional $10,000 account without compounding. A verdict is the agent&apos;s answer under its protocol on the stated data, not a recommendation.
          Pine Script® and TradingView® are trademarks of TradingView, Inc.
        </footer>
      </body>
    </html>
  );
}
