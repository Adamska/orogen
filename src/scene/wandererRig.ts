import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';

export interface Limb {
  readonly upper: Group;
  readonly lower: Group;
}

export interface WandererRig {
  readonly root: Group;
  readonly body: Group;
  readonly torso: Group;
  readonly legs: readonly [Limb, Limb];
  readonly arms: readonly [Limb, Limb];
  readonly lantern: MeshStandardMaterial;
  readonly shadow: Mesh;
  readonly shadowMaterial: MeshBasicMaterial;
  readonly dispose: () => void;
}

const PELVIS_HEIGHT = 0.92;
const SIDES = [1, -1] as const;

export const LANTERN_COLOR = new Color(1, 0.62, 0.28);

export function createWandererRig(): WandererRig {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const cloth = (color: string, roughness = 0.86) => {
    const material = new MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: true });
    materials.push(material);
    return material;
  };
  const palette = {
    tunic: cloth('#4f9a92'),
    trousers: cloth('#6b6457'),
    leather: cloth('#7a5236', 0.7),
    skin: cloth('#e7b48e', 0.6),
    hat: cloth('#a8774a'),
    scarf: cloth('#e0573a'),
    pack: cloth('#b98f5c'),
    roll: cloth('#93a476'),
  };
  const lantern = new MeshStandardMaterial({ color: '#ffd7a0', emissive: LANTERN_COLOR, emissiveIntensity: 0.4 });
  materials.push(lantern);

  const piece = (geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0) => {
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const joint = (x: number, y: number, z = 0, ...children: Mesh[]) => {
    const group = new Group();
    group.position.set(x, y, z);
    if (children.length > 0) group.add(...children);
    return group;
  };

  const root = new Group();
  const body = new Group();
  const pelvis = joint(0, PELVIS_HEIGHT, 0, piece(new CapsuleGeometry(0.14, 0.1, 2, 7), palette.trousers, 0, 0.02, 0));
  pelvis.children[0].scale.set(1.1, 1, 0.8);

  const legs = SIDES.map((side) => {
    const lower = joint(0, -0.43, 0,
      piece(new CapsuleGeometry(0.06, 0.3, 2, 6), palette.trousers, 0, -0.19, 0),
      piece(new BoxGeometry(0.12, 0.09, 0.22), palette.leather, 0, -0.43, 0.04),
    );
    const upper = joint(side * 0.095, 0, 0, piece(new CapsuleGeometry(0.07, 0.3, 2, 6), palette.trousers, 0, -0.21, 0));
    upper.add(lower);
    pelvis.add(upper);
    return { upper, lower };
  }) as [Limb, Limb];

  const torso = joint(0, PELVIS_HEIGHT, 0,
    piece(new CapsuleGeometry(0.16, 0.28, 2, 8), palette.tunic, 0, 0.3, 0),
    piece(new TorusGeometry(0.12, 0.045, 5, 10), palette.scarf, 0, 0.55, 0.01),
    piece(new BoxGeometry(0.3, 0.36, 0.17), palette.pack, 0, 0.3, -0.21),
    piece(new CylinderGeometry(0.07, 0.07, 0.36, 7), palette.roll, 0, 0.53, -0.21),
    piece(new BoxGeometry(0.07, 0.09, 0.07), palette.leather, 0.19, 0.12, -0.22),
    piece(new IcosahedronGeometry(0.04, 1), lantern, 0.19, 0.12, -0.22),
  );
  torso.children[1].rotation.x = Math.PI / 2;
  torso.children[3].rotation.z = Math.PI / 2;
  torso.children[5].castShadow = false;

  const head = joint(0, 0.7, 0,
    piece(new IcosahedronGeometry(0.12, 1), palette.skin, 0, 0, 0.01),
    piece(new CylinderGeometry(0.23, 0.23, 0.025, 12), palette.hat, 0, 0.08, 0),
    piece(new CylinderGeometry(0.1, 0.13, 0.13, 10), palette.hat, 0, 0.15, 0),
  );
  torso.add(head);

  const arms = SIDES.map((side) => {
    const lower = joint(0, -0.29, 0,
      piece(new CapsuleGeometry(0.045, 0.2, 2, 6), palette.tunic, 0, -0.12, 0),
      piece(new IcosahedronGeometry(0.05, 0), palette.skin, 0, -0.27, 0),
    );
    const upper = joint(side * 0.215, 0.47, 0, piece(new CapsuleGeometry(0.052, 0.22, 2, 6), palette.tunic, 0, -0.14, 0));
    upper.add(lower);
    torso.add(upper);
    return { upper, lower };
  }) as [Limb, Limb];

  body.add(pelvis, torso);
  root.add(body);

  const shadowMaterial = new MeshBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });
  materials.push(shadowMaterial);
  const shadowGeometry = new CircleGeometry(0.42, 18);
  shadowGeometry.rotateX(-Math.PI / 2);
  geometries.push(shadowGeometry);
  const shadow = new Mesh(shadowGeometry, shadowMaterial);
  shadow.renderOrder = 1;

  return {
    root,
    body,
    torso,
    legs,
    arms,
    lantern,
    shadow,
    shadowMaterial,
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
