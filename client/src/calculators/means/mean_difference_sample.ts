// src/client/src/calculators/means/mean_difference_sample.ts
import jStat from 'jstat'

export interface SampleSizeResult {
  n1: number; n2: number; total: number
  difference: number; pooledSD: number
}

export function zAlpha(confidence: number): number {
  return jStat.normal.inv(1 - (1 - confidence / 100) / 2, 0, 1)
}

export function zBeta(power: number): number {
  return jStat.normal.inv(power / 100, 0, 1)
}

export function computeSampleSizes(
  mean1: number, mean2: number,
  sd1: number, sd2: number,
  confidence: number, power: number, ratio: number
): SampleSizeResult | null {
  const delta = Math.abs(mean1 - mean2)
  if (delta === 0) return null
  const za = zAlpha(confidence), zb = zBeta(power)
  const n1_float = Math.pow(za + zb, 2) * (sd1**2 + sd2**2 / ratio) / delta**2
  const n1 = Math.ceil(n1_float)
  const n2 = Math.ceil(ratio * n1)
  const pSD = Math.sqrt(((n1-1)*sd1**2 + (n2-1)*sd2**2) / (n1+n2-2))
  return { n1, n2, total: n1+n2, difference: delta, pooledSD: pSD }
}