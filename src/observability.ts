import { ReorderDiagnostics, TraceStep } from './types';

export interface OtelTracer {
  startSpan(name: string, options?: { attributes?: Record<string, unknown> }): OtelSpan;
}

export interface OtelSpan {
  end(): void;
  setAttribute(key: string, value: unknown): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
}

export interface CreateOtelHooksOptions {
  tracer: OtelTracer;
  spanName?: string;
}

export function createOtelHooks(options: CreateOtelHooksOptions): {
  onTraceStep: (step: TraceStep, ms: number, details?: Record<string, unknown>) => void;
  onDiagnostics: (stats: ReorderDiagnostics) => void;
} {
  const { tracer, spanName = 'rag-chunk-reorder' } = options;

  const onTraceStep = (step: TraceStep, ms: number, details?: Record<string, unknown>) => {
    const span = tracer.startSpan(`${spanName}.${step}`);
    try {
      span.setAttribute('rag.step', step);
      span.setAttribute('rag.duration_ms', ms);
      if (details) {
        for (const [key, value] of Object.entries(details)) {
          span.setAttribute(`rag.${key}`, value);
        }
      }
      span.addEvent('rag.step.completed');
    } finally {
      span.end();
    }
  };

  const onDiagnostics = (stats: ReorderDiagnostics) => {
    const span = tracer.startSpan(`${spanName}.diagnostics`);
    try {
      span.setAttribute('rag.strategy', stats.strategyChosen);
      span.setAttribute('rag.chunk_count', stats.inputCount);
      if (stats.queryLength !== undefined) {
        span.setAttribute('rag.query_length', stats.queryLength);
      }
      const entries: Array<[string, unknown]> = [
        ['inputCount', stats.inputCount],
        ['validatedCount', stats.validatedCount],
        ['coercedScores', stats.coercedScores],
        ['droppedMetadataFields', stats.droppedMetadataFields],
        ['droppedMetadataTimestamp', stats.droppedMetadataTimestamp],
        ['droppedMetadataSectionIndex', stats.droppedMetadataSectionIndex],
        ['droppedMetadataSourceId', stats.droppedMetadataSourceId],
        ['droppedMetadataSourceReliability', stats.droppedMetadataSourceReliability],
        ['dedupStrategyUsed', stats.dedupStrategyUsed],
        ['packingStrategyUsed', stats.packingStrategyUsed],
        ['tokenCountUsed', stats.tokenCountUsed],
        ['cachedTokenCountUsed', stats.cachedTokenCountUsed],
        ['charCountUsed', stats.charCountUsed],
        ['budgetUnit', stats.budgetUnit],
        ['filteredByMinScore', stats.filteredByMinScore],
        ['dedupRemoved', stats.dedupRemoved],
        ['rerankerApplied', stats.rerankerApplied],
        ['strategyChosen', stats.strategyChosen],
        ['budgetPruned', stats.budgetPruned],
        ['outputCount', stats.outputCount],
      ];
      for (const [key, value] of entries) {
        span.setAttribute(`rag.${key}`, value);
      }
      if (stats.rerankerFailed !== undefined) {
        span.setAttribute('rag.rerankerFailed', stats.rerankerFailed);
      }
      if (stats.rerankerLatencyMs !== undefined) {
        span.setAttribute('rag.rerankerLatencyMs', stats.rerankerLatencyMs);
      }
      if (stats.rerankerBatches !== undefined) {
        span.setAttribute('rag.rerankerBatches', stats.rerankerBatches);
      }
      span.addEvent('rag.diagnostics');
    } finally {
      span.end();
    }
  };

  return { onTraceStep, onDiagnostics };
}

export interface MetricsCounters {
  inputCount: number;
  validatedCount: number;
  coercedScores: number;
  droppedMetadataFields: number;
  droppedMetadataTimestamp: number;
  droppedMetadataSectionIndex: number;
  droppedMetadataSourceId: number;
  droppedMetadataSourceReliability: number;
  dedupExact: number;
  dedupFuzzy: number;
  tokenCountUsed: number;
  cachedTokenCountUsed: number;
  charCountUsed: number;
  filteredByMinScore: number;
  dedupRemoved: number;
  rerankerApplied: number;
  budgetPruned: number;
  outputCount: number;
}

export interface MetricsSink {
  incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
  recordGauge?(name: string, value: number, labels?: Record<string, string>): void;
}

export interface CreateMetricsHooksOptions {
  sink: MetricsSink;
  namespace?: string;
}

export function createMetricsHooks(options: CreateMetricsHooksOptions): {
  onDiagnostics: (stats: ReorderDiagnostics) => void;
} {
  const { sink, namespace = 'rag_chunk_reorder' } = options;

  const prefix = (name: string) => `${namespace}_${name}`;

  const onDiagnostics = (stats: ReorderDiagnostics) => {
    const labels = {
      strategy: stats.strategyChosen,
      dedup_strategy: stats.dedupStrategyUsed,
      budget_unit: stats.budgetUnit,
      packing: stats.packingStrategyUsed,
    };

    sink.incrementCounter(prefix('calls_total'), 1, labels);
    sink.incrementCounter(prefix('input_count_total'), stats.inputCount, labels);
    sink.incrementCounter(prefix('validated_count_total'), stats.validatedCount, labels);
    sink.incrementCounter(prefix('coerced_scores_total'), stats.coercedScores, labels);
    sink.incrementCounter(prefix('dropped_metadata_fields_total'), stats.droppedMetadataFields, labels);
    sink.incrementCounter(
      prefix('dropped_metadata_timestamp_total'),
      stats.droppedMetadataTimestamp,
      labels,
    );
    sink.incrementCounter(
      prefix('dropped_metadata_section_index_total'),
      stats.droppedMetadataSectionIndex,
      labels,
    );
    sink.incrementCounter(
      prefix('dropped_metadata_source_id_total'),
      stats.droppedMetadataSourceId,
      labels,
    );
    sink.incrementCounter(
      prefix('dropped_metadata_source_reliability_total'),
      stats.droppedMetadataSourceReliability,
      labels,
    );

    if (stats.dedupStrategyUsed === 'exact') {
      sink.incrementCounter(prefix('dedup_exact_total'), 1, labels);
    } else if (stats.dedupStrategyUsed === 'fuzzy') {
      sink.incrementCounter(prefix('dedup_fuzzy_total'), 1, labels);
    }

    sink.incrementCounter(prefix('token_count_used_total'), stats.tokenCountUsed, labels);
    sink.incrementCounter(prefix('cached_token_count_used_total'), stats.cachedTokenCountUsed, labels);
    sink.incrementCounter(prefix('char_count_used_total'), stats.charCountUsed, labels);
    sink.incrementCounter(prefix('filtered_by_min_score_total'), stats.filteredByMinScore, labels);
    sink.incrementCounter(prefix('dedup_removed_total'), stats.dedupRemoved, labels);
    if (stats.rerankerApplied) {
      sink.incrementCounter(prefix('reranker_applied_total'), 1, labels);
    }
    sink.incrementCounter(prefix('budget_pruned_total'), stats.budgetPruned, labels);
    sink.incrementCounter(prefix('output_count_total'), stats.outputCount, labels);

    if (sink.recordGauge) {
      sink.recordGauge(prefix('last_input_count'), stats.inputCount, labels);
      sink.recordGauge(prefix('last_output_count'), stats.outputCount, labels);
      sink.recordGauge(prefix('last_token_count_used'), stats.tokenCountUsed, labels);
      sink.recordGauge(prefix('last_char_count_used'), stats.charCountUsed, labels);
    }
  };

  return { onDiagnostics };
}

