import * as fc from 'fast-check';
import { Reorderer } from '../../src/reorderer';
import { Chunk } from '../../src/types';

const chunkArb: fc.Arbitrary<Chunk> = fc.record({
  id: fc.string({ minLength: 1 }),
  text: fc.string({ minLength: 1 }),
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

// Feature: chunk-reordering-library — minScore filtering
// Validates: chunks below minScore are dropped before reordering
describe('minScore filtering', () => {
  it('should exclude all chunks with score below minScore', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 30 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (chunks, minScore) => {
          const reorderer = new Reorderer({ minScore });
          const result = reorderer.reorderSync(chunks);

          // Every output chunk must have score >= minScore
          for (const chunk of result) {
            expect(chunk.score).toBeGreaterThanOrEqual(minScore);
          }

          // Count of chunks with score >= minScore in input should match output length
          const eligible = chunks.filter((c) => c.score >= minScore);
          expect(result.length).toBe(eligible.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — maxTokens token budget
// Validates: output respects token budget and preserves order
describe('maxTokens token budget', () => {
  it('should not exceed maxTokens and preserve reorder order', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 500 }),
        (chunks, maxTokens) => {
          const tokenCounter = (text: string) => text.length;
          const reorderer = new Reorderer({ maxTokens, tokenCounter });
          const result = reorderer.reorderSync(chunks);

          // Total tokens should not exceed budget
          const totalTokens = result.reduce((sum, c) => sum + tokenCounter(c.text), 0);
          expect(totalTokens).toBeLessThanOrEqual(maxTokens);

          // Result should be a prefix of the full reorder (token budget trims from the end)
          const fullReorderer = new Reorderer();
          const fullResult = fullReorderer.reorderSync(chunks);
          for (let i = 0; i < result.length; i++) {
            expect(result[i].id).toBe(fullResult[i].id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — deduplicate integration in pipeline
// Validates: deduplication removes exact duplicates before reordering
describe('Deduplication in Reorderer pipeline', () => {
  it('should remove exact duplicate texts when deduplicate is enabled', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 20 }),
        (chunks) => {
          const reorderer = new Reorderer({ deduplicate: true });
          const result = reorderer.reorderSync(chunks);

          // No two output chunks should share the same text
          const texts = result.map((c) => c.text);
          const uniqueTexts = new Set(texts);
          expect(texts.length).toBe(uniqueTexts.size);

          // Output length should equal unique text count from input
          const inputUniqueTexts = new Set(chunks.map((c) => c.text));
          expect(result.length).toBe(inputUniqueTexts.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should NOT remove duplicates when deduplicate is not set', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 20 }),
        (chunks) => {
          const reorderer = new Reorderer();
          const result = reorderer.reorderSync(chunks);

          // Output length should equal input length (no dedup)
          expect(result.length).toBe(chunks.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — groupBy combined with minScore and deduplicate
// Validates: pipeline stages interact correctly (filter → dedup → score → group → strategy)
describe('groupBy combined with minScore and deduplicate', () => {
  it('should filter, deduplicate, then group correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            text: fc.string({ minLength: 1 }),
            score: fc.double({ min: 0, max: 1, noNaN: true }),
            metadata: fc.record({
              sourceId: fc.constantFrom('doc-a', 'doc-b', 'doc-c'),
              sectionIndex: fc.integer({ min: 0, max: 50 }),
            }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (chunks, minScore) => {
          const reorderer = new Reorderer({
            strategy: 'scoreSpread',
            groupBy: 'sourceId',
            minScore,
            deduplicate: true,
          });
          const result = reorderer.reorderSync(chunks);

          // All output chunks must have score >= minScore
          for (const c of result) {
            expect(c.score).toBeGreaterThanOrEqual(minScore);
          }

          // No duplicate texts in output
          const texts = result.map((c) => c.text);
          expect(texts.length).toBe(new Set(texts).size);

          // Output length should be <= eligible unique chunks
          const eligible = chunks.filter((c) => c.score >= minScore);
          const uniqueEligibleTexts = new Set(eligible.map((c) => c.text));
          expect(result.length).toBe(uniqueEligibleTexts.size);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — topK limit
// Validates: topK correctly limits the number of output chunks
describe('topK limit', () => {
  it('should return at most topK chunks', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 1, max: 20 }),
        (chunks, topK) => {
          const reorderer = new Reorderer({ topK });
          const result = reorderer.reorderSync(chunks);

          expect(result.length).toBeLessThanOrEqual(topK);
          expect(result.length).toBe(Math.min(chunks.length, topK));

          // Result should be a prefix of the full reorder
          const fullReorderer = new Reorderer();
          const fullResult = fullReorderer.reorderSync(chunks);
          for (let i = 0; i < result.length; i++) {
            expect(result[i].id).toBe(fullResult[i].id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should apply topK after token budget', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 3, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 50, max: 500 }),
        (chunks, topK, maxTokens) => {
          const tokenCounter = (text: string) => text.length;
          const reorderer = new Reorderer({ topK, maxTokens, tokenCounter });
          const result = reorderer.reorderSync(chunks);

          // Must respect both constraints
          expect(result.length).toBeLessThanOrEqual(topK);
          const totalTokens = result.reduce((sum, c) => sum + tokenCounter(c.text), 0);
          expect(totalTokens).toBeLessThanOrEqual(maxTokens);
        },
      ),
      { numRuns: 100 },
    );
  });
});
