import { Chunk } from './types';
import { ValidationError } from './errors';

/**
 * Serialize an array of Chunks to a JSON string.
 */
export function serializeChunks(chunks: Chunk[]): string {
  return JSON.stringify(chunks);
}

/**
 * Deserialize a JSON string into an array of Chunk objects.
 * Validates that each object has the required fields (id, text, score).
 * Throws ValidationError on invalid or missing fields.
 */
export function deserializeChunks(json: string): Chunk[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new ValidationError(`Failed to parse JSON: ${(e as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new ValidationError('Failed to parse JSON: expected an array');
  }

  return parsed.map((item: unknown, index: number) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new ValidationError(
        `Deserialized chunk at index ${index} must be a plain object`,
      );
    }

    const chunk = item as Record<string, unknown>;

    if (typeof chunk.id !== 'string' || chunk.id.length === 0) {
      throw new ValidationError(
        `Deserialized chunk at index ${index} is missing or has an empty 'id'`,
      );
    }
    if (typeof chunk.text !== 'string') {
      throw new ValidationError(
        `Deserialized chunk at index ${index} is missing required field 'text'`,
      );
    }
    if (typeof chunk.score !== 'number' || !Number.isFinite(chunk.score as number)) {
      throw new ValidationError(
        `Deserialized chunk at index ${index} has an invalid 'score' (must be a finite number)`,
      );
    }

    return chunk as unknown as Chunk;
  });
}
