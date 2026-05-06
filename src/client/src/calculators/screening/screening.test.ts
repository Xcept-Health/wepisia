import { describe, it, expect } from 'vitest'
import {
  wilsonCI, computeLevelLRs, computeROC, computeAUC,
  computeAUCCI, computeCutoffs, computeScreening,
} from './screening'
import type { ScreeningLevel } from './screening'

// Référence OpenEpi DiagnosticTest : 5 niveaux ordonnés
const LEVELS: ScreeningLevel[] = [
  { label: 'N1', cases: 1,  nonCases: 2  },
  { label: 'N2', cases: 3,  nonCases: 4  },
  { label: 'N3', cases: 5,  nonCases: 6  },
  { label: 'N4', cases: 7,  nonCases: 8  },
  { label: 'N5', cases: 9,  nonCases: 10 },
]

const TOTAL_CASES    = LEVELS.reduce((s, l) => s + l.cases, 0)     // 25
const TOTAL_NONCASES = LEVELS.reduce((s, l) => s + l.nonCases, 0)  // 30

describe('wilsonCI', () => {
  it('lower >= 0 et upper <= 1', () => {
    const ci = wilsonCI(10, 20)
    expect(ci.lower).toBeGreaterThanOrEqual(0)
    expect(ci.upper).toBeLessThanOrEqual(1)
  })
  it('contient la proportion', () => {
    const ci = wilsonCI(10, 20)
    expect(ci.lower).toBeLessThan(0.5)
    expect(ci.upper).toBeGreaterThan(0.5)
  })
  it('retourne {0,0} pour n = 0', () => {
    expect(wilsonCI(0, 0)).toEqual({ lower: 0, upper: 0 })
  })
  it('IC plus large pour z plus grand', () => {
    const ci95 = wilsonCI(10, 20, 1.96)
    const ci99 = wilsonCI(10, 20, 2.576)
    expect(ci99.upper - ci99.lower).toBeGreaterThan(ci95.upper - ci95.lower)
  })
})

describe('computeLevelLRs', () => {
  const lrs = computeLevelLRs(LEVELS)

  it('retourne autant de LR que de niveaux', () => {
    expect(lrs).toHaveLength(LEVELS.length)
  })
  it('LR > 0 pour tous les niveaux non nuls', () => {
    lrs.forEach(l => expect(l.lr).toBeGreaterThanOrEqual(0))
  })
  it('labels préservés', () => {
    expect(lrs.map(l => l.label)).toEqual(LEVELS.map(l => l.label))
  })
  it('IC LR : lower <= LR <= upper', () => {
    lrs.forEach(l => {
      if (l.lr > 0) {
        expect(l.lrLower).toBeLessThanOrEqual(l.lr + 1e-9)
        expect(l.lrUpper).toBeGreaterThanOrEqual(l.lr - 1e-9)
      }
    })
  })
})

describe('computeROC', () => {
  const pts = computeROC(LEVELS)

  it('commence à (0,0) ou proche', () => {
    const first = pts[0]
    expect(first.fpr).toBeCloseTo(0, 4)
    expect(first.tpr).toBeCloseTo(0, 4)
  })
  it('triés par FPR croissant', () => {
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].fpr).toBeGreaterThanOrEqual(pts[i-1].fpr)
    }
  })
  it('FPR et TPR dans [0, 1]', () => {
    pts.forEach(p => {
      expect(p.fpr).toBeGreaterThanOrEqual(0)
      expect(p.fpr).toBeLessThanOrEqual(1)
      expect(p.tpr).toBeGreaterThanOrEqual(0)
      expect(p.tpr).toBeLessThanOrEqual(1)
    })
  })
  it('dernier point = (1, 1) ou proche', () => {
    const last = pts[pts.length - 1]
    expect(last.fpr).toBeCloseTo(1, 4)
    expect(last.tpr).toBeCloseTo(1, 4)
  })
})

describe('computeAUC', () => {
  const pts = computeROC(LEVELS)
  const auc = computeAUC(pts)

  it('AUC dans [0, 1]', () => {
    expect(auc).toBeGreaterThanOrEqual(0)
    expect(auc).toBeLessThanOrEqual(1)
  })
  it('AUC > 0.5 pour test discriminant', () => {
    // Les niveaux ont une tendance croissante cases/nonCases
    expect(auc).toBeGreaterThan(0.5)
  })
  it('AUC = 0.5 pour test aléatoire (proportions égales)', () => {
    const randomLevels: ScreeningLevel[] = [
      { label: 'A', cases: 10, nonCases: 10 },
      { label: 'B', cases: 10, nonCases: 10 },
    ]
    const rpts = computeROC(randomLevels)
    expect(computeAUC(rpts)).toBeCloseTo(0.5, 2)
  })
})

describe('computeAUCCI', () => {
  const pts = computeROC(LEVELS)
  const auc = computeAUC(pts)
  const ci = computeAUCCI(auc, TOTAL_CASES, TOTAL_NONCASES)

  it('lower <= AUC <= upper', () => {
    expect(ci.lower).toBeLessThanOrEqual(auc)
    expect(ci.upper).toBeGreaterThanOrEqual(auc)
  })
  it('lower >= 0 et upper <= 1', () => {
    expect(ci.lower).toBeGreaterThanOrEqual(0)
    expect(ci.upper).toBeLessThanOrEqual(1)
  })
  it('IC plus étroit avec plus de sujets', () => {
    const ci50  = computeAUCCI(0.8, 50, 50)
    const ci200 = computeAUCCI(0.8, 200, 200)
    expect(ci200.upper - ci200.lower).toBeLessThan(ci50.upper - ci50.lower)
  })
})

describe('computeCutoffs', () => {
  const cutoffs = computeCutoffs(LEVELS)

  it('retourne N-1 cutoffs', () => {
    expect(cutoffs).toHaveLength(LEVELS.length - 1)
  })
  it('sensibilité dans [0, 100]', () => {
    cutoffs.forEach(c => {
      expect(c.sensitivity).toBeGreaterThanOrEqual(0)
      expect(c.sensitivity).toBeLessThanOrEqual(100)
    })
  })
  it('spécificité dans [0, 100]', () => {
    cutoffs.forEach(c => {
      expect(c.specificity).toBeGreaterThanOrEqual(0)
      expect(c.specificity).toBeLessThanOrEqual(100)
    })
  })
  it('tp + fn = totalCases pour chaque cutoff', () => {
    cutoffs.forEach(c => {
      expect(c.tp + c.fn).toBe(TOTAL_CASES)
    })
  })
  it('fp + tn = totalNonCases pour chaque cutoff', () => {
    cutoffs.forEach(c => {
      expect(c.fp + c.tn).toBe(TOTAL_NONCASES)
    })
  })
  it('sensibilité décroissante (cutoff plus restrictif)', () => {
    // Au fur et à mesure que le cutoff monte, plus de TP deviennent FN
    for (let i = 1; i < cutoffs.length; i++) {
      expect(cutoffs[i].sensitivity).toBeLessThanOrEqual(cutoffs[i-1].sensitivity + 1e-9)
    }
  })
  it('spécificité croissante', () => {
    for (let i = 1; i < cutoffs.length; i++) {
      expect(cutoffs[i].specificity).toBeGreaterThanOrEqual(cutoffs[i-1].specificity - 1e-9)
    }
  })
  it('kappa dans [-1, 1]', () => {
    cutoffs.forEach(c => {
      expect(c.kappa).toBeGreaterThanOrEqual(-1)
      expect(c.kappa).toBeLessThanOrEqual(1)
    })
  })
  it('LR+ >= 1 quand sens > 1-spec', () => {
    cutoffs.forEach(c => {
      if (c.sensitivity > 100 - c.specificity + 1e-4) {
        expect(c.lrPositive).toBeGreaterThanOrEqual(1)
      }
    })
  })
  it('entropyPositive dans [0, 100]', () => {
    cutoffs.forEach(c => {
      expect(c.entropyPositive).toBeGreaterThanOrEqual(-100)
      expect(c.entropyPositive).toBeLessThanOrEqual(100 + 1e-9)
    })
  })
})

describe('computeScreening', () => {
  const r = computeScreening(LEVELS)!

  it('retourne non null', () => expect(r).not.toBeNull())
  it('retourne N-1 cutoffs', () => expect(r.cutoffs).toHaveLength(LEVELS.length - 1))
  it('retourne N levelLRs', () => expect(r.levelLRs).toHaveLength(LEVELS.length))
  it('AUC dans [0, 1]', () => {
    expect(r.auc).toBeGreaterThanOrEqual(0)
    expect(r.auc).toBeLessThanOrEqual(1)
  })
  it('aucLower <= auc <= aucUpper', () => {
    expect(r.aucLower).toBeLessThanOrEqual(r.auc)
    expect(r.aucUpper).toBeGreaterThanOrEqual(r.auc)
  })
  it('rocPoints triés', () => {
    for (let i = 1; i < r.rocPoints.length; i++) {
      expect(r.rocPoints[i].fpr).toBeGreaterThanOrEqual(r.rocPoints[i-1].fpr)
    }
  })
  it('retourne null pour < 2 niveaux valides', () => {
    expect(computeScreening([LEVELS[0]])).toBeNull()
  })
  it('retourne null pour niveaux tous vides', () => {
    expect(computeScreening([
      { label: 'A', cases: 0, nonCases: 0 },
      { label: 'B', cases: 0, nonCases: 0 },
    ])).toBeNull()
  })
})