// core/indexing/embeddings.ts
let worker: Worker | null = null;
let initialized = false;

const pending = new Map<string, { resolve: (v: number[]) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('../../workers/embedding.worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event) => {
    const { id, embedding, error } = event.data;
    const task = pending.get(id);
    if (!task) return;
    pending.delete(id);
    error ? task.reject(new Error(error)) : task.resolve(embedding);
  };

  return worker;
}

function ensureInitialized(w: Worker) {
  if (initialized) return;
  initialized = true;
  // cast the path to any to satisfy overloaded typing of browser.runtime.getURL
  const wasmBaseUrl = browser.runtime.getURL(('wasm/' as any));
  w.postMessage({ type: 'INIT', wasmBaseUrl });
}

export function generateEmbedding(text: string): Promise<number[]> {
  const w = getWorker();
  ensureInitialized(w);

  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: 'EMBED', id, text });
  });
}