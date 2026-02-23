import { Reorderer } from './reorderer';
import { Chunk, ReorderConfig } from './types';

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
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
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

  const annotated = documents.map((doc, i) => {
    const score = finiteNumber(doc.metadata?.score) ?? 0;
    const externalId = doc.id !== undefined ? String(doc.id) : 'lc';
    const id = buildInternalChunkId(externalId, i);
    return { __chunkId: id, doc, score };
  });

  const chunks: Chunk[] = annotated.map((item) => ({
    id: item.__chunkId,
    text: item.doc.pageContent,
    score: item.score,
    metadata: item.doc.metadata,
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

  const annotated = pairs.map(([doc, score], i) => {
    const externalId = doc.id !== undefined ? String(doc.id) : 'lcp';
    const id = buildInternalChunkId(externalId, i);
    return { __chunkId: id, pair: [doc, score] as [T, number] };
  });

  const chunks: Chunk[] = annotated.map((item) => ({
    id: item.__chunkId,
    text: item.pair[0].pageContent,
    score: finiteNumber(item.pair[1]) ?? 0,
    metadata: item.pair[0].metadata,
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

  const annotated = nodes.map((node, i) => {
    const externalId = node.id_ ?? node.id ?? 'lli';
    const id = buildInternalChunkId(externalId, i);
    const text = typeof node.getText === 'function' ? node.getText() : (node.text ?? '');
    const scoreFromMeta = finiteNumber(node.metadata?.score);
    const score = finiteNumber(node.score) ?? scoreFromMeta ?? 0;
    return { __chunkId: id, node, text, score };
  });

  const chunks: Chunk[] = annotated.map((item) => ({
    id: item.__chunkId,
    text: item.text,
    score: item.score,
    metadata: item.node.metadata,
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
    score: finiteNumber(item.doc.score) ?? 0,
    metadata: item.doc.meta,
  }));

  const reorderedChunks = await reorderer.reorder(chunks, options?.query);
  const reordered = reorderItemsByChunkOrder(
    annotated.map((a) => ({ __chunkId: a.__chunkId, value: a.doc })),
    reorderedChunks,
  );
  return reordered.map((r) => r.value);
}
