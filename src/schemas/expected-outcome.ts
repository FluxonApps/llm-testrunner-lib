import { z } from 'zod';
import { EvaluationApproach } from '../lib/evaluation/constants';
import { isApproachAllowedForFieldType } from '../lib/evaluation/field-evaluation-approach';
import type { EvaluationSourceExtractors } from './model-response';

const nonEmptyString = z.string().trim().min(1);
const optionalPositiveInt = z.number().int().positive().optional();
const optionalString = z.string().optional();
const selectOptionsSchema = z.array(nonEmptyString).min(1);
const optionalNumber = z.number().optional();
const textEvaluationSourceSchema = z.object({
  type: z.literal('text'),
});
const customEvaluationSourceSchema = z.object({
  type: z.literal('custom'),
  extractorId: nonEmptyString,
});

export const evaluationSourceSchema = z.discriminatedUnion('type', [
  textEvaluationSourceSchema,
  customEvaluationSourceSchema,
]);

export const expectedOutcomeModeSchema = z.enum(['static', 'dynamic']);
export type ExpectedOutcomeMode = z.infer<typeof expectedOutcomeModeSchema>;
export type EvaluationSource = z.infer<typeof evaluationSourceSchema>;

const evaluationParametersSchema = z.object({
  approach: z.enum(EvaluationApproach),
  threshold: optionalNumber,
});

const selectEvaluationParametersSchema = evaluationParametersSchema.superRefine(
  (parameters, ctx) => {
    if (!isApproachAllowedForFieldType('select', parameters.approach)) {
      ctx.addIssue({
        code: 'custom',
        path: ['approach'],
        message: `select fields only support "${EvaluationApproach.EXACT}" evaluation approach.`,
      });
    }
  },
);

const defaultExpectedOutcomeBaseSchema = z.object({
  label: nonEmptyString,
  placeholder: optionalString,
  evaluationSource: evaluationSourceSchema.optional(),
});

const createDefaultExpectedOutcomeFieldSchemas = (
  baseSchema: typeof defaultExpectedOutcomeBaseSchema,
) => ({
  text: baseSchema.extend({
    type: z.literal('text'),
    evaluationParameters: evaluationParametersSchema.optional(),
  }),
  textarea: baseSchema.extend({
    type: z.literal('textarea'),
    rows: optionalPositiveInt,
    evaluationParameters: evaluationParametersSchema.optional(),
  }),
  chipsInput: baseSchema.extend({
    type: z.literal('chips-input'),
    evaluationParameters: evaluationParametersSchema.optional(),
  }),
  select: baseSchema.extend({
    type: z.literal('select'),
    options: selectOptionsSchema,
    evaluationParameters: selectEvaluationParametersSchema.optional(),
  }),
});

function hasDuplicateChips(values: string[]): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (seen.has(normalized)) {
      return true;
    }
    seen.add(normalized);
  }
  return false;
}

const defaultFieldDefinitions =
  createDefaultExpectedOutcomeFieldSchemas(defaultExpectedOutcomeBaseSchema);

export const expectedOutcomeSchemaFieldSchema = z.discriminatedUnion('type', [
  defaultFieldDefinitions.text,
  defaultFieldDefinitions.textarea,
  defaultFieldDefinitions.chipsInput,
  defaultFieldDefinitions.select,
]);

export const expectedOutcomeSchemaSchema = z
  .array(expectedOutcomeSchemaFieldSchema)
  .min(1);

export const expectedOutcomeFieldSchema = z.discriminatedUnion('type', [
  defaultFieldDefinitions.text.extend({
    value: z.string(),
  }),
  defaultFieldDefinitions.textarea
    .extend({
      value: z.string(),
      outcomeMode: expectedOutcomeModeSchema.default('static'),
      resolutionQuery: z.string().optional(),
    })
    .superRefine((field, ctx) => {
      if (
        field.outcomeMode === 'dynamic' &&
        (!field.resolutionQuery || field.resolutionQuery.trim().length === 0)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['resolutionQuery'],
          message: 'resolutionQuery is required when outcomeMode is dynamic.',
        });
      }
    }),
  defaultFieldDefinitions.chipsInput.extend({
    value: z.array(z.string()).superRefine((values, ctx) => {
      if (hasDuplicateChips(values)) {
        ctx.addIssue({
          code: 'custom',
          message:
            'chips-input values must be unique (case-insensitive, trimmed).',
        });
      }
    }),
  }),
  defaultFieldDefinitions.select
    .extend({
      value: z.string(),
    })
    .superRefine((field, ctx) => {
      if (!field.options.includes(field.value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'select value must be one of the provided options.',
        });
      }
    }),
]);

export const expectedOutcomeArraySchema = z.array(expectedOutcomeFieldSchema).min(1);

export type ExpectedOutcomeSchemaField = z.infer<
  typeof expectedOutcomeSchemaFieldSchema
>;
export type ExpectedOutcomeSchema = z.infer<typeof expectedOutcomeSchemaSchema>;
export type ExpectedOutcomeField = z.input<typeof expectedOutcomeFieldSchema>;
export type ExpectedOutcomeFieldType = ExpectedOutcomeField['type'];
export type ExpectedOutcomeBase = z.infer<typeof defaultExpectedOutcomeBaseSchema>;

export type TextExpectedOutcomeSchemaField = Extract<
  ExpectedOutcomeSchemaField,
  { type: 'text' }
>;
export type TextareaExpectedOutcomeSchemaField = Extract<
  ExpectedOutcomeSchemaField,
  { type: 'textarea' }
>;
export type ChipsExpectedOutcomeSchemaField = Extract<
  ExpectedOutcomeSchemaField,
  { type: 'chips-input' }
>;
export type SelectExpectedOutcomeSchemaField = Extract<
  ExpectedOutcomeSchemaField,
  { type: 'select' }
>;

export type TextExpectedOutcomeField = Extract<
  ExpectedOutcomeField,
  { type: 'text' }
>;
export type TextareaExpectedOutcomeField = Extract<
  ExpectedOutcomeField,
  { type: 'textarea' }
>;
export type ChipsExpectedOutcomeField = Extract<
  ExpectedOutcomeField,
  { type: 'chips-input' }
>;
export type SelectExpectedOutcomeField = Extract<
  ExpectedOutcomeField,
  { type: 'select' }
>;

export function validateExpectedOutcomeSchema(
  schema: unknown,
): asserts schema is ExpectedOutcomeSchema {
  const parsed = expectedOutcomeSchemaSchema.safeParse(schema);
  if (!parsed.success) {
    throw new Error(
      `Invalid expectedOutcomeSchema: ${parsed.error.issues[0].message}`,
    );
  }
}

export function validateExpectedOutcomeArray(
  expectedOutcome: unknown,
): asserts expectedOutcome is ExpectedOutcomeField[] {
  const parsed = expectedOutcomeArraySchema.safeParse(expectedOutcome);
  if (!parsed.success) {
    throw new Error(`Invalid expectedOutcome: ${parsed.error.issues[0].message}`);
  }
}

export function validateExpectedOutcomeArrayWithExtractors(
  expectedOutcome: unknown,
  allowedExtractorIds: string[],
): asserts expectedOutcome is ExpectedOutcomeField[] {
  const allowed = new Set(allowedExtractorIds);
  const schema = expectedOutcomeArraySchema.superRefine((fields, ctx) => {
    fields.forEach((field, index) => {
      if (field.evaluationSource?.type !== 'custom') {
        return;
      }

      if (allowed.has(field.evaluationSource.extractorId)) {
        return;
      }

      ctx.addIssue({
        code: 'custom',
        path: [index, 'evaluationSource', 'extractorId'],
        message: `Invalid expectedOutcome: Extractor "${field.evaluationSource.extractorId}" is not registered.`,
      });
    });
  });

  const parsed = schema.safeParse(expectedOutcome);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
}

export function getExtractorIds(
  extractors?: EvaluationSourceExtractors,
): string[] {
  return Object.keys(extractors || {});
}
