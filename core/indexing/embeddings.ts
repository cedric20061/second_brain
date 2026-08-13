// core/indexing/embeddings.ts
import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true; // le modèle est mis en cache après le premier téléchargement

// On peut appeler browser.runtime.getURL ici car on est dans le service worker
// (impossible depuis un Worker classique — c'était la raison du Worker avant)
if(env.backends.onnx.wasm?.wasmPaths) env.backends.onnx.wasm.wasmPaths = browser.runtime.getURL('wasm/' as any);

let modelPromise: Promise<FeatureExtractionPipeline> | null = null;

function getModel(): Promise<FeatureExtractionPipeline> {
  if (!modelPromise) {
    console.log('[Embeddings] Chargement du modèle...');
    modelPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { dtype: 'q8' }
    ) as Promise<FeatureExtractionPipeline>;
  }
  return modelPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getModel();
  const output = await model(text.slice(0, 2000), {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data as Float32Array);
}

// Appelé au démarrage du service worker pour préchauffer le modèle
// sans attendre la première capture (évite la latence sur la première page)
export function warmupModel(): void {
  getModel().catch((err) =>
    console.error('[Embeddings] Erreur au préchauffage :', err)
  );
}