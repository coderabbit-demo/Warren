export async function withRetry<T>(work: () => Promise<T>, attempts = 3, baseDelayMs = 250, sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
