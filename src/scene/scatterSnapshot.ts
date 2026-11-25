import type { BiomeLayout } from '@/engine/scatterPlacement';
import type { VegetationKind } from '@/engine/worldConfig';

export const scatterSnapshot: {
  layout: BiomeLayout | null;
  vegetation: VegetationKind;
  treeDensity: number;
  boulderDensity: number;
} = {
  layout: null,
  vegetation: 'conifer',
  treeDensity: 0,
  boulderDensity: 0,
};
