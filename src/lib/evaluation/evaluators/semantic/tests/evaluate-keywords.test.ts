import { jest, describe, it, expect } from '@jest/globals';
import { evaluateKeywordsSemantically } from '../evaluate-keywords';
import { FeatureExtractionPipeline } from '@xenova/transformers';
import { 
  DEFAULT_SEMANTIC_PASS_SCORE as DEFAULT_SEMANTIC_THRESHOLD,
  EvaluationApproach 
} from '../../../constants';

describe('evaluateKeywordsSemantically (only extractor mocked)', () => {
  it('should return empty array when no keywords provided', async () => {
    const mockExtractor = jest.fn() as jest.Mock;
    const result = await evaluateKeywordsSemantically(
      mockExtractor as unknown as FeatureExtractionPipeline,
      'some response',
      [],
      DEFAULT_SEMANTIC_THRESHOLD,
    );

    expect(result).toEqual([]);
  });

  it('should return matches above threshold', async () => {
    const response = 'The quick brown fox';
    const keywords = ['fast', 'animal'];
    const mockExtractor = jest.fn() as jest.Mock;
    mockExtractor.mockImplementation(async (text: string) => {
      const data = new Float32Array(text.length).fill(1);
      return { data };
    });

    const cosSpy = jest.spyOn(
      require('../similarity-utils'),
      'cosineSimilarity',
    );
    cosSpy
      .mockReturnValueOnce(0.91) // these are the similarity scores for the keyword 'fast' in the response.
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.85)
      .mockReturnValueOnce(0.6) // these are the similarity scores for the keyword 'animal' in the response.
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.7)
      .mockReturnValueOnce(0.8);

    const result = await evaluateKeywordsSemantically(
      mockExtractor as unknown as FeatureExtractionPipeline,
      response,
      keywords,
      DEFAULT_SEMANTIC_THRESHOLD,
    );

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        keyword: 'fast',
        found: true,
        evaluationApproachResult: { score: 0.91, approachUsed: EvaluationApproach.SEMANTIC },
      },
      {
        keyword: 'animal',
        found: true,
        evaluationApproachResult: { score: 0.8, approachUsed: EvaluationApproach.SEMANTIC },
      },
    ]);
  });

  it('should mark below-threshold as not found', async () => {
    const response = 'A sunny day';
    const keywords = ['rain'];
    const mockExtractor = jest.fn() as jest.Mock;
    mockExtractor.mockImplementation(async (text: string) => {
      return { data: new Float32Array(text.length).fill(1) };
    });

    const cosSpy = jest.spyOn(
      require('../similarity-utils'),
      'cosineSimilarity',
    );
    cosSpy
      .mockReturnValueOnce(0.5) // this is the similarity score for the keyword 'rain' in the response.
      .mockReturnValueOnce(0.49)
      .mockReturnValueOnce(0.4);

    const result = await evaluateKeywordsSemantically(
      mockExtractor as unknown as FeatureExtractionPipeline,
      response,
      keywords,
      DEFAULT_SEMANTIC_THRESHOLD,
    );

    expect(result).toEqual([
      {
        keyword: 'rain',
        found: false,
        evaluationApproachResult: { score: 0.5, approachUsed: EvaluationApproach.SEMANTIC },
      },
    ]);
  });
});