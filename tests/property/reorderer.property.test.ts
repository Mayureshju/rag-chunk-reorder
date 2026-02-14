import * as fc from 'fast-check';
import { Reorderer } from '../../src/reorderer';
import { Chunk, Strategy } from '../../src/types';

const chunkArb: fc.Arbitrary<Chunk> = fc.record({
  id: fc.string({ minLength: 1 }),
  text: fc.string(),
  score: fc.double({ min: 0, max: 1, noNaN: true }),
  metadata: fc.option(
    fc.record({
      timestamp: fc.option(fc.double({ min: 0, max: 1e9, noNaN: true }), { nil: undefined }),
      sectionIndex: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
      sourceId: fc.option(fc.constantFrom('doc-a', 'doc-b'), { nil: undefined }),
    }),
    { nil: undefined },
  ),
});

// Feature: chunk-reordering-library, Property 18: Streaming consistency with sync
// Validates: Requirements 12.2
describe('Property 18: Streaming consistency with sync', () => {
  it('should produce the same ordered array from reorderStream as reorderSync', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(chunkArb, { minLength: 0, maxLength: 20 }),
        fc.constantFrom('scoreSpread', 'preserveOrder', 'chronological') as fc.Arbitrary<Strategy>,
        async (chunks, strategy) => {
          const reorderer = new Reorderer({ strategy });

          const syncResult = reorderer.reorderSync(chunks);

          const streamResult: Chunk[] = [];
          for await (const chunk of reorderer.reorderStream(chunks)) {
            streamResult.push(chunk);
          }

          expect(streamResult.length).toBe(syncResult.length);
          for (let i = 0; i < syncResult.length; i++) {
            expect(streamResult[i].id).toBe(syncResult[i].id);
            expect(streamResult[i].score).toBe(syncResult[i].score);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
