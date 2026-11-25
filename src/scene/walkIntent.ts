export const walkIntent = {
  moveX: 0,
  moveZ: 0,
  jump: false,
};

export function resetWalkIntent(): void {
  walkIntent.moveX = 0;
  walkIntent.moveZ = 0;
  walkIntent.jump = false;
}
