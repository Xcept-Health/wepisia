import { describe, it, expect } from 'vitest'
import { zAlpha, zBeta, computeSampleSizes } from './mean_difference_sample'

// Référence OpenEpi SSMean : mean1=132.86, mean2=127.44, sd1=15.34, sd2=18.23, conf=95%, power=80%, ratio=1
const M1=132.86, M2=127.44, S1=15.34, S2=18.23, CONF=95, POW=80, R=1

describe('zAlpha', () => {
  it('zAlpha(95) ≈ 1.96', () => {
    expect(zAlpha(95)).toBeCloseTo(1.96, 2)
  })
  it('zAlpha(99) > zAlpha(95)', () => {
    expect(zAlpha(99)).toBeGreaterThan(zAlpha(95))
  })
})

describe('zBeta', () => {
  it('zBeta(80) ≈ 0.842', () => {
    expect(zBeta(80)).toBeCloseTo(0.842, 2)
  })
  it('zBeta(90) > zBeta(80)', () => {
    expect(zBeta(90)).toBeGreaterThan(zBeta(80))
  })
})

describe('computeSampleSizes', () => {
  const r = computeSampleSizes(M1, M2, S1, S2, CONF, POW, R)!

  it('retourne un résultat non null', () => {
    expect(r).not.toBeNull()
  })
  it('n1 > 0', () => {
    expect(r.n1).toBeGreaterThan(0)
  })
  it('total = n1 + n2', () => {
    expect(r.total).toBe(r.n1 + r.n2)
  })
  it('difference = |mean1 - mean2|', () => {
    expect(r.difference).toBeCloseTo(Math.abs(M1 - M2), 4)
  })
  it('ratio=1 => n2 = n1', () => {
    expect(r.n2).toBe(r.n1)
  })
  it('retourne null si delta = 0', () => {
    expect(computeSampleSizes(50, 50, 10, 10, 95, 80, 1)).toBeNull()
  })
  it('puissance plus élevée => plus de sujets', () => {
    const r80 = computeSampleSizes(M1, M2, S1, S2, CONF, 80, R)!
    const r90 = computeSampleSizes(M1, M2, S1, S2, CONF, 90, R)!
    expect(r90.total).toBeGreaterThan(r80.total)
  })
  it('différence plus petite => plus de sujets', () => {
    const rFar  = computeSampleSizes(50, 45, S1, S2, CONF, POW, R)! // delta=5
    const rNear = computeSampleSizes(50, 48, S1, S2, CONF, POW, R)! // delta=2
    expect(rNear.total).toBeGreaterThan(rFar.total)
  })
  it('ratio=2 => n2 ≈ 2*n1', () => {
    const r2 = computeSampleSizes(M1, M2, S1, S2, CONF, POW, 2)!
    expect(r2.n2).toBe(Math.ceil(2 * r2.n1))
  })
  it('pooledSD > 0', () => {
    expect(r.pooledSD).toBeGreaterThan(0)
  })
})