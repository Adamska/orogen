export const walkIntent = {
  moveX: 0,
  moveZ: 0,
  jump: false,
  jumpHeld: false,
  toggleFlight: false,
};

export function resetWalkIntent(): void {
  walkIntent.moveX = 0;
  walkIntent.moveZ = 0;
  walkIntent.jump = false;
  walkIntent.jumpHeld = false;
  walkIntent.toggleFlight = false;
}
