import { answerabilityMatch, citationCoverage, evaluateAnswerSet } from 'rag-chunk-reorder';

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
console.log('Answerability:', answerabilityMatch('Paris', ['Paris']));
console.log(
  'Citation coverage:',
  citationCoverage('Paris is the capital of France', ['Paris is the capital of France.']),
);
