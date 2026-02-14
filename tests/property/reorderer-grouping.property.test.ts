import * as fc from 'fast-check';
import { Reorderer } from '../../src/reorderer';
import { Chunk } from '../../src/types';

function makeGroupedChunksArb(min = 2, max = 20): fc.Arbitrary<Chunk[]> {
  return fc
    .array(
      fc.record({
        score: fc.double({ min: 0, max: 1, noNaN: true }),
        sourceId: fc.constantFrom('doc-a', 'doc-b', 'doc-c'),
        sectionIndex: fc.integer({ min: 0, max: 50 }),
      }),
      { minLength: min, maxLength: max },
    )
    .map((items) =>
      items.map((item, i) => ({
        id: `chunk-${i}`,
        text: `text-${i}`,
        score: item.score,
        metadata: { sourceId: item.sourceId, sectionIndex: item.sectionIndex },
      })),
    );
}

// Feature: chunk-reordering-library, Property 11: Within-group strategy application
// Validates: Requirements 7.2
describe('Property 11: Within-group strategy application', () => {
  it('should produce the same within-group ordering as applying strategy to each group in isolation', () => {
    fc.assert(
      fc.property(makeGroupedChunksArb(2, 20), (chunks) => {
        // Reorder with grouping
        const grouped = new Reorderer({
          strategy: 'scoreSpread',
          groupBy: 'sourceId',
        });
        const groupedResult = grouped.reorderSync(chunks);

        // Reorder each group in isolation
        const groups = new Map<string, Chunk[]>();
        for (const chunk of chunks) {
          const key = chunk.metadata?.sourceId ?? '__default__';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(chunk);
        }

        const isolatedResults = new Map<string, Chunk[]>();
        for (const [key, group] of groups) {
          const r = new Reorderer({ strategy: 'scoreSpread' });
          isolatedResults.set(key, r.reorderSync(group));
        }

        // Extract groups from the grouped result
        const resultGroups = new Map<string, Chunk[]>();
        for (const chunk of groupedResult) {
          const key = chunk.metadata?.sourceId ?? '__default__';
          if (!resultGroups.has(key)) resultGroups.set(key, []);
          resultGroups.get(key)!.push(chunk);
        }

        // Within each group, the ordering should match the isolated result
        for (const [key, isolated] of isolatedResults) {
          const fromGrouped = resultGroups.get(key) ?? [];
          expect(fromGrouped.length).toBe(isolated.length);
          for (let i = 0; i < isolated.length; i++) {
            expect(fromGrouped[i].id).toBe(isolated[i].id);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
