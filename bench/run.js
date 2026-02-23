const fs = require('fs');
const path = require('path');
const {
  Reorderer,
  keyPointRecall,
  positionEffectiveness,
  ndcg,
  scoreChunks,
} = require('../dist/cjs');

const DATASET = path.join(__dirname, 'data', 'sample.jsonl');
const TOP_K = 4;

function readJsonl(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  return raw.split('\n').map((line) => JSON.parse(line));
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function format(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function evaluateCase(entry, reorderer) {
  const baseline = entry.chunks.slice(0, TOP_K);
  const reordered = reorderer.reorderSync(entry.chunks, entry.query);

  const weights = reorderer.getConfig().weights;
  const baselineScored = scoreChunks(baseline, weights);
  const reorderedScored = scoreChunks(reordered, weights);

  return {
    id: entry.id,
    baseline: {
      keyPointRecall: keyPointRecall(entry.keyPoints, baseline.map((c) => c.text)),
      positionEffectiveness: positionEffectiveness(baselineScored),
      ndcg: ndcg(baseline.map((c) => c.score)),
    },
    reordered: {
      keyPointRecall: keyPointRecall(entry.keyPoints, reordered.map((c) => c.text)),
      positionEffectiveness: positionEffectiveness(reorderedScored),
      ndcg: ndcg(reordered.map((c) => c.score)),
    },
  };
}

function main() {
  const dataset = readJsonl(DATASET);
  if (dataset.length === 0) {
    console.error('No dataset entries found.');
    process.exit(1);
  }

  const reorderer = new Reorderer({
    strategy: 'scoreSpread',
    topK: TOP_K,
  });

  const results = dataset.map((entry) => evaluateCase(entry, reorderer));

  console.log('Benchmark: baseline (topK prefix) vs reordered (edge-aware topK)');
  console.log(`Dataset: ${DATASET}`);
  console.log(`TopK: ${TOP_K}\n`);

  for (const r of results) {
    console.log(`Case: ${r.id}`);
    console.log(
      `  keyPointRecall: ${format(r.baseline.keyPointRecall)} -> ${format(r.reordered.keyPointRecall)}`,
    );
    console.log(
      `  positionEffectiveness: ${format(r.baseline.positionEffectiveness)} -> ${format(r.reordered.positionEffectiveness)}`,
    );
    console.log(`  nDCG: ${format(r.baseline.ndcg)} -> ${format(r.reordered.ndcg)}\n`);
  }

  const metrics = {
    keyPointRecall: mean(results.map((r) => r.reordered.keyPointRecall)),
    positionEffectiveness: mean(results.map((r) => r.reordered.positionEffectiveness)),
    ndcg: mean(results.map((r) => r.reordered.ndcg)),
  };
  const baselineMetrics = {
    keyPointRecall: mean(results.map((r) => r.baseline.keyPointRecall)),
    positionEffectiveness: mean(results.map((r) => r.baseline.positionEffectiveness)),
    ndcg: mean(results.map((r) => r.baseline.ndcg)),
  };

  console.log('Aggregate');
  console.log(
    `  keyPointRecall: ${format(baselineMetrics.keyPointRecall)} -> ${format(metrics.keyPointRecall)}`,
  );
  console.log(
    `  positionEffectiveness: ${format(baselineMetrics.positionEffectiveness)} -> ${format(metrics.positionEffectiveness)}`,
  );
  console.log(`  nDCG: ${format(baselineMetrics.ndcg)} -> ${format(metrics.ndcg)}`);
}

main();
