'use client';

import { Canvas } from '@react-three/fiber';
import { WorldScene } from './WorldScene';

interface WorldCanvasProps {
  onReady?: () => void;
}

const CAMERA_POSITION: [number, number, number] = [860, 175, -500];

export default function WorldCanvas({ onReady }: WorldCanvasProps) {
  return (
    <Canvas
      flat
      shadows="percentage"
      dpr={[1, 1.75]}
      gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: 40, near: 2, far: 26000, position: CAMERA_POSITION }}
      onCreated={({ gl }) => {
        gl.info.autoReset = false;
      }}
    >
      <WorldScene onReady={onReady} />
    </Canvas>
  );
}
