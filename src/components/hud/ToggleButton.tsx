import type { ReactNode } from 'react';

interface ToggleButtonProps {
  label: string;
  pressed: boolean;
  onToggle: () => void;
  tone?: 'neutral' | 'warm';
  children: ReactNode;
}

const PRESSED_TONES = {
  neutral: 'border-white/40 bg-white/25 text-white',
  warm: 'border-amber-200/50 bg-amber-200/20 text-amber-50',
} as const;

export function ToggleButton({ label, pressed, onToggle, tone = 'neutral', children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-xl border px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-white/70 ${
        pressed ? PRESSED_TONES[tone] : 'border-white/15 bg-white/5 text-white/50 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
