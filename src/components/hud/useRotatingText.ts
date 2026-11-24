import { useEffect, useState } from 'react';

export function useRotatingText(options: readonly string[], intervalMs: number, active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || options.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % options.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, options.length, intervalMs]);

  return options[index % options.length];
}
