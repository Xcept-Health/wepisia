// src/client/src/calculators/misc/median_percentile_ci.test.ts
import { describe, it, expect } from 'vitest'
import {
  getZValue,
  formatNumber,
  computeRankInterval,
  convertRankToPercentile,
  calculateMedianCI
} from './median_percentile_ci'

// Référence OpenEpi MedianCI : n=100, p=50, conf=95%
const N = 100
const PERCENTILE = 50
const CONF = 95
const ALPHA = 0.05
const P = PERCENTILE / 100  // 0.5

describe('Median Percentile CI Calculator', () => {
  describe('getZValue', () => {
    it('returns 1.96 for 95% confidence', () => {
      expect(getZValue(95)).toBeCloseTo(1.96, 3)
    })
    
    it('returns 1.645 for 90% confidence', () => {
      expect(getZValue(90)).toBeCloseTo(1.645, 3)
    })
    
    it('returns 2.576 for 99% confidence', () => {
      expect(getZValue(99)).toBeCloseTo(2.576, 3)
    })
    
    it('increases with confidence level', () => {
      expect(getZValue(99)).toBeGreaterThan(getZValue(95))
      expect(getZValue(95)).toBeGreaterThan(getZValue(90))
    })
  })

  describe('formatNumber', () => {
    it('formats decimals correctly', () => {
      expect(formatNumber(12.3456, 2)).toBe('12.35')
      expect(formatNumber(0.1234, 3)).toBe('0.123')
    })
    
    it('handles edge cases', () => {
      expect(formatNumber(Infinity)).toBe('∞')
      expect(formatNumber(-Infinity)).toBe('∞')
      expect(formatNumber(NaN)).toBe('-')
    })
  })

  describe('computeRankInterval', () => {
    const { expectedRank, se, lowerRank, upperRank } = computeRankInterval(N, P, 1.96)
    
    it('calculates expected rank correctly', () => {
      expect(expectedRank).toBeCloseTo(N * P, 6)
    })
    
    it('calculates standard error correctly', () => {
      expect(se).toBeCloseTo(Math.sqrt(N * P * (1 - P)), 6)
    })
    
    it('ensures lowerRank >= 1', () => {
      expect(lowerRank).toBeGreaterThanOrEqual(1)
    })
    
    it('ensures upperRank <= n', () => {
      expect(upperRank).toBeLessThanOrEqual(N)
    })
    
    it('maintains interval order', () => {
      expect(lowerRank).toBeLessThan(expectedRank)
      expect(upperRank).toBeGreaterThan(expectedRank)
    })
  })

  describe('convertRankToPercentile', () => {
    it('converts ranks to percentiles correctly', () => {
      expect(convertRankToPercentile(25, 100)).toBe(25)
      expect(convertRankToPercentile(50, 100)).toBe(50)
      expect(convertRankToPercentile(75, 100)).toBe(75)
    })
    
    it('handles boundary values', () => {
      expect(convertRankToPercentile(0, 100)).toBe(1)
      expect(convertRankToPercentile(1, 100)).toBe(1)
      expect(convertRankToPercentile(100, 100)).toBe(100)
      expect(convertRankToPercentile(101, 100)).toBe(100)
    })
  })

  describe('calculateMedianCI', () => {
    const result = calculateMedianCI(N, PERCENTILE, CONF)
    
    it('returns valid results for valid input', () => {
      expect(result).not.toBeNull()
      expect(result?.n).toBe(N)
      expect(result?.percentile).toBe(PERCENTILE)
      expect(result?.conf).toBe(CONF)
    })
    
    it('calculates correct interval for median', () => {
      const res = calculateMedianCI(100, 50, 95)
      expect(res?.lowerRank).toBe(40)
      expect(res?.upperRank).toBe(61)
      expect(res?.lowerPercentile).toBeCloseTo(40, 1)
      expect(res?.upperPercentile).toBeCloseTo(61, 1)
    })
    
    it('returns null for invalid sample size', () => {
      expect(calculateMedianCI(1, PERCENTILE, CONF)).toBeNull()
    })
    
    it('returns null for invalid percentile', () => {
      expect(calculateMedianCI(N, -1, CONF)).toBeNull()
      expect(calculateMedianCI(N, 101, CONF)).toBeNull()
    })
    
    it('interval widens with higher confidence', () => {
      const res95 = calculateMedianCI(N, PERCENTILE, 95)
      const res99 = calculateMedianCI(N, PERCENTILE, 99)
      expect((res99?.upperRank || 0) - (res95?.lowerRank || 0)).toBeGreaterThan((res95?.upperRank || 0) - (res95?.lowerRank || 0))
    })
  })
})