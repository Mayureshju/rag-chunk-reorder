#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Reorderer } from './reorderer';
import { deserializeChunks } from './serializer';
import { ReorderConfig } from './types';
import { evaluateAnswerSet, AnswerEvalCase } from './evaluator';

declare const __dirname: string;

type Args = {
  input?: string;
  output?: string;
  jsonl?: boolean;
  query?: string;
  config?: string;
  strategy?: string;
  topK?: number;
  minScore?: number;
  maxTokens?: number;
  maxChars?: number;
  groupBy?: string;
  startCount?: number;
  endCount?: number;
  packing?: string;
  chronologicalOrder?: string;
  preserveOrderSourceField?: string;
  scoreNormalization?: string;
  scoreNormalizationTemperature?: number;
  includeExplain?: boolean;
  includePriorityScore?: boolean;
  validationMode?: string;
  deduplicate?: boolean;
  deduplicateThreshold?: number;
  deduplicateKeep?: string;
  diagnosticsOut?: string;
  dryRun?: boolean;
  bench?: boolean;
  answers?: string;
  predictions?: string;
};

function printHelp() {
  const text = `rag-chunk-reorder CLI

Usage:
  rag-chunk-reorder --input chunks.json --output reordered.json --strategy scoreSpread --topK 10
  rag-chunk-reorder --jsonl --input chunks.jsonl --query "what happened?" --strategy auto
  rag-chunk-reorder --bench --answers answers.jsonl --predictions preds.jsonl

Options:
  --input, -i              Input file (JSON array or JSONL). Defaults to stdin.
  --output, -o             Output file. Defaults to stdout.
  --jsonl                  Treat input/output as JSONL.
  --query                  Query string (used for auto strategy / reranker).
  --config                 JSON string or path to a JSON config file.
  --strategy               scoreSpread | preserveOrder | chronological | custom | auto
  --topK                   Max chunks to return.
  --minScore               Drop chunks below this score.
  --maxTokens              Max token budget (requires tokenCounter in config).
  --maxChars               Max character budget.
  --groupBy                Metadata field for grouping before reorder.
  --startCount             ScoreSpread startCount.
  --endCount               ScoreSpread endCount.
  --packing                auto | prefix | edgeAware
  --chronologicalOrder     asc | desc
  --preserveOrderSourceField  Metadata field used by preserveOrder grouping.
  --scoreNormalization     none | minMax | zScore | softmax
  --scoreNormalizationTemperature  Temperature for softmax normalization.
  --includeExplain         Include per-chunk explain metadata.
  --includePriorityScore   Include priorityScore in metadata.
  --validationMode         strict | coerce
  --deduplicate            Enable deduplication.
  --deduplicateThreshold   Fuzzy dedup threshold (0-1).
  --deduplicateKeep        highestScore | first | last
  --diagnosticsOut         Write diagnostics JSON to this file (reorder-only mode).
  --dry-run                Validate config and input, run reorder, print diagnostics; do not write output.
  --bench                  Run answer-level benchmarks instead of reordering.
  --answers                JSONL file with reference answers (bench mode).
  --predictions            JSONL file with model predictions (bench mode).
  --version, -V            Print package version and exit.
  --help, -h               Show this help.
`;
  process.stdout.write(text);
}

