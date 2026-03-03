export type TokenCounter = (text: string) => number;
export type TokenCounterWithDispose = TokenCounter & { dispose?: () => void };

type TokenCounterName = 'whitespace' | 'char4';

export function tokenCounterFactory(name: TokenCounterName): TokenCounter {
  switch (name) {
    case 'whitespace':
      return (text: string) => (text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length);
    case 'char4':
      return (text: string) => Math.ceil(text.length / 4);
    default:
      return (text: string) => (text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length);
  }
}

function resolveExport(mod: Record<string, unknown>, names: string[]): ((...args: any[]) => any) | undefined {
  for (const name of names) {
    const value = mod[name];
    if (typeof value === 'function') return value as (...args: any[]) => any;
  }
  const defaultExport = mod.default as Record<string, unknown> | undefined;
  if (defaultExport) {
    for (const name of names) {
      const value = defaultExport[name];
      if (typeof value === 'function') return value as (...args: any[]) => any;
    }
  }
  return undefined;
}

async function loadTiktokenModule(): Promise<Record<string, unknown> | undefined> {
  try {
    return (await import('@dqbd/tiktoken')) as Record<string, unknown>;
  } catch {
    // ignore
  }
  try {
    return (await import('tiktoken')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export async function createTiktokenCounter(options?: {
  model?: string;
  encoding?: string;
}): Promise<TokenCounterWithDispose> {
  const mod = await loadTiktokenModule();
  if (!mod) {
    throw new Error(
      'tiktoken module not found. Install @dqbd/tiktoken or tiktoken to use createTiktokenCounter().',
    );
  }

  const encodingForModel = resolveExport(mod, ['encoding_for_model', 'encodingForModel']);
  const getEncoding = resolveExport(mod, ['get_encoding', 'getEncoding']);

  const model = options?.model ?? 'gpt-3.5-turbo';
  const encodingName = options?.encoding;

  let encoder: { encode: (text: string) => number[]; free?: () => void } | undefined;
  if (encodingName && getEncoding) {
    encoder = getEncoding(encodingName);
  } else if (encodingForModel) {
    encoder = encodingForModel(model);
  } else if (getEncoding) {
    encoder = getEncoding('cl100k_base');
  }

  if (!encoder || typeof encoder.encode !== 'function') {
    throw new Error('tiktoken encoder could not be initialized');
  }

  const counter = ((text: string) => encoder!.encode(text).length) as TokenCounterWithDispose;
  if (typeof encoder.free === 'function') {
    counter.dispose = () => encoder!.free?.();
  }
  return counter;
}
