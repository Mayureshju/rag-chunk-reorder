import * as fc from 'fast-check';
import { validateConfig } from '../../src/config';
import { ValidationError } from '../../src/errors';

// Feature: chunk-reordering-library, Property 17: Invalid strategy name rejection
// Validates: Requirements 10.3
describe('Property 17: Invalid strategy name rejection', () => {
  const validStrategies = ['scoreSpread', 'preserveOrder', 'chronological', 'custom', 'auto'];

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
        fc.constantFrom('scoreSpread', 'preserveOrder', 'chronological', 'auto'),
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

// Feature: chunk-reordering-library — weights NaN/Infinity rejection
// Validates: weights.similarity/time/section must be finite numbers
describe('weights NaN/Infinity rejection', () => {
  it('should reject NaN similarity weight', () => {
    expect(() => validateConfig({ weights: { similarity: NaN } })).toThrow(ValidationError);
  });

  it('should reject Infinity time weight', () => {
    expect(() => validateConfig({ weights: { time: Infinity } })).toThrow(ValidationError);
  });

  it('should reject -Infinity section weight', () => {
    expect(() => validateConfig({ weights: { section: -Infinity } })).toThrow(ValidationError);
  });

  it('should reject NaN sourceReliability weight', () => {
    expect(() => validateConfig({ weights: { sourceReliability: NaN } })).toThrow(ValidationError);
  });

  it('should reject negative sourceReliability weight', () => {
    expect(() => validateConfig({ weights: { sourceReliability: -0.1 } })).toThrow(ValidationError);
  });
});

describe('deduplicateThreshold finite validation', () => {
  it('should reject NaN deduplicateThreshold', () => {
    expect(() => validateConfig({ deduplicateThreshold: NaN })).toThrow(ValidationError);
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

  it('should require tokenCounter when maxTokens is set without maxChars', () => {
    expect(() => validateConfig({ maxTokens: 10 })).toThrow(ValidationError);
  });

  it('should allow maxTokens without tokenCounter when maxChars is set', () => {
    expect(() => validateConfig({ maxTokens: 10, maxChars: 100 })).not.toThrow();
  });
});

describe('maxChars validation', () => {
  it('should reject negative maxChars', () => {
    expect(() => validateConfig({ maxChars: -1 })).toThrow(ValidationError);
  });

  it('should reject non-integer maxChars', () => {
    expect(() => validateConfig({ maxChars: 1.5 })).toThrow(ValidationError);
  });

  it('should accept integer maxChars', () => {
    expect(() => validateConfig({ maxChars: 500 })).not.toThrow();
  });

  it('should reject non-function charCounter', () => {
    expect(() => validateConfig({ maxChars: 10, charCounter: 123 as any })).toThrow(ValidationError);
  });

  it('should accept function charCounter', () => {
    expect(() =>
      validateConfig({ maxChars: 10, charCounter: (text: string) => text.length }),
    ).not.toThrow();
  });
});

describe('scoreClamp validation', () => {
  it('should reject invalid scoreClamp values', () => {
    expect(() => validateConfig({ scoreClamp: [1, 0] as any })).toThrow(ValidationError);
    expect(() => validateConfig({ scoreClamp: [0, NaN] as any })).toThrow(ValidationError);
    expect(() => validateConfig({ scoreClamp: [0] as any })).toThrow(ValidationError);
  });

  it('should accept valid scoreClamp values', () => {
    expect(() => validateConfig({ scoreClamp: [0, 1] })).not.toThrow();
  });
});

describe('minTopK validation', () => {
  it('should reject non-integer minTopK', () => {
    expect(() => validateConfig({ minTopK: 2.5 })).toThrow(ValidationError);
  });

  it('should reject minTopK less than 1', () => {
    expect(() => validateConfig({ minTopK: 0 })).toThrow(ValidationError);
  });

  it('should reject minTopK greater than topK', () => {
    expect(() => validateConfig({ minTopK: 5, topK: 3 })).toThrow(ValidationError);
  });

  it('should accept valid minTopK', () => {
    expect(() => validateConfig({ minTopK: 2 })).not.toThrow();
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

// Feature: chunk-reordering-library — packing strategy validation
// Validates: packing accepts only auto/prefix/edgeAware
describe('packing strategy validation', () => {
  it('should accept valid packing values', () => {
    expect(() => validateConfig({ packing: 'auto' })).not.toThrow();
    expect(() => validateConfig({ packing: 'prefix' })).not.toThrow();
    expect(() => validateConfig({ packing: 'edgeAware' })).not.toThrow();
  });

  it('should reject invalid packing values', () => {
    expect(() => validateConfig({ packing: 'invalid' as any })).toThrow(ValidationError);
  });
});

describe('reranker timeout validation', () => {
  it('should reject negative rerankerTimeoutMs', () => {
    expect(() => validateConfig({ rerankerTimeoutMs: -1 })).toThrow(ValidationError);
  });

  it('should reject NaN rerankerTimeoutMs', () => {
    expect(() => validateConfig({ rerankerTimeoutMs: NaN })).toThrow(ValidationError);
  });
});

describe('reranker batch/concurrency validation', () => {
  it('should reject non-integer rerankerConcurrency', () => {
    expect(() => validateConfig({ rerankerConcurrency: 1.2 })).toThrow(ValidationError);
  });

  it('should reject non-positive rerankerConcurrency', () => {
    expect(() => validateConfig({ rerankerConcurrency: 0 })).toThrow(ValidationError);
  });

  it('should accept integer rerankerConcurrency', () => {
    expect(() => validateConfig({ rerankerConcurrency: 2 })).not.toThrow();
  });

  it('should reject non-integer rerankerBatchSize', () => {
    expect(() => validateConfig({ rerankerBatchSize: 2.2 })).toThrow(ValidationError);
  });

  it('should reject non-positive rerankerBatchSize', () => {
    expect(() => validateConfig({ rerankerBatchSize: 0 })).toThrow(ValidationError);
  });

  it('should accept integer rerankerBatchSize', () => {
    expect(() => validateConfig({ rerankerBatchSize: 8 })).not.toThrow();
  });
});

// Feature: chunk-reordering-library — autoStrategy threshold validation
// Validates: auto strategy thresholds are bounded in [0, 1]
describe('autoStrategy validation', () => {
  it('should accept valid thresholds', () => {
    expect(() =>
      validateConfig({
        strategy: 'auto',
        autoStrategy: {
          temporalTimestampCoverageThreshold: 0.5,
          narrativeSourceCoverageThreshold: 0.4,
          narrativeSectionCoverageThreshold: 0.3,
        },
      }),
    ).not.toThrow();
  });

  it('should reject out-of-range thresholds', () => {
    expect(() =>
      validateConfig({
        strategy: 'auto',
        autoStrategy: { temporalTimestampCoverageThreshold: 1.5 },
      }),
    ).toThrow(ValidationError);
  });
});

// Feature: chunk-reordering-library — diversity config validation
// Validates: diversity lambda must be between 0 and 1
describe('diversity validation', () => {
  it('should accept valid diversity config', () => {
    expect(() =>
      validateConfig({
        diversity: { enabled: true, lambda: 0.7, sourceDiversityWeight: 0.2, sourceField: 'sourceId' },
      }),
    ).not.toThrow();
  });

  it('should reject invalid lambda', () => {
    expect(() =>
      validateConfig({
        diversity: { enabled: true, lambda: -0.1 },
      }),
    ).toThrow(ValidationError);
  });
});
