// workers/embedding.worker.ts
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let modelPromise: Promise<FeatureExtractionPipeline> | null = null;

function getModel(): Promise<FeatureExtractionPipeline> {
  if (!modelPromise) {
    modelPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'q8', // quantization : modèle plus léger, chargement plus rapide
    }) as Promise<FeatureExtractionPipeline>;
  }
  return modelPromise;
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === 'INIT') {
    // L'URL est fournie par le background, qui seul a accès à chrome.runtime
    const wasmBackend = env.backends.onnx.wasm;
    if (wasmBackend) {
      wasmBackend.wasmPaths = msg.wasmBaseUrl;
    }
    return;
  }

  if (msg.type === 'EMBED') {
    const { id, text } = msg;
    try {
      const model = await getModel();
      // MiniLM gère ~256 tokens utiles : on tronque pour rester dans la fenêtre
      // (limitation à garder en tête — un texte long perd du contexte au-delà)
      const output = await model(text.slice(0, 2000), { pooling: 'mean', normalize: true });
      self.postMessage({ id, embedding: Array.from(output.data as Float32Array) });
    } catch (err) {
      self.postMessage({ id, error: (err as Error).message });
    }
  }
};