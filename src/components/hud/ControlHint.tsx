'use client';

import { GlassPanel } from './GlassPanel';

type Binding = readonly [key: string, action: string];

export interface HintAction {
  readonly label: string;
  readonly onSelect: () => void;
}

export const FLIGHT_BINDINGS: readonly Binding[] = [
  ['WASD', 'fly'],
  ['Drag', 'look'],
  ['E / Q', 'climb'],
  ['Shift', 'boost'],
  ['Esc', 'land'],
];

export const WALK_BINDINGS: readonly Binding[] = [
  ['WASD', 'move'],
  ['Mouse', 'look'],
  ['Shift', 'sprint'],
  ['Space', 'jump'],
  ['Scroll', 'zoom'],
  ['Esc', 'release cursor'],
];

export const SPAWN_BINDINGS: readonly Binding[] = [
  ['Drag', 'orbit'],
  ['Esc', 'cancel'],
];

interface ControlHintProps {
  bindings: readonly Binding[];
  actions: readonly HintAction[];
  message?: string;
  pointerMessage?: string;
}

export function ControlHint({ bindings, actions, message, pointerMessage }: ControlHintProps) {
  return (
    <GlassPanel className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full px-4 py-2">
      {message && <span className="text-[11px] font-medium text-white/90">{message}</span>}
      {pointerMessage && (
        <span className="hidden text-[11px] font-medium text-white/90 [@media(pointer:fine)]:inline">{pointerMessage}</span>
      )}
      {bindings.map(([key, action]) => (
        <span key={key} className="hidden items-center gap-1.5 text-[11px] text-white/60 [@media(pointer:fine)]:flex">
          <kbd className="rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/85">
            {key}
          </kbd>
          {action}
        </span>
      ))}
      {actions.map(({ label, onSelect }) => (
        <button
          key={label}
          type="button"
          onClick={onSelect}
          className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-white/80 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white/70"
        >
          {label}
        </button>
      ))}
    </GlassPanel>
  );
}
