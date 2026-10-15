export async function withRetry<T>(work: () => Promise<T>, attempts = 3, baseDelayMs = 250, sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), random: () => number = Math.random): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        const delay = Math.floor(baseDelayMs * 2 ** attempt * (0.5 + random()));
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
