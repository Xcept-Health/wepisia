import { useState, useEffect } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import { useTranslation, Trans } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

/**
 * Standardized Mortality Ratio (SMR) Calculator
 * 
 * This component computes the SMR  with multiple
 * confidence interval methods and hypothesis tests, exactly as in reference
 * tools like OpenEpi.
 */


// TYPES

interface CI { lower: number; upper: number }

interface MethodResult {
  ci: CI;
  /** null when not applicable for this method (e.g. Wald CI when obs=0) */
  ciValid: boolean;
  p: number;
}

interface SmrResults {
  observed:        number;
  expected:        number;
  smr:             number;
  confidenceLevel: number;
  exact:  MethodResult;   // Garwood (1936) exact Poisson
  midP:   MethodResult;   // Mid-P (Lancaster 1961) – bisection CI
  byar:   MethodResult;   // Byar / Rothman-Boice (1979)
  vdb:    MethodResult;   // Vandenbroucke (1982) square-root
  rg:     MethodResult;   // Rothman/Greenland (1998) log-normal CI
  chi2:   MethodResult;   // Pearson χ² — no CI
}


// PURE CALCULATION FUNCTIONS

/** Two-tailed z-score for a given confidence level */
const Z = (cl: number): number => ({ 90: 1.645, 95: 1.96, 99: 2.576 }[cl] ?? 1.96);

//  1. Garwood (1936) exact Poisson CI 
function exactCI(obs: number, exp: number, alpha: number): CI {
  if (obs === 0) return { lower: 0, upper: jStat.chisquare.inv(1 - alpha, 2) / (2 * exp) };
  return {
    lower: jStat.chisquare.inv(alpha / 2,       2 * obs)       / (2 * exp),
    upper: jStat.chisquare.inv(1 - alpha / 2,   2 * (obs + 1)) / (2 * exp),
  };
}

/** Exact two-sided Poisson p-value */
function exactP(obs: number, exp: number): number {
  const cdf = jStat.poisson.cdf;
  return Math.min(1, obs < exp ? 2 * cdf(obs, exp) : 2 * (1 - cdf(obs - 1, exp)));
}

//  2. Mid-P (Lancaster 1961) – CI via bisection 
function midPCI(obs: number, exp: number, alpha: number): CI {
  // Special closed-form for obs = 0:
  //   upper solves  ½ e^{-λ} = α/2  →  λ = −ln α
  if (obs === 0) return { lower: 0, upper: -Math.log(alpha) / exp };

  const half = alpha / 2;
  const cdf  = jStat.poisson.cdf;
  const pdf  = jStat.poisson.pdf;

  // Lower: f(λ) = P(X≥obs|λ) − ½P(X=obs|λ)  [strictly increasing]  → find = half
  let lo = 1e-9, hi = Math.max(obs * 50 + 200, 1000);
  while ((1 - cdf(obs - 1, hi)) - 0.5 * pdf(obs, hi) < half) hi *= 2;
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    ((1 - cdf(obs - 1, m)) - 0.5 * pdf(obs, m)) < half ? (lo = m) : (hi = m);
  }
  const lower = ((lo + hi) / 2) / exp;

  // Upper: g(λ) = P(X≤obs|λ) − ½P(X=obs|λ)  [strictly decreasing]  → find = half
  lo = 1e-9; hi = Math.max(obs * 50 + 200, 1000);
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    (cdf(obs, m) - 0.5 * pdf(obs, m)) > half ? (lo = m) : (hi = m);
  }
  const upper = ((lo + hi) / 2) / exp;

  return { lower, upper };
}

/**
 * Mid-P p-value: adjust the exact p-value by subtracting half the probability of the observed count.
 *   obs ≤ exp  →  left tail:  P(X≤obs|exp) − ½P(X=obs|exp)
 *   obs >  exp →  right tail: P(X≥obs|exp) − ½P(X=obs|exp)
 */
function midPP(obs: number, exp: number): number {
  const cdf = jStat.poisson.cdf;
  const pdf = jStat.poisson.pdf;
  const eq  = pdf(obs, exp);
  const one = obs <= exp
    ? cdf(obs, exp)           - 0.5 * eq   // left
    : (1 - cdf(obs - 1, exp)) - 0.5 * eq;  // right
  return Math.min(1, 2 * one);
}

