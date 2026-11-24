import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useBootStore } from '@/store/useBootStore';

export function useSceneReady(active: boolean, onReady?: () => void): void {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const announced = useRef(false);

  useEffect(() => {
    if (!active || announced.current) return;
    announced.current = true;
    useBootStore.getState().advance('shaders');
    const frame = requestAnimationFrame(() => {
      gl.compile(scene, camera);
      requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
    });
    return () => {
      cancelAnimationFrame(frame);
      announced.current = false;
    };
  }, [active, gl, scene, camera, onReady]);
}
