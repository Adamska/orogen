'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { useWorldStore } from '@/store/useWorldStore';
import { advanceFlight, planFlight, readPose, writePose, type CameraFlight, type OrbitPose } from './cameraFlight';
import { worldRuntime } from './worldRuntime';

interface OrbitRig {
  target: Vector3;
  maxDistance: number;
  addEventListener: (type: 'start', listener: () => void) => void;
  removeEventListener: (type: 'start', listener: () => void) => void;
}

const SETTLE_PROGRESS = 0.55;

function asOrbitRig(controls: unknown): OrbitRig | null {
  return typeof controls === 'object' && controls !== null && 'target' in controls
    ? (controls as OrbitRig)
    : null;
}

export function CinematicDirector() {
  const camera = useThree((state) => state.camera);
  const rig = asOrbitRig(useThree((state) => state.controls));
  const flight = useRef<CameraFlight | null>(null);
  const requested = useRef(false);
  const pose = useRef<OrbitPose>({ radius: 0, polar: 0, azimuth: 0 });
  const offset = useRef(new Vector3());

  useEffect(
    () =>
      useWorldStore.subscribe((state, previous) => {
        if (state.flightToken === previous.flightToken) return;
        requested.current = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }),
    [],
  );

  useEffect(() => {
    if (rig === null) return;
    const cancel = () => {
      flight.current = null;
      requested.current = false;
    };
    rig.addEventListener('start', cancel);
    return () => rig.removeEventListener('start', cancel);
  }, [rig]);

  useFrame((_, delta) => {
    if (rig === null) return;
    if (requested.current) {
      requested.current = false;
      const origin = readPose(offset.current.copy(camera.position).sub(rig.target));
      flight.current = planFlight(origin, worldRuntime.targetSunAzimuth, rig.maxDistance);
    }
    const active = flight.current;
    if (active === null) return;
    const settled = !worldRuntime.rebuildPending && worldRuntime.morphProgress >= SETTLE_PROGRESS;
    advanceFlight(active, Math.min(delta, 0.1), settled, pose.current);
    writePose(pose.current, rig.target, camera.position);
    camera.lookAt(rig.target);
    if (active.stage === 'done') flight.current = null;
  }, -2);

  return null;
}
