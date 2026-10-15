declare const centsBrand: unique symbol;
export type Cents = number & { readonly [centsBrand]: true };

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) throw new RangeError('Amount must be a safe integer');
  return value as Cents;
}

export function add(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subtract(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

export function isPositiveCents(value: Cents): boolean {
  return value > 0;
}

export function formatUsdCents(value: Cents): string {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  return `${sign}$${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

export function parseDecimalCents(value: string): Cents {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new RangeError('Invalid decimal amount');
  const whole = Number(match[2]);
  const fraction = Number((match[3] ?? '').padEnd(2, '0'));
  return cents((match[1] === '-' ? -1 : 1) * (whole * 100 + fraction));
}
