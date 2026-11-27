'use client';

import type { MouseEvent } from 'react';
import type { Block } from '@/lib/types';

/** Renders the agent's blocks; a click on a chart reference sends the chart there. */
export function Answers({ blocks }: { blocks: Block[] }) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a.ref') as HTMLAnchorElement | null;
    if (!a) return;
    e.preventDefault();
    try {
      const ref = JSON.parse(a.dataset.ref ?? '');
      window.dispatchEvent(new CustomEvent('pm:goto', { detail: ref }));
      document.querySelectorAll('a.ref.active').forEach((el) => el.classList.remove('active'));
      a.classList.add('active');
      const chart = document.getElementById('chart');
      if (chart && window.innerWidth < 900) window.scrollTo({ top: chart.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
    } catch { /* ignore */ }
  };
  return (
    <div className="answers" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {blocks.map((b) => (
        <section key={`${b.iteration}-${b.code}`} className="block" data-blk={`blk-${b.code}-${b.iteration}`}>
          <header>
            <span className="code">{b.code}</span>
            <span className="title">{b.title}</span>
            <span className={`refs-badge ${b.refs.length ? 'has' : 'none'}`} title={b.refs.length ? 'chart references in this block' : 'the agent does not reference the chart in this block'}>
              {b.refs.length ? `${b.refs.length} on chart` : 'no chart references'}
            </span>
          </header>
          <div className="md" dangerouslySetInnerHTML={{ __html: b.html }} />
        </section>
      ))}
    </div>
  );
}
