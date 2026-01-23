const NANO_FACTOR = 1_000_000_000n;
const TOKENS_PER_MILLION = 1_000_000n;

export function numberToNano(value: number | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  if (!Number.isFinite(value)) return 0n;
  return BigInt(Math.round(value * 1_000_000_000));
}

export function nanoToNumber(valueNano: bigint): number {
  const sign = valueNano < 0n ? '-' : '';
  const abs = valueNano < 0n ? -valueNano : valueNano;
  const whole = abs / NANO_FACTOR;
  const frac = abs % NANO_FACTOR;
  const fracStr = frac.toString().padStart(9, '0');
  return Number.parseFloat(`${sign}${whole.toString()}.${fracStr}`);
}

export function mulDivRound(
  numerator: bigint,
  multiplier: bigint,
  divisor: bigint,
): bigint {
  if (divisor === 0n) {
    throw new Error('mulDivRound: divisor must not be 0');
  }
  if (numerator === 0n || multiplier === 0n) return 0n;

  const sign = (numerator < 0n) !== (multiplier < 0n) ? -1n : 1n;
  const absNumerator = numerator < 0n ? -numerator : numerator;
  const absMultiplier = multiplier < 0n ? -multiplier : multiplier;
  const absDivisor = divisor < 0n ? -divisor : divisor;

  const product = absNumerator * absMultiplier;
  const rounded = (product + absDivisor / 2n) / absDivisor;
  return sign < 0n ? -rounded : rounded;
}

export function applyMinimumCharge(
  costNano: bigint,
  minimumChargeNano: bigint | null | undefined,
): bigint {
  if (minimumChargeNano === null || minimumChargeNano === undefined) {
    return costNano;
  }
  if (minimumChargeNano <= 0n) {
    return costNano;
  }
  return costNano < minimumChargeNano ? minimumChargeNano : costNano;
}

export function multiplyNanoAmounts(leftNano: bigint, rightNano: bigint): bigint {
  return mulDivRound(leftNano, rightNano, NANO_FACTOR);
}

export function calculateTokenCostNano(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillionTokens: number,
  outputPricePerMillionTokens: number,
): bigint {
  const safeInput = Math.max(0, inputTokens);
  const safeOutput = Math.max(0, outputTokens);
  const inputPriceNano = numberToNano(inputPricePerMillionTokens);
  const outputPriceNano = numberToNano(outputPricePerMillionTokens);

  const inputCostNano = mulDivRound(
    BigInt(safeInput),
    inputPriceNano,
    TOKENS_PER_MILLION,
  );
  const outputCostNano = mulDivRound(
    BigInt(safeOutput),
    outputPriceNano,
    TOKENS_PER_MILLION,
  );
  return inputCostNano + outputCostNano;
}

export { NANO_FACTOR, TOKENS_PER_MILLION };
