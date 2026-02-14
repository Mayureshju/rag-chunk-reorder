import * as fc from 'fast-check';
import { keyPointRecall, keyPointPrecision, ndcg } from '../../src/evaluator';

// Feature: chunk-reordering-library — nDCG metric
// Validates: nDCG is in [0, 1] and equals 1.0 for perfectly sorted input
describe('nDCG metric', () => {
  it('should return a value in [0, 1] for any score array', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 30 }),
        (scores) => {
          const result = ndcg(scores);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1 + 1e-10); // small epsilon for float
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return 1.0 when scores are already in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 30 }),
        (scores) => {
          const sorted = [...scores].sort((a, b) => b - a);
          const result = ndcg(sorted);
          // When all scores are 0, iDCG is 0 and nDCG is defined as 0
          const allZero = scores.every((s) => s === 0);
          if (allZero) {
            expect(result).toBe(0);
          } else {
            expect(result).toBeCloseTo(1.0, 10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return 0 for empty input', () => {
    expect(ndcg([])).toBe(0);
  });
});

// Feature: chunk-reordering-library — case-insensitive evaluation
// Validates: caseInsensitive option works for recall and precision
describe('Case-insensitive evaluation', () => {
  it('keyPointRecall should find case-insensitive matches when enabled', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (keyPoints, chunkTexts) => {
          const ciResult = keyPointRecall(keyPoints, chunkTexts, { caseInsensitive: true });
          const csResult = keyPointRecall(keyPoints, chunkTexts, { caseInsensitive: false });

          // Case-insensitive recall should be >= case-sensitive recall
          expect(ciResult).toBeGreaterThanOrEqual(csResult - 1e-10);
          expect(ciResult).toBeGreaterThanOrEqual(0);
          expect(ciResult).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('keyPointPrecision should find case-insensitive matches when enabled', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (keyPoints, chunkTexts) => {
          const ciResult = keyPointPrecision(keyPoints, chunkTexts, { caseInsensitive: true });
          const csResult = keyPointPrecision(keyPoints, chunkTexts, { caseInsensitive: false });

          // Case-insensitive precision should be >= case-sensitive precision
          expect(ciResult).toBeGreaterThanOrEqual(csResult - 1e-10);
          expect(ciResult).toBeGreaterThanOrEqual(0);
          expect(ciResult).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
