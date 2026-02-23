import * as fc from 'fast-check';
import { groupChunks, orderGroups } from '../../src/grouper';
import { ScoredChunk } from '../../src/types';

function makeGroupableChunksArb(min = 1, max = 30): fc.Arbitrary<ScoredChunk[]> {
  return fc
    .array(
      fc.record({
        score: fc.double({ min: 0, max: 1, noNaN: true }),
        sourceId: fc.option(fc.constantFrom('doc-a', 'doc-b', 'doc-c'), { nil: undefined }),
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
        metadata: item.sourceId !== undefined ? { sourceId: item.sourceId } : {},
      })),
    );
}

// Feature: chunk-reordering-library, Property 10: Grouper partitioning correctness
// Validates: Requirements 7.1
describe('Property 10: Grouper partitioning correctness', () => {
  it('should partition chunks so all in a group share the same field value, and no chunks are lost', () => {
    fc.assert(
      fc.property(makeGroupableChunksArb(1, 30), (chunks) => {
        const groups = groupChunks(chunks, 'sourceId');

        // Every chunk in a group shares the same sourceId
        for (const [key, group] of groups) {
          for (const chunk of group) {
            const value = chunk.metadata?.sourceId;
            if (key === '__default__') {
              expect(value).toBeUndefined();
            } else {
              expect(String(value)).toBe(key);
            }
          }
        }

        // Union of all groups equals original set (no lost or duplicated chunks)
        const allIds = Array.from(groups.values())
          .flat()
          .map((c) => c.id)
          .sort();
        const originalIds = chunks.map((c) => c.id).sort();
        expect(allIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Grouper default group key collisions', () => {
  it('should keep missing-field chunks separate from literal "__default__" values', () => {
    const chunks: ScoredChunk[] = [
      {
        id: 'missing',
        text: 'missing',
        score: 0.8,
        priorityScore: 0.8,
        originalIndex: 0,
        metadata: {},
      },
      {
        id: 'literal',
        text: 'literal',
        score: 0.7,
        priorityScore: 0.7,
        originalIndex: 1,
        metadata: { customGroup: '__default__' },
      },
    ];

    const groups = groupChunks(chunks, 'customGroup');
    expect(groups.size).toBe(2);

    const entries = Array.from(groups.entries());
    const missingEntry = entries.find(([, group]) => group.some((chunk) => chunk.id === 'missing'));
    const literalEntry = entries.find(([, group]) => group.some((chunk) => chunk.id === 'literal'));

    expect(missingEntry).toBeDefined();
    expect(literalEntry).toBeDefined();
    expect(missingEntry![0]).not.toBe('__default__');
    expect(literalEntry![0]).toBe('__default__');
  });
});

// Feature: chunk-reordering-library, Property 12: Cross-group ordering by max score
// Validates: Requirements 7.3
describe('Property 12: Cross-group ordering by max score', () => {
  it('should order groups by highest priorityScore descending', () => {
    fc.assert(
      fc.property(makeGroupableChunksArb(2, 30), (chunks) => {
        const groups = groupChunks(chunks, 'sourceId');
        const ordered = orderGroups(groups);

        for (let i = 1; i < ordered.length; i++) {
          const maxPrev = Math.max(...ordered[i - 1][1].map((c) => c.priorityScore));
          const maxCurr = Math.max(...ordered[i][1].map((c) => c.priorityScore));
          expect(maxPrev).toBeGreaterThanOrEqual(maxCurr);
        }
      }),
      { numRuns: 100 },
    );
  });
});
