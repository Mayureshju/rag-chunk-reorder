import * as fc from 'fast-check';
import { deduplicateChunks, trigramSimilarity } from '../../src/deduplicator';
import { Chunk } from '../../src/types';

const chunkArb: fc.Arbitrary<Chunk> = fc.record({
  id: fc.string({ minLength: 1 }),
  text: fc.string({ minLength: 1, maxLength: 50 }),
  score: fc.double({ min: 0, max: 1, noNaN: true }),
});

// Feature: chunk-reordering-library — Deduplication: no duplicates in output
describe('Deduplication: exact dedup removes text duplicates', () => {
  it('should produce output with no duplicate texts at threshold 1.0', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 0, maxLength: 30 }),
        (chunks) => {
          const result = deduplicateChunks(chunks, { threshold: 1.0 });

          // No two output chunks should share the same text
          const texts = result.map((c) => c.text);
          const uniqueTexts = new Set(texts);
          expect(texts.length).toBe(uniqueTexts.size);

          // Output should be a subset of input
          const inputIds = new Set(chunks.map((c) => c.id));
          for (const c of result) {
            expect(inputIds.has(c.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — Deduplication: highestScore keeps best
describe('Deduplication: highestScore survivor strategy', () => {
  it('should keep the highest-scoring chunk among exact duplicates', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 2, maxLength: 10 }),
        (sharedText, scores) => {
          const chunks: Chunk[] = scores.map((s, i) => ({
            id: `chunk-${i}`,
            text: sharedText,
            score: s,
          }));

          const result = deduplicateChunks(chunks, { threshold: 1.0, keep: 'highestScore' });

          expect(result.length).toBe(1);
          const maxScore = Math.max(...scores);
          expect(result[0].score).toBe(maxScore);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — Deduplication: output size invariant
describe('Deduplication: output size invariant', () => {
  it('output length should be <= input length and >= unique text count', () => {
    fc.assert(
      fc.property(
        fc.array(chunkArb, { minLength: 0, maxLength: 30 }),
        fc.double({ min: 0.5, max: 1.0, noNaN: true }),
        (chunks, threshold) => {
          const result = deduplicateChunks(chunks, { threshold });

          expect(result.length).toBeLessThanOrEqual(chunks.length);
          // At threshold 1.0, output length equals unique text count
          if (threshold >= 1.0) {
            const uniqueTexts = new Set(chunks.map((c) => c.text));
            expect(result.length).toBe(uniqueTexts.size);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — Trigram similarity properties
describe('Trigram similarity properties', () => {
  it('should return 1.0 for identical strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 50 }),
        (text) => {
          expect(trigramSimilarity(text, text)).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return a value in [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        (a, b) => {
          const sim = trigramSimilarity(a, b);
          expect(sim).toBeGreaterThanOrEqual(0);
          expect(sim).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should be symmetric: sim(a, b) === sim(b, a)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        (a, b) => {
          expect(trigramSimilarity(a, b)).toBeCloseTo(trigramSimilarity(b, a), 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
