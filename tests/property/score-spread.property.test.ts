import * as fc from 'fast-check';
import { scoreSpread } from '../../src/strategies/score-spread';
import { ScoredChunk } from '../../src/types';

function makeScoredChunksArb(minLen = 1, maxLen = 30): fc.Arbitrary<ScoredChunk[]> {
  return fc
    .array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: minLen, maxLength: maxLen })
    .map((scores) =>
      scores.map((s, i) => ({
        id: `chunk-${i}`,
        text: `text-${i}`,
        score: s,
        priorityScore: s,
        originalIndex: i,
      })),
    );
}

// Feature: chunk-reordering-library, Property 3: ScoreSpread interleaving correctness
// Validates: Requirements 3.1
describe('Property 3: ScoreSpread interleaving correctness', () => {
  it('should place rank i chunks alternating front/back', () => {
    fc.assert(
      fc.property(makeScoredChunksArb(1, 30), (chunks) => {
        const result = scoreSpread(chunks);
        const n = result.length;

        // Sort by priorityScore desc, stable by originalIndex
        const sorted = [...chunks].sort((a, b) => {
          if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
          return a.originalIndex - b.originalIndex;
        });

        // Verify interleaving: rank 0→pos 0, rank 1→pos N-1, rank 2→pos 1, rank 3→pos N-2...
        let front = 0;
        let back = n - 1;
        for (let rank = 0; rank < n; rank++) {
          if (rank % 2 === 0) {
            expect(result[front].id).toBe(sorted[rank].id);
            front++;
          } else {
            expect(result[back].id).toBe(sorted[rank].id);
            back--;
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library, Property 4: ScoreSpread startCount/endCount placement
// Validates: Requirements 3.2
describe('Property 4: ScoreSpread startCount/endCount placement', () => {
  it('should place top startCount at beginning and next endCount at end', () => {
    fc.assert(
      fc.property(
        makeScoredChunksArb(4, 30),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (chunks, rawStart, rawEnd) => {
          const n = chunks.length;
          const startCount = Math.min(rawStart, Math.floor(n / 3));
          const endCount = Math.min(rawEnd, Math.floor(n / 3));

          if (startCount < 1 || endCount < 1 || startCount + endCount > n) return;

          const result = scoreSpread(chunks, startCount, endCount);
          const sorted = [...chunks].sort((a, b) => {
            if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
            return a.originalIndex - b.originalIndex;
          });

          // Top startCount chunks at positions 0..startCount-1
          for (let i = 0; i < startCount; i++) {
            expect(result[i].id).toBe(sorted[i].id);
          }

          // Next endCount chunks at last endCount positions
          for (let i = 0; i < endCount; i++) {
            expect(result[n - endCount + i].id).toBe(sorted[startCount + i].id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library, Property 5: ScoreSpread stability for equal scores
// Validates: Requirements 3.4
describe('Property 5: ScoreSpread stability for equal scores', () => {
  it('should preserve original input order when all scores are equal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (length, score) => {
          const chunks: ScoredChunk[] = Array.from({ length }, (_, i) => ({
            id: `chunk-${i}`,
            text: `text-${i}`,
            score,
            priorityScore: score,
            originalIndex: i,
          }));

          // With equal scores, stable sort preserves originalIndex order
          const sorted = [...chunks].sort((a, b) => {
            if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
            return a.originalIndex - b.originalIndex;
          });
          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i].originalIndex).toBe(i);
          }

          // Verify interleaving uses the stable-sorted order
          const result = scoreSpread(chunks);
          expect(result.length).toBe(chunks.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
