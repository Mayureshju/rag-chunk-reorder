import { Chunk, Reranker } from './types';

type FetchLike = (input: string, init?: unknown) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
}>;

interface BaseRerankerOptions {
  /**
   * API key for the provider.
   */
  apiKey: string;
  /**
   * Optional override for fetch implementation.
   * When not provided, globalThis.fetch must be available.
   */
  fetch?: FetchLike;
}

function resolveFetch(custom?: FetchLike): FetchLike {
  if (custom) return custom;
  const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
  if (!globalFetch) {
    throw new Error('global fetch is not available. Pass a custom fetch implementation in options.fetch.');
  }
  return globalFetch;
}

function mapScoresBackToChunks(chunks: Chunk[], scoresByIndex: Map<number, number>): Chunk[] {
  if (scoresByIndex.size === 0) {
    return chunks;
  }
  return chunks.map((chunk, index) => {
    const score = scoresByIndex.get(index);
    if (score === undefined) return chunk;
    return { ...chunk, score };
  });
}

// COHERE

export interface CohereRerankerOptions extends BaseRerankerOptions {
  /**
   * Cohere rerank model, e.g. "rerank-v4.0-mini" or "rerank-v3.5".
   */
  model?: string;
  /**
   * Optional limit for top documents returned by the provider.
   * When omitted, provider default is used.
   */
  topN?: number;
  /**
   * Optional base URL for Cohere API, defaults to https://api.cohere.com.
   */
  baseUrl?: string;
}

export function createCohereReranker(options: CohereRerankerOptions): Reranker {
  const {
    apiKey,
    fetch: customFetch,
    model = 'rerank-v3.5',
    topN,
    baseUrl = 'https://api.cohere.com',
  } = options;

  const fetchImpl = resolveFetch(customFetch);

  const url = `${baseUrl.replace(/\/+$/, '')}/v2/rerank`;

  return {
    async rerank(chunks, query, rerankOptions) {
      if (!query || chunks.length === 0) {
        return chunks;
      }

      const documents = chunks.map((c) => c.text);

      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // @ts-expect-error AbortSignal typing is intentionally loose to avoid DOM dependency.
        signal: rerankOptions?.signal?.aborted ? undefined : rerankOptions?.signal,
        body: JSON.stringify({
          model,
          query,
          documents,
          top_n: topN,
        }),
      } as any);

      if (!response.ok) {
        throw new Error(`Cohere rerank request failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        results?: Array<{ index: number; relevance_score: number }>;
      };

      if (!data.results || !Array.isArray(data.results)) {
        // Provider did not return usable scores; fall back to original chunks.
        return chunks;
      }

      const scores = new Map<number, number>();
      for (const item of data.results) {
        if (
          typeof item.index === 'number' &&
          item.index >= 0 &&
          item.index < chunks.length &&
          typeof item.relevance_score === 'number' &&
          Number.isFinite(item.relevance_score)
        ) {
          scores.set(item.index, item.relevance_score);
        }
      }

      return mapScoresBackToChunks(chunks, scores);
    },
  };
}

// VOYAGE

export interface VoyageRerankerOptions extends BaseRerankerOptions {
  /**
   * Voyage rerank model, e.g. "rerank-2.5" or "rerank-2.5-lite".
   */
  model?: string;
  /**
   * Limit for top documents returned by the provider.
   */
  topK?: number;
  /**
   * Optional base URL, defaults to https://api.voyageai.com.
   */
  baseUrl?: string;
}

export function createVoyageReranker(options: VoyageRerankerOptions): Reranker {
  const {
    apiKey,
    fetch: customFetch,
    model = 'rerank-2.5',
    topK,
    baseUrl = 'https://api.voyageai.com',
  } = options;

  const fetchImpl = resolveFetch(customFetch);
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/rerank`;

  return {
    async rerank(chunks, query, rerankOptions) {
      if (!query || chunks.length === 0) {
        return chunks;
      }

      const documents = chunks.map((c) => c.text);

      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // @ts-expect-error AbortSignal typing is intentionally loose to avoid DOM dependency.
        signal: rerankOptions?.signal?.aborted ? undefined : rerankOptions?.signal,
        body: JSON.stringify({
          model,
          query,
          documents,
          top_k: topK,
          return_documents: false,
        }),
      } as any);

      if (!response.ok) {
        throw new Error(`Voyage rerank request failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        results?: Array<{ index: number; relevance_score: number }>;
      };

      if (!data.results || !Array.isArray(data.results)) {
        return chunks;
      }

      const scores = new Map<number, number>();
      for (const item of data.results) {
        if (
          typeof item.index === 'number' &&
          item.index >= 0 &&
          item.index < chunks.length &&
          typeof item.relevance_score === 'number' &&
          Number.isFinite(item.relevance_score)
        ) {
          scores.set(item.index, item.relevance_score);
        }
      }

      return mapScoresBackToChunks(chunks, scores);
    },
  };
}

// JINA

export interface JinaRerankerOptions extends BaseRerankerOptions {
  /**
   * Jina rerank model, e.g. "jina-reranker-v3".
   */
  model?: string;
  /**
   * Limit for top documents returned by the provider.
   */
  topN?: number;
  /**
   * Optional base URL, defaults to https://api.jina.ai.
   */
  baseUrl?: string;
}

export function createJinaReranker(options: JinaRerankerOptions): Reranker {
  const {
    apiKey,
    fetch: customFetch,
    model = 'jina-reranker-v3',
    topN,
    baseUrl = 'https://api.jina.ai',
  } = options;

  const fetchImpl = resolveFetch(customFetch);
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/rerank`;

  return {
    async rerank(chunks, query, rerankOptions) {
      if (!query || chunks.length === 0) {
        return chunks;
      }

      const documents = chunks.map((c) => c.text);

      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // @ts-expect-error AbortSignal typing is intentionally loose to avoid DOM dependency.
        signal: rerankOptions?.signal?.aborted ? undefined : rerankOptions?.signal,
        body: JSON.stringify({
          model,
          query,
          documents,
          top_n: topN,
        }),
      } as any);

      if (!response.ok) {
        throw new Error(`Jina rerank request failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        results?: Array<{ index: number; relevance_score: number }>;
      };

      if (!data.results || !Array.isArray(data.results)) {
        return chunks;
      }

      const scores = new Map<number, number>();
      for (const item of data.results) {
        if (
          typeof item.index === 'number' &&
          item.index >= 0 &&
          item.index < chunks.length &&
          typeof item.relevance_score === 'number' &&
          Number.isFinite(item.relevance_score)
        ) {
          scores.set(item.index, item.relevance_score);
        }
      }

      return mapScoresBackToChunks(chunks, scores);
    },
  };
}