//  3. Byar / Rothman-Boice (1979) cube-root approximation 
function byarCI(obs: number, exp: number, z: number): CI {
  const up = ((obs + 1) / exp) *
    Math.pow(1 - 1 / (9 * (obs + 1)) + z / (3 * Math.sqrt(obs + 1)), 3);
  if (obs === 0) return { lower: 0, upper: up };
  const lo = (obs / exp) *
    Math.pow(1 - 1 / (9 * obs) - z / (3 * Math.sqrt(obs)), 3);
  return { lower: Math.max(0, lo), upper: up };
}

/** Byar p-value: invert the CI to find the α where H₀ = 1 lies at the boundary */
function byarP(obs: number, exp: number): number {
  if (obs === exp) return 1;
  const isHigh = obs > exp;
  let lo = 0, hi = 1;
  for (let i = 0; i < 80; i++) {
    const alpha = (lo + hi) / 2;
    const z  = jStat.normal.inv(1 - alpha / 2, 0, 1);
    const ci = byarCI(obs, exp, z);
    if (isHigh) { ci.lower < 1 ? (lo = alpha) : (hi = alpha); }
    else        { ci.upper > 1 ? (lo = alpha) : (hi = alpha); }
  }
  return (lo + hi) / 2;
}

//  4. Vandenbroucke (1982) square-root transformation 
function vdbCI(obs: number, exp: number, z: number): CI {
  const h = z / 2;
  if (obs === 0) return { lower: 0, upper: h * h / exp };
  const s = Math.sqrt(obs);
  return { lower: Math.max(0, Math.pow(s - h, 2) / exp), upper: Math.pow(s + h, 2) / exp };
}

/** Vandenbroucke p-value (square-root z-test: z = 2(√obs − √exp)) */
function vdbP(obs: number, exp: number): number {
  const z = 2 * (Math.sqrt(obs) - Math.sqrt(exp));
  return Math.min(1, 2 * jStat.normal.cdf(-Math.abs(z), 0, 1));
}

//  5. Rothman / Greenland (1998) log-normal CI 
/**
 * CI = exp(ln(SMR) ± z / √obs)
 * Corresponds to OpenEpi's "Méthode Rothman/Greenland".
 * Not defined for obs = 0 (ln(0) = −∞).
 */
function rgCI(obs: number, exp: number, z: number): { ci: CI; ciValid: boolean } {
  if (obs === 0) return { ci: { lower: 0, upper: 0 }, ciValid: false };
  const smr = obs / exp;
  const hw  = z / Math.sqrt(obs);
  return {
    ci: { lower: smr * Math.exp(-hw), upper: smr * Math.exp(hw) },
    ciValid: true,
  };
}

/** Rothman/Greenland p-value: score test on ln(SMR), z = (ln(SMR)) / (1/√obs) */
function rgP(obs: number, exp: number): number {
  if (obs === 0) return 1;
  const z = Math.log(obs / exp) * Math.sqrt(obs);
  return Math.min(1, 2 * jStat.normal.cdf(-Math.abs(z), 0, 1));
}

//  6. Pearson χ² test — no CI (OpenEpi does not provide one) 
function chi2Compute(obs: number, exp: number): { p: number } {
  const chiVal = Math.pow(obs - exp, 2) / exp;
  return { p: 1 - jStat.chisquare.cdf(chiVal, 1) };
}

//  Master 
function computeSmr(obs: number, exp: number, cl: number): SmrResults | null {
  if (!Number.isFinite(obs) || !Number.isFinite(exp) || obs < 0 || exp <= 0) return null;
  const alpha = (100 - cl) / 100;
  const z     = Z(cl);
  const rgRes = rgCI(obs, exp, z);
  const c2    = chi2Compute(obs, exp);
  return {
    observed: obs, expected: exp, smr: obs / exp, confidenceLevel: cl,
    exact: { ci: exactCI(obs, exp, alpha), ciValid: true,          p: exactP(obs, exp) },
    midP:  { ci: midPCI(obs, exp, alpha),  ciValid: true,          p: midPP(obs, exp)  },
    byar:  { ci: byarCI(obs, exp, z),      ciValid: true,          p: byarP(obs, exp)  },
    vdb:   { ci: vdbCI(obs, exp, z),       ciValid: true,          p: vdbP(obs, exp)   },
    rg:    { ci: rgRes.ci,                 ciValid: rgRes.ciValid, p: rgP(obs, exp)    },
    chi2:  { ci: { lower: 0, upper: 0 },   ciValid: false,         p: c2.p             },
  };
}


