import { useState, useEffect } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

// ============================================================
// Types
// ============================================================

interface SampleSizeResult {
  method: 'Kelsey' | 'Fleiss' | 'FleissCC';
  cases: number;
  controls: number;
  total: number;
}

interface InputValues {
  alpha: number;      // two-sided significance level (e.g., 0.05)
  power: number;      // e.g., 0.8
  ratio: number;      // controls per case (r)
  p0: number;         // proportion of controls exposed (0..1)
  p1: number;         // proportion of cases exposed (0..1)
  or: number;         // odds ratio
}

// ============================================================
// Pure calculation helpers
// ============================================================

/** Two-tailed z-score for a given alpha (significance level) */
function zAlpha(alpha: number): number {
  return jStat.normal.inv(1 - alpha / 2, 0, 1);
}

/** One-tailed z-score for power (beta = 1 - power) */
function zBeta(power: number): number {
  return jStat.normal.inv(power, 0, 1);
}

/**
 * Compute p1 from p0 and odds ratio.
 */
function computeP1(p0: number, or: number): number {
  if (or === 1) return p0;
  return (or * p0) / (1 + p0 * (or - 1));
}

/**
 * Compute odds ratio from p0 and p1.
 */
function computeOR(p0: number, p1: number): number {
  if (p0 === 0 || p0 === 1 || p1 === 0 || p1 === 1) return 1;
  return (p1 / (1 - p1)) / (p0 / (1 - p0));
}

/**
 * Kelsey method (normal approximation, pooled variance)
 * Returns rounded integer cases and controls.
 */
function kelseySampleSize(alpha: number, power: number, ratio: number, p0: number, p1: number): { cases: number; controls: number } {
  const z_alpha = zAlpha(alpha);
  const z_beta = zBeta(power);
  const p_bar = (p1 + ratio * p0) / (ratio + 1);
  const numerator = (ratio + 1) / ratio * p_bar * (1 - p_bar) * Math.pow(z_alpha + z_beta, 2);
  const denominator = Math.pow(p1 - p0, 2);
  let cases = numerator / denominator;
  cases = Math.ceil(cases);
  const controls = Math.ceil(ratio * cases);
  return { cases, controls };
}

/**
 * Fleiss method (different variance assumption)
 * Returns the floating-point (unrounded) sample size for cases, and the rounded integer.
 */
function fleissSampleSizeFloat(alpha: number, power: number, ratio: number, p0: number, p1: number): { casesFloat: number; cases: number; controls: number } {
  const z_alpha = zAlpha(alpha);
  const z_beta = zBeta(power);
  const p_bar = (p1 + ratio * p0) / (ratio + 1);
  const term1 = z_alpha * Math.sqrt((ratio + 1) * p_bar * (1 - p_bar));
  const term2 = z_beta * Math.sqrt(ratio * p0 * (1 - p0) + p1 * (1 - p1));
  const numerator = Math.pow(term1 + term2, 2);
  const denominator = ratio * Math.pow(p1 - p0, 2);
  const casesFloat = numerator / denominator;
  const cases = Math.ceil(casesFloat);
  const controls = Math.ceil(ratio * cases);
  return { casesFloat, cases, controls };
}

/**
 * Fleiss with continuity correction (Fleiss CC)
 * Uses the unrounded Fleiss sample size (casesFloat) in the correction formula.
 */
function fleissCCSampleSize(alpha: number, power: number, ratio: number, p0: number, p1: number): { cases: number; controls: number } {
  const { casesFloat } = fleissSampleSizeFloat(alpha, power, ratio, p0, p1);
  const r = ratio;
  const delta = Math.abs(p1 - p0);
  if (casesFloat <= 0 || delta === 0) {
    // Fallback: use rounded Fleiss
    const { cases, controls } = fleissSampleSizeFloat(alpha, power, ratio, p0, p1);
    return { cases, controls };
  }
  const n = casesFloat; // unrounded
  const correction = (n / 4) * Math.pow(1 + Math.sqrt(1 + (2 * (r + 1)) / (n * r * delta)), 2);
  let cases = Math.ceil(correction);
  const controls = Math.ceil(r * cases);
  return { cases, controls };
}

/**
 * Compute all three methods
 */
function computeAllSampleSizes(
  alpha: number,
  power: number,
  ratio: number,
  p0: number,
  p1: number
): SampleSizeResult[] {
  const kelsey = kelseySampleSize(alpha, power, ratio, p0, p1);
  const fleiss = fleissSampleSizeFloat(alpha, power, ratio, p0, p1);
  const fleissCC = fleissCCSampleSize(alpha, power, ratio, p0, p1);

  return [
    { method: 'Kelsey', cases: kelsey.cases, controls: kelsey.controls, total: kelsey.cases + kelsey.controls },
    { method: 'Fleiss', cases: fleiss.cases, controls: fleiss.controls, total: fleiss.cases + fleiss.controls },
    { method: 'FleissCC', cases: fleissCC.cases, controls: fleissCC.controls, total: fleissCC.cases + fleissCC.controls },
  ];
}

// ============================================================
// PDF Export (unchanged, same as before)
// ============================================================

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
  blue500:  [ 59, 130, 246] as RGB,
  blue600:  [ 37,  99, 235] as RGB,
  blue700:  [ 29,  78, 216] as RGB,
  green600: [  5, 150, 105] as RGB,
  red400:   [248, 113, 113] as RGB,
};

function exportCaseControlPdf(
  results: SampleSizeResult[],
  inputs: { alpha: number; power: number; ratio: number; p0: number; p1: number; or: number },
  t: (key: string, fallback?: string) => string,
  lang: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 16, CW = W - M * 2;

  const fill = (c: RGB) => doc.setFillColor(...c);
  const draw = (c: RGB) => doc.setDrawColor(...c);
  const color = (c: RGB) => doc.setTextColor(...c);
  const ln = (x1: number, y1: number, x2: number, y2: number, lw = 0.25) => {
    doc.setLineWidth(lw);
    doc.line(x1, y1, x2, y2);
  };

  // Header
  fill(P.blue50);
  doc.rect(0, 0, W, 38, 'F');
  fill(P.blue500);
  doc.rect(0, 0, W, 1.5, 'F');
  fill(P.blue100);
  doc.rect(M, 8, 0.8, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  color(P.slate800);
  doc.text(t('unmatchedCaseControl.reportTitle'), M + 5, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  color(P.slate500);
  doc.text(t('unmatchedCaseControl.reportSubtitle'), M + 5, 28);

  const dateStr = new Date().toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  doc.text(
    t('unmatchedCaseControl.reportGenerated', { date: dateStr, time: timeStr }),
    W - M, 28,
    { align: 'right' }
  );

  draw(P.blue200);
  ln(0, 38, W, 38, 0.3);

  let y = 48;

  // Input summary (as cards)
  const gap = 3;
  const cardW = (CW - gap * 3) / 4;
  const cardH = 22;
  const inputsData = [
    { label: t('unmatchedCaseControl.confidenceLabel'), value: `${(1 - inputs.alpha) * 100} %` },
    { label: t('unmatchedCaseControl.powerLabel'), value: `${inputs.power * 100} %` },
    { label: t('unmatchedCaseControl.ratioLabel'), value: inputs.ratio.toFixed(1) },
    { label: t('unmatchedCaseControl.p0Label'), value: `${(inputs.p0 * 100).toFixed(2)} %` },
  ];
  inputsData.forEach((item, i) => {
    const x = M + i * (cardW + gap);
    doc.setFillColor(...P.white);
    doc.setDrawColor(...P.slate200);
    doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    color(P.slate400);
    doc.text(item.label.toUpperCase(), x + cardW / 2, y + 6.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    color(P.slate700);
    doc.text(item.value, x + cardW / 2, y + 16.5, { align: 'center' });
  });
  y += cardH + 8;

  // Additional derived inputs
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  color(P.slate500);
  doc.text(
    `${t('unmatchedCaseControl.p1Label')} : ${(inputs.p1 * 100).toFixed(2)} %   |   ${t('unmatchedCaseControl.orLabel')} : ${inputs.or.toFixed(2)}`,
    M, y
  );
  y += 8;

  // Results table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  color(P.slate700);
  doc.text(t('unmatchedCaseControl.resultsTitle').toUpperCase(), M, y);
  y += 2;
  draw(P.slate200);
  ln(M, y, M + CW, y, 0.3);
  y += 6;

  const tableRows = results.map((r) => [
    r.method === 'FleissCC' ? 'Fleiss (CC)' : r.method,
    r.cases.toLocaleString(),
    r.controls.toLocaleString(),
    r.total.toLocaleString(),
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      t('unmatchedCaseControl.tableHeaderMethod'),
      t('unmatchedCaseControl.tableHeaderCases'),
      t('unmatchedCaseControl.tableHeaderControls'),
      t('unmatchedCaseControl.tableHeaderTotal'),
    ]],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: P.slate100,
      textColor: P.slate600,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 45, halign: 'center', textColor: P.slate700, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'center', textColor: P.slate700 },
      2: { cellWidth: 30, halign: 'center', textColor: P.slate700 },
      3: { cellWidth: 30, halign: 'center', textColor: P.slate700, fontStyle: 'bold' },
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: P.slate200,
      lineWidth: 0.15,
    },
    alternateRowStyles: { fillColor: P.slate50 },
    margin: { left: M, right: M },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // References and notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  color(P.slate600);
  doc.text(t('unmatchedCaseControl.referencesTitle'), M, y);
  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  color(P.slate500);
  const refs = t('unmatchedCaseControl.references');
  const refLines = doc.splitTextToSize(refs, CW);
  doc.text(refLines, M, y);
  y += refLines.length * 4 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  color(P.slate400);
  const note = t('unmatchedCaseControl.footnote');
  const noteLines = doc.splitTextToSize(note, CW);
  doc.text(noteLines, M, y);

  // Footer
  const fY = 284;
  draw(P.slate200);
  ln(M, fY, W - M, fY, 0.3);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  color(P.slate400);
  doc.text(t('unmatchedCaseControl.reportFooter'), M, fY + 4.5);
  doc.setFont('helvetica', 'bold');
  color(P.slate500);
  doc.text('1 / 1', W - M, fY + 6.5, { align: 'right' });

  doc.save(`CaseControl_${inputs.ratio}_${inputs.p0}_OR${inputs.or}.pdf`);
}

// ============================================================
// Main Component
// ============================================================

export default function UnmatchedCaseControl() {
  const { t, i18n } = useTranslation();

  // Input states (all empty initially, as in other modules)
  const [confidence, setConfidence] = useState('');
  const [power, setPower] = useState('');
  const [ratio, setRatio] = useState('');
  const [p0, setP0] = useState('');
  const [inputMode, setInputMode] = useState<'or' | 'p1'>('or');
  const [orValue, setOrValue] = useState('');
  const [p1Value, setP1Value] = useState('');

  const [results, setResults] = useState<SampleSizeResult[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Compute derived values and sample sizes
  useEffect(() => {
    // Parse all inputs – if any is missing/empty, bail out.
    const alphaVal = parseFloat(confidence);
    const powerVal = parseFloat(power);
    const rVal = parseFloat(ratio);
    const p0Val = parseFloat(p0);

    if (isNaN(alphaVal) || isNaN(powerVal) || isNaN(rVal) || isNaN(p0Val)) {
      setResults([]);
      return;
    }
    if (rVal <= 0 || p0Val <= 0 || p0Val >= 100) {
      setResults([]);
      return;
    }

    const alpha = (100 - alphaVal) / 100;
    const power_frac = powerVal / 100;
    const r = rVal;
    const p0_frac = p0Val / 100;

    let p1_frac: number;
    let or: number;

    if (inputMode === 'or') {
      const orNum = parseFloat(orValue);
      if (isNaN(orNum) || orNum <= 0) {
        setResults([]);
        return;
      }
      or = orNum;
      p1_frac = computeP1(p0_frac, or);
    } else {
      const p1Val = parseFloat(p1Value);
      if (isNaN(p1Val) || p1Val <= 0 || p1Val >= 100) {
        setResults([]);
        return;
      }
      p1_frac = p1Val / 100;
      or = computeOR(p0_frac, p1_frac);
    }

    if (p1_frac <= 0 || p1_frac >= 1 || Math.abs(p1_frac - p0_frac) < 1e-6) {
      setResults([]);
      return;
    }

    const computed = computeAllSampleSizes(alpha, power_frac, r, p0_frac, p1_frac);
    setResults(computed);
  }, [confidence, power, ratio, p0, inputMode, orValue, p1Value]);

  // Sync OR and p1 when mode changes or one is edited
  useEffect(() => {
    if (inputMode === 'or') {
      const or = parseFloat(orValue);
      const p0_frac = parseFloat(p0) / 100;
      if (!isNaN(or) && or > 0 && !isNaN(p0_frac) && p0_frac > 0 && p0_frac < 1) {
        const p1_frac = computeP1(p0_frac, or);
        if (!isNaN(p1_frac) && p1_frac > 0 && p1_frac < 1) {
          setP1Value((p1_frac * 100).toFixed(2));
        } else {
          setP1Value('');
        }
      } else {
        setP1Value('');
      }
    } else {
      const p1_frac = parseFloat(p1Value) / 100;
      const p0_frac = parseFloat(p0) / 100;
      if (!isNaN(p1_frac) && p1_frac > 0 && p1_frac < 1 && !isNaN(p0_frac) && p0_frac > 0 && p0_frac < 1) {
        const or = computeOR(p0_frac, p1_frac);
        if (!isNaN(or) && or > 0) {
          setOrValue(or.toFixed(2));
        } else {
          setOrValue('');
        }
      } else {
        setOrValue('');
      }
    }
  }, [inputMode, orValue, p1Value, p0]);

  // Handlers
  const handleClear = () => {
    setConfidence('');
    setPower('');
    setRatio('');
    setP0('');
    setInputMode('or');
    setOrValue('');
    setP1Value('');
    setResults([]);
    toast.info(t('unmatchedCaseControl.clearMessage'));
  };

  const handleExample = () => {
    setConfidence('95');
    setPower('80');
    setRatio('1');
    setP0('40');
    setInputMode('or');
    setOrValue('2.0');
    setP1Value('');
    toast.success(t('unmatchedCaseControl.exampleLoaded'));
  };

  const handleCopy = async () => {
    if (results.length === 0) return;
    const lines = results.map(r => `${r.method}: ${t('unmatchedCaseControl.cases')} ${r.cases}, ${t('unmatchedCaseControl.controls')} ${r.controls}, ${t('unmatchedCaseControl.total')} ${r.total}`);
    const text = `${t('unmatchedCaseControl.copyPrefix')}\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('unmatchedCaseControl.copySuccess'));
    } catch {
      toast.error(t('unmatchedCaseControl.copyError'));
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;
    const alpha = (100 - parseFloat(confidence)) / 100;
    const powerVal = parseFloat(power) / 100;
    const r = parseFloat(ratio);
    const p0_frac = parseFloat(p0) / 100;
    let p1_frac: number;
    let or: number;
    if (inputMode === 'or') {
      or = parseFloat(orValue);
      p1_frac = computeP1(p0_frac, or);
    } else {
      p1_frac = parseFloat(p1Value) / 100;
      or = computeOR(p0_frac, p1_frac);
    }
    try {
      exportCaseControlPdf(results, { alpha, power: powerVal, ratio: r, p0: p0_frac, p1: p1_frac, or }, t, i18n.language);
      toast.success(t('unmatchedCaseControl.exportSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('unmatchedCaseControl.exportError'));
    }
  };

  // UI helpers
  const showResults = results.length > 0 && parseFloat(ratio) > 0 && parseFloat(p0) > 0 && parseFloat(p0) < 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li>
              <Link href="/" className="hover:text-blue-500 transition-colors">
                {t('common.home')}
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3" />
            </li>
            <li>
              <span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">
                {t('unmatchedCaseControl.title')}
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('unmatchedCaseControl.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {t('unmatchedCaseControl.subtitle')}
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
          {/* Left: Inputs */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" />
                {t('unmatchedCaseControl.parameters')}
              </h2>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('unmatchedCaseControl.confidenceLabel')}
                  </label>
                  <select
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="">{t('unmatchedCaseControl.selectPlaceholder')}</option>
                    <option value="90">90 %</option>
                    <option value="95">95 % ({t('unmatchedCaseControl.standard')})</option>
                    <option value="99">99 %</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('unmatchedCaseControl.confidenceNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('unmatchedCaseControl.powerLabel')}
                  </label>
                  <select
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="">{t('unmatchedCaseControl.selectPlaceholder')}</option>
                    <option value="80">80 %</option>
                    <option value="85">85 %</option>
                    <option value="90">90 %</option>
                    <option value="95">95 %</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('unmatchedCaseControl.powerNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('unmatchedCaseControl.ratioLabel')}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('unmatchedCaseControl.ratioPlaceholder')}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t('unmatchedCaseControl.ratioNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('unmatchedCaseControl.p0Label')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={p0}
                    onChange={(e) => setP0(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                    <button
                      onClick={() => setInputMode('or')}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        inputMode === 'or'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Odds Ratio
                    </button>
                    <button
                      onClick={() => setInputMode('p1')}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        inputMode === 'p1'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      % cases exposed
                    </button>
                  </div>
                  <div className="mt-2">
                    {inputMode === 'or' ? (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={orValue}
                        onChange={(e) => setOrValue(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                        placeholder={t('unmatchedCaseControl.orPlaceholder')}
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={p1Value}
                        onChange={(e) => setP1Value(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                        placeholder={t('unmatchedCaseControl.p1Placeholder')}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('unmatchedCaseControl.orNote')}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={handleExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('unmatchedCaseControl.btnExample')}
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

          {/* Right: Results */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" />
                  {t('unmatchedCaseControl.resultsTitle')}
                </h2>
                {showResults && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('unmatchedCaseControl.btnCopy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleExport}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('unmatchedCaseControl.btnExport')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {!showResults ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">{t('unmatchedCaseControl.enterData')}</p>
                    <p className="text-sm mt-2 text-slate-400">
                      {t('unmatchedCaseControl.enterDataHint')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Hero card: key derived values (highlighted) */}
                    <div className="p-6 rounded-3xl text-center border bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-800 shadow-md">
                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4">
                        {t('unmatchedCaseControl.keyMetrics')}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-3xl font-bold tracking-tight text-indigo-800 dark:text-indigo-300">
                            {inputMode === 'or' ? (
                              (() => {
                                const p0_frac = parseFloat(p0) / 100;
                                const or = parseFloat(orValue);
                                const p1_frac = computeP1(p0_frac, or);
                                return isNaN(p1_frac) ? '—' : `${(p1_frac * 100).toFixed(2)} %`;
                              })()
                            ) : (
                              p1Value || '—'
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{t('unmatchedCaseControl.p1Label')}</span>
                        </div>
                        <div>
                          <div className="text-3xl font-bold tracking-tight text-indigo-800 dark:text-indigo-300">
                            {inputMode === 'or' ? (
                              orValue || '—'
                            ) : (
                              (() => {
                                const p0_frac = parseFloat(p0) / 100;
                                const p1_frac = parseFloat(p1Value) / 100;
                                const or = computeOR(p0_frac, p1_frac);
                                return isNaN(or) ? '—' : or.toFixed(2);
                              })()
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{t('unmatchedCaseControl.orLabel')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Results table */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold tracking-widest text-slate-400 mb-4">
                        {t('unmatchedCaseControl.sampleSizes')}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">
                                {t('unmatchedCaseControl.tableHeaderMethod')}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                {t('unmatchedCaseControl.tableHeaderCases')}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                {t('unmatchedCaseControl.tableHeaderControls')}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                {t('unmatchedCaseControl.tableHeaderTotal')}
                              </th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {results.map((r) => (
                              <tr key={r.method}>
                                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                  {r.method === 'FleissCC' ? 'Fleiss (CC)' : r.method}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {r.cases.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {r.controls.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {r.total.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Interpretation block */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> {t('unmatchedCaseControl.interpretationTitle')}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {t('unmatchedCaseControl.interpretationText')}
                      </p>
                    </div>

                    {/* References (small footer note) */}
                    <div className="text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p>
                        <strong className="font-semibold text-slate-500">{t('unmatchedCaseControl.referencesTitle')}:</strong> {t('unmatchedCaseControl.references')}<br />
                        <em className="italic">{t('unmatchedCaseControl.footnote')}</em>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelp(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('unmatchedCaseControl.helpTitle')}
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    {t('unmatchedCaseControl.helpPrincipleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('unmatchedCaseControl.helpPrinciple')}
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    {t('unmatchedCaseControl.helpFormulasTitle')}
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-mono font-bold">Kelsey:</div>
                      <div className="text-xs text-slate-500 mt-1">
                        n_cases = (r+1)/r × p̄(1-p̄) × (z<sub>α/2</sub> + z<sub>β</sub>)² / (p₁ - p₀)²,  p̄ = (p₁ + r·p₀)/(r+1)
                      </div>
                    </div>
                    <div>
                      <div className="font-mono font-bold">Fleiss:</div>
                      <div className="text-xs text-slate-500 mt-1">
                        n_cases = [ z<sub>α/2</sub>√((r+1)p̄(1-p̄)) + z<sub>β</sub>√(r·p₀(1-p₀) + p₁(1-p₁)) ]² / [ r·(p₁-p₀)² ]
                      </div>
                    </div>
                    <div>
                      <div className="font-mono font-bold">Fleiss with CC:</div>
                      <div className="text-xs text-slate-500 mt-1">
                        n_cc = n_fleiss / 4 × (1 + √(1 + 2(r+1)/(n_fleiss·r·|p₁-p₀|)))²
                        <br />
                        where n_fleiss is the <strong>unrounded</strong> Fleiss sample size (cases).
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    {t('unmatchedCaseControl.helpUsageTitle')}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('unmatchedCaseControl.helpUsage')}
                  </p>
                </section>

                <div className="text-right">
                  <a
                    href="https://www.openepi.com/SampleSize/SSCC.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700"
                  >
                    {t('unmatchedCaseControl.helpSource')}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}