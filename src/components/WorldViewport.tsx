'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const WorldCanvas = dynamic(() => import('@/scene/WorldCanvas'), { ssr: false });

export function WorldViewport() {
  const [ready, setReady] = useState(false);

  return (
    <div className="absolute inset-0">
      <WorldCanvas onReady={() => setReady(true)} />
      <div
        aria-hidden={ready}
        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 bg-abyss transition-opacity duration-1000 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="text-xs font-medium uppercase tracking-[0.6em] text-white/75">Orogen</span>
        <span className="h-px w-40 overflow-hidden bg-white/10">
          <span className="block h-full w-1/3 animate-[sweep_1.4s_ease-in-out_infinite] bg-white/70" />
        </span>
        <span className="text-[11px] tracking-wide text-white/40">Raising terrain</span>
      </div>
    </div>
  );
}
