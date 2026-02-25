import {
  reorderHaystackDocuments,
  reorderLangChainDocuments,
  reorderLangChainPairs,
  reorderLlamaIndexNodes,
} from '../../src/adapters';
import { Reorderer } from '../../src/reorderer';

describe('Framework adapters', () => {
  it('should reorder LangChain Document[] using metadata.score', async () => {
    const docs = [
      { id: 'a', pageContent: 'A', metadata: { score: 0.9 } },
      { id: 'b', pageContent: 'B', metadata: { score: 0.8 } },
      { id: 'c', pageContent: 'C', metadata: { score: 0.7 } },
    ];

    const reorderer = new Reorderer({ strategy: 'scoreSpread', startCount: 1, endCount: 1, topK: 2 });
    const result = await reorderLangChainDocuments(docs, { reorderer });

    expect(result.map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('should reorder LangChain [Document, score][] pairs', async () => {
    const pairs: Array<[any, number]> = [
      [{ id: 'a', pageContent: 'A', metadata: { sourceId: 'x' } }, 0.9],
      [{ id: 'b', pageContent: 'B', metadata: { sourceId: 'x' } }, 0.8],
      [{ id: 'c', pageContent: 'C', metadata: { sourceId: 'x' } }, 0.7],
    ];

    const reorderer = new Reorderer({ strategy: 'scoreSpread', startCount: 1, endCount: 1, topK: 2 });
    const result = await reorderLangChainPairs(pairs, { reorderer });

    expect(result.map(([d]) => d.id)).toEqual(['a', 'b']);
  });

  it('should reorder LlamaIndex-like nodes', async () => {
    const nodes = [
      { id_: 'n1', text: 'Node 1', score: 0.9, metadata: { sourceId: 'doc' } },
      { id_: 'n2', text: 'Node 2', score: 0.8, metadata: { sourceId: 'doc' } },
      { id_: 'n3', text: 'Node 3', score: 0.7, metadata: { sourceId: 'doc' } },
    ];

    const reorderer = new Reorderer({ strategy: 'scoreSpread', startCount: 1, endCount: 1, topK: 2 });
    const result = await reorderLlamaIndexNodes(nodes, { reorderer });

    expect(result.map((n) => n.id_)).toEqual(['n1', 'n2']);
  });

  it('should reorder Haystack-like documents', async () => {
    const docs = [
      { id: 'h1', content: 'Doc 1', score: 0.9, meta: { sourceId: 'doc' } },
      { id: 'h2', content: 'Doc 2', score: 0.8, meta: { sourceId: 'doc' } },
      { id: 'h3', content: 'Doc 3', score: 0.7, meta: { sourceId: 'doc' } },
    ];

    const reorderer = new Reorderer({ strategy: 'scoreSpread', startCount: 1, endCount: 1, topK: 2 });
    const result = await reorderHaystackDocuments(docs, { reorderer });

    expect(result.map((d) => d.id)).toEqual(['h1', 'h2']);
  });

  it('should preserve distinct documents even when framework IDs are duplicated', async () => {
    const docs = [
      { id: 'dup', pageContent: 'A', metadata: { score: 0.9 } },
      { id: 'dup', pageContent: 'B', metadata: { score: 0.8 } },
    ];

    const result = await reorderLangChainDocuments(docs, {
      config: { strategy: 'scoreSpread' },
    });

    expect(result.map((d) => d.pageContent)).toEqual(['A', 'B']);
  });

  it('should coerce non-finite scores in LangChain pairs to 0', async () => {
    const pairs: Array<[any, number]> = [
      [{ id: 'bad', pageContent: 'Bad score', metadata: {} }, NaN as unknown as number],
      [{ id: 'good', pageContent: 'Good score', metadata: {} }, 0.6],
    ];

    const result = await reorderLangChainPairs(pairs, {
      config: { strategy: 'scoreSpread', validationMode: 'coerce' },
    });

    expect(result.map(([d]) => d.id)).toEqual(['good', 'bad']);
  });

  it('should prefer finite metadata score when node.score is non-finite', async () => {
    const nodes = [
      { id_: 'n1', text: 'Node 1', score: NaN as unknown as number, metadata: { score: 0.9 } },
      { id_: 'n2', text: 'Node 2', score: 0.8, metadata: {} },
    ];

    const result = await reorderLlamaIndexNodes(nodes, {
      config: { strategy: 'scoreSpread', validationMode: 'coerce' },
    });

    expect(result.map((n) => n.id_)).toEqual(['n1', 'n2']);
  });

  it('should coerce non-finite Haystack scores to 0', async () => {
    const docs = [
      { id: 'h-bad', content: 'Bad score', score: NaN as unknown as number, meta: {} },
      { id: 'h-good', content: 'Good score', score: 0.7, meta: {} },
    ];

    const result = await reorderHaystackDocuments(docs, {
      config: { strategy: 'scoreSpread', validationMode: 'coerce' },
    });

    expect(result.map((d) => d.id)).toEqual(['h-good', 'h-bad']);
  });
});
