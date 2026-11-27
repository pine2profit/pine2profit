'use client';

import type { MouseEvent } from 'react';
import ioc from '@/lib';
import type { Block } from '@/lib/types';

/** Renders the agent's messages; every link inside goes through LinkService (chart references frame the chart). */
export function Answers({ blocks }: { blocks: Block[] }) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null;
    if (!a) return;
    const dataRef = a.dataset.ref ?? null;
    if (!ioc.linkService.openLink(a.getAttribute('href') ?? '', dataRef)) return;
    e.preventDefault();
    if (!dataRef) return;
    document.querySelectorAll('a.ref.active').forEach((el) => el.classList.remove('active'));
    a.classList.add('active');
    const chart = document.getElementById('chart');
    if (chart && window.innerWidth < 900) window.scrollTo({ top: chart.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
  };
  return (
    <div className="answers" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {blocks.map((b) => (
        <section key={b.key} className="block" data-blk={b.key}>
          <header>
            {b.code && <span className="code">{b.code}</span>}
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
