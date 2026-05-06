// src/client/src/calculators/case_control/sample_size_unmatched_case_control.ts

export function oddsRatioFromProportions(p1Pct: number, p2Pct: number): number {
    if (p1Pct <= 0 || p2Pct <= 0) return 0
    const odds1 = p1Pct / (100 - p1Pct)
    const odds2 = p2Pct / (100 - p2Pct)
    return odds1 / odds2
  }
  
  export function p1FromOR(p2Pct: number, or: number): number {
    const odds2 = p2Pct / (100 - p2Pct)
    const odds1 = or * odds2
    return (odds1 / (1 + odds1)) * 100
  }
  
  export interface CaseControlResult {
    kelsey:   { n1: number; n2: number; total: number }
    fleiss:   { n1: number; n2: number; total: number }
    fleissCC: { n1: number; n2: number; total: number }
  }
  
  export function computeCaseControlSampleSize(
    zAlpha: number,
    zBeta:  number,
    k:      number,   // ratio témoins/cas
    p1:     number,   // proportion cas exposés (0..1)
    p2:     number,   // proportion témoins exposés (0..1)
  ): CaseControlResult {
    const q1 = 1 - p1, q2 = 1 - p2
    const diff = p1 - p2
  
    // Kelsey
    const kelsey_n1_float = Math.pow(zAlpha + zBeta, 2) * (p1 * q1 + (p2 * q2) / k) / Math.pow(diff, 2)
    const kelsey_n1 = Math.ceil(kelsey_n1_float)
    const kelsey_n2 = Math.ceil(kelsey_n1_float * k)
  
    // Fleiss
    const p_bar = (p1 + k * p2) / (1 + k)
    const q_bar = 1 - p_bar
    const fleiss_n1_float = Math.pow(
      zAlpha * Math.sqrt((1 + 1 / k) * p_bar * q_bar) +
      zBeta  * Math.sqrt(p1 * q1 / k + p2 * q2),
      2
    ) / Math.pow(diff, 2)
    const fleiss_n1 = Math.ceil(fleiss_n1_float)
    const fleiss_n2 = Math.ceil(fleiss_n1_float * k)
  
    // Fleiss avec CC
    let fleissCC_n1_float = fleiss_n1_float
    if (fleiss_n1_float > 0) {
      const corr = 1 + Math.sqrt(1 + 2 * (k + 1) / (fleiss_n1_float * k * Math.pow(diff, 2)))
      fleissCC_n1_float = (fleiss_n1_float / 4) * Math.pow(corr, 2)
    }
    const fleissCC_n1 = Math.ceil(fleissCC_n1_float)
    const fleissCC_n2 = Math.ceil(fleissCC_n1_float * k)
  
    return {
      kelsey:   { n1: kelsey_n1,   n2: kelsey_n2,   total: kelsey_n1   + kelsey_n2   },
      fleiss:   { n1: fleiss_n1,   n2: fleiss_n2,   total: fleiss_n1   + fleiss_n2   },
      fleissCC: { n1: fleissCC_n1, n2: fleissCC_n2, total: fleissCC_n1 + fleissCC_n2 },
    }
  }