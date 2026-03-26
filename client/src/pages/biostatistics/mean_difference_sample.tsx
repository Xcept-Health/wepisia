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


// Types
interface SampleSizeResult {
  n1: number;
  n2: number;
  total: number;
  difference: number;
  pooledSD: number;
}


// Pure calculation helpers
/** Two-tailed z-score for a given confidence level (in percent) */
function zAlpha(confidence: number): number {
  const alpha = 1 - confidence / 100;
  return jStat.normal.inv(1 - alpha / 2, 0, 1);
}

/** One-tailed z-score for power (in percent) */
function zBeta(power: number): number {
  return jStat.normal.inv(power / 100, 0, 1);
}

/**
 * Compute sample sizes for two independent means.
 * Formula: n1 = ( (z_α/2 + z_β)^2 * (σ1² + σ2² / r) ) / δ²
 * where δ = μ1 - μ2, r = n2 / n1.
 */
function computeSampleSizes(
  mean1: number,
  mean2: number,
  sd1: number,
  sd2: number,
  confidence: number,
  power: number,
  ratio: number
): SampleSizeResult | null {
  const delta = Math.abs(mean1 - mean2);
  if (delta === 0) return null;

  const z_alpha = zAlpha(confidence);
  const z_beta = zBeta(power);
  const var1 = sd1 * sd1;
  const var2 = sd2 * sd2;

  // n1 = ( (z_α/2 + z_β)² * (σ1² + σ2² / r) ) / δ²
  const numerator = Math.pow(z_alpha + z_beta, 2) * (var1 + var2 / ratio);
  const n1_float = numerator / (delta * delta);
  const n1 = Math.ceil(n1_float);
  const n2 = Math.ceil(ratio * n1);
  const total = n1 + n2;

  // Pooled standard deviation (for display)
  const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  const pooledSD = Math.sqrt(pooledVar);

  return { n1, n2, total, difference: delta, pooledSD };
}


// PDF Export
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

