import type {
  V2CaptureRequest,
  V2Charge,
  V2CreateChargeRequest,
  V2ErrorResponse,
  V2Refund,
  V2RefundRequest,
} from './types.js';
import { PayGridV2Error, PayGridV2ProtocolError } from './errors.js';

export interface PayGridV2ClientOptions {
  baseUrl: string;
  apiKey: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PayGridV2Client {
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: PayGridV2ClientOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.sleep = options.sleep ?? defaultSleep;
    if (this.maxAttempts < 1 || !Number.isInteger(this.maxAttempts)) {
      throw new RangeError('maxAttempts must be a positive integer');
    }
  }

  private async request<T>(
    path: string,
    body: object,
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.options.apiKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    };
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
    const url = new URL(path, this.options.baseUrl);

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        if (attempt >= this.maxAttempts) throw error;
        await this.sleep(100 * 2 ** (attempt - 1));
        continue;
      }

      if (response.ok) {
        try {
          return (await response.json()) as T;
        } catch {
          throw new PayGridV2ProtocolError(
            'PayGrid V2 returned malformed JSON',
          );
        }
      }

      let details: V2ErrorResponse | null = null;
      try {
        details = (await response.json()) as V2ErrorResponse;
      } catch {
        // A provider gateway may return an empty error page.
      }
      const failure = new PayGridV2Error(
        details?.error?.message ??
          `PayGrid V2 request failed: ${response.status}`,
        response.status,
        details?.error?.code ?? 'provider_error',
        details?.error?.request_id,
      );
      if (!failure.retryable || attempt >= this.maxAttempts) throw failure;
      await this.sleep(100 * 2 ** (attempt - 1));
    }
    throw new PayGridV2ProtocolError('PayGrid V2 did not return a response');
  }

  createCharge(
    body: V2CreateChargeRequest,
    idempotencyKey?: string,
  ): Promise<V2Charge> {
    return this.request('/v2/charges', body, idempotencyKey);
  }

  capture(
    reference: string,
    body: V2CaptureRequest,
    idempotencyKey?: string,
  ): Promise<V2Charge> {
    return this.request(
      `/v2/charges/${encodeURIComponent(reference)}/capture`,
      body,
      idempotencyKey,
    );
  }

  refund(
    reference: string,
    body: V2RefundRequest,
    idempotencyKey?: string,
  ): Promise<V2Refund> {
    return this.request(
      `/v2/charges/${encodeURIComponent(reference)}/refunds`,
      body,
      idempotencyKey,
    );
  }
}
