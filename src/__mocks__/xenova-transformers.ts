/**
 * Jest mock for @xenova/transformers.
 *
 * @xenova/transformers v2.17.2 is pure ESM with a known __dirname
 * redeclaration bug that makes it incompatible with Jest's CJS wrapper.
 * The fix shipped in @huggingface/transformers v3+ (PR #809).
 *
 * This mock provides the minimal surface used by the semantic evaluator
 * so that tests importing through the evaluation engine can run.
 */

export class FeatureExtractionPipeline {
  async call() {
    return { data: new Float32Array() };
  }
}

export const env = {
  useBrowserCache: false,
  allowLocalModels: false,
  cacheDir: '',
};

export async function pipeline() {
  return new FeatureExtractionPipeline();
}
