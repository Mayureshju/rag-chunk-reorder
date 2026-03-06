import { Chunk, CoercionStats, ValidationMode } from './types';
import { ValidationError } from './errors';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceChunk(rawChunk: unknown, index: number, stats?: CoercionStats): Chunk {
  if (!isPlainObject(rawChunk)) {
    throw new ValidationError(`Chunk at index ${index} must be a plain object`);
  }
  const chunk = rawChunk as unknown as Chunk;

  if (typeof chunk.id !== 'string') {
    throw new ValidationError(`Chunk at index ${index} is missing required field 'id'`);
  }
  if (chunk.id.length === 0) {
    throw new ValidationError(`Chunk at index ${index} has an empty 'id'`);
  }
  if (typeof chunk.text !== 'string') {
    throw new ValidationError(`Chunk at index ${index} is missing required field 'text'`);
  }

  let score = chunk.score;
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    score = 0;
    if (stats) stats.coercedScores += 1;
  }

  let tokenCount = chunk.tokenCount;
  if (
    tokenCount !== undefined &&
    (typeof tokenCount !== 'number' || !Number.isFinite(tokenCount) || tokenCount < 0)
  ) {
    tokenCount = undefined;
  }

  let metadata = chunk.metadata;
  if (metadata !== undefined) {
    if (!isPlainObject(metadata)) {
      metadata = undefined;
      if (stats) stats.droppedMetadataFields += 1;
    } else {
      const normalized = { ...(metadata as Record<string, unknown>) };
      const timestamp = normalized.timestamp;
      if (timestamp !== undefined && (typeof timestamp !== 'number' || !Number.isFinite(timestamp))) {
        delete normalized.timestamp;
        if (stats) {
          stats.droppedMetadataFields += 1;
          stats.droppedMetadataTimestamp += 1;
        }
      }
      const sectionIndex = normalized.sectionIndex;
      if (sectionIndex !== undefined && (typeof sectionIndex !== 'number' || !Number.isFinite(sectionIndex))) {
        delete normalized.sectionIndex;
        if (stats) {
          stats.droppedMetadataFields += 1;
          stats.droppedMetadataSectionIndex += 1;
        }
      }
      const chunkId = normalized.chunkId;
      if (chunkId !== undefined && typeof chunkId !== 'string') {
        delete normalized.chunkId;
        if (stats) {
          stats.droppedMetadataFields += 1;
        }
      }
      const sourceId = normalized.sourceId;
      if (
        sourceId !== undefined &&
        sourceId !== null &&
        (typeof sourceId === 'object' || typeof sourceId === 'function' || typeof sourceId === 'symbol')
      ) {
        delete normalized.sourceId;
        if (stats) {
          stats.droppedMetadataFields += 1;
          stats.droppedMetadataSourceId += 1;
        }
      }
      const sourceReliability = normalized.sourceReliability;
      if (
        sourceReliability !== undefined &&
        (typeof sourceReliability !== 'number' || !Number.isFinite(sourceReliability))
      ) {
        delete normalized.sourceReliability;
        if (stats) {
          stats.droppedMetadataFields += 1;
          stats.droppedMetadataSourceReliability += 1;
        }
      }
      const tokenCountValue = normalized.tokenCount;
      if (
        tokenCountValue !== undefined &&
        (typeof tokenCountValue !== 'number' || !Number.isFinite(tokenCountValue) || tokenCountValue < 0)
      ) {
        delete normalized.tokenCount;
        if (stats) {
          stats.droppedMetadataFields += 1;
        }
      }
      metadata = normalized;
    }
  }

  return {
    ...chunk,
    score,
    tokenCount,
    metadata,
  };
}

/**
 * Validate that all chunks in the array have the required fields (id, text, score).
 * Throws ValidationError with a descriptive message on the first invalid chunk.
 */
export function validateChunks(chunks: Chunk[]): void {
  if (!Array.isArray(chunks)) {
    throw new ValidationError('chunks must be an array');
  }
  for (let i = 0; i < chunks.length; i++) {
    const rawChunk = chunks[i] as unknown;
    if (!isPlainObject(rawChunk)) {
      throw new ValidationError(`Chunk at index ${i} must be a plain object`);
    }
    const chunk = rawChunk as unknown as Chunk;
    if (typeof chunk.id !== 'string') {
      throw new ValidationError(`Chunk at index ${i} is missing required field 'id'`);
    }
    if (chunk.id.length === 0) {
      throw new ValidationError(`Chunk at index ${i} has an empty 'id'`);
    }
    if (typeof chunk.text !== 'string') {
      throw new ValidationError(`Chunk at index ${i} is missing required field 'text'`);
    }
    if (typeof chunk.score !== 'number' || !Number.isFinite(chunk.score)) {
      throw new ValidationError(`Chunk at index ${i} has an invalid 'score' (must be a finite number)`);
    }
    if (
      chunk.tokenCount !== undefined &&
      (typeof chunk.tokenCount !== 'number' || !Number.isFinite(chunk.tokenCount) || chunk.tokenCount < 0)
    ) {
      throw new ValidationError(
        `Chunk at index ${i} has invalid 'tokenCount' (must be a non-negative finite number)`,
      );
    }

    if (chunk.metadata !== undefined) {
      if (!isPlainObject(chunk.metadata)) {
        throw new ValidationError(
          `Chunk at index ${i} has invalid 'metadata' (must be a plain object)`,
        );
      }

      const timestamp = chunk.metadata.timestamp;
      if (timestamp !== undefined && (typeof timestamp !== 'number' || !Number.isFinite(timestamp))) {
        throw new ValidationError(
          `Chunk at index ${i} has invalid metadata.timestamp (must be a finite number)`,
        );
      }

      const sectionIndex = chunk.metadata.sectionIndex;
      if (sectionIndex !== undefined && (typeof sectionIndex !== 'number' || !Number.isFinite(sectionIndex))) {
        throw new ValidationError(
          `Chunk at index ${i} has invalid metadata.sectionIndex (must be a finite number)`,
        );
      }

      const chunkId = (chunk.metadata as Record<string, unknown>).chunkId;
      if (chunkId !== undefined && typeof chunkId !== 'string') {
        throw new ValidationError(
          `Chunk at index ${i} has invalid metadata.chunkId (must be a string)`,
        );
      }

      const sourceId = chunk.metadata.sourceId;
      // Allow numeric/boolean identifiers and coerce later where needed.
      // Reject complex runtime values that usually indicate malformed metadata.
      if (
        sourceId !== undefined &&
        sourceId !== null &&
        (typeof sourceId === 'object' || typeof sourceId === 'function' || typeof sourceId === 'symbol')
      ) {
        throw new ValidationError(
          `Chunk at index ${i} has invalid metadata.sourceId (must be a primitive value)`,
        );
      }

      const sourceReliability = chunk.metadata.sourceReliability;
      if (
        sourceReliability !== undefined &&
        (typeof sourceReliability !== 'number' || !Number.isFinite(sourceReliability))
      ) {
        throw new ValidationError(
          `Chunk at index ${i} has invalid metadata.sourceReliability (must be a finite number)`,
        );
      }

      const tokenCountValue = (chunk.metadata as Record<string, unknown>).tokenCount;
      if (
        tokenCountValue !== undefined &&
        (typeof tokenCountValue !== 'number' || !Number.isFinite(tokenCountValue) || tokenCountValue < 0)
      ) {
        throw new ValidationError(
          `Chunk at index ${i} has invalid metadata.tokenCount (must be a non-negative finite number)`,
        );
      }
    }
  }
}

/**
 * Normalize and validate chunks based on validation mode.
 * - strict: throws on any invalid input
 * - coerce: clamps invalid scores to 0 and drops malformed metadata fields
 */
export function prepareChunks(
  chunks: Chunk[],
  mode: ValidationMode = 'strict',
  stats?: CoercionStats,
): Chunk[] {
  if (!Array.isArray(chunks)) {
    throw new ValidationError('chunks must be an array');
  }
  if (mode === 'strict') {
    validateChunks(chunks);
    return chunks;
  }

  const normalized: Chunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    normalized.push(coerceChunk(chunks[i] as unknown, i, stats));
  }

  // Ensure required fields are still valid after coercion.
  validateChunks(normalized);
  return normalized;
}
