import { Chunk } from './types';
import { ValidationError } from './errors';
import { prepareChunks } from './validator';

/**
 * Serialize an array of Chunks to a JSON string.
 * Chunk metadata should be JSON-serializable; non-serializable values (e.g. functions,
 * Symbols) may cause JSON.stringify to throw or drop data. Use serializeChunksSafe
 * to strip non-serializable fields before serializing.
 */
export function serializeChunks(chunks: Chunk[]): string {
  return JSON.stringify(chunks);
}

function toJsonSafe(val: unknown): unknown {
  if (val === undefined || typeof val === 'function' || typeof val === 'symbol') return undefined;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(toJsonSafe);
  const obj = val as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k === 'symbol') continue;
    const s = toJsonSafe(v);
    if (s !== undefined) out[k] = s;
  }
  return out;
}

/**
 * Serialize chunks to JSON after stripping non-JSON-serializable fields from each
 * chunk's metadata (e.g. functions, Symbols). Use when metadata may contain
 * values that would cause JSON.stringify to throw or drop data.
 */
export function serializeChunksSafe(chunks: Chunk[]): string {
  const safe = chunks.map((c) => ({
    id: c.id,
    text: c.text,
    score: c.score,
    metadata: c.metadata ? (toJsonSafe(c.metadata) as Record<string, unknown>) : undefined,
  }));
  return JSON.stringify(safe);
}

export interface DeserializeChunksOptions {
  /**
   * When true, run deserialized chunks through prepareChunks(..., 'coerce') to normalize
   * optional fields (tokenCount, metadata.timestamp, sectionIndex, sourceId, etc.) and
   * drop invalid values. Use in production when metadata may be untrusted.
   */
  normalizeMetadata?: boolean;
}

/**
 * Deserialize a JSON string into an array of Chunk objects.
 * Validates that each object has the required fields (id, text, score).
 * Throws ValidationError on invalid or missing fields.
 * Optional metadata (tokenCount, timestamp, sectionIndex, sourceId, etc.) is not validated
 * unless options.normalizeMetadata is true.
 */
export function deserializeChunks(json: string, options?: DeserializeChunksOptions): Chunk[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new ValidationError(`Failed to parse JSON: ${(e as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new ValidationError('Failed to parse JSON: expected an array');
  }

  const raw = parsed.map((item: unknown, index: number) => {
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

  if (options?.normalizeMetadata) {
    return prepareChunks(raw, 'coerce');
  }
  return raw;
}
