import { AutoStrategyConfig, Chunk, QueryIntent, Strategy } from './types';

export interface MetadataCoverage {
  timestamp: number;
  sourceId: number;
  sectionIndex: number;
}

function normalizeSourceId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object' || typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  return String(value);
}

function normalizeText(text: string): string {
  return text.normalize('NFKC').trim().toLowerCase();
}

function tokenizeWords(text: string): string[] {
  return normalizeText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function hasTokenSequence(textTokens: string[], termTokens: string[]): boolean {
  if (termTokens.length === 0) return false;
  if (termTokens.length > textTokens.length) return false;

  for (let i = 0; i <= textTokens.length - termTokens.length; i++) {
    let matches = true;
    for (let j = 0; j < termTokens.length; j++) {
      if (textTokens[i + j] !== termTokens[j]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }

  return false;
}

function containsAny(text: string, terms: string[]): boolean {
  const textTokens = tokenizeWords(text);
  if (textTokens.length === 0) return false;
  const textTokenSet = new Set(textTokens);

  for (const term of terms) {
    const termTokens = tokenizeWords(term);
    if (termTokens.length === 0) continue;

    if (termTokens.length === 1) {
      if (textTokenSet.has(termTokens[0])) return true;
      continue;
    }

    if (hasTokenSequence(textTokens, termTokens)) return true;
  }

  return false;
}

export function detectQueryIntent(query: string | undefined, config: AutoStrategyConfig): QueryIntent {
  if (!query || query.trim().length === 0) return 'factoid';

  const temporalTerms = config.temporalQueryTerms ?? [];
  const narrativeTerms = config.narrativeQueryTerms ?? [];

  if (containsAny(query, temporalTerms)) return 'temporal';
  if (containsAny(query, narrativeTerms)) return 'narrative';
  return 'factoid';
}

export function metadataCoverage(chunks: Chunk[]): MetadataCoverage {
  if (chunks.length === 0) {
    return { timestamp: 0, sourceId: 0, sectionIndex: 0 };
  }

  let timestamp = 0;
  let sourceId = 0;
  let sectionIndex = 0;

  for (const c of chunks) {
    const timestampValue = c.metadata?.timestamp;
    const sectionIndexValue = c.metadata?.sectionIndex;
    const sourceValue = normalizeSourceId(c.metadata?.sourceId);

    if (typeof timestampValue === 'number' && Number.isFinite(timestampValue)) timestamp++;
    if (typeof sectionIndexValue === 'number' && Number.isFinite(sectionIndexValue)) sectionIndex++;
    if (sourceValue !== undefined && sourceValue.length > 0) sourceId++;
  }

  return {
    timestamp: timestamp / chunks.length,
    sourceId: sourceId / chunks.length,
    sectionIndex: sectionIndex / chunks.length,
  };
}

/**
 * Resolve strategy for strategy='auto' based on query intent and metadata availability.
 */
export function resolveAutoStrategy(chunks: Chunk[], query: string | undefined, config: AutoStrategyConfig): Exclude<Strategy, 'auto'> {
  const intent = detectQueryIntent(query, config);
  const coverage = metadataCoverage(chunks);

  const temporalThreshold = config.temporalTimestampCoverageThreshold ?? 0.4;
  const narrativeSourceThreshold = config.narrativeSourceCoverageThreshold ?? 0.4;
  const narrativeSectionThreshold = config.narrativeSectionCoverageThreshold ?? 0.3;

  if (intent === 'temporal' && coverage.timestamp >= temporalThreshold) {
    return 'chronological';
  }

  if (
    intent === 'narrative' &&
    coverage.sourceId >= narrativeSourceThreshold &&
    coverage.sectionIndex >= narrativeSectionThreshold
  ) {
    return 'preserveOrder';
  }

  return 'scoreSpread';
}
