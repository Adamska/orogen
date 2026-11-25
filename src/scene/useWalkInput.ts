import { useEffect, type RefObject } from 'react';
import { MathUtils } from 'three';
import { useWorldStore } from '@/store/useWorldStore';

export interface WalkInput {
  readonly keys: Set<string>;
  yaw: number;
  pitch: number;
  distance: number;
  jump: boolean;
}

export const WALK_PITCH_RANGE = [-0.35, 1.25] as const;
export const WALK_DISTANCE_RANGE = [2.6, 18] as const;

const LOOK_SENSITIVITY = 0.0042;
const ZOOM_SENSITIVITY = 0.0011;

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));

export function createWalkInput(): WalkInput {
  return { keys: new Set(), yaw: 0, pitch: 0.16, distance: 6.5, jump: false };
}

export function useWalkInput(canvas: HTMLCanvasElement, input: RefObject<WalkInput>): void {
  useEffect(() => {
    const state = input.current;
    let pointer: { id: number; x: number; y: number } | null = null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (editable(event.target)) return;
      if (event.code === 'Escape' && !useWorldStore.getState().photoMode) {
        useWorldStore.getState().setWalkMode(false);
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) state.jump = true;
      }
      state.keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => state.keys.delete(event.code);
    const onBlur = () => {
      state.keys.clear();
      pointer = null;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (pointer === null) pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (pointer === null || event.pointerId !== pointer.id) return;
      state.yaw -= (event.clientX - pointer.x) * LOOK_SENSITIVITY;
      state.pitch = MathUtils.clamp(
        state.pitch + (event.clientY - pointer.y) * LOOK_SENSITIVITY,
        WALK_PITCH_RANGE[0],
        WALK_PITCH_RANGE[1],
      );
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (pointer !== null && event.pointerId === pointer.id) pointer = null;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      state.distance = MathUtils.clamp(
        state.distance * Math.exp(event.deltaY * ZOOM_SENSITIVITY),
        WALK_DISTANCE_RANGE[0],
        WALK_DISTANCE_RANGE[1],
      );
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      state.keys.clear();
    };
  }, [canvas, input]);
}
