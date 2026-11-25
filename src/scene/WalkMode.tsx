'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { useWorldStore } from '@/store/useWorldStore';
import { ORBIT_TARGET } from './orbitRig';
import type { TerrainSurface } from './useTerrainSurface';
import { createWalkInput, useWalkInput } from './useWalkInput';
import { createFollowRig, followCamera, swapNearPlane, type FollowRig } from './walkCamera';
import { createWalker, stepWalker, type WalkCommand, type WalkTerrain, type Walker } from './walkerMotion';
import { findFooting, groundHeight, groundSlope, walkableLimit, type GroundState } from './walkGround';
import { resetWalkIntent, walkIntent } from './walkIntent';
import { animateWanderer, createAnimator, placeWanderer, type WandererAnimator } from './wandererAnimator';
import { createWanderer, loadWanderer, type WandererModel } from './wandererModel';
import { worldUniforms } from './worldUniforms';

const WALK_NEAR_PLANE = 0.25;
const SPRINT_DEFLECTION = 0.9;
const WATER_LENS_MARGIN = 0.3;
const LANTERN_BASE = 0.4;
const LANTERN_NIGHT = 7;
const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACKWARD_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const SPRINT_KEYS = ['ShiftLeft', 'ShiftRight'];

interface WalkSession {
  readonly walker: Walker;
  readonly follow: FollowRig;
  readonly terrain: WalkTerrain;
  readonly lensFloor: (x: number, z: number) => number;
  readonly command: WalkCommand;
  readonly slope: { x: number; z: number };
  figure: { readonly model: WandererModel; readonly animator: WandererAnimator } | null;
}

export function WalkMode({ surface }: { surface: TerrainSurface }) {
  const canvas = useThree((state) => state.gl.domElement);
  const getThree = useThree((state) => state.get);
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

  useLayoutEffect(() => {
    const state = ground.current;
    if (state.to !== surface.field) {
      state.from = state.to;
      state.to = surface.field;
    }
    state.meshResolution = surface.mesh.resolution;
  }, [surface]);

  useEffect(() => {
    const { camera, scene } = getThree();
    const state = ground.current;
    state.amplitude = worldUniforms.uAmplitude.value;
    const limit = walkableLimit(state.to, state.meshResolution);
    const waterHeight = worldUniforms.uWaterLevel.value * state.amplitude;
    const spawn =
      useWorldStore.getState().walkSpawn ??
      findFooting(state.to, state.amplitude, waterHeight, limit, { x: ORBIT_TARGET[0], z: ORBIT_TARGET[2] });
    const x = MathUtils.clamp(spawn.x, -limit, limit);
    const z = MathUtils.clamp(spawn.z, -limit, limit);
    const start = new Vector3(x, groundHeight(state, x, z), z);
    const facing = Math.atan2(x - camera.position.x, z - camera.position.z);
    input.current.yaw = facing + Math.PI;
    const terrain: WalkTerrain = {
      groundAt: (px, pz) => groundHeight(ground.current, px, pz),
      slopeAt: (px, pz, target) => groundSlope(ground.current, px, pz, target),
      waterHeight,
      limit,
    };
    const active: WalkSession = {
      walker: createWalker(start, facing),
      follow: createFollowRig(camera, start, input.current.distance),
      terrain,
      lensFloor: (px, pz) => Math.max(terrain.groundAt(px, pz), terrain.waterHeight + WATER_LENS_MARGIN),
      command: { forward: 0, right: 0, yaw: 0, sprint: false, jump: false, jumpHeld: false },
      slope: { x: 0, z: 0 },
      figure: null,
    };
    session.current = active;

    let cancelled = false;
    loadWanderer()
      .then((gltf) => {
        if (cancelled) return;
        const model = createWanderer(gltf);
        scene.add(model.root, model.shadow);
        active.figure = { model, animator: createAnimator(model) };
      })
      .catch(() => undefined);

    const previousNear = swapNearPlane(camera, WALK_NEAR_PLANE);
    return () => {
      cancelled = true;
      if (previousNear !== null) swapNearPlane(camera, previousNear);
      const figure = active.figure;
      if (figure !== null) {
        figure.animator.mixer.stopAllAction();
        figure.animator.mixer.uncacheRoot(figure.model.figure);
        scene.remove(figure.model.root, figure.model.shadow);
        figure.model.dispose();
      }
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
    const held = (codes: readonly string[]) => codes.some((code) => keys.has(code));
    const axis = (positive: readonly string[], negative: readonly string[]) =>
      (held(positive) ? 1 : 0) - (held(negative) ? 1 : 0);
    command.forward = MathUtils.clamp(axis(FORWARD_KEYS, BACKWARD_KEYS) + walkIntent.moveZ, -1, 1);
    command.right = MathUtils.clamp(axis(RIGHT_KEYS, LEFT_KEYS) + walkIntent.moveX, -1, 1);
    command.yaw = controls.yaw;
    command.sprint = held(SPRINT_KEYS) || Math.hypot(walkIntent.moveX, walkIntent.moveZ) > SPRINT_DEFLECTION;
    command.jump = controls.jump || walkIntent.jump;
    command.jumpHeld = keys.has('Space') || walkIntent.jumpHeld;
    controls.jump = false;
    walkIntent.jump = false;

    stepWalker(walker, command, terrain, step);
    const { position } = walker;
    if (active.figure !== null) {
      const floor = terrain.groundAt(position.x, position.z);
      terrain.slopeAt(position.x, position.z, slope);
      animateWanderer(active.figure.animator, walker, step);
      placeWanderer(active.figure.model, {
        position,
        facing: walker.facing,
        floor,
        slopeX: slope.x,
        slopeZ: slope.z,
        dry: floor > terrain.waterHeight - 0.05,
        glow: LANTERN_BASE + worldUniforms.uNight.value * LANTERN_NIGHT,
      });
    }
    followCamera(three.camera, active.follow, position, controls, active.lensFloor, step);
  }, -2);

  return null;
}
