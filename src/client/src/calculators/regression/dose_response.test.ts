import { describe, it, expect } from 'vitest'
import jStat from 'jstat'

// On va isoler la logique de calcul (important)
import { calculateTrendMock } from './dose_response'

describe('Dose Response Trend Test', () => {

  it('returns null if less than 2 valid rows', () => {
    const rows = [
      { dose: 0, cases: 10, controls: 90 }
    ]

    const res = calculateTrendMock(rows)
    expect(res).toBeNull()
  })

  it('detects positive trend correctly', () => {
    const rows = [
      { dose: 0, cases: 5, controls: 95 },
      { dose: 10, cases: 20, controls: 80 },
      { dose: 20, cases: 40, controls: 60 },
    ]

    const res = calculateTrendMock(rows)

    expect(res).not.toBeNull()
    expect(res?.trendDirection).toBe('positive')
    expect(res?.chiSquare).toBeGreaterThan(0)
    expect(res?.pValue).toBeLessThan(0.05)
  })

  it('detects negative trend correctly', () => {
    const rows = [
      { dose: 0, cases: 50, controls: 50 },
      { dose: 10, cases: 30, controls: 70 },
      { dose: 20, cases: 10, controls: 90 },
    ]

    const res = calculateTrendMock(rows)

    expect(res?.trendDirection).toBe('negative')
    expect(res?.chiSquare).toBeGreaterThan(0)
  })

  it('detects no trend when flat', () => {
    const rows = [
      { dose: 0, cases: 10, controls: 90 },
      { dose: 10, cases: 10, controls: 90 },
      { dose: 20, cases: 10, controls: 90 },
    ]

    const res = calculateTrendMock(rows)

    expect(res?.trendDirection).toBe('none')
    expect(res?.chiSquare).toBeCloseTo(0, 5)
  })

  it('computes valid odds ratios', () => {
    const rows = [
      { dose: 0, cases: 10, controls: 90 },
      { dose: 10, cases: 20, controls: 80 },
    ]
  
    const res = calculateTrendMock(rows)
    expect(res).not.toBeNull()
  
    const level = res!.levels[1]
  
    expect(level.oddsRatio).toBeGreaterThan(1)
    expect(level.orLower!).toBeLessThan(level.oddsRatio!)
    expect(level.orUpper!).toBeGreaterThan(level.oddsRatio!)
  })
  
  it('computes valid relative risks', () => {
    const rows = [
      { dose: 0, cases: 10, controls: 90 },
      { dose: 10, cases: 30, controls: 70 },
    ]
  
    const res = calculateTrendMock(rows)
    expect(res).not.toBeNull()
  
    const level = res!.levels[1]
  
    expect(level.relativeRisk).toBeGreaterThan(1)
    expect(level.rrLower!).toBeLessThan(level.relativeRisk!)
    expect(level.rrUpper!).toBeGreaterThan(level.relativeRisk!)
  })


  it('p-value matches chi-square distribution', () => {
    const chi2 = 3.84
    const expected = 1 - jStat.chisquare.cdf(chi2, 1)

    expect(expected).toBeCloseTo(0.05, 2)
  })

  it('handles zero safely (no crash)', () => {
    const rows = [
      { dose: 0, cases: 0, controls: 0 },
      { dose: 10, cases: 10, controls: 0 },
    ]

    const res = calculateTrendMock(rows)

    expect(res).not.toBeNull()
  })

})