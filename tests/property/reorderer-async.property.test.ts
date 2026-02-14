import * as fc from 'fast-check';
import { Reorderer } from '../../src/reorderer';
import { Chunk, Reranker } from '../../src/types';

const chunkArb: fc.Arbitrary<Chunk> = fc.record({
  id: fc.string({ minLength: 1 }),
  text: fc.string({ minLength: 1 }),
  score: fc.double({ min: 0, max: 1, noNaN: true }),
});

// Feature: chunk-reordering-library — onRerankerError callback
// Validates: reranker errors are caught and forwarded to onRerankerError, fallback to original scores
describe('onRerankerError callback', () => {
  it('should call onRerankerError and fall back to original scores when reranker throws', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(chunkArb, { minLength: 1, maxLength: 15 }),
        async (chunks) => {
          const errors: unknown[] = [];
          const failingReranker: Reranker = {
            rerank: async () => {
              throw new Error('reranker failed');
            },
          };

          const reorderer = new Reorderer({
            reranker: failingReranker,
            onRerankerError: (err) => errors.push(err),
          });

          const result = await reorderer.reorder(chunks, 'test query');

          // Error callback should have been called
          expect(errors.length).toBe(1);
          expect((errors[0] as Error).message).toBe('reranker failed');

          // Result should still contain all chunks (fallback to original scores)
          expect(result.length).toBe(chunks.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — includePriorityScore option
// Validates: priorityScore is included in output metadata when enabled
describe('includePriorityScore option', () => {
  it('should include priorityScore in metadata when enabled', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 20 }),
        (chunks) => {
          const reorderer = new Reorderer({ includePriorityScore: true });
          const result = reorderer.reorderSync(chunks);

          for (const chunk of result) {
            expect(chunk.metadata).toBeDefined();
            expect(typeof (chunk.metadata as Record<string, unknown>).priorityScore).toBe('number');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should NOT include priorityScore in metadata when disabled', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 20 }),
        (chunks) => {
          const reorderer = new Reorderer({ includePriorityScore: false });
          const result = reorderer.reorderSync(chunks);

          for (const chunk of result) {
            if (chunk.metadata) {
              expect((chunk.metadata as Record<string, unknown>).priorityScore).toBeUndefined();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — config overrides on methods
// Validates: per-call overrides work without mutating the Reorderer instance
describe('Per-call config overrides', () => {
  it('should apply overrides without mutating the instance config', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 15 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (chunks, minScore) => {
          const reorderer = new Reorderer(); // no minScore

          const withOverride = reorderer.reorderSync(chunks, { minScore });
          const withoutOverride = reorderer.reorderSync(chunks);

          // Override should filter, base should not
          for (const c of withOverride) {
            expect(c.score).toBeGreaterThanOrEqual(minScore);
          }
          expect(withoutOverride.length).toBe(chunks.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — getConfig returns independent copy
// Validates: mutating getConfig() result does not affect the Reorderer instance
describe('getConfig immutability', () => {
  it('should return a copy that does not affect the instance when mutated', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 10 }),
        (chunks) => {
          const reorderer = new Reorderer({ minScore: 0.5 });

          const configCopy = reorderer.getConfig();
          configCopy.minScore = 0;
          configCopy.strategy = 'chronological';

          // Instance config should be unaffected
          const afterMutation = reorderer.getConfig();
          expect(afterMutation.minScore).toBe(0.5);
          expect(afterMutation.strategy).toBe('scoreSpread');

          // Reorder should still use original config
          const result = reorderer.reorderSync(chunks);
          for (const c of result) {
            expect(c.score).toBeGreaterThanOrEqual(0.5);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — reorderStream with reranker error
// Validates: streaming mode correctly handles reranker errors and falls back
describe('reorderStream with reranker error', () => {
  it('should stream results using fallback scores when reranker fails', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(chunkArb, { minLength: 1, maxLength: 15 }),
        async (chunks) => {
          const errors: unknown[] = [];
          const failingReranker: Reranker = {
            rerank: async () => {
              throw new Error('stream reranker failed');
            },
          };

          const reorderer = new Reorderer({
            reranker: failingReranker,
            onRerankerError: (err) => errors.push(err),
          });

          const streamResult: Chunk[] = [];
          for await (const chunk of reorderer.reorderStream(chunks, 'test query')) {
            streamResult.push(chunk);
          }

          // Error callback should have been called
          expect(errors.length).toBe(1);
          expect((errors[0] as Error).message).toBe('stream reranker failed');

          // All chunks should still be present (fallback)
          expect(streamResult.length).toBe(chunks.length);

          // Stream result should match sync result (since reranker failed, same as no reranker)
          const syncResult = reorderer.reorderSync(chunks);
          for (let i = 0; i < syncResult.length; i++) {
            expect(streamResult[i].id).toBe(syncResult[i].id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — async reorder with overrides
// Validates: reorder() async path correctly applies per-call overrides (minScore, strategy, etc.)
describe('reorder() async with overrides', () => {
  it('should apply minScore override in async path', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(chunkArb, { minLength: 1, maxLength: 15 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (chunks, minScore) => {
          const reorderer = new Reorderer(); // no minScore in base config

          const result = await reorderer.reorder(chunks, 'test query', { minScore });

          // All output chunks must have score >= minScore
          for (const c of result) {
            expect(c.score).toBeGreaterThanOrEqual(minScore);
          }

          // Should match sync behavior with same override
          const syncResult = reorderer.reorderSync(chunks, { minScore });
          expect(result.length).toBe(syncResult.length);
          for (let i = 0; i < result.length; i++) {
            expect(result[i].id).toBe(syncResult[i].id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — getConfig deep immutability
// Validates: mutating nested weights in getConfig() result does not affect the Reorderer instance
describe('getConfig nested weights immutability', () => {
  it('should not affect instance when nested weights are mutated', () => {
    const reorderer = new Reorderer({
      weights: { similarity: 0.8, time: 0.1, section: 0.1 },
    });

    const configCopy = reorderer.getConfig();
    configCopy.weights!.similarity = 999;
    configCopy.weights!.time = 999;

    // Instance config should be unaffected
    const afterMutation = reorderer.getConfig();
    expect(afterMutation.weights!.similarity).toBe(0.8);
    expect(afterMutation.weights!.time).toBe(0.1);
    expect(afterMutation.weights!.section).toBe(0.1);
  });
});

// Feature: chunk-reordering-library — reorder() validates overrides on empty input
// Validates: async reorder() validates overrides consistently with reorderSync()
describe('reorder() validates overrides on empty input', () => {
  it('should throw ValidationError for invalid overrides even when chunks is empty', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => !['scoreSpread', 'preserveOrder', 'chronological', 'custom'].includes(s)),
        async (invalidStrategy) => {
          const reorderer = new Reorderer();

          // Async path should reject invalid overrides on empty input
          await expect(
            reorderer.reorder([], 'query', { strategy: invalidStrategy as any }),
          ).rejects.toThrow();

          // Sync path should also reject (already works)
          expect(() =>
            reorderer.reorderSync([], { strategy: invalidStrategy as any }),
          ).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — reorderSync rejects reranker override
// Validates: reorderSync throws ValidationError when reranker is passed as override
describe('reorderSync rejects reranker override', () => {
  it('should throw ValidationError when reranker is passed to reorderSync', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 0, maxLength: 10 }),
        (chunks) => {
          const reorderer = new Reorderer();
          const dummyReranker: Reranker = {
            rerank: async (c) => c,
          };

          expect(() =>
            reorderer.reorderSync(chunks, { reranker: dummyReranker }),
          ).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should NOT throw when reranker is set in constructor (only affects async path)', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 10 }),
        (chunks) => {
          const dummyReranker: Reranker = {
            rerank: async (c) => c,
          };
          const reorderer = new Reorderer({ reranker: dummyReranker });

          // Constructor reranker is fine — it's only used in async reorder()
          const result = reorderer.reorderSync(chunks);
          expect(result.length).toBe(chunks.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
