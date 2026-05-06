import { describe, it, expect } from 'vitest'
import {
  getZ, computeMidPCI, computeFisherCI, computeNormalCI,
  computeByarCI, computeRothmanCI, computeOneRate,
} from './one_rate'

// Référence OpenEpi PersonTime1 : a=33, N=22, conf=95%
const A = 33, N = 22, CONF = 95, ALPHA = 0.05, Z = 1.96
const RATE = A / N  // ≈ 1.5

describe('getZ', () => {
  it('z(95) = 1.96', () => expect(getZ(95)).toBe(1.96))
  it('z(90) = 1.645', () => expect(getZ(90)).toBe(1.645))
  it('z(99) = 2.576', () => expect(getZ(99)).toBe(2.576))
})

describe('computeFisherCI', () => {
  it('lower < rate < upper', () => {
    const ci = computeFisherCI(A, N, ALPHA)
    expect(ci.lower).toBeLessThan(RATE)
    expect(ci.upper).toBeGreaterThan(RATE)
  })
  it('lower = 0 pour a = 0', () => {
    expect(computeFisherCI(0, N, ALPHA).lower).toBe(0)
  })
  it('upper > 0 pour a = 0', () => {
    expect(computeFisherCI(0, N, ALPHA).upper).toBeGreaterThan(0)
  })
  it('IC plus large pour conf plus élevé', () => {
    const ci95 = computeFisherCI(A, N, 0.05)
    const ci99 = computeFisherCI(A, N, 0.01)
    expect(ci99.upper - ci99.lower).toBeGreaterThan(ci95.upper - ci95.lower)
  })
})

describe('computeMidPCI', () => {
  it('lower < rate < upper', () => {
    const ci = computeMidPCI(A, N, ALPHA)
    expect(ci.lower).toBeLessThan(RATE)
    expect(ci.upper).toBeGreaterThan(RATE)
  })
  it('lower = 0 pour a = 0', () => {
    expect(computeMidPCI(0, N, ALPHA).lower).toBe(0)
  })
  it('IC mid-P <= IC Fisher (moins conservateur)', () => {
    const midp = computeMidPCI(A, N, ALPHA)
    const fisher = computeFisherCI(A, N, ALPHA)
    expect(midp.upper - midp.lower).toBeLessThanOrEqual(fisher.upper - fisher.lower + 1e-9)
  })
})

describe('computeNormalCI', () => {
  it('lower >= 0', () => {
    expect(computeNormalCI(A, N, Z).lower).toBeGreaterThanOrEqual(0)
  })
  it('lower = 0 pour a = 0', () => {
    expect(computeNormalCI(0, N, Z).lower).toBe(0)
  })
  it('contient le taux', () => {
    const ci = computeNormalCI(A, N, Z)
    expect(ci.lower).toBeLessThan(RATE)
    expect(ci.upper).toBeGreaterThan(RATE)
  })
  it('IC plus large pour z plus grand', () => {
    const ci95 = computeNormalCI(A, N, 1.96)
    const ci99 = computeNormalCI(A, N, 2.576)
    expect(ci99.upper - ci99.lower).toBeGreaterThan(ci95.upper - ci95.lower)
  })
})

describe('computeByarCI', () => {
  it('lower < rate < upper', () => {
    const ci = computeByarCI(A, N, Z)
    expect(ci.lower).toBeLessThan(RATE)
    expect(ci.upper).toBeGreaterThan(RATE)
  })
  it('lower >= 0', () => {
    expect(computeByarCI(A, N, Z).lower).toBeGreaterThanOrEqual(0)
  })
  it('n plus grand => IC plus étroit', () => {
    const ciSmall = computeByarCI(10, 100, Z)
    const ciBig   = computeByarCI(100, 1000, Z)
    // même taux, n plus grand => IC relatif plus étroit
    const widthSmall = (ciSmall.upper - ciSmall.lower) / (10 / 100)
    const widthBig   = (ciBig.upper   - ciBig.lower)   / (100 / 1000)
    expect(widthBig).toBeLessThan(widthSmall)
  })
})

describe('computeRothmanCI', () => {
  it('lower < rate < upper', () => {
    const ci = computeRothmanCI(A, N, Z)
    expect(ci.lower).toBeLessThan(RATE)
    expect(ci.upper).toBeGreaterThan(RATE)
  })
  it('symétrique sur échelle log', () => {
    const ci = computeRothmanCI(A, N, Z)
    const logRate = Math.log(RATE)
    expect(Math.abs(Math.log(ci.upper) - logRate)).toBeCloseTo(Math.abs(logRate - Math.log(ci.lower)), 4)
  })
})

describe('computeOneRate', () => {
  const r = computeOneRate(A, N, CONF)!

  it('retourne non null pour entrées valides', () => expect(r).not.toBeNull())
  it('rate = a / N', () => expect(r.rate).toBeCloseTo(RATE, 6))
  it('retourne null si N = 0', () => expect(computeOneRate(A, 0, CONF)).toBeNull())
  it('retourne null si a < 0', () => expect(computeOneRate(-1, N, CONF)).toBeNull())
  it('tous les IC contiennent le taux', () => {
    const methods = [r.midp, r.fisher, r.normal, r.byar, r.rothman]
    methods.forEach(ci => {
      expect(ci.lower).toBeLessThan(r.rate)
      expect(ci.upper).toBeGreaterThan(r.rate)
    })
  })
  it('lower >= 0 pour toutes les méthodes', () => {
    [r.midp, r.fisher, r.normal, r.byar, r.rothman].forEach(ci => {
      expect(ci.lower).toBeGreaterThanOrEqual(0)
    })
  })
})