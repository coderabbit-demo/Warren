export class PayGridV2Error extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
  }

  get retryable(): boolean {
    return this.status >= 500 && this.status <= 599;
  }
}

export class PayGridV2ProtocolError extends Error {
  constructor(message: string) {
    super(message);
  }
}
