import { evaluateAnswerSet } from 'rag-chunk-reorder';

const summary = evaluateAnswerSet([
  {
    prediction: 'Paris',
    references: ['Paris'],
    contexts: ['Paris is the capital of France.'],
  },
  {
    prediction: 'Lyon',
    references: ['Paris'],
    contexts: ['Paris is the capital of France.'],
  },
]);

console.log(summary);
