// src/client/src/calculators/rates/one_rate.ts
import jStat from 'jstat'

export interface RateCI { lower: number; upper: number }

export interface OneRateResults {
  rate: number
  midp: RateCI
  fisher: RateCI
  normal: RateCI
  byar: RateCI
  rothman: RateCI
}

export function getZ(conf: number): number {
  return conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576
}

export function computeMidPCI(a: number, N: number, alpha: number): RateCI {
  if (a === 0) {
    let lo = 0, hi = 1
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2
      if (jStat.poisson.cdf(0, mid * N) >= 1 - alpha / 2) hi = mid; else lo = mid
    }
    return { lower: 0, upper: (lo + hi) / 2 }
  }
  let lo = 0, hi = a / N
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const cum = jStat.poisson.cdf(a - 1, mid * N) + 0.5 * jStat.poisson.pdf(a, mid * N)
    if (cum < 1 - alpha / 2) hi = mid; else lo = mid
  }
  const lower = (lo + hi) / 2

  lo = a / N; hi = Math.max((a + 10) / N, a / N * 2)
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const cum = jStat.poisson.cdf(a, mid * N) - 0.5 * jStat.poisson.pdf(a, mid * N)
    if (cum < alpha / 2) hi = mid; else lo = mid
  }
  return { lower, upper: (lo + hi) / 2 }
}

export function computeFisherCI(a: number, N: number, alpha: number): RateCI {
  if (a === 0) return {
    lower: 0,
    upper: jStat.chisquare.inv(1 - alpha, 2) / (2 * N),
  }
  return {
    lower: jStat.chisquare.inv(alpha / 2, 2 * a) / (2 * N),
    upper: jStat.chisquare.inv(1 - alpha / 2, 2 * (a + 1)) / (2 * N),
  }
}

export function computeNormalCI(a: number, N: number, z: number): RateCI {
  const rate = a / N
  if (a === 0) return { lower: 0, upper: (z * z) / (2 * N) }
  const se = Math.sqrt(a) / N
  return { lower: Math.max(0, rate - z * se), upper: rate + z * se }
}

export function computeByarCI(a: number, N: number, z: number): RateCI {
  if (a === 0) return { lower: 0, upper: computeFisherCI(0, N, 2 * (1 - (z === 1.96 ? 0.975 : z === 1.645 ? 0.95 : 0.995))).upper }
  const tL = 1 - 1 / (9 * a) - z / (3 * Math.sqrt(a))
  const tU = 1 - 1 / (9 * (a + 1)) + z / (3 * Math.sqrt(a + 1))
  return {
    lower: Math.max(0, Math.pow(tL, 3) * (a / N)),
    upper: Math.pow(tU, 3) * ((a + 1) / N),
  }
}

export function computeRothmanCI(a: number, N: number, z: number): RateCI {
  if (a === 0) return computeFisherCI(0, N, 2 * (1 - (z === 1.96 ? 0.975 : z === 1.645 ? 0.95 : 0.995)))
  const rate = a / N
  const seLog = Math.sqrt(1 / a)
  return {
    lower: Math.exp(Math.log(rate) - z * seLog),
    upper: Math.exp(Math.log(rate) + z * seLog),
  }
}

export function computeOneRate(a: number, N: number, conf: number): OneRateResults | null {
  if (isNaN(a) || isNaN(N) || a < 0 || N <= 0) return null
  const alpha = (100 - conf) / 100
  const z = getZ(conf)
  return {
    rate: a / N,
    midp:    computeMidPCI(a, N, alpha),
    fisher:  computeFisherCI(a, N, alpha),
    normal:  computeNormalCI(a, N, z),
    byar:    computeByarCI(a, N, z),
    rothman: computeRothmanCI(a, N, z),
  }
}