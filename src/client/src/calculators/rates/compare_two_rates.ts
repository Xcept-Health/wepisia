// src/client/src/calculators/rates/compare_two_rates.ts
import jStat from 'jstat'

export interface CI { lower: number; upper: number }

export interface TwoRatesResults {
  rate1: number; rate2: number; overallRate: number
  rateDiff: number; diffLower: number; diffUpper: number
  rr: number
  zScore: number; p1z: number; p2z: number
  p1fisher: number; p2fisher: number
  p1midp: number; p2midp: number
  rrNorm: CI; rrByar: CI
  efe: number; efp: number
  lowerRate1: number; upperRate1: number
  lowerRate2: number; upperRate2: number
}

export function getZ(conf: number): number {
  return conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576
}

function byarLow(count: number, z: number): number {
  if (count === 0) return 0
  return count * Math.pow(1 - 1 / (9 * count) - z / (3 * Math.sqrt(count)), 3)
}

function byarHigh(count: number, z: number): number {
  return (count + 1) * Math.pow(1 - 1 / (9 * (count + 1)) + z / (3 * Math.sqrt(count + 1)), 3)
}

export function computeRateCI(count: number, personTime: number, z: number): CI {
  return {
    lower: byarLow(count, z) / personTime,
    upper: byarHigh(count, z) / personTime,
  }
}

export function computeRRNormCI(a: number, b: number, rr: number, z: number): CI {
  if (a === 0 || b === 0) return { lower: 0, upper: Infinity }
  const se = Math.sqrt(1 / a + 1 / b)
  return {
    lower: Math.exp(Math.log(rr) - z * se),
    upper: Math.exp(Math.log(rr) + z * se),
  }
}

export function computeZScore(a: number, b: number, N1: number, N2: number): number {
  const m = a + b
  const pNull = N1 / (N1 + N2)
  const expected = m * pNull
  const variance = m * pNull * (1 - pNull)
  return (a - expected) / Math.sqrt(variance)
}

export function computeAttributableFractions(
  rr: number, rrLower: number, rrUpper: number, f: number
): { efe: number; efp: number; efeLower: number; efeUpper: number; efpLower: number; efpUpper: number } {
  if (rr > 1) {
    return {
      efe: (rr - 1) / rr,
      efeLower: 1 - 1 / rrLower,
      efeUpper: 1 - 1 / rrUpper,
      efp: f * (rr - 1) / (f * (rr - 1) + 1),
      efpLower: f * (rrLower - 1) / (f * (rrLower - 1) + 1),
      efpUpper: f * (rrUpper - 1) / (f * (rrUpper - 1) + 1),
    }
  }
  return {
    efe: 1 - rr,
    efeLower: 1 - rrUpper,
    efeUpper: 1 - rrLower,
    efp: f * (1 - rr),
    efpLower: f * (1 - rrUpper),
    efpUpper: f * (1 - rrLower),
  }
}

export function computeTwoRates(
  a: number, N1: number, b: number, N2: number, conf: number
): TwoRatesResults | null {
  if (N1 <= 0 || N2 <= 0) return null
  if (a === 0 && b === 0) return null

  const scale = 100
  const z = getZ(conf)
  const alpha = (100 - conf) / 100

  const rate1 = (a / N1) * scale
  const rate2 = (b / N2) * scale
  const overallRate = ((a + b) / (N1 + N2)) * scale
  const rateDiff = rate1 - rate2

  const seDiff = Math.sqrt(a / (N1 * N1) + b / (N2 * N2)) * scale
  const rr = (a / N1) / (b / N2)

  const zScore = computeZScore(a, b, N1, N2)
  const absZ = Math.abs(zScore)
  const p1z = zScore < 0
    ? jStat.normal.cdf(zScore, 0, 1)
    : 1 - jStat.normal.cdf(absZ, 0, 1)
  const p2z = 2 * p1z

  const m = a + b
  const pNull = N1 / (N1 + N2)
  const expected = m * pNull
  const cdfA1 = jStat.binomial.cdf(a - 1, m, pNull)
  const pdfA  = jStat.binomial.pdf(a, m, pNull)
  const isUpper = a > expected
  const p1fisher = isUpper ? 1 - cdfA1 : cdfA1 + pdfA
  const p1midp   = isUpper ? 1 - cdfA1 - 0.5 * pdfA : cdfA1 + 0.5 * pdfA
  const p2fisher = 2 * Math.min(p1fisher, 1 - p1fisher)
  const p2midp   = 2 * Math.min(p1midp, 1 - p1midp)

  const rrNorm = computeRRNormCI(a, b, rr, z)
  const rrByar = computeRRNormCI(a, b, rr, z) // same formula in OpenEpi
  const f = N1 / (N1 + N2)
  const { efe, efp } = computeAttributableFractions(rr, rrByar.lower, rrByar.upper, f)

  const r1ci = computeRateCI(a, N1, z)
  const r2ci = computeRateCI(b, N2, z)

  return {
    rate1, rate2, overallRate, rateDiff,
    diffLower: rateDiff - z * seDiff,
    diffUpper: rateDiff + z * seDiff,
    rr, zScore, p1z, p2z, p1fisher, p2fisher, p1midp, p2midp,
    rrNorm, rrByar,
    efe, efp,
    lowerRate1: r1ci.lower * scale,
    upperRate1: r1ci.upper * scale,
    lowerRate2: r2ci.lower * scale,
    upperRate2: r2ci.upper * scale,
  }
}