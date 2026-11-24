'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector2, Vector3 } from 'three';
import { applyBrush, intersectHeightfield } from '@/engine/sculpt';
import { useWorldStore } from '@/store/useWorldStore';
import type { TerrainSurface } from './useTerrainSurface';
import { worldRuntime } from './worldRuntime';
import { worldUniforms } from './worldUniforms';

const BRUSH_RATE = 0.32;
const PICK_DISTANCE = 4200;

export function SculptTool({ surface }: { surface: TerrainSurface }) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const pointer = useRef(new Vector2());
  const pressing = useRef(false);
  const anchorHeight = useRef<number | null>(null);
  const direction = useRef(new Vector3());
  const settings = useRef({ mode: useWorldStore.getState().sculptMode, radius: useWorldStore.getState().brushRadius });

  useEffect(
    () =>
      useWorldStore.subscribe((state) => {
        settings.current = { mode: state.sculptMode, radius: state.brushRadius };
      }),
    [],
  );

  useEffect(() => {
    const track = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.current.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      track(event);
      pressing.current = true;
    };
    const onPointerUp = () => {
      pressing.current = false;
      anchorHeight.current = null;
    };
    canvas.addEventListener('pointermove', track);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointermove', track);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      worldUniforms.uBrush.value.w = 0;
    };
  }, [canvas]);

  useFrame((_, delta) => {
    const { mode, radius: brushRadius } = settings.current;
    const brush = worldUniforms.uBrush.value;
    const ray = direction.current.set(pointer.current.x, pointer.current.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const anchored = pressing.current && anchorHeight.current !== null && ray.y < -1e-3;
    const hit = anchored
      ? camera.position.clone().addScaledVector(ray, ((anchorHeight.current ?? 0) - camera.position.y) / ray.y)
      : intersectHeightfield(surface.field, worldUniforms.uAmplitude.value, camera.position, ray, PICK_DISTANCE);
    if (pressing.current && hit && anchorHeight.current === null) anchorHeight.current = hit.y;
    brush.set(hit?.x ?? 0, hit?.z ?? 0, brushRadius, hit ? 1 : 0);

    const texture = worldUniforms.uElevationTo.value;
    const settled = worldRuntime.morphProgress >= 1 && !worldRuntime.rebuildPending;
    if (!pressing.current || !hit || !texture || !settled) return;

    const sign = mode === 'lower' ? -1 : 1;
    const strength = (sign * BRUSH_RATE * Math.min(delta, 0.05) * 60) / Math.max(worldUniforms.uAmplitude.value, 1);
    applyBrush(surface.field, surface.texels, { x: hit.x, z: hit.z, radius: brushRadius, strength });
    texture.needsUpdate = true;
  });

  return null;
}
