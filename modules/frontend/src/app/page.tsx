import { Suspense } from 'react';
import { RunsList } from '@/components/RunsList';

export default function Home() {
  return (
    <div className="wrap">
      <div className="list-head">
        <h1>Scripts</h1>
        <p>one question: can money be made on this by trading its alerts</p>
      </div>
      <Suspense fallback={<div className="filters"><span className="count">loading…</span></div>}>
        <RunsList />
      </Suspense>
    </div>
  );
}
