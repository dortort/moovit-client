/**
 * Polling options
 */
export interface PollingOptions {
  /** Maximum number of polling attempts */
  maxAttempts?: number;
  /** Initial delay between polls in ms */
  initialDelay?: number;
  /** Maximum delay between polls in ms */
  maxDelay?: number;
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean;
}

const DEFAULT_OPTIONS: Required<PollingOptions> = {
  maxAttempts: 30,
  initialDelay: 500,
  maxDelay: 5000,
  exponentialBackoff: false,
};

/**
 * Poll until a condition is met
 */
export async function poll<T>(
  fn: () => Promise<T>,
  isComplete: (result: T) => boolean,
  options: PollingOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let attempts = 0;
  let delay = opts.initialDelay;

  while (attempts < opts.maxAttempts) {
    const result = await fn();

    if (isComplete(result)) {
      return result;
    }

    attempts++;
    await sleep(delay);

    if (opts.exponentialBackoff) {
      delay = Math.min(delay * 1.5, opts.maxDelay);
    }
  }

  // Return last result even if not complete
  return fn();
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  let delay = baseDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await sleep(delay);
        delay *= 2;
      }
    }
  }

  throw lastError;
}
