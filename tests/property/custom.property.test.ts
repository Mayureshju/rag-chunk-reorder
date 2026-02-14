import * as fc from 'fast-check';
import { customSort } from '../../src/strategies/custom';
import { ScoredChunk } from '../../src/types';

function makeChunksArb(min = 1, max = 30): fc.Arbitrary<ScoredChunk[]> {
  return fc
    .array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: min, maxLength: max })
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

// Feature: chunk-reordering-library, Property 9: Custom comparator equivalence
// Validates: Requirements 6.1
describe('Property 9: Custom comparator equivalence', () => {
  it('should produce the same ordering as Array.prototype.sort with the same comparator', () => {
    const comparator = (a: { score: number }, b: { score: number }) => a.score - b.score;

    fc.assert(
      fc.property(makeChunksArb(0, 30), (chunks) => {
        const result = customSort(chunks, comparator);
        const expected = [...chunks].sort(comparator);

        expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
      }),
      { numRuns: 100 },
    );
  });
});
