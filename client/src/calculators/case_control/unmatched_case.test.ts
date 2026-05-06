import { describe, it, expect } from 'vitest'
import {
  zAlpha, zBeta,
  computeP1, computeOR,
  kelseySampleSize, fleissSampleSizeFloat, fleissCCSampleSize,
  computeAllSampleSizes,
} from './unmatched_case'

// Référence OpenEpi SSCC : alpha=0.05, power=80%, ratio=1, p0=40%, OR=2.0
const ALPHA = 0.05
const POWER = 0.80
const RATIO = 1
const P0    = 0.40
const OR    = 2.0
const P1    = computeP1(P0, OR) // ≈ 0.5714

describe('zAlpha', () => {
  it('zAlpha(0.05) ≈ 1.96', () => {
    expect(zAlpha(0.05)).toBeCloseTo(1.96, 2)
  })
  it('zAlpha(0.01) > zAlpha(0.05)', () => {
    expect(zAlpha(0.01)).toBeGreaterThan(zAlpha(0.05))
  })
})

describe('zBeta', () => {
  it('zBeta(0.80) ≈ 0.842', () => {
    expect(zBeta(0.80)).toBeCloseTo(0.842, 2)
  })
  it('zBeta(0.90) > zBeta(0.80)', () => {
    expect(zBeta(0.90)).toBeGreaterThan(zBeta(0.80))
  })
})

describe('computeP1', () => {
  it('OR=1 => p1 = p0', () => {
    expect(computeP1(0.4, 1)).toBeCloseTo(0.4, 6)
  })
  it('OR=2, p0=0.4 => p1 ≈ 0.571', () => {
    expect(computeP1(0.4, 2)).toBeCloseTo(0.5714, 3)
  })
  it('OR > 1 => p1 > p0', () => {
    expect(computeP1(0.3, 3)).toBeGreaterThan(0.3)
  })
  it('OR < 1 => p1 < p0', () => {
    expect(computeP1(0.5, 0.5)).toBeLessThan(0.5)
  })
})

describe('computeOR', () => {
  it('p1=p0 => OR = 1', () => {
    expect(computeOR(0.4, 0.4)).toBeCloseTo(1, 6)
  })
  it('computeOR inverse de computeP1', () => {
    const p1 = computeP1(P0, OR)
    expect(computeOR(P0, p1)).toBeCloseTo(OR, 4)
  })
  it('retourne 1 si p0=0', () => {
    expect(computeOR(0, 0.5)).toBe(1)
  })
})

describe('kelseySampleSize', () => {
  it('cases > 0', () => {
    const r = kelseySampleSize(ALPHA, POWER, RATIO, P0, P1)
    expect(r.cases).toBeGreaterThan(0)
  })
  it('controls = ceil(ratio * cases)', () => {
    const r = kelseySampleSize(ALPHA, POWER, RATIO, P0, P1)
    expect(r.controls).toBe(Math.ceil(RATIO * r.cases))
  })
  it('plus de puissance => plus de cas', () => {
    const r80 = kelseySampleSize(ALPHA, 0.80, RATIO, P0, P1)
    const r90 = kelseySampleSize(ALPHA, 0.90, RATIO, P0, P1)
    expect(r90.cases).toBeGreaterThan(r80.cases)
  })
  it('ratio=2 => controls ≈ 2 × cases', () => {
    const r = kelseySampleSize(ALPHA, POWER, 2, P0, P1)
    expect(r.controls).toBe(Math.ceil(2 * r.cases))
  })
})

describe('fleissSampleSizeFloat', () => {
  it('cases > 0', () => {
    const r = fleissSampleSizeFloat(ALPHA, POWER, RATIO, P0, P1)
    expect(r.cases).toBeGreaterThan(0)
  })
  it('casesFloat <= cases (plafonnement)', () => {
    const r = fleissSampleSizeFloat(ALPHA, POWER, RATIO, P0, P1)
    expect(r.cases).toBeGreaterThanOrEqual(r.casesFloat)
  })
  it('résultat cohérent avec Kelsey (même ordre de grandeur)', () => {
    const k = kelseySampleSize(ALPHA, POWER, RATIO, P0, P1)
    const f = fleissSampleSizeFloat(ALPHA, POWER, RATIO, P0, P1)
    expect(Math.abs(f.cases - k.cases)).toBeLessThan(k.cases * 0.2) // ±20%
  })
})

describe('fleissCCSampleSize', () => {
  it('cases >= Fleiss sans CC', () => {
    const f   = fleissSampleSizeFloat(ALPHA, POWER, RATIO, P0, P1)
    const fcc = fleissCCSampleSize(ALPHA, POWER, RATIO, P0, P1)
    expect(fcc.cases).toBeGreaterThanOrEqual(f.cases)
  })
  it('controls = ceil(ratio * cases)', () => {
    const r = fleissCCSampleSize(ALPHA, POWER, RATIO, P0, P1)
    expect(r.controls).toBe(Math.ceil(RATIO * r.cases))
  })
})

describe('computeAllSampleSizes', () => {
  it('retourne 3 méthodes', () => {
    const r = computeAllSampleSizes(ALPHA, POWER, RATIO, P0, P1)
    expect(r).toHaveLength(3)
  })
  it('labels corrects', () => {
    const r = computeAllSampleSizes(ALPHA, POWER, RATIO, P0, P1)
    expect(r.map(x => x.method)).toEqual(['Kelsey', 'Fleiss', 'FleissCC'])
  })
  it('total = cases + controls pour chaque méthode', () => {
    const r = computeAllSampleSizes(ALPHA, POWER, RATIO, P0, P1)
    r.forEach(m => expect(m.total).toBe(m.cases + m.controls))
  })
  it('FleissCC >= Fleiss (plus conservateur)', () => {
    const r = computeAllSampleSizes(ALPHA, POWER, RATIO, P0, P1)
    const fleiss   = r.find(x => x.method === 'Fleiss')!
    const fleissCC = r.find(x => x.method === 'FleissCC')!
    expect(fleissCC.cases).toBeGreaterThanOrEqual(fleiss.cases)
  })
})