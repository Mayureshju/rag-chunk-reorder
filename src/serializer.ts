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

  return parsed.map((item: Record<string, unknown>, index: number) => {
    if (typeof item.id !== 'string' || item.id.length === 0) {
      throw new ValidationError(
        `Deserialized chunk at index ${index} is missing or has an empty 'id'`,
      );
    }
    if (typeof item.text !== 'string') {
      throw new ValidationError(
        `Deserialized chunk at index ${index} is missing required field 'text'`,
      );
    }
    if (typeof item.score !== 'number' || !Number.isFinite(item.score as number)) {
      throw new ValidationError(
        `Deserialized chunk at index ${index} has an invalid 'score' (must be a finite number)`,
      );
    }

    return item as unknown as Chunk;
  });
}
