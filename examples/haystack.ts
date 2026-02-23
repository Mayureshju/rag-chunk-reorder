import { reorderHaystackDocuments } from 'rag-chunk-reorder';

async function main() {
  // Shape-compatible with Haystack Document JSON payloads.
  const docs = [
    { id: 'h1', content: 'Chunk from report A', score: 0.93, meta: { sourceId: 'report-a', sectionIndex: 0 } },
    { id: 'h2', content: 'Another chunk from report A', score: 0.9, meta: { sourceId: 'report-a', sectionIndex: 1 } },
    { id: 'h3', content: 'Chunk from report B', score: 0.89, meta: { sourceId: 'report-b', sectionIndex: 0 } },
  ];

  const reordered = await reorderHaystackDocuments(docs, {
    query: 'Give me a concise summary of the reports',
    config: {
      strategy: 'auto',
      diversity: { enabled: true, lambda: 0.65 },
      topK: 2,
    },
  });

  console.log(reordered.map((d) => d.id));
}

void main();
