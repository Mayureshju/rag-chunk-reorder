import { Reorderer, reorderLlamaIndexNodes } from 'rag-chunk-reorder';

async function main() {
  const nodes = [
    { id_: '1', text: 'Incident started at 10:00', score: 0.9, metadata: { timestamp: 1700000000, sourceId: 'log-1' } },
    { id_: '2', text: 'Incident resolved at 10:15', score: 0.92, metadata: { timestamp: 1700000900, sourceId: 'log-1' } },
    { id_: '3', text: 'Postmortem summary', score: 0.85, metadata: { timestamp: 1700001200, sourceId: 'report' } },
  ];

  const reorderer = new Reorderer({
    strategy: 'auto',
    autoStrategy: { temporalTimestampCoverageThreshold: 0.3 },
    diversity: { enabled: true },
  });

  const reordered = await reorderLlamaIndexNodes(nodes, {
    reorderer,
    query: 'What happened first in the timeline?',
  });

  console.log(reordered.map((n) => n.id_));
}

void main();
