import { describe, it, expect } from 'vitest'
import { computeFPC, computeStandardError, computeMeanCI } from './mean_confidence_interval'

// Référence : mean=50, sd=10, n=30, N=∞, conf=95%, z=1.96
const MEAN = 50, SD = 10, N_INF = Infinity

describe('computeFPC', () => {
  it('FPC = 1 pour population infinie', () => {
    expect(computeFPC(30, Infinity)).toBe(1)
  })
  it('FPC < 1 quand N est fini', () => {
    expect(computeFPC(30, 100)).toBeLessThan(1)
  })
  it('FPC ≈ sqrt((N-n)/(N-1))', () => {
    expect(computeFPC(30, 100)).toBeCloseTo(Math.sqrt(70 / 99), 6)
  })
  it('FPC = 1 si N <= n', () => {
    expect(computeFPC(30, 20)).toBe(1)
  })
})

describe('computeStandardError', () => {
  it('SE = sd/sqrt(n) sans FPC', () => {
    expect(computeStandardError(10, 30)).toBeCloseTo(10 / Math.sqrt(30), 6)
  })
  it('SE < se_infini avec population finie', () => {
    const seInf = computeStandardError(SD, 30)
    const seFin = computeStandardError(SD, 30, 100)
    expect(seFin).toBeLessThan(seInf)
  })
  it('n plus grand => SE plus petit', () => {
    expect(computeStandardError(SD, 100)).toBeLessThan(computeStandardError(SD, 30))
  })
})

describe('computeMeanCI', () => {
  const se = 10 / Math.sqrt(30)
  const r = computeMeanCI(MEAN, SD, 30, N_INF, 1.96, 2.045)

  it('variance = sd^2', () => {
    expect(r.variance).toBeCloseTo(100, 6)
  })
  it('df = n - 1', () => {
    expect(r.df).toBe(29)
  })
  it('fpc = 1 pour population infinie', () => {
    expect(r.fpc).toBeCloseTo(1, 6)
  })
  it('zLower = mean - z*se', () => {
    expect(r.zLower).toBeCloseTo(MEAN - 1.96 * se, 4)
  })
  it('zUpper = mean + z*se', () => {
    expect(r.zUpper).toBeCloseTo(MEAN + 1.96 * se, 4)
  })
  it('zWidth = zUpper - zLower', () => {
    expect(r.zWidth).toBeCloseTo(r.zUpper - r.zLower, 6)
  })
  it('tWidth > zWidth (t > z pour n petit)', () => {
    expect(r.tWidth).toBeGreaterThan(r.zWidth)
  })
  it('CI centré sur la moyenne', () => {
    expect((r.zLower + r.zUpper) / 2).toBeCloseTo(MEAN, 6)
    expect((r.tLower + r.tUpper) / 2).toBeCloseTo(MEAN, 6)
  })
  it('IC se rétrécit avec FPC', () => {
    const rFin = computeMeanCI(MEAN, SD, 30, 100, 1.96, 2.045)
    expect(rFin.zWidth).toBeLessThan(r.zWidth)
  })
})