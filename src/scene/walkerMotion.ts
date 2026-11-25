import { MathUtils, Vector3 } from 'three';
import { resolveObstacles } from './walkObstacles';
import type { Gait } from './wandererPose';

export interface Walker {
  readonly position: Vector3;
  readonly velocity: Vector3;
  vertical: number;
  grounded: boolean;
  facing: number;
  readonly gait: Gait;
}

export interface WalkCommand {
  forward: number;
  right: number;
  yaw: number;
  run: boolean;
  jump: boolean;
}

export interface WalkTerrain {
  readonly groundAt: (x: number, z: number) => number;
  readonly slopeAt: (x: number, z: number, target: { x: number; z: number }) => void;
  waterHeight: number;
  limit: number;
}

const WALK_SPEED = 3.4;
const RUN_SPEED = 8.4;
const SWIM_SPEED = 2.3;
const WADE_DRAG = 0.45;
const JUMP_VELOCITY = 5.8;
const GRAVITY = 19;
const STEP_DOWN = 0.75;
const SWIM_DEPTH = 1.2;
const SWIM_FLOAT = 0.45;
export const BODY_RADIUS = 0.32;
const GROUND_RESPONSE = 10;
const AIR_RESPONSE = 2.5;
const TURN_RESPONSE = 12;
const WALK_STRIDE = 1.15;
const RUN_STRIDE = 1.75;
const UPHILL_EASE = 0.45;
const UPHILL_DRAG = 0.75;
const MAX_CLIMB = 1.2;

const slope = { x: 0, z: 0 };

export function createWalker(position: Vector3, facing: number): Walker {
  return {
    position,
    velocity: new Vector3(),
    vertical: 0,
    grounded: true,
    facing,
    gait: { phase: 0, stride: 0, run: 0, airborne: 0, swim: 0, time: 0 },
  };
}

const approach = (value: number, target: number, rate: number, delta: number) =>
  value + (target - value) * (1 - Math.exp(-delta * rate));

export function stepWalker(walker: Walker, command: WalkCommand, terrain: WalkTerrain, delta: number): void {
  const { position, velocity, gait } = walker;
  const sin = Math.sin(command.yaw);
  const cos = Math.cos(command.yaw);
  let moveX = -sin * command.forward + cos * command.right;
  let moveZ = -cos * command.forward - sin * command.right;
  const magnitude = Math.min(1, Math.hypot(moveX, moveZ));
  if (magnitude > 1e-3) {
    const scale = magnitude / Math.hypot(moveX, moveZ);
    moveX *= scale;
    moveZ *= scale;
  }

  const depth = terrain.waterHeight - terrain.groundAt(position.x, position.z);
  const swimming = depth > SWIM_DEPTH;
  gait.swim = approach(gait.swim, swimming ? 1 : 0, 5, delta);
  gait.run = approach(gait.run, command.run && !swimming && magnitude > 0 ? 1 : 0, 6, delta);

  let speed = swimming ? SWIM_SPEED : MathUtils.lerp(WALK_SPEED, RUN_SPEED, gait.run);
  if (!swimming && magnitude > 1e-3) {
    terrain.slopeAt(position.x, position.z, slope);
    const steepness = Math.hypot(slope.x, slope.z);
    const climb = steepness > MAX_CLIMB ? (slope.x * moveX + slope.z * moveZ) / steepness : 0;
    if (climb > 0) {
      moveX -= (slope.x / steepness) * climb;
      moveZ -= (slope.z / steepness) * climb;
    }
    const uphill = (slope.x * moveX + slope.z * moveZ) / magnitude;
    speed *= MathUtils.clamp(1 - Math.max(0, uphill - UPHILL_EASE) * UPHILL_DRAG, 0.12, 1);
    speed *= 1 - MathUtils.clamp(depth / SWIM_DEPTH, 0, 1) * WADE_DRAG;
  }
  const response = walker.grounded || swimming ? GROUND_RESPONSE : AIR_RESPONSE;
  velocity.x = approach(velocity.x, moveX * speed, response, delta);
  velocity.z = approach(velocity.z, moveZ * speed, response, delta);
  position.x += velocity.x * delta;
  position.z += velocity.z * delta;
  resolveObstacles(position, BODY_RADIUS);
  position.x = MathUtils.clamp(position.x, -terrain.limit, terrain.limit);
  position.z = MathUtils.clamp(position.z, -terrain.limit, terrain.limit);

  const floor = terrain.groundAt(position.x, position.z);
  const afloat = terrain.waterHeight - floor > SWIM_DEPTH;
  if (afloat) {
    walker.grounded = false;
    walker.vertical = 0;
    const surface = terrain.waterHeight - SWIM_FLOAT + Math.sin(gait.time * 2.1) * 0.04;
    position.y = approach(position.y, Math.max(surface, floor), 6, delta);
  } else {
    if (walker.grounded) {
      if (command.jump) {
        walker.vertical = JUMP_VELOCITY;
        walker.grounded = false;
      } else if (floor < position.y - STEP_DOWN) {
        walker.vertical = 0;
        walker.grounded = false;
      } else {
        position.y = floor;
      }
    }
    if (!walker.grounded) {
      walker.vertical -= GRAVITY * delta;
      position.y += walker.vertical * delta;
      if (position.y <= floor) {
        position.y = floor;
        walker.vertical = 0;
        walker.grounded = true;
      }
    }
  }

  const travel = Math.hypot(velocity.x, velocity.z);
  if (travel > 0.25) {
    const heading = Math.atan2(velocity.x, velocity.z);
    const turn = MathUtils.euclideanModulo(heading - walker.facing + Math.PI, Math.PI * 2) - Math.PI;
    walker.facing += turn * (1 - Math.exp(-delta * TURN_RESPONSE));
  }
  if (walker.grounded || afloat) gait.stride = approach(gait.stride, Math.min(1, travel / WALK_SPEED), 8, delta);
  gait.phase += (travel * delta * Math.PI) / MathUtils.lerp(WALK_STRIDE, RUN_STRIDE, gait.run);
  gait.airborne = approach(gait.airborne, walker.grounded || afloat ? 0 : 1, 10, delta);
  gait.time += delta;
}
