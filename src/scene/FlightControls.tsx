'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Euler, MathUtils, Vector3 } from 'three';
import { sampleField, type ElevationField, type FieldSample } from '@/engine/elevationField';
import { useWorldStore } from '@/store/useWorldStore';
import { useLookInput, type LookBindings, type LookInput } from './useLookInput';
import { setFieldOfView } from './walkCamera';
import { resetWalkIntent, walkIntent } from './walkIntent';
import { worldUniforms } from './worldUniforms';

interface FlightInput extends LookInput {
  speedScale: number;
}

const CRUISE_SPEED = 140;
const BOOST_FACTOR = 3;
const SPEED_SCALE_RANGE = [0.15, 5] as const;
const ACCELERATION = 2.8;
const BRAKING = 5;
const VERTICAL_SHARE = 0.8;
const BANK_PER_TURN = 0.09;
const BANK_LIMIT = 0.45;
const BANK_RESPONSE = 5;
const BASE_FOV = 40;
const SPEED_FOV = 18;
const FOV_SPEED = 450;
const GROUND_CLEARANCE = 6;
const LOOKAHEAD_SECONDS = 0.6;
const HORIZONTAL_LIMIT = 1500;
const ALTITUDE_LIMIT = 1400;
const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACKWARD_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const RISE_KEYS = ['KeyE', 'Space'];
const SINK_KEYS = ['KeyQ', 'KeyC', 'ControlLeft'];
const BOOST_KEYS = ['ShiftLeft', 'ShiftRight'];

const BINDINGS: LookBindings<FlightInput> = {
  pitchRange: [-1.35, 1.35],
  onEscape: () => useWorldStore.getState().setFlightMode(false),
  onWheel: (state, deltaY) => {
    state.speedScale = MathUtils.clamp(
      state.speedScale * Math.exp(-deltaY * 0.0015),
      SPEED_SCALE_RANGE[0],
      SPEED_SCALE_RANGE[1],
    );
  },
  onKey: () => undefined,
};

export function FlightControls({ field }: { field: ElevationField }) {
  const canvas = useThree((state) => state.gl.domElement);
  const getThree = useThree((state) => state.get);
  const input = useRef<FlightInput>({ keys: new Set(), yaw: 0, pitch: 0, jump: false, speedScale: 1 });
  const motion = useRef({ velocity: new Vector3(), roll: 0, previousYaw: 0 });
  const scratch = useRef({ heading: new Vector3(), side: new Vector3(), desired: new Vector3(), look: new Euler(0, 0, 0, 'YXZ') });
  const sample = useRef<FieldSample>({ elevation: 0, gradientX: 0, gradientZ: 0, openness: 0 });
  useLookInput(canvas, input, BINDINGS);

  useEffect(() => {
    const { camera } = getThree();
    const start = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    input.current.yaw = start.y;
    input.current.pitch = -start.x;
    motion.current.previousYaw = start.y;
    return () => {
      setFieldOfView(camera, BASE_FOV);
      resetWalkIntent();
    };
  }, [getThree]);

  useFrame((three, delta) => {
    const step = Math.min(delta, 0.1);
    const controls = input.current;
    const keys = controls.keys;
    const held = (codes: string[]) => codes.some((code) => keys.has(code));
    const axis = (positive: string[], negative: string[]) => (held(positive) ? 1 : 0) - (held(negative) ? 1 : 0);
    const { heading, side, desired, look } = scratch.current;
    const state = motion.current;
    const pitch = -controls.pitch;
    heading.set(-Math.sin(controls.yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(controls.yaw) * Math.cos(pitch));
    side.set(Math.cos(controls.yaw), 0, -Math.sin(controls.yaw));

    const forward = MathUtils.clamp(axis(FORWARD_KEYS, BACKWARD_KEYS) + walkIntent.moveZ, -1, 1);
    const strafe = MathUtils.clamp(axis(RIGHT_KEYS, LEFT_KEYS) + walkIntent.moveX, -1, 1);
    const lift = MathUtils.clamp(axis(RISE_KEYS, SINK_KEYS) + (walkIntent.jumpHeld ? 1 : 0), -1, 1);
    const speed = CRUISE_SPEED * controls.speedScale * (held(BOOST_KEYS) ? BOOST_FACTOR : 1);
    desired.copy(heading).multiplyScalar(forward).addScaledVector(side, strafe);
    desired.y += lift * VERTICAL_SHARE;
    if (desired.lengthSq() > 1) desired.normalize();
    desired.multiplyScalar(speed);
    const velocity = state.velocity;
    const rate = desired.lengthSq() >= velocity.lengthSq() ? ACCELERATION : BRAKING;
    velocity.lerp(desired, 1 - Math.exp(-step * rate));

    const turn = (controls.yaw - state.previousYaw) / Math.max(step, 1e-3);
    state.previousYaw = controls.yaw;
    const bank = MathUtils.clamp(turn * BANK_PER_TURN - strafe * 0.12, -BANK_LIMIT, BANK_LIMIT);
    state.roll += (bank - state.roll) * (1 - Math.exp(-step * BANK_RESPONSE));

    const camera = three.camera;
    const position = camera.position.addScaledVector(velocity, step);
    position.x = MathUtils.clamp(position.x, -HORIZONTAL_LIMIT, HORIZONTAL_LIMIT);
    position.z = MathUtils.clamp(position.z, -HORIZONTAL_LIMIT, HORIZONTAL_LIMIT);
    const amplitude = worldUniforms.uAmplitude.value;
    const groundAt = (x: number, z: number) => sampleField(field, x, z, sample.current).elevation * amplitude;
    const ground = Math.max(
      groundAt(position.x, position.z),
      groundAt(position.x + velocity.x * LOOKAHEAD_SECONDS, position.z + velocity.z * LOOKAHEAD_SECONDS),
    );
    const floor = Math.max(ground, worldUniforms.uWaterLevel.value * amplitude) + GROUND_CLEARANCE;
    const raised = MathUtils.lerp(position.y, Math.max(position.y, floor), 1 - Math.exp(-step * 10));
    position.y = MathUtils.clamp(raised, floor - 3, ALTITUDE_LIMIT);
    camera.quaternion.setFromEuler(look.set(pitch, controls.yaw, state.roll));
    setFieldOfView(camera, BASE_FOV + SPEED_FOV * Math.min(1, velocity.length() / FOV_SPEED));
  }, -2);

  return null;
}
