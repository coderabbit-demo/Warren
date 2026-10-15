import { shouldNotify, toEventType } from './eventMapper.js';
import { signPayload } from './signing.js';
import { withRetry } from './retry.js';

export interface PendingEvent {
  id: string;
  status: string;
  paymentId: string;
  merchantId: string;
  webhookUrl: string;
  signingSecret: string;
}

export interface EventStore {
  pending(): Promise<PendingEvent[]>;
  delivered(id: string): Promise<void>;
}

export class Dispatcher {
  constructor(
    private readonly store: EventStore,
    private readonly fetcher: typeof fetch = fetch,
    private readonly filter: (event: PendingEvent) => boolean = shouldNotify,
  ) {}

  async dispatchPending(): Promise<number> {
    let delivered = 0;
    for (const event of await this.store.pending()) {
      if (!this.filter(event)) continue;
      const payload = JSON.stringify({ id: event.id, type: toEventType(event.status), data: { paymentId: event.paymentId } });
      await withRetry(async () => {
        const response = await this.fetcher(event.webhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-warren-signature': signPayload(payload, event.signingSecret) },
          body: payload,
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`Delivery failed: ${response.status}`);
      });
      await this.store.delivered(event.id);
      delivered += 1;
    }
    return delivered;
  }
}
