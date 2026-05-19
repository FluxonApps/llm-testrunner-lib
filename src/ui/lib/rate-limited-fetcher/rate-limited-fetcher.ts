export class RateLimitedFetcher {
  private queue: (() => void)[] = [];
  private delay: number; // delay in milliseconds
  private timer?: ReturnType<typeof setInterval>;

  constructor(delayMs: number) {
    this.delay = delayMs;
  }

  private startQueue() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const task = this.queue.shift();
      if (task) task();
      if (this.queue.length === 0) {
        this.stop();
      }
    }, this.delay);
  }

  public schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(() => {
        task().then(resolve).catch(reject);
      });
      this.startQueue();
    });
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public async runAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const promises = tasks.map(task => this.schedule(task));
    return Promise.all(promises);
  }
}
