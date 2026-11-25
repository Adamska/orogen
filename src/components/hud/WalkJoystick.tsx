'use client';

import { useEffect, useRef, type PointerEvent } from 'react';
import { resetWalkIntent, walkIntent } from '@/scene/walkIntent';

const TRAVEL = 44;

export function WalkJoystick({ actionLabel }: { actionLabel: string }) {
  const knob = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => resetWalkIntent, []);

  const steer = (event: PointerEvent<HTMLDivElement>) => {
    const origin = anchor.current;
    if (origin === null || event.pointerId !== origin.id) return;
    let dx = event.clientX - origin.x;
    let dy = event.clientY - origin.y;
    const length = Math.hypot(dx, dy);
    if (length > TRAVEL) {
      dx *= TRAVEL / length;
      dy *= TRAVEL / length;
    }
    walkIntent.moveX = dx / TRAVEL;
    walkIntent.moveZ = -dy / TRAVEL;
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const grab = (event: PointerEvent<HTMLDivElement>) => {
    if (anchor.current !== null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    anchor.current = { id: event.pointerId, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    event.currentTarget.setPointerCapture(event.pointerId);
    steer(event);
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (anchor.current === null || event.pointerId !== anchor.current.id) return;
    anchor.current = null;
    walkIntent.moveX = 0;
    walkIntent.moveZ = 0;
    if (knob.current) knob.current.style.transform = '';
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 hidden items-end justify-between px-8 [@media(pointer:coarse)]:flex">
      <div
        role="presentation"
        onPointerDown={grab}
        onPointerMove={steer}
        onPointerUp={release}
        onPointerCancel={release}
        className="pointer-events-auto relative size-28 touch-none rounded-full border border-white/20 bg-slate-950/30 backdrop-blur-xl"
      >
        <div
          ref={knob}
          className="absolute left-1/2 top-1/2 -ml-6 -mt-6 size-12 rounded-full border border-white/30 bg-white/30 transition-transform duration-75"
        />
      </div>
      <button
        type="button"
        aria-label={actionLabel}
        onPointerDown={() => {
          walkIntent.jump = true;
          walkIntent.jumpHeld = true;
        }}
        onPointerUp={() => {
          walkIntent.jumpHeld = false;
        }}
        onPointerCancel={() => {
          walkIntent.jumpHeld = false;
        }}
        className="pointer-events-auto size-16 touch-none rounded-full border border-white/20 bg-slate-950/30 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-xl active:bg-white/20"
      >
        {actionLabel}
      </button>
    </div>
  );
}
