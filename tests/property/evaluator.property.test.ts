import * as fc from 'fast-check';
import { keyPointRecall, keyPointPrecision, positionEffectiveness } from '../../src/evaluator';
import { ScoredChunk } from '../../src/types';

// Feature: chunk-reordering-library, Property 13: Key-point recall formula
// Validates: Requirements 9.1
describe('Property 13: Key-point recall formula', () => {
  it('should equal count of found key points divided by total key points', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        (keyPoints, chunkTexts) => {
          const result = keyPointRecall(keyPoints, chunkTexts);

          const foundCount = keyPoints.filter((kp) =>
            chunkTexts.some((text) => text.includes(kp)),
          ).length;
          const expected = foundCount / keyPoints.length;

          expect(result).toBeCloseTo(expected, 10);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library, Property 14: Key-point precision formula
// Validates: Requirements 9.2
describe('Property 14: Key-point precision formula', () => {
  it('should equal count of chunks containing a key point divided by total chunks', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        (keyPoints, chunkTexts) => {
          const result = keyPointPrecision(keyPoints, chunkTexts);

          const matchingCount = chunkTexts.filter((text) =>
            keyPoints.some((kp) => text.includes(kp)),
          ).length;
          const expected = matchingCount / chunkTexts.length;

          expect(result).toBeCloseTo(expected, 10);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library, Property 15: Position effectiveness U-curve
// Validates: Requirements 9.3, 9.4
describe('Property 15: Position effectiveness U-curve', () => {
  it('should equal weighted sum of priorityScores with U-shaped weights, normalized', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 2, maxLength: 30 }),
        (scores) => {
          const chunks: ScoredChunk[] = scores.map((s, i) => ({
            id: `chunk-${i}`,
            text: `text-${i}`,
            score: s,
            priorityScore: s,
            originalIndex: i,
          }));

          const result = positionEffectiveness(chunks);

          const n = chunks.length;
          const mid = (n - 1) / 2;
          let weightedSum = 0;
          let weightSum = 0;
          for (let i = 0; i < n; i++) {
            const w = ((i - mid) * (i - mid)) / (mid * mid);
            weightedSum += chunks[i].priorityScore * w;
            weightSum += w;
          }
          const expected = weightedSum / weightSum;

          expect(result).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
