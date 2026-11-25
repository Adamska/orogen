'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { AdditiveBlending, DoubleSide, Vector2, Vector3, type Camera, type Group } from 'three';
import { sampleField, type FieldSample } from '@/engine/elevationField';
import { intersectHeightfield } from '@/engine/sculpt';
import { useWorldStore } from '@/store/useWorldStore';
import type { TerrainSurface } from './useTerrainSurface';
import { requestLook } from './useWalkInput';
import { findFooting, walkableLimit, type Footing } from './walkGround';
import { loadWanderer } from './wandererModel';
import { worldUniforms } from './worldUniforms';

const PICK_DISTANCE = 4200;
const FOOTING_RINGS = 3;
const TAP_SLOP = 6;
const TAP_MS = 450;
const BEACON_HEIGHT = 60;

const probe: FieldSample = { elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 };
const ray = new Vector3();

function pickFooting(surface: TerrainSurface, camera: Camera, pointer: Vector2): Footing | null {
  ray.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
  const amplitude = worldUniforms.uAmplitude.value;
  const hit = intersectHeightfield(surface.field, amplitude, camera.position, ray, PICK_DISTANCE);
  if (hit === null) return null;
  const limit = walkableLimit(surface.field, surface.mesh.resolution);
  const water = worldUniforms.uWaterLevel.value * amplitude;
  const clamped = { x: Math.max(-limit, Math.min(limit, hit.x)), z: Math.max(-limit, Math.min(limit, hit.z)) };
  return findFooting(surface.field, amplitude, water, limit, clamped, FOOTING_RINGS);
}

export function SpawnPicker({ surface }: { surface: TerrainSurface }) {
  const getThree = useThree((state) => state.get);
  const beacon = useRef<Group>(null);
  const pointer = useRef(new Vector2(0, 0));
  const hovering = useRef(false);

  useEffect(() => {
    loadWanderer().catch(() => undefined);
    const { gl } = getThree();
    const canvas = gl.domElement;
    let press: { x: number; y: number; time: number } | null = null;
    const track = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.current.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      hovering.current = true;
    };
    const onPointerDown = (event: PointerEvent) => {
      track(event);
      if (event.button === 0) press = { x: event.clientX, y: event.clientY, time: performance.now() };
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = press;
      press = null;
      if (start === null || performance.now() - start.time > TAP_MS) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP) return;
      track(event);
      const footing = pickFooting(surface, getThree().camera, pointer.current);
      if (footing === null) return;
      requestLook(canvas);
      useWorldStore.getState().beginWalk(footing);
    };
    const onPointerLeave = () => {
      hovering.current = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') useWorldStore.getState().setWalkStage('off');
    };
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('pointermove', track);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      canvas.style.cursor = '';
      canvas.removeEventListener('pointermove', track);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [getThree, surface]);

  useFrame((three) => {
    const marker = beacon.current;
    if (marker === null) return;
    const footing = hovering.current ? pickFooting(surface, three.camera, pointer.current) : null;
    marker.visible = footing !== null;
    if (footing === null) return;
    const amplitude = worldUniforms.uAmplitude.value;
    const height = sampleField(surface.field, footing.x, footing.z, probe).elevation * amplitude;
    const scale = Math.max(1, three.camera.position.distanceTo(marker.position) / 120);
    marker.position.set(footing.x, height, footing.z);
    marker.scale.set(scale, 1, scale);
    marker.rotation.y = three.clock.elapsedTime * 0.8;
  });

  return (
    <group ref={beacon} visible={false}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.6} renderOrder={2}>
        <ringGeometry args={[3.2, 4.2, 40]} />
        <meshBasicMaterial color="#ffe2b0" transparent opacity={0.85} depthTest={false} blending={AdditiveBlending} side={DoubleSide} />
      </mesh>
      <mesh position-y={BEACON_HEIGHT / 2} renderOrder={2}>
        <cylinderGeometry args={[0.9, 0.9, BEACON_HEIGHT, 16, 1, true]} />
        <meshBasicMaterial color="#ffd38a" transparent opacity={0.22} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
      </mesh>
    </group>
  );
}
