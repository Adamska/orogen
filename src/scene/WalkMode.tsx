'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { useWorldStore } from '@/store/useWorldStore';
import { stepFlight, switchMount, takeOff, type Mount } from './characterFlight';
import { createFlightGear, showFlightGear, type FlightGear } from './flightGear';
import { ORBIT_TARGET } from './orbitRig';
import type { TerrainSurface } from './useTerrainSurface';
import { useLookInput } from './useLookInput';
import { createFollowRig, followCamera, setFieldOfView, swapNearPlane, type FollowRig } from './walkCamera';
import { createWalkInput, readWalkCommand, WALK_BINDINGS } from './walkInput';
import { createWalker, stepWalker, type WalkCommand, type WalkTerrain, type Walker } from './walkerMotion';
import { findFooting, groundHeight, groundSlope, walkableLimit, type GroundState } from './walkGround';
import { resetWalkIntent } from './walkIntent';
import { animateWanderer, createAnimator, type WandererAnimator } from './wandererAnimator';
import { createWanderer, loadWanderer, type WandererModel } from './wandererModel';
import { placeWanderer } from './wandererPlacement';
import { worldUniforms } from './worldUniforms';

const WALK_NEAR_PLANE = 0.25;
const WATER_LENS_MARGIN = 0.3;
const LANTERN_BASE = 0.4;
const LANTERN_NIGHT = 7;
const BASE_FOV = 40;
const FLIGHT_FOV = 20;
const FOV_SPEED = 60;
const VIEW_DISTANCE: Record<Mount, number> = { paraglider: 15, jetpack: 10, wingsuit: 12, broom: 10 };

interface Figure {
  readonly model: WandererModel;
  readonly animator: WandererAnimator;
  readonly gear: FlightGear;
}

interface WalkSession {
  readonly walker: Walker;
  readonly follow: FollowRig;
  readonly terrain: WalkTerrain;
  readonly lensFloor: (x: number, z: number) => number;
  readonly command: WalkCommand;
  readonly slope: { x: number; z: number };
  readonly aim: { yaw: number; pitch: number; distance: number };
  fov: number;
  figure: Figure | null;
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
      slope: { x: 0, z: 0 },
      aim: { yaw: 0, pitch: 0, distance: 0 },
      fov: BASE_FOV,
      figure: null,
    };
    session.current = active;

    let cancelled = false;
    loadWanderer()
      .then((gltf) => {
        if (cancelled) return;
        const model = createWanderer(gltf);
        model.root.updateMatrixWorld(true);
        active.figure = { model, animator: createAnimator(model), gear: createFlightGear(model) };
        scene.add(model.root, model.shadow);
      })
      .catch(() => undefined);

    const previousNear = swapNearPlane(camera, WALK_NEAR_PLANE);
    return () => {
      cancelled = true;
      if (previousNear !== null) swapNearPlane(camera, previousNear);
      setFieldOfView(camera, BASE_FOV);
      const figure = active.figure;
      if (figure !== null) {
        figure.animator.mixer.stopAllAction();
        figure.animator.mixer.uncacheRoot(figure.model.figure);
        scene.remove(figure.model.root, figure.model.shadow);
        figure.gear.dispose();
        figure.model.dispose();
      }
      resetWalkIntent();
      session.current = null;
    };
  }, [getThree]);

  useFrame((three, delta) => {
    const active = session.current;
    if (active === null) return;
    const { walker, terrain, command, slope, aim } = active;
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
    const figure = active.figure;
    if (figure !== null) {
      const floor = terrain.groundAt(position.x, position.z);
      terrain.slopeAt(position.x, position.z, slope);
      animateWanderer(figure.animator, walker, step);
      showFlightGear(figure.gear, flight?.mount ?? null, flight?.thrust ?? 0, three.clock.elapsedTime);
      placeWanderer(figure.model, {
        position,
        facing: walker.facing,
        floor,
        slopeX: slope.x,
        slopeZ: slope.z,
        dry: floor > terrain.waterHeight - 0.05,
        glow: LANTERN_BASE + worldUniforms.uNight.value * LANTERN_NIGHT,
        tilt: flight?.tilt ?? 0,
        bank: flight?.bank ?? 0,
      });
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
