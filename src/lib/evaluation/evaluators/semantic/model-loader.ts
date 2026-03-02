import { env, pipeline } from '@xenova/transformers';

// Force remote loads so Vite dev server does not serve index.html in place of model metadata
// TODO: LLM-52 Revisit this workaround
env.useBrowserCache = false;
env.allowLocalModels = false;

// Loads a semantic feature extraction model to generate embeddings
export async function loadSemanticModel() {
  try {
    const extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        quantized: true, // use quantized model to reduce memory usage
      },
    );
    return extractor;
  } catch (error) {
    console.error('Failed to load semantic evaluation model:', error);
    throw error;
  }
}
