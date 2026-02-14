import { Chunk } from './types';
import { ValidationError } from './errors';

/**
 * Validate that all chunks in the array have the required fields (id, text, score).
 * Throws ValidationError with a descriptive message on the first invalid chunk.
 */
export function validateChunks(chunks: Chunk[]): void {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
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
  }
}
