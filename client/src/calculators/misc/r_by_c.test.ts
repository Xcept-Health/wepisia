// src/client/src/calculators/contingency/r_by_c.test.ts
import { describe, it, expect } from 'vitest'
import {
  calculateChiSquare,
  computeExpectedFrequencies,
  formatPValue
} from './r_by_c'

const EXAMPLE_3x3 = [
  [30, 20, 10],
  [15, 25, 20],
  [5, 10, 15]
]

const EXAMPLE_2x2 = [
  [30, 20],
  [15, 25]
]

describe('computeExpectedFrequencies', () => {
  it('calcule correctement les fréquences attendues pour un tableau 2x2', () => {
    const rowTotals = [50, 40]
    const colTotals = [45, 45]
    const grandTotal = 90

    const expected = computeExpectedFrequencies(2, 2, rowTotals, colTotals, grandTotal)

    expect(expected[0][0]).toBeCloseTo(25, 1)
    expect(expected[0][1]).toBeCloseTo(25, 1)
    expect(expected[1][0]).toBeCloseTo(20, 1)
    expect(expected[1][1]).toBeCloseTo(20, 1)
  })

  it('calcule correctement les fréquences attendues pour un tableau 3x3', () => {
    const rowTotals = EXAMPLE_3x3.map(row => row.reduce((a, b) => a + b, 0))
    const colTotals = [
      EXAMPLE_3x3.reduce((sum, row) => sum + row[0], 0),
      EXAMPLE_3x3.reduce((sum, row) => sum + row[1], 0),
      EXAMPLE_3x3.reduce((sum, row) => sum + row[2], 0)
    ]
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0)

    const expected = computeExpectedFrequencies(3, 3, rowTotals, colTotals, grandTotal)

    // Valeurs réelles : (60*50)/150 = 20, (60*55)/150 = 22, (60*45)/150 = 18
    expect(expected[0][0]).toBeCloseTo(20, 1)
    expect(expected[0][1]).toBeCloseTo(22, 1)
    expect(expected[0][2]).toBeCloseTo(18, 1)
    expect(expected[1][0]).toBeCloseTo(20, 1)   // (60*50)/150
    expect(expected[1][1]).toBeCloseTo(22, 1)
    expect(expected[1][2]).toBeCloseTo(18, 1)
    expect(expected[2][0]).toBeCloseTo(10, 1)   // (30*50)/150
    expect(expected[2][1]).toBeCloseTo(11, 1)   // (30*55)/150 = 11
    expect(expected[2][2]).toBeCloseTo(9, 1)    // (30*45)/150 = 9
  })

  it('gère les tableaux avec des totaux nuls', () => {
    const rowTotals = [0, 0]
    const colTotals = [0, 0]
    const grandTotal = 0

    const expected = computeExpectedFrequencies(2, 2, rowTotals, colTotals, grandTotal)

    expect(expected[0][0]).toBe(0)
    expect(expected[0][1]).toBe(0)
    expect(expected[1][0]).toBe(0)
    expect(expected[1][1]).toBe(0)
  })

  it('retourne des valeurs positives pour des totaux positifs', () => {
    const rowTotals = [10, 20]
    const colTotals = [15, 15]
    const grandTotal = 30

    const expected = computeExpectedFrequencies(2, 2, rowTotals, colTotals, grandTotal)

    expect(expected[0][0]).toBeGreaterThan(0)
    expect(expected[0][1]).toBeGreaterThan(0)
    expect(expected[1][0]).toBeGreaterThan(0)
    expect(expected[1][1]).toBeGreaterThan(0)
  })
})

describe('calculateChiSquare', () => {
  it('calcule correctement le chi-square pour un tableau 2x2', () => {
    const result = calculateChiSquare(EXAMPLE_2x2)

    // Chi² réel = 4.5
    expect(result?.chiSquare).toBeCloseTo(4.5, 1)
    expect(result?.degreesOfFreedom).toBe(1)
    expect(result?.pValue).toBeLessThan(0.05)
    expect(result?.pValue).toBeGreaterThan(0.03)
  })

  it('calcule correctement le chi-square pour un tableau 3x3', () => {
    const result = calculateChiSquare(EXAMPLE_3x3)

    // Chi² réel ≈ 17.2096
    expect(result?.chiSquare).toBeCloseTo(17.21, 2)
    expect(result?.degreesOfFreedom).toBe(4)
    expect(result?.pValue).toBeLessThan(0.005)
  })

  it('retourne null pour un tableau vide', () => {
    expect(calculateChiSquare([])).toBeNull()
    expect(calculateChiSquare([[]])).toBeNull()
  })

  it('retourne null pour un tableau avec des valeurs négatives', () => {
    const negativeTable = [[-1, 2], [3, 4]]
    expect(calculateChiSquare(negativeTable)).toBeNull()
  })

  it('retourne null pour un tableau non rectangulaire', () => {
    const irregularTable = [[1, 2], [3]]
    expect(calculateChiSquare(irregularTable)).toBeNull()
  })

  it('calcule correctement les degrés de liberté', () => {
    expect(calculateChiSquare([[1, 2], [3, 4]])?.degreesOfFreedom).toBe(1)
    expect(calculateChiSquare([[1, 2, 3], [4, 5, 6]])?.degreesOfFreedom).toBe(2)
    expect(calculateChiSquare([[1, 2], [3, 4], [5, 6]])?.degreesOfFreedom).toBe(2)
    expect(calculateChiSquare([[1, 2, 3], [4, 5, 6], [7, 8, 9]])?.degreesOfFreedom).toBe(4)
  })

  it('le chi-square est nul pour un tableau parfaitement indépendant', () => {
    const independentTable = [
      [10, 20, 30],
      [20, 40, 60],
      [30, 60, 90]
    ]
    const result = calculateChiSquare(independentTable)

    expect(result?.chiSquare).toBeCloseTo(0, 5)
    expect(result?.pValue).toBeCloseTo(1, 2)
  })

  it('le chi-square augmente avec la dépendance entre variables', () => {
    const weakDependence = [
      [30, 25],
      [20, 25]
    ]
    const strongDependence = [
      [40, 15],
      [10, 35]
    ]

    const weakResult = calculateChiSquare(weakDependence)
    const strongResult = calculateChiSquare(strongDependence)

    expect(strongResult?.chiSquare).toBeGreaterThan(weakResult?.chiSquare || 0)
    expect(strongResult?.pValue).toBeLessThan(weakResult?.pValue || 1)
  })
})

describe('formatPValue', () => {
  it('formate correctement les p-values standard', () => {
    expect(formatPValue(0.045)).toBe('0.0450')
    expect(formatPValue(0.00123)).toBe('0.0012')
    expect(formatPValue(0.9876)).toBe('0.9876')
  })

  it('utilise la notation exponentielle pour les très petites p-values', () => {
    expect(formatPValue(0.00001234)).toBe('1.234e-5')
    expect(formatPValue(0.000000567)).toBe('5.670e-7')
  })

  it('gère les cas limites', () => {
    expect(formatPValue(0)).toBe('0.0000')
    expect(formatPValue(1)).toBe('1.0000')
    expect(formatPValue(NaN)).toBe('-')
    expect(formatPValue(Infinity)).toBe('-')
  })
})

describe('Cas limites supplémentaires', () => {
  it('tableau 2x2 avec cellule nulle', () => {
    const table = [[0, 50], [50, 0]]
    const result = calculateChiSquare(table)
    expect(result).not.toBeNull()
    expect(result?.chiSquare).toBeGreaterThan(0)
  })

  it('tableau avec ligne constante', () => {
    const table = [[10, 10, 10], [20, 20, 20]]
    const result = calculateChiSquare(table)
    expect(result?.chiSquare).toBeCloseTo(0, 5)
  })

  it('tableau avec colonne constante', () => {
    const table = [[10, 20], [10, 20], [10, 20]]
    const result = calculateChiSquare(table)
    expect(result?.chiSquare).toBeCloseTo(0, 5)
  })

  it('tableau 1x1 invalide', () => {
    expect(calculateChiSquare([[5]])).toBeNull()
  })

  it('tableau entièrement nul', () => {
    const table = [[0, 0], [0, 0]]
    const result = calculateChiSquare(table)
    expect(result?.chiSquare).toBe(0)
    expect(result?.pValue).toBe(1)
    expect(result?.expected.every(row => row.every(v => v === 0))).toBe(true)
  })
})