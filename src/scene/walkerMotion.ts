import { MathUtils, Vector3 } from 'three';
import { resolveObstacles } from './walkObstacles';

export interface Walker {
  readonly position: Vector3;
  readonly velocity: Vector3;
  vertical: number;
  grounded: boolean;
  floating: boolean;
  facing: number;
  speed: number;
  swim: number;
  sinceGround: number;
  jumpBuffer: number;
  jumped: boolean;
  landing: number;
}

export interface WalkCommand {
  forward: number;
  right: number;
  yaw: number;
  sprint: boolean;
  jump: boolean;
  jumpHeld: boolean;
}

export interface WalkTerrain {
  readonly groundAt: (x: number, z: number) => number;
  readonly slopeAt: (x: number, z: number, target: { x: number; z: number }) => void;
  waterHeight: number;
  limit: number;
}

export const JOG_SPEED = 7.5;
export const SPRINT_SPEED = 15;
const SWIM_SPEED = 4.5;
const SWIM_SPRINT_SPEED = 7.5;
const WADE_DRAG = 0.3;
const JUMP_VELOCITY = 11.5;
const SWIM_JUMP_VELOCITY = 8;
const GRAVITY = 26;
const FALL_GRAVITY = 1.35;
const RELEASE_GRAVITY = 2.4;
const COYOTE_TIME = 0.14;
const JUMP_BUFFER = 0.15;
const STEP_DOWN = 0.9;
const SWIM_DEPTH = 1.25;
const SWIM_FLOAT = 1.05;
export const BODY_RADIUS = 0.3;
const GROUND_RESPONSE = 12;
const AIR_RESPONSE = 5;
const TURN_RESPONSE = 14;
const UPHILL_EASE = 0.7;
const UPHILL_DRAG = 0.4;
const MIN_UPHILL_SPEED = 0.35;
const MAX_CLIMB = 2.4;

const slope = { x: 0, z: 0 };

export function createWalker(position: Vector3, facing: number): Walker {
  return {
    position,
    velocity: new Vector3(),
    vertical: 0,
    grounded: true,
    floating: false,
    facing,
    speed: 0,
    swim: 0,
    sinceGround: 0,
    jumpBuffer: 0,
    jumped: false,
    landing: 0,
  };
}

const approach = (value: number, target: number, rate: number, delta: number) =>
  value + (target - value) * (1 - Math.exp(-delta * rate));

function steer(walker: Walker, command: WalkCommand, terrain: WalkTerrain, delta: number): void {
  const { position, velocity } = walker;
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
  let speed = walker.floating
    ? command.sprint ? SWIM_SPRINT_SPEED : SWIM_SPEED
    : command.sprint ? SPRINT_SPEED : JOG_SPEED;
  if (!walker.floating && walker.grounded && magnitude > 1e-3) {
    terrain.slopeAt(position.x, position.z, slope);
    const steepness = Math.hypot(slope.x, slope.z);
    const climb = steepness > MAX_CLIMB ? (slope.x * moveX + slope.z * moveZ) / steepness : 0;
    if (climb > 0) {
      moveX -= (slope.x / steepness) * climb;
      moveZ -= (slope.z / steepness) * climb;
    }
    const uphill = (slope.x * moveX + slope.z * moveZ) / magnitude;
    speed *= MathUtils.clamp(1 - Math.max(0, uphill - UPHILL_EASE) * UPHILL_DRAG, MIN_UPHILL_SPEED, 1);
    speed *= 1 - MathUtils.clamp(depth / SWIM_DEPTH, 0, 1) * WADE_DRAG;
  }
  const response = walker.grounded ? GROUND_RESPONSE : AIR_RESPONSE;
  velocity.x = approach(velocity.x, moveX * speed, response, delta);
  velocity.z = approach(velocity.z, moveZ * speed, response, delta);
  position.x += velocity.x * delta;
  position.z += velocity.z * delta;
  resolveObstacles(position, BODY_RADIUS);
  position.x = MathUtils.clamp(position.x, -terrain.limit, terrain.limit);
  position.z = MathUtils.clamp(position.z, -terrain.limit, terrain.limit);
}

function settle(walker: Walker, command: WalkCommand, terrain: WalkTerrain, delta: number): void {
  const { position } = walker;
  const floor = terrain.groundAt(position.x, position.z);
  const afloat = terrain.waterHeight - floor > SWIM_DEPTH;
  const surface = terrain.waterHeight - SWIM_FLOAT;

  walker.jumped = false;
  walker.landing = 0;
  walker.jumpBuffer = command.jump ? JUMP_BUFFER : Math.max(0, walker.jumpBuffer - delta);
  walker.sinceGround = walker.grounded ? 0 : walker.sinceGround + delta;
  if (walker.jumpBuffer > 0 && walker.sinceGround < COYOTE_TIME && walker.vertical <= 0) {
    walker.vertical = walker.floating ? SWIM_JUMP_VELOCITY : JUMP_VELOCITY;
    walker.grounded = false;
    walker.floating = false;
    walker.sinceGround = COYOTE_TIME;
    walker.jumpBuffer = 0;
    walker.jumped = true;
  }

  if (walker.grounded) {
    walker.floating = afloat;
    if (afloat) {
      position.y = approach(position.y, Math.max(surface, floor), 6, delta);
    } else if (floor < position.y - STEP_DOWN) {
      walker.grounded = false;
      walker.vertical = 0;
    } else {
      position.y = floor;
    }
  }
  if (!walker.grounded) {
    const rising = walker.vertical > 0;
    const scale = rising ? (command.jumpHeld ? 1 : RELEASE_GRAVITY) : FALL_GRAVITY;
    walker.vertical -= GRAVITY * scale * delta;
    position.y += walker.vertical * delta;
    const support = afloat ? Math.max(surface, floor) : floor;
    if (position.y <= support && walker.vertical <= 0) {
      walker.landing = afloat ? 0 : -walker.vertical;
      position.y = afloat ? position.y : floor;
      walker.vertical = 0;
      walker.grounded = true;
      walker.floating = afloat;
    }
    position.y = Math.max(position.y, floor);
  }
}

export function stepWalker(walker: Walker, command: WalkCommand, terrain: WalkTerrain, delta: number): void {
  steer(walker, command, terrain, delta);
  settle(walker, command, terrain, delta);
  const { velocity } = walker;
  walker.speed = Math.hypot(velocity.x, velocity.z);
  walker.swim = approach(walker.swim, walker.floating ? 1 : 0, 6, delta);
  if (walker.speed > 0.3) {
    const heading = Math.atan2(velocity.x, velocity.z);
    const turn = MathUtils.euclideanModulo(heading - walker.facing + Math.PI, Math.PI * 2) - Math.PI;
    walker.facing += turn * (1 - Math.exp(-delta * TURN_RESPONSE));
  }
}