function getVersion(): string {
  try {
    // CJS build (bin) provides __dirname via Node's module wrapper
    const dir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    const p = path.join(dir, '..', '..', 'package.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8')) as { version?: string };
    return j?.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        args.config = 'help';
        return args;
      case '--version':
      case '-V':
        args.config = 'version';
        return args;
      case '--input':
      case '-i':
        args.input = argv[++i];
        break;
      case '--output':
      case '-o':
        args.output = argv[++i];
        break;
      case '--jsonl':
        args.jsonl = true;
        break;
      case '--query':
        args.query = argv[++i];
        break;
      case '--config':
        args.config = argv[++i];
        break;
      case '--strategy':
        args.strategy = argv[++i];
        break;
      case '--topK':
        args.topK = Number(argv[++i]);
        break;
      case '--minScore':
        args.minScore = Number(argv[++i]);
        break;
      case '--maxTokens':
        args.maxTokens = Number(argv[++i]);
        break;
      case '--maxChars':
        args.maxChars = Number(argv[++i]);
        break;
      case '--groupBy':
        args.groupBy = argv[++i];
        break;
      case '--startCount':
        args.startCount = Number(argv[++i]);
        break;
      case '--endCount':
        args.endCount = Number(argv[++i]);
        break;
      case '--packing':
        args.packing = argv[++i];
        break;
      case '--chronologicalOrder':
        args.chronologicalOrder = argv[++i];
        break;
      case '--preserveOrderSourceField':
        args.preserveOrderSourceField = argv[++i];
        break;
      case '--scoreNormalization':
        args.scoreNormalization = argv[++i];
        break;
      case '--scoreNormalizationTemperature':
        args.scoreNormalizationTemperature = Number(argv[++i]);
        break;
      case '--includeExplain':
        args.includeExplain = true;
        break;
      case '--includePriorityScore':
        args.includePriorityScore = true;
        break;
      case '--validationMode':
        args.validationMode = argv[++i];
        break;
      case '--deduplicate':
        args.deduplicate = true;
        break;
      case '--deduplicateThreshold':
        args.deduplicateThreshold = Number(argv[++i]);
        break;
      case '--deduplicateKeep':
        args.deduplicateKeep = argv[++i];
        break;
      case '--diagnosticsOut':
        args.diagnosticsOut = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--bench':
        args.bench = true;
        break;
      case '--answers':
        args.answers = argv[++i];
        break;
      case '--predictions':
        args.predictions = argv[++i];
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown argument: ${arg}`);
        }
        break;
    }
  }
  return args;
}

function readInput(filePath?: string): string {
  if (!filePath) {
    return fs.readFileSync(0, 'utf8');
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseConfig(raw?: string): ReorderConfig | undefined {
  if (!raw) return undefined;
  if (raw.trim().startsWith('{')) {
    return JSON.parse(raw) as ReorderConfig;
  }
  const resolved = path.resolve(raw);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }
  const file = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(file) as ReorderConfig;
}

function parseChunks(raw: string, jsonl?: boolean) {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (jsonl || (!trimmed.startsWith('[') && trimmed.includes('\n'))) {
    return trimmed
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
  }
  return deserializeChunks(trimmed);
}

function readJsonlCases(filePath: string): AnswerEvalCase[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.map((line) => JSON.parse(line) as AnswerEvalCase);
}

function writeOutput(output: string, filePath?: string) {
  if (!filePath) {
    process.stdout.write(output);
    return;
  }
  fs.writeFileSync(filePath, output);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.config === 'help') {
    printHelp();
    return;
  }
  if (args.config === 'version') {
    process.stdout.write(getVersion() + '\n');
    return;
  }

  if (args.bench) {
    if (!args.answers || !args.predictions) {
      throw new Error('--bench requires --answers and --predictions JSONL files');
    }
    const answers = readJsonlCases(args.answers);
    const predictions = readJsonlCases(args.predictions);
    if (answers.length !== predictions.length) {
      throw new Error('answers and predictions JSONL files must have the same number of lines');
    }

    const merged: AnswerEvalCase[] = answers.map((ref, idx) => {
      const pred = predictions[idx];
      return {
        prediction: (pred as AnswerEvalCase).prediction,
        references: ref.references,
        contexts: ref.contexts ?? pred.contexts,
      };
    });

    const summary = evaluateAnswerSet(merged);
    process.stdout.write(JSON.stringify(summary, null, 2));
    return;
  }

  const baseConfig = parseConfig(args.config) ?? {};
  const config: ReorderConfig = {
    ...baseConfig,
    strategy: (args.strategy as ReorderConfig['strategy']) ?? baseConfig.strategy,
    topK: args.topK ?? baseConfig.topK,
    minScore: args.minScore ?? baseConfig.minScore,
    maxTokens: args.maxTokens ?? baseConfig.maxTokens,
    maxChars: args.maxChars ?? baseConfig.maxChars,
    groupBy: args.groupBy ?? baseConfig.groupBy,
    startCount: args.startCount ?? baseConfig.startCount,
    endCount: args.endCount ?? baseConfig.endCount,
    packing: (args.packing as ReorderConfig['packing']) ?? baseConfig.packing,
    chronologicalOrder:
      (args.chronologicalOrder as ReorderConfig['chronologicalOrder']) ??
      baseConfig.chronologicalOrder,
    preserveOrderSourceField:
      args.preserveOrderSourceField ?? baseConfig.preserveOrderSourceField,
    scoreNormalization:
      (args.scoreNormalization as ReorderConfig['scoreNormalization']) ??
      baseConfig.scoreNormalization,
    scoreNormalizationTemperature:
      args.scoreNormalizationTemperature ?? baseConfig.scoreNormalizationTemperature,
    includeExplain: args.includeExplain ?? baseConfig.includeExplain,
    includePriorityScore: args.includePriorityScore ?? baseConfig.includePriorityScore,
    validationMode:
      (args.validationMode as ReorderConfig['validationMode']) ?? baseConfig.validationMode,
    deduplicate: args.deduplicate ?? baseConfig.deduplicate,
    deduplicateThreshold: args.deduplicateThreshold ?? baseConfig.deduplicateThreshold,
    deduplicateKeep:
      (args.deduplicateKeep as ReorderConfig['deduplicateKeep']) ??
      baseConfig.deduplicateKeep,
  };

  const raw = readInput(args.input);
  const chunks = parseChunks(raw, args.jsonl);
  let capturedDiagnostics: unknown | undefined;
  const reorderer = new Reorderer({
    ...config,
    onDiagnostics: (stats) => {
      capturedDiagnostics = stats;
      config.onDiagnostics?.(stats);
    },
  });
  const result = await reorderer.reorder(chunks, args.query);

  if (args.dryRun) {
    const diagnosticsJson = JSON.stringify(capturedDiagnostics ?? {}, null, 2);
    if (args.diagnosticsOut) {
      fs.writeFileSync(args.diagnosticsOut, diagnosticsJson);
    } else {
      process.stdout.write(diagnosticsJson + '\n');
    }
    return;
  }

  const output = args.jsonl
    ? result.map((c) => JSON.stringify(c)).join('\n') + '\n'
    : JSON.stringify(result, null, 2);

  writeOutput(output, args.output);

  if (args.diagnosticsOut && capturedDiagnostics) {
    fs.writeFileSync(args.diagnosticsOut, JSON.stringify(capturedDiagnostics, null, 2));
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
