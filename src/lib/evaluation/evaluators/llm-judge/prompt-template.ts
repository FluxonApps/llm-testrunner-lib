import type { Criterion } from '../../../../schemas/expected-outcome';
import type { JudgeMessage } from '../../../../types/llm-test-runner';

/**
 * Input to {@link buildJudgeMessages}.
 *
 * `chatHistory` and `additionalContext` are optional. When omitted, their
 * corresponding sections are dropped from the prompt entirely — no empty
 * `CHAT_HISTORY:` / `ADDITIONAL_CONTEXT:` header is rendered.
 *
 * `userTemplate`, when provided, replaces the library default user message
 * template. It must use `${key}` placeholders for any of the supported keys:
 * `question`, `expected_outcome`, `assistant_response`, `chat_history_block`,
 * `additional_context_block`, `criteria_json`. Unknown placeholders are left
 * as literal text in the rendered prompt.
 */
export interface JudgePromptInput {
  question: string;
  expectedOutcome: string;
  assistantResponse: string;
  criteria: Criterion[];
  chatHistory?: string;
  additionalContext?: string;
  userTemplate?: string;
}

function formatBlock(label: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    return '';
  }
  return `${label}:\n${value}`;
}

const PLACEHOLDER_KEYS = [
  'question',
  'expected_outcome',
  'assistant_response',
  'chat_history_block',
  'additional_context_block',
  'criteria_json',
] as const;

type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];
type PlaceholderVars = Record<PlaceholderKey, string>;

const PLACEHOLDER_PATTERN = new RegExp(
  '\\$\\{(' + PLACEHOLDER_KEYS.join('|') + ')\\}',
  'g',
);

const DEFAULT_JUDGE_SYSTEM_TEMPLATE = `
You are an impartial evaluator.

Evaluate the assistant response against the user prompt and expected outcome using ONLY the provided criteria.

Scoring rules:
- For each criterion, assign a numeric score in the range [0, 1].
- 1.0 = fully satisfies the criterion.
- 0.0 = does not satisfy the criterion.
- Use intermediate values for partial satisfaction.
- Judge substance over style.
- Do NOT reward verbosity unless a criterion explicitly asks for detail/depth.
- Do NOT penalize concise but correct responses.

Reasoning rules:
- For each criterion, provide a brief reason tied to specific details from:
  - user prompt
  - expected outcome
  - assistant response
  - additional context (if provided)
- Keep reasons concise and evaluation-focused.
- Do not invent criteria beyond what is provided.

Output rules (strict):
- Return ONLY valid JSON.
- No markdown, no code fences, no extra commentary.
- Include every criterion id exactly once.
- All scores must be numeric and within [0, 1].

Required JSON shape:
{
  "criteria": [
    {
      "id": "criterion_id",
      "score": 0.0,
      "reason": "brief criterion-specific justification"
    }
  ]
}`;

function interpolate(template: string, vars: PlaceholderVars): string {
  return template.replace(
    PLACEHOLDER_PATTERN,
    (_, key: PlaceholderKey) => vars[key],
  );
}

function buildDefaultJudgeUserMessage(
  input: Omit<JudgePromptInput, 'userTemplate'>,
): string {
  return `
Evaluation Steps:
1) Read USER_PROMPT and EXPECTED_OUTCOME to determine target behavior.
2) Read ASSISTANT_RESPONSE (and CHAT_HISTORY / ADDITIONAL_CONTEXT if present).
3) Score each criterion independently in [0,1].
4) Write concise, evidence-based reasons per criterion.
5) Return strict JSON only.

USER_PROMPT:
${input.question}

EXPECTED_OUTCOME:
${input.expectedOutcome}

ASSISTANT_RESPONSE:
${input.assistantResponse}

${formatBlock('CHAT_HISTORY', input.chatHistory)}

${formatBlock('ADDITIONAL_CONTEXT', input.additionalContext)}

CRITERIA:
${JSON.stringify(input.criteria, null, 2)}

JSON:`;
}

/**
 * Builds the [system, user] message pair to send to the judge LLM.
 *
 * The system message is library-controlled and not overridable in v1.
 *
 * The user message is built from `input.userTemplate` (if provided) — a
 * string with `${key}` placeholders — or from the library default. See
 * {@link JudgePromptInput} for the supported placeholder keys.
 *
 * @throws when `input.criteria` is empty. Callers should substitute in a
 * default correctness criterion before reaching this point.
 */
export function buildJudgeMessages(input: JudgePromptInput): JudgeMessage[] {
  if (!input.criteria || input.criteria.length === 0) {
    throw new Error(
      'buildJudgeMessages: criteria must contain at least one criterion.',
    );
  }

  let userContent: string;
  if (input.userTemplate) {
    const vars: PlaceholderVars = {
      question: input.question,
      expected_outcome: input.expectedOutcome,
      assistant_response: input.assistantResponse,
      chat_history_block: formatBlock('CHAT_HISTORY', input.chatHistory),
      additional_context_block: formatBlock(
        'ADDITIONAL_CONTEXT',
        input.additionalContext,
      ),
      criteria_json: JSON.stringify(input.criteria, null, 2),
    };
    userContent = interpolate(input.userTemplate, vars);
  } else {
    userContent = buildDefaultJudgeUserMessage(input);
  }

  return [
    { role: 'system', content: DEFAULT_JUDGE_SYSTEM_TEMPLATE },
    { role: 'user', content: userContent },
  ];
}
