'use client';

import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useQualityProfile, useQualityStore } from '@/store/useQualityStore';

const LOWER_FPS_BOUND = 46;
const UPPER_FPS_BOUND = 58;

export function AdaptiveQuality() {
  const shift = useQualityStore((state) => state.shift);
  const calibrate = useQualityStore((state) => state.calibrate);
  const { maxPixelRatio } = useQualityProfile();
  const setDpr = useThree((state) => state.setDpr);

  useEffect(() => calibrate(), [calibrate]);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio, maxPixelRatio));
  }, [maxPixelRatio, setDpr]);

  return (
    <PerformanceMonitor
      ms={400}
      iterations={6}
      flipflops={4}
      bounds={(refreshRate) => [
        Math.min(LOWER_FPS_BOUND, refreshRate * 0.78),
        Math.min(UPPER_FPS_BOUND, refreshRate * 0.96),
      ]}
      onDecline={() => shift(-1)}
      onIncline={() => shift(1)}
    />
  );
}
