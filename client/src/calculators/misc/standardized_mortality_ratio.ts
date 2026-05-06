// smr_calculations.ts
import jStat from 'jstat';

export interface CI { lower: number; upper: number }
export interface MethodResult { ci: CI; ciValid: boolean; p: number }
export interface SmrResults {
  observed: number;
  expected: number;
  smr: number;
  confidenceLevel: number;
  exact: MethodResult;
  midP: MethodResult;
  byar: MethodResult;
  vdb: MethodResult;
  rg: MethodResult;
  chi2: MethodResult;
}

/** Two-tailed z-score for a given confidence level */
export const zScore = (cl: number): number => {
  const map: Record<number, number> = { 90: 1.645, 95: 1.96, 99: 2.576 };
  return map[cl] ?? 1.96;
};

// 1. Garwood (1936) exact Poisson CI
export function exactCI(obs: number, exp: number, alpha: number): CI {
  if (obs === 0) {
    return { lower: 0, upper: jStat.chisquare.inv(1 - alpha, 2) / (2 * exp) };
  }
  return {
    lower: jStat.chisquare.inv(alpha / 2, 2 * obs) / (2 * exp),
    upper: jStat.chisquare.inv(1 - alpha / 2, 2 * (obs + 1)) / (2 * exp),
  };
}

export function exactP(obs: number, exp: number): number {
  const cdf = jStat.poisson.cdf;
  return Math.min(1, obs < exp ? 2 * cdf(obs, exp) : 2 * (1 - cdf(obs - 1, exp)));
}

// 2. Mid-P CI (bisection)
export function midPCI(obs: number, exp: number, alpha: number): CI {
  if (obs === 0) {
    return { lower: 0, upper: -Math.log(alpha) / exp };
  }
  const half = alpha / 2;
  const cdf = jStat.poisson.cdf;
  const pdf = jStat.poisson.pdf;

  // lower bound
  let lo = 1e-9, hi = Math.max(obs * 50 + 200, 1000);
  while ((1 - cdf(obs - 1, hi)) - 0.5 * pdf(obs, hi) < half) hi *= 2;
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    if ((1 - cdf(obs - 1, m)) - 0.5 * pdf(obs, m) < half) lo = m;
    else hi = m;
  }
  const lower = (lo + hi) / 2 / exp;

  // upper bound
  lo = 1e-9, hi = Math.max(obs * 50 + 200, 1000);
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    if (cdf(obs, m) - 0.5 * pdf(obs, m) > half) lo = m;
    else hi = m;
  }
  const upper = (lo + hi) / 2 / exp;
  return { lower, upper };
}

export function midPP(obs: number, exp: number): number {
  const cdf = jStat.poisson.cdf;
  const pdf = jStat.poisson.pdf;
  const eq = pdf(obs, exp);
  const one = obs <= exp
    ? cdf(obs, exp) - 0.5 * eq
    : (1 - cdf(obs - 1, exp)) - 0.5 * eq;
  return Math.min(1, 2 * one);
}

// 3. Byar / Rothman-Boice
export function byarCI(obs: number, exp: number, z: number): CI {
  const up = ((obs + 1) / exp) * Math.pow(1 - 1 / (9 * (obs + 1)) + z / (3 * Math.sqrt(obs + 1)), 3);
  if (obs === 0) return { lower: 0, upper: up };
  const lo = (obs / exp) * Math.pow(1 - 1 / (9 * obs) - z / (3 * Math.sqrt(obs)), 3);
  return { lower: Math.max(0, lo), upper: up };
}

export function byarP(obs: number, exp: number): number {
  if (obs === exp) return 1;
  const isHigh = obs > exp;
  let lo = 0, hi = 1;
  for (let i = 0; i < 80; i++) {
    const alpha = (lo + hi) / 2;
    const z = jStat.normal.inv(1 - alpha / 2, 0, 1);
    const ci = byarCI(obs, exp, z);
    if (isHigh) {
      if (ci.lower < 1) lo = alpha;
      else hi = alpha;
    } else {
      if (ci.upper > 1) lo = alpha;
      else hi = alpha;
    }
  }
  return (lo + hi) / 2;
}

// 4. Vandenbroucke
export function vdbCI(obs: number, exp: number, z: number): CI {
  const h = z / 2;
  if (obs === 0) return { lower: 0, upper: h * h / exp };
  const s = Math.sqrt(obs);
  return { lower: Math.max(0, Math.pow(s - h, 2) / exp), upper: Math.pow(s + h, 2) / exp };
}

export function vdbP(obs: number, exp: number): number {
  const z = 2 * (Math.sqrt(obs) - Math.sqrt(exp));
  return Math.min(1, 2 * jStat.normal.cdf(-Math.abs(z), 0, 1));
}

// 5. Rothman/Greenland (log-normal)
export function rgCI(obs: number, exp: number, z: number): { ci: CI; ciValid: boolean } {
  if (obs === 0) return { ci: { lower: 0, upper: 0 }, ciValid: false };
  const smr = obs / exp;
  const hw = z / Math.sqrt(obs);
  return {
    ci: { lower: smr * Math.exp(-hw), upper: smr * Math.exp(hw) },
    ciValid: true,
  };
}

export function rgP(obs: number, exp: number): number {
  if (obs === 0) return 1;
  const z = Math.log(obs / exp) * Math.sqrt(obs);
  return Math.min(1, 2 * jStat.normal.cdf(-Math.abs(z), 0, 1));
}

// 6. Chi² test
export function chi2Compute(obs: number, exp: number): { p: number } {
  const chiVal = Math.pow(obs - exp, 2) / exp;
  return { p: 1 - jStat.chisquare.cdf(chiVal, 1) };
}

// Master function
export function computeSmr(obs: number, exp: number, cl: number): SmrResults | null {
  if (!Number.isFinite(obs) || !Number.isFinite(exp) || obs < 0 || exp <= 0) return null;
  const alpha = (100 - cl) / 100;
  const z = zScore(cl);
  const rgRes = rgCI(obs, exp, z);
  const c2 = chi2Compute(obs, exp);
  return {
    observed: obs,
    expected: exp,
    smr: obs / exp,
    confidenceLevel: cl,
    exact: { ci: exactCI(obs, exp, alpha), ciValid: true, p: exactP(obs, exp) },
    midP: { ci: midPCI(obs, exp, alpha), ciValid: true, p: midPP(obs, exp) },
    byar: { ci: byarCI(obs, exp, z), ciValid: true, p: byarP(obs, exp) },
    vdb: { ci: vdbCI(obs, exp, z), ciValid: true, p: vdbP(obs, exp) },
    rg: { ci: rgRes.ci, ciValid: rgRes.ciValid, p: rgP(obs, exp) },
    chi2: { ci: { lower: 0, upper: 0 }, ciValid: false, p: c2.p },
  };
}