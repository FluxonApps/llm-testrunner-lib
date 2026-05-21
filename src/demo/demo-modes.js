export const DEMO_MODES = {
  simpleTest: {
    initialTestCases: [
      {
        id: 'demo-simpleTest-1',
        question:
          'What is the capital of France? Reply with just the city name, nothing else.',
        expectedOutcome: [
          {
            type: 'textarea',
            label: 'Expected Outcome',
            value: 'paris',
            evaluationParameters: { approach: 'exact' },
          },
        ],
      },
      {
        id: 'demo-simpleTest-2',
        question: 'How many legs does a typical dog have? One short phrase is fine.',
        expectedOutcome: [
          {
            type: 'textarea',
            label: 'Expected Outcome',
            value: '4,four',
            evaluationParameters: {
              approach: 'semantic',
              threshold: 0.48,
            },
          },
        ],
      },
    ],
  },
  multipleExpectedOutcomes: {
    defaultExpectedOutcomeSchema: [
      {
        type: 'text',
        label: 'Must include',
        placeholder: 'Word that should appear in the answer',
        evaluationParameters: { approach: 'exact' },
      },
      {
        type: 'textarea',
        label: 'Meaning check',
        placeholder: 'Comma-separated ideas to match loosely',
        rows: 3,
        evaluationParameters: { approach: 'semantic', threshold: 0.5 },
      },
      {
        type: 'chips-input',
        label: 'Keywords',
        placeholder: 'Add chip',
        evaluationParameters: { approach: 'exact' },
      },
      {
        type: 'select',
        label: 'Says yes or no',
        placeholder: 'Pick one',
        options: ['Yes', 'No'],
        evaluationParameters: { approach: 'exact' },
      },
    ],
    initialTestCases: [
      {
        id: 'demo-multipleExpectedOutcomes-1',
        question:
          'Is water a liquid? Answer yes or no in one short sentence, and use the word water.',
        expectedOutcome: [
          {
            type: 'text',
            label: 'Must include',
            value: 'water',
            evaluationParameters: { approach: 'exact' },
          },
          {
            type: 'textarea',
            label: 'Meaning check',
            value: 'yes,liquid',
            evaluationParameters: {
              approach: 'semantic',
              threshold: 0.5,
            },
          },
          {
            type: 'chips-input',
            label: 'Keywords',
            value: ['yes', 'water'],
            evaluationParameters: { approach: 'exact' },
          },
          {
            type: 'select',
            label: 'Says yes or no',
            options: ['Yes', 'No'],
            value: 'Yes',
            evaluationParameters: { approach: 'exact' },
          },
        ],
      },
    ],
  },
  llmJudge: {
    initialTestCases: [
      {
        id: 'demo-llmJudge-1',
        question:
          'In one or two sentences, explain why the sky appears blue during the day.',
        expectedOutcome: [
          {
            type: 'textarea',
            label: 'Expected Outcome',
            value:
              'Sunlight is scattered by air molecules; shorter (blue) wavelengths scatter more, so the sky looks blue.',
            evaluationParameters: {
              approach: 'llm-judge',
              threshold: 0.7,
              criteria: [
                {
                  id: 'correctness',
                  description:
                    'Names Rayleigh scattering or describes shorter/blue wavelengths scattering more.',
                  weight: 2,
                },
                {
                  id: 'concision',
                  description:
                    'Stays within roughly one to two sentences and avoids unrelated tangents.',
                  weight: 1,
                },
              ],
            },
          },
        ],
      },
      {
        id: 'demo-llmJudge-2',
        question:
          'Briefly: what is one upside and one downside of using LLM-as-judge?',
        expectedOutcome: [
          {
            type: 'textarea',
            label: 'Expected Outcome',
            value:
              'Upside: scales beyond hand-graded keyword matching for open-ended outputs. Downside: judges can be biased and add cost / latency.',
            evaluationParameters: {
              approach: 'llm-judge',
              threshold: 0.7,
              // No criteria — falls back to the default correctness criterion.
            },
          },
        ],
      },
    ],
  },
  dynamicExpectedOutcome: {
    initialTestCases: [
      {
        id: 'demo-dynamicExpectedOutcome-1',
        question:
          'In one sentence, when can customers reach support?',
        expectedOutcome: [
          {
            type: 'textarea',
            label: 'Gold answer (filled when you run)',
            outcomeMode: 'dynamic',
            resolutionQuery: 'demo.faq.hours',
            value: '',
            evaluationParameters: {
              approach: 'semantic',
              threshold: 0.62,
            },
          },
        ],
      },
    ],
    resolveExpectedOutcome: async (resolutionQuery) => {
      const key = resolutionQuery.trim();
      if (key === 'demo.faq.hours') {
        return 'Support is available 9am–5pm Eastern Time, Monday through Friday.';
      }
      return `Unknown resolution key: ${key}`;
    },
  },
};