// FORMATTING HELPERS
const fmtP   = (p: number)  => p < 0.001 ? '< 0.001' : p.toFixed(4);
const fmtCI  = (ci: CI, valid: boolean) =>
  valid ? `[${ci.lower.toFixed(3)} – ${ci.upper.toFixed(3)}]` : '—';
const fmtSMR = (smr: number) => smr.toFixed(3);


// PDF EXPORT   refined, soft, clinical aesthetic
type RGB = [number, number, number];
const P = {
  white:    [255, 255, 255] as RGB,
  slate50:  [248, 250, 252] as RGB,
  slate100: [241, 245, 249] as RGB,
  slate200: [226, 232, 240] as RGB,
  slate300: [203, 213, 225] as RGB,
  slate400: [148, 163, 184] as RGB,
  slate500: [100, 116, 139] as RGB,
  slate600: [ 71,  85, 105] as RGB,
  slate700: [ 51,  65,  85] as RGB,
  slate800: [ 30,  41,  59] as RGB,
  slate900: [ 15,  23,  42] as RGB,
  blue50:   [239, 246, 255] as RGB,
  blue100:  [219, 234, 254] as RGB,
  blue200:  [191, 219, 254] as RGB,
  blue400:  [ 96, 165, 250] as RGB,
  blue500:  [ 59, 130, 246] as RGB,
  blue600:  [ 37,  99, 235] as RGB,
  blue700:  [ 29,  78, 216] as RGB,
  orange50: [255, 247, 237] as RGB,
  orange200:[254, 215, 170] as RGB,
  orange500:[249, 115,  22] as RGB,
  green50:  [236, 253, 245] as RGB,
  green200: [167, 243, 208] as RGB,
  green600: [  5, 150, 105] as RGB,
  red400:   [248, 113, 113] as RGB,
  red500:   [239,  68,  68] as RGB,
};

function exportSmrPdf(
  r: SmrResults,
  t: (k: string, o?: object) => string,
  lang: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 16, CW = W - M * 2;

  const fill  = (c: RGB) => doc.setFillColor(...c);
  const draw  = (c: RGB) => doc.setDrawColor(...c);
  const color = (c: RGB) => doc.setTextColor(...c);
  const rr = (x: number, y: number, w: number, h: number, rad: number, s: 'F'|'S'|'FD' = 'F') =>
    doc.roundedRect(x, y, w, h, rad, rad, s);
  const ln = (x1: number, y1: number, x2: number, y2: number, lw = 0.25) => {
    doc.setLineWidth(lw);
    doc.line(x1, y1, x2, y2);
  };

  const isHigh   = r.smr > 1;
  const accentFg = isHigh ? P.orange500 : P.green600;
  const accentBg = isHigh ? P.orange50  : P.green50;
  const accentBd = isHigh ? P.orange200 : P.green200;

  //  Header 
  fill(P.blue50);
  doc.rect(0, 0, W, 38, 'F');

  // top accent line
  fill(P.blue500);
  doc.rect(0, 0, W, 1.5, 'F');

  // left blue strip
  fill(P.blue100);
  doc.rect(M, 8, 0.8, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  color(P.slate800);
  doc.text(t('stdMortalityCalculator.reportTitle'), M + 5, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  color(P.slate500);
  doc.text(t('stdMortalityCalculator.reportSubtitle'), M + 5, 28);

  const dateStr = new Date().toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  doc.text(
    t('stdMortalityCalculator.reportGenerated', { date: dateStr, time: timeStr }),
    W - M, 28, { align: 'right' },
  );

  draw(P.blue200);
  ln(0, 38, W, 38, 0.3);

  let y = 48;

  //  KPI row (3 cards) 
  const gap = 3, cardW = (CW - gap * 2) / 3, cardH = 22;

  const kpis = [
    { label: t('stdMortalityCalculator.observedLabel'),  value: String(r.observed) },
    { label: t('stdMortalityCalculator.expectedLabel'),  value: r.expected.toFixed(3) },
    { label: t('stdMortalityCalculator.confidenceLabel'), value: `${r.confidenceLevel} %` },
  ];

  kpis.forEach((kpi, i) => {
    const x = M + i * (cardW + gap);
    fill(P.white); draw(P.slate200); rr(x, y, cardW, cardH, 2.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); color(P.slate400);
    doc.text(kpi.label.toUpperCase(), x + cardW / 2, y + 6.5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); color(P.slate700);
    doc.text(kpi.value, x + cardW / 2, y + 16.5, { align: 'center' });
  });
  y += cardH + 8;

  //  SMR hero 
  fill(accentBg); draw(accentBd); rr(M, y, CW, 30, 3.5, 'FD');

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); color(P.slate400);
  doc.text(
    t('stdMortalityCalculator.smrCardLabel').toUpperCase(),
    W / 2, y + 8, { align: 'center' },
  );
  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); color(accentFg);
  doc.text(r.smr.toFixed(4), W / 2, y + 24, { align: 'center' });
  y += 30 + 10;

  //  Section helper 
  const section = (title: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); color(P.slate700);
    doc.text(title.toUpperCase(), M, y);
    y += 2;
    draw(P.slate200); ln(M, y, M + CW, y, 0.3);
    y += 6;
  };

  //  Exact CI visualisation 
  section(t('stdMortalityCalculator.ciExactTitle', { confidence: r.confidenceLevel }));

  const scaleMax = Math.max(2, r.exact.ci.upper * 1.35);
  const ax = M + 6, aw = CW - 12, ay = y + 8;

  // Track
  fill(P.slate100); rr(ax, ay - 1.2, aw, 2.4, 1.2, 'F');

  // CI bar
  const bL = ax + (Math.max(0, r.exact.ci.lower) / scaleMax) * aw;
  const bR = ax + (Math.min(scaleMax, r.exact.ci.upper) / scaleMax) * aw;
  const bW = Math.max(bR - bL, 1);
  fill(P.blue400); rr(bL, ay - 2.2, bW, 4.4, 2.2, 'F');

  // end-caps
  fill(P.blue600);
  doc.circle(bL, ay, 1.3, 'F');
  doc.circle(bR, ay, 1.3, 'F');

  // H₀ marker
  const h0 = ax + (1 / scaleMax) * aw;
  draw(P.red400); ln(h0, ay - 6, h0, ay + 6, 0.6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6); color(P.red400);
  doc.text('H₀=1', h0, ay - 7.5, { align: 'center' });

  // Bounds above bar
  doc.setFontSize(7.5); color(P.blue600);
  doc.text(r.exact.ci.lower.toFixed(3), bL, ay - 4.5, { align: 'center' });
  doc.text(r.exact.ci.upper.toFixed(3), bR, ay - 4.5, { align: 'center' });

  // Ticks below
  [0, 0.5, 1, 1.5, 2, ...(scaleMax > 2.1 ? [parseFloat(scaleMax.toFixed(1))] : [])].forEach(v => {
    const tx = ax + (v / scaleMax) * aw;
    draw(P.slate300); ln(tx, ay + 2, tx, ay + 4, 0.25);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); color(P.slate400);
    doc.text(v.toFixed(1), tx, ay + 7.5, { align: 'center' });
  });

  y = ay + 13;

  // CI numeric mini-cards
  const hW = (CW - gap) / 2;
  [
    { lbl: t('stdMortalityCalculator.ciLower'), val: r.exact.ci.lower.toFixed(3) },
    { lbl: t('stdMortalityCalculator.ciUpper'), val: r.exact.ci.upper.toFixed(3) },
  ].forEach((c, i) => {
    const x = M + i * (hW + gap);
    fill(P.white); draw(P.slate100); rr(x, y, hW, 14, 2, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); color(P.slate400);
    doc.text(c.lbl.toUpperCase(), x + hW / 2, y + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); color(P.blue700);
    doc.text(c.val, x + hW / 2, y + 11.5, { align: 'center' });
  });
  y += 14 + 10;

  //  Methods table 
  section(t('stdMortalityCalculator.statMethodsTitle'));

  const smrStr = r.smr.toFixed(3);
  const rows = [
    [t('stdMortalityCalculator.methodExact'), smrStr, fmtCI(r.exact.ci, true),   fmtP(r.exact.p)],
    [t('stdMortalityCalculator.methodMidP'),  smrStr, fmtCI(r.midP.ci, true),    fmtP(r.midP.p)],
    [t('stdMortalityCalculator.methodByar'),  smrStr, fmtCI(r.byar.ci, true),    fmtP(r.byar.p)],
    [t('stdMortalityCalculator.methodVdb'),   smrStr, fmtCI(r.vdb.ci, true),     fmtP(r.vdb.p)],
    [t('stdMortalityCalculator.methodRg'),    smrStr, fmtCI(r.rg.ci, r.rg.ciValid), fmtP(r.rg.p)],
    [t('stdMortalityCalculator.methodChi2'),  '—',    '—',                        fmtP(r.chi2.p)],
  ];

  autoTable(doc, {
    startY: y,
    head: [[
      t('stdMortalityCalculator.tableHeaderMethod'),
      t('stdMortalityCalculator.tableHeaderSmr'),
      t('stdMortalityCalculator.tableHeaderCi', { confidence: r.confidenceLevel }),
      t('stdMortalityCalculator.tableHeaderP'),
    ]],
    body: rows,
    theme: 'plain',
    headStyles: {
      fillColor: P.slate100,
      textColor: P.slate600,
      fontStyle:  'bold',
      halign:     'center',
      fontSize:    7.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', textColor: P.slate700 },
      1: { cellWidth: 22, halign: 'center',  textColor: P.slate600 },
      2: { cellWidth: 60, halign: 'center',  textColor: P.slate700 },
      3: { cellWidth: 27, halign: 'center',  textColor: P.slate700 },
    },
    styles: {
      fontSize:    8,
      cellPadding: 2.5,
      lineColor:   P.slate200,
      lineWidth:   0.15,
    },
    alternateRowStyles: { fillColor: P.slate50 },
    margin: { left: M, right: M },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  //  Interpretation 
  section(t('stdMortalityCalculator.interpretationTitle'));

  const isSignHigh = r.exact.ci.lower > 1;
  const isSignLow  = r.exact.ci.upper < 1;
  const iBg: RGB = isSignHigh ? P.orange50  : isSignLow ? P.green50  : P.slate50;
  const iBd: RGB = isSignHigh ? P.orange200 : isSignLow ? P.green200 : P.slate200;

  const mainSentence = r.smr > 1
    ? t('stdMortalityCalculator.interpretationHigher', { percent: ((r.smr - 1) * 100).toFixed(1) })
    : t('stdMortalityCalculator.interpretationLower',  { percent: ((1 - r.smr) * 100).toFixed(1) });
  const sigSentence = isSignHigh
    ? t('stdMortalityCalculator.interpretationSignifHigh')
    : isSignLow
      ? t('stdMortalityCalculator.interpretationSignifLow')
      : t('stdMortalityCalculator.interpretationNotSignif');

  const iText  = doc.splitTextToSize(`${mainSentence} ${sigSentence}`, CW - 10);
  const iH     = iText.length * 4.5 + 10;
  fill(iBg); draw(iBd); rr(M, y, CW, iH, 3, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); color(P.slate700);
  doc.text(iText, M + 5, y + 7);
  y += iH + 8;

  //  Footer 
  const fY = 284;
  draw(P.slate200); ln(M, fY, W - M, fY, 0.3);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); color(P.slate400);
  doc.text(t('stdMortalityCalculator.reportFooter'), M, fY + 4.5);
  doc.text('χ² exact (jStat) · Mid-P bisection · Byar · Vandenbroucke · Ury-Wiggins · Wald', M, fY + 8.5);
  doc.setFont('helvetica', 'bold'); color(P.slate500);
  doc.text('1 / 1', W - M, fY + 6.5, { align: 'right' });

  doc.save(`SMR_${r.observed}_${r.expected.toFixed(1)}_${r.confidenceLevel}pct.pdf`);
}


