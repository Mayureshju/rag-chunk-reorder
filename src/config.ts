import {
  AutoStrategyConfig,
  DiversityConfig,
  PackingStrategy,
  ReorderConfig,
  ScoringWeights,
  Strategy,
  ValidationMode,
  AbortSignalLike,
  ScoreNormalization,
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
const VALID_VALIDATION_MODES: ValidationMode[] = ['strict', 'coerce'];
const VALID_SCORE_NORMALIZATION: ScoreNormalization[] = ['none', 'minMax', 'zScore', 'softmax'];

const DEFAULT_WEIGHTS: ScoringWeights = {
  similarity: 1.0,
  time: 0,
  section: 0,
  sourceReliability: 0,
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

  const preserveSourceField = config.preserveOrderSourceField ?? 'sourceId';
  if (config.strategy === 'preserveOrder' && config.groupBy === preserveSourceField) {
    throw new ValidationError(
      "preserveOrder strategy already groups by its source field internally. " +
      `Setting groupBy: '${preserveSourceField}' causes redundant double-grouping. ` +
      "Remove groupBy or use a different strategy.",
    );
  }

  if (config.maxTokens !== undefined && typeof config.tokenCounter !== 'function') {
    if (config.maxChars === undefined) {
      throw new ValidationError('maxTokens requires a tokenCounter function or maxChars fallback');
    }
  }

  if (config.maxTokens !== undefined) {
    if (typeof config.maxTokens !== 'number' || !Number.isFinite(config.maxTokens) || config.maxTokens < 0) {
      throw new ValidationError('maxTokens must be a non-negative finite number');
    }
  }

  if (config.maxChars !== undefined) {
    if (
      typeof config.maxChars !== 'number' ||
      !Number.isFinite(config.maxChars) ||
      config.maxChars < 0 ||
      !Number.isInteger(config.maxChars)
    ) {
      throw new ValidationError('maxChars must be a non-negative integer');
    }
  }

  if (config.charCounter !== undefined && typeof config.charCounter !== 'function') {
    throw new ValidationError('charCounter must be a function');
  }

  if (config.scoreClamp !== undefined) {
    if (
      !Array.isArray(config.scoreClamp) ||
      config.scoreClamp.length !== 2 ||
      typeof config.scoreClamp[0] !== 'number' ||
      typeof config.scoreClamp[1] !== 'number' ||
      !Number.isFinite(config.scoreClamp[0]) ||
      !Number.isFinite(config.scoreClamp[1]) ||
      config.scoreClamp[0] > config.scoreClamp[1]
    ) {
      throw new ValidationError('scoreClamp must be a [min, max] array of finite numbers');
    }
  }

  if (config.minScore !== undefined) {
    if (typeof config.minScore !== 'number' || !Number.isFinite(config.minScore)) {
      throw new ValidationError('minScore must be a finite number');
    }
  }

  if (config.minTopK !== undefined) {
    if (
      typeof config.minTopK !== 'number' ||
      !Number.isFinite(config.minTopK) ||
      config.minTopK < 1 ||
      !Number.isInteger(config.minTopK)
    ) {
      throw new ValidationError('minTopK must be a positive integer');
    }
  }

  if (config.rerankerTimeoutMs !== undefined) {
    if (
      typeof config.rerankerTimeoutMs !== 'number' ||
      !Number.isFinite(config.rerankerTimeoutMs) ||
      config.rerankerTimeoutMs < 0
    ) {
      throw new ValidationError('rerankerTimeoutMs must be a non-negative finite number');
    }
  }

  if (config.rerankerConcurrency !== undefined) {
    if (
      typeof config.rerankerConcurrency !== 'number' ||
      !Number.isFinite(config.rerankerConcurrency) ||
      config.rerankerConcurrency < 1 ||
      !Number.isInteger(config.rerankerConcurrency)
    ) {
      throw new ValidationError('rerankerConcurrency must be a positive integer');
    }
  }

  if (config.rerankerBatchSize !== undefined) {
    if (
      typeof config.rerankerBatchSize !== 'number' ||
      !Number.isFinite(config.rerankerBatchSize) ||
      config.rerankerBatchSize < 1 ||
      !Number.isInteger(config.rerankerBatchSize)
    ) {
      throw new ValidationError('rerankerBatchSize must be a positive integer');
    }
  }

  if (config.rerankerAbortSignal !== undefined) {
    const signal = config.rerankerAbortSignal as AbortSignalLike;
    if (
      typeof signal !== 'object' ||
      signal === null ||
      typeof signal.aborted !== 'boolean' ||
      typeof signal.addEventListener !== 'function'
    ) {
      throw new ValidationError('rerankerAbortSignal must be an AbortSignal');
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
    if (
      w.sourceReliability !== undefined &&
      (typeof w.sourceReliability !== 'number' ||
        !Number.isFinite(w.sourceReliability) ||
        w.sourceReliability < 0)
    ) {
      throw new ValidationError('weights.sourceReliability must be a non-negative finite number');
    }
  }

  if (config.topK !== undefined && (typeof config.topK !== 'number' || config.topK < 1 || !Number.isInteger(config.topK))) {
    throw new ValidationError('topK must be a positive integer');
  }

  if (config.topK !== undefined && config.minTopK !== undefined && config.minTopK > config.topK) {
    throw new ValidationError('minTopK cannot exceed topK');
  }

  if (config.packing !== undefined && !VALID_PACKING.includes(config.packing)) {
    throw new ValidationError(
      `Invalid packing '${config.packing}'. Valid values: ${VALID_PACKING.join(', ')}`,
    );
  }

  if (config.scoreNormalization !== undefined && !VALID_SCORE_NORMALIZATION.includes(config.scoreNormalization)) {
    throw new ValidationError(
      `Invalid scoreNormalization '${config.scoreNormalization}'. Valid values: ${VALID_SCORE_NORMALIZATION.join(', ')}`,
    );
  }

  if (config.scoreNormalizationTemperature !== undefined) {
    if (
      typeof config.scoreNormalizationTemperature !== 'number' ||
      !Number.isFinite(config.scoreNormalizationTemperature) ||
      config.scoreNormalizationTemperature <= 0
    ) {
      throw new ValidationError('scoreNormalizationTemperature must be a positive finite number');
    }
  }

  if (config.chronologicalOrder !== undefined && config.chronologicalOrder !== 'asc' && config.chronologicalOrder !== 'desc') {
    throw new ValidationError("chronologicalOrder must be 'asc' or 'desc'");
  }

  if (config.preserveOrderSourceField !== undefined && typeof config.preserveOrderSourceField !== 'string') {
    throw new ValidationError('preserveOrderSourceField must be a string');
  }

  if (config.includeExplain !== undefined && typeof config.includeExplain !== 'boolean') {
    throw new ValidationError('includeExplain must be a boolean');
  }

  if (config.streamingWindowSize !== undefined) {
    if (
      typeof config.streamingWindowSize !== 'number' ||
      !Number.isFinite(config.streamingWindowSize) ||
      !Number.isInteger(config.streamingWindowSize) ||
      config.streamingWindowSize < 1
    ) {
      throw new ValidationError('streamingWindowSize must be a positive integer');
    }
  }

  if (config.deduplicateLengthBucketSize !== undefined) {
    if (
      typeof config.deduplicateLengthBucketSize !== 'number' ||
      !Number.isFinite(config.deduplicateLengthBucketSize) ||
      !Number.isInteger(config.deduplicateLengthBucketSize) ||
      config.deduplicateLengthBucketSize < 1
    ) {
      throw new ValidationError('deduplicateLengthBucketSize must be a positive integer');
    }
  }

  if (config.deduplicateMaxCandidates !== undefined) {
    if (
      typeof config.deduplicateMaxCandidates !== 'number' ||
      !Number.isFinite(config.deduplicateMaxCandidates) ||
      !Number.isInteger(config.deduplicateMaxCandidates) ||
      config.deduplicateMaxCandidates < 1
    ) {
      throw new ValidationError('deduplicateMaxCandidates must be a positive integer');
    }
  }

  if (
    config.validationMode !== undefined &&
    !VALID_VALIDATION_MODES.includes(config.validationMode as ValidationMode)
  ) {
    throw new ValidationError(
      `Invalid validationMode '${config.validationMode}'. Valid values: ${VALID_VALIDATION_MODES.join(', ')}`,
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

    if (a.intentDetector !== undefined && typeof a.intentDetector !== 'function') {
      throw new ValidationError('autoStrategy.intentDetector must be a function');
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
    if (d.maxCandidates !== undefined) {
      if (
        typeof d.maxCandidates !== 'number' ||
        !Number.isFinite(d.maxCandidates) ||
        !Number.isInteger(d.maxCandidates) ||
        d.maxCandidates < 2
      ) {
        throw new ValidationError('diversity.maxCandidates must be an integer >= 2');
      }
    }
  }

  if (config.maxInputChunks !== undefined) {
    if (
      typeof config.maxInputChunks !== 'number' ||
      !Number.isFinite(config.maxInputChunks) ||
      !Number.isInteger(config.maxInputChunks) ||
      config.maxInputChunks < 1
    ) {
      throw new ValidationError('maxInputChunks must be a positive integer');
    }
  }

  if (config.maxInputChunksBehavior !== undefined) {
    if (config.maxInputChunksBehavior !== 'throw' && config.maxInputChunksBehavior !== 'truncate') {
      throw new ValidationError("maxInputChunksBehavior must be 'throw' or 'truncate'");
    }
    if (config.maxInputChunks === undefined) {
      throw new ValidationError('maxInputChunksBehavior requires maxInputChunks to be set');
    }
  }

  if (config.rerankerRetries !== undefined) {
    if (
      typeof config.rerankerRetries !== 'number' ||
      !Number.isFinite(config.rerankerRetries) ||
      !Number.isInteger(config.rerankerRetries) ||
      config.rerankerRetries < 0
    ) {
      throw new ValidationError('rerankerRetries must be a non-negative integer');
    }
  }

  if (config.rerankerRetryDelayMs !== undefined) {
    if (
      typeof config.rerankerRetryDelayMs !== 'number' ||
      !Number.isFinite(config.rerankerRetryDelayMs) ||
      config.rerankerRetryDelayMs < 0
    ) {
      throw new ValidationError('rerankerRetryDelayMs must be a non-negative finite number');
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
    chronologicalOrder: config?.chronologicalOrder ?? 'asc',
    preserveOrderSourceField: config?.preserveOrderSourceField ?? 'sourceId',
    weights: { ...DEFAULT_WEIGHTS, ...config?.weights },
    scoreNormalization: config?.scoreNormalization ?? 'none',
    scoreNormalizationTemperature: config?.scoreNormalizationTemperature ?? 1.0,
    startCount: config?.startCount,
    endCount: config?.endCount,
    groupBy: config?.groupBy,
    reranker: config?.reranker,
    rerankerConcurrency: config?.rerankerConcurrency,
    rerankerBatchSize: config?.rerankerBatchSize,
    rerankerAbortSignal: config?.rerankerAbortSignal,
    rerankerTimeoutMs: config?.rerankerTimeoutMs,
    customComparator: config?.customComparator,
    minScore: config?.minScore,
    maxTokens: config?.maxTokens,
    maxChars: config?.maxChars,
    charCounter: config?.charCounter,
    tokenCounter: config?.tokenCounter,
    scoreClamp: config?.scoreClamp,
    minTopK: config?.minTopK,
    onRerankerError: config?.onRerankerError,
    validateRerankerOutputLength: config?.validateRerankerOutputLength,
    validateRerankerOutputOrder: config?.validateRerankerOutputOrder,
    validateRerankerOutputOrderByIndex: config?.validateRerankerOutputOrderByIndex,
    onDiagnostics: config?.onDiagnostics,
    onTraceStep: config?.onTraceStep,
    includePriorityScore: config?.includePriorityScore,
    includeExplain: config?.includeExplain,
    deduplicate: config?.deduplicate,
    deduplicateThreshold: config?.deduplicateThreshold,
    deduplicateKeep: config?.deduplicateKeep,
    deduplicateLengthBucketSize: config?.deduplicateLengthBucketSize,
    deduplicateMaxCandidates: config?.deduplicateMaxCandidates,
    topK: config?.topK,
    autoStrategy: {
      ...DEFAULT_AUTO_STRATEGY,
      ...config?.autoStrategy,
      temporalQueryTerms: [...temporalQueryTerms],
      narrativeQueryTerms: [...narrativeQueryTerms],
    },
    diversity: { ...DEFAULT_DIVERSITY, ...config?.diversity },
    packing: config?.packing ?? 'auto',
    validationMode: config?.validationMode ?? 'strict',
    streamingWindowSize: config?.streamingWindowSize ?? 128,
    maxInputChunks: config?.maxInputChunks,
    maxInputChunksBehavior:
      config?.maxInputChunksBehavior ?? (config?.maxInputChunks != null ? 'throw' : undefined),
    rerankerRetries: config?.rerankerRetries ?? 0,
    rerankerRetryDelayMs: config?.rerankerRetryDelayMs ?? 500,
  };
  return merged;
}
