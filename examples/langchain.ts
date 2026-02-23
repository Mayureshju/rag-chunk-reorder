import {
  Reorderer,
  reorderLangChainDocuments,
  reorderLangChainPairs,
} from 'rag-chunk-reorder';

async function exampleDocuments() {
  const documents = [
    { id: 'a', pageContent: 'Paris is the capital of France', metadata: { score: 0.95, sourceId: 'wiki' } },
    { id: 'b', pageContent: 'The Eiffel Tower is in Paris', metadata: { score: 0.9, sourceId: 'wiki' } },
    { id: 'c', pageContent: 'France is in Western Europe', metadata: { score: 0.85, sourceId: 'geo' } },
  ];

  const reorderer = new Reorderer({
    strategy: 'auto',
    diversity: { enabled: true, lambda: 0.65 },
    topK: 2,
  });

  const reordered = await reorderLangChainDocuments(documents, {
    reorderer,
    query: 'What is the capital of France?',
  });

  console.log(reordered.map((d) => d.id));
}

async function examplePairs() {
  const scored = [
    [{ id: 'a', pageContent: 'Chunk A', metadata: { sourceId: 'doc-a' } }, 0.94],
    [{ id: 'b', pageContent: 'Chunk B', metadata: { sourceId: 'doc-a' } }, 0.91],
    [{ id: 'c', pageContent: 'Chunk C', metadata: { sourceId: 'doc-b' } }, 0.89],
  ] as const;

  const reordered = await reorderLangChainPairs([...scored], {
    config: { strategy: 'scoreSpread', startCount: 1, endCount: 1, topK: 2 },
  });

  console.log(reordered.map(([d]) => d.id));
}

void exampleDocuments();
void examplePairs();
