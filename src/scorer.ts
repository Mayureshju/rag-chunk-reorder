import { Chunk, ScoredChunk, ScoringWeights } from './types';

function normalize(value: number | undefined, min: number, max: number): number {
  if (value === undefined) return 0;
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function finiteOrUndefined(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
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
  const definedReliability: number[] = [];

  for (const c of chunks) {
    const timestamp = finiteOrUndefined(c.metadata?.timestamp);
    const sectionIndex = finiteOrUndefined(c.metadata?.sectionIndex);
    const reliability = finiteOrUndefined(c.metadata?.sourceReliability);
    if (timestamp !== undefined) definedTimestamps.push(timestamp);
    if (sectionIndex !== undefined) definedSections.push(sectionIndex);
    if (reliability !== undefined) definedReliability.push(reliability);
  }

  const [minTs, maxTs] = minMax(definedTimestamps);
  const [minSec, maxSec] = minMax(definedSections);
  const [minRel, maxRel] = minMax(definedReliability);

  return chunks.map((chunk, index) => {
    const normalizedTime = normalize(finiteOrUndefined(chunk.metadata?.timestamp), minTs, maxTs);
    const normalizedSection = normalize(
      finiteOrUndefined(chunk.metadata?.sectionIndex),
      minSec,
      maxSec,
    );
    const normalizedReliability = normalize(
      finiteOrUndefined(chunk.metadata?.sourceReliability),
      minRel,
      maxRel,
    );

    const priorityScore =
      chunk.score * weights.similarity +
      normalizedTime * weights.time +
      normalizedSection * weights.section +
      normalizedReliability * weights.sourceReliability;

    return {
      ...chunk,
      priorityScore,
      originalIndex: index,
    };
  });
}
