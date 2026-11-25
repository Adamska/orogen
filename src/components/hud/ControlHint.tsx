'use client';

import { GlassPanel } from './GlassPanel';

type Binding = readonly [key: string, action: string];

export const FLIGHT_BINDINGS: readonly Binding[] = [
  ['WASD', 'fly'],
  ['Drag', 'look'],
  ['E / Q', 'climb'],
  ['Shift', 'boost'],
  ['Esc', 'land'],
];

export const WALK_BINDINGS: readonly Binding[] = [
  ['WASD', 'walk'],
  ['Drag', 'look'],
  ['Shift', 'run'],
  ['Space', 'jump'],
  ['Scroll', 'zoom'],
  ['Esc', 'leave'],
];

interface ControlHintProps {
  bindings: readonly Binding[];
  exitLabel: string;
  onExit: () => void;
}

export function ControlHint({ bindings, exitLabel, onExit }: ControlHintProps) {
  return (
    <GlassPanel className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full px-4 py-2">
      {bindings.map(([key, action]) => (
        <span key={key} className="hidden items-center gap-1.5 text-[11px] text-white/60 [@media(pointer:fine)]:flex">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/85">
            {key}
          </kbd>
          {action}
        </span>
      ))}
      <button
        type="button"
        onClick={onExit}
        className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-white/80 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white/70"
      >
        {exitLabel}
      </button>
    </GlassPanel>
  );
}
