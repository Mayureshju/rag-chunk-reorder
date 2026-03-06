export class ValidationError extends Error {
  /** Optional context for logging/APM (e.g. step, chunkCount). */
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.context = context;
    Object.setPrototypeOf(this, ValidationError.prototype);
    if (typeof (Error as { captureStackTrace?: (err: Error, fn: Function) => void }).captureStackTrace === 'function') {
      (Error as { captureStackTrace: (err: Error, fn: Function) => void }).captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Thrown by reranker integrations when the remote API fails.
 * Use statusCode and retryable to decide whether to retry (e.g. do not retry 4xx).
 */
export class RerankerError extends Error {
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly bodySnippet?: string;

  constructor(
    message: string,
    options?: { statusCode?: number; retryable?: boolean; bodySnippet?: string },
  ) {
    super(message);
    this.name = 'RerankerError';
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? (options?.statusCode != null ? options.statusCode >= 500 : true);
    this.bodySnippet = options?.bodySnippet;
    Object.setPrototypeOf(this, RerankerError.prototype);
    if (typeof (Error as { captureStackTrace?: (err: Error, fn: Function) => void }).captureStackTrace === 'function') {
      (Error as { captureStackTrace: (err: Error, fn: Function) => void }).captureStackTrace(this, RerankerError);
    }
  }
}
