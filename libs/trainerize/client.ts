import {
  TrainerizeCredentials,
  createBasicAuthHeader,
} from "./credentials";

const TRAINERIZE_API_BASE = "https://api.trainerize.com";

export interface TrainerizeClientConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs: number;
  /** Request timeout in ms (default: 30000) */
  timeoutMs: number;
}

export interface TrainerizeRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip retry logic for this request */
  skipRetry?: boolean;
}

export interface TrainerizeResponse<T> {
  data: T;
  fromCache?: boolean;
  stale?: boolean;
}

export class TrainerizeClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "TrainerizeClientError";
  }
}

const DEFAULT_CONFIG: TrainerizeClientConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 30000,
};

/**
 * Trainerize API client with retry/backoff, rate limit handling, and timeout support
 */
export class TrainerizeClient {
  private credentials: TrainerizeCredentials;
  private config: TrainerizeClientConfig;
  private authHeader: string;

  constructor(
    credentials: TrainerizeCredentials,
    config: Partial<TrainerizeClientConfig> = {}
  ) {
    this.credentials = credentials;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.authHeader = createBasicAuthHeader(credentials);
  }

  /**
   * Make a request to the Trainerize API with automatic retry/backoff
   */
  async request<T>(
    endpoint: string,
    options: TrainerizeRequestOptions = {}
  ): Promise<TrainerizeResponse<T>> {
    const { method = "GET", body, headers = {}, skipRetry = false } = options;

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${TRAINERIZE_API_BASE}${endpoint}`;

    const requestOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Basic ${this.authHeader}`,
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    if (skipRetry) {
      return this.executeRequest<T>(url, requestOptions);
    }

    return this.withRetry<TrainerizeResponse<T>>(() =>
      this.executeRequest<T>(url, requestOptions)
    );
  }

  /**
   * Execute a single request with timeout
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<TrainerizeResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = this.getRetryAfterSeconds(response);
        throw new TrainerizeClientError(
          `Rate limited. Retry after ${retryAfter} seconds`,
          429,
          true
        );
      }

      // Handle server errors (retryable)
      if (response.status >= 500) {
        throw new TrainerizeClientError(
          `Server error: ${response.status} ${response.statusText}`,
          response.status,
          true
        );
      }

      // Handle client errors (not retryable)
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new TrainerizeClientError(
          `API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status,
          false
        );
      }

      const data = await response.json();
      return { data: data as T };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new TrainerizeClientError(
          `Request timeout after ${this.config.timeoutMs}ms`,
          408,
          true
        );
      }

      // Handle network errors (retryable)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new TrainerizeClientError(
          `Network error: ${error.message}`,
          0,
          true
        );
      }

      throw error;
    }
  }

  /**
   * Execute a function with exponential backoff retry
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // Don't retry if max attempts reached or error is not retryable
      if (
        attempt >= this.config.maxRetries ||
        (error instanceof TrainerizeClientError && !error.retryable)
      ) {
        throw error;
      }

      // Calculate backoff delay with jitter
      const delay = this.calculateBackoff(attempt, error);
      console.log(
        `[TrainerizeClient] Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`
      );

      await this.sleep(delay);
      return this.withRetry(fn, attempt + 1);
    }
  }

  /**
   * Calculate backoff delay with exponential growth and jitter
   */
  private calculateBackoff(attempt: number, error?: unknown): number {
    // Check for Retry-After header from rate limit response
    if (
      error instanceof TrainerizeClientError &&
      error.statusCode === 429 &&
      error.message.includes("Retry after")
    ) {
      const match = error.message.match(/Retry after (\d+) seconds/);
      if (match) {
        const retryAfterMs = parseInt(match[1]) * 1000;
        return Math.min(retryAfterMs, this.config.maxDelayMs);
      }
    }

    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.config.baseDelayMs * Math.pow(2, attempt);

    // Add jitter (0-25% of delay)
    const jitter = exponentialDelay * Math.random() * 0.25;

    // Cap at max delay
    return Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
  }

  /**
   * Extract Retry-After header value in seconds
   */
  private getRetryAfterSeconds(response: Response): number {
    const retryAfter = response.headers.get("Retry-After");

    if (!retryAfter) {
      return 60; // Default to 60 seconds if not specified
    }

    // Check if it's a number (seconds)
    const seconds = parseInt(retryAfter);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // Check if it's a date
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
      return Math.max(0, Math.ceil((retryDate.getTime() - Date.now()) / 1000));
    }

    return 60;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the trainer ID from credentials
   */
  getTrainerId(): string {
    return this.credentials.trainerId;
  }
}

/**
 * Create a Trainerize client from credentials
 */
export function createTrainerizeClient(
  credentials: TrainerizeCredentials,
  config?: Partial<TrainerizeClientConfig>
): TrainerizeClient {
  return new TrainerizeClient(credentials, config);
}
