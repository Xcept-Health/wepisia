import { describe, it, expect } from 'vitest'
import { computeAnovaTable, computeBartlett, formatNumber } from './anova'

// Reference: OpenEpi ANOVA example
// https://www.openepi.com/ANOVA/ANOVA.htm
// Groups: n=[63,17,15], mean=[55.1,47.59,49.4], sd=[10.93,7.08,10.2]
const REF_GROUPS = [
  { label: '1', n: 63, mean: 55.1,  sd: 10.93 },
  { label: '2', n: 17, mean: 47.59, sd: 7.08  },
  { label: '3', n: 15, mean: 49.4,  sd: 10.2  },
]

describe('computeAnovaTable', () => {
  it('calcule totalN correctement', () => {
    const r = computeAnovaTable(REF_GROUPS)
    expect(r.totalN).toBe(95)
  })

  it('calcule la grand mean correctement', () => {
    const r = computeAnovaTable(REF_GROUPS)
    expect(r.grandMean).toBeCloseTo(52.86, 1)
  })

  it('dfBetween = k - 1', () => {
    const r = computeAnovaTable(REF_GROUPS)
    expect(r.dfBetween).toBe(2)
  })

  it('dfWithin = N - k', () => {
    const r = computeAnovaTable(REF_GROUPS)
    expect(r.dfWithin).toBe(92)
  })

  it('sst = ssb + ssw', () => {
    const r = computeAnovaTable(REF_GROUPS)
    expect(r.sst).toBeCloseTo(r.ssb + r.ssw, 8)
  })

  it('fStat = msb / msw', () => {
    const r = computeAnovaTable(REF_GROUPS)
    expect(r.fStat).toBeCloseTo(r.msb / r.msw, 8)
  })

  it('fStat > 1 pour des groupes différents', () => {
    const r = computeAnovaTable(REF_GROUPS)
    expect(r.fStat).toBeGreaterThan(1)
  })

  it('fStat proche de 1 pour des groupes identiques', () => {
    const identical = [
      { label: '1', n: 30, mean: 50, sd: 10 },
      { label: '2', n: 30, mean: 50, sd: 10 },
    ]
    const r = computeAnovaTable(identical)
    expect(r.fStat).toBeCloseTo(0, 4)
  })

  it('throw si moins de 2 groupes', () => {
    expect(() => computeAnovaTable([REF_GROUPS[0]])).toThrow()
  })

  it('throw si n < 2', () => {
    const bad = [{ label: '1', n: 1, mean: 50, sd: 10 }, REF_GROUPS[1]]
    expect(() => computeAnovaTable(bad)).toThrow()
  })

  it('throw si sd <= 0', () => {
    const bad = [{ label: '1', n: 10, mean: 50, sd: 0 }, REF_GROUPS[1]]
    expect(() => computeAnovaTable(bad)).toThrow()
  })
})

describe('computeBartlett', () => {
  it('chi2 > 0', () => {
    const r = computeAnovaTable(REF_GROUPS)
    const b = computeBartlett(REF_GROUPS, r.msw, r.dfWithin)
    expect(b.chi2).toBeGreaterThan(0)
  })

  it('df = k - 1', () => {
    const r = computeAnovaTable(REF_GROUPS)
    const b = computeBartlett(REF_GROUPS, r.msw, r.dfWithin)
    expect(b.df).toBe(2)
  })

  it('chi2 proche de 0 pour des variances homogènes', () => {
    const homogeneous = [
      { label: '1', n: 30, mean: 50,  sd: 10 },
      { label: '2', n: 30, mean: 55,  sd: 10 },
      { label: '3', n: 30, mean: 60,  sd: 10 },
    ]
    const r = computeAnovaTable(homogeneous)
    const b = computeBartlett(homogeneous, r.msw, r.dfWithin)
    expect(b.chi2).toBeCloseTo(0, 4)
  })
})

describe('formatNumber', () => {
  it('formate à 4 décimales par défaut', () => {
    expect(formatNumber(3.14159265)).toBe('3.1416')
  })

  it('retourne ∞ pour Infinity', () => {
    expect(formatNumber(Infinity)).toBe('∞')
  })

  it('retourne - pour NaN', () => {
    expect(formatNumber(NaN)).toBe('-')
  })
})