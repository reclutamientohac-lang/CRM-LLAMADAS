// Decimal arithmetic: discard digits towards zero, never round binary floats.
export function scaledInteger(value: string | number, digits: number): bigint {
  const text = String(value).trim();
  const match = text.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
  if (!match || digits < 0 || digits > 8) throw new Error('Importe decimal no válido.');
  const exponent = Number(match[4] || 0);
  if (Math.abs(exponent) > 100) throw new Error('Importe fuera de rango.');
  const whole = BigInt(match[2] + (match[3] || ''));
  const scale = digits + exponent - (match[3]?.length || 0);
  const integer = scale >= 0 ? whole * 10n ** BigInt(scale) : whole / 10n ** BigInt(-scale);
  return match[1] === '-' ? -integer : integer;
}
export function truncateDecimal(value: string | number, digits = 2): number {
  const integer = scaledInteger(value, digits);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER) || integer < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Importe fuera de rango.');
  return Number(integer) / 10 ** digits;
}
export function cents(value: number | string): number {
  const integer = scaledInteger(value, 2);
  if (integer > 1_000_000_000n || integer < -1_000_000_000n) throw new Error('Importe fuera de rango.');
  return Number(integer);
}
export function commission(amount: number, ratio: number): number {
  const amountCents = BigInt(cents(amount));
  const rateBasisPoints = scaledInteger(ratio, 4);
  if (amountCents < 0n || rateBasisPoints < 0n || rateBasisPoints > 10000n) throw new Error('Monto o porcentaje fuera de rango.');
  return Number(amountCents * rateBasisPoints / 10000n) / 100;
}
export function sumMoney(values: (number | null | undefined)[]): number {
  return Number(values.reduce<bigint>((total, value) => total + scaledInteger(value ?? 0, 2), 0n)) / 100;
}
export function financialFields(amount: number | null, ratio: number | null, state: string, paid = false) {
  const montoAprobadoCentavos = amount === null ? null : cents(amount);
  const porcentajeBonoPuntos = ratio === null ? null : Number(scaledInteger(ratio, 4));
  if ((montoAprobadoCentavos !== null && montoAprobadoCentavos < 0) || (porcentajeBonoPuntos !== null && (porcentajeBonoPuntos < 0 || porcentajeBonoPuntos > 10000))) throw new Error('Monto o porcentaje fuera de rango.');
  const bonoGeneradoCentavos = montoAprobadoCentavos === null || porcentajeBonoPuntos === null ? null : Number(BigInt(montoAprobadoCentavos) * BigInt(porcentajeBonoPuntos) / 10000n);
  const bonoPagableCentavos = state === 'Aprobada' && !paid ? bonoGeneradoCentavos || 0 : 0;
  return { montoAprobadoCentavos, porcentajeBonoPuntos, bonoGeneradoCentavos, bonoPagableCentavos,
    montoAprobado: montoAprobadoCentavos === null ? null : montoAprobadoCentavos / 100,
    porcentajeBono: porcentajeBonoPuntos === null ? null : porcentajeBonoPuntos / 10000,
    bonoGenerado: bonoGeneradoCentavos === null ? null : bonoGeneradoCentavos / 100, bonoPagable: bonoPagableCentavos / 100 };
}

export function percentageNumber(ratio: number): number { return Number(scaledInteger(ratio, 4)) / 100; }
