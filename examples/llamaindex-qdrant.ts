import { QdrantClient } from '@qdrant/js-client-rest';
import { reorderLlamaIndexNodes } from 'rag-chunk-reorder';

async function main() {
  const qdrant = new QdrantClient({ url: process.env.QDRANT_URL! });

  const query = 'When did the incident start?';
  const embedding = [0.01, 0.02, 0.03]; // replace with your embedding

  const hits = await qdrant.search('docs', {
    vector: embedding,
    limit: 20,
  });

  const nodes = hits.map((hit) => ({
    id_: hit.id?.toString(),
    text: (hit.payload?.text as string) ?? '',
    score: hit.score,
    metadata: {
      timestamp: hit.payload?.timestamp as number | undefined,
      sourceId: hit.payload?.docId as string | number | boolean | undefined,
      sectionIndex: hit.payload?.sectionIndex as number | undefined,
    },
  }));

  const reordered = await reorderLlamaIndexNodes(nodes, {
    query,
    config: { strategy: 'auto', topK: 8 },
  });

  console.log(reordered.map((n) => n.id_));
}

void main();
