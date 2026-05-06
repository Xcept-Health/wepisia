// src/client/src/calculators/means/mean_difference_power.ts

export interface GroupStats {
    mean: number; sd: number; n: number
    min?: number; max?: number; se?: number
  }
  
  export interface TTestResult {
    tStat: number; df: number; pValue: number; se: number
    ciLower: number; ciUpper: number
    testType: 'Student' | 'Welch'
  }
  
  export function parseRawData(text: string): number[] {
    if (!text.trim()) return []
    return text.split(/[,;\s\n]+/)
      .map(v => v.trim()).filter(v => v !== '')
      .map(v => parseFloat(v)).filter(v => !isNaN(v))
  }
  
  export function calculateDescriptiveStats(data: number[]): GroupStats {
    if (data.length === 0) return { mean: 0, sd: 0, n: 0, min: 0, max: 0, se: 0 }
    const n = data.length
    const mean = data.reduce((s, v) => s + v, 0) / n
    const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
    const sd = Math.sqrt(variance)
    return { mean, sd, n, min: Math.min(...data), max: Math.max(...data), se: sd / Math.sqrt(n) }
  }
  
  export function normalCDF(z: number): number {
    const erf = (x: number): number => {
      const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911
      const sign = x < 0 ? -1 : 1; x = Math.abs(x)
      const t = 1 / (1 + p * x)
      const y = ((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t
      return sign * (1 - y * Math.exp(-x * x))
    }
    return 0.5 * (1 + erf(z / Math.sqrt(2)))
  }
  
  export function calculateCohensD(s1: GroupStats, s2: GroupStats): number {
    const pooledSD = Math.sqrt(((s1.n-1)*s1.sd**2 + (s2.n-1)*s2.sd**2) / (s1.n+s2.n-2))
    return (s1.mean - s2.mean) / pooledSD
  }
  
  export function getEffectSizeInterpretation(d: number): string {
    const a = Math.abs(d)
    if (a < 0.2) return 'Très petit'
    if (a < 0.5) return 'Petit'
    if (a < 0.8) return 'Moyen'
    if (a < 1.2) return 'Grand'
    return 'Très grand'
  }
  
  export function pooledSD(s1: GroupStats, s2: GroupStats): number {
    return Math.sqrt(((s1.n-1)*s1.sd**2 + (s2.n-1)*s2.sd**2) / (s1.n+s2.n-2))
  }