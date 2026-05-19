import { z } from 'zod';

export const modelResponseMetadataSchema = z.record(z.string(), z.unknown());

export const modelResponsePayloadSchema = z.object({
  text: z.string().optional(),
  metadata: modelResponseMetadataSchema.optional(),
});

export type ModelResponsePayload = z.infer<typeof modelResponsePayloadSchema>;
