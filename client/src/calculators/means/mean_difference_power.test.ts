import { describe, it, expect } from 'vitest'
import {
  parseRawData, calculateDescriptiveStats,
  normalCDF, calculateCohensD, getEffectSizeInterpretation, pooledSD
} from './mean_difference_power'

// Exemple : mean1=25.4 sd1=4.2 n1=30 vs mean2=22.1 sd2=3.8 n2=25
const G1 = { mean: 25.4, sd: 4.2, n: 30 }
const G2 = { mean: 22.1, sd: 3.8, n: 25 }

describe('parseRawData', () => {
  it('parse une liste séparée par virgules', () => {
    expect(parseRawData('1,2,3')).toEqual([1, 2, 3])
  })
  it('parse une liste séparée par espaces', () => {
    expect(parseRawData('1 2 3')).toEqual([1, 2, 3])
  })
  it('ignore les valeurs non numériques', () => {
    expect(parseRawData('1, abc, 3')).toEqual([1, 3])
  })
  it('retourne [] pour texte vide', () => {
    expect(parseRawData('')).toEqual([])
  })
  it('parse des décimales', () => {
    expect(parseRawData('1.5, 2.5')).toEqual([1.5, 2.5])
  })
})

describe('calculateDescriptiveStats', () => {
  const data = [2, 4, 4, 4, 5, 5, 7, 9]
  const r = calculateDescriptiveStats(data)

  it('mean correcte', () => {
    expect(r.mean).toBeCloseTo(5, 4)
  })
  it('sd correcte', () => {
    expect(r.sd).toBeCloseTo(2.138, 2)
  })
  it('n correct', () => {
    expect(r.n).toBe(8)
  })
  it('min/max corrects', () => {
    expect(r.min).toBe(2)
    expect(r.max).toBe(9)
  })
  it('se = sd/sqrt(n)', () => {
    expect(r.se).toBeCloseTo(r.sd / Math.sqrt(r.n), 6)
  })
  it('retourne zéros pour data vide', () => {
    const empty = calculateDescriptiveStats([])
    expect(empty.n).toBe(0)
    expect(empty.mean).toBe(0)
  })
})

describe('normalCDF', () => {
  it('CDF(0) = 0.5', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 4)
  })
  it('CDF(1.96) ≈ 0.975', () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2)
  })
  it('CDF(-z) = 1 - CDF(z)', () => {
    expect(normalCDF(-1.5)).toBeCloseTo(1 - normalCDF(1.5), 4)
  })
  it('CDF croissante', () => {
    expect(normalCDF(1)).toBeGreaterThan(normalCDF(0))
  })
})

describe('calculateCohensD', () => {
  it('d = 0 pour groupes identiques', () => {
    const s = { mean: 50, sd: 10, n: 30 }
    expect(calculateCohensD(s, s)).toBeCloseTo(0, 6)
  })
  it('d > 0 si mean1 > mean2', () => {
    expect(calculateCohensD(G1, G2)).toBeGreaterThan(0)
  })
  it('d de Cohen pour exemple de référence', () => {
    // pooledSD = sqrt((29*17.64 + 24*14.44)/53) ≈ 4.02
    // d = 3.3 / 4.02 ≈ 0.82
    expect(calculateCohensD(G1, G2)).toBeCloseTo(0.82, 1)
  })
  it('antisymétrique : d(G1,G2) = -d(G2,G1)', () => {
    expect(calculateCohensD(G1, G2)).toBeCloseTo(-calculateCohensD(G2, G1), 6)
  })
})

describe('getEffectSizeInterpretation', () => {
  it('< 0.2 => Très petit', () => expect(getEffectSizeInterpretation(0.1)).toBe('Très petit'))
  it('0.2-0.5 => Petit',     () => expect(getEffectSizeInterpretation(0.3)).toBe('Petit'))
  it('0.5-0.8 => Moyen',     () => expect(getEffectSizeInterpretation(0.6)).toBe('Moyen'))
  it('0.8-1.2 => Grand',     () => expect(getEffectSizeInterpretation(1.0)).toBe('Grand'))
  it('>= 1.2 => Très grand', () => expect(getEffectSizeInterpretation(1.5)).toBe('Très grand'))
  it('fonctionne pour d négatif (valeur absolue)', () => {
    expect(getEffectSizeInterpretation(-0.9)).toBe('Grand')
  })
})

describe('pooledSD', () => {
  it('pooledSD > 0', () => {
    expect(pooledSD(G1, G2)).toBeGreaterThan(0)
  })
  it('pooledSD symétrique', () => {
    expect(pooledSD(G1, G2)).toBeCloseTo(pooledSD(G2, G1), 6)
  })
  it('pooledSD = sd si variances égales', () => {
    const s1 = { mean: 10, sd: 5, n: 20 }
    const s2 = { mean: 15, sd: 5, n: 20 }
    expect(pooledSD(s1, s2)).toBeCloseTo(5, 4)
  })
})