import { Chunk } from './types';
import { ValidationError } from './errors';

/**
 * Validate that all chunks in the array have the required fields (id, text, score).
 * Throws ValidationError with a descriptive message on the first invalid chunk.
 */
export function validateChunks(chunks: Chunk[]): void {
  for (let i = 0; i < chunks.length; i++) {
    const rawChunk = chunks[i] as unknown;
    if (typeof rawChunk !== 'object' || rawChunk === null || Array.isArray(rawChunk)) {
      throw new ValidationError(`Chunk at index ${i} must be a plain object`);
    }
    const chunk = rawChunk as Chunk;
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

    if (chunk.metadata !== undefined) {
      if (typeof chunk.metadata !== 'object' || chunk.metadata === null || Array.isArray(chunk.metadata)) {
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
    }
  }
}
