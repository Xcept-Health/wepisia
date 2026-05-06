// src/client/src/calculators/misc/median_percentile_ci.ts
import jStat from 'jstat'

export interface MedianCIResult {
  n: number
  percentile: number
  conf: number
  p: number
  expectedRank: number
  expectedRankPrecise: number
  se: number
  z: number
  lowerRank: number
  upperRank: number
  lowerPercentile: number
  upperPercentile: number
  hasJStat: boolean
}

export function getZValue(conf: number): number {
  try {
    if (typeof jStat !== 'undefined') {
      const alpha = 1 - conf / 100
      return jStat.normal.inv(1 - alpha / 2, 0, 1)
    }
  } catch (e) {
    console.warn('jStat not available, using fixed z-values', e)
  }
  
  return conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num === Infinity || num === -Infinity) return '∞'
  if (isNaN(num) || !isFinite(num)) return '-'
  return num.toFixed(decimals)
}

export function computeRankInterval(
  n: number,
  p: number,
  z: number
): {
  expectedRank: number
  se: number
  lowerRank: number
  upperRank: number
} {
  const expectedRank = (n + 1) * p
  const se = Math.sqrt(n * p * (1 - p))
  const lowerRank = Math.max(1, Math.floor(expectedRank - z * se))
  const upperRank = Math.min(n, Math.ceil(expectedRank + z * se))
  
  return {
    expectedRank: Math.round(n * p),
    se,
    lowerRank,
    upperRank
  }
}

export function convertRankToPercentile(rank: number, n: number): number {
    const clamped = Math.min(n, Math.max(1, rank))
    return (clamped / n) * 100
  }

export function calculateMedianCI(
  n: number,
  percentile: number,
  conf: number
): MedianCIResult | null {
  if (n < 2 || percentile < 0 || percentile > 100) {
    return null
  }

  const p = percentile / 100
  const z = getZValue(conf)
  const { expectedRank, se, lowerRank, upperRank } = computeRankInterval(n, p, z)
  
  return {
    n,
    percentile,
    conf,
    p,
    expectedRank,
    expectedRankPrecise: (n + 1) * p,
    se,
    z,
    lowerRank,
    upperRank,
    lowerPercentile: convertRankToPercentile(lowerRank, n),
    upperPercentile: convertRankToPercentile(upperRank, n),
    hasJStat: typeof jStat !== 'undefined'
  }
}