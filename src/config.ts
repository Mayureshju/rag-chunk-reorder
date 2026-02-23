import {
  AutoStrategyConfig,
  DiversityConfig,
  PackingStrategy,
  ReorderConfig,
  ScoringWeights,
  Strategy,
} from './types';
import { ValidationError } from './errors';

/** Internal config type where weights are guaranteed to be fully resolved. */
export interface MergedReorderConfig extends ReorderConfig {
  strategy: Strategy;
  weights: ScoringWeights;
  autoStrategy: AutoStrategyConfig;
  diversity: DiversityConfig;
  packing: PackingStrategy;
}

const VALID_STRATEGIES: Strategy[] = [
  'scoreSpread',
  'preserveOrder',
  'chronological',
  'custom',
  'auto',
];

const VALID_PACKING: PackingStrategy[] = ['auto', 'prefix', 'edgeAware'];

const DEFAULT_WEIGHTS: ScoringWeights = {
  similarity: 1.0,
  time: 0,
  section: 0,
};

const DEFAULT_AUTO_STRATEGY: AutoStrategyConfig = {
  temporalTimestampCoverageThreshold: 0.4,
  narrativeSourceCoverageThreshold: 0.4,
  narrativeSectionCoverageThreshold: 0.3,
  temporalQueryTerms: [
    'when',
    'date',
    'timeline',
    'chronological',
    'latest',
    'recent',
    'before',
    'after',
    'year',
    'month',
    'day',
    'history',
    'historical',
  ],
  narrativeQueryTerms: [
    'summarize',
    'summary',
    'explain',
    'walk through',
    'overview',
    'guide',
    'chapter',
    'section',
    'steps',
    'how does',
    'story',
  ],
};

const DEFAULT_DIVERSITY: DiversityConfig = {
  enabled: false,
  lambda: 0.7,
  sourceDiversityWeight: 0.15,
  sourceField: 'sourceId',
};

/**
 * Validate a ReorderConfig object. Throws ValidationError on invalid fields.
 */
export function validateConfig(config: ReorderConfig): void {
  if (config.strategy !== undefined && !VALID_STRATEGIES.includes(config.strategy as Strategy)) {
    throw new ValidationError(
      `Invalid strategy '${config.strategy}'. Valid strategies: ${VALID_STRATEGIES.join(', ')}`,
    );
  }

  if (config.startCount !== undefined) {
    if (typeof config.startCount !== 'number' || !Number.isFinite(config.startCount) || config.startCount < 0 || !Number.isInteger(config.startCount)) {
      throw new ValidationError('startCount must be a non-negative integer');
    }
  }

  if (config.endCount !== undefined) {
    if (typeof config.endCount !== 'number' || !Number.isFinite(config.endCount) || config.endCount < 0 || !Number.isInteger(config.endCount)) {
      throw new ValidationError('endCount must be a non-negative integer');
    }
  }

  if (config.strategy === 'custom' && typeof config.customComparator !== 'function') {
    throw new ValidationError('Custom strategy requires a customComparator function');
  }

  if (config.strategy === 'auto' && config.customComparator !== undefined) {
    throw new ValidationError("customComparator is ignored when strategy is 'auto'");
  }

  if (config.strategy === 'preserveOrder' && config.groupBy === 'sourceId') {
    throw new ValidationError(
      "preserveOrder strategy already groups by sourceId internally. " +
      "Setting groupBy: 'sourceId' causes redundant double-grouping. " +
      "Remove groupBy or use a different strategy.",
    );
  }

  if (config.maxTokens !== undefined && typeof config.tokenCounter !== 'function') {
    throw new ValidationError('maxTokens requires a tokenCounter function');
  }

  if (config.maxTokens !== undefined) {
    if (typeof config.maxTokens !== 'number' || !Number.isFinite(config.maxTokens) || config.maxTokens < 0) {
      throw new ValidationError('maxTokens must be a non-negative finite number');
    }
  }

  if (config.minScore !== undefined) {
    if (typeof config.minScore !== 'number' || !Number.isFinite(config.minScore)) {
      throw new ValidationError('minScore must be a finite number');
    }
  }

  if (config.deduplicateThreshold !== undefined) {
    if (
      typeof config.deduplicateThreshold !== 'number' ||
      !Number.isFinite(config.deduplicateThreshold) ||
      config.deduplicateThreshold < 0 ||
      config.deduplicateThreshold > 1
    ) {
      throw new ValidationError('deduplicateThreshold must be a number between 0 and 1');
    }
  }

  if (config.deduplicateKeep !== undefined) {
    const validKeepStrategies = ['highestScore', 'first', 'last'];
    if (!validKeepStrategies.includes(config.deduplicateKeep)) {
      throw new ValidationError(
        `Invalid deduplicateKeep '${config.deduplicateKeep}'. Valid values: ${validKeepStrategies.join(', ')}`,
      );
    }
  }

  if (config.weights !== undefined) {
    const w = config.weights;
    if (
      w.similarity !== undefined &&
      (typeof w.similarity !== 'number' || !Number.isFinite(w.similarity) || w.similarity < 0)
    ) {
      throw new ValidationError('weights.similarity must be a non-negative finite number');
    }
    if (
      w.time !== undefined &&
      (typeof w.time !== 'number' || !Number.isFinite(w.time) || w.time < 0)
    ) {
      throw new ValidationError('weights.time must be a non-negative finite number');
    }
    if (
      w.section !== undefined &&
      (typeof w.section !== 'number' || !Number.isFinite(w.section) || w.section < 0)
    ) {
      throw new ValidationError('weights.section must be a non-negative finite number');
    }
  }

  if (config.topK !== undefined && (typeof config.topK !== 'number' || config.topK < 1 || !Number.isInteger(config.topK))) {
    throw new ValidationError('topK must be a positive integer');
  }

  if (config.packing !== undefined && !VALID_PACKING.includes(config.packing)) {
    throw new ValidationError(
      `Invalid packing '${config.packing}'. Valid values: ${VALID_PACKING.join(', ')}`,
    );
  }

  if (config.autoStrategy !== undefined) {
    const a = config.autoStrategy;
    const thresholds: Array<[string, number | undefined]> = [
      ['autoStrategy.temporalTimestampCoverageThreshold', a.temporalTimestampCoverageThreshold],
      ['autoStrategy.narrativeSourceCoverageThreshold', a.narrativeSourceCoverageThreshold],
      ['autoStrategy.narrativeSectionCoverageThreshold', a.narrativeSectionCoverageThreshold],
    ];

    for (const [name, value] of thresholds) {
      if (value !== undefined) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
          throw new ValidationError(`${name} must be a number between 0 and 1`);
        }
      }
    }

    const termLists: Array<[string, unknown]> = [
      ['autoStrategy.temporalQueryTerms', a.temporalQueryTerms],
      ['autoStrategy.narrativeQueryTerms', a.narrativeQueryTerms],
    ];
    for (const [name, terms] of termLists) {
      if (terms !== undefined) {
        if (!Array.isArray(terms) || terms.some((t) => typeof t !== 'string' || t.trim().length === 0)) {
          throw new ValidationError(`${name} must be an array of non-empty strings`);
        }
      }
    }
  }

  if (config.diversity !== undefined) {
    const d = config.diversity;
    if (d.enabled !== undefined && typeof d.enabled !== 'boolean') {
      throw new ValidationError('diversity.enabled must be a boolean');
    }
    if (
      d.lambda !== undefined &&
      (typeof d.lambda !== 'number' || !Number.isFinite(d.lambda) || d.lambda < 0 || d.lambda > 1)
    ) {
      throw new ValidationError('diversity.lambda must be a number between 0 and 1');
    }
    if (
      d.sourceDiversityWeight !== undefined &&
      (typeof d.sourceDiversityWeight !== 'number' || !Number.isFinite(d.sourceDiversityWeight) || d.sourceDiversityWeight < 0)
    ) {
      throw new ValidationError('diversity.sourceDiversityWeight must be a non-negative finite number');
    }
    if (d.sourceField !== undefined && typeof d.sourceField !== 'string') {
      throw new ValidationError('diversity.sourceField must be a string');
    }
  }
}

/**
 * Merge a partial user config with sensible defaults.
 * Returns a complete ReorderConfig with all fields populated.
 */
export function mergeConfig(config?: Partial<ReorderConfig>): MergedReorderConfig {
  const temporalQueryTerms =
    config?.autoStrategy?.temporalQueryTerms ??
    DEFAULT_AUTO_STRATEGY.temporalQueryTerms ??
    [];
  const narrativeQueryTerms =
    config?.autoStrategy?.narrativeQueryTerms ??
    DEFAULT_AUTO_STRATEGY.narrativeQueryTerms ??
    [];

  const merged: MergedReorderConfig = {
    strategy: config?.strategy ?? 'scoreSpread',
    weights: { ...DEFAULT_WEIGHTS, ...config?.weights },
    startCount: config?.startCount,
    endCount: config?.endCount,
    groupBy: config?.groupBy,
    reranker: config?.reranker,
    customComparator: config?.customComparator,
    minScore: config?.minScore,
    maxTokens: config?.maxTokens,
    tokenCounter: config?.tokenCounter,
    onRerankerError: config?.onRerankerError,
    includePriorityScore: config?.includePriorityScore,
    deduplicate: config?.deduplicate,
    deduplicateThreshold: config?.deduplicateThreshold,
    deduplicateKeep: config?.deduplicateKeep,
    topK: config?.topK,
    autoStrategy: {
      ...DEFAULT_AUTO_STRATEGY,
      ...config?.autoStrategy,
      temporalQueryTerms: [...temporalQueryTerms],
      narrativeQueryTerms: [...narrativeQueryTerms],
    },
    diversity: { ...DEFAULT_DIVERSITY, ...config?.diversity },
    packing: config?.packing ?? 'auto',
  };
  return merged;
}
