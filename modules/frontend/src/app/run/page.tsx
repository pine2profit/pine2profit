import { Suspense } from 'react';
import { RunView } from '@/components/RunView';

/** /run/?id=<id> — one static page for every script; the id lives in the query string. */
export default function RunPage() {
  return (
    <Suspense fallback={<div className="wrap"><div className="run-head"><h1>loading…</h1></div></div>}>
      <RunView />
    </Suspense>
  );
}
