import type {
  EvaluationSourceExtractors,
  ExpectedOutcomeField,
  ModelResponsePayload,
} from '../../types/llm-test-runner';

export type ResolvedActualValue =
  | { success: true; value: string }
  | { success: false; error: string };

function toTextSource() {
  return { type: 'text' } as const;
}

export async function resolveActualValue(
  field: ExpectedOutcomeField,
  output?: ModelResponsePayload,
  extractors?: EvaluationSourceExtractors,
): Promise<ResolvedActualValue> {
  const source = field.evaluationSource || toTextSource();
  console.log('source', source);
  console.log('output', output);
  console.log('extractors', extractors);

  if (source.type === 'text') {
    const text = output?.text?.trim();
    if (!text) {
      return {
        success: false,
        error: 'Model response text is empty.',
      };
    }
    return { success: true, value: text };
  }

  const extractor = extractors?.[source.extractorId];
  if (!extractor) {
    return {
      success: false,
      error: `Extractor "${source.extractorId}" is not registered.`,
    };
  }

  try {
    const extractedRaw = await extractor(output || {});
    if (typeof extractedRaw !== 'string') {
      return {
        success: false,
        error: `Extractor "${source.extractorId}" must return a string.`,
      };
    }

    const extracted = extractedRaw.trim();
    if (!extracted) {
      return {
        success: false,
        error: `Extractor "${source.extractorId}" returned an empty value.`,
      };
    }

    return {
      success: true,
      value: extracted,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : `Extractor "${source.extractorId}" failed.`,
    };
  }
}
