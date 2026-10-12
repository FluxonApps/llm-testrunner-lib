import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { EvaluationApproach } from '../../../constants';

// The real loader pulls in `@xenova/transformers` and downloads a model; stub
// it so these tests only exercise how SemanticEvaluator schedules the load.
jest.mock('../model-loader', () => ({
  loadSemanticModel: jest.fn(),
}));

// The loaded model lives in static state, so each test gets a fresh copy of
// the modules (and of the mocked loader) to start from "not loaded yet".
async function loadModules() {
  jest.resetModules();
  const loader = await import('../model-loader');
  const evaluator = await import('../SemanticEvaluator');
  const index = await import('../index');
  return {
    loadSemanticModel: loader.loadSemanticModel as jest.Mock,
    SemanticEvaluator: evaluator.SemanticEvaluator,
    performSemanticEvaluation: index.performSemanticEvaluation,
  };
}

// Every text embeds to the same vector, so any keyword is a perfect match.
const fakeExtractor = jest.fn(async () => ({ data: new Float32Array([1]) }));

function delayed<T>(value: T, ms = 20): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

describe('SemanticEvaluator model loading', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads the model once when initialize() is called concurrently', async () => {
    const { loadSemanticModel, SemanticEvaluator } = await loadModules();
    loadSemanticModel.mockImplementation(() => delayed(fakeExtractor));

    await Promise.all(
      Array.from({ length: 5 }, () => new SemanticEvaluator().initialize()),
    );

    expect(loadSemanticModel).toHaveBeenCalledTimes(1);
  });

  it('loads the model once for concurrent performSemanticEvaluation calls', async () => {
    const { loadSemanticModel, performSemanticEvaluation } =
      await loadModules();
    loadSemanticModel.mockImplementation(() => delayed(fakeExtractor));

    const results = await Promise.all(
      ['tc-1', 'tc-2', 'tc-3'].map(testCaseId =>
        performSemanticEvaluation({
          testCaseId,
          question: '',
          actualResponse: 'Paris is the capital of France',
          expectedOutcome: 'Paris',
          evaluationParameters: { approach: EvaluationApproach.SEMANTIC },
        }),
      ),
    );

    expect(loadSemanticModel).toHaveBeenCalledTimes(1);
    expect(results.map(r => r.passed)).toEqual([true, true, true]);
  });

  it('does not reload the model once it has loaded', async () => {
    const { loadSemanticModel, SemanticEvaluator } = await loadModules();
    loadSemanticModel.mockImplementation(() => delayed(fakeExtractor));

    await new SemanticEvaluator().initialize();
    await new SemanticEvaluator().initialize();

    expect(loadSemanticModel).toHaveBeenCalledTimes(1);
  });

  it('rejects every concurrent caller when the load fails, then retries on the next call', async () => {
    const { loadSemanticModel, SemanticEvaluator } = await loadModules();
    const failure = new Error('network down');
    loadSemanticModel
      .mockImplementationOnce(() =>
        delayed(null).then(() => Promise.reject(failure)),
      )
      .mockImplementationOnce(() => delayed(fakeExtractor));

    const attempts = await Promise.allSettled(
      Array.from({ length: 3 }, () => new SemanticEvaluator().initialize()),
    );

    expect(attempts.map(a => a.status)).toEqual([
      'rejected',
      'rejected',
      'rejected',
    ]);
    expect(loadSemanticModel).toHaveBeenCalledTimes(1);

    await expect(new SemanticEvaluator().initialize()).resolves.toBeUndefined();
    expect(loadSemanticModel).toHaveBeenCalledTimes(2);
  });

  it('returns a failed result instead of throwing when the model cannot load', async () => {
    const { loadSemanticModel, SemanticEvaluator } = await loadModules();
    loadSemanticModel.mockImplementation(() =>
      Promise.reject(new Error('network down')),
    );

    const result = await new SemanticEvaluator().performEvaluation({
      testCaseId: 'tc-1',
      question: '',
      actualResponse: 'Paris',
      expectedOutcome: 'Paris',
      evaluationParameters: { approach: EvaluationApproach.SEMANTIC },
    });

    expect(result.passed).toBe(false);
    expect(result.evaluationApproachResult.score).toBe(0);
  });
});