// COMPONENT
export default function StdMortalityRatio() {
  const { t, i18n } = useTranslation();

  const [observed,        setObserved]        = useState('');
  const [expected,        setExpected]        = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState('95');
  const [results,         setResults]         = useState<SmrResults | null>(null);
  const [showHelp,        setShowHelp]        = useState(false);

  // Live preview SMR
  const liveSmr = (() => {
    const o = parseFloat(observed), e = parseFloat(expected);
    return e > 0 && o >= 0 ? (o / e).toFixed(4) : '—';
  })();

  // Recompute on every input change
  useEffect(() => {
    setResults(computeSmr(parseFloat(observed), parseFloat(expected), parseInt(confidenceLevel, 10)));
  }, [observed, expected, confidenceLevel]);

  //  Handlers 
  const handleClear = () => {
    setObserved(''); setExpected(''); setResults(null);
    toast.info(t('stdMortalityCalculator.clearMessage'));
  };
  const handleExample = () => {
    setObserved('4'); setExpected('3.3');
    toast.success(t('stdMortalityCalculator.exampleLoaded'));
  };
  const handleCopy = async () => {
    if (!results) return;
    const text = `SMR = ${results.smr.toFixed(4)} [${results.confidenceLevel}% IC exact : ${results.exact.ci.lower.toFixed(3)}–${results.exact.ci.upper.toFixed(3)}]`;
    try { await navigator.clipboard.writeText(text); toast.success(t('stdMortalityCalculator.copySuccess')); }
    catch { toast.error(t('stdMortalityCalculator.copyError')); }
  };
  const handleExport = () => {
    if (!results) return;
    try { exportSmrPdf(results, t, i18n.language); toast.success(t('stdMortalityCalculator.exportSuccess')); }
    catch (e) { console.error(e); toast.error(t('stdMortalityCalculator.exportError')); }
  };

  //  CI bar position (exact CI, dynamic scale) 
  const ciPos = () => {
    if (!results) return { left: 0, width: 0 };
    const lo = results.exact.ci.lower, hi = results.exact.ci.upper;
    const min = Math.min(0, lo * 0.8), max = Math.max(2, hi * 1.2);
    const range = max - min;
    return { left: ((lo - min) / range) * 100, width: ((hi - lo) / range) * 100 };
  };

  //  Method rows for table 
  const methodRows = results ? [
    { label: t('stdMortalityCalculator.methodExact'), r: results.exact },
    { label: t('stdMortalityCalculator.methodMidP'),  r: results.midP  },
    { label: t('stdMortalityCalculator.methodByar'),  r: results.byar  },
    { label: t('stdMortalityCalculator.methodRg'),    r: results.rg    },
    { label: t('stdMortalityCalculator.methodVdb'),   r: results.vdb   },
    { label: t('stdMortalityCalculator.methodChi2'),  r: results.chi2  },
  ] : [];

  //  Render 
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">{t('common.home')}</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">{t('stdMortalityCalculator.title')}</span></li>
          </ol>
        </nav>

        {/* Page header */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('stdMortalityCalculator.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {t('stdMortalityCalculator.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="hidden md:flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/*  Left: inputs  */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" />
                {t('stdMortalityCalculator.parameters')}
              </h2>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('stdMortalityCalculator.observedLabel')}
                  </label>
                  <input
                    type="number" min="0" step="1" value={observed}
                    onChange={e => setObserved(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('stdMortalityCalculator.observedPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('stdMortalityCalculator.expectedLabel')}
                  </label>
                  <input
                    type="number" min="0.001" step="0.01" value={expected}
                    onChange={e => setExpected(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('stdMortalityCalculator.expectedPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('stdMortalityCalculator.confidenceLabel')}
                  </label>
                  <select
                    value={confidenceLevel}
                    onChange={e => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="90">90 %</option>
                    <option value="95">95 % ({t('stdMortalityCalculator.standard')})</option>
                    <option value="99">99 %</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={handleExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('stdMortalityCalculator.btnExample')}
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl"
                  aria-label="Clear"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/*  Right: results  */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">

              {/* Results header */}
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" />
                  {t('stdMortalityCalculator.resultsTitle')}
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button onClick={handleCopy}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('stdMortalityCalculator.btnCopy')}
                    ><Copy className="w-4 h-4" /></button>
                    <button onClick={handleExport}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('stdMortalityCalculator.btnExport')}
                    ><FileDown className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {/* Results body */}
              <div className="p-4 lg:p-8 bg-slate-50/30 dark:bg-slate-900/10">
                {!results ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">{t('stdMortalityCalculator.enterData')}</p>
                    <div className="text-4xl font-bold mt-2">{liveSmr === '—' ? '0.00' : liveSmr}</div>
                  </div>
                ) : (
                  <div className="space-y-5">

                    {/*  SMR hero  */}
                    <div className={`p-8 rounded-3xl text-center border ${
                      results.smr > 1
                        ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                        : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                    }`}>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {t('stdMortalityCalculator.smrCardLabel')}
                      </p>
                      <div className={`text-5xl font-bold tracking-tight mb-2 ${
                        results.smr > 1 ? 'text-orange-600' : 'text-emerald-600'
                      }`}>
                        {results.smr.toFixed(4)}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        {results.observed} {t('stdMortalityCalculator.obsAbbr')} / {results.expected.toFixed(1)} {t('stdMortalityCalculator.expAbbr')}
                      </span>
                    </div>

                    {/*  Exact CI visual  */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5">
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-sm font-semibold text-slate-500">
                          {t('stdMortalityCalculator.ciExactTitle', { confidence: results.confidenceLevel })}
                        </span>
                        <span className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-slate-700 rounded-full text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                          {t('stdMortalityCalculator.exactMethod')}
                        </span>
                      </div>

                      <div className="relative h-20 mb-2">
                        {/* Track */}
                        <div className="absolute w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full top-8" />

                        {/* Tick marks */}
                        {[...Array(11)].map((_, i) => {
                          const v = i * 0.2;
                          return (
                            <div key={i} className="absolute flex flex-col items-center" style={{ left: `${(v / 2) * 100}%`, top: '4px' }}>
                              <div className={`h-2 w-px rounded-full ${i % 5 === 0 ? 'bg-slate-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              <span className="text-[9px] font-mono text-slate-400 mt-1 -translate-x-1/2">{v.toFixed(1)}</span>
                            </div>
                          );
                        })}

                        {/* H₀ */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center">
                          <div className="h-4 w-px bg-red-400 rounded-full" />
                          <span className="text-[10px] font-bold text-red-400 mt-0.5">H₀=1</span>
                        </div>

                        {/* CI bar */}
                        {(() => {
                          const { left, width } = ciPos();
                          return (
                            <>
                              <div
                                className="absolute h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full top-7 -translate-y-1/2 transition-all duration-300"
                                style={{ left: `${left}%`, width: `${width}%` }}
                              />
                              {/* left cap */}
                              <div className="absolute top-7 -translate-y-1/2 -translate-x-1/2" style={{ left: `${left}%` }}>
                                <div className="w-2.5 h-2.5 bg-blue-700 dark:bg-blue-400 rounded-full" />
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                  {results.exact.ci.lower.toFixed(3)}
                                </div>
                              </div>
                              {/* right cap */}
                              <div className="absolute top-7 -translate-y-1/2 -translate-x-1/2" style={{ left: `${left + width}%` }}>
                                <div className="w-2.5 h-2.5 bg-blue-700 dark:bg-blue-400 rounded-full" />
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                  {results.exact.ci.upper.toFixed(3)}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex justify-between items-end pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex gap-6">
                          {[
                            { lbl: t('stdMortalityCalculator.ciLower'), val: results.exact.ci.lower.toFixed(3) },
                            { lbl: t('stdMortalityCalculator.ciUpper'), val: results.exact.ci.upper.toFixed(3) },
                          ].map(c => (
                            <div key={c.lbl} className="text-center">
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{c.lbl}</p>
                              <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 leading-tight">{c.val}</p>
                              <p className="text-[10px] text-slate-400">IC {results.confidenceLevel}%</p>
                            </div>
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t('stdMortalityCalculator.ciWidth')}</p>
                          <p className="text-lg font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {(results.exact.ci.upper - results.exact.ci.lower).toFixed(3)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/*  Methods table  */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                              <th className="px-4 py-3 text-left font-semibold">{t('stdMortalityCalculator.tableHeaderMethod')}</th>
                              <th className="px-4 py-3 text-center font-semibold">{t('stdMortalityCalculator.tableHeaderSmr')}</th>
                              <th className="px-4 py-3 text-center font-semibold">{t('stdMortalityCalculator.tableHeaderCi', { confidence: results.confidenceLevel })}</th>
                              <th className="px-4 py-3 text-center font-semibold">{t('stdMortalityCalculator.tableHeaderP')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {methodRows.map(({ label, r: mr }) => (
                              <tr key={label} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{label}</td>
                                <td className="px-4 py-3 text-center font-mono text-slate-700 dark:text-slate-300">
                                  {mr.ciValid || label !== t('stdMortalityCalculator.methodChi2') ? fmtSMR(results.smr) : '—'}
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400">{fmtCI(mr.ci, mr.ciValid)}</td>
                                <td className={`px-4 py-3 text-center font-mono font-semibold ${mr.p < 0.05 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {fmtP(mr.p)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-slate-400 px-4 py-3 border-t border-slate-100 dark:border-slate-700 italic">
                        {t('stdMortalityCalculator.footnote')}
                      </p>
                    </div>

                    {/*  Interpretation  */}
                    <div className={`p-5 rounded-2xl ${
                      results.exact.ci.lower > 1 || results.exact.ci.upper < 1
                        ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30'
                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                    }`}>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 text-sm">
                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                        {t('stdMortalityCalculator.interpretationTitle')}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {results.smr > 1 ? (
                          <Trans i18nKey="stdMortalityCalculator.interpretationHigher"
                            values={{ percent: ((results.smr - 1) * 100).toFixed(1) }}
                            components={{ strong: <strong className="font-bold" /> }} />
                        ) : (
                          <Trans i18nKey="stdMortalityCalculator.interpretationLower"
                            values={{ percent: ((1 - results.smr) * 100).toFixed(1) }}
                            components={{ strong: <strong className="font-bold" /> }} />
                        )}
                        {' '}
                        {results.exact.ci.lower > 1 ? (
                          <span className="text-orange-600 font-semibold">{t('stdMortalityCalculator.interpretationSignifHigh')}</span>
                        ) : results.exact.ci.upper < 1 ? (
                          <span className="text-emerald-600 font-semibold">{t('stdMortalityCalculator.interpretationSignifLow')}</span>
                        ) : (
                          <span className="text-slate-500">{t('stdMortalityCalculator.interpretationNotSignif')}</span>
                        )}
                      </p>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/*  Help modal  */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('stdMortalityCalculator.helpTitle')}</h3>
                <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-8">
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">1</div>
                    {t('stdMortalityCalculator.helpPrincipleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{t('stdMortalityCalculator.helpPrinciple')}</p>
                </section>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { cond: 'RMS > 1.0', desc: t('stdMortalityCalculator.helpRiskExcess') },
                    { cond: 'RMS < 1.0', desc: t('stdMortalityCalculator.helpProtective') },
                  ].map(c => (
                    <div key={c.cond} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">{c.cond}</div>
                      <div className="text-xs text-slate-500">{c.desc}</div>
                    </div>
                  ))}
                </div>
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">2</div>
                    {t('stdMortalityCalculator.helpMethodsTitle')}
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {([
                      ['methodExact', 'helpExactDesc'],
                      ['methodMidP',  'helpMidPDesc'],
                      ['methodByar',  'helpByarDesc'],
                      ['methodVdb',   'helpVdbDesc'],
                      ['methodRg',    'helpRgDesc'],
                    ] as const).map(([mk, dk]) => (
                      <p key={mk}>
                        <strong className="text-slate-900 dark:text-white">{t(`stdMortalityCalculator.${mk}`)}</strong>
                        {' – '}{t(`stdMortalityCalculator.${dk}`)}
                      </p>
                    ))}
                  </div>
                  <a href="https://www.openepi.com/SMR/SMR.htm" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4">
                    {t('stdMortalityCalculator.helpSource')} <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}