// src/client/src/calculators/proportions/proportions_sample.ts
import jStat from 'jstat'

export interface SampleSizeResult {
  confidenceLevel: number
  sampleSize: number
}

export function zForConf(conf: number): number {
  const alpha = 1 - conf / 100
  return jStat.normal.inv(1 - alpha / 2, 0, 1)
}

export function computeSampleSize(
  N: number, p: number, d: number, deff: number, conf: number
): number {
  const pFrac = Math.min(100, Math.max(0, p)) / 100
  const dFrac = Math.min(100, Math.max(0, d)) / 100
  if (pFrac === 0 || pFrac === 1) return 0

  const z = zForConf(conf)
  const numerator = deff * N * pFrac * (1 - pFrac)
  const denominator = (dFrac * dFrac) / (z * z) * (N - 1) + pFrac * (1 - pFrac)
  if (denominator === 0) return N

  return Math.ceil(Math.min(numerator / denominator, N))
}

export function computeAllSampleSizes(
  N: number, p: number, d: number, deff: number
): SampleSizeResult[] {
  return [80, 90, 95, 97, 99, 99.9, 99.99].map(conf => ({
    confidenceLevel: conf,
    sampleSize: computeSampleSize(N, p, d, deff, conf),
  }))
}