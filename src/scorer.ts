import { Chunk, ScoredChunk, ScoringWeights, ScoreNormalization } from './types';

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
  return scoreChunksWithOptions(chunks, weights);
}

export function scoreChunksWithOptions(
  chunks: Chunk[],
  weights: ScoringWeights,
  options?: { scoreNormalization?: ScoreNormalization; scoreNormalizationTemperature?: number },
): ScoredChunk[] {
  const definedTimestamps: number[] = [];
  const definedSections: number[] = [];
  const definedReliability: number[] = [];
  const rawScores: number[] = [];

  for (const c of chunks) {
    const timestamp = finiteOrUndefined(c.metadata?.timestamp);
    const sectionIndex = finiteOrUndefined(c.metadata?.sectionIndex);
    const reliability = finiteOrUndefined(c.metadata?.sourceReliability);
    if (timestamp !== undefined) definedTimestamps.push(timestamp);
    if (sectionIndex !== undefined) definedSections.push(sectionIndex);
    if (reliability !== undefined) definedReliability.push(reliability);
    rawScores.push(c.score);
  }

  const [minTs, maxTs] = minMax(definedTimestamps);
  const [minSec, maxSec] = minMax(definedSections);
  const [minRel, maxRel] = minMax(definedReliability);
  const normalizedScores = normalizeScores(
    rawScores,
    options?.scoreNormalization ?? 'none',
    options?.scoreNormalizationTemperature ?? 1.0,
  );

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
    const baseScore = normalizedScores[index];

    const priorityScore =
      baseScore * weights.similarity +
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

function normalizeScores(
  scores: number[],
  method: ScoreNormalization,
  temperature: number,
): number[] {
  if (scores.length === 0) return [];
  if (method === 'none') return [...scores];

  if (method === 'minMax') {
    let min = scores[0];
    let max = scores[0];
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < min) min = scores[i];
      if (scores[i] > max) max = scores[i];
    }
    if (max === min) return scores.map(() => 1);
    return scores.map((s) => (s - min) / (max - min));
  }

  if (method === 'zScore') {
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + (s - mean) * (s - mean), 0) / scores.length;
    const std = Math.sqrt(variance);
    if (std === 0) return scores.map(() => 0);
    return scores.map((s) => (s - mean) / std);
  }

  // softmax
  const temp = temperature <= 0 ? 1 : temperature;
  let max = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > max) max = scores[i];
  }
  const exps = scores.map((s) => Math.exp((s - max) / temp));
  const sum = exps.reduce((acc, v) => acc + v, 0);
  if (sum === 0) return scores.map(() => 0);
  return exps.map((v) => v / sum);
}
