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

  it('should call onRerankerError and fall back when reranker returns invalid chunks', async () => {
    const errors: unknown[] = [];
    const reranker: Reranker = {
      rerank: async (chunks) =>
        chunks.map((c, i) => ({ ...c, score: i === 0 ? NaN : c.score })),
    };

    const reorderer = new Reorderer({
      reranker,
      onRerankerError: (err) => errors.push(err),
    });

    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
    ];

    const result = await reorderer.reorder(chunks, 'test query');
    const expected = new Reorderer().reorderSync(chunks);

    expect(errors.length).toBe(1);
    expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should accept reranker returning separate scores', async () => {
    const reranker: Reranker = {
      rerank: async (chunks) => ({
        chunks,
        scores: chunks.map((c) => c.score + 0.2),
      }),
    };

    const reorderer = new Reorderer({ reranker });
    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.4 },
      { id: 'b', text: 'B', score: 0.3 },
    ];

    const result = await reorderer.reorder(chunks, 'query');
    expect(result.some((c) => c.score > 0.4)).toBe(true);
  });

  it('should batch reranker calls and respect concurrency', async () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
      { id: 'c', text: 'C', score: 0.7 },
      { id: 'd', text: 'D', score: 0.6 },
      { id: 'e', text: 'E', score: 0.5 },
    ];

    let active = 0;
    let maxActive = 0;
    let callCount = 0;
    const reranker: Reranker = {
      rerank: async (batch) => {
        callCount += 1;
        active += 1;
        if (active > maxActive) maxActive = active;
        await new Promise((resolve) => setTimeout(resolve, 20));
        active -= 1;
        return batch;
      },
    };

    const reorderer = new Reorderer({
      reranker,
      rerankerBatchSize: 2,
      rerankerConcurrency: 2,
    });

    const result = await reorderer.reorder(chunks, 'query');
    expect(result.length).toBe(chunks.length);
    expect(callCount).toBe(3);
    expect(maxActive).toBeGreaterThanOrEqual(2);
  });

  it('should report late reranker rejection after timeout', async () => {
    const errors: Error[] = [];
    const reranker: Reranker = {
      rerank: async () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('late boom')), 30);
        }),
    };

    const reorderer = new Reorderer({
      reranker,
      rerankerTimeoutMs: 5,
      onRerankerError: (err) => errors.push(err as Error),
    });

    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
    ];

    await reorderer.reorder(chunks, 'query');
    await new Promise((resolve) => setTimeout(resolve, 60));

    const messages = errors.map((e) => e.message);
    expect(messages.some((m) => m.includes('timed out'))).toBe(true);
    expect(messages.some((m) => m.includes('rejected after timeout'))).toBe(true);
  });
});

