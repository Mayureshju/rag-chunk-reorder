import OpenAI from 'openai';
import { Reorderer } from 'rag-chunk-reorder';

async function main() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const chunks = [
    { id: 'a', text: 'Paris is the capital of France.', score: 0.95 },
    { id: 'b', text: 'Lyon is a major city in France.', score: 0.82 },
    { id: 'c', text: 'The Eiffel Tower is in Paris.', score: 0.88 },
  ];

  const query = 'What is the capital of France?';

  const reorderer = new Reorderer({
    strategy: 'scoreSpread',
    topK: 2,
    startCount: 1,
    endCount: 1,
  });

  const reordered = reorderer.reorderSync(chunks);
  const context = reordered.map((c) => c.text).join('\n\n');

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: `Answer using the context below:\n\n${context}\n\nQ: ${query}`,
  });

  console.log(response.output_text);
}

void main();
