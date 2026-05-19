/* eslint-env jest */

jest.mock('../../lib/evaluation/evaluation-engine', () => ({
  LLMEvaluationEngine: jest.fn().mockImplementation(() => ({
    evaluateResponse: jest.fn()
  }))
}));

jest.mock('../../lib/file/file-reader');
jest.mock('../../lib/file/file-download');
jest.mock('../../lib/import-export/test-suite-exporter');
jest.mock('../../lib/import-export/test-suite-importer');

import { newSpecPage, SpecPage } from '@stencil/core/testing';
import { LLMTestRunner } from './llm-test-runner';
import { TestCase } from '../../types/llm-test-runner';
import { readFileAsync } from '../../lib/file/file-reader';
import { downloadFile } from '../../lib/file/file-download';
import { formatTestSuiteAsJson } from '../../lib/import-export/test-suite-exporter';
import { importTestSuite } from '../../lib/import-export/test-suite-importer';
import { EvaluationApproach } from '../../lib/evaluation/constants';

const emptyChatHistory = { enabled: false, value: '' } as const;

describe('llm-test-runner import/export', () => {
  let page: SpecPage;
  let component: any;
  const buildExpectedOutcome = (value: string) => [
    {
      type: 'textarea' as const,
      label: 'Expected Outcome',
      value,
    },
  ];

  const createMockTestCase = (overrides: Partial<TestCase> = {}): TestCase => {
    const defaults: TestCase = {
      id: '1',
      question: 'What is AI?',
      expectedOutcome: buildExpectedOutcome('artificial intelligence'),
      chatHistory: { enabled: false, value: '' },
      isRunning: false,
    };

    return {
      ...defaults,
      ...overrides,
    };
  };

  const createMockFile = (content: string, filename: string, type: string = 'application/json'): File => {
    return new File([content], filename, { type });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    page = await newSpecPage({
      components: [LLMTestRunner],
      html: '<llm-test-runner></llm-test-runner>',
    });
    component = page.rootInstance;
    
    await page.waitForChanges();
  });

  describe('File Import - Basic Functionality', () => {
    it('should import valid test cases structure', async () => {
      const mockTestData = [
        {
          id: '1',
          question: 'What is AI?',
          expectedOutcome: buildExpectedOutcome('artificial intelligence'),
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
      ];

      const mockFile = createMockFile(JSON.stringify(mockTestData), 'test-suite.json');

      // Mock the utility functions
      (readFileAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockTestData));
      (importTestSuite as jest.Mock).mockReturnValue({
        success: true,
        testCases: mockTestData
      });

      await component.handleImport(mockFile);
      await page.waitForChanges();

      expect(component.testCases).toHaveLength(1);
      expect(component.testCases[0]).toMatchObject({
        id: '1',
        question: 'What is AI?',
        expectedOutcome: buildExpectedOutcome('artificial intelligence'),
      });
    });

    it('should use default evaluation parameters when not provided', async () => {
      const rawImportData = [
        {
          id: '1',
          question: 'Test question',
          expectedOutcome: buildExpectedOutcome('test'),
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
      ];
      const normalizedImportData = [
        {
          id: '1',
          question: 'Test question',
          expectedOutcome: [
            {
              type: 'textarea' as const,
              label: 'Expected Outcome',
              value: 'test',
              evaluationParameters: {
                approach: EvaluationApproach.EXACT,
              },
            },
          ],
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
      ];

      const mockFile = createMockFile(JSON.stringify(rawImportData), 'test.json');

      (readFileAsync as jest.Mock).mockResolvedValue(JSON.stringify(rawImportData));
      (importTestSuite as jest.Mock).mockReturnValue({
        success: true,
        testCases: normalizedImportData,
      });

      await component.handleImport(mockFile);
      await page.waitForChanges();

      expect(
        component.testCases[0].expectedOutcome[0].evaluationParameters?.approach,
      ).toBe(EvaluationApproach.EXACT);
      expect(component.testCases[0].expectedOutcome[0].value).toBe('test');
      expect(component.testCases[0].expectedOutcome[0].label).toBe(
        'Expected Outcome',
      );
    });
  });

  describe('File Import - Multiple Test Cases', () => {
    it('should import multiple test cases successfully', async () => {
      const mockTestData = [
        {
          id: '1',
          question: 'What is AI?',
          expectedOutcome: buildExpectedOutcome('artificial intelligence'),
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
        {
          id: '2',
          question: 'What is ML?',
          expectedOutcome: buildExpectedOutcome('machine learning'),
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
      ];

      const mockFile = createMockFile(JSON.stringify(mockTestData), 'test.json');

      (readFileAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockTestData));
      (importTestSuite as jest.Mock).mockReturnValue({
        success: true,
        testCases: mockTestData
      });

      await component.handleImport(mockFile);
      await page.waitForChanges();

      expect(component.testCases).toHaveLength(2);
      expect(component.testCases[0].question).toBe('What is AI?');
      expect(component.testCases[1].question).toBe('What is ML?');
    });

    it('should handle unique IDs for imported test cases', async () => {
      const mockTestData = [
        {
          id: '1',
          question: 'Q1',
          expectedOutcome: buildExpectedOutcome('answer1'),
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
        {
          id: '2',
          question: 'Q2',
          expectedOutcome: buildExpectedOutcome('answer2'),
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
        {
          id: '3',
          question: 'Q3',
          expectedOutcome: buildExpectedOutcome('answer3'),
          chatHistory: { ...emptyChatHistory },
          isRunning: false,
        },
      ];

      const mockFile = createMockFile(JSON.stringify(mockTestData), 'test.json');

      (readFileAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockTestData));
      (importTestSuite as jest.Mock).mockReturnValue({
        success: true,
        testCases: mockTestData
      });

      await component.handleImport(mockFile);
      await page.waitForChanges();

      const ids = component.testCases.map((tc: TestCase) => tc.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('File Import - Error Handling', () => {
    it('should reject non-JSON file type', async () => {
      const mockFile = createMockFile('some content', 'test.txt', 'text/plain');

      await component.handleImport(mockFile);
      await page.waitForChanges();

      expect(component.error).toBe('Invalid file type. Please select a JSON file.');
    });

    it('should handle import failure from utility', async () => {
      const mockFile = createMockFile('{}', 'test.json');

      (readFileAsync as jest.Mock).mockResolvedValue('{}');
      (importTestSuite as jest.Mock).mockReturnValue({
        success: false,
        error: 'Invalid JSON structure. Expected a JSON array.'
      });

      await component.handleImport(mockFile);
      await page.waitForChanges();

      expect(component.error).toContain('Invalid JSON structure');
    });

    it('should handle file read errors', async () => {
      const mockFile = createMockFile('{}', 'test.json');

      (readFileAsync as jest.Mock).mockRejectedValue(new Error('Failed to read file'));

      await component.handleImport(mockFile);
      await page.waitForChanges();

      expect(component.error).toBeTruthy();
    });
  });

  describe('Export Test Suite', () => {
    it('should export test suite with correct structure', async () => {
      component.testCases = [createMockTestCase()];

      const mockJsonContent = JSON.stringify([createMockTestCase()]);
      (formatTestSuiteAsJson as jest.Mock).mockReturnValue(mockJsonContent);
      (downloadFile as jest.Mock).mockImplementation(() => {});

      await component.handleExportTestSuite();
      await page.waitForChanges();

      expect(formatTestSuiteAsJson).toHaveBeenCalledWith(component.testCases);
      expect(downloadFile).toHaveBeenCalledWith(
        mockJsonContent,
        'test-suite.json',
        'application/json'
      );
    });

    it('should handle exporting state', async () => {
      component.testCases = [createMockTestCase()];

      (formatTestSuiteAsJson as jest.Mock).mockReturnValue('[]');
      (downloadFile as jest.Mock).mockImplementation(() => {});

      expect(component.isExportingTestSuite).toBe(false);

      const exportPromise = component.handleExportTestSuite();
      
      // During export
      await page.waitForChanges();

      // After export completes
      await exportPromise;
      await page.waitForChanges();

      expect(component.isExportingTestSuite).toBe(false);
    });

    it('should export multiple test cases', async () => {
      const testCases = [
        createMockTestCase({ id: '1', question: 'Q1' }),
        createMockTestCase({ id: '2', question: 'Q2' }),
        createMockTestCase({ id: '3', question: 'Q3' })
      ];

      component.testCases = testCases;

      (formatTestSuiteAsJson as jest.Mock).mockReturnValue(JSON.stringify(testCases));
      (downloadFile as jest.Mock).mockImplementation(() => {});

      await component.handleExportTestSuite();
      await page.waitForChanges();

      expect(formatTestSuiteAsJson).toHaveBeenCalledWith(testCases);
    });
  });

  describe('Component State Management', () => {
    it('should maintain test cases state', () => {
      expect(component.testCases).toBeDefined();
      expect(Array.isArray(component.testCases)).toBe(true);
    });

    it('should maintain error state', () => {
      expect(component.error).toBeDefined();
      expect(typeof component.error).toBe('string');
    });

    it('should clear errors', async () => {
      component.error = 'Test error';
      await page.waitForChanges();

      expect(component.error).toBe('Test error');

      component.error = '';
      await page.waitForChanges();

      expect(component.error).toBe('');
    });
  });
});