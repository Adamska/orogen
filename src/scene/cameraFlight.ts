import { MathUtils, Spherical, Vector3 } from 'three';

export interface OrbitPose {
  radius: number;
  polar: number;
  azimuth: number;
}

export type FlightStage = 'rise' | 'hold' | 'descend' | 'done';

export interface CameraFlight {
  stage: FlightStage;
  elapsed: number;
  readonly origin: OrbitPose;
  readonly apex: OrbitPose;
  readonly finale: OrbitPose;
}

const RISE_SECONDS = 1.5;
const DESCEND_SECONDS = 3.2;
const MAX_HOLD_SECONDS = 5;
const HOLD_DRIFT = 0.06;
const APEX_POLAR = 0.78;
const FINALE_POLAR = 1.3;
const FINALE_RADIUS = 820;
const SUN_OFFSET = 0.62;

const spherical = new Spherical();

function wrapAngle(angle: number): number {
  return MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function readPose(offset: Vector3): OrbitPose {
  spherical.setFromVector3(offset);
  return { radius: spherical.radius, polar: spherical.phi, azimuth: spherical.theta };
}

export function writePose(pose: OrbitPose, target: Vector3, out: Vector3): Vector3 {
  spherical.set(pose.radius, pose.polar, pose.azimuth);
  return out.setFromSpherical(spherical).add(target);
}

export function planFlight(origin: OrbitPose, sunAzimuthDegrees: number, maxRadius: number): CameraFlight {
  const facingSun = MathUtils.degToRad(sunAzimuthDegrees) + Math.PI + SUN_OFFSET;
  const finaleAzimuth = origin.azimuth + wrapAngle(facingSun - origin.azimuth);
  return {
    stage: 'rise',
    elapsed: 0,
    origin: { ...origin },
    apex: {
      radius: Math.min(maxRadius, Math.max(origin.radius * 1.4, 1150)),
      polar: APEX_POLAR,
      azimuth: origin.azimuth + wrapAngle(finaleAzimuth - origin.azimuth) * 0.3,
    },
    finale: { radius: FINALE_RADIUS, polar: FINALE_POLAR, azimuth: finaleAzimuth },
  };
}

function blend(from: OrbitPose, to: OrbitPose, t: number, out: OrbitPose): OrbitPose {
  const eased = easeInOut(MathUtils.clamp(t, 0, 1));
  out.radius = MathUtils.lerp(from.radius, to.radius, eased);
  out.polar = MathUtils.lerp(from.polar, to.polar, eased);
  out.azimuth = MathUtils.lerp(from.azimuth, to.azimuth, eased);
  return out;
}

export function advanceFlight(
  flight: CameraFlight,
  delta: number,
  terrainSettled: boolean,
  out: OrbitPose,
): OrbitPose {
  flight.elapsed += delta;
  if (flight.stage === 'rise') {
    blend(flight.origin, flight.apex, flight.elapsed / RISE_SECONDS, out);
    if (flight.elapsed >= RISE_SECONDS) Object.assign(flight, { stage: 'hold', elapsed: 0 });
    return out;
  }
  if (flight.stage === 'hold') {
    Object.assign(out, flight.apex);
    out.azimuth += HOLD_DRIFT * flight.elapsed;
    if (terrainSettled || flight.elapsed >= MAX_HOLD_SECONDS) {
      Object.assign(flight.apex, out);
      Object.assign(flight, { stage: 'descend', elapsed: 0 });
    }
    return out;
  }
  blend(flight.apex, flight.finale, flight.elapsed / DESCEND_SECONDS, out);
  if (flight.elapsed >= DESCEND_SECONDS) flight.stage = 'done';
  return out;
}
