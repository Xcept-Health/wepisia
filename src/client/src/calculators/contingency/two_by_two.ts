// src/client/src/calculators/contingency/two_by_two.ts

export interface ContingencyTable {
    a: number
    b: number
    c: number
    d: number
  }
  
  export interface ConfidenceInterval {
    lower: number
    upper: number
  }
  
  export interface TableTotals {
    totalExposed: number
    totalUnexposed: number
    totalDiseased: number
    totalUndiseased: number
    total: number
  }
  
  export interface MeasureWithCI {
    point: number
    ci95: ConfidenceInterval
  }
  
  export interface ChiSquareResults {
    uncorrected: number
    mantelHaenszel: number
    yates: number
  }
  
  export interface FisherResults {
    oneTail: number
    twoTail: number
    midPOneTail: number
    midPTwoTail: number
  }
  
  export interface AttributableFractions {
    fracExp: number
    fracExpCI: ConfidenceInterval
    fracPop: number | null
    fracPopCI: ConfidenceInterval | null
  }
  
  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  
  export function computeTotals(t: ContingencyTable): TableTotals {
    return {
      totalExposed:   t.a + t.b,
      totalUnexposed: t.c + t.d,
      totalDiseased:  t.a + t.c,
      totalUndiseased: t.b + t.d,
      total:          t.a + t.b + t.c + t.d,
    }
  }
  
  export function combination(n: number, k: number): number {
    if (k < 0 || k > n) return 0
    if (k === 0 || k === n) return 1
    k = Math.min(k, n - k)
    let result = 1
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1)
    }
    return result
  }
  
  export function hypergeometricPdf(
    k: number, n: number, K: number, N: number
  ): number {
    if (k < Math.max(0, n + K - N) || k > Math.min(n, K)) return 0
    return (combination(K, k) * combination(N - K, n - k)) / combination(N, n)
  }
  
  // ----------------------------------------------------------------
  // Odds Ratio (Woolf / Taylor series)
  // Reference: OpenEpi TwobyTwo - https://www.openepi.com/TwobyTwo/TwobyTwo.htm
  // ----------------------------------------------------------------
  
  export function computeOddsRatio(t: ContingencyTable): MeasureWithCI | null {
    const { a, b, c, d } = t
    if (b === 0 || c === 0) return null
    const or = (a * d) / (b * c)
    const lnOR = Math.log(or)
    const se = Math.sqrt(1/a + 1/b + 1/c + 1/d)
    return {
      point: or,
      ci95: {
        lower: Math.exp(lnOR - 1.96 * se),
        upper: Math.exp(lnOR + 1.96 * se),
      },
    }
  }
  
  // ----------------------------------------------------------------
  // Relative Risk (Taylor series)
  // ----------------------------------------------------------------
  
  export function computeRelativeRisk(t: ContingencyTable): MeasureWithCI | null {
    const { a, b, c, d } = t
    const r1 = a + b
    const r2 = c + d
    if (r1 === 0 || r2 === 0 || c === 0) return null
    const incExp = a / r1
    const incUnexp = c / r2
    const rr = incExp / incUnexp
    if (!Number.isFinite(rr) || rr <= 0) return null
    const lnRR = Math.log(rr)
    const se = Math.sqrt(b / (a * r1) + d / (c * r2))
    return {
      point: rr,
      ci95: {
        lower: Math.exp(lnRR - 1.96 * se),
        upper: Math.exp(lnRR + 1.96 * se),
      },
    }
  }
  
  // ----------------------------------------------------------------
  // Chi-square statistics (valeurs brutes, sans p-value)
  // Les p-values sont calculées dans le composant via jStat
  // ----------------------------------------------------------------
  
  export function computeChiSquares(t: ContingencyTable): ChiSquareResults | null {
    const { a, b, c, d } = t
    const n = a + b + c + d
    const r1 = a + b
    const r2 = c + d
    const c1 = a + c
    const c2 = b + d
    const denom = r1 * r2 * c1 * c2
    if (denom === 0) return null
  
    const adbc = a * d - b * c
    const absadbc = Math.abs(adbc)
  
    const uncorrected    = (adbc ** 2 * n) / denom
    const mantelHaenszel = (adbc ** 2 * (n - 1)) / denom
    const yates          = Math.max(0, ((absadbc - 0.5 * n) ** 2 * n) / denom)
  
    return { uncorrected, mantelHaenszel, yates }
  }
  
  // ----------------------------------------------------------------
  // Fisher's exact test (purement mathématique via hypergeometricPdf)
  // ----------------------------------------------------------------
  
  export function computeFisher(t: ContingencyTable): FisherResults | null {
    const { a, b, c, d } = t
    const n  = a + b + c + d
    const r1 = a + b
    const c1 = a + c
    if (n === 0) return null
  
    const minA = Math.max(0, r1 + c1 - n)
    const maxA = Math.min(r1, c1)
    const expected = (r1 * c1) / n
    const observedProb = hypergeometricPdf(a, r1, c1, n)
  
    let oneTail = 0
    let twoTail = 0
  
    for (let k = minA; k <= maxA; k++) {
      const p = hypergeometricPdf(k, r1, c1, n)
      if (p <= observedProb + Number.EPSILON) twoTail += p
      if (a >= expected ? k >= a : k <= a) oneTail += p
    }
  
    return {
      oneTail,
      twoTail,
      midPOneTail: Math.max(0, oneTail - 0.5 * observedProb),
      midPTwoTail: Math.max(0, twoTail - observedProb),
    }
  }
  
  // ----------------------------------------------------------------
  // Risk Difference
  // ----------------------------------------------------------------
  
  export function computeRiskDifference(t: ContingencyTable): MeasureWithCI | null {
    const { a, b, c, d } = t
    const r1 = a + b
    const r2 = c + d
    if (r1 === 0 || r2 === 0) return null
  
    const incExp   = a / r1
    const incUnexp = c / r2
    const rd = incExp - incUnexp
    const se = Math.sqrt(
      incExp   * (1 - incExp)   / r1 +
      incUnexp * (1 - incUnexp) / r2
    )
    return {
      point: rd,
      ci95: { lower: rd - 1.96 * se, upper: rd + 1.96 * se },
    }
  }
  
  // ----------------------------------------------------------------
  // Proportion CI (Taylor) — pour les risques individuels
  // ----------------------------------------------------------------
  
  export function computeProportionCI(
    prop: number, total: number
  ): ConfidenceInterval {
    const se = Math.sqrt(prop * (1 - prop) / total)
    return {
      lower: Math.max(0, prop - 1.96 * se),
      upper: Math.min(1, prop + 1.96 * se),
    }
  }
  
  // ----------------------------------------------------------------
  // Fractions attribuables basées sur le RR
  // ----------------------------------------------------------------
  
  export function computeAttributableFractionsRR(
    rr: MeasureWithCI,
    proportionExposed: number
  ): AttributableFractions {
    const { point, ci95 } = rr
  
    const fracExp   = (point - 1) / point
    const fracExpCI = {
      lower: (ci95.lower - 1) / ci95.lower,
      upper: (ci95.upper - 1) / ci95.upper,
    }
  
    const levin = (r: number) => {
      const num = proportionExposed * (r - 1)
      return num + 1 > 0 ? num / (num + 1) : null
    }
  
    const fracPopPoint = levin(point)
    const fracPopLower = levin(ci95.lower)
    const fracPopUpper = levin(ci95.upper)
  
    return {
      fracExp,
      fracExpCI,
      fracPop: fracPopPoint,
      fracPopCI:
        fracPopLower !== null && fracPopUpper !== null
          ? { lower: fracPopLower, upper: fracPopUpper }
          : null,
    }
  }
  

  // Fractions attribuables basées sur l'OR

  export function computeAttributableFractionsOR(
    or: MeasureWithCI,
    proportionCasesExposed: number
  ): AttributableFractions {
    const { point, ci95 } = or
  
    const fracExp   = (point - 1) / point
    const fracExpCI = {
      lower: (ci95.lower - 1) / ci95.lower,
      upper: (ci95.upper - 1) / ci95.upper,
    }
  
    return {
      fracExp,
      fracExpCI,
      fracPop: proportionCasesExposed * fracExp,
      fracPopCI: {
        lower: proportionCasesExposed * fracExpCI.lower,
        upper: proportionCasesExposed * fracExpCI.upper,
      },
    }
  }
