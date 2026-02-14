import { ReorderConfig, ScoringWeights, Strategy } from './types';
import { ValidationError } from './errors';

/** Internal config type where weights are guaranteed to be fully resolved. */
export interface MergedReorderConfig extends ReorderConfig {
  weights: ScoringWeights;
}

const VALID_STRATEGIES: Strategy[] = ['scoreSpread', 'preserveOrder', 'chronological', 'custom'];

const DEFAULT_WEIGHTS: ScoringWeights = {
  similarity: 1.0,
  time: 0,
  section: 0,
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
    if (typeof config.deduplicateThreshold !== 'number' || config.deduplicateThreshold < 0 || config.deduplicateThreshold > 1) {
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
    if (w.similarity !== undefined && (typeof w.similarity !== 'number' || w.similarity < 0)) {
      throw new ValidationError('weights.similarity must be a non-negative number');
    }
    if (w.time !== undefined && (typeof w.time !== 'number' || w.time < 0)) {
      throw new ValidationError('weights.time must be a non-negative number');
    }
    if (w.section !== undefined && (typeof w.section !== 'number' || w.section < 0)) {
      throw new ValidationError('weights.section must be a non-negative number');
    }
  }

  if (config.topK !== undefined && (typeof config.topK !== 'number' || config.topK < 1 || !Number.isInteger(config.topK))) {
    throw new ValidationError('topK must be a positive integer');
  }
}

/**
 * Merge a partial user config with sensible defaults.
 * Returns a complete ReorderConfig with all fields populated.
 */
export function mergeConfig(config?: Partial<ReorderConfig>): MergedReorderConfig {
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
  };
  return merged;
}
