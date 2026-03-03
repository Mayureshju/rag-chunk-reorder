#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { Reorderer } from './reorderer';
import { deserializeChunks } from './serializer';
import { ReorderConfig } from './types';

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
};

function printHelp() {
  const text = `rag-chunk-reorder CLI

Usage:
  rag-chunk-reorder --input chunks.json --output reordered.json --strategy scoreSpread --topK 10
  rag-chunk-reorder --jsonl --input chunks.jsonl --query "what happened?" --strategy auto

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
  --help, -h               Show this help.
`;
  process.stdout.write(text);
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
  if (fs.existsSync(resolved)) {
    const file = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(file) as ReorderConfig;
  }
  return undefined;
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
  const reorderer = new Reorderer(config);
  const result = await reorderer.reorder(chunks, args.query);

  const output = args.jsonl
    ? result.map((c) => JSON.stringify(c)).join('\n') + '\n'
    : JSON.stringify(result, null, 2);

  writeOutput(output, args.output);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
