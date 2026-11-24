'use client';

import dynamic from 'next/dynamic';
import { useBootStore } from '@/store/useBootStore';
import { LoadingVeil } from './LoadingVeil';

const WorldCanvas = dynamic(() => import('@/scene/WorldCanvas'), { ssr: false });

const markReady = () => useBootStore.getState().advance('ready');

export function WorldViewport() {
  return (
    <div className="absolute inset-0" role="img" aria-label="Interactive 3D landscape rendered in real time">
      <WorldCanvas onReady={markReady} />
      <LoadingVeil />
    </div>
  );
}
