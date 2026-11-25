import {
  CanvasTexture,
  Mesh,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderTarget,
  type BufferGeometry,
  type WebGLRenderer,
} from 'three';
import { terrainShader } from '@/shaders';
import { createLitMaterial } from '@/scene/materials';

const BAKE_HEIGHT = 20000;

export function bakeTerrainAlbedo(
  renderer: WebGLRenderer,
  terrain: BufferGeometry,
  size: number,
  resolution: number,
): CanvasTexture {
  const material = createLitMaterial(terrainShader, { defines: { BAKE_ALBEDO: '' } });
  const scene = new Scene();
  scene.add(new Mesh(terrain, material));
  const half = size / 2;
  const camera = new OrthographicCamera(-half, half, half, -half, 1, BAKE_HEIGHT * 2);
  camera.position.set(0, BAKE_HEIGHT, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);

  const target = new WebGLRenderTarget(resolution, resolution);
  const pixels = new Uint8Array(resolution * resolution * 4);
  const previous = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(target, 0, 0, resolution, resolution, pixels);
  renderer.setRenderTarget(previous);
  target.dispose();
  material.dispose();

  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('Canvas 2D context is unavailable');
  const image = context.createImageData(resolution, resolution);
  const rowBytes = resolution * 4;
  for (let row = 0; row < resolution; row += 1) {
    const source = (resolution - 1 - row) * rowBytes;
    image.data.set(pixels.subarray(source, source + rowBytes), row * rowBytes);
  }
  context.putImageData(image, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.userData.mimeType = 'image/jpeg';
  return texture;
}
