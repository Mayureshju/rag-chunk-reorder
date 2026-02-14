import * as fc from 'fast-check';
import { serializeChunks, deserializeChunks } from '../../src/serializer';
import { Chunk } from '../../src/types';

const chunkArb: fc.Arbitrary<Chunk> = fc.record({
  id: fc.string({ minLength: 1 }),
  text: fc.string(),
  score: fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
  metadata: fc.option(
    fc.record({
      timestamp: fc.option(fc.double({ min: 0, max: 1e12, noNaN: true, noDefaultInfinity: true }), {
        nil: undefined,
      }),
      sectionIndex: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
      sourceId: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
    }),
    { nil: undefined },
  ),
});

// Feature: chunk-reordering-library, Property 16: Serialization round-trip
// Validates: Requirements 11.1, 11.2, 11.3
describe('Property 16: Serialization round-trip', () => {
  it('should produce an equivalent array after serialize then deserialize', () => {
    fc.assert(
      fc.property(fc.array(chunkArb, { minLength: 0, maxLength: 30 }), (chunks) => {
        const json = serializeChunks(chunks);
        const result = deserializeChunks(json);

        expect(result.length).toBe(chunks.length);
        for (let i = 0; i < chunks.length; i++) {
          expect(result[i].id).toBe(chunks[i].id);
          expect(result[i].text).toBe(chunks[i].text);
          // JSON.stringify converts -0 to 0, so use == for score comparison
          expect(result[i].score).toEqual(JSON.parse(JSON.stringify(chunks[i].score)));
          // Metadata comparison: JSON round-trip strips undefined values
          if (chunks[i].metadata !== undefined) {
            const expectedMeta = JSON.parse(JSON.stringify(chunks[i].metadata));
            expect(result[i].metadata).toEqual(expectedMeta);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — deserializeChunks rejects empty id
// Validates: deserialization matches validator strictness
describe('deserializeChunks rejects invalid chunks', () => {
  it('should throw ValidationError for chunks with empty id', () => {
    const json = JSON.stringify([{ id: '', text: 'hello', score: 0.5 }]);
    expect(() => deserializeChunks(json)).toThrow();
  });

  it('should throw ValidationError for chunks with non-finite score', () => {
    // JSON.stringify converts NaN/Infinity to null, so score becomes null after parse
    const json = '[{"id":"a","text":"hello","score":null}]';
    expect(() => deserializeChunks(json)).toThrow();
  });
});
