'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type ChartPanelType from './ChartPanel';

const ChartPanel = dynamic(() => import('./ChartPanel'), {
  ssr: false,
  loading: () => <div className="chart-panel" id="chart"><div className="chart-bar"><span className="hint">loading chart…</span></div><div className="chart-host" /></div>,
});

export function ChartPanelLoader(props: ComponentProps<typeof ChartPanelType>) {
  return <ChartPanel {...props} />;
}
