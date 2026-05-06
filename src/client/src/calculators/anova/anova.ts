// src/client/src/calculators/anova/anova.ts

export interface AnovaGroup {
    label: string
    n: number
    mean: number
    sd: number
  }
  
  export interface AnovaResult {
    totalN: number
    grandMean: number
    ssb: number
    ssw: number
    sst: number
    dfBetween: number
    dfWithin: number
    dfTotal: number
    msb: number
    msw: number
    fStat: number
  }
  
  export interface BartlettResult {
    chi2: number
    df: number
  }
  
  export interface GroupCI {
    label: string
    n: number
    mean: number
    sd: number
    seSelf: number
    ciSelfLower: number
    ciSelfUpper: number
    ciPooledLower: number
    ciPooledUpper: number
  }
  
  // Tout ce qui est purement mathématique, sans jStat, sans React
  export function computeAnovaTable(groups: AnovaGroup[]): AnovaResult {
    if (groups.length < 2) throw new Error('Au moins 2 groupes requis')
    groups.forEach(g => {
      if (g.n < 2) throw new Error(`Groupe "${g.label}" : n doit être >= 2`)
      if (g.sd <= 0) throw new Error(`Groupe "${g.label}" : sd doit être > 0`)
    })
  
    const totalN = groups.reduce((sum, g) => sum + g.n, 0)
    const grandMean = groups.reduce((sum, g) => sum + g.n * g.mean, 0) / totalN
  
    let ssb = 0, ssw = 0
    groups.forEach(g => {
      ssb += g.n * Math.pow(g.mean - grandMean, 2)
      ssw += (g.n - 1) * Math.pow(g.sd, 2)
    })
  
    const k = groups.length
    const dfBetween = k - 1
    const dfWithin = totalN - k
  
    const msb = ssb / dfBetween
    const msw = ssw / dfWithin
  
    return {
      totalN, grandMean,
      ssb, ssw, sst: ssb + ssw,
      dfBetween, dfWithin, dfTotal: totalN - 1,
      msb, msw,
      fStat: msb / msw,
    }
  }
  
  export function computeBartlett(groups: AnovaGroup[], msw: number, dfWithin: number): BartlettResult {
    const k = groups.length
    const pooledVar = msw  // msw = ssw / dfWithin = variance poolée
  
    let numerator = 0
    let sumInvDf = 0
    groups.forEach(g => {
      const df = g.n - 1
      numerator += df * Math.log(Math.pow(g.sd, 2))
      sumInvDf += 1 / df
    })
  
    const T = dfWithin * Math.log(pooledVar) - numerator
    const C = 1 + (1 / (3 * (k - 1))) * (sumInvDf - 1 / dfWithin)
  
    return {
      chi2: T / C,
      df: k - 1,
    }
  }
  
  export function computeGroupCIs(
    groups: AnovaGroup[],
    msw: number,
    dfWithin: number,
    tCritical: number,     // fourni par jStat depuis le composant
    tCriticalSelf: (df: number) => number  // callback pour t par groupe
  ): GroupCI[] {
    return groups.map(g => {
      const seSelf = g.sd / Math.sqrt(g.n)
      const tSelf = tCriticalSelf(g.n - 1)
  
      const sePooled = Math.sqrt(msw / g.n)
  
      return {
        label: g.label,
        n: g.n,
        mean: g.mean,
        sd: g.sd,
        seSelf,
        ciSelfLower: g.mean - tSelf * seSelf,
        ciSelfUpper: g.mean + tSelf * seSelf,
        ciPooledLower: g.mean - tCritical * sePooled,
        ciPooledUpper: g.mean + tCritical * sePooled,
      }
    })
  }
  
  export function formatNumber(num: number, decimals: number = 4): string {
    if (num === Infinity || num === -Infinity) return '∞'
    if (isNaN(num) || !isFinite(num)) return '-'
    return num.toFixed(decimals)
  }