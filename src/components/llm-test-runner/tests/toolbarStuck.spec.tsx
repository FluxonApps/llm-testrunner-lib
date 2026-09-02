import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

jest.mock('../../../lib/evaluation/evaluation-service', () => ({
  EvaluationService: jest.fn().mockImplementation(() => ({
    evaluateTestCase: jest.fn(),
  })),
}));

import { newSpecPage } from '@stencil/core/testing';
import { LLMTestRunner } from '../llm-test-runner';

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

interface MockObserver {
  callback: ObserverCallback;
  options?: IntersectionObserverInit;
  observe: jest.Mock;
  disconnect: jest.Mock;
}

const SENTINEL_HEIGHT = 1;
const TOOLBAR_HEIGHT = 48;

describe('LLMTestRunner toolbar stuck state', () => {
  let page: Awaited<ReturnType<typeof newSpecPage>>;
  let observers: MockObserver[];
  const originalObserver = (global as Record<string, unknown>)
    .IntersectionObserver;

  /** Positions the sentinel, then the toolbar `gap` px below its bottom edge. */
  function emitEntry(sentinelTop: number, gap: number) {
    const observer = observers[observers.length - 1];
    const toolbar = page.root.shadowRoot.querySelector(
      '.test-cases-toolbar',
    ) as HTMLElement;
    const toolbarTop = sentinelTop + SENTINEL_HEIGHT + gap;
    toolbar.getBoundingClientRect = () =>
      ({
        top: toolbarTop,
        bottom: toolbarTop + TOOLBAR_HEIGHT,
      }) as DOMRect;

    observer.callback([
      {
        boundingClientRect: {
          top: sentinelTop,
          bottom: sentinelTop + SENTINEL_HEIGHT,
        } as DOMRect,
      } as IntersectionObserverEntry,
    ]);
  }

  const isStuck = () =>
    page.root.shadowRoot
      .querySelector('.test-cases-toolbar')
      .classList.contains('test-cases-toolbar--stuck');

  beforeEach(async () => {
    jest.clearAllMocks();
    observers = [];

    (global as Record<string, unknown>).IntersectionObserver = jest
      .fn()
      .mockImplementation(
        (callback: ObserverCallback, options?: IntersectionObserverInit) => {
          const observer: MockObserver = {
            callback,
            options,
            observe: jest.fn(),
            disconnect: jest.fn(),
          };
          observers.push(observer);
          return observer;
        },
      );

    page = await newSpecPage({
      components: [LLMTestRunner],
      html: '<llm-test-runner></llm-test-runner>',
    });
  });

  afterEach(() => {
    (global as Record<string, unknown>).IntersectionObserver =
      originalObserver;
  });

  it('observes the sentinel once the component has rendered', () => {
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledTimes(1);
    expect(observers[0].observe.mock.calls[0][0]).toHaveProperty(
      'className',
      'test-cases-toolbar-sentinel',
    );
  });

  it('is not stuck while the sentinel still abuts the toolbar', async () => {
    emitEntry(200, 0);
    await page.waitForChanges();

    expect(page.rootInstance.isToolbarStuck).toBe(false);
    expect(isStuck()).toBe(false);
  });

  it('is not stuck when the component sits below the fold', async () => {
    emitEntry(2000, 0);
    await page.waitForChanges();

    expect(page.rootInstance.isToolbarStuck).toBe(false);
    expect(isStuck()).toBe(false);
  });

  it('is stuck once the toolbar detaches from the sentinel', async () => {
    emitEntry(-40, 40);
    await page.waitForChanges();

    expect(page.rootInstance.isToolbarStuck).toBe(true);
    expect(isStuck()).toBe(true);
  });

  it('is stuck when pinned inside a scroll container below the viewport top', async () => {
    // Positive viewport offset: a viewport-relative check would miss this.
    emitEntry(300, 60);
    await page.waitForChanges();

    expect(page.rootInstance.isToolbarStuck).toBe(true);
    expect(isStuck()).toBe(true);
  });

  it('releases the stuck state when the gap closes again', async () => {
    emitEntry(-40, 40);
    await page.waitForChanges();
    expect(page.rootInstance.isToolbarStuck).toBe(true);

    emitEntry(200, 0);
    await page.waitForChanges();

    expect(page.rootInstance.isToolbarStuck).toBe(false);
  });

  it('ignores a sub-pixel gap', async () => {
    emitEntry(100, 0.25);
    await page.waitForChanges();

    expect(page.rootInstance.isToolbarStuck).toBe(false);
  });

  it('recreates the observer with a new rootMargin when stickyOffset changes', async () => {
    expect(observers[0].options.rootMargin).toBe('-1px 0px 0px 0px');

    page.root.stickyOffset = 64;
    await page.waitForChanges();

    expect(observers).toHaveLength(2);
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(observers[1].options.rootMargin).toBe('-65px 0px 0px 0px');
  });

  it('disconnects on detach and observes again on reattach', async () => {
    const host = page.root;
    host.remove();
    await page.waitForChanges();

    expect(observers[0].disconnect).toHaveBeenCalled();

    page.body.appendChild(host);
    await page.waitForChanges();

    const latest = observers[observers.length - 1];
    expect(observers.length).toBeGreaterThan(1);
    expect(latest.observe).toHaveBeenCalledTimes(1);
  });
});
