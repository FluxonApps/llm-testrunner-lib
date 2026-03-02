// Computes cosine similarity between two numeric vectors.
// Returns a value between -1 and 1 indicating similarity.(1 means identical, 0 means completely different and negative values mean opposite directions)
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length)
    throw new Error('Vectors must have the same length');

  let dot = 0,
    normA = 0,
    normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
