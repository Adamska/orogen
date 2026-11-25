import { useEffect, type RefObject } from 'react';
import { MathUtils } from 'three';

export interface LookInput {
  readonly keys: Set<string>;
  yaw: number;
  pitch: number;
  jump: boolean;
}

export interface LookBindings<T extends LookInput> {
  readonly pitchRange: readonly [number, number];
  readonly onEscape: () => void;
  readonly onWheel: (state: T, deltaY: number) => void;
  readonly onKey: (state: T, code: string) => void;
}

const LOCKED_SENSITIVITY = 0.0023;
const DRAG_SENSITIVITY = 0.0045;
const ESCAPE_GRACE_MS = 300;

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));

export function requestLook(canvas: HTMLCanvasElement): void {
  if (!window.matchMedia('(pointer: fine)').matches || document.pointerLockElement === canvas) return;
  Promise.resolve()
    .then(() => canvas.requestPointerLock())
    .catch(() => undefined);
}

export function useLookInput<T extends LookInput>(
  canvas: HTMLCanvasElement,
  input: RefObject<T>,
  bindings: LookBindings<T>,
): void {
  useEffect(() => {
    const state = input.current;
    let pointer: { id: number; x: number; y: number } | null = null;
    let unlockedAt = 0;
    const locked = () => document.pointerLockElement === canvas;
    const look = (dx: number, dy: number, sensitivity: number) => {
      state.yaw -= dx * sensitivity;
      state.pitch = MathUtils.clamp(state.pitch + dy * sensitivity, bindings.pitchRange[0], bindings.pitchRange[1]);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (editable(event.target)) return;
      if (event.code === 'Escape') {
        if (!locked() && performance.now() - unlockedAt > ESCAPE_GRACE_MS) bindings.onEscape();
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) state.jump = true;
      }
      if (!event.repeat) bindings.onKey(state, event.code);
      state.keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => state.keys.delete(event.code);
    const onBlur = () => {
      state.keys.clear();
      pointer = null;
    };
    const onLockChange = () => {
      if (!locked()) unlockedAt = performance.now();
    };
    const onMouseMove = (event: MouseEvent) => {
      if (locked()) look(event.movementX, event.movementY, LOCKED_SENSITIVITY);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button === 0) requestLook(canvas);
      if (pointer === null && !locked()) pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (pointer === null || event.pointerId !== pointer.id || locked()) return;
      look(event.clientX - pointer.x, event.clientY - pointer.y, DRAG_SENSITIVITY);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (pointer !== null && event.pointerId === pointer.id) pointer = null;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      bindings.onWheel(state, event.deltaY);
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
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
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      state.keys.clear();
      if (locked()) document.exitPointerLock();
    };
  }, [canvas, input, bindings]);
}
