/**
 * Production-style setup: diagnostics → metrics, reranker errors → logger,
 * trace steps → OTEL, maxInputChunks guard, and pipeline helper.
 *
 * Run with: npx ts-node examples/production.ts (or tsx)
 */
import {
  Reorderer,
  reorderForDocsQA,
  createOtelHooks,
  createMetricsHooks,
  type ReorderDiagnostics,
  type Chunk,
} from 'rag-chunk-reorder';

// --- Mock tracer and metrics (replace with real OpenTelemetry / Prometheus in production)

const mockTracer = {
  startSpan(name: string) {
    const attrs: Record<string, unknown> = {};
    return {
      setAttribute(k: string, v: unknown) {
        attrs[k] = v;
      },
      addEvent() {},
      end() {
        console.log('[OTEL] span:', name, attrs);
      },
    };
  },
};

const mockMetrics = {
  incrementCounter(name: string, value?: number, labels?: Record<string, string>) {
    console.log('[METRICS] counter:', name, value ?? 1, labels ?? {});
  },
  recordGauge(name: string, value: number, labels?: Record<string, string>) {
    console.log('[METRICS] gauge:', name, value, labels ?? {});
  },
};

// --- Hooks

const otel = createOtelHooks({ tracer: mockTracer, spanName: 'rag-chunk-reorder' });
const metrics = createMetricsHooks({ sink: mockMetrics, namespace: 'rag_chunk_reorder' });

function onDiagnostics(stats: ReorderDiagnostics) {
  otel.onDiagnostics(stats);
  metrics.onDiagnostics(stats);
}

function onRerankerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[RERANKER]', message);
}

// --- Example: reorder with production config

async function run() {
  const chunks: Chunk[] = [
    { id: '1', text: 'Relevant passage A', score: 0.95 },
    { id: '2', text: 'Relevant passage B', score: 0.82 },
    { id: '3', text: 'Relevant passage C', score: 0.78 },
  ];

  const reorderer = new Reorderer({
    strategy: 'scoreSpread',
    topK: 10,
    maxInputChunks: 500,
    maxInputChunksBehavior: 'truncate',
    onDiagnostics,
    onRerankerError,
    onTraceStep: otel.onTraceStep,
  });

  const reordered = reorderer.reorderSync(chunks);
  console.log('Output count:', reordered.length);
}

// --- Example: pipeline helper with same hooks

async function runWithPipelineHelper() {
  const chunks: Chunk[] = [
    { id: '1', text: 'Doc chunk 1', score: 0.9 },
    { id: '2', text: 'Doc chunk 2', score: 0.85 },
  ];

  const reordered = await reorderForDocsQA(chunks, 'What is X?', {
    topK: 8,
    maxInputChunks: 500,
    maxInputChunksBehavior: 'truncate',
    onDiagnostics,
    onRerankerError,
    onTraceStep: otel.onTraceStep,
  });

  console.log('Pipeline output count:', reordered.length);
}

void run()
  .then(() => runWithPipelineHelper())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
