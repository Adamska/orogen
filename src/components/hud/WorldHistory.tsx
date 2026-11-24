'use client';

import { useHistoryStore } from '@/store/useHistoryStore';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';

export function WorldHistory() {
  const entries = useHistoryStore((state) => state.entries);
  const seed = useWorldStore((state) => state.seed);
  const name = useWorldStore((state) => state.world.name);
  const revisit = useWorldStore((state) => state.revisit);

  if (entries.length < 2) return null;

  return (
    <GlassPanel className="w-[min(19rem,calc(100vw-2rem))] rounded-2xl px-3 py-2.5">
      <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.24em] text-white/45">Recent worlds</p>
      <ul className="flex gap-1.5 overflow-x-auto pb-0.5">
        {entries.map((entry) => {
          const current = entry.seed === seed && entry.world.name === name;
          return (
            <li key={entry.id} className="shrink-0">
              <button
                type="button"
                onClick={() => revisit(entry)}
                disabled={current}
                aria-label={`Revisit ${entry.world.name}`}
                title={entry.world.name}
                className={`block overflow-hidden rounded-lg border transition focus-visible:outline-2 focus-visible:outline-white/70 ${
                  current ? 'border-white/60' : 'border-white/10 opacity-75 hover:border-white/40 hover:opacity-100'
                }`}
              >
                <span
                  className="block h-9 w-16 bg-cover bg-center"
                  style={{ backgroundImage: `url(${entry.thumbnail})` }}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
