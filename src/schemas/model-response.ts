import { z } from 'zod';

export const modelResponseMetadataSchema = z.record(z.string(), z.unknown());

export const modelResponsePayloadSchema = z.object({
  text: z.string().optional(),
  metadata: modelResponseMetadataSchema.optional(),
});

export const evaluationSourceExtractorSchema = z.custom<
  (payload: ModelResponsePayload) => string | Promise<string>
>(
  value => typeof value === 'function',
  'Extractor must be a function.',
);

export const evaluationSourceExtractorsSchema = z.record(
  z.string().min(1),
  evaluationSourceExtractorSchema,
);

export type ModelResponsePayload = z.infer<typeof modelResponsePayloadSchema>;
export type EvaluationSourceExtractor = z.infer<
  typeof evaluationSourceExtractorSchema
>;
export type EvaluationSourceExtractors = z.infer<
  typeof evaluationSourceExtractorsSchema
>;
