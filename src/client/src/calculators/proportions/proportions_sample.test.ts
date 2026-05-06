import { describe, it, expect } from 'vitest'
import { zForConf, computeSampleSize, computeAllSampleSizes } from './proportions_sample'

// Référence OpenEpi SSPropor : N=1000000, p=50%, d=5%, deff=1, conf=95%
const N = 1_000_000, P = 50, D = 5, DEFF = 1

describe('zForConf', () => {
  it('z(95) ≈ 1.96', () => expect(zForConf(95)).toBeCloseTo(1.96, 2))
  it('z(99) > z(95)', () => expect(zForConf(99)).toBeGreaterThan(zForConf(95)))
  it('z(90) < z(95)', () => expect(zForConf(90)).toBeLessThan(zForConf(95)))
})

describe('computeSampleSize', () => {
  it('résultat > 0 pour paramètres valides', () => {
    expect(computeSampleSize(N, P, D, DEFF, 95)).toBeGreaterThan(0)
  })
  it('retourne 0 pour p = 0%', () => {
    expect(computeSampleSize(N, 0, D, DEFF, 95)).toBe(0)
  })
  it('retourne 0 pour p = 100%', () => {
    expect(computeSampleSize(N, 100, D, DEFF, 95)).toBe(0)
  })
  it('taille <= N', () => {
    expect(computeSampleSize(N, P, D, DEFF, 95)).toBeLessThanOrEqual(N)
  })
  it('conf plus élevé => taille plus grande', () => {
    const n95 = computeSampleSize(N, P, D, DEFF, 95)
    const n99 = computeSampleSize(N, P, D, DEFF, 99)
    expect(n99).toBeGreaterThan(n95)
  })
  it('précision plus fine => taille plus grande', () => {
    const n5  = computeSampleSize(N, P, 5,  DEFF, 95)
    const n2  = computeSampleSize(N, P, 2,  DEFF, 95)
    expect(n2).toBeGreaterThan(n5)
  })
  it('deff > 1 => taille plus grande', () => {
    const n1  = computeSampleSize(N, P, D, 1, 95)
    const n2  = computeSampleSize(N, P, D, 2, 95)
    expect(n2).toBeGreaterThan(n1)
  })
  it('p = 50% maximise la taille', () => {
    const n50 = computeSampleSize(N, 50, D, DEFF, 95)
    const n30 = computeSampleSize(N, 30, D, DEFF, 95)
    expect(n50).toBeGreaterThanOrEqual(n30)
  })
  it('petite population => taille <= N', () => {
    const nSmall = computeSampleSize(100, P, D, DEFF, 95)
    expect(nSmall).toBeLessThanOrEqual(100)
  })
  it('résultat est un entier (Math.ceil)', () => {
    const n = computeSampleSize(N, P, D, DEFF, 95)
    expect(Number.isInteger(n)).toBe(true)
  })
})

describe('computeAllSampleSizes', () => {
  const results = computeAllSampleSizes(N, P, D, DEFF)

  it('retourne 7 niveaux', () => expect(results).toHaveLength(7))

  it('niveaux = [80,90,95,97,99,99.9,99.99]', () => {
    expect(results.map(r => r.confidenceLevel)).toEqual([80, 90, 95, 97, 99, 99.9, 99.99])
  })
  it('taille croissante avec le niveau de confiance', () => {
    for (let i = 1; i < results.length; i++) {
      expect(results[i].sampleSize).toBeGreaterThanOrEqual(results[i - 1].sampleSize)
    }
  })
  it('toutes les tailles > 0 pour p = 50%', () => {
    results.forEach(r => expect(r.sampleSize).toBeGreaterThan(0))
  })
  it('toutes les tailles sont des entiers', () => {
    results.forEach(r => expect(Number.isInteger(r.sampleSize)).toBe(true))
  })
})