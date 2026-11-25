import type { Mount } from '@/scene/characterFlight';
import type { Binding } from './ControlHint';

const SHARED: readonly Binding[] = [
  ['1-4', 'gear'],
  ['Esc', 'release cursor'],
];

export const WALK_BINDINGS: readonly Binding[] = [
  ['WASD', 'move'],
  ['Mouse', 'look'],
  ['Shift', 'sprint'],
  ['Space', 'jump'],
  ['F', 'fly'],
  ['Scroll', 'zoom'],
  ...SHARED,
];

export const MOUNT_BINDINGS: Record<Mount, readonly Binding[]> = {
  paraglider: [
    ['Mouse', 'steer'],
    ['A / D', 'turn'],
    ['W', 'speed bar'],
    ['S', 'brake'],
    ['Space', 'updraft'],
    ['C', 'descend'],
    ['F', 'let go'],
    ...SHARED,
  ],
  jetpack: [
    ['Hold W', 'accelerate'],
    ['S', 'brake'],
    ['A / D', 'strafe'],
    ['Mouse', 'look'],
    ['Space / C', 'rise / land'],
    ['Shift', 'boost'],
    ['F', 'drop'],
    ...SHARED,
  ],
  wingsuit: [
    ['Mouse', 'steer and dive'],
    ['A / D', 'turn'],
    ['W', 'dive'],
    ['S', 'flare'],
    ['Space', 'pull up'],
    ['Shift', 'speed'],
    ['F', 'let go'],
    ...SHARED,
  ],
  broom: [
    ['Hold W', 'accelerate'],
    ['S', 'brake'],
    ['Mouse', 'aim'],
    ['A / D', 'strafe'],
    ['Space / C', 'rise / land'],
    ['Shift', 'boost'],
    ['F', 'drop'],
    ...SHARED,
  ],
};
