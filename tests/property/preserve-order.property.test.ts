import * as fc from 'fast-check';
import { preserveOrder } from '../../src/strategies/preserve-order';
import { ScoredChunk } from '../../src/types';

const scoredChunkWithSourceArb = (index: number): fc.Arbitrary<ScoredChunk> =>
  fc.record({
    id: fc.constant(`chunk-${index}`),
    text: fc.constant(`text-${index}`),
    score: fc.double({ min: 0, max: 1, noNaN: true }),
    priorityScore: fc.double({ min: 0, max: 1, noNaN: true }),
    originalIndex: fc.constant(index),
    metadata: fc.record({
      sourceId: fc.constantFrom('doc-a', 'doc-b', 'doc-c'),
      sectionIndex: fc.integer({ min: 0, max: 50 }),
    }),
  });

function makeChunksWithSourceArb(min = 1, max = 30): fc.Arbitrary<ScoredChunk[]> {
  return fc
    .integer({ min, max })
    .chain((len) => fc.tuple(...Array.from({ length: len }, (_, i) => scoredChunkWithSourceArb(i))))
    .map((arr) => arr as ScoredChunk[]);
}

// Feature: chunk-reordering-library, Property 6: PreserveOrder maintains sectionIndex order within source groups
// Validates: Requirements 4.1, 4.2
describe('Property 6: PreserveOrder maintains sectionIndex order within source groups', () => {
  it('should produce non-decreasing sectionIndex within each sourceId group', () => {
    fc.assert(
      fc.property(makeChunksWithSourceArb(1, 30), (chunks) => {
        const result = preserveOrder(chunks);

        // Group result by sourceId
        const groups = new Map<string, ScoredChunk[]>();
        for (const chunk of result) {
          const sourceId = String(chunk.metadata?.sourceId ?? '');
          if (!groups.has(sourceId)) groups.set(sourceId, []);
          groups.get(sourceId)!.push(chunk);
        }

        // Within each group, sectionIndex should be non-decreasing
        for (const [, group] of groups) {
          for (let i = 1; i < group.length; i++) {
            const prevSec = group[i - 1].metadata?.sectionIndex ?? group[i - 1].originalIndex;
            const currSec = group[i].metadata?.sectionIndex ?? group[i].originalIndex;
            expect(currSec).toBeGreaterThanOrEqual(prevSec);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('PreserveOrder robustness with malformed sectionIndex values', () => {
  it('should fall back to originalIndex for non-finite sectionIndex values', () => {
    const chunks: ScoredChunk[] = [
      {
        id: 'bad',
        text: 'bad',
        score: 0.9,
        priorityScore: 0.9,
        originalIndex: 0,
        metadata: { sourceId: 'doc-a', sectionIndex: 'bad' as unknown as number },
      },
      {
        id: 'a',
        text: 'a',
        score: 0.8,
        priorityScore: 0.8,
        originalIndex: 1,
        metadata: { sourceId: 'doc-a', sectionIndex: 2 },
      },
      {
        id: 'b',
        text: 'b',
        score: 0.7,
        priorityScore: 0.7,
        originalIndex: 2,
        metadata: { sourceId: 'doc-a', sectionIndex: 1 },
      },
    ];

    const result = preserveOrder(chunks);
    expect(result.map((c) => c.id)).toEqual(['bad', 'b', 'a']);
  });
});

describe('PreserveOrder sourceId normalization', () => {
  it('should group chunks by primitive sourceId values after string coercion', () => {
    const chunks: ScoredChunk[] = [
      {
        id: 'a',
        text: 'a',
        score: 0.9,
        priorityScore: 0.9,
        originalIndex: 0,
        metadata: { sourceId: 42 as unknown as string, sectionIndex: 1 },
      },
      {
        id: 'b',
        text: 'b',
        score: 0.8,
        priorityScore: 0.8,
        originalIndex: 1,
        metadata: { sourceId: 42 as unknown as string, sectionIndex: 0 },
      },
      {
        id: 'c',
        text: 'c',
        score: 0.7,
        priorityScore: 0.7,
        originalIndex: 2,
        metadata: { sourceId: 'doc-x', sectionIndex: 0 },
      },
    ];

    const result = preserveOrder(chunks);
    // Within sourceId=42 group, section order should be preserved after coercion.
    expect(result.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });
});
