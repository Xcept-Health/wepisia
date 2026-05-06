import { describe, it, expect } from 'vitest'
import {
  oddsRatioFromProportions,
  p1FromOR,
  computeCaseControlSampleSize,
} from './sample_size_unmatched_case_control'

// Paramètres OpenEpi SSCC exemple : 95%, 80%, ratio=1, p2=40%, p1=21.88% (OR≈0.42)
const ZA   = 1.96
const ZB   = 0.842
const K    = 1
const P2   = 0.40
const P1   = 0.2188

describe('oddsRatioFromProportions', () => {
  it('proportions égales => OR = 1', () => {
    expect(oddsRatioFromProportions(40, 40)).toBeCloseTo(1, 4)
  })
  it('p1 < p2 => OR < 1', () => {
    expect(oddsRatioFromProportions(21.88, 40)).toBeLessThan(1)
  })
  it('p1 > p2 => OR > 1', () => {
    expect(oddsRatioFromProportions(60, 40)).toBeGreaterThan(1)
  })
  it('retourne 0 si p1=0', () => {
    expect(oddsRatioFromProportions(0, 40)).toBe(0)
  })
})

describe('p1FromOR', () => {
  it('OR=1 => p1 = p2', () => {
    expect(p1FromOR(40, 1)).toBeCloseTo(40, 4)
  })
  it('inverse de oddsRatioFromProportions', () => {
    const or = oddsRatioFromProportions(21.88, 40)
    expect(p1FromOR(40, or)).toBeCloseTo(21.88, 1)
  })
  it('OR > 1 => p1 > p2', () => {
    expect(p1FromOR(40, 2)).toBeGreaterThan(40)
  })
})

describe('computeCaseControlSampleSize', () => {
  const r = computeCaseControlSampleSize(ZA, ZB, K, P1, P2)

  it('n1 > 0 pour toutes les méthodes', () => {
    expect(r.kelsey.n1).toBeGreaterThan(0)
    expect(r.fleiss.n1).toBeGreaterThan(0)
    expect(r.fleissCC.n1).toBeGreaterThan(0)
  })

  it('total = n1 + n2', () => {
    expect(r.kelsey.total).toBe(r.kelsey.n1 + r.kelsey.n2)
    expect(r.fleiss.total).toBe(r.fleiss.n1 + r.fleiss.n2)
    expect(r.fleissCC.total).toBe(r.fleissCC.n1 + r.fleissCC.n2)
  })

  it('ratio=1 => n2 = n1 (Kelsey)', () => {
    expect(r.kelsey.n2).toBe(r.kelsey.n1)
  })

  it('Fleiss CC >= Fleiss (plus conservateur)', () => {
    expect(r.fleissCC.n1).toBeGreaterThanOrEqual(r.fleiss.n1)
  })

  it('ratio=2 => n2 ≈ 2*n1', () => {
    const r2 = computeCaseControlSampleSize(ZA, ZB, 2, P1, P2)
    expect(r2.n2 ?? r2.kelsey.n2).toBe(Math.ceil(2 * r2.kelsey.n1))
  })

  it('plus de puissance (zBeta plus grand) => plus de cas', () => {
    const r80 = computeCaseControlSampleSize(ZA, 0.842, K, P1, P2)
    const r90 = computeCaseControlSampleSize(ZA, 1.282, K, P1, P2)
    expect(r90.kelsey.n1).toBeGreaterThan(r80.kelsey.n1)
  })

  it('diff plus petite => plus de cas requis', () => {
    const rFar  = computeCaseControlSampleSize(ZA, ZB, K, 0.30, 0.50) // diff=0.20
    const rNear = computeCaseControlSampleSize(ZA, ZB, K, 0.40, 0.50) // diff=0.10
    expect(rNear.kelsey.n1).toBeGreaterThan(rFar.kelsey.n1)
  })
})