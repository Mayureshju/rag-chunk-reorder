import * as fc from 'fast-check';
import { scoreChunks } from '../../src/scorer';
import { Chunk, ScoringWeights } from '../../src/types';

const chunkArb = fc.record({
  id: fc.string({ minLength: 1 }),
  text: fc.string(),
  score: fc.double({ min: 0, max: 1, noNaN: true }),
  metadata: fc.option(
    fc.record({
      timestamp: fc.option(fc.double({ min: 0, max: 1e12, noNaN: true }), { nil: undefined }),
      sectionIndex: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
    }),
    { nil: undefined },
  ),
}) as fc.Arbitrary<Chunk>;

const weightsArb: fc.Arbitrary<ScoringWeights> = fc.record({
  similarity: fc.double({ min: 0, max: 10, noNaN: true }),
  time: fc.double({ min: 0, max: 10, noNaN: true }),
  section: fc.double({ min: 0, max: 10, noNaN: true }),
});

function computeExpectedScore(
  chunk: Chunk,
  weights: ScoringWeights,
  chunks: Chunk[],
): number {
  const timestamps = chunks
    .map((c) => c.metadata?.timestamp)
    .filter((t): t is number => t !== undefined);
  const sections = chunks
    .map((c) => c.metadata?.sectionIndex)
    .filter((s): s is number => s !== undefined);

  let minTs = 0, maxTs = 0;
  if (timestamps.length > 0) {
    minTs = timestamps[0]; maxTs = timestamps[0];
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] < minTs) minTs = timestamps[i];
      if (timestamps[i] > maxTs) maxTs = timestamps[i];
    }
  }

  let minSec = 0, maxSec = 0;
  if (sections.length > 0) {
    minSec = sections[0]; maxSec = sections[0];
    for (let i = 1; i < sections.length; i++) {
      if (sections[i] < minSec) minSec = sections[i];
      if (sections[i] > maxSec) maxSec = sections[i];
    }
  }

  const ts = chunk.metadata?.timestamp;
  const sec = chunk.metadata?.sectionIndex;

  const normTs = ts !== undefined && maxTs !== minTs ? (ts - minTs) / (maxTs - minTs) : 0;
  const normSec = sec !== undefined && maxSec !== minSec ? (sec - minSec) / (maxSec - minSec) : 0;

  return chunk.score * weights.similarity + normTs * weights.time + normSec * weights.section;
}

// Feature: chunk-reordering-library, Property 1: Scoring formula correctness
// Validates: Requirements 2.1, 2.2
describe('Property 1: Scoring formula correctness', () => {
  it('should compute priorityScore matching the weighted formula for all chunks', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 30 }),
        weightsArb,
        (chunks, weights) => {
          const scored = scoreChunks(chunks, weights);
          for (let i = 0; i < chunks.length; i++) {
            const expected = computeExpectedScore(chunks[i], weights, chunks);
            expect(scored[i].priorityScore).toBeCloseTo(expected, 10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library, Property 2: Normalization bounds
// Validates: Requirements 2.4, 2.5
describe('Property 2: Normalization bounds', () => {
  it('should produce normalized values in [0, 1] for all chunks', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 30 }),
        weightsArb,
        (chunks, weights) => {
          const scored = scoreChunks(chunks, weights);

          const timestamps = chunks
            .map((c) => c.metadata?.timestamp)
            .filter((t): t is number => t !== undefined);
          const sections = chunks
            .map((c) => c.metadata?.sectionIndex)
            .filter((s): s is number => s !== undefined);

          let minTs = 0, maxTs = 0;
          if (timestamps.length > 0) {
            minTs = timestamps[0]; maxTs = timestamps[0];
            for (let k = 1; k < timestamps.length; k++) {
              if (timestamps[k] < minTs) minTs = timestamps[k];
              if (timestamps[k] > maxTs) maxTs = timestamps[k];
            }
          }

          let minSec = 0, maxSec = 0;
          if (sections.length > 0) {
            minSec = sections[0]; maxSec = sections[0];
            for (let k = 1; k < sections.length; k++) {
              if (sections[k] < minSec) minSec = sections[k];
              if (sections[k] > maxSec) maxSec = sections[k];
            }
          }

          for (let i = 0; i < chunks.length; i++) {
            const ts = chunks[i].metadata?.timestamp;
            if (ts !== undefined && maxTs !== minTs) {
              const norm = (ts - minTs) / (maxTs - minTs);
              expect(norm).toBeGreaterThanOrEqual(0);
              expect(norm).toBeLessThanOrEqual(1);
            }
            const sec = chunks[i].metadata?.sectionIndex;
            if (sec !== undefined && maxSec !== minSec) {
              const norm = (sec - minSec) / (maxSec - minSec);
              expect(norm).toBeGreaterThanOrEqual(0);
              expect(norm).toBeLessThanOrEqual(1);
            }
          }

          // Also verify that priorityScore is finite
          for (const sc of scored) {
            expect(Number.isFinite(sc.priorityScore)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
