'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useQualityProfile } from '@/store/useQualityStore';
import { useWorldStore } from '@/store/useWorldStore';

const TARGET_WIDTH = 3840;
const MAX_CAPTURE_RATIO = 3;
const SETTLE_FRAMES = 3;

function fileName(): string {
  const { world, seed } = useWorldStore.getState();
  const slug = world.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `orogen-${slug}-${seed}.png`;
}

function download(blob: Blob | null): void {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), { href: url, download: fileName() });
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PhotoCapture() {
  const setDpr = useThree((state) => state.setDpr);
  const width = useThree((state) => state.size.width);
  const { maxPixelRatio } = useQualityProfile();
  const pendingFrames = useRef(-1);

  useEffect(
    () =>
      useWorldStore.subscribe((state, previous) => {
        if (state.captureToken === previous.captureToken) return;
        setDpr(Math.min(MAX_CAPTURE_RATIO, Math.max(window.devicePixelRatio, TARGET_WIDTH / width)));
        pendingFrames.current = SETTLE_FRAMES;
      }),
    [setDpr, width],
  );

  useFrame(({ gl }) => {
    if (pendingFrames.current < 0) return;
    if (pendingFrames.current > 0) {
      pendingFrames.current -= 1;
      return;
    }
    pendingFrames.current = -1;
    gl.domElement.toBlob(download, 'image/png');
    setDpr(Math.min(window.devicePixelRatio, maxPixelRatio));
  }, 10);

  return null;
}
