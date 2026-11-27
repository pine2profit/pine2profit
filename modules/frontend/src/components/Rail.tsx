'use client';

import { useEffect, useState } from 'react';

export interface RailGroup { letter: string; title: string; items: { code: string; id: string }[] }

/** Left navigation: block codes grouped A–E; the block under the top of the viewport is highlighted. */
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
  }, []);
  const jump = (id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-blk="${id}"]`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: 'smooth' });
  };
  const isOn = (g: RailGroup, id: string) => active === id || (g.letter === 'E' && !!active && /^blk-E/.test(active) && active.endsWith(`-${id.replace('iter-', '')}`));
  return (
    <nav className="rail">
      {groups.map((g) => (
        <div className="g" key={g.letter}>
          <div className="gh"><b>{g.letter}</b><span>{g.title}</span></div>
          <div className="items">
            {g.items.map((i) => <button key={i.id} className={`item${isOn(g, i.id) ? ' on' : ''}`} onClick={() => jump(i.id)}>{i.code}</button>)}
          </div>
        </div>
      ))}
    </nav>
  );
}
