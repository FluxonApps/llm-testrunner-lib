import type { Criterion } from '../../../../schemas/expected-outcome';
import type { JudgeMessage } from '../../../../types/llm-test-runner';

/**
 * Input to {@link buildJudgeMessages}.
 *
 * Both prompts (system and user) are library-controlled in v1. The
 * system prompt carries the strict-JSON output contract; the user prompt
 * slots in the four core evaluation inputs. Consumers customize what
 * gets evaluated via the test case (question, expected outcome,
 * criteria) and which model judges via the `llmJudge` callback — they
 * don't override the prompt structure itself.
 *
 * The judge does not receive chat history or "additional context" by
 * design — those are inputs to the model under test, not to the judge.
 * The judge scores the assistant's response against the expected outcome
 * using only the configured criteria.
 */
export interface JudgePromptInput {
  question: string;
  expectedOutcome: string;
  assistantResponse: string;
  criteria: Criterion[];
}

/**
 * Default system prompt — sets the judge's role and the strict JSON output
 * contract. Consumers who override this MUST keep the JSON shape directive
 * intact, otherwise the library's response validator will reject the
 * judge's output and the test will surface as an evaluation error.
 */
export const DEFAULT_JUDGE_SYSTEM_TEMPLATE = `
You are an impartial evaluator.

Evaluate the assistant response against the user prompt and expected outcome using ONLY the provided criteria.

Evaluation Steps:
1) Read USER_PROMPT and EXPECTED_OUTCOME to determine target behavior.
2) Read ASSISTANT_RESPONSE (and CHAT_HISTORY / ADDITIONAL_CONTEXT if present).
3) Score each criterion independently in [0,1].
4) Write concise, evidence-based reasons per criterion.
5) Return strict JSON only.

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

/**
 * Default user prompt — slots evaluation data into a fixed structure.
 * Uses `${key}` placeholders. Consumers can supply their own user template
 * (e.g. uploaded as a `.txt` file) and the library will interpolate the
 * same set of placeholder keys into it.
 *
 * The default does NOT include `${chat_history_block}` or
 * `${additional_context_block}` — those placeholders are still supported
 * for consumers who want to surface them in a custom template, but the
 * library's default keeps the user prompt focused on the four core
 * evaluation inputs.
 */
export const DEFAULT_JUDGE_USER_TEMPLATE = `
USER_PROMPT:
\${question}

EXPECTED_OUTCOME:
\${expected_outcome}

ASSISTANT_RESPONSE:
\${assistant_response}

CRITERIA:
\${criteria_json}

JSON:`;

// ===== Internal helpers =====

const PLACEHOLDER_KEYS = [
  'question',
  'expected_outcome',
  'assistant_response',
  'criteria_json',
] as const;

type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];
type PlaceholderVars = Record<PlaceholderKey, string>;

const PLACEHOLDER_PATTERN = new RegExp(
  '\\$\\{(' + PLACEHOLDER_KEYS.join('|') + ')\\}',
  'g',
);

/**
 * Single-pass placeholder substitution. Each known `${key}` in the
 * template is replaced by `vars[key]`. Replacement values are NOT
 * re-scanned, so user content that happens to contain `${question}`
 * (or any other placeholder) stays as a literal string in the final
 * prompt.
 */
function interpolate(template: string, vars: PlaceholderVars): string {
  return template.replace(
    PLACEHOLDER_PATTERN,
    (_, key: PlaceholderKey) => vars[key],
  );
}

/**
 * Builds the [system, user] message pair to send to the judge LLM.
 *
 * Both prompts are built from library-controlled defaults. The system
 * prompt carries the strict-JSON output contract; the user prompt slots
 * the four evaluation inputs (question, expected outcome, assistant
 * response, criteria) into a fixed structure.
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

  const vars: PlaceholderVars = {
    question: input.question,
    expected_outcome: input.expectedOutcome,
    assistant_response: input.assistantResponse,
    criteria_json: JSON.stringify(input.criteria, null, 2),
  };

  return [
    { role: 'system', content: DEFAULT_JUDGE_SYSTEM_TEMPLATE },
    { role: 'user', content: interpolate(DEFAULT_JUDGE_USER_TEMPLATE, vars) },
  ];
}
