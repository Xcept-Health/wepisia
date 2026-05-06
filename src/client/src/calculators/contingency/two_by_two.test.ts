import { describe, it, expect } from 'vitest'
import {
  computeTotals,
  computeOddsRatio,
  computeRelativeRisk,
  computeChiSquares,
  computeFisher,
  computeRiskDifference,
  computeProportionCI,
  computeAttributableFractionsRR,
  computeAttributableFractionsOR,
  combination,
  hypergeometricPdf,
} from './two_by_two'

// Reference: OpenEpi v3.03a - Two by Two Table
// https://www.openepi.com/TwobyTwo/TwobyTwo.htm
// Table: a=60, b=40, c=30, d=70 (exemple chargé dans l'UI)
const REF = { a: 60, b: 40, c: 30, d: 70 }

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

describe('combination', () => {
  it('C(5,2) = 10', () => expect(combination(5, 2)).toBe(10))
  it('C(10,0) = 1', () => expect(combination(10, 0)).toBe(1))
  it('C(10,10) = 1', () => expect(combination(10, 10)).toBe(1))
  it('C(n,k) = C(n, n-k)', () => {
    expect(combination(8, 3)).toBe(combination(8, 5))
  })
  it('k > n retourne 0', () => expect(combination(3, 5)).toBe(0))
})

describe('hypergeometricPdf', () => {
  it('retourne 0 pour k hors limites', () => {
    expect(hypergeometricPdf(-1, 10, 5, 20)).toBe(0)
  })
  it('somme des probabilités = 1 sur tout le support', () => {
    const N = 20, K = 8, n = 6
    let sum = 0
    for (let k = 0; k <= Math.min(n, K); k++) {
      sum += hypergeometricPdf(k, n, K, N)
    }
    expect(sum).toBeCloseTo(1, 10)
  })
})

// ----------------------------------------------------------------
// Totaux
// ----------------------------------------------------------------

describe('computeTotals', () => {
  it('totalExposed = a + b', () => {
    expect(computeTotals(REF).totalExposed).toBe(100)
  })
  it('total = a + b + c + d', () => {
    expect(computeTotals(REF).total).toBe(200)
  })
  it('totalDiseased = a + c', () => {
    expect(computeTotals(REF).totalDiseased).toBe(90)
  })
})

// ----------------------------------------------------------------
// Odds Ratio
// ----------------------------------------------------------------

describe('computeOddsRatio', () => {
  it('valeur de référence OpenEpi : OR = 3.500', () => {
    const r = computeOddsRatio(REF)!
    expect(r.point).toBeCloseTo(3.5, 2)
  })

  it('CI 95% contient le point estimate', () => {
    const r = computeOddsRatio(REF)!
    expect(r.ci95.lower).toBeLessThan(r.point)
    expect(r.ci95.upper).toBeGreaterThan(r.point)
  })

  it('OR = 1 pour table sans association', () => {
    const r = computeOddsRatio({ a: 50, b: 50, c: 50, d: 50 })!
    expect(r.point).toBeCloseTo(1.0, 4)
  })

  it('retourne null si b = 0', () => {
    expect(computeOddsRatio({ a: 60, b: 0, c: 30, d: 70 })).toBeNull()
  })

  it('retourne null si c = 0', () => {
    expect(computeOddsRatio({ a: 60, b: 40, c: 0, d: 70 })).toBeNull()
  })
})

// ----------------------------------------------------------------
// Relative Risk
// ----------------------------------------------------------------

describe('computeRelativeRisk', () => {
it('valeur de référence OpenEpi : RR = 2.000', () => {
    const r = computeRelativeRisk(REF)!
    expect(r.point).toBeCloseTo(2.0, 2)
    })

  it('CI 95% contient le point estimate', () => {
    const r = computeRelativeRisk(REF)!
    expect(r.ci95.lower).toBeLessThan(r.point)
    expect(r.ci95.upper).toBeGreaterThan(r.point)
  })

  it('RR = 1 pour table sans association', () => {
    const r = computeRelativeRisk({ a: 50, b: 50, c: 50, d: 50 })!
    expect(r.point).toBeCloseTo(1.0, 4)
  })

  it('retourne null si r2 = 0 (pas d\'inexposes)', () => {
    expect(computeRelativeRisk({ a: 60, b: 40, c: 0, d: 0 })).toBeNull()
  })
})

// ----------------------------------------------------------------
// Chi-square
// ----------------------------------------------------------------

