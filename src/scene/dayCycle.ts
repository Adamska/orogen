import { MathUtils } from 'three';

const DAY_SECONDS = 54;
const PEAK_ELEVATION = 58;
const ELEVATION_BIAS = -6;

export interface SunPosition {
  elevation: number;
  azimuth: number;
}

export const dayCycle = {
  active: false,
  phase: 0,
  azimuthOrigin: 0,
};

export function beginDayCycle(from: SunPosition): void {
  const ratio = MathUtils.clamp((from.elevation - ELEVATION_BIAS) / PEAK_ELEVATION, -1, 1);
  dayCycle.phase = Math.asin(ratio);
  dayCycle.azimuthOrigin = from.azimuth - MathUtils.radToDeg(dayCycle.phase);
  dayCycle.active = true;
}

export function endDayCycle(): void {
  dayCycle.active = false;
}

export function advanceDayCycle(delta: number, out: SunPosition): SunPosition {
  dayCycle.phase = (dayCycle.phase + (delta / DAY_SECONDS) * Math.PI * 2) % (Math.PI * 2);
  out.elevation = Math.sin(dayCycle.phase) * PEAK_ELEVATION + ELEVATION_BIAS;
  out.azimuth = (dayCycle.azimuthOrigin + MathUtils.radToDeg(dayCycle.phase) + 720) % 360;
  return out;
}
