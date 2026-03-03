import * as fc from 'fast-check';
import { chronological } from '../../src/strategies/chronological';
import { ScoredChunk } from '../../src/types';

function makeChunksWithTimestampArb(min = 1, max = 30): fc.Arbitrary<ScoredChunk[]> {
  return fc
    .array(
      fc.record({
        score: fc.double({ min: 0, max: 1, noNaN: true }),
        timestamp: fc.double({ min: 0, max: 1e9, noNaN: true }),
      }),
      { minLength: min, maxLength: max },
    )
    .map((items) =>
      items.map((item, i) => ({
        id: `chunk-${i}`,
        text: `text-${i}`,
        score: item.score,
        priorityScore: item.score,
        originalIndex: i,
        metadata: { timestamp: item.timestamp },
      })),
    );
}

// Feature: chunk-reordering-library, Property 7: Chronological ascending order
// Validates: Requirements 5.1
describe('Property 7: Chronological ascending order', () => {
  it('should produce non-decreasing timestamps in output', () => {
    fc.assert(
      fc.property(makeChunksWithTimestampArb(1, 30), (chunks) => {
        const result = chronological(chunks);

        for (let i = 1; i < result.length; i++) {
          const prevTs = result[i - 1].metadata?.timestamp ?? Infinity;
          const currTs = result[i].metadata?.timestamp ?? Infinity;
          expect(currTs).toBeGreaterThanOrEqual(prevTs);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Chronological descending order', () => {
  it('should produce non-increasing timestamps in output', () => {
    fc.assert(
      fc.property(makeChunksWithTimestampArb(1, 30), (chunks) => {
        const result = chronological(chunks, 'desc');

        for (let i = 1; i < result.length; i++) {
          const prevTs = result[i - 1].metadata?.timestamp ?? -Infinity;
          const currTs = result[i].metadata?.timestamp ?? -Infinity;
          expect(currTs).toBeLessThanOrEqual(prevTs);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library, Property 8: Chronological tie-breaking by priority
// Validates: Requirements 5.2
describe('Property 8: Chronological tie-breaking by priority', () => {
  it('should order chunks with same timestamp by priorityScore descending', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e9, noNaN: true }),
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 2, maxLength: 20 }),
        (sharedTimestamp, scores) => {
          const chunks: ScoredChunk[] = scores.map((s, i) => ({
            id: `chunk-${i}`,
            text: `text-${i}`,
            score: s,
            priorityScore: s,
            originalIndex: i,
            metadata: { timestamp: sharedTimestamp },
          }));

          const result = chronological(chunks);

          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].priorityScore).toBeGreaterThanOrEqual(result[i].priorityScore);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Chronological robustness with malformed timestamps', () => {
  it('should treat non-finite timestamps as missing and place those chunks at the end', () => {
    const chunks: ScoredChunk[] = [
      {
        id: 'bad',
        text: 'bad',
        score: 0.9,
        priorityScore: 0.9,
        originalIndex: 0,
        metadata: { timestamp: 'bad' as unknown as number },
      },
      {
        id: 'a',
        text: 'a',
        score: 0.8,
        priorityScore: 0.8,
        originalIndex: 1,
        metadata: { timestamp: 100 },
      },
      {
        id: 'b',
        text: 'b',
        score: 0.7,
        priorityScore: 0.7,
        originalIndex: 2,
        metadata: { timestamp: 200 },
      },
    ];

    const result = chronological(chunks);
    expect(result.map((c) => c.id)).toEqual(['a', 'b', 'bad']);
  });
});
