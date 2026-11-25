import { MathUtils } from 'three';
import type { Flight, Mount } from './characterFlight';
import type { WalkCommand, Walker } from './walkerMotion';

export interface FlightControl {
  readonly command: WalkCommand;
  readonly height: number;
  readonly uphill: number;
  readonly thermal: number;
}

type MountStep = (walker: Walker, flight: Flight, control: FlightControl, delta: number) => void;

const approach = (value: number, target: number, rate: number, delta: number) =>
  value + (target - value) * (1 - Math.exp(-delta * rate));

function turn(flight: Flight, target: number, maxRate: number, delta: number): number {
  const difference = MathUtils.euclideanModulo(target - flight.heading + Math.PI, Math.PI * 2) - Math.PI;
  const step = MathUtils.clamp(difference, -maxRate * delta, maxRate * delta);
  flight.heading += step;
  return step / Math.max(delta, 1e-3);
}

const lookHeading = (command: WalkCommand) => command.yaw + Math.PI;

function glide(walker: Walker, flight: Flight): void {
  walker.velocity.x = Math.sin(flight.heading) * flight.airspeed;
  walker.velocity.z = Math.cos(flight.heading) * flight.airspeed;
}

const jetpack: MountStep = (walker, flight, { command }, delta) => {
  const sin = Math.sin(command.yaw);
  const cos = Math.cos(command.yaw);
  let moveX = -sin * command.forward + cos * command.right;
  let moveZ = -cos * command.forward - sin * command.right;
  const magnitude = Math.hypot(moveX, moveZ);
  if (magnitude > 1) {
    moveX /= magnitude;
    moveZ /= magnitude;
  }
  const speed = command.sprint ? 40 : 18;
  walker.velocity.x = approach(walker.velocity.x, moveX * speed, 2.5, delta);
  walker.velocity.z = approach(walker.velocity.z, moveZ * speed, 2.5, delta);
  walker.vertical = approach(walker.vertical, command.rise * (command.sprint ? 16 : 10), 3.5, delta);
  const effort = Math.max(Math.min(1, magnitude), Math.max(0, command.rise));
  flight.thrust = approach(flight.thrust, 0.35 + 0.65 * effort, 8, delta);
  const rate = turn(flight, magnitude > 0.1 ? Math.atan2(moveX, moveZ) : lookHeading(command), 5, delta);
  const travel = Math.hypot(walker.velocity.x, walker.velocity.z);
  flight.tilt = approach(flight.tilt, Math.min(1, travel / 40) * 0.5, 4, delta);
  flight.bank = approach(flight.bank, MathUtils.clamp(-rate * 0.15, -0.5, 0.5), 4, delta);
};

const broom: MountStep = (walker, flight, { command }, delta) => {
  const heading = lookHeading(command);
  const elevation = MathUtils.clamp(-(command.aimPitch - 0.2) * 1.4, -0.9, 0.9);
  const cruise = command.forward > 0 ? command.forward * (command.sprint ? 50 : 24) : command.forward * 8;
  const side = command.right * 12;
  const targetX = Math.sin(heading) * Math.cos(elevation) * cruise + Math.cos(command.yaw) * side;
  const targetZ = Math.cos(heading) * Math.cos(elevation) * cruise - Math.sin(command.yaw) * side;
  const targetY = Math.sin(elevation) * Math.max(0, cruise) + command.rise * 10;
  walker.velocity.x = approach(walker.velocity.x, targetX, 2.2, delta);
  walker.velocity.z = approach(walker.velocity.z, targetZ, 2.2, delta);
  walker.vertical = approach(walker.vertical, targetY, 2.2, delta);
  const travel = Math.hypot(walker.velocity.x, walker.velocity.z);
  const course = travel > 1.5 ? Math.atan2(walker.velocity.x, walker.velocity.z) : heading;
  const rate = turn(flight, course, 4, delta);
  flight.thrust = approach(flight.thrust, Math.min(1, travel / 50), 4, delta);
  flight.tilt = approach(flight.tilt, 0.1 + Math.min(1, travel / 50) * 0.25 - walker.vertical * 0.012, 4, delta);
  flight.bank = approach(flight.bank, MathUtils.clamp(-rate * 0.3, -0.6, 0.6), 4, delta);
};

const paraglider: MountStep = (walker, flight, { command, height, uphill, thermal }, delta) => {
  const rate = turn(flight, lookHeading(command) + command.right * 0.9, 0.9, delta);
  const trim = command.sprint ? 16 : command.forward > 0 ? 13.5 : command.forward < 0 ? 7.5 : 11;
  flight.airspeed = approach(flight.airspeed, trim, 1.2, delta);
  const sink = 0.6 + Math.pow(Math.max(0, flight.airspeed - 7) / 9, 2) * 1.8;
  const ridge = Math.max(0, uphill) * flight.airspeed * 0.5 * (1 - MathUtils.smoothstep(height, 15, 160));
  const assist = command.rise * (command.rise > 0 ? 3.5 : 3) + (flight.launch > 0 ? 3.5 : 0);
  walker.vertical = approach(walker.vertical, ridge + thermal * 3.4 + assist - sink, 1.4, delta);
  glide(walker, flight);
  flight.thrust = 0;
  flight.tilt = approach(flight.tilt, 0, 3, delta);
  flight.bank = approach(flight.bank, MathUtils.clamp(-rate * 0.6, -0.5, 0.5), 3, delta);
};

const WINGSUIT_TRIM = {
  sprint: { speed: 65, ratio: 1.9 },
  dive: { speed: 55, ratio: 2.3 },
  flare: { speed: 28, ratio: 3.8 },
  cruise: { speed: 40, ratio: 3 },
};

const WINGSUIT_LAUNCH_CLIMB = 38;

const wingsuit: MountStep = (walker, flight, { command }, delta) => {
  const rate = turn(flight, lookHeading(command) + command.right * 0.7, 1.5, delta);
  const trim = command.sprint
    ? WINGSUIT_TRIM.sprint
    : command.forward > 0
      ? WINGSUIT_TRIM.dive
      : command.forward < 0
        ? WINGSUIT_TRIM.flare
        : WINGSUIT_TRIM.cruise;
  flight.airspeed = approach(flight.airspeed, trim.speed, 0.5, delta);
  const pull = Math.max(0, command.rise);
  flight.airspeed = Math.max(15, flight.airspeed - pull * 9 * delta);
  const target =
    -flight.airspeed / trim.ratio + pull * Math.max(0, flight.airspeed - 18) * 0.45 + Math.min(0, command.rise) * 12;
  const launching = flight.launch > 0;
  walker.vertical = approach(walker.vertical, launching ? WINGSUIT_LAUNCH_CLIMB : target, launching ? 2 : 1.3, delta);
  glide(walker, flight);
  const dive = Math.atan2(-walker.vertical, flight.airspeed);
  flight.thrust = Math.min(1, flight.airspeed / 65);
  flight.tilt = approach(flight.tilt, Math.PI / 2 - 0.1 + dive * 0.6, 3, delta);
  flight.bank = approach(flight.bank, MathUtils.clamp(-rate * 0.5, -0.7, 0.7), 3, delta);
};

const MOUNT_STEPS: Record<Mount, MountStep> = { paraglider, jetpack, wingsuit, broom };

export function steerMount(walker: Walker, flight: Flight, control: FlightControl, delta: number): void {
  MOUNT_STEPS[flight.mount](walker, flight, control, delta);
}
