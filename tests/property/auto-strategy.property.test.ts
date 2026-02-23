import { Reorderer } from '../../src/reorderer';
import { Chunk } from '../../src/types';
import { metadataCoverage, resolveAutoStrategy } from '../../src/selector';

describe('Auto strategy selection', () => {
  it('should choose chronological for temporal queries when timestamp coverage is high', async () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Event B', score: 0.9, metadata: { timestamp: 200 } },
      { id: 'b', text: 'Event A', score: 0.8, metadata: { timestamp: 100 } },
      { id: 'c', text: 'Event C', score: 0.7, metadata: { timestamp: 300 } },
    ];

    const auto = new Reorderer({ strategy: 'auto' });
    const chronological = new Reorderer({ strategy: 'chronological' });

    const autoResult = await auto.reorder(chunks, 'When did this happen?');
    const expected = chronological.reorderSync(chunks);

    expect(autoResult.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should allow query-aware auto strategy in reorderSync', () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Event B', score: 0.9, metadata: { timestamp: 200 } },
      { id: 'b', text: 'Event A', score: 0.8, metadata: { timestamp: 100 } },
      { id: 'c', text: 'Event C', score: 0.7, metadata: { timestamp: 300 } },
    ];

    const auto = new Reorderer({ strategy: 'auto' });
    const chronological = new Reorderer({ strategy: 'chronological' });

    const syncAuto = auto.reorderSync(chunks, 'When did this happen?');
    const expected = chronological.reorderSync(chunks);

    expect(syncAuto.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should avoid substring false positives for temporal terms', async () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Doc A', score: 0.9, metadata: { timestamp: 300 } },
      { id: 'b', text: 'Doc B', score: 0.8, metadata: { timestamp: 100 } },
      { id: 'c', text: 'Doc C', score: 0.7, metadata: { timestamp: 200 } },
    ];

    const auto = new Reorderer({ strategy: 'auto' });
    const spread = new Reorderer({ strategy: 'scoreSpread' });

    const autoResult = await auto.reorder(chunks, 'holiday travel itinerary');
    const expected = spread.reorderSync(chunks);

    expect(autoResult.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should still detect temporal intent when term appears as a standalone word', async () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Event B', score: 0.9, metadata: { timestamp: 300 } },
      { id: 'b', text: 'Event A', score: 0.8, metadata: { timestamp: 100 } },
      { id: 'c', text: 'Event C', score: 0.7, metadata: { timestamp: 200 } },
    ];

    const auto = new Reorderer({ strategy: 'auto' });
    const chronological = new Reorderer({ strategy: 'chronological' });

    const autoResult = await auto.reorder(chunks, 'Which day did this happen?');
    const expected = chronological.reorderSync(chunks);

    expect(autoResult.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('metadataCoverage should ignore non-finite numeric metadata and still count primitive source IDs', () => {
    const coverage = metadataCoverage([
      {
        id: 'a',
        text: 'A',
        score: 1,
        metadata: { timestamp: NaN, sectionIndex: Infinity, sourceId: 123 as unknown as string },
      },
      {
        id: 'b',
        text: 'B',
        score: 0.9,
        metadata: { timestamp: 10, sectionIndex: 2, sourceId: 'doc-b' },
      },
    ]);

    expect(coverage).toEqual({
      timestamp: 0.5,
      sourceId: 1,
      sectionIndex: 0.5,
    });
  });

  it('metadataCoverage should ignore complex sourceId values', () => {
    const coverage = metadataCoverage([
      {
        id: 'a',
        text: 'A',
        score: 1,
        metadata: { sourceId: { raw: 'doc-a' } as unknown as string },
      },
      {
        id: 'b',
        text: 'B',
        score: 0.9,
        metadata: { sourceId: 42 as unknown as string },
      },
    ]);

    expect(coverage.sourceId).toBe(0.5);
  });

  it('should not treat non-finite timestamps as temporal coverage for auto routing helper', () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Event A', score: 0.9, metadata: { timestamp: NaN as unknown as number } },
      { id: 'b', text: 'Event B', score: 0.8, metadata: { timestamp: Infinity as unknown as number } },
      { id: 'c', text: 'Event C', score: 0.7, metadata: {} },
    ];

    const autoConfig = new Reorderer({ strategy: 'auto' }).getConfig().autoStrategy!;
    const resolved = resolveAutoStrategy(chunks, 'When did this happen?', autoConfig);
    expect(resolved).toBe('scoreSpread');
  });

  it('should choose preserveOrder for narrative queries with source/section coverage', async () => {
    const chunks: Chunk[] = [
      { id: 'a1', text: 'Doc A - section 2', score: 0.95, metadata: { sourceId: 'a', sectionIndex: 2 } },
      { id: 'a0', text: 'Doc A - section 0', score: 0.75, metadata: { sourceId: 'a', sectionIndex: 0 } },
      { id: 'b0', text: 'Doc B - section 0', score: 0.9, metadata: { sourceId: 'b', sectionIndex: 0 } },
    ];

    const auto = new Reorderer({ strategy: 'auto' });
    const preserve = new Reorderer({ strategy: 'preserveOrder' });

    const autoResult = await auto.reorder(chunks, 'Summarize the full document flow');
    const expected = preserve.reorderSync(chunks);

    expect(autoResult.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });

  it('should fall back to scoreSpread for factoid queries', async () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Answer A', score: 0.95 },
      { id: 'b', text: 'Answer B', score: 0.85 },
      { id: 'c', text: 'Answer C', score: 0.8 },
      { id: 'd', text: 'Answer D', score: 0.75 },
    ];

    const auto = new Reorderer({ strategy: 'auto' });
    const spread = new Reorderer({ strategy: 'scoreSpread' });

    const autoResult = await auto.reorder(chunks, 'What is the capital of France?');
    const expected = spread.reorderSync(chunks);

    expect(autoResult.map((c) => c.id)).toEqual(expected.map((c) => c.id));
  });
});

describe('Diversity-aware reranking', () => {
  it('should reduce near-duplicate dominance under tight topK budgets', () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Paris is the capital of France.', score: 1.0, metadata: { sourceId: 'doc-a' } },
      { id: 'b', text: 'Paris is the capital city of France.', score: 0.99, metadata: { sourceId: 'doc-b' } },
      { id: 'c', text: 'The Pacific Ocean is the largest ocean.', score: 0.985, metadata: { sourceId: 'doc-c' } },
    ];

    const baseline = new Reorderer({
      strategy: 'scoreSpread',
      startCount: 1,
      endCount: 1,
      topK: 2,
    });
    const diversified = new Reorderer({
      strategy: 'scoreSpread',
      startCount: 1,
      endCount: 1,
      topK: 2,
      diversity: { enabled: true, lambda: 0.6, sourceDiversityWeight: 0 },
    });

    const baselineIds = baseline.reorderSync(chunks).map((c) => c.id);
    const diversifiedIds = diversified.reorderSync(chunks).map((c) => c.id);

    expect(baselineIds).toEqual(['a', 'b']);
    expect(diversifiedIds).toEqual(['a', 'c']);
  });

  it('should affect chronological tie-breaking when timestamps are equal', () => {
    const chunks: Chunk[] = [
      { id: 'a', text: 'Paris is the capital of France.', score: 1.0, metadata: { timestamp: 1, sourceId: 'x' } },
      { id: 'b', text: 'Paris is the capital city of France.', score: 0.99, metadata: { timestamp: 1, sourceId: 'y' } },
      { id: 'c', text: 'Embryogenesis depends on neural crest migration.', score: 0.98, metadata: { timestamp: 1, sourceId: 'z' } },
    ];

    const baseline = new Reorderer({ strategy: 'chronological' });
    const diversified = new Reorderer({
      strategy: 'chronological',
      diversity: { enabled: true, lambda: 0.6, sourceDiversityWeight: 0 },
    });

    const baselineIds = baseline.reorderSync(chunks).map((c) => c.id);
    const diversifiedIds = diversified.reorderSync(chunks).map((c) => c.id);

    expect(baselineIds).toEqual(['a', 'b', 'c']);
    expect(diversifiedIds).toEqual(['a', 'c', 'b']);
  });
});
