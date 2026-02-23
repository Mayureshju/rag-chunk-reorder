import { Pinecone } from '@pinecone-database/pinecone';
import { reorderLangChainDocuments } from 'rag-chunk-reorder';

async function main() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pc.index('docs');

  const query = 'What is the capital of France?';
  const embedding = [0.01, 0.02, 0.03]; // replace with your embedding

  const results = await index.query({
    vector: embedding,
    topK: 20,
    includeMetadata: true,
  });

  const documents = results.matches.map((m) => ({
    id: m.id,
    pageContent: m.metadata?.text ?? '',
    metadata: {
      score: m.score,
      sourceId: m.metadata?.docId,
      sectionIndex: m.metadata?.sectionIndex,
    },
  }));

  const reordered = await reorderLangChainDocuments(documents, {
    query,
    config: { strategy: 'scoreSpread', topK: 8, startCount: 2, endCount: 2 },
  });

  console.log(reordered.map((d) => d.id));
}

void main();
