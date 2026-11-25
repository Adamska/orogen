'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { useWorldStore } from '@/store/useWorldStore';
import { stepFlight, switchMount, takeOff, type Mount } from './characterFlight';
import { publishFlightStatus } from './flightStatus';
import { ORBIT_TARGET } from './orbitRig';
import type { TerrainSurface } from './useTerrainSurface';
import { useLookInput } from './useLookInput';
import { createFollowRig, followCamera, setFieldOfView, swapNearPlane, type FollowRig } from './walkCamera';
import { createWalkInput, readWalkCommand, WALK_BINDINGS } from './walkInput';
import { createWalker, stepWalker, type WalkCommand, type WalkTerrain, type Walker } from './walkerMotion';
import { findFooting, groundHeight, groundSlope, walkableLimit, type GroundState } from './walkGround';
import { resetWalkIntent } from './walkIntent';
import { createFigure, disposeFigure, updateFigure, type WandererFigure } from './wandererFigure';
import { loadWanderer } from './wandererModel';
import { worldUniforms } from './worldUniforms';

const WALK_NEAR_PLANE = 0.25;
const WATER_LENS_MARGIN = 0.3;
const BASE_FOV = 40;
const FLIGHT_FOV = 20;
const FOV_SPEED = 110;
const VIEW_DISTANCE: Record<Mount, number> = { paraglider: 15, jetpack: 11, wingsuit: 12, broom: 11 };

interface WalkSession {
  readonly walker: Walker;
  readonly follow: FollowRig;
  readonly terrain: WalkTerrain;
  readonly lensFloor: (x: number, z: number) => number;
  readonly command: WalkCommand;
  readonly aim: { yaw: number; pitch: number; distance: number };
  fov: number;
  figure: WandererFigure | null;
}

export function WalkMode({ surface }: { surface: TerrainSurface }) {
  const canvas = useThree((state) => state.gl.domElement);
  const getThree = useThree((state) => state.get);
  const input = useRef(createWalkInput());
  const mount = useRef<Mount>(useWorldStore.getState().walkMount);
  const session = useRef<WalkSession | null>(null);
  const ground = useRef<GroundState>({
    from: surface.field,
    to: surface.field,
    morph: 1,
    meshResolution: surface.mesh.resolution,
    amplitude: 1,
  });
  useLookInput(canvas, input, WALK_BINDINGS);

  useEffect(() => useWorldStore.subscribe((state) => (mount.current = state.walkMount)), []);

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
      command: { forward: 0, right: 0, yaw: 0, sprint: false, jump: false, jumpHeld: false, rise: 0, aimPitch: 0 },
      aim: { yaw: 0, pitch: 0, distance: 0 },
      fov: BASE_FOV,
      figure: null,
    };
    session.current = active;

    let cancelled = false;
    loadWanderer()
      .then((gltf) => {
        if (!cancelled) active.figure = createFigure(gltf, scene);
      })
      .catch(() => undefined);

    const previousNear = swapNearPlane(camera, WALK_NEAR_PLANE);
    return () => {
      cancelled = true;
      if (previousNear !== null) swapNearPlane(camera, previousNear);
      setFieldOfView(camera, BASE_FOV);
      if (active.figure !== null) disposeFigure(active.figure, scene);
      publishFlightStatus(null);
      resetWalkIntent();
      session.current = null;
    };
  }, [getThree]);

  useFrame((three, delta) => {
    const active = session.current;
    if (active === null) return;
    const { walker, terrain, command, aim } = active;
    const step = Math.min(delta, 0.05);
    const field = ground.current;
    field.morph = worldUniforms.uMorph.value;
    field.amplitude = worldUniforms.uAmplitude.value;
    terrain.waterHeight = worldUniforms.uWaterLevel.value * field.amplitude;
    terrain.limit = walkableLimit(field.to, field.meshResolution);

    const controls = input.current;
    const toggle = readWalkCommand(controls, command);
    if (toggle && walker.flight !== null) {
      walker.flight = null;
      walker.grounded = false;
    } else if (toggle) {
      takeOff(walker, mount.current);
    } else {
      switchMount(walker, mount.current);
    }
    if (walker.flight !== null) stepFlight(walker, command, terrain, step);
    else stepWalker(walker, command, terrain, step);

    const { position, flight } = walker;
    publishFlightStatus(flight?.mount ?? null);
    if (active.figure !== null) {
      updateFigure(active.figure, walker, terrain, worldUniforms.uNight.value, three.clock.elapsedTime, step);
    }

    aim.yaw = controls.yaw;
    aim.pitch = controls.pitch;
    aim.distance = flight === null ? controls.distance : Math.max(controls.distance, VIEW_DISTANCE[flight.mount]);
    const pace = flight === null ? 0 : Math.min(1, Math.hypot(walker.speed, walker.vertical) / FOV_SPEED);
    active.fov += (BASE_FOV + FLIGHT_FOV * pace - active.fov) * (1 - Math.exp(-step * 3));
    setFieldOfView(three.camera, active.fov);
    followCamera(three.camera, active.follow, position, aim, active.lensFloor, step);
  }, -2);

  return null;
}
