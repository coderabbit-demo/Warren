export class DomainError extends Error {
  constructor(message: string, readonly statusCode: number, readonly code: string) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) { super(`${resource} not found`, 404, 'not_found'); }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') { super(message, 401, 'unauthorized'); }
}

export class ConflictError extends DomainError {
  constructor(message: string) { super(message, 409, 'conflict'); }
}

export class RefundExceedsCaptureError extends DomainError {
  constructor(paymentId: string, amount: number, captured: number) {
    super(`Refund ${amount} exceeds captured amount ${captured} for payment ${paymentId}`, 422, 'refund_exceeds_capture');
  }
}
