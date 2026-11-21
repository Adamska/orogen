'use client';

import { useEffect, useState } from 'react';
import { frameStats } from '@/scene/frameStats';
import { useWorldStore } from '@/store/useWorldStore';
import { GlassPanel } from './GlassPanel';

interface TelemetrySample {
  fps: number;
  triangles: number;
  drawCalls: number;
}

const SAMPLE_INTERVAL_MS = 500;

function formatCount(count: number): string {
  if (count >= 1e6) return `${(count / 1e6).toFixed(2)}M`;
  if (count >= 1e3) return `${Math.round(count / 1e3)}K`;
  return String(count);
}

function fpsTone(fps: number): string {
  if (fps >= 50) return 'bg-emerald-300';
  if (fps >= 30) return 'bg-amber-300';
  return 'bg-rose-400';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-xs tabular-nums text-white/90">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</span>
    </span>
  );
}

export function TelemetryBadge() {
  const seed = useWorldStore((state) => state.seed);
  const [sample, setSample] = useState<TelemetrySample>({ fps: 0, triangles: 0, drawCalls: 0 });

  useEffect(() => {
    let previousFrames = frameStats.frameCount;
    let previousTime = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const fps = ((frameStats.frameCount - previousFrames) * 1000) / (now - previousTime);
      previousFrames = frameStats.frameCount;
      previousTime = now;
      setSample({
        fps: Math.round(fps),
        triangles: frameStats.triangles,
        drawCalls: frameStats.drawCalls,
      });
    }, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <GlassPanel className="flex items-center gap-4 rounded-full px-4 py-2">
      <span className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${fpsTone(sample.fps)}`} />
        <Metric label="fps" value={String(sample.fps)} />
      </span>
      <span className="hidden items-center gap-4 sm:flex">
        <Metric label="tris" value={formatCount(sample.triangles)} />
        <Metric label="calls" value={String(sample.drawCalls)} />
      </span>
      <Metric label="seed" value={String(seed).padStart(5, '0')} />
    </GlassPanel>
  );
}
