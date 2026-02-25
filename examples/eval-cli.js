#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const USAGE = `
Usage:
  node examples/eval-cli.js --input <dataset.jsonl> [options]

Dataset (JSONL) expected fields per line:
  {
    "query": "string (optional)",
    "prediction": "baseline answer (optional)",
    "predictionReordered": "answer after reorder (optional)",
    "references": ["gold answer", ...] | "gold answer" (optional),
    "relevantIds": ["doc-1", "doc-2"] (optional),
    "relevantSpans": ["span-1", "span-2"] (optional),
    "chunks": [{ "id": "...", "text": "...", "score": 0.9, "metadata": { ... } }]
  }

Options:
  --strategy scoreSpread|preserveOrder|chronological|custom|auto
  --startCount <int>
  --endCount <int>
  --topK <int>
  --maxTokens <int>
  --minScore <number>
  --deduplicate true|false
  --deduplicateThreshold <0-1>
  --packing auto|prefix|edgeAware
  --validationMode strict|coerce
  --tokenCounter words|chars (default: words)
  --recallK <int>
  --ciSamples <int> (default: 500)
  --config <path/to/config.json>
`;

function loadLib() {
  try {
    return require('../dist/cjs/index.js');
  } catch (error) {
    try {
      return require('rag-chunk-reorder');
    } catch {
      console.error('Could not load library. Run `npm run build` first.');
      console.error(error?.message ?? error);
      process.exit(1);
    }
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function toNumber(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function mean(values) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return undefined;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

function bootstrapCI(values, samples) {
  if (values.length === 0) return undefined;
  const n = values.length;
  const draws = [];
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(Math.random() * n);
      sum += values[idx];
    }
    draws.push(sum / n);
  }
  draws.sort((a, b) => a - b);
  return {
    lower: percentile(draws, 0.025),
    upper: percentile(draws, 0.975),
  };
}

function formatValueWithCI(value, ci) {
  if (value === undefined) return 'n/a';
  if (!ci || ci.lower === undefined || ci.upper === undefined) {
    return value.toFixed(4);
  }
  return `${value.toFixed(4)} [${ci.lower.toFixed(4)}, ${ci.upper.toFixed(4)}]`;
}

function formatMetricWithCI(label, baseValues, reorderValues, ciSamples) {
  if (baseValues.length === 0 || reorderValues.length === 0) {
    return `${label}: n/a`;
  }
  const baseMean = mean(baseValues);
  const reorderMean = mean(reorderValues);
  const baseCI = bootstrapCI(baseValues, ciSamples);
  const reorderCI = bootstrapCI(reorderValues, ciSamples);
  const delta = reorderMean - baseMean;
  const deltaStr = delta >= 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4);
  return `${label}: ${formatValueWithCI(baseMean, baseCI)} -> ${formatValueWithCI(reorderMean, reorderCI)} (${deltaStr})`;
}

function applyTokenBudgetPrefix(chunks, maxTokens, tokenCounter) {
  if (maxTokens === undefined || !tokenCounter) return [...chunks];
  const result = [];
  let total = 0;
  for (const chunk of chunks) {
    const cached = chunk.tokenCount ?? (chunk.metadata ? chunk.metadata.tokenCount : undefined);
    const tokens = cached !== undefined ? cached : tokenCounter(chunk.text);
    if (!Number.isFinite(tokens) || tokens < 0) {
      throw new Error('tokenCounter must return a non-negative finite number');
    }
    if (total + tokens > maxTokens) break;
    total += tokens;
    result.push(chunk);
  }
  return result;
}

function applyBaselinePipeline(chunks, config, helpers) {
  const { prepareChunks, deduplicateChunks } = helpers;
  let working = prepareChunks(chunks, config.validationMode);
  if (config.minScore !== undefined) {
    working = working.filter((c) => c.score >= config.minScore);
  }
  if (config.deduplicate) {
    working = deduplicateChunks(working, {
      threshold: config.deduplicateThreshold,
      keep: config.deduplicateKeep,
    });
  }
  working = applyTokenBudgetPrefix(working, config.maxTokens, config.tokenCounter);
  if (config.topK !== undefined && working.length > config.topK) {
    working = working.slice(0, config.topK);
  }
  return working;
}

function pickPrediction(item, preferAfter) {
  if (preferAfter) {
    return (
      item.predictionReordered ??
      item.prediction_after ??
      item.predictionAfter ??
      item.prediction
    );
  }
  return item.prediction;
}

function normalizeReferences(item) {
  const refs = item.references ?? item.reference ?? item.answers;
  if (refs === undefined) return undefined;
  return Array.isArray(refs) ? refs : [refs];
}

function normalizeRelevantIds(item) {
  const ids = item.relevantIds ?? item.relevant_ids ?? item.relevant;
  if (ids === undefined) return undefined;
  return Array.isArray(ids) ? ids : [ids];
}

function normalizeRelevantSpans(item) {
  const spans = item.relevantSpans ?? item.relevant_spans ?? item.spans;
  if (spans === undefined) return undefined;
  return Array.isArray(spans) ? spans : [spans];
}

function formatMetric(label, baseValue, reorderValue) {
  if (baseValue === undefined || reorderValue === undefined) {
    return `${label}: n/a`;
  }
  const delta = reorderValue - baseValue;
  const deltaStr = delta >= 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4);
  return `${label}: ${baseValue.toFixed(4)} -> ${reorderValue.toFixed(4)} (${deltaStr})`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE.trim());
    process.exit(0);
  }
  const inputPath = args.input ?? args._[0];
  if (!inputPath) {
    console.log(USAGE.trim());
    process.exit(1);
  }

  const lib = loadLib();
  const {
    Reorderer,
    prepareChunks,
    deduplicateChunks,
    scoreChunks,
    positionEffectiveness,
    ndcg,
    evaluateAnswerSet,
    retrievalRecallAtK,
    spanRecall,
  } = lib;

  let baseConfig = {};
  if (args.config) {
    const configPath = path.resolve(String(args.config));
    baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const tokenCounterChoice = (args.tokenCounter ?? 'words').toString();
  const tokenCounter =
    tokenCounterChoice === 'chars'
      ? (text) => text.length
      : (text) => text.trim().split(/\s+/).filter(Boolean).length;

  const config = {
    ...baseConfig,
    strategy: args.strategy ?? baseConfig.strategy,
    startCount: toNumber(args.startCount) ?? baseConfig.startCount,
    endCount: toNumber(args.endCount) ?? baseConfig.endCount,
    topK: toNumber(args.topK) ?? baseConfig.topK,
    maxTokens: toNumber(args.maxTokens) ?? baseConfig.maxTokens,
    minScore: toNumber(args.minScore) ?? baseConfig.minScore,
    deduplicate: toBoolean(args.deduplicate) ?? baseConfig.deduplicate,
    deduplicateThreshold:
      toNumber(args.deduplicateThreshold) ?? baseConfig.deduplicateThreshold,
    packing: args.packing ?? baseConfig.packing,
    validationMode: args.validationMode ?? baseConfig.validationMode,
  };

  if (config.maxTokens !== undefined) {
    config.tokenCounter = tokenCounter;
  }

  const reorderer = new Reorderer(config);
  const merged = reorderer.getConfig();
  const recallK = toNumber(args.recallK);
  const ciSamples = toNumber(args.ciSamples) ?? 500;

  const data = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const lines = data.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const baselineAnswerCases = [];
  const reorderAnswerCases = [];
  const baselineNdcg = [];
  const reorderNdcg = [];
  const baselinePosEff = [];
  const reorderPosEff = [];
  const baselineRecall = [];
  const reorderRecall = [];
  const baselineSpanRecall = [];
  const reorderSpanRecall = [];

  let total = 0;
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    let item;
    try {
      item = JSON.parse(lines[i]);
    } catch (error) {
      skipped++;
      continue;
    }

    if (!item || !Array.isArray(item.chunks)) {
      skipped++;
      continue;
    }

    try {
      total++;
      const query = item.query;
      const baselineChunks = applyBaselinePipeline(item.chunks, merged, {
        prepareChunks,
        deduplicateChunks,
      });

      const reordered = await reorderer.reorder(item.chunks, query);

      baselineNdcg.push(ndcg(baselineChunks.map((c) => c.score)));
      reorderNdcg.push(ndcg(reordered.map((c) => c.score)));

      const baselineScored = scoreChunks(baselineChunks, merged.weights);
      const reorderedScored = scoreChunks(reordered, merged.weights);
      baselinePosEff.push(positionEffectiveness(baselineScored));
      reorderPosEff.push(positionEffectiveness(reorderedScored));

      const refs = normalizeReferences(item);
      const baselinePrediction = pickPrediction(item, false);
      const reorderedPrediction = pickPrediction(item, true);

      if (refs && baselinePrediction !== undefined) {
        baselineAnswerCases.push({
          prediction: String(baselinePrediction),
          references: refs,
          contexts: baselineChunks.map((c) => c.text),
        });
      }

      if (refs && reorderedPrediction !== undefined) {
        reorderAnswerCases.push({
          prediction: String(reorderedPrediction),
          references: refs,
          contexts: reordered.map((c) => c.text),
        });
      }

      const relevantIds = normalizeRelevantIds(item);
      if (relevantIds) {
        baselineRecall.push(retrievalRecallAtK(baselineChunks, relevantIds, recallK));
        reorderRecall.push(retrievalRecallAtK(reordered, relevantIds, recallK));
      }

      const relevantSpans = normalizeRelevantSpans(item);
      if (relevantSpans) {
        baselineSpanRecall.push(spanRecall(relevantSpans, baselineChunks.map((c) => c.text)));
        reorderSpanRecall.push(spanRecall(relevantSpans, reordered.map((c) => c.text)));
      }
    } catch (error) {
      skipped++;
    }
  }

  const baselineAnswerSummary =
    baselineAnswerCases.length > 0 ? evaluateAnswerSet(baselineAnswerCases) : undefined;
  const reorderAnswerSummary =
    reorderAnswerCases.length > 0 ? evaluateAnswerSet(reorderAnswerCases) : undefined;

  console.log(`Cases processed: ${total}`);
  console.log(`Cases skipped:   ${skipped}`);
  console.log('');

  console.log('Ranking metrics');
  console.log(formatMetricWithCI('nDCG', baselineNdcg, reorderNdcg, ciSamples));
  console.log(formatMetricWithCI('PositionEffectiveness', baselinePosEff, reorderPosEff, ciSamples));

  if (baselineRecall.length > 0 || reorderRecall.length > 0) {
    console.log('');
    const label = recallK ? `Recall@${recallK}` : 'Recall@k';
    console.log('Retrieval metrics');
    console.log(formatMetricWithCI(label, baselineRecall, reorderRecall, ciSamples));
  }

  if (baselineSpanRecall.length > 0 || reorderSpanRecall.length > 0) {
    console.log('');
    console.log('Span metrics');
    console.log(formatMetricWithCI('SpanRecall', baselineSpanRecall, reorderSpanRecall, ciSamples));
  }

  if (baselineAnswerSummary && reorderAnswerSummary) {
    const baselinePer = baselineAnswerSummary.perExample ?? [];
    const reorderPer = reorderAnswerSummary.perExample ?? [];
    const baselineEm = baselinePer.map((p) => p.exactMatch);
    const reorderEm = reorderPer.map((p) => p.exactMatch);
    const baselineF1 = baselinePer.map((p) => p.f1);
    const reorderF1 = reorderPer.map((p) => p.f1);
    const baselineAnswerability = baselinePer
      .map((p) => p.answerability)
      .filter((v) => typeof v === 'number');
    const reorderAnswerability = reorderPer
      .map((p) => p.answerability)
      .filter((v) => typeof v === 'number');
    const baselineCitation = baselinePer
      .map((p) => p.citationCoverage)
      .filter((v) => typeof v === 'number');
    const reorderCitation = reorderPer
      .map((p) => p.citationCoverage)
      .filter((v) => typeof v === 'number');
    const baselineFaith = baselinePer
      .map((p) => p.faithfulness)
      .filter((v) => typeof v === 'number');
    const reorderFaith = reorderPer
      .map((p) => p.faithfulness)
      .filter((v) => typeof v === 'number');

    console.log('');
    console.log('Answer metrics');
    console.log(
      formatMetricWithCI(
        'ExactMatch',
        baselineEm,
        reorderEm,
        ciSamples,
      ),
    );
    console.log(formatMetricWithCI('TokenF1', baselineF1, reorderF1, ciSamples));
    console.log(
      formatMetricWithCI(
        'Answerability',
        baselineAnswerability,
        reorderAnswerability,
        ciSamples,
      ),
    );
    console.log(
      formatMetricWithCI(
        'CitationCoverage',
        baselineCitation,
        reorderCitation,
        ciSamples,
      ),
    );
    console.log(
      formatMetricWithCI(
        'Faithfulness',
        baselineFaith,
        reorderFaith,
        ciSamples,
      ),
    );
  } else {
    console.log('');
    console.log('Answer metrics: n/a (prediction/references missing)');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
