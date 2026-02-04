import type { Page } from 'puppeteer';
import { ApiError, RateLimitError, TokenExpiredError } from '../errors';
import { ApiHeaders } from '../types';

/**
 * HTTP client that executes requests through Puppeteer page context
 */
export class HttpClient {
  constructor(
    private page: Page,
    private baseUrl: string = 'https://moovitapp.com/api'
  ) {}

  /**
   * Execute a GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    headers?: ApiHeaders
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    return this.executeRequest<T>('GET', url, headers);
  }

  /**
   * Execute a POST request
   */
  async post<T>(
    endpoint: string,
    body: unknown,
    headers?: ApiHeaders
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    return this.executeRequest<T>('POST', url, headers, body);
  }

  /**
   * Execute a POST request returning raw bytes (for protobuf)
   */
  async postRaw(
    endpoint: string,
    body: unknown,
    headers?: ApiHeaders
  ): Promise<Uint8Array> {
    const url = this.buildUrl(endpoint);

    const result = await this.page.evaluate(
      async (fetchUrl, fetchHeaders, fetchBody) => {
        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: fetchHeaders as HeadersInit,
          body: JSON.stringify(fetchBody),
          credentials: 'include',
        });

        if (!response.ok) {
          return {
            error: true,
            status: response.status,
            statusText: response.statusText,
          };
        }

        const buffer = await response.arrayBuffer();
        return {
          error: false,
          data: Array.from(new Uint8Array(buffer)),
        };
      },
      url,
      headers || {},
      body
    );

    if (result.error) {
      this.handleErrorResponse(result.status, endpoint);
    }

    return new Uint8Array(result.data as number[]);
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    headers?: ApiHeaders,
    body?: unknown
  ): Promise<T> {
    const result = await this.page.evaluate(
      async (fetchUrl, fetchMethod, fetchHeaders, fetchBody) => {
        const options: RequestInit = {
          method: fetchMethod,
          headers: fetchHeaders as HeadersInit,
          credentials: 'include',
        };

        if (fetchBody) {
          options.body = JSON.stringify(fetchBody);
          (options.headers as Record<string, string>)['content-type'] = 'application/json';
        }

        const response = await fetch(fetchUrl, options);

        if (!response.ok) {
          return {
            error: true,
            status: response.status,
            statusText: response.statusText,
          };
        }

        const data = await response.json();
        return { error: false, data };
      },
      url,
      method,
      headers || {},
      body
    );

    if (result.error) {
      this.handleErrorResponse(result.status, url);
    }

    return result.data as T;
  }

  private handleErrorResponse(status: number, endpoint: string): never {
    if (status === 401) {
      throw new TokenExpiredError();
    }
    if (status === 429) {
      throw new RateLimitError(endpoint);
    }
    throw new ApiError(status, endpoint);
  }
}
