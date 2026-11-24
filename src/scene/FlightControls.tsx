'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, MathUtils, Vector3 } from 'three';
import { sampleField, type ElevationField, type FieldSample } from '@/engine/elevationField';
import { useWorldStore } from '@/store/useWorldStore';
import { worldUniforms } from './worldUniforms';

const CRUISE_SPEED = 80;
const BOOST_SPEED = 280;
const RESPONSE = 4.5;
const LOOK_SENSITIVITY = 0.0032;
const GROUND_CLEARANCE = 6;
const LOOKAHEAD_SECONDS = 0.6;
const HORIZONTAL_LIMIT = 1500;
const ALTITUDE_LIMIT = 1300;
const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACKWARD_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const RISE_KEYS = ['KeyE', 'Space'];
const SINK_KEYS = ['KeyQ', 'KeyC'];

export function FlightControls({ field }: { field: ElevationField }) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const pressed = useRef(new Set<string>());
  const orientation = useRef(new Euler(0, 0, 0, 'YXZ'));
  const velocity = useRef(new Vector3());
  const scratch = useRef({ heading: new Vector3(), side: new Vector3(), desired: new Vector3() });
  const sample = useRef<FieldSample>({ elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 });

  useEffect(() => {
    orientation.current.setFromQuaternion(camera.quaternion, 'YXZ');
    orientation.current.z = 0;
    const keys = pressed.current;
    let dragging = false;
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));
    const onKeyDown = (event: KeyboardEvent) => {
      if (editable(event.target)) return;
      if (event.code === 'Escape') useWorldStore.getState().setFlightMode(false);
      keys.add(event.code);
      if (event.code === 'Space') event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onBlur = () => keys.clear();
    const onPointerDown = () => (dragging = true);
    const onPointerUp = () => (dragging = false);
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const look = orientation.current;
      look.y -= event.movementX * LOOK_SENSITIVITY;
      look.x = MathUtils.clamp(look.x - event.movementY * LOOK_SENSITIVITY, -1.3, 1.3);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      keys.clear();
    };
  }, [camera, canvas]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.1);
    const keys = pressed.current;
    const axis = (positive: string[], negative: string[]) =>
      (positive.some((code) => keys.has(code)) ? 1 : 0) - (negative.some((code) => keys.has(code)) ? 1 : 0);
    const look = orientation.current;
    const { heading, side, desired } = scratch.current;
    heading.set(-Math.sin(look.y) * Math.cos(look.x), Math.sin(look.x), -Math.cos(look.y) * Math.cos(look.x));
    side.set(Math.cos(look.y), 0, -Math.sin(look.y));
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? BOOST_SPEED : CRUISE_SPEED;
    desired
      .copy(heading)
      .multiplyScalar(axis(FORWARD_KEYS, BACKWARD_KEYS))
      .addScaledVector(side, axis(RIGHT_KEYS, LEFT_KEYS))
      .setY(desired.y + axis(RISE_KEYS, SINK_KEYS))
      .multiplyScalar(speed);
    velocity.current.lerp(desired, 1 - Math.exp(-step * RESPONSE));

    const position = camera.position.addScaledVector(velocity.current, step);
    position.x = MathUtils.clamp(position.x, -HORIZONTAL_LIMIT, HORIZONTAL_LIMIT);
    position.z = MathUtils.clamp(position.z, -HORIZONTAL_LIMIT, HORIZONTAL_LIMIT);
    const amplitude = worldUniforms.uAmplitude.value;
    const groundAt = (x: number, z: number) => sampleField(field, x, z, sample.current).elevation * amplitude;
    const ahead = velocity.current;
    const ground = Math.max(
      groundAt(position.x, position.z),
      groundAt(position.x + ahead.x * LOOKAHEAD_SECONDS, position.z + ahead.z * LOOKAHEAD_SECONDS),
    );
    const floor = Math.max(ground, worldUniforms.uWaterLevel.value * amplitude) + GROUND_CLEARANCE;
    position.y = MathUtils.clamp(MathUtils.lerp(position.y, Math.max(position.y, floor), 1 - Math.exp(-step * 10)), floor - 3, ALTITUDE_LIMIT);
    camera.quaternion.setFromEuler(look);
  }, -2);

  return null;
}
