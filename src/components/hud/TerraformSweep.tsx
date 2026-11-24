'use client';

import { useWorldStore } from '@/store/useWorldStore';

export function TerraformSweep() {
  const directing = useWorldStore((state) => state.directing);
  const flightToken = useWorldStore((state) => state.flightToken);

  if (!directing && flightToken === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        key={directing ? 'directing' : flightToken}
        className={`absolute inset-x-0 top-0 h-40 opacity-0 ${
          directing
            ? 'animate-[scan_1.4s_ease-in-out_infinite]'
            : 'animate-[scan_1.8s_cubic-bezier(0.3,0,0.2,1)_forwards]'
        }`}
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgb(255 255 255 / 0.05) 70%, rgb(255 255 255 / 0.35) 99%, transparent)',
        }}
      />
    </div>
  );
}
