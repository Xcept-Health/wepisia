// src/client/src/calculators/contingency/r_by_c.ts
import jStat from 'jstat'

export interface ChiSquareResult {
  chiSquare: number
  degreesOfFreedom: number
  pValue: number
  cramersV: number
  expected: number[][]
}

/**
 * Calcule les fréquences attendues sous l'hypothèse d'indépendance.
 * Si le total général est nul, retourne une matrice de zéros.
 */
export function computeExpectedFrequencies(
  rows: number,
  cols: number,
  rowTotals: number[],
  colTotals: number[],
  grandTotal: number
): number[][] {
  const expected: number[][] = []

  // Éviter la division par zéro
  if (grandTotal === 0) {
    for (let i = 0; i < rows; i++) {
      expected[i] = Array(cols).fill(0)
    }
    return expected
  }

  for (let i = 0; i < rows; i++) {
    expected[i] = []
    for (let j = 0; j < cols; j++) {
      expected[i][j] = (rowTotals[i] * colTotals[j]) / grandTotal
    }
  }

  return expected
}

/**
 * Calcule le test du chi-square pour un tableau de contingence.
 * Retourne null si le tableau est invalide (vide, non rectangulaire, valeurs négatives).
 * Si toutes les cellules sont nulles, retourne un résultat avec chi² = 0.
 */
export function calculateChiSquare(table: number[][]): ChiSquareResult | null {
  // Validation de base
  if (!table.length || !table[0]?.length) return null
  const rows = table.length
  const cols = table[0].length
  if (rows < 2 || cols < 2) return null

  // Vérifier que toutes les lignes ont le même nombre de colonnes
  if (table.some(row => row.length !== cols)) return null

  // Vérifier l'absence de valeurs négatives
  if (table.some(row => row.some(cell => cell < 0))) return null

  // Calcul des totaux
  const rowTotals = table.map(row => row.reduce((sum, cell) => sum + cell, 0))
  const colTotals = Array(cols).fill(0)
  let grandTotal = 0

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      colTotals[j] += table[i][j]
      grandTotal += table[i][j]
    }
  }

  // Cas particulier : tableau entièrement nul
  if (grandTotal === 0) {
    const expected = computeExpectedFrequencies(rows, cols, rowTotals, colTotals, grandTotal)
    return {
      chiSquare: 0,
      degreesOfFreedom: (rows - 1) * (cols - 1),
      pValue: 1,
      cramersV: 0,
      expected
    }
  }

  // Calcul des fréquences attendues
  const expected = computeExpectedFrequencies(rows, cols, rowTotals, colTotals, grandTotal)

  // Calcul du chi-square
  let chiSquare = 0
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const exp = expected[i][j]
      if (exp > 0) {
        const diff = table[i][j] - exp
        chiSquare += (diff * diff) / exp
      }
    }
  }

  const degreesOfFreedom = (rows - 1) * (cols - 1)
  const pValue = 1 - jStat.chisquare.cdf(chiSquare, degreesOfFreedom)

  // Cramér's V
  const n = grandTotal
  const k = Math.min(rows, cols) - 1
  const cramersV = k > 0 ? Math.sqrt(chiSquare / (n * k)) : 0

  return {
    chiSquare,
    degreesOfFreedom,
    pValue,
    cramersV,
    expected
  }
}

/**
 * Formate une p-value pour l'affichage
 */
export function formatPValue(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '-'
  if (value === 0) return '0.0000'
  if (value === 1) return '1.0000'

  if (value < 0.001) {
    return value.toExponential(3)
  }

  return value.toFixed(4)
}