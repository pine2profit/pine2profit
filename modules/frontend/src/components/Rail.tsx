'use client';

import { useEffect, useState } from 'react';

export interface RailGroup { letter: string; title: string; items: { code: string; id: string }[] }

/**
 * Left navigation: message codes grouped by their first letter; the block under the top of the viewport is
 * highlighted. Ids are `blk-<iteration>-<index>` for messages and `iter-<n>` for iteration headers, so an
 * iteration item lights up while any of its blocks is at the top.
 */
export function Rail({ groups }: { groups: RailGroup[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        let act: string | null = null;
        for (const el of document.querySelectorAll<HTMLElement>('[data-blk]')) {
          if (el.getBoundingClientRect().top <= 130) act = el.dataset.blk ?? null; else break;
        }
        setActive(act);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [groups]);
  const jump = (id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-blk="${id}"]`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' });
  };
  const isOn = (id: string) => active === id || (id.startsWith('iter-') && !!active && active.startsWith('blk-') && active.split('-')[1] === id.slice(5));
  return (
    <nav className="rail">
      {groups.map((g) => (
        <div className="g" key={g.letter}>
          <div className="gh"><b>{g.letter}</b><span>{g.title}</span></div>
          <div className="items">
            {g.items.map((i) => <button key={i.id} className={`item${isOn(i.id) ? ' on' : ''}`} onClick={() => jump(i.id)}>{i.code}</button>)}
          </div>
        </div>
      ))}
    </nav>
  );
}
