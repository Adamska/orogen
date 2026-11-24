'use client';

import { useEffect, useState } from 'react';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';

const LINE_INTERVAL_MS = 320;
const LINGER_MS = 4200;

export function DirectorLog() {
  const log = useWorldStore((state) => state.directorLog);
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => {
    if (log === null) return;
    const timer = window.setTimeout(
      () => setDismissedId(log.id),
      log.lines.length * LINE_INTERVAL_MS + LINGER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [log]);

  if (log === null || dismissedId === log.id) return null;

  return (
    <GlassPanel
      key={log.id}
      role="status"
      aria-live="polite"
      className="w-[min(22rem,calc(100vw-2rem))] animate-[rise_500ms_ease-out_both] rounded-2xl px-4 py-3"
    >
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-white/45">Director log</p>
      <ol className="space-y-1">
        {log.lines.map((line, index) => (
          <li
            key={line}
            className="flex items-baseline gap-2 text-xs text-white/85 opacity-0 animate-[reveal_420ms_ease-out_forwards]"
            style={{ animationDelay: `${index * LINE_INTERVAL_MS}ms` }}
          >
            <span className="font-mono text-[10px] text-white/35">{String(index + 1).padStart(2, '0')}</span>
            {line}
          </li>
        ))}
      </ol>
    </GlassPanel>
  );
}