// Feature: chunk-reordering-library — onTraceStep timings
// Validates: per-step timing hook fires for sync and async paths
describe('onTraceStep timings', () => {
  it('should emit core steps for sync reorder', () => {
    const steps: Array<{ step: string; ms: number; details?: Record<string, unknown> }> = [];
    const reorderer = new Reorderer({
      minScore: 0.1,
      deduplicate: true,
      maxTokens: 4,
      tokenCounter: (text: string) => text.length,
      topK: 2,
      minTopK: 2,
      onTraceStep: (step, ms, details) => {
        steps.push({ step, ms, details });
      },
    });

    const chunks: Chunk[] = [
      { id: 'a', text: 'dup', score: 0.9 },
      { id: 'b', text: 'dup', score: 0.8 },
      { id: 'c', text: 'C', score: 0.7 },
    ];

    reorderer.reorderSync(chunks);
    const stepSet = new Set(steps.map((s) => s.step));
    expect(stepSet.has('minScore')).toBe(true);
    expect(stepSet.has('dedup')).toBe(true);
    expect(stepSet.has('score')).toBe(true);
    expect(stepSet.has('strategy')).toBe(true);
    expect(stepSet.has('budget')).toBe(true);
    for (const s of steps) {
      expect(typeof s.ms).toBe('number');
      expect(s.ms).toBeGreaterThanOrEqual(0);
    }

    const minScoreDetails = steps.find((s) => s.step === 'minScore')?.details;
    expect(minScoreDetails).toBeDefined();
    expect(typeof minScoreDetails?.before).toBe('number');
    expect(typeof minScoreDetails?.after).toBe('number');

    const dedupDetails = steps.find((s) => s.step === 'dedup')?.details;
    expect(dedupDetails).toBeDefined();
    expect(typeof dedupDetails?.before).toBe('number');
    expect(typeof dedupDetails?.after).toBe('number');

    const budgetDetails = steps.find((s) => s.step === 'budget')?.details;
    expect(budgetDetails).toBeDefined();
    expect(typeof budgetDetails?.before).toBe('number');
    expect(typeof budgetDetails?.after).toBe('number');
    expect(typeof budgetDetails?.packing).toBe('string');
  });

  it('should emit reranker timing for async reorder', async () => {
    const steps: Array<{ step: string; ms: number; details?: Record<string, unknown> }> = [];
    const reranker: Reranker = {
      rerank: async (batch) => batch,
    };

    const reorderer = new Reorderer({
      reranker,
      rerankerBatchSize: 1,
      rerankerConcurrency: 1,
      onTraceStep: (step, ms, details) => steps.push({ step, ms, details }),
    });

    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
    ];

    await reorderer.reorder(chunks, 'query');
    const stepSet = new Set(steps.map((s) => s.step));
    expect(stepSet.has('reranker')).toBe(true);
    const rerankerDetails = steps.find((s) => s.step === 'reranker')?.details;
    expect(rerankerDetails).toBeDefined();
    expect(rerankerDetails?.batchSize).toBe(1);
    expect(rerankerDetails?.concurrency).toBe(1);
  });

  it('should pass validateRerankerOutputLength guard', async () => {
    const errors: Error[] = [];
    const reranker: Reranker = {
      rerank: async (batch) => batch.slice(0, Math.max(0, batch.length - 1)),
    };

    const reorderer = new Reorderer({
      reranker,
      onRerankerError: (err) => errors.push(err as Error),
    });

    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
      { id: 'c', text: 'C', score: 0.7 },
    ];

    const result = await reorderer.reorder(chunks, 'query');
    const expected = new Reorderer().reorderSync(chunks);

    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('reranker returned');
    expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should guard against reranker output order changes', async () => {
    const errors: Error[] = [];
    const reranker: Reranker = {
      rerank: async (batch) => [...batch].reverse(),
    };

    const reorderer = new Reorderer({
      reranker,
      onRerankerError: (err) => errors.push(err as Error),
    });

    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
      { id: 'c', text: 'C', score: 0.7 },
    ];

    const result = await reorderer.reorder(chunks, 'query');
    const expected = new Reorderer().reorderSync(chunks);

    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('output order');
    expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should enforce strict index order when configured', async () => {
    const errors: Error[] = [];
    const reranker: Reranker = {
      rerank: async (batch) => [batch[1], batch[0]],
    };

    const reorderer = new Reorderer({
      reranker,
      validateRerankerOutputOrder: false,
      validateRerankerOutputOrderByIndex: true,
      onRerankerError: (err) => errors.push(err as Error),
    });

    const chunks: Chunk[] = [
      { id: 'dup', text: 'A', score: 0.9 },
      { id: 'dup', text: 'B', score: 0.8 },
    ];

    const result = await reorderer.reorder(chunks, 'query');
    const expected = new Reorderer().reorderSync(chunks);

    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('output order');
    expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should require unique metadata.chunkId for strict order with duplicate chunks', async () => {
    const errors: Error[] = [];
    const reranker: Reranker = {
      rerank: async (batch) => batch,
    };

    const reorderer = new Reorderer({
      reranker,
      validateRerankerOutputOrderByIndex: true,
      onRerankerError: (err) => errors.push(err as Error),
    });

    const chunks: Chunk[] = [
      { id: 'dup', text: 'same', score: 0.9 },
      { id: 'dup', text: 'same', score: 0.8 },
    ];

    const result = await reorderer.reorder(chunks, 'query');
    const expected = new Reorderer().reorderSync(chunks);

    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('metadata.chunkId');
    expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should throw early on invalid scores in reranker score array', async () => {
    const errors: Error[] = [];
    const reranker: Reranker = {
      rerank: async (batch) => ({
        chunks: batch,
        scores: batch.map((_, i) => (i === 0 ? NaN : 0.5)),
      }),
    };

    const reorderer = new Reorderer({
      reranker,
      onRerankerError: (err) => errors.push(err as Error),
    });

    const chunks: Chunk[] = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
    ];

    const result = await reorderer.reorder(chunks, 'query');
    const expected = new Reorderer().reorderSync(chunks);

    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('invalid score');
    expect(result.map((c) => c.id)).toEqual(expected.map((c) => c.id));
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

// Feature: chunk-reordering-library — getConfig auto/diversity immutability
// Validates: mutating autoStrategy/diversity in getConfig() does not affect the instance
describe('getConfig auto/diversity immutability', () => {
  it('should not affect instance when autoStrategy/diversity are mutated', () => {
    const reorderer = new Reorderer({
      strategy: 'auto',
      autoStrategy: { temporalQueryTerms: ['when'] },
      diversity: { enabled: true, lambda: 0.8 },
    });

    const configCopy = reorderer.getConfig();
    configCopy.autoStrategy!.temporalQueryTerms!.push('timeline');
    configCopy.diversity!.lambda = 0.1;

    const afterMutation = reorderer.getConfig();
    expect(afterMutation.autoStrategy!.temporalQueryTerms).toEqual(['when']);
    expect(afterMutation.diversity!.lambda).toBe(0.8);
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

// Feature: chunk-reordering-library — custom -> auto override compatibility
// Validates: per-call strategy overrides should not fail due stale customComparator
describe('custom strategy override to auto', () => {
  it('should allow overriding custom strategy instance to auto per-call', async () => {
    const reorderer = new Reorderer({
      strategy: 'custom',
      customComparator: (a, b) => b.score - a.score,
    });

    const chunks: Chunk[] = [
      { id: '1', text: 'A', score: 0.9, metadata: { timestamp: 2 } },
      { id: '2', text: 'B', score: 0.8, metadata: { timestamp: 1 } },
    ];

    await expect(
      reorderer.reorder(chunks, 'When did this happen?', { strategy: 'auto' }),
    ).resolves.toHaveLength(2);

    expect(() =>
      reorderer.reorderSync(chunks, { strategy: 'auto' }),
    ).not.toThrow();
  });
});
