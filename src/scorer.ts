import { Chunk, ScoredChunk, ScoringWeights } from './types';

function normalize(value: number | undefined, min: number, max: number): number {
  if (value === undefined) return 0;
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function minMax(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  return [min, max];
}

/**
 * Compute priority scores for each chunk based on weighted combination
 * of relevance score and normalized metadata (timestamp, sectionIndex).
 */
export function scoreChunks(chunks: Chunk[], weights: ScoringWeights): ScoredChunk[] {
  const definedTimestamps: number[] = [];
  const definedSections: number[] = [];

  for (const c of chunks) {
    if (c.metadata?.timestamp !== undefined) definedTimestamps.push(c.metadata.timestamp);
    if (c.metadata?.sectionIndex !== undefined) definedSections.push(c.metadata.sectionIndex);
  }

  const [minTs, maxTs] = minMax(definedTimestamps);
  const [minSec, maxSec] = minMax(definedSections);

  return chunks.map((chunk, index) => {
    const normalizedTime = normalize(chunk.metadata?.timestamp, minTs, maxTs);
    const normalizedSection = normalize(chunk.metadata?.sectionIndex, minSec, maxSec);

    const priorityScore =
      chunk.score * weights.similarity +
      normalizedTime * weights.time +
      normalizedSection * weights.section;

    return {
      ...chunk,
      priorityScore,
      originalIndex: index,
    };
  });
}
