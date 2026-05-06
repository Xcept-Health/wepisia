import { describe, it, expect } from 'vitest'
import {
  getZ, computeRateCI, computeRRNormCI, computeZScore,
  computeAttributableFractions, computeTwoRates,
} from './compare_two_rates'

// Référence OpenEpi PersonTime2 : a=50, N1=1000, b=30, N2=1200, conf=95%
const A = 50, N1 = 1000, B = 30, N2 = 1200, CONF = 95, Z = 1.96
const SCALE = 100
const RATE1 = (A / N1) * SCALE  // 5.0
const RATE2 = (B / N2) * SCALE  // 2.5
const RR = (A / N1) / (B / N2)  // 2.0

describe('getZ', () => {
  it('z(95) = 1.96', () => expect(getZ(95)).toBe(1.96))
  it('z(90) < z(95)', () => expect(getZ(90)).toBeLessThan(getZ(95)))
})

describe('computeRateCI (Byar)', () => {
  const ci = computeRateCI(A, N1, Z)

  it('lower < rate/scale < upper', () => {
    expect(ci.lower).toBeLessThan(A / N1)
    expect(ci.upper).toBeGreaterThan(A / N1)
  })
  it('lower = 0 pour count = 0', () => {
    expect(computeRateCI(0, N1, Z).lower).toBe(0)
  })
  it('n plus grand => IC plus étroit', () => {
    const ciSmall = computeRateCI(10, 100, Z)
    const ciBig   = computeRateCI(100, 1000, Z)
    const wS = (ciSmall.upper - ciSmall.lower) / (10 / 100)
    const wB = (ciBig.upper   - ciBig.lower)   / (100 / 1000)
    expect(wB).toBeLessThan(wS)
  })
})

describe('computeRRNormCI', () => {
  const ci = computeRRNormCI(A, B, RR, Z)

  it('lower < RR < upper', () => {
    expect(ci.lower).toBeLessThan(RR)
    expect(ci.upper).toBeGreaterThan(RR)
  })
  it('lower = 0 si b = 0', () => {
    expect(computeRRNormCI(A, 0, Infinity, Z).lower).toBe(0)
  })
  it('symétrique sur échelle log', () => {
    expect(Math.log(ci.upper) - Math.log(RR)).toBeCloseTo(Math.log(RR) - Math.log(ci.lower), 4)
  })
  it('IC plus large pour z plus grand', () => {
    const ci95 = computeRRNormCI(A, B, RR, 1.96)
    const ci99 = computeRRNormCI(A, B, RR, 2.576)
    expect(ci99.upper - ci99.lower).toBeGreaterThan(ci95.upper - ci95.lower)
  })
})

describe('computeZScore', () => {
  it('z > 0 car groupe 1 sur-représenté', () => {
    expect(computeZScore(A, B, N1, N2)).toBeGreaterThan(0)
  })
  it('z = 0 si proportion parfaitement attendue', () => {
    // a/(a+b) = N1/(N1+N2) => z = 0
    const a = 50, b = 50, n1 = 500, n2 = 500
    expect(computeZScore(a, b, n1, n2)).toBeCloseTo(0, 4)
  })
  it('z < 0 si groupe 1 sous-représenté', () => {
    expect(computeZScore(10, 90, N1, N2)).toBeLessThan(0)
  })
})

describe('computeAttributableFractions', () => {
  it('efe = (RR-1)/RR pour RR > 1', () => {
    const { efe } = computeAttributableFractions(2, 1.5, 2.5, 0.5)
    expect(efe).toBeCloseTo(0.5, 6)
  })
  it('efe = 1 - RR pour RR < 1', () => {
    const { efe } = computeAttributableFractions(0.5, 0.3, 0.7, 0.5)
    expect(efe).toBeCloseTo(0.5, 6)
  })
  it('efp >= 0', () => {
    const { efp } = computeAttributableFractions(RR, 1.5, 2.5, 0.5)
    expect(efp).toBeGreaterThanOrEqual(0)
  })
})

describe('computeTwoRates', () => {
  const r = computeTwoRates(A, N1, B, N2, CONF)!

  it('retourne non null', () => expect(r).not.toBeNull())
  it('rate1 = (a/N1)*100', () => expect(r.rate1).toBeCloseTo(RATE1, 6))
  it('rate2 = (b/N2)*100', () => expect(r.rate2).toBeCloseTo(RATE2, 6))
  it('rr = rate1/rate2', () => expect(r.rr).toBeCloseTo(RR, 6))
  it('rateDiff = rate1 - rate2', () => expect(r.rateDiff).toBeCloseTo(RATE1 - RATE2, 6))
  it('diffLower < rateDiff < diffUpper', () => {
    expect(r.diffLower).toBeLessThan(r.rateDiff)
    expect(r.diffUpper).toBeGreaterThan(r.rateDiff)
  })
  it('p2z = 2 * p1z', () => expect(r.p2z).toBeCloseTo(2 * r.p1z, 6))
  it('p2fisher dans [0, 1]', () => {
    expect(r.p2fisher).toBeGreaterThanOrEqual(0)
    expect(r.p2fisher).toBeLessThanOrEqual(1)
  })
  it('p2midp dans [0, 1]', () => {
    expect(r.p2midp).toBeGreaterThanOrEqual(0)
    expect(r.p2midp).toBeLessThanOrEqual(1)
  })
  it('IC RR contient RR', () => {
    expect(r.rrNorm.lower).toBeLessThan(RR)
    expect(r.rrNorm.upper).toBeGreaterThan(RR)
  })
  it('lowerRate1 < rate1/100 < upperRate1 (Byar, unscaled)', () => {
    expect(r.lowerRate1).toBeLessThan(r.rate1)
    expect(r.upperRate1).toBeGreaterThan(r.rate1)
  })
  it('retourne null si N1 = 0', () => expect(computeTwoRates(A, 0, B, N2, CONF)).toBeNull())
  it('retourne null si a = b = 0', () => expect(computeTwoRates(0, N1, 0, N2, CONF)).toBeNull())
  it('efe dans [0, 1] pour RR > 1', () => {
    expect(r.efe).toBeGreaterThanOrEqual(0)
    expect(r.efe).toBeLessThanOrEqual(1)
  })
  it('overallRate entre rate1 et rate2', () => {
    const minR = Math.min(RATE1, RATE2)
    const maxR = Math.max(RATE1, RATE2)
    expect(r.overallRate).toBeGreaterThanOrEqual(minR)
    expect(r.overallRate).toBeLessThanOrEqual(maxR)
  })
})