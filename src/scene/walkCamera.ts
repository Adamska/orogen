import { MathUtils, PerspectiveCamera, Vector3, type Camera } from 'three';
import { gatherCanopies, insideCanopy, resolveObstacles } from './walkObstacles';

export interface FollowRig {
  readonly introFrom: Vector3;
  readonly introLook: Vector3;
  readonly pivot: Vector3;
  introProgress: number;
  introArc: number;
  reach: number;
  lift: number;
}

export interface FollowAim {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
}

type GroundSampler = (x: number, z: number) => number;

const PIVOT_HEIGHT = 1.55;
const LOOK_LIFT = 0.35;
const CLEARANCE = 0.5;
const MIN_REACH = 1.1;
const OCCLUSION_STEPS = 14;
const PLANAR_RESPONSE = 30;
const VERTICAL_RESPONSE = 9;
const REACH_IN_RESPONSE = 28;
const REACH_OUT_RESPONSE = 3.5;
const LIFT_RESPONSE = 3;
const INTRO_SECONDS = 2.2;
const INTRO_ARC_LIMIT = 140;
const LIFT_ATTEMPTS = 5;
const LIFT_STEP = 0.14;
const MAX_PITCH = 1.3;
const OBSTACLE_MARGIN = 0.4;
const CANOPY_MARGIN = 12;

const direction = new Vector3();
const desired = new Vector3();
const look = new Vector3();
const probe = new Vector3();

const approach = (rate: number, delta: number) => 1 - Math.exp(-delta * rate);

function aimDirection(yaw: number, pitch: number): void {
  direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
}

function clearance(pivot: Vector3, distance: number, groundAt: GroundSampler): number {
  for (let step = 1; step <= OCCLUSION_STEPS; step += 1) {
    const span = (distance * step) / OCCLUSION_STEPS;
    probe.copy(pivot).addScaledVector(direction, span);
    if (probe.y < groundAt(probe.x, probe.z) + CLEARANCE || insideCanopy(probe.x, probe.y, probe.z)) {
      return Math.max(MIN_REACH, span - distance / OCCLUSION_STEPS);
    }
  }
  return distance;
}

export function createFollowRig(camera: Camera, focus: Vector3, distance: number): FollowRig {
  const introLook = new Vector3();
  camera.getWorldDirection(introLook).multiplyScalar(camera.position.distanceTo(focus)).add(camera.position);
  return {
    introFrom: camera.position.clone(),
    introLook,
    pivot: focus.clone().setY(focus.y + PIVOT_HEIGHT),
    introProgress: 0,
    introArc: Math.min(INTRO_ARC_LIMIT, camera.position.distanceTo(focus) * 0.18),
    reach: distance,
    lift: 0,
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
  const { pivot } = rig;
  const planar = approach(PLANAR_RESPONSE, delta);
  pivot.x += (character.x - pivot.x) * planar;
  pivot.z += (character.z - pivot.z) * planar;
  pivot.y += (character.y + PIVOT_HEIGHT - pivot.y) * approach(VERTICAL_RESPONSE, delta);
  gatherCanopies(pivot, aim.distance + CANOPY_MARGIN, groundAt);

  let clear = 0;
  let neededLift = 0;
  for (let attempt = 0; attempt <= LIFT_ATTEMPTS && clear < aim.distance; attempt += 1) {
    aimDirection(aim.yaw, Math.min(MAX_PITCH, aim.pitch + attempt * LIFT_STEP));
    const reach = clearance(pivot, aim.distance, groundAt);
    if (reach > clear) {
      clear = reach;
      neededLift = attempt * LIFT_STEP;
    }
  }
  rig.lift += (neededLift - rig.lift) * approach(LIFT_RESPONSE, delta);
  aimDirection(aim.yaw, Math.min(MAX_PITCH, aim.pitch + rig.lift));
  const target = clearance(pivot, aim.distance, groundAt);
  rig.reach += (target - rig.reach) * approach(target < rig.reach ? REACH_IN_RESPONSE : REACH_OUT_RESPONSE, delta);

  desired.copy(pivot).addScaledVector(direction, rig.reach);
  resolveObstacles(desired, OBSTACLE_MARGIN);
  desired.y = Math.max(desired.y, groundAt(desired.x, desired.z) + CLEARANCE);
  look.copy(pivot).y += LOOK_LIFT;

  if (rig.introProgress < 1) {
    rig.introProgress = Math.min(1, rig.introProgress + delta / INTRO_SECONDS);
    const eased = MathUtils.smootherstep(rig.introProgress, 0, 1);
    camera.position.lerpVectors(rig.introFrom, desired, eased);
    camera.position.y += Math.sin(Math.PI * eased) * rig.introArc;
    look.lerpVectors(rig.introLook, look, eased);
  } else {
    camera.position.copy(desired);
  }
  camera.lookAt(look);
}

export function swapNearPlane(camera: Camera, near: number): number | null {
  if (!(camera instanceof PerspectiveCamera)) return null;
  const previous = camera.near;
  camera.near = near;
  camera.updateProjectionMatrix();
  return previous;
}
