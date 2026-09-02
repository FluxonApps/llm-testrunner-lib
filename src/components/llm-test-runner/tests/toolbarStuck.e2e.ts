import { newE2EPage } from '@stencil/core/testing';

const STUCK_CLASS = 'test-cases-toolbar--stuck';

async function isStuck(page: Awaited<ReturnType<typeof newE2EPage>>) {
  return page.evaluate((cls: string) => {
    const toolbar = document
      .querySelector('llm-test-runner')
      .shadowRoot.querySelector('.test-cases-toolbar');
    return toolbar.classList.contains(cls);
  }, STUCK_CLASS);
}

// IntersectionObserver delivers asynchronously, after layout.
async function settle(page: Awaited<ReturnType<typeof newE2EPage>>) {
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.waitForChanges();
}

describe('toolbar stuck state in a real browser', () => {
  it('stays unstuck while the component is below the fold', async () => {
    const page = await newE2EPage({
      html: `
        <div style="height: 1500px">above</div>
        <llm-test-runner></llm-test-runner>
        <div style="height: 2000px">below</div>
      `,
    });
    await settle(page);

    expect(await isStuck(page)).toBe(false);
  });

  it('sticks when the page jumps straight into pin range', async () => {
    const page = await newE2EPage({
      html: `
        <div style="height: 1500px">above</div>
        <llm-test-runner></llm-test-runner>
        <div style="height: 2000px">below</div>
      `,
    });
    await settle(page);

    await page.evaluate(() => {
      const host = document.querySelector('llm-test-runner');
      window.scrollTo(0, host.getBoundingClientRect().top + window.scrollY + 50);
    });
    await settle(page);

    expect(await isStuck(page)).toBe(true);
  });

  it('sticks when pinned inside a scroll container below the viewport top', async () => {
    const page = await newE2EPage({
      html: `
        <div style="height: 300px">above the panel</div>
        <div id="panel" style="height: 400px; overflow-y: auto">
          <llm-test-runner></llm-test-runner>
          <div style="height: 2000px">panel filler</div>
        </div>
      `,
    });
    await settle(page);

    expect(await isStuck(page)).toBe(false);

    await page.evaluate(() => {
      document.querySelector('#panel').scrollTop = 500;
    });
    await settle(page);

    expect(await isStuck(page)).toBe(true);

    await page.evaluate(() => {
      document.querySelector('#panel').scrollTop = 0;
    });
    await settle(page);

    expect(await isStuck(page)).toBe(false);
  });

  it('catches up within a frame or two while creeping across the pin point', async () => {
    const page = await newE2EPage({
      html: `
        <div style="height: 600px">above</div>
        <llm-test-runner></llm-test-runner>
        <div style="height: 2000px">below</div>
      `,
    });
    await settle(page);

    const longestLagFrames = await page.evaluate(async () => {
      const host = document.querySelector('llm-test-runner');
      const toolbar = host.shadowRoot.querySelector('.test-cases-toolbar');
      const sentinel = host.shadowRoot.querySelector(
        '.test-cases-toolbar-sentinel',
      );
      const raf = () => new Promise<void>(r => requestAnimationFrame(() => r()));
      const target = toolbar.getBoundingClientRect().top + window.scrollY;
      let run = 0;
      let longest = 0;

      for (let y = target - 2; y <= target + 6; y += 0.3) {
        window.scrollTo(0, y);
        await raf();
        // Pinned means the toolbar has left the sentinel behind.
        const pinned =
          toolbar.getBoundingClientRect().top >
          sentinel.getBoundingClientRect().bottom + 0.01;
        const stuck = toolbar.classList.contains('test-cases-toolbar--stuck');
        run = pinned && !stuck ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
      return longest;
    });

    // The bug this replaces latched transparent for the rest of the scroll.
    expect(longestLagFrames).toBeLessThanOrEqual(2);
  });

  it('sticks on a slow one-pixel-per-frame scroll', async () => {
    const page = await newE2EPage({
      html: `
        <div style="height: 600px">above</div>
        <llm-test-runner></llm-test-runner>
        <div style="height: 2000px">below</div>
      `,
    });
    await settle(page);

    const pinTarget = await page.evaluate(() => {
      const host = document.querySelector('llm-test-runner');
      const sentinel = host.shadowRoot.querySelector(
        '.test-cases-toolbar-sentinel',
      );
      return sentinel.getBoundingClientRect().top + window.scrollY;
    });

    await page.evaluate(async (target: number) => {
      const step = () =>
        new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      for (let y = target - 5; y <= target + 5; y++) {
        window.scrollTo(0, y);
        await step();
      }
    }, pinTarget);
    await settle(page);

    expect(await isStuck(page)).toBe(true);
  });
});
