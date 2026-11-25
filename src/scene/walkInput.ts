import { MathUtils } from 'three';
import { useWorldStore } from '@/store/useWorldStore';
import { MOUNTS } from './characterFlight';
import type { LookBindings, LookInput } from './useLookInput';
import { walkIntent } from './walkIntent';
import type { WalkCommand } from './walkerMotion';

export interface WalkInput extends LookInput {
  distance: number;
  toggleFlight: boolean;
}

const DISTANCE_RANGE = [2.2, 24] as const;
const SPRINT_DEFLECTION = 0.9;
const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACKWARD_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const SPRINT_KEYS = ['ShiftLeft', 'ShiftRight'];
const SINK_KEYS = ['KeyC', 'ControlLeft', 'KeyQ'];
const MOUNT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];

export function createWalkInput(): WalkInput {
  return { keys: new Set(), yaw: 0, pitch: 0.2, distance: 5.5, jump: false, toggleFlight: false };
}

export const WALK_BINDINGS: LookBindings<WalkInput> = {
  pitchRange: [-0.5, 1.3],
  onEscape: () => {
    const store = useWorldStore.getState();
    if (!store.photoMode) store.setWalkStage('off');
  },
  onWheel: (state, deltaY) => {
    state.distance = MathUtils.clamp(state.distance * Math.exp(deltaY * 0.0011), DISTANCE_RANGE[0], DISTANCE_RANGE[1]);
  },
  onKey: (state, code) => {
    if (code === 'KeyF') state.toggleFlight = true;
    const slot = MOUNT_KEYS.indexOf(code);
    if (slot >= 0) useWorldStore.getState().setWalkMount(MOUNTS[slot]);
  },
};

export function readWalkCommand(input: WalkInput, command: WalkCommand): boolean {
  const { keys } = input;
  const held = (codes: readonly string[]) => codes.some((code) => keys.has(code));
  const axis = (positive: readonly string[], negative: readonly string[]) =>
    (held(positive) ? 1 : 0) - (held(negative) ? 1 : 0);
  command.forward = MathUtils.clamp(axis(FORWARD_KEYS, BACKWARD_KEYS) + walkIntent.moveZ, -1, 1);
  command.right = MathUtils.clamp(axis(RIGHT_KEYS, LEFT_KEYS) + walkIntent.moveX, -1, 1);
  command.yaw = input.yaw;
  command.aimPitch = input.pitch;
  command.sprint = held(SPRINT_KEYS) || Math.hypot(walkIntent.moveX, walkIntent.moveZ) > SPRINT_DEFLECTION;
  command.jump = input.jump || walkIntent.jump;
  command.jumpHeld = keys.has('Space') || walkIntent.jumpHeld;
  command.rise = (command.jumpHeld ? 1 : 0) - (held(SINK_KEYS) ? 1 : 0);
  const toggle = input.toggleFlight || walkIntent.toggleFlight;
  input.jump = false;
  input.toggleFlight = false;
  walkIntent.jump = false;
  walkIntent.toggleFlight = false;
  return toggle;
}
