import { describe, it, expect } from 'vitest'
import {
  getZ, computeFPC, computeWilsonCI, computeExactCI,
  computeAgrestiCoullCI, computeFleissCI, computeMidPCI, computeProportion,
} from './proportions'

// Référence OpenEpi Proportion : num=10, den=11, mult=100, conf=95%
const NUM = 10, DEN = 11, CONF = 95, ALPHA = 0.05
const Z95 = 1.96
const P = NUM / DEN  // ≈ 0.9091

describe('getZ', () => {
  it('getZ(95) = 1.96', () => expect(getZ(95)).toBe(1.96))
  it('getZ(90) = 1.645', () => expect(getZ(90)).toBe(1.645))
  it('getZ(99) = 2.576', () => expect(getZ(99)).toBe(2.576))
})

describe('computeFPC', () => {
  it('fpc = 1 pour population null', () => {
    expect(computeFPC(30, null)).toBe(1)
  })
  it('fpc < 1 pour population finie > n', () => {
    expect(computeFPC(30, 100)).toBeLessThan(1)
  })
  it('fpc = 1 si N <= n', () => {
    expect(computeFPC(30, 20)).toBe(1)
  })
  it('formule correcte', () => {
    expect(computeFPC(30, 100)).toBeCloseTo(Math.sqrt(70 / 99), 6)
  })
})

describe('computeWilsonCI', () => {
  const ci = computeWilsonCI(P, DEN, Z95, 1)

  it('lower >= 0', () => expect(ci.lower).toBeGreaterThanOrEqual(0))
  it('upper <= 1', () => expect(ci.upper).toBeLessThanOrEqual(1))
  it('contient la proportion', () => {
    expect(ci.lower).toBeLessThan(P)
    expect(ci.upper).toBeGreaterThan(P)
  })
  it('IC plus étroit avec FPC', () => {
    const withFpc = computeWilsonCI(P, DEN, Z95, computeFPC(DEN, 1000))
    expect(withFpc.upper - withFpc.lower).toBeLessThan(ci.upper - ci.lower)
  })
  it('IC plus large pour z plus grand', () => {
    const ci99 = computeWilsonCI(P, DEN, 2.576, 1)
    expect(ci99.upper - ci99.lower).toBeGreaterThan(ci.upper - ci.lower)
  })
})

describe('computeExactCI (Clopper-Pearson)', () => {
  it('lower = 0 si num = 0', () => {
    const ci = computeExactCI(0, DEN, ALPHA)
    expect(ci.lower).toBe(0)
    expect(ci.upper).toBeGreaterThan(0)
  })
  it('upper = 1 si num = den', () => {
    const ci = computeExactCI(DEN, DEN, ALPHA)
    expect(ci.upper).toBe(1)
    expect(ci.lower).toBeGreaterThan(0)
  })
  it('contient la proportion', () => {
    const ci = computeExactCI(NUM, DEN, ALPHA)
    expect(ci.lower).toBeLessThan(P)
    expect(ci.upper).toBeGreaterThan(P)
  })
  it('IC exact plus large que Wilson (conservateur)', () => {
    const exact = computeExactCI(NUM, DEN, ALPHA)
    const wilson = computeWilsonCI(P, DEN, Z95, 1)
    expect(exact.upper - exact.lower).toBeGreaterThanOrEqual(wilson.upper - wilson.lower)
  })
})

describe('computeAgrestiCoullCI', () => {
  const ci = computeAgrestiCoullCI(NUM, DEN, Z95, 1)

  it('lower >= 0 et upper <= 1', () => {
    expect(ci.lower).toBeGreaterThanOrEqual(0)
    expect(ci.upper).toBeLessThanOrEqual(1)
  })
  it('contient la proportion', () => {
    expect(ci.lower).toBeLessThan(P)
    expect(ci.upper).toBeGreaterThan(P)
  })
  it('proche de Wilson pour grand n', () => {
    const bigP = 0.5
    const bigN = 1000
    const ac = computeAgrestiCoullCI(bigP * bigN, bigN, Z95, 1)
    const w  = computeWilsonCI(bigP, bigN, Z95, 1)
    expect(Math.abs(ac.lower - w.lower)).toBeLessThan(0.01)
    expect(Math.abs(ac.upper - w.upper)).toBeLessThan(0.01)
  })
})

describe('computeFleissCI', () => {
  const ci = computeFleissCI(NUM, DEN, Z95)

  it('lower >= 0 et upper <= 1', () => {
    expect(ci.lower).toBeGreaterThanOrEqual(0)
    expect(ci.upper).toBeLessThanOrEqual(1)
  })
  it('contient la proportion', () => {
    expect(ci.lower).toBeLessThan(P)
    expect(ci.upper).toBeGreaterThan(P)
  })
})

describe('computeMidPCI', () => {
  it('lower = 0 si num = 0', () => {
    const ci = computeMidPCI(0, DEN, ALPHA)
    expect(ci.lower).toBe(0)
  })
  it('contient la proportion', () => {
    const ci = computeMidPCI(NUM, DEN, ALPHA)
    expect(ci.lower).toBeLessThan(P)
    expect(ci.upper).toBeGreaterThan(P)
  })
  it('IC mid-P < IC exact (moins conservateur)', () => {
    const midP = computeMidPCI(NUM, DEN, ALPHA)
    const exact = computeExactCI(NUM, DEN, ALPHA)
    expect(midP.upper - midP.lower).toBeLessThanOrEqual(exact.upper - exact.lower + 1e-9)
  })
})

describe('computeProportion', () => {
  const r = computeProportion(NUM, DEN, CONF, null, 50.0, 100)

  it('proportion = num/den', () => {
    expect(r.proportion).toBeCloseTo(P, 6)
  })
  it('npq = n * p * (1-p)', () => {
    expect(r.npq).toBeCloseTo(DEN * P * (1 - P), 6)
  })
  it('fpc = 1 sans population', () => {
    expect(r.fpc).toBe(1)
  })
  it('zValue > 0 car proportion > compareTo/mult', () => {
    expect(r.zValue).toBeGreaterThan(0)
  })
  it('pValue dans [0, 1]', () => {
    expect(r.pValue).toBeGreaterThanOrEqual(0)
    expect(r.pValue).toBeLessThanOrEqual(1)
  })
  it('p < 0.05 car proportion loin de 50%', () => {
    expect(r.pValue).toBeLessThan(0.05)
  })
  it('fpc < 1 avec population finie', () => {
    const rFin = computeProportion(NUM, DEN, CONF, 1000, 50, 100)
    expect(rFin.fpc).toBeLessThan(1)
  })
})