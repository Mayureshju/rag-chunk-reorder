import { Reorderer } from '../../src/reorderer';
import { Chunk, ReorderDiagnostics } from '../../src/types';
import { ValidationError } from '../../src/errors';

describe('Diagnostics hook', () => {
  it('should emit structured pipeline stats', () => {
    const reports: ReorderDiagnostics[] = [];
    const reorderer = new Reorderer({
      strategy: 'scoreSpread',
      startCount: 1,
      endCount: 1,
      minScore: 0.5,
      deduplicate: true,
      topK: 1,
      onDiagnostics: (stats) => reports.push(stats),
    });

    const chunks = [
      { id: 'a', text: 'dup', score: 0.9 },
      { id: 'b', text: 'dup', score: 0.8 },
      { id: 'c', text: 'C', score: 0.7 },
      { id: 'd', text: 'D', score: 0.4 },
    ];

    const result = reorderer.reorderSync(chunks);
    const latest = reports[reports.length - 1];

    expect(result.length).toBe(1);
    expect(latest.inputCount).toBe(4);
    expect(latest.validatedCount).toBe(4);
    expect(latest.coercedScores).toBe(0);
    expect(latest.droppedMetadataFields).toBe(0);
    expect(latest.filteredByMinScore).toBe(1);
    expect(latest.dedupRemoved).toBe(1);
    expect(latest.dedupStrategyUsed).toBe('exact');
    expect(latest.budgetPruned).toBe(1);
    expect(latest.outputCount).toBe(1);
    expect(latest.strategyChosen).toBe('scoreSpread');
    expect(latest.packingStrategyUsed).toBe('edgeAware');
    expect(latest.tokenCountUsed).toBe(0);
    expect(latest.cachedTokenCountUsed).toBe(0);
    expect(latest.charCountUsed).toBe(0);
    expect(latest.budgetUnit).toBe('none');
    expect(latest.rerankerApplied).toBe(false);
  });

  it('should flag rerankerApplied when reranker succeeds', async () => {
    let latest: ReorderDiagnostics | undefined;
    const reorderer = new Reorderer({
      reranker: {
        async rerank(chunks) {
          return chunks.map((c) => ({ ...c, score: c.score + 0.1 }));
        },
      },
      onDiagnostics: (stats) => {
        latest = stats;
      },
    });

    const chunks = [
      { id: 'a', text: 'A', score: 0.9 },
      { id: 'b', text: 'B', score: 0.8 },
    ];

    await reorderer.reorder(chunks, 'query');
    expect(latest?.rerankerApplied).toBe(true);
    expect(latest?.dedupStrategyUsed).toBe('none');
    expect(latest?.packingStrategyUsed).toBe('edgeAware');
  });

  it('should report charCountUsed when maxChars budget is used', () => {
    let latest: ReorderDiagnostics | undefined;
    const reorderer = new Reorderer({
      strategy: 'chronological',
      maxChars: 2,
      charCounter: () => 1,
      onDiagnostics: (stats) => {
        latest = stats;
      },
    });

    const chunks = [
      { id: 'a', text: 'AA', score: 0.9 },
      { id: 'b', text: 'BBB', score: 0.8 },
      { id: 'c', text: 'CCCC', score: 0.7 },
    ];

    const result = reorderer.reorderSync(chunks);
    expect(result.map((c) => c.id)).toEqual(['a', 'b']);
    expect(latest?.charCountUsed).toBe(2);
    expect(latest?.tokenCountUsed).toBe(0);
    expect(latest?.budgetUnit).toBe('chars');
  });
});

describe('Validation mode', () => {
  it('should coerce non-finite scores and drop malformed metadata in coerce mode', () => {
    const reorderer = new Reorderer({ validationMode: 'coerce' });
    const chunks = [
      {
        id: 'a',
        text: 'A',
        score: NaN as unknown as number,
        metadata: { timestamp: 'bad', sourceId: { bad: true } },
      },
      { id: 'b', text: 'B', score: 0.9, metadata: { timestamp: 100 } },
    ] as unknown as Chunk[];

    const result = reorderer.reorderSync(chunks);
    const coerced = result.find((c) => c.id === 'a');
    expect(coerced?.score).toBe(0);
    expect(coerced?.metadata?.timestamp).toBeUndefined();
    expect(coerced?.metadata?.sourceId).toBeUndefined();
  });

  it('should throw in strict mode for non-finite scores', () => {
    const reorderer = new Reorderer({ validationMode: 'strict' });
    const chunks = [{ id: 'a', text: 'A', score: NaN as unknown as number }];
    expect(() => reorderer.reorderSync(chunks)).toThrow(ValidationError);
  });
});
