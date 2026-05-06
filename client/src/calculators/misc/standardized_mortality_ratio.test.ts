// src/calculators/misc/standardized_mortality_ratio.test.ts
import { describe, it, expect } from 'vitest';
import {
  exactCI,
  exactP,
  midPCI,
  midPP,
  byarCI,
  byarP,
  vdbCI,
  vdbP,
  rgCI,
  rgP,
  chi2Compute,
  computeSmr,
  zScore,
} from './standardized_mortality_ratio'; // adapter le chemin si nécessaire

// Aucun mock de jStat – on utilise la vraie bibliothèque pour des tests exacts

describe('SMR Calculations', () => {
  describe('zScore', () => {
    it('retourne les bonnes valeurs pour 90%, 95%, 99%', () => {
      expect(zScore(90)).toBe(1.645);
      expect(zScore(95)).toBe(1.96);
      expect(zScore(99)).toBe(2.576);
      expect(zScore(80)).toBe(1.96); // défaut 95%
    });
  });

  describe('exactCI (Garwood)', () => {
    it('obs > 0', () => {
      const ci = exactCI(10, 5, 0.05);
      // On ne teste pas des valeurs absolues précises mais la cohérence
      expect(ci.lower).toBeGreaterThan(0);
      expect(ci.upper).toBeGreaterThan(ci.lower);
      expect(ci.lower).toBeLessThan(1);
      expect(ci.upper).toBeGreaterThan(1);
    });

    it('obs = 0', () => {
      const ci = exactCI(0, 5, 0.05);
      expect(ci.lower).toBe(0);
      // χ²(0.95, df=2) = 5.9915, divisé par (2*5) = 0.59915
      expect(ci.upper).toBeCloseTo(0.59915, 4);
    });
  });

  describe('exactP', () => {
    it('obs < exp', () => {
      const p = exactP(3, 5);
      // 2 * P(X ≤ 3 | λ=5) = 2 * 0.2650 = 0.5300
      expect(p).toBeCloseTo(0.53, 1);
    });

    it('obs > exp', () => {
      const p = exactP(7, 5);
      // 2 * P(X ≥ 7 | λ=5) = 2 * (1 - 0.7622) = 0.4756
      expect(p).toBeCloseTo(0.476, 2);
    });
  });

  describe('midPCI', () => {
    it('obs = 0', () => {
      const ci = midPCI(0, 5, 0.05);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBeCloseTo(-Math.log(0.05) / 5, 4); // ≈ 0.59914
    });

    it('obs > 0', () => {
      const ci = midPCI(10, 5, 0.05);
      expect(ci.lower).toBeGreaterThan(0);
      expect(ci.upper).toBeGreaterThan(ci.lower);
    });
  });

  describe('byarCI', () => {
    it('obs = 0', () => {
      const ci = byarCI(0, 5, 1.96);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBeGreaterThan(0);
    });

    it('obs > 0', () => {
      const ci = byarCI(10, 5, 1.96);
      expect(ci.lower).toBeGreaterThan(0);
      expect(ci.upper).toBeGreaterThan(ci.lower);
    });
  });

  describe('vdbCI', () => {
    it('obs = 0', () => {
      const ci = vdbCI(0, 5, 1.96);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBeCloseTo(Math.pow(1.96 / 2, 2) / 5, 4); // 0.19208
    });

    it('obs > 0', () => {
      const ci = vdbCI(10, 5, 1.96);
      expect(ci.lower).toBeGreaterThan(0);
      expect(ci.upper).toBeGreaterThan(ci.lower);
    });
  });

  describe('rgCI', () => {
    it('obs = 0 → non valide', () => {
      const res = rgCI(0, 5, 1.96);
      expect(res.ciValid).toBe(false);
    });

    it('obs > 0', () => {
      const res = rgCI(10, 5, 1.96);
      expect(res.ciValid).toBe(true);
      const smr = 10 / 5;
      const hw = 1.96 / Math.sqrt(10);
      expect(res.ci.lower).toBeCloseTo(smr * Math.exp(-hw), 3);
      expect(res.ci.upper).toBeCloseTo(smr * Math.exp(hw), 3);
    });
  });

  describe('chi2Compute', () => {
    it('calcule la p-value', () => {
      const res = chi2Compute(10, 5);
      // χ² = (10-5)²/5 = 25/5 = 5, ddl=1 → p ≈ 0.0253 (bilatéral) ou 0.034 selon formule exacte
      // Ici jStat.chisquare.cdf(5,1) donne environ 0.97465 → p = 0.02535
      expect(res.p).toBeLessThan(0.05);
      expect(res.p).toBeGreaterThan(0.02);
    });
  });

  describe('computeSmr (intégration)', () => {
    it('retourne null pour des entrées invalides', () => {
      expect(computeSmr(-1, 5, 95)).toBeNull();
      expect(computeSmr(5, 0, 95)).toBeNull();
      expect(computeSmr(NaN, 5, 95)).toBeNull();
    });

    it('calcule correctement SMR = 100/80 = 1.25', () => {
      const res = computeSmr(100, 80, 95);
      expect(res).not.toBeNull();
      expect(res!.smr).toBe(1.25);
      expect(res!.confidenceLevel).toBe(95);
      expect(res!.exact.ci.lower).toBeGreaterThan(0);
      expect(res!.exact.ci.upper).toBeGreaterThan(1.25);
      expect(res!.chi2.p).toBeLessThan(0.05);
    });

    it('cas particulier obs = 0', () => {
      const res = computeSmr(0, 10, 95);
      expect(res).not.toBeNull();
      expect(res!.smr).toBe(0);
      expect(res!.exact.ci.lower).toBe(0);
      expect(res!.exact.ci.upper).toBeGreaterThan(0);
      expect(res!.rg.ciValid).toBe(false);
    });

    it('les différentes méthodes retournent des CI valides', () => {
      const res = computeSmr(50, 40, 95);
      expect(res!.exact.ciValid).toBe(true);
      expect(res!.midP.ciValid).toBe(true);
      expect(res!.byar.ciValid).toBe(true);
      expect(res!.vdb.ciValid).toBe(true);
      expect(res!.rg.ciValid).toBe(true);
      expect(res!.chi2.ciValid).toBe(false);
    });
  });
});