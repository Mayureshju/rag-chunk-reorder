import { Reorderer } from './reorderer';
import { Chunk, ReorderConfig, ValidationMode } from './types';
import { ValidationError } from './errors';

export interface LangChainDocumentLike {
  pageContent: string;
  metadata?: Record<string, unknown>;
  id?: string | number;
}

export interface LlamaIndexNodeLike {
  id_?: string;
  id?: string;
  text?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  getText?: () => string;
}

export interface HaystackDocumentLike {
  id?: string;
  content: string;
  score?: number;
  meta?: Record<string, unknown>;
}

interface AdapterOptions {
  query?: string;
  reorderer?: Reorderer;
  config?: ReorderConfig;
  validationMode?: ValidationMode;
}

function resolveValidationMode(options?: AdapterOptions): ValidationMode {
  if (options?.validationMode) return options.validationMode;
  if (options?.config?.validationMode) return options.config.validationMode;
  if (options?.reorderer) {
    return options.reorderer.getConfig().validationMode ?? 'strict';
  }
  return 'strict';
}

function pickScore(
  primary: unknown,
  fallback: unknown,
  mode: ValidationMode,
  label: string,
): number {
  const primaryFinite = typeof primary === 'number' && Number.isFinite(primary);
  const fallbackFinite = typeof fallback === 'number' && Number.isFinite(fallback);

  if (primaryFinite) return primary as number;
  if (fallbackFinite) return fallback as number;

  if (primary === undefined && fallback === undefined) return 0;
  if (primary === null && fallback === null) return 0;

  if (mode === 'coerce') return 0;
  throw new ValidationError(`${label} score must be a finite number`);
}

function resolveMetadata(raw: unknown, mode: ValidationMode, label: string): Record<string, unknown> | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    if (mode === 'coerce') return undefined;
    throw new ValidationError(`${label} metadata must be a plain object`);
  }
  return raw as Record<string, unknown>;
}

function buildInternalChunkId(baseId: string, index: number): string {
  // Prefixing with index guarantees uniqueness even when framework IDs collide.
  return `${index}::${baseId}`;
}

function getReorderer(options?: AdapterOptions): Reorderer {
  if (options?.reorderer) return options.reorderer;
  return new Reorderer(options?.config);
}

function reorderItemsByChunkOrder<T extends { __chunkId: string }>(
  items: T[],
  chunks: Chunk[],
): T[] {
  const byId = new Map(items.map((item) => [item.__chunkId, item]));
  const result: T[] = [];
  for (const chunk of chunks) {
    const original = byId.get(chunk.id);
    if (original) result.push(original);
  }
  return result;
}

/**
 * Reorder LangChain Document[] using metadata.score (default 0 when missing).
 */
export async function reorderLangChainDocuments<T extends LangChainDocumentLike>(
  documents: T[],
  options?: AdapterOptions,
): Promise<T[]> {
  const reorderer = getReorderer(options);
  const mode = resolveValidationMode(options);

  const annotated = documents.map((doc, i) => {
    const score = pickScore(doc.metadata?.score, undefined, mode, 'LangChain document');
    const externalId = doc.id !== undefined ? String(doc.id) : 'lc';
    const id = buildInternalChunkId(externalId, i);
    return { __chunkId: id, doc, score };
  });

  const chunks: Chunk[] = annotated.map((item) => ({
    id: item.__chunkId,
    text: item.doc.pageContent,
    score: item.score,
    metadata: resolveMetadata(item.doc.metadata, mode, 'LangChain document'),
  }));

  const reorderedChunks = await reorderer.reorder(chunks, options?.query);
  const reordered = reorderItemsByChunkOrder(
    annotated.map((a) => ({ __chunkId: a.__chunkId, value: a.doc })),
    reorderedChunks,
  );
  return reordered.map((r) => r.value);
}

/**
 * Reorder LangChain [Document, score][] results.
 */
export async function reorderLangChainPairs<T extends LangChainDocumentLike>(
  pairs: Array<[T, number]>,
  options?: AdapterOptions,
): Promise<Array<[T, number]>> {
  const reorderer = getReorderer(options);
  const mode = resolveValidationMode(options);

  const annotated = pairs.map(([doc, score], i) => {
    const externalId = doc.id !== undefined ? String(doc.id) : 'lcp';
    const id = buildInternalChunkId(externalId, i);
    return { __chunkId: id, pair: [doc, score] as [T, number] };
  });

  const chunks: Chunk[] = annotated.map((item) => ({
    id: item.__chunkId,
    text: item.pair[0].pageContent,
    score: pickScore(item.pair[1], undefined, mode, 'LangChain pair'),
    metadata: resolveMetadata(item.pair[0].metadata, mode, 'LangChain pair'),
  }));

  const reorderedChunks = await reorderer.reorder(chunks, options?.query);
  const reordered = reorderItemsByChunkOrder(
    annotated.map((a) => ({ __chunkId: a.__chunkId, value: a.pair })),
    reorderedChunks,
  );
  return reordered.map((r) => r.value);
}

/**
 * Reorder LlamaIndex-like nodes.
 */
export async function reorderLlamaIndexNodes<T extends LlamaIndexNodeLike>(
  nodes: T[],
  options?: AdapterOptions,
): Promise<T[]> {
  const reorderer = getReorderer(options);
  const mode = resolveValidationMode(options);

  const annotated = nodes.map((node, i) => {
    const externalId = node.id_ ?? node.id ?? 'lli';
    const id = buildInternalChunkId(externalId, i);
    const text = typeof node.getText === 'function' ? node.getText() : (node.text ?? '');
    const score = pickScore(node.score, node.metadata?.score, mode, 'LlamaIndex node');
    return { __chunkId: id, node, text, score };
  });

  const chunks: Chunk[] = annotated.map((item) => ({
    id: item.__chunkId,
    text: item.text,
    score: item.score,
    metadata: resolveMetadata(item.node.metadata, mode, 'LlamaIndex node'),
  }));

  const reorderedChunks = await reorderer.reorder(chunks, options?.query);
  const reordered = reorderItemsByChunkOrder(
    annotated.map((a) => ({ __chunkId: a.__chunkId, value: a.node })),
    reorderedChunks,
  );
  return reordered.map((r) => r.value);
}

/**
 * Reorder Haystack-like documents.
 */
export async function reorderHaystackDocuments<T extends HaystackDocumentLike>(
  documents: T[],
  options?: AdapterOptions,
): Promise<T[]> {
  const reorderer = getReorderer(options);
  const mode = resolveValidationMode(options);

  const annotated = documents.map((doc, i) => {
    const externalId = doc.id ?? 'hs';
    return {
      __chunkId: buildInternalChunkId(externalId, i),
      doc,
    };
  });

  const chunks: Chunk[] = annotated.map((item) => ({
    id: item.__chunkId,
    text: item.doc.content,
    score: pickScore(item.doc.score, undefined, mode, 'Haystack document'),
    metadata: resolveMetadata(item.doc.meta, mode, 'Haystack document'),
  }));

  const reorderedChunks = await reorderer.reorder(chunks, options?.query);
  const reordered = reorderItemsByChunkOrder(
    annotated.map((a) => ({ __chunkId: a.__chunkId, value: a.doc })),
    reorderedChunks,
  );
  return reordered.map((r) => r.value);
}
