// src/client/src/calculators/means/mean_confidence_interval.ts

export interface MeanCIResult {
    se: number
    fpc: number
    variance: number
    df: number
    zLower: number; zUpper: number; zWidth: number
    tLower: number; tUpper: number; tWidth: number
  }
  
  export function computeFPC(n: number, N: number): number {
    if (!isFinite(N) || N <= n) return 1
    return Math.sqrt((N - n) / (N - 1))
  }
  
  export function computeStandardError(stddev: number, n: number, N = Infinity): number {
    return (stddev / Math.sqrt(n)) * computeFPC(n, N)
  }
  
  export function computeMeanCI(
    mean: number, stddev: number, n: number, N: number,
    zCritical: number, tCritical: number
  ): MeanCIResult {
    const fpc = computeFPC(n, N)
    const se = (stddev / Math.sqrt(n)) * fpc
    const variance = stddev ** 2
    const zM = zCritical * se
    const tM = tCritical * se
    return {
      se, fpc, variance, df: n - 1,
      zLower: mean - zM, zUpper: mean + zM, zWidth: 2 * zM,
      tLower: mean - tM, tUpper: mean + tM, tWidth: 2 * tM,
    }
  }