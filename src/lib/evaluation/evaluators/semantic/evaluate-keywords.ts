import { KeywordMatch } from '../../types';
import { splitIntoWords } from './text-utils';
import { cosineSimilarity } from './similarity-utils';
import { FeatureExtractionPipeline } from '@xenova/transformers';
import { EvaluationApproach } from '../../constants';

/**
 * Evaluates whether each keyword is semantically present in the response text.
 * Uses embeddings and cosine similarity instead of direct string matching.
 */
export async function evaluateKeywordsSemantically(
  extractor: FeatureExtractionPipeline,
  response: string,
  keywords: string[],
  threshold: number,
): Promise<KeywordMatch[]> {
  if (keywords.length === 0) return [];

  const words = splitIntoWords(response);

  // Generate embeddings for both response words and keywords in parallel
  const [wordsEmbeddings, keywordsEmbeddings] = await Promise.all([
    Promise.all(
      words.map(async word => ({
        word,
        emb: await extractor(word, { pooling: 'mean', normalize: true }),
      })),
    ),

    Promise.all(
      keywords.map(async keyword => ({
        keyword,
        emb: await extractor(keyword, { pooling: 'mean', normalize: true }),
      })),
    ),
  ]);

  // For each keyword, find the most semantically similar word in the response
  const matches: KeywordMatch[] = keywordsEmbeddings.map(
    ({ keyword, emb: keywordEmb }) => {
      let bestSimilarity = 0;

      try {
        for (const { emb: wordEmb } of wordsEmbeddings) {
          const similarity = cosineSimilarity(
            Array.from(keywordEmb.data),
            Array.from(wordEmb.data),
          );
          if (similarity > bestSimilarity) bestSimilarity = similarity;
        }

        // Consider the keyword "found" if similarity exceeds the threshold
        return {
          keyword,
          found: bestSimilarity >= threshold,
          evaluationApproachResult: {
            score: bestSimilarity,
            approachUsed: EvaluationApproach.SEMANTIC,
          },
        };
      } catch (err) {
        console.error(`Error evaluating "${keyword}":`, err);
        return {
          keyword,
          found: false,
          evaluationApproachResult: {
            score: 0,
            approachUsed: EvaluationApproach.SEMANTIC,
          },
        };
      }
    },
  );

  return matches;
}