'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { intersectHeightfield } from '@/engine/sculpt';
import { ORBIT_TARGET } from './orbitRig';
import type { TerrainSurface } from './useTerrainSurface';
import { createWalkInput, useWalkInput } from './useWalkInput';
import { createFollowRig, followCamera, swapNearPlane, type FollowRig } from './walkCamera';
import { createWalker, stepWalker, type WalkCommand, type WalkTerrain, type Walker } from './walkerMotion';
import { findFooting, groundHeight, groundSlope, walkableLimit, type GroundState } from './walkGround';
import { resetWalkIntent, walkIntent } from './walkIntent';
import { placeWanderer, poseWanderer } from './wandererPose';
import { createWandererRig } from './wandererRig';
import { worldUniforms } from './worldUniforms';

const WALK_NEAR_PLANE = 0.3;
const AIM_DISTANCE = 4000;
const RUN_DEFLECTION = 0.85;
const SCENIC_OFFSET = 12;
const WATER_LENS_MARGIN = 0.25;
const LANTERN_BASE = 0.4;
const LANTERN_NIGHT = 7;
const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACKWARD_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];

interface WalkSession {
  readonly walker: Walker;
  readonly follow: FollowRig;
  readonly terrain: WalkTerrain;
  readonly lensFloor: (x: number, z: number) => number;
  readonly command: WalkCommand;
  readonly slope: { x: number; z: number };
}

export function WalkMode({ surface }: { surface: TerrainSurface }) {
  const canvas = useThree((state) => state.gl.domElement);
  const getThree = useThree((state) => state.get);
  const rig = useMemo(() => createWandererRig(), []);
  const input = useRef(createWalkInput());
  const session = useRef<WalkSession | null>(null);
  const ground = useRef<GroundState>({
    from: surface.field,
    to: surface.field,
    morph: 1,
    meshResolution: surface.mesh.resolution,
    amplitude: 1,
  });
  useWalkInput(canvas, input);

  useEffect(() => () => rig.dispose(), [rig]);

  useLayoutEffect(() => {
    const state = ground.current;
    if (state.to !== surface.field) {
      state.from = state.to;
      state.to = surface.field;
    }
    state.meshResolution = surface.mesh.resolution;
  }, [surface]);

  useEffect(() => {
    const camera = getThree().camera;
    const state = ground.current;
    const amplitude = worldUniforms.uAmplitude.value;
    const limit = walkableLimit(state.to, state.meshResolution);
    state.amplitude = amplitude;
    const aim = camera.getWorldDirection(new Vector3());
    const hit = intersectHeightfield(state.to, amplitude, camera.position, aim, AIM_DISTANCE);
    const target = {
      x: MathUtils.clamp(hit?.x ?? ORBIT_TARGET[0], -limit, limit),
      z: MathUtils.clamp(hit?.z ?? ORBIT_TARGET[2], -limit, limit),
    };
    const footing = findFooting(state.to, amplitude, worldUniforms.uWaterLevel.value * amplitude, limit, target);
    const start = new Vector3(footing.x, groundHeight(state, footing.x, footing.z), footing.z);
    const offsetX = target.x - footing.x;
    const offsetZ = target.z - footing.z;
    const facing =
      Math.hypot(offsetX, offsetZ) > SCENIC_OFFSET ? Math.atan2(offsetX, offsetZ) : Math.atan2(aim.x, aim.z);
    input.current.yaw = facing + Math.PI;
    const terrain: WalkTerrain = {
      groundAt: (x, z) => groundHeight(ground.current, x, z),
      slopeAt: (x, z, target) => groundSlope(ground.current, x, z, target),
      waterHeight: 0,
      limit,
    };
    session.current = {
      walker: createWalker(start, facing),
      follow: createFollowRig(camera, start),
      terrain,
      lensFloor: (x, z) => Math.max(terrain.groundAt(x, z), terrain.waterHeight + WATER_LENS_MARGIN),
      command: { forward: 0, right: 0, yaw: 0, run: false, jump: false },
      slope: { x: 0, z: 0 },
    };

    const previousNear = swapNearPlane(camera, WALK_NEAR_PLANE);
    return () => {
      if (previousNear !== null) swapNearPlane(camera, previousNear);
      resetWalkIntent();
      session.current = null;
    };
  }, [getThree]);

  useFrame((three, delta) => {
    const active = session.current;
    if (active === null) return;
    const { walker, terrain, command, slope } = active;
    const step = Math.min(delta, 0.05);
    const field = ground.current;
    field.morph = worldUniforms.uMorph.value;
    field.amplitude = worldUniforms.uAmplitude.value;
    terrain.waterHeight = worldUniforms.uWaterLevel.value * field.amplitude;
    terrain.limit = walkableLimit(field.to, field.meshResolution);

    const controls = input.current;
    const keys = controls.keys;
    const axis = (positive: string[], negative: string[]) =>
      (positive.some((code) => keys.has(code)) ? 1 : 0) - (negative.some((code) => keys.has(code)) ? 1 : 0);
    command.forward = MathUtils.clamp(axis(FORWARD_KEYS, BACKWARD_KEYS) + walkIntent.moveZ, -1, 1);
    command.right = MathUtils.clamp(axis(RIGHT_KEYS, LEFT_KEYS) + walkIntent.moveX, -1, 1);
    command.yaw = controls.yaw;
    command.run =
      keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(walkIntent.moveX, walkIntent.moveZ) > RUN_DEFLECTION;
    command.jump = controls.jump || walkIntent.jump;
    controls.jump = false;
    walkIntent.jump = false;

    stepWalker(walker, command, terrain, step);
    poseWanderer(rig, walker.gait, step);
    const { position } = walker;
    const floor = terrain.groundAt(position.x, position.z);
    terrain.slopeAt(position.x, position.z, slope);
    placeWanderer(rig, {
      position,
      facing: walker.facing,
      floor,
      slopeX: slope.x,
      slopeZ: slope.z,
      dry: floor > terrain.waterHeight - 0.05,
      glow: LANTERN_BASE + worldUniforms.uNight.value * LANTERN_NIGHT,
    });
    followCamera(three.camera, active.follow, position, controls, active.lensFloor, step);
  }, -2);

  return (
    <>
      <primitive object={rig.root} />
      <primitive object={rig.shadow} />
    </>
  );
}
