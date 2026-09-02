import { jest, describe, beforeEach, it, expect } from '@jest/globals';

jest.mock('../../../lib/evaluation/evaluation-service', () => ({
  EvaluationService: jest.fn().mockImplementation(() => ({
    evaluateTestCase: jest.fn(),
  })),
}));

import { newSpecPage } from '@stencil/core/testing';
import { LLMTestRunner } from '../llm-test-runner';

describe('LLMTestRunner toolbar stuck state', () => {
  let page: Awaited<ReturnType<typeof newSpecPage>>;

  /** Places the sentinel's bottom edge at `bottom` in viewport coordinates. */
  function positionSentinel(bottom: number) {
    const sentinel = page.root.shadowRoot.querySelector(
      '.test-cases-toolbar-sentinel',
    ) as HTMLElement;
    sentinel.getBoundingClientRect = () => ({ bottom }) as DOMRect;
  }

  async function scroll() {
    window.dispatchEvent(new Event('scroll'));
    await new Promise(resolve => requestAnimationFrame(resolve));
    await page.waitForChanges();
  }

  const isStuck = () =>
    page.root.shadowRoot
      .querySelector('.test-cases-toolbar')
      .classList.contains('test-cases-toolbar--stuck');

  beforeEach(async () => {
    jest.clearAllMocks();
    page = await newSpecPage({
      components: [LLMTestRunner],
      html: '<llm-test-runner></llm-test-runner>',
    });
  });

  it('is not stuck while the sentinel is still at or below the sticky line', async () => {
    positionSentinel(0);
    await scroll();

    expect(page.rootInstance.isToolbarStuck).toBe(false);
    expect(isStuck()).toBe(false);
  });

  it('is not stuck when the component sits below the fold', async () => {
    positionSentinel(2000);
    await scroll();

    expect(page.rootInstance.isToolbarStuck).toBe(false);
  });

  it('is stuck once the sentinel passes the sticky line', async () => {
    positionSentinel(-40);
    await scroll();

    expect(page.rootInstance.isToolbarStuck).toBe(true);
    expect(isStuck()).toBe(true);
  });

  it('releases the stuck state on the way back up', async () => {
    positionSentinel(-40);
    await scroll();
    expect(page.rootInstance.isToolbarStuck).toBe(true);

    positionSentinel(200);
    await scroll();

    expect(page.rootInstance.isToolbarStuck).toBe(false);
  });

  it('measures against the sticky line offset by stickyOffset', async () => {
    page.root.stickyOffset = 64;
    await page.waitForChanges();

    positionSentinel(30);
    await scroll();

    expect(page.rootInstance.isToolbarStuck).toBe(true);
  });

  it('stops tracking on detach and resumes on reattach', async () => {
    const host = page.root;
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    host.remove();
    await page.waitForChanges();

    expect(removeSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.objectContaining({ capture: true }),
    );

    const addSpy = jest.spyOn(window, 'addEventListener');
    page.body.appendChild(host);
    await page.waitForChanges();

    expect(addSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.objectContaining({ capture: true, passive: true }),
    );

    positionSentinel(-40);
    await scroll();
    expect(page.rootInstance.isToolbarStuck).toBe(true);
  });
});
