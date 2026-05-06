// src/client/src/calculators/proportions/proportions.ts
import jStat from 'jstat'

export interface ConfidenceInterval {
  lower: number
  upper: number
}

export interface ProportionResults {
  proportion: number
  standardError: number
  fpc: number
  wilsonCI: ConfidenceInterval
  exactCI: ConfidenceInterval
  midPCI: ConfidenceInterval
  normalCI: ConfidenceInterval
  agrestiCoullCI: ConfidenceInterval
  fleissCI: ConfidenceInterval
  npq: number
  zValue: number
  pValue: number
}

export function getZ(conf: number): number {
  return conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576
}

export function computeFPC(n: number, N: number | null): number {
  if (!N || N <= n) return 1
  return Math.sqrt((N - n) / (N - 1))
}

export function computeWilsonCI(
  p: number, n: number, z: number, fpc: number
): ConfidenceInterval {
  const z2 = z * z
  const center = (p + z2 / (2 * n)) / (1 + z2 / n)
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n) * fpc
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  }
}

export function computeExactCI(
  num: number, den: number, alpha: number
): ConfidenceInterval {
  if (num === 0) return { lower: 0, upper: 1 - Math.pow(alpha / 2, 1 / den) }
  if (num === den) return { lower: Math.pow(alpha / 2, 1 / den), upper: 1 }
  return {
    lower: jStat.beta.inv(alpha / 2, num, den - num + 1),
    upper: jStat.beta.inv(1 - alpha / 2, num + 1, den - num),
  }
}

export function computeAgrestiCoullCI(
  num: number, den: number, z: number, fpc: number
): ConfidenceInterval {
  const z2 = z * z
  const nTilde = den + z2
  const pTilde = (num + z2 / 2) / nTilde
  const se = Math.sqrt((pTilde * (1 - pTilde)) / nTilde) * fpc
  return {
    lower: Math.max(0, pTilde - z * se),
    upper: Math.min(1, pTilde + z * se),
  }
}

export function computeFleissCI(
  num: number, den: number, z: number
): ConfidenceInterval {
  const z2 = z * z
  const termL = z * Math.sqrt(z2 - 2 - 1 / den + (4 * num * (den - num + 1)) / den)
  const termU = z * Math.sqrt(z2 + 2 - 1 / den + (4 * (num + 1) * (den - num - 1)) / den)
  return {
    lower: Math.max(0, Math.min(1, (2 * num + z2 - 1 - termL) / (2 * (den + z2)))),
    upper: Math.max(0, Math.min(1, (2 * num + z2 + 1 + termU) / (2 * (den + z2)))),
  }
}

function binomialPdf(k: number, n: number, p: number): number {
  return jStat.binomial.pdf(k, n, p)
}

function binomialCdf(k: number, n: number, p: number): number {
  let sum = 0
  for (let i = 0; i <= k; i++) sum += jStat.binomial.pdf(i, n, p)
  return sum
}

export function computeMidPCI(
  num: number, den: number, alpha: number
): ConfidenceInterval {
  if (num === 0 || num === den) return computeExactCI(num, den, alpha)

  let loL = 0, hiL = 1
  for (let i = 0; i < 100; i++) {
    const mid = (loL + hiL) / 2
    const val = (1 - binomialCdf(num, den, mid)) + 0.5 * binomialPdf(num, den, mid)
    if (val < alpha / 2) loL = mid; else hiL = mid
  }

  let loU = 0, hiU = 1
  for (let i = 0; i < 100; i++) {
    const mid = (loU + hiU) / 2
    const val = binomialCdf(num - 1, den, mid) + 0.5 * binomialPdf(num, den, mid)
    if (val < alpha / 2) hiU = mid; else loU = mid
  }

  return { lower: (loL + hiL) / 2, upper: (loU + hiU) / 2 }
}

export function computeProportion(
  num: number, den: number, conf: number,
  population: number | null, compareTo: number, multiplier: number
): ProportionResults {
  const p = num / den
  const z = getZ(conf)
  const alpha = (100 - conf) / 100
  const fpc = computeFPC(den, population)
  const se = Math.sqrt((p * (1 - p)) / den) * fpc

  const wilsonCI    = computeWilsonCI(p, den, z, fpc)
  const exactCI     = computeExactCI(num, den, alpha)
  const midPCI      = computeMidPCI(num, den, alpha)
  const normalCI    = { lower: Math.max(0, p - z * se), upper: Math.min(1, p + z * se) }
  const agrestiCI   = computeAgrestiCoullCI(num, den, z, fpc)
  const fleissCI    = computeFleissCI(num, den, z)

  const p0 = compareTo / multiplier
  const zValue = (p - p0) / Math.sqrt((p0 * (1 - p0)) / den) * fpc
  const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(zValue), 0, 1))

  return {
    proportion: p, standardError: se, fpc,
    wilsonCI, exactCI, midPCI,
    normalCI, agrestiCoullCI: agrestiCI, fleissCI,
    npq: den * p * (1 - p), zValue, pValue,
  }
}