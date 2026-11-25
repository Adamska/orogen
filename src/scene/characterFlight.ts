import { MathUtils } from 'three';
import { createNoise2D } from '@/engine/noise';
import { steerMount, type FlightControl } from './flightMounts';
import type { WalkCommand, WalkTerrain, Walker } from './walkerMotion';

export const MOUNTS = ['paraglider', 'jetpack', 'wingsuit', 'broom'] as const;
export type Mount = (typeof MOUNTS)[number];

export interface Flight {
  mount: Mount;
  heading: number;
  airspeed: number;
  bank: number;
  tilt: number;
  thrust: number;
  launch: number;
  hover: number;
}

const HOVER_CLEARANCE = 0.9;
const TERRAIN_LOOKAHEAD = 0.45;
const LOOKAHEAD_MARGIN = 2;
const CLIMB_RESPONSE = 4;
const ALTITUDE_LIMIT = 1400;
const SWIM_FLOAT = 1.05;
const thermals = createNoise2D(7331);
const slope = { x: 0, z: 0 };

const LAUNCH: Record<Mount, { vertical: number; airspeed: number; assist: number }> = {
  paraglider: { vertical: 5, airspeed: 10, assist: 1.8 },
  jetpack: { vertical: 7, airspeed: 0, assist: 0 },
  wingsuit: { vertical: 30, airspeed: 24, assist: 2.6 },
  broom: { vertical: 6, airspeed: 0, assist: 0 },
};

export function takeOff(walker: Walker, mount: Mount): void {
  const launch = LAUNCH[mount];
  walker.flight = {
    mount,
    heading: walker.facing,
    airspeed: Math.max(walker.speed, launch.airspeed),
    bank: 0,
    tilt: 0,
    thrust: 1,
    launch: launch.assist,
    hover: 0,
  };
  walker.vertical = Math.max(walker.vertical, launch.vertical);
  walker.grounded = false;
  walker.floating = false;
  walker.jumped = true;
}

export function switchMount(walker: Walker, mount: Mount): void {
  if (walker.flight === null || walker.flight.mount === mount) return;
  walker.flight.mount = mount;
  walker.flight.airspeed = Math.max(walker.flight.airspeed, LAUNCH[mount].airspeed);
}

function land(walker: Walker, floating: boolean): void {
  walker.landing = floating ? 0 : -walker.vertical;
  walker.vertical = 0;
  walker.flight = null;
  walker.grounded = true;
  walker.floating = floating;
}

function thermalLift(x: number, z: number): number {
  const strength = thermals(x / 170, z / 170) * 0.5 + thermals(x / 60 + 9, z / 60 - 4) * 0.2;
  return MathUtils.smoothstep(strength, 0.18, 0.5);
}

export function stepFlight(walker: Walker, command: WalkCommand, terrain: WalkTerrain, delta: number): void {
  const flight = walker.flight;
  if (flight === null) return;
  const { position, velocity } = walker;
  const ground = terrain.groundAt(position.x, position.z);
  terrain.slopeAt(position.x, position.z, slope);
  const control: FlightControl = {
    command,
    height: position.y - ground,
    uphill: slope.x * Math.sin(flight.heading) + slope.z * Math.cos(flight.heading),
    thermal: thermalLift(position.x, position.z),
  };
  steerMount(walker, flight, control, delta);
  flight.launch = Math.max(0, flight.launch - delta);

  position.x = MathUtils.clamp(position.x + velocity.x * delta, -terrain.limit, terrain.limit);
  position.z = MathUtils.clamp(position.z + velocity.z * delta, -terrain.limit, terrain.limit);
  position.y = Math.min(ALTITUDE_LIMIT, position.y + walker.vertical * delta);
  walker.speed = Math.hypot(velocity.x, velocity.z);
  walker.facing = flight.heading;
  walker.jumped = false;
  walker.landing = 0;

  const floor = terrain.groundAt(position.x, position.z);
  const afloat = terrain.waterHeight - floor > SWIM_FLOAT;
  const surface = afloat ? terrain.waterHeight - SWIM_FLOAT : floor;
  const hovering = flight.mount === 'jetpack' || flight.mount === 'broom';
  const settling = command.rise < 0 || !hovering;
  if (position.y <= surface + (hovering ? HOVER_CLEARANCE : 0) && walker.vertical <= 0 && settling) {
    position.y = Math.max(position.y, surface);
    land(walker, afloat);
    return;
  }
  if (hovering && command.rise >= 0) {
    const ahead = terrain.groundAt(
      position.x + velocity.x * TERRAIN_LOOKAHEAD,
      position.z + velocity.z * TERRAIN_LOOKAHEAD,
    );
    const shortfall = Math.max(ahead, terrain.waterHeight) + LOOKAHEAD_MARGIN - position.y;
    if (shortfall > 0) walker.vertical = Math.max(walker.vertical, shortfall * CLIMB_RESPONSE);
  }
  if (hovering && position.y < surface + HOVER_CLEARANCE) {
    position.y = surface + HOVER_CLEARANCE;
    walker.vertical = Math.max(0, walker.vertical);
  }
  position.y = Math.max(position.y, floor);
}
