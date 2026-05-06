// src/client/src/calculators/case_control/unmatched_case.ts
import jStat from 'jstat'

export function zAlpha(alpha: number): number {
  return jStat.normal.inv(1 - alpha / 2, 0, 1)
}

export function zBeta(power: number): number {
  return jStat.normal.inv(power, 0, 1)
}

export function computeP1(p0: number, or: number): number {
  if (or === 1) return p0
  return (or * p0) / (1 + p0 * (or - 1))
}

export function computeOR(p0: number, p1: number): number {
  if (p0 === 0 || p0 === 1 || p1 === 0 || p1 === 1) return 1
  return (p1 / (1 - p1)) / (p0 / (1 - p0))
}

export interface SampleSizeResult {
  method: 'Kelsey' | 'Fleiss' | 'FleissCC'
  cases: number
  controls: number
  total: number
}

export function kelseySampleSize(
  alpha: number, power: number, ratio: number, p0: number, p1: number
): { cases: number; controls: number } {
  const za = zAlpha(alpha), zb = zBeta(power)
  const p_bar = (p1 + ratio * p0) / (ratio + 1)
  const n = ((ratio + 1) / ratio) * p_bar * (1 - p_bar) * Math.pow(za + zb, 2) / Math.pow(p1 - p0, 2)
  const cases = Math.ceil(n)
  return { cases, controls: Math.ceil(ratio * cases) }
}

export function fleissSampleSizeFloat(
  alpha: number, power: number, ratio: number, p0: number, p1: number
): { casesFloat: number; cases: number; controls: number } {
  const za = zAlpha(alpha), zb = zBeta(power)
  const p_bar = (p1 + ratio * p0) / (ratio + 1)
  const t1 = za * Math.sqrt((ratio + 1) * p_bar * (1 - p_bar))
  const t2 = zb * Math.sqrt(ratio * p0 * (1 - p0) + p1 * (1 - p1))
  const casesFloat = Math.pow(t1 + t2, 2) / (ratio * Math.pow(p1 - p0, 2))
  const cases = Math.ceil(casesFloat)
  return { casesFloat, cases, controls: Math.ceil(ratio * cases) }
}

export function fleissCCSampleSize(
  alpha: number, power: number, ratio: number, p0: number, p1: number
): { cases: number; controls: number } {
  const { casesFloat } = fleissSampleSizeFloat(alpha, power, ratio, p0, p1)
  const delta = Math.abs(p1 - p0)
  if (casesFloat <= 0 || delta === 0) return fleissSampleSizeFloat(alpha, power, ratio, p0, p1)
  const correction = (casesFloat / 4) * Math.pow(1 + Math.sqrt(1 + (2 * (ratio + 1)) / (casesFloat * ratio * delta)), 2)
  const cases = Math.ceil(correction)
  return { cases, controls: Math.ceil(ratio * cases) }
}

export function computeAllSampleSizes(
  alpha: number, power: number, ratio: number, p0: number, p1: number
): SampleSizeResult[] {
  const k = kelseySampleSize(alpha, power, ratio, p0, p1)
  const f = fleissSampleSizeFloat(alpha, power, ratio, p0, p1)
  const fcc = fleissCCSampleSize(alpha, power, ratio, p0, p1)
  return [
    { method: 'Kelsey',   cases: k.cases,   controls: k.controls,   total: k.cases + k.controls },
    { method: 'Fleiss',   cases: f.cases,   controls: f.controls,   total: f.cases + f.controls },
    { method: 'FleissCC', cases: fcc.cases, controls: fcc.controls, total: fcc.cases + fcc.controls },
  ]
}