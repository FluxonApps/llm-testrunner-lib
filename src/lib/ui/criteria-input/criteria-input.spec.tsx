import { jest, describe, it, expect } from '@jest/globals';
import { h } from '@stencil/core';
import { newSpecPage } from '@stencil/core/testing';
import { CriteriaInput, type CriteriaInputChangeDetail } from './criteria-input';

type SpecPage = Awaited<ReturnType<typeof newSpecPage>>;

function getTextarea(page: SpecPage): HTMLTextAreaElement {
  return page.root!.shadowRoot!.querySelector(
    '.criteria-input__textarea',
  ) as HTMLTextAreaElement;
}

function getTextareaValue(page: SpecPage): string {
  return getTextarea(page).getAttribute('value') ?? '';
}

function getError(page: SpecPage): HTMLElement | null {
  return page.root!.shadowRoot!.querySelector(
    '.criteria-input__error',
  ) as HTMLElement | null;
}

async function type(page: SpecPage, raw: string): Promise<void> {
  const textarea = getTextarea(page);
  textarea.value = raw;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  await page.waitForChanges();
}

function attachChangeSpy(
  page: SpecPage,
): jest.Mock<(e: CustomEvent<CriteriaInputChangeDetail>) => void> {
  const spy = jest.fn<(e: CustomEvent<CriteriaInputChangeDetail>) => void>();
  page.root!.addEventListener('criteriaChange', (e: Event) =>
    spy(e as CustomEvent<CriteriaInputChangeDetail>),
  );
  return spy;
}

const VALID_JSON = `[
  {"id": "correctness", "description": "Factually correct.", "weight": 1}
]`;

describe('CriteriaInput', () => {
  describe('initial render', () => {
    it('initializes textarea with the criteria prop pretty-printed', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        template: () => (
          <criteria-input
            criteria={[
              { id: 'a', description: 'A criterion.', weight: 2 },
            ]}
          />
        ),
      });
      const text = getTextareaValue(page);
      expect(text).toContain('"id": "a"');
      expect(text).toContain('"weight": 2');
    });

    it('renders an empty textarea when criteria is undefined', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      expect(getTextareaValue(page)).toBe('');
    });

    it('shows no error initially', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      expect(getError(page)).toBeNull();
    });
  });

  describe('valid input', () => {
    it('emits criteriaChange with parsed array on valid JSON', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(page, VALID_JSON);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail.value).toEqual([
        { id: 'correctness', description: 'Factually correct.', weight: 1 },
      ]);
      expect(getError(page)).toBeNull();
    });

    it('emits criteriaChange with undefined when text is cleared', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        template: () => (
          <criteria-input
            criteria={[{ id: 'a', description: 'A.', weight: 1 }]}
          />
        ),
      });
      const spy = attachChangeSpy(page);
      await type(page, '');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].detail.value).toBeUndefined();
      expect(getError(page)).toBeNull();
    });

    it('accepts optional weight (defaults handled by evaluator)', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(
        page,
        '[{"id": "a", "description": "Just an A criterion."}]',
      );
      expect(spy.mock.calls[0][0].detail.value).toEqual([
        { id: 'a', description: 'Just an A criterion.' },
      ]);
    });
  });

  describe('invalid input', () => {
    it('shows an inline error and does NOT emit on invalid JSON', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(page, '[{"id": "a"');

      expect(spy).not.toHaveBeenCalled();
      expect(getError(page)?.textContent).toContain('Invalid JSON');
    });

    it('rejects non-array JSON', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(page, '{"id": "a", "description": "not an array"}');

      expect(spy).not.toHaveBeenCalled();
      expect(getError(page)?.textContent).toContain('must be a JSON array');
    });

    it('rejects empty array', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(page, '[]');

      expect(spy).not.toHaveBeenCalled();
      expect(getError(page)?.textContent).toContain(
        'At least one criterion is required',
      );
    });

    it('rejects criterion missing id', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(page, '[{"description": "no id"}]');

      expect(spy).not.toHaveBeenCalled();
      expect(getError(page)?.textContent).toContain('"id" must be a non-empty string');
    });

    it('rejects criterion missing description', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(page, '[{"id": "a"}]');

      expect(spy).not.toHaveBeenCalled();
      expect(getError(page)?.textContent).toContain(
        '"description" must be a non-empty string',
      );
    });

    it('rejects negative weight', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(
        page,
        '[{"id": "a", "description": "x", "weight": -1}]',
      );

      expect(spy).not.toHaveBeenCalled();
      expect(getError(page)?.textContent).toContain(
        '"weight" must be a positive number',
      );
    });

    it('rejects duplicate ids', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);
      await type(
        page,
        '[{"id":"a","description":"x"},{"id":"a","description":"y"}]',
      );

      expect(spy).not.toHaveBeenCalled();
      expect(getError(page)?.textContent).toContain('duplicate id "a"');
    });
  });

  describe('recovery from error', () => {
    it('clears the error and re-emits when JSON becomes valid again', async () => {
      const page = await newSpecPage({
        components: [CriteriaInput],
        html: '<criteria-input></criteria-input>',
      });
      const spy = attachChangeSpy(page);

      await type(page, '[{');
      expect(getError(page)).not.toBeNull();
      expect(spy).not.toHaveBeenCalled();

      await type(page, VALID_JSON);
      expect(getError(page)).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
