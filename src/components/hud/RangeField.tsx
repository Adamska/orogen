import type { CSSProperties } from 'react';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RangeField({ label, value, min, max, step, format, onChange, disabled = false }: RangeFieldProps) {
  const fill = `${((value - min) / (max - min)) * 100}%`;

  return (
    <label className={`block transition-opacity ${disabled ? 'opacity-40' : ''}`}>
      <span className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="tracking-wide text-white/60">{label}</span>
        <span className="font-mono tabular-nums text-white/90">{format(value)}</span>
      </span>
      <input
        type="range"
        className="range-track"
        style={{ '--fill': fill } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
