import { MathUtils, PerspectiveCamera, Vector3, type Camera } from 'three';
import { resolveObstacles } from './walkObstacles';

export interface FollowRig {
  readonly introFrom: Vector3;
  readonly introLook: Vector3;
  introProgress: number;
  introArc: number;
}

export interface FollowAim {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
}

type GroundSampler = (x: number, z: number) => number;

export const PIVOT_HEIGHT = 1.45;
const LOOK_LIFT = 0.55;
const CLEARANCE = 0.55;
const MIN_REACH = 1.2;
const OCCLUSION_STEPS = 12;
const FOLLOW_RESPONSE = 9;
const INTRO_SECONDS = 2.6;
const INTRO_ARC_LIMIT = 140;
const PITCH_ATTEMPTS = 5;
const PITCH_STEP = 0.14;
const MAX_PITCH = 1.2;
const OBSTACLE_MARGIN = 0.45;

const pivot = new Vector3();
const direction = new Vector3();
const desired = new Vector3();
const look = new Vector3();
const probe = new Vector3();

function aimDirection(yaw: number, pitch: number): void {
  direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
}

function clearance(distance: number, groundAt: GroundSampler): number {
  for (let step = 1; step <= OCCLUSION_STEPS; step += 1) {
    const span = (distance * step) / OCCLUSION_STEPS;
    probe.copy(pivot).addScaledVector(direction, span);
    if (probe.y < groundAt(probe.x, probe.z) + CLEARANCE) {
      return Math.max(MIN_REACH, span - distance / OCCLUSION_STEPS);
    }
  }
  return distance;
}

export function createFollowRig(camera: Camera, focus: Vector3): FollowRig {
  const introLook = new Vector3();
  camera.getWorldDirection(introLook).multiplyScalar(camera.position.distanceTo(focus)).add(camera.position);
  return {
    introFrom: camera.position.clone(),
    introLook,
    introProgress: 0,
    introArc: Math.min(INTRO_ARC_LIMIT, camera.position.distanceTo(focus) * 0.18),
  };
}

export function followCamera(
  camera: Camera,
  rig: FollowRig,
  character: Vector3,
  aim: FollowAim,
  groundAt: GroundSampler,
  delta: number,
): void {
  pivot.copy(character).y += PIVOT_HEIGHT;
  let reach = 0;
  let bestPitch = aim.pitch;
  for (let attempt = 0; attempt <= PITCH_ATTEMPTS && reach < aim.distance; attempt += 1) {
    const pitch = Math.min(MAX_PITCH, aim.pitch + attempt * PITCH_STEP);
    aimDirection(aim.yaw, pitch);
    const clear = clearance(aim.distance, groundAt);
    if (clear > reach) {
      reach = clear;
      bestPitch = pitch;
    }
  }
  aimDirection(aim.yaw, bestPitch);
  desired.copy(pivot).addScaledVector(direction, reach);
  resolveObstacles(desired, OBSTACLE_MARGIN);
  desired.y = Math.max(desired.y, groundAt(desired.x, desired.z) + CLEARANCE);

  if (rig.introProgress < 1) {
    rig.introProgress = Math.min(1, rig.introProgress + delta / INTRO_SECONDS);
    const eased = MathUtils.smootherstep(rig.introProgress, 0, 1);
    camera.position.lerpVectors(rig.introFrom, desired, eased);
    camera.position.y += Math.sin(Math.PI * eased) * rig.introArc;
    look.copy(pivot).y += LOOK_LIFT;
    look.lerpVectors(rig.introLook, look, eased);
  } else {
    camera.position.lerp(desired, 1 - Math.exp(-delta * FOLLOW_RESPONSE));
    look.copy(pivot).y += LOOK_LIFT;
  }
  camera.position.y = Math.max(camera.position.y, groundAt(camera.position.x, camera.position.z) + CLEARANCE * 0.6);
  camera.lookAt(look);
}

export function swapNearPlane(camera: Camera, near: number): number | null {
  if (!(camera instanceof PerspectiveCamera)) return null;
  const previous = camera.near;
  camera.near = near;
  camera.updateProjectionMatrix();
  return previous;
}
