jest.mock('../../lib/evaluation/evaluation-service', () => ({
  EvaluationService: jest.fn().mockImplementation(() => ({
    evaluateTestCase: jest.fn(),
  })),
}));

jest.mock('../../lib/file/file-reader');
jest.mock('../../lib/import-export/test-suite-importer');

import { jest as jestGlobal, describe, beforeEach, it, expect } from '@jest/globals';
import { newSpecPage, SpecPage } from '@stencil/core/testing';
import { LLMTestRunner } from './llm-test-runner';
import { TestCase } from '../../types/llm-test-runner';
import { readFileAsync } from '../../lib/file/file-reader';
import { importTestSuite } from '../../lib/import-export/test-suite-importer';

const buildExpectedOutcome = (value: string) => [
  {
    type: 'textarea' as const,
    label: 'Expected Outcome',
    value,
  },
];

const mockTestCase: TestCase = {
  id: '1',
  question: 'What is AI?',
  expectedOutcome: buildExpectedOutcome('artificial intelligence'),
  chatHistory: { enabled: false, value: '' },
  isRunning: false,
};

const createMockFile = (content: string, filename = 'test.json'): File =>
  new File([content], filename, { type: 'application/json' });

describe('LLMTestRunner readOnly', () => {
  let page: SpecPage;
  let component: any;

  beforeEach(async () => {
    jestGlobal.clearAllMocks();

    page = await newSpecPage({
      components: [LLMTestRunner],
      html: '<llm-test-runner></llm-test-runner>',
    });
    component = page.rootInstance;
    (page.root as unknown as LLMTestRunner).readOnly = true;
    component.testCases = [{ ...mockTestCase }];
    await page.waitForChanges();
  });

  describe('rendering', () => {
    it('hides the Add question, Import, and Delete controls', () => {
      const root = page.root!.shadowRoot!;

      const toolbarTooltipLabels = Array.from(
        root.querySelectorAll('.test-cases-toolbar__actions .ui-tooltip__bubble'),
      ).map(el => el.textContent);
      expect(toolbarTooltipLabels).not.toContain('Add question');
      expect(toolbarTooltipLabels).not.toContain('Import test suite');
      expect(toolbarTooltipLabels).toContain('Export test suite');

      expect(root.querySelector('.test-cases__add-card')).toBeNull();

      const deleteBtn = Array.from(
        root.querySelectorAll('button'),
      ).find(b => b.title === 'Delete this test');
      expect(deleteBtn).toBeUndefined();
    });

    it('locks the editable controls without using inert (which cannot exempt non-mutating content)', () => {
      const root = page.root!.shadowRoot!;

      // Regression guard: inert can't be selectively un-inerted, so it must not
      // be reintroduced as a blanket lock over content that includes non-mutating
      // controls (copy buttons, links) or readable results.
      expect(root.querySelector('[inert]')).toBeNull();

      const questionInput = root.querySelector(
        '.test-case-row__question-input',
      ) as HTMLInputElement;
      expect(questionInput.readOnly).toBe(true);

      const chatHistoryEl = root.querySelector('chat-history')!;
      expect(
        chatHistoryEl.hasAttribute('disabled') ||
          (chatHistoryEl as unknown as { disabled?: boolean }).disabled === true,
      ).toBe(true);

      const evaluationSelect = root.querySelector(
        'app-select',
      ) as unknown as { config?: { disabled?: boolean } };
      expect(evaluationSelect.config?.disabled).toBe(true);

      const outcomeTextarea = root.querySelector(
        'app-textarea',
      ) as unknown as { config?: { readOnly?: boolean } };
      expect(outcomeTextarea.config?.readOnly).toBe(true);
    });

    it('leaves non-mutating controls (the expected-value copy button) interactive', () => {
      const root = page.root!.shadowRoot!;
      const copyBtn = root.querySelector('copy-button');
      expect(copyBtn).not.toBeNull();
      expect(copyBtn?.closest('[inert]')).toBeNull();
      expect((copyBtn as unknown as { disabled?: boolean }).disabled).toBeFalsy();
    });

    it('still renders an enabled Run button', () => {
      const root = page.root!.shadowRoot!;
      const runBtn = root.querySelector('button[aria-label="Run this test"]')!;
      expect(runBtn.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('mutation guards', () => {
    it('blocks addNewTestCase', () => {
      component.addNewTestCase();
      expect(component.testCases).toHaveLength(1);
    });

    it('blocks deleteTestCase', () => {
      component.deleteTestCase('1');
      expect(component.testCases).toHaveLength(1);
    });

    it('blocks handleTestCaseChange', () => {
      component.handleTestCaseChange({
        detail: { testCaseId: '1', key: 'question', value: 'changed' },
      });
      expect(component.testCases[0].question).toBe('What is AI?');
    });

    it('blocks handleChatHistoryChange', () => {
      component.handleChatHistoryChange({
        detail: { testCaseId: '1', enabled: true, value: 'history' },
      });
      expect(component.testCases[0].chatHistory).toEqual({
        enabled: false,
        value: '',
      });
    });

    it('blocks handleExpectedOutcomeChange', () => {
      component.handleExpectedOutcomeChange({
        detail: { testCaseId: '1', index: 0, operation: 'set-value', value: 'changed' },
      });
      expect(component.testCases[0].expectedOutcome[0].value).toBe(
        'artificial intelligence',
      );
    });

    it('blocks handleImport even when the guard would otherwise succeed', async () => {
      const mockFile = createMockFile(JSON.stringify([mockTestCase]));
      (readFileAsync as jest.Mock).mockResolvedValue(JSON.stringify([mockTestCase]));
      (importTestSuite as jest.Mock).mockReturnValue({
        success: true,
        testCases: [{ ...mockTestCase, id: '2', question: 'Imported' }],
      });

      await component.handleImport(mockFile);
      await page.waitForChanges();

      expect(component.testCases).toHaveLength(1);
      expect(component.testCases[0].question).toBe('What is AI?');
    });

    it('blocks handleImport if readOnly is turned on while the file read is in flight', async () => {
      let resolveRead: (value: string) => void;
      (readFileAsync as jest.Mock).mockImplementation(
        () => new Promise<string>(resolve => { resolveRead = resolve; }),
      );
      (importTestSuite as jest.Mock).mockReturnValue({
        success: true,
        testCases: [{ ...mockTestCase, id: '2', question: 'Imported' }],
      });

      // Start read-write while unlocked, then lock before the read resolves.
      (page.root as unknown as LLMTestRunner).readOnly = false;
      const mockFile = createMockFile(JSON.stringify([mockTestCase]));
      const importPromise = component.handleImport(mockFile);

      (page.root as unknown as LLMTestRunner).readOnly = true;
      resolveRead!(JSON.stringify([mockTestCase]));
      await importPromise;
      await page.waitForChanges();

      expect(component.testCases).toHaveLength(1);
      expect(component.testCases[0].question).toBe('What is AI?');
    });
  });

  describe('run stays available', () => {
    it('does not block runSingleTest / updateTestCase', async () => {
      const llmRequestSpy = jestGlobal.fn();
      page.root!.addEventListener('llmRequest', (llmRequestSpy as unknown) as EventListener);

      const runPromise = component.runSingleTest(component.testCases[0]).catch(() => {});
      await page.waitForChanges();

      expect(component.testCases[0].isRunning).toBe(true);
      expect(llmRequestSpy).toHaveBeenCalledTimes(1);

      const event = llmRequestSpy.mock.calls[0][0] as CustomEvent<{
        resolve: (value: { text: string }) => void;
      }>;
      event.detail.resolve({ text: 'Paris' });

      await runPromise;
    });
  });
});
