import type { ComponentProps } from 'react';

export function GlassPanel({ className = '', ...rest }: ComponentProps<'div'>) {
  return (
    <div
      className={`glass-edge pointer-events-auto relative bg-slate-950/30 shadow-[0_18px_48px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl backdrop-saturate-150 ${className}`}
      {...rest}
    />
  );
}
