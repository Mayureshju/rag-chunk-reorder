import { ReorderConfig } from './types';

export const reordererPresets: Record<string, ReorderConfig> = {
  standard: {
    strategy: 'scoreSpread',
    packing: 'edgeAware',
    minTopK: 4,
  },
  narrative: {
    strategy: 'preserveOrder',
    preserveOrderSourceField: 'sourceId',
  },
  temporal: {
    strategy: 'chronological',
    chronologicalOrder: 'asc',
  },
  diverse: {
    strategy: 'scoreSpread',
    diversity: { enabled: true, lambda: 0.7, sourceDiversityWeight: 0.2 },
  },
  auto: {
    strategy: 'auto',
  },
};

export type ReordererPresetName = keyof typeof reordererPresets;

export function getPreset(name: ReordererPresetName): ReorderConfig {
  const preset = reordererPresets[name];
  return {
    ...preset,
    weights: preset.weights ? { ...preset.weights } : undefined,
    autoStrategy: preset.autoStrategy ? { ...preset.autoStrategy } : undefined,
    diversity: preset.diversity ? { ...preset.diversity } : undefined,
  };
}