describe('computeChiSquares', () => {
  it('chi2 uncorrected > 0 pour table avec association', () => {
    const r = computeChiSquares(REF)!
    expect(r.uncorrected).toBeGreaterThan(0)
  })

  it('Mantel-Haenszel < uncorrected (facteur N-1/N)', () => {
    const r = computeChiSquares(REF)!
    expect(r.mantelHaenszel).toBeLessThan(r.uncorrected)
  })

  it('Yates <= uncorrected', () => {
    const r = computeChiSquares(REF)!
    expect(r.yates).toBeLessThanOrEqual(r.uncorrected)
  })

  it('chi2 proche de 0 pour table sans association', () => {
    const r = computeChiSquares({ a: 50, b: 50, c: 50, d: 50 })!
    expect(r.uncorrected).toBeCloseTo(0, 4)
  })

  it('retourne null si denom = 0', () => {
    expect(computeChiSquares({ a: 100, b: 0, c: 0, d: 0 })).toBeNull()
  })
})

// ----------------------------------------------------------------
// Fisher exact
// ----------------------------------------------------------------

describe('computeFisher', () => {
  it('p deux queues dans [0, 1]', () => {
    const r = computeFisher(REF)!
    expect(r.twoTail).toBeGreaterThanOrEqual(0)
    expect(r.twoTail).toBeLessThanOrEqual(1)
  })

  it('p une queue <= p deux queues', () => {
    const r = computeFisher(REF)!
    expect(r.oneTail).toBeLessThanOrEqual(r.twoTail)
  })

  it('midP une queue < p une queue exacte', () => {
    const r = computeFisher(REF)!
    expect(r.midPOneTail).toBeLessThan(r.oneTail)
  })

  it('midP deux queues < p deux queues exacte', () => {
    const r = computeFisher(REF)!
    expect(r.midPTwoTail).toBeLessThan(r.twoTail)
  })

  it('retourne null si n = 0', () => {
    expect(computeFisher({ a: 0, b: 0, c: 0, d: 0 })).toBeNull()
  })
})

// ----------------------------------------------------------------
// Risk Difference
// ----------------------------------------------------------------

describe('computeRiskDifference', () => {
  it('RD = 0 pour table sans association', () => {
    const r = computeRiskDifference({ a: 50, b: 50, c: 50, d: 50 })!
    expect(r.point).toBeCloseTo(0, 4)
  })

  it('CI 95% contient le point estimate', () => {
    const r = computeRiskDifference(REF)!
    expect(r.ci95.lower).toBeLessThan(r.point)
    expect(r.ci95.upper).toBeGreaterThan(r.point)
  })

  it('retourne null si r2 = 0', () => {
    expect(computeRiskDifference({ a: 60, b: 40, c: 0, d: 0 })).toBeNull()
  })
})

// ----------------------------------------------------------------
// Proportion CI
// ----------------------------------------------------------------

describe('computeProportionCI', () => {
  it('CI contient la proportion', () => {
    const ci = computeProportionCI(0.6, 100)
    expect(ci.lower).toBeLessThan(0.6)
    expect(ci.upper).toBeGreaterThan(0.6)
  })

  it('lower >= 0 et upper <= 1', () => {
    const ci = computeProportionCI(0.99, 10)
    expect(ci.lower).toBeGreaterThanOrEqual(0)
    expect(ci.upper).toBeLessThanOrEqual(1)
  })
})

// ----------------------------------------------------------------
// Fractions attribuables RR
// ----------------------------------------------------------------

describe('computeAttributableFractionsRR', () => {
  it('fracExp = (RR-1)/RR', () => {
    const rr = computeRelativeRisk(REF)!
    const { totalExposed, total } = computeTotals(REF)
    const r = computeAttributableFractionsRR(rr, totalExposed / total)
    expect(r.fracExp).toBeCloseTo((rr.point - 1) / rr.point, 6)
  })

  it('fracExp = 0 pour RR = 1', () => {
    const nullRR = { point: 1, ci95: { lower: 0.9, upper: 1.1 } }
    const r = computeAttributableFractionsRR(nullRR, 0.5)
    expect(r.fracExp).toBeCloseTo(0, 4)
  })
})

// ----------------------------------------------------------------
// Fractions attribuables OR
// ----------------------------------------------------------------

describe('computeAttributableFractionsOR', () => {
  it('fracExp = (OR-1)/OR', () => {
    const or = computeOddsRatio(REF)!
    const { totalDiseased, a } = { totalDiseased: 90, a: 60 }
    const r = computeAttributableFractionsOR(or, a / totalDiseased)
    expect(r.fracExp).toBeCloseTo((or.point - 1) / or.point, 6)
  })
})
