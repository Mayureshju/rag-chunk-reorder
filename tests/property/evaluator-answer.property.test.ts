import { evaluateAnswerSet, exactMatch, faithfulness, tokenF1 } from '../../src/evaluator';

describe('Answer-level metrics', () => {
  it('exactMatch should ignore casing/articles/punctuation', () => {
    expect(exactMatch('The Eiffel Tower!', 'eiffel tower')).toBe(1);
    expect(exactMatch('Paris', 'Lyon')).toBe(0);
  });

  it('tokenF1 should use best match across multiple references', () => {
    const prediction = 'Paris is the capital of France';
    const references = ['Lyon is in France', 'The capital of France is Paris'];
    const f1 = tokenF1(prediction, references);
    expect(f1).toBeGreaterThan(0.8);
  });

  it('faithfulness should be high when answer tokens are supported by context', () => {
    const prediction = 'Paris is the capital of France';
    const contexts = ['France has a capital city named Paris.'];
    const score = faithfulness(prediction, contexts);
    expect(score).toBeGreaterThan(0.7);
  });

  it('evaluateAnswerSet should aggregate EM/F1/Faithfulness', () => {
    const summary = evaluateAnswerSet([
      {
        prediction: 'Paris',
        references: ['Paris'],
        contexts: ['Paris is the capital of France'],
      },
      {
        prediction: 'Lyon',
        references: ['Paris'],
        contexts: ['Paris is the capital of France'],
      },
    ]);

    expect(summary.count).toBe(2);
    expect(summary.exactMatch).toBeCloseTo(0.5, 10);
    expect(summary.f1).toBeGreaterThanOrEqual(0);
    expect(summary.f1).toBeLessThanOrEqual(1);
    expect(summary.faithfulness).toBeDefined();
    expect(summary.perExample.length).toBe(2);
  });

  it('should handle non-Latin scripts correctly', () => {
    expect(exactMatch('पेरिस', 'दिल्ली')).toBe(0);
    expect(exactMatch('पेरिस', 'पेरिस')).toBe(1);

    const f1 = tokenF1('पेरिस', 'पेरिस');
    expect(f1).toBe(1);

    const grounded = faithfulness('पेरिस फ्रांस की राजधानी है', ['पेरिस फ्रांस की राजधानी है']);
    expect(grounded).toBe(1);
  });

  it('should use consistent no-answer semantics for EM and tokenF1', () => {
    expect(exactMatch('!!!', '???')).toBe(1);
    expect(tokenF1('!!!', '???')).toBe(1);

    expect(exactMatch('', '')).toBe(1);
    expect(tokenF1('', '')).toBe(1);

    expect(tokenF1('', 'Paris')).toBe(0);
  });
});
