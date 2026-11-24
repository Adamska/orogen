'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useWorldStore } from '@/store/useWorldStore';
import { worldRuntime } from './worldRuntime';

const THUMBNAIL_WIDTH = 176;
const THUMBNAIL_HEIGHT = 99;
const INITIAL_DELAY = 2.5;
const TERRAFORM_DELAY = 7;

export function HistoryCapture() {
  const countdown = useRef(INITIAL_DELAY);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    void useHistoryStore.getState().hydrate();
    return useWorldStore.subscribe((state, previous) => {
      if (state.flightToken !== previous.flightToken) countdown.current = TERRAFORM_DELAY;
    });
  }, []);

  useFrame(({ gl }, delta) => {
    if (countdown.current <= 0) return;
    countdown.current -= delta;
    if (countdown.current > 0) return;
    if (worldRuntime.rebuildPending || worldRuntime.morphProgress < 1) {
      countdown.current = 0.5;
      return;
    }

    canvas.current ??= Object.assign(document.createElement('canvas'), {
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
    });
    const context = canvas.current.getContext('2d');
    if (!context) return;
    const source = gl.domElement;
    const sourceHeight = Math.min(source.height, (source.width * THUMBNAIL_HEIGHT) / THUMBNAIL_WIDTH);
    const sourceWidth = (sourceHeight * THUMBNAIL_WIDTH) / THUMBNAIL_HEIGHT;
    context.drawImage(
      source,
      (source.width - sourceWidth) / 2,
      (source.height - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      THUMBNAIL_WIDTH,
      THUMBNAIL_HEIGHT,
    );
    const { seed, world } = useWorldStore.getState();
    useHistoryStore.getState().record({ seed, world, thumbnail: canvas.current.toDataURL('image/jpeg', 0.72) });
  }, 10);

  return null;
}