function exportMeanDifferencePdf(
  result: SampleSizeResult,
  inputs: {
    mean1: number; mean2: number;
    sd1: number; sd2: number;
    confidence: number; power: number; ratio: number;
  },
  t: (key: string) => string,
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
  doc.text(t('meanDiffSample.reportTitle'), M + 5, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  color(P.slate500);
  doc.text(t('meanDiffSample.reportSubtitle'), M + 5, 28);

  const dateStr = new Date().toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  doc.text(
    t('meanDiffSample.reportGenerated', { date: dateStr, time: timeStr }),
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
    { label: t('meanDiffSample.confidenceLabel'), value: `${inputs.confidence} %` },
    { label: t('meanDiffSample.powerLabel'), value: `${inputs.power} %` },
    { label: t('meanDiffSample.ratioLabel'), value: inputs.ratio.toFixed(2) },
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

  // Means and SDs
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  color(P.slate500);
  doc.text(
    `${t('meanDiffSample.mean1Label')}: ${inputs.mean1.toFixed(2)}   |   ${t('meanDiffSample.sd1Label')}: ${inputs.sd1.toFixed(2)}`,
    M, y
  );
  y += 5;
  doc.text(
    `${t('meanDiffSample.mean2Label')}: ${inputs.mean2.toFixed(2)}   |   ${t('meanDiffSample.sd2Label')}: ${inputs.sd2.toFixed(2)}`,
    M, y
  );
  y += 10;

  // Results table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  color(P.slate700);
  doc.text(t('meanDiffSample.resultsTitle').toUpperCase(), M, y);
  y += 2;
  draw(P.slate200);
  ln(M, y, M + CW, y, 0.3);
  y += 6;

  const tableRows = [
    [t('meanDiffSample.tableGroup1'), result.n1.toLocaleString()],
    [t('meanDiffSample.tableGroup2'), result.n2.toLocaleString()],
    [t('meanDiffSample.tableTotal'), result.total.toLocaleString()],
    [t('meanDiffSample.tableDifference'), result.difference.toFixed(3)],
    [t('meanDiffSample.tablePooledSD'), result.pooledSD.toFixed(3)],
  ];

  autoTable(doc, {
    startY: y,
    head: [[
      t('meanDiffSample.tableHeaderParameter'),
      t('meanDiffSample.tableHeaderValue'),
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
      0: { cellWidth: 70, textColor: P.slate700, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'center', textColor: P.slate700 },
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

  // Formula
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  color(P.slate600);
  doc.text(t('meanDiffSample.formulaTitle'), M, y);
  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  color(P.slate500);
  const formula = t('meanDiffSample.formula');
  const formulaLines = doc.splitTextToSize(formula, CW);
  doc.text(formulaLines, M, y);
  y += formulaLines.length * 4 + 4;

  // Footnote
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  color(P.slate400);
  const note = t('meanDiffSample.footnote');
  const noteLines = doc.splitTextToSize(note, CW);
  doc.text(noteLines, M, y);

  // Footer
  const fY = 284;
  draw(P.slate200);
  ln(M, fY, W - M, fY, 0.3);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  color(P.slate400);
  doc.text(t('meanDiffSample.reportFooter'), M, fY + 4.5);
  doc.setFont('helvetica', 'bold');
  color(P.slate500);
  doc.text('1 / 1', W - M, fY + 6.5, { align: 'right' });

  doc.save(`MeanDifference_${inputs.mean1}_${inputs.mean2}.pdf`);
}


// Main Component
export default function MeanDifference() {
  const { t, i18n } = useTranslation();

  // Input states – all numeric fields start empty
  const [mean1, setMean1] = useState('');
  const [mean2, setMean2] = useState('');
  const [sd1, setSd1] = useState('');
  const [sd2, setSd2] = useState('');
  const [confidence, setConfidence] = useState('95');
  const [power, setPower] = useState('80');
  const [ratio, setRatio] = useState('1');

  const [result, setResult] = useState<SampleSizeResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Recompute on any input change
  useEffect(() => {
    // Parse only if all fields are non-empty numbers
    const m1 = mean1.trim() === '' ? NaN : parseFloat(mean1);
    const m2 = mean2.trim() === '' ? NaN : parseFloat(mean2);
    const s1 = sd1.trim() === '' ? NaN : parseFloat(sd1);
    const s2 = sd2.trim() === '' ? NaN : parseFloat(sd2);
    const conf = parseFloat(confidence);
    const pow = parseFloat(power);
    const r = parseFloat(ratio);

    if (isNaN(m1) || isNaN(m2) || isNaN(s1) || isNaN(s2) || isNaN(conf) || isNaN(pow) || isNaN(r)) {
      setResult(null);
      return;
    }
    if (s1 <= 0 || s2 <= 0 || r <= 0) {
      setResult(null);
      return;
    }

    const res = computeSampleSizes(m1, m2, s1, s2, conf, pow, r);
    setResult(res);
  }, [mean1, mean2, sd1, sd2, confidence, power, ratio]);

  // Handlers
  const handleClear = () => {
    setMean1('');
    setMean2('');
    setSd1('');
    setSd2('');
    setConfidence('95');
    setPower('80');
    setRatio('1');
    setResult(null);
    toast.info(t('meanDiffSample.clearMessage'));
  };

  const handleExample = () => {
    setMean1('132.86');
    setMean2('127.44');
    setSd1('15.34');
    setSd2('18.23');
    setConfidence('95');
    setPower('80');
    setRatio('1');
    toast.success(t('meanDiffSample.exampleLoaded'));
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `Sample sizes:\nGroup 1: ${result.n1}\nGroup 2: ${result.n2}\nTotal: ${result.total}\nDifference: ${result.difference.toFixed(3)}\nPooled SD: ${result.pooledSD.toFixed(3)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('meanDiffSample.copySuccess'));
    } catch {
      toast.error(t('meanDiffSample.copyError'));
    }
  };

  const handleExport = () => {
    if (!result) return;
    const m1 = parseFloat(mean1);
    const m2 = parseFloat(mean2);
    const s1 = parseFloat(sd1);
    const s2 = parseFloat(sd2);
    const conf = parseFloat(confidence);
    const pow = parseFloat(power);
    const r = parseFloat(ratio);
    try {
      exportMeanDifferencePdf(result, { mean1: m1, mean2: m2, sd1: s1, sd2: s2, confidence: conf, power: pow, ratio: r }, t, i18n.language);
      toast.success(t('meanDiffSample.exportSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('meanDiffSample.exportError'));
    }
  };

  const showResults = result !== null;

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
                {t('meanDiffSample.title')}
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
                {t('meanDiffSample.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {t('meanDiffSample.subtitle')}
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
                {t('meanDiffSample.parameters')}
              </h2>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                      {t('meanDiffSample.mean1Label')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={mean1}
                      onChange={(e) => setMean1(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                      {t('meanDiffSample.mean2Label')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={mean2}
                      onChange={(e) => setMean2(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                      {t('meanDiffSample.sd1Label')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={sd1}
                      onChange={(e) => setSd1(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                      {t('meanDiffSample.sd2Label')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={sd2}
                      onChange={(e) => setSd2(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanDiffSample.confidenceLabel')}
                  </label>
                  <select
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="90">90 %</option>
                    <option value="95">95 % ({t('meanDiffSample.standard')})</option>
                    <option value="99">99 %</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanDiffSample.powerLabel')}
                  </label>
                  <select
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="80">80 %</option>
                    <option value="85">85 %</option>
                    <option value="90">90 %</option>
                    <option value="95">95 %</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanDiffSample.ratioLabel')}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t('meanDiffSample.ratioNote')}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={handleExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('meanDiffSample.btnExample')}
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
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" />
                  {t('meanDiffSample.resultsTitle')}
                </h2>
                {showResults && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('meanDiffSample.btnCopy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleExport}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('meanDiffSample.btnExport')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 bg-slate-50/30 dark:bg-slate-900/10">
                {!showResults ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">{t('meanDiffSample.enterData')}</p>
                    <p className="text-sm mt-2 text-slate-400">
                      {t('meanDiffSample.enterDataHint')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Hero card : total sample size */}
                    <div className="p-6 rounded-3xl text-center border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                        {t('meanDiffSample.totalSampleSize')}
                      </p>
                      <div className="text-5xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                        {result.total.toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        {t('meanDiffSample.breakdown', { n1: result.n1, n2: result.n2 })}
                      </p>
                    </div>

                    {/* Détails par groupe : moyenne, écart‑type, variance */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          {t('meanDiffSample.group1')}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('meanDiffSample.mean')}</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {parseFloat(mean1).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('meanDiffSample.sd')}</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {parseFloat(sd1).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('meanDiffSample.variance')}</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {Math.pow(parseFloat(sd1), 2).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          {t('meanDiffSample.group2')}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('meanDiffSample.mean')}</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {parseFloat(mean2).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('meanDiffSample.sd')}</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {parseFloat(sd2).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{t('meanDiffSample.variance')}</span>
                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                              {Math.pow(parseFloat(sd2), 2).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Métriques : différence et écart‑type poolé */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center">
                        <div className="text-xs text-slate-500 uppercase tracking-wide">
                          {t('meanDiffSample.differenceLabel')}
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                          {result.difference.toFixed(3)}
                        </div>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center">
                        <div className="text-xs text-slate-500 uppercase tracking-wide">
                          {t('meanDiffSample.pooledSDLabel')}
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                          {result.pooledSD.toFixed(3)}
                        </div>
                      </div>
                    </div>

                    {/* Tableau détaillé */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold tracking-widest text-slate-400 mb-4">
                        {t('meanDiffSample.details')}
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">
                                {t('meanDiffSample.tableHeaderParameter')}
                              </th>
                              <th className="px-3 py-2 text-right font-semibold">
                                {t('meanDiffSample.tableHeaderValue')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('meanDiffSample.tableGroup1')}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                {result.n1.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('meanDiffSample.tableGroup2')}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                {result.n2.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('meanDiffSample.tableTotal')}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                {result.total.toLocaleString()}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('meanDiffSample.tableDifference')}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                {result.difference.toFixed(3)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('meanDiffSample.tablePooledSD')}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                {result.pooledSD.toFixed(3)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Interprétation */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> {t('meanDiffSample.interpretationTitle')}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {t('meanDiffSample.interpretationText', {
                          power: power,
                          delta: result.difference.toFixed(3),
                          confidence: confidence,
                          total: result.total,
                        })}
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
                  {t('meanDiffSample.helpTitle')}
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
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">1</div>
                    {t('meanDiffSample.helpPrincipleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('meanDiffSample.helpPrinciple')}
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">2</div>
                    {t('meanDiffSample.helpFormulasTitle')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="font-mono">n₁ = (z<sub>α/2</sub> + z<sub>β</sub>)² × (σ₁² + σ₂² / r) / Δ²</div>
                    <div className="font-mono">n₂ = r × n₁</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t('meanDiffSample.formulaExplanation')}
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">3</div>
                    {t('meanDiffSample.helpUsageTitle')}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('meanDiffSample.helpUsage')}
                  </p>
                </section>

                <div className="text-right">
                  <a
                    href="https://www.openepi.com/SampleSize/SSMean.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700"
                  >
                    {t('meanDiffSample.helpSource')}
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