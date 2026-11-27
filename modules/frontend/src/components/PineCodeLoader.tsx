'use client';

import dynamic from 'next/dynamic';

const PineCode = dynamic(() => import('./PineCode'), { ssr: false, loading: () => <div className="ace-host" /> });

export function PineCodeLoader({ files }: { files: { name: string; code: string }[] }) {
  return <PineCode files={files} />;
}
