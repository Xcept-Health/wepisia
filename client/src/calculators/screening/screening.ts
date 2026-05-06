// src/client/src/calculators/screening/screening.ts

export interface ScreeningLevel {
    label: string
    cases: number
    nonCases: number
  }
  
  export interface CutoffResult {
    cutoffLabel: string
    tp: number; fn: number; fp: number; tn: number
    sensitivity: number; sensitivityLower: number; sensitivityUpper: number
    specificity: number; specificityLower: number; specificityUpper: number
    ppv: number; ppvLower: number; ppvUpper: number
    npv: number; npvLower: number; npvUpper: number
    accuracy: number; accuracyLower: number; accuracyUpper: number
    lrPositive: number; lrPositiveLower: number; lrPositiveUpper: number
    lrNegative: number; lrNegativeLower: number; lrNegativeUpper: number
    oddsRatio: number; oddsRatioLower: number; oddsRatioUpper: number
    kappa: number; kappaLower: number; kappaUpper: number
    entropyPositive: number; entropyNegative: number
    biasIndex: number
  }
  
  export interface LevelLR {
    label: string; lr: number; lrLower: number; lrUpper: number
  }
  
  export interface ScreeningResults {
    cutoffs: CutoffResult[]
    levelLRs: LevelLR[]
    auc: number; aucLower: number; aucUpper: number
    rocPoints: { fpr: number; tpr: number }[]
  }
  
  export function wilsonCI(x: number, n: number, z = 1.96): { lower: number; upper: number } {
    if (n === 0) return { lower: 0, upper: 0 }
    const p = x / n, z2 = z * z
    const A = 2 * x + z2
    const B = z * Math.sqrt(z2 + 4 * x * (1 - p))
    const C = 2 * (n + z2)
    return { lower: Math.max(0, (A - B) / C), upper: Math.min(1, (A + B) / C) }
  }
  
  export function computeLevelLRs(levels: ScreeningLevel[]): LevelLR[] {
    const totalCases    = levels.reduce((s, l) => s + l.cases, 0)
    const totalNonCases = levels.reduce((s, l) => s + l.nonCases, 0)
    return levels.map(l => {
      let lr = 0, lrLower = 0, lrUpper = 0
      if (totalCases > 0 && totalNonCases > 0 && l.cases > 0 && l.nonCases > 0) {
        lr = (l.cases / l.nonCases) / (totalCases / totalNonCases)
        const se = Math.sqrt(
          (1 - l.cases / totalCases) / l.cases +
          (1 - l.nonCases / totalNonCases) / l.nonCases
        )
        const lnLR = Math.log(lr)
        lrLower = Math.exp(lnLR - 1.96 * se)
        lrUpper = Math.exp(lnLR + 1.96 * se)
      }
      return {
        label: l.label,
        lr: isFinite(lr) ? lr : 0,
        lrLower: isFinite(lrLower) ? lrLower : 0,
        lrUpper: isFinite(lrUpper) ? lrUpper : 0,
      }
    })
  }
  
  export function computeROC(levels: ScreeningLevel[]): { fpr: number; tpr: number }[] {
    const totalCases    = levels.reduce((s, l) => s + l.cases, 0)
    const totalNonCases = levels.reduce((s, l) => s + l.nonCases, 0)
    const pts: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }]
    let cumC = 0, cumNC = 0
    for (let i = levels.length - 1; i >= 0; i--) {
      cumC  += levels[i].cases
      cumNC += levels[i].nonCases
      pts.push({ fpr: cumNC / totalNonCases, tpr: cumC / totalCases })
    }
    return pts.sort((a, b) => a.fpr - b.fpr)
  }
  
  export function computeAUC(rocPoints: { fpr: number; tpr: number }[]): number {
    let auc = 0
    for (let i = 1; i < rocPoints.length; i++) {
      const p = rocPoints[i - 1], c = rocPoints[i]
      auc += (c.fpr - p.fpr) * (c.tpr + p.tpr) / 2
    }
    return auc
  }
  
  export function computeAUCCI(
    auc: number, totalCases: number, totalNonCases: number
  ): { lower: number; upper: number } {
    const Q1 = auc / (2 - auc)
    const Q2 = 2 * auc * auc / (1 + auc)
    const se = Math.sqrt(
      (auc * (1 - auc) +
       (totalCases - 1) * (Q1 - auc * auc) +
       (totalNonCases - 1) * (Q2 - auc * auc)) /
      (totalCases * totalNonCases)
    )
    return { lower: Math.max(0, auc - 1.96 * se), upper: Math.min(1, auc + 1.96 * se) }
  }
  
  export function computeCutoffs(levels: ScreeningLevel[]): CutoffResult[] {
    const totalCases    = levels.reduce((s, l) => s + l.cases, 0)
    const totalNonCases = levels.reduce((s, l) => s + l.nonCases, 0)
    const total = totalCases + totalNonCases
    const cutoffs: CutoffResult[] = []
  
    let cumCasesNeg = 0, cumNCasesNeg = 0
  
    for (let i = 0; i < levels.length - 1; i++) {
      cumCasesNeg  += levels[i].cases
      cumNCasesNeg += levels[i].nonCases
  
      const tp = totalCases - cumCasesNeg
      const fn = cumCasesNeg
      const fp = totalNonCases - cumNCasesNeg
      const tn = cumNCasesNeg
  
      const sens = tp / (tp + fn), spec = tn / (tn + fp)
      const ppv  = tp / (tp + fp), npv  = tn / (tn + fn)
      const acc  = (tp + tn) / total
  
      const sensCI = wilsonCI(tp, tp + fn)
      const specCI = wilsonCI(tn, tn + fp)
      const ppvCI  = wilsonCI(tp, tp + fp)
      const npvCI  = wilsonCI(tn, tn + fn)
      const accCI  = wilsonCI(tp + tn, total)
  
      let lrPos = 0, lrPosL = 0, lrPosU = 0
      if (tp > 0 && fp > 0) {
        lrPos = sens / (1 - spec)
        const se = Math.sqrt((1-sens)/(sens*(tp+fn)) + spec/((1-spec)*(fp+tn)))
        lrPosL = Math.exp(Math.log(lrPos) - 1.96 * se)
        lrPosU = Math.exp(Math.log(lrPos) + 1.96 * se)
      }
  
      let lrNeg = 0, lrNegL = 0, lrNegU = 0
      if (fn > 0 && tn > 0) {
        lrNeg = (1 - sens) / spec
        const se = Math.sqrt(1/fn - 1/(tp+fn) + 1/tn - 1/(tn+fp))
        lrNegL = Math.exp(Math.log(lrNeg) - 1.96 * se)
        lrNegU = Math.exp(Math.log(lrNeg) + 1.96 * se)
      }
  
      let odds = 0, oddsL = 0, oddsU = 0
      if (tp * tn > 0 && fp * fn > 0) {
        odds = (tp * tn) / (fp * fn)
        const se = Math.sqrt(1/tp + 1/tn + 1/fp + 1/fn)
        oddsL = Math.exp(Math.log(odds) - 1.96 * se)
        oddsU = Math.exp(Math.log(odds) + 1.96 * se)
      }
  
      const expectedAcc =
        ((tp+fp)/total) * ((tp+fn)/total) +
        ((fn+tn)/total) * ((fp+tn)/total)
      const kappa    = (acc - expectedAcc) / (1 - expectedAcc)
      const seKappa  = Math.sqrt((acc * (1 - acc)) / (total * (1 - expectedAcc) ** 2))
  
      const prev = totalCases / total
      const hPre = prev > 0 && prev < 1
        ? -prev * Math.log2(prev) - (1-prev) * Math.log2(1-prev) : 0
      const hPostPos = ppv > 0 && ppv < 1
        ? -ppv * Math.log2(ppv) - (1-ppv) * Math.log2(1-ppv) : 0
      const entPos = hPre > 0 ? 100 * (hPre - hPostPos) / hPre : 0
      const pDGN = fn / (fn + tn)
      const hPostNeg = pDGN > 0 && pDGN < 1
        ? -pDGN * Math.log2(pDGN) - (1-pDGN) * Math.log2(1-pDGN) : 0
      const entNeg = hPre > 0 ? 100 * (hPre - hPostNeg) / hPre : 0
      const bias = (tp+fp)/total - (tp+fn)/total
  
      cutoffs.push({
        cutoffLabel: `${levels[i].label}/${levels[i+1].label}`,
        tp, fn, fp, tn,
        sensitivity: sens*100, sensitivityLower: sensCI.lower*100, sensitivityUpper: sensCI.upper*100,
        specificity: spec*100, specificityLower: specCI.lower*100, specificityUpper: specCI.upper*100,
        ppv: ppv*100, ppvLower: ppvCI.lower*100, ppvUpper: ppvCI.upper*100,
        npv: npv*100, npvLower: npvCI.lower*100, npvUpper: npvCI.upper*100,
        accuracy: acc*100, accuracyLower: accCI.lower*100, accuracyUpper: accCI.upper*100,
        lrPositive: lrPos, lrPositiveLower: isFinite(lrPosL)?lrPosL:0, lrPositiveUpper: isFinite(lrPosU)?lrPosU:0,
        lrNegative: lrNeg, lrNegativeLower: isFinite(lrNegL)?lrNegL:0, lrNegativeUpper: isFinite(lrNegU)?lrNegU:0,
        oddsRatio: odds, oddsRatioLower: oddsL, oddsRatioUpper: oddsU,
        kappa, kappaLower: kappa - 1.96*seKappa, kappaUpper: kappa + 1.96*seKappa,
        entropyPositive: entPos, entropyNegative: entNeg,
        biasIndex: bias,
      })
    }
    return cutoffs
  }
  
  export function computeScreening(levels: ScreeningLevel[]): ScreeningResults | null {
    const valid = levels.filter(l => l.cases >= 0 && l.nonCases >= 0 && l.cases + l.nonCases > 0)
    if (valid.length < 2) return null
    const total = valid.reduce((s,l) => s + l.cases + l.nonCases, 0)
    if (total === 0) return null
  
    const rocPoints = computeROC(valid)
    const auc = computeAUC(rocPoints)
    const totalCases    = valid.reduce((s,l) => s + l.cases, 0)
    const totalNonCases = valid.reduce((s,l) => s + l.nonCases, 0)
    const aucCI = computeAUCCI(auc, totalCases, totalNonCases)
  
    return {
      cutoffs:  computeCutoffs(valid),
      levelLRs: computeLevelLRs(valid),
      auc, aucLower: aucCI.lower, aucUpper: aucCI.upper,
      rocPoints,
    }
  }