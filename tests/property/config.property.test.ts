import * as fc from 'fast-check';
import { validateConfig } from '../../src/config';
import { ValidationError } from '../../src/errors';

// Feature: chunk-reordering-library, Property 17: Invalid strategy name rejection
// Validates: Requirements 10.3
describe('Property 17: Invalid strategy name rejection', () => {
  const validStrategies = ['scoreSpread', 'preserveOrder', 'chronological', 'custom'];

  it('should throw ValidationError for any string that is not a valid strategy name', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !validStrategies.includes(s)),
        (invalidStrategy) => {
          expect(() => validateConfig({ strategy: invalidStrategy as any })).toThrow(
            ValidationError,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not throw for valid strategy names (without custom needing comparator)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('scoreSpread', 'preserveOrder', 'chronological'),
        (validStrategy) => {
          expect(() => validateConfig({ strategy: validStrategy as any })).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — Invalid deduplicateKeep rejection
// Validates: deduplicateKeep must be one of 'highestScore', 'first', 'last'
describe('Invalid deduplicateKeep rejection', () => {
  const validKeepValues = ['highestScore', 'first', 'last'];

  it('should throw ValidationError for any string that is not a valid deduplicateKeep value', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !validKeepValues.includes(s)),
        (invalidKeep) => {
          expect(() => validateConfig({ deduplicateKeep: invalidKeep as any })).toThrow(
            ValidationError,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not throw for valid deduplicateKeep values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('highestScore', 'first', 'last'),
        (validKeep) => {
          expect(() => validateConfig({ deduplicateKeep: validKeep as any })).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — Negative weights rejection
// Validates: weights.similarity, weights.time, weights.section must be non-negative
describe('Negative weights rejection', () => {
  it('should throw ValidationError for negative similarity weight', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: -0.001, noNaN: true }),
        (negWeight) => {
          expect(() => validateConfig({ weights: { similarity: negWeight } })).toThrow(
            ValidationError,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should throw ValidationError for negative time weight', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: -0.001, noNaN: true }),
        (negWeight) => {
          expect(() => validateConfig({ weights: { time: negWeight } })).toThrow(
            ValidationError,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should throw ValidationError for negative section weight', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: -0.001, noNaN: true }),
        (negWeight) => {
          expect(() => validateConfig({ weights: { section: negWeight } })).toThrow(
            ValidationError,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should accept non-negative weights', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (similarity, time, section) => {
          expect(() =>
            validateConfig({ weights: { similarity, time, section } }),
          ).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — preserveOrder + groupBy:'sourceId' rejection
// Validates: config validation rejects redundant double-grouping
describe('preserveOrder + groupBy sourceId rejection', () => {
  it('should throw ValidationError when preserveOrder is combined with groupBy sourceId', () => {
    expect(() =>
      validateConfig({ strategy: 'preserveOrder', groupBy: 'sourceId' }),
    ).toThrow(ValidationError);
  });

  it('should allow preserveOrder without groupBy', () => {
    expect(() =>
      validateConfig({ strategy: 'preserveOrder' }),
    ).not.toThrow();
  });

  it('should allow preserveOrder with groupBy on a different field', () => {
    expect(() =>
      validateConfig({ strategy: 'preserveOrder', groupBy: 'page' }),
    ).not.toThrow();
  });
});


// Feature: chunk-reordering-library — minScore/maxTokens NaN/Infinity rejection
// Validates: non-finite values are rejected for minScore and maxTokens
describe('minScore/maxTokens NaN/Infinity rejection', () => {
  it('should throw ValidationError for NaN minScore', () => {
    expect(() => validateConfig({ minScore: NaN })).toThrow(ValidationError);
  });

  it('should throw ValidationError for Infinity minScore', () => {
    expect(() => validateConfig({ minScore: Infinity })).toThrow(ValidationError);
  });

  it('should throw ValidationError for -Infinity minScore', () => {
    expect(() => validateConfig({ minScore: -Infinity })).toThrow(ValidationError);
  });

  it('should accept finite minScore values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        (minScore) => {
          expect(() => validateConfig({ minScore })).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should throw ValidationError for NaN maxTokens', () => {
    const tokenCounter = (t: string) => t.length;
    expect(() => validateConfig({ maxTokens: NaN, tokenCounter })).toThrow(ValidationError);
  });

  it('should throw ValidationError for Infinity maxTokens', () => {
    const tokenCounter = (t: string) => t.length;
    expect(() => validateConfig({ maxTokens: Infinity, tokenCounter })).toThrow(ValidationError);
  });

  it('should accept finite non-negative maxTokens values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (maxTokens) => {
          const tokenCounter = (t: string) => t.length;
          expect(() => validateConfig({ maxTokens, tokenCounter })).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: chunk-reordering-library — startCount/endCount integer validation
// Validates: non-integer values are rejected for startCount and endCount
describe('startCount/endCount integer validation', () => {
  it('should throw ValidationError for non-integer startCount', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }).filter((n) => !Number.isInteger(n)),
        (startCount) => {
          expect(() => validateConfig({ startCount })).toThrow(ValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should throw ValidationError for non-integer endCount', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true }).filter((n) => !Number.isInteger(n)),
        (endCount) => {
          expect(() => validateConfig({ endCount })).toThrow(ValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should accept integer startCount and endCount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (startCount, endCount) => {
          expect(() => validateConfig({ startCount, endCount })).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should throw ValidationError for NaN startCount', () => {
    expect(() => validateConfig({ startCount: NaN })).toThrow(ValidationError);
  });

  it('should throw ValidationError for Infinity endCount', () => {
    expect(() => validateConfig({ endCount: Infinity })).toThrow(ValidationError);
  });
});
