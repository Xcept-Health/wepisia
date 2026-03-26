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
  confidenceLevel: number;
  sampleSize: number;
}


// Pure calculation helpers


/** Two-tailed z-score for a given confidence level (in percent) */
const Z = (confidence: number): number => {
  const alpha = 1 - confidence / 100;
  return jStat.normal.inv(1 - alpha / 2, 0, 1);
};

/**
 * Sample size for one confidence level.
 * Uses the standard formula with finite population correction (FPC).
 */
function computeSampleSize(
  N: number,
  p: number,
  d: number,
  deff: number,
  conf: number
): number {
  const p_frac = Math.min(100, Math.max(0, p)) / 100;
  const d_frac = Math.min(100, Math.max(0, d)) / 100;
  const z = Z(conf);

  // If proportion is 0% or 100%, sample size is 0 (no variability)
  if (p_frac === 0 || p_frac === 1) return 0;

  const numerator = deff * N * p_frac * (1 - p_frac);
  const denominator = (d_frac * d_frac) / (z * z) * (N - 1) + p_frac * (1 - p_frac);

  if (denominator === 0) return N; // fallback
  const n = numerator / denominator;
  return Math.ceil(Math.min(n, N));
}

/**
 * Compute sample sizes for all standard confidence levels.
 */
function computeAllSampleSizes(
  N: number,
  p: number,
  d: number,
  deff: number
): SampleSizeResult[] {
  const levels = [80, 90, 95, 97, 99, 99.9, 99.99];
  return levels.map((conf) => ({
    confidenceLevel: conf,
    sampleSize: computeSampleSize(N, p, d, deff, conf),
  }));
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

function exportSampleSizePdf(
  results: SampleSizeResult[],
  inputs: { N: number; p: number; d: number; deff: number },
  t: (key: string, fallback?: string) => string,
  lang: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 16, CW = W - M * 2;

  const fill = (c: RGB) => doc.setFillColor(...c);
  const draw = (c: RGB) => doc.setDrawColor(...c);
  const color = (c: RGB) => doc.setTextColor(...c);
  const rr = (x: number, y: number, w: number, h: number, rad: number, s: 'F' | 'S' | 'FD' = 'F') =>
    doc.roundedRect(x, y, w, h, rad, rad, s);
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
  doc.text(t('sampleSizeProportion.reportTitle'), M + 5, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  color(P.slate500);
  doc.text(t('sampleSizeProportion.reportSubtitle'), M + 5, 28);

  const dateStr = new Date().toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  doc.text(
    t('sampleSizeProportion.reportGenerated', { date: dateStr, time: timeStr }),
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
    { label: t('sampleSizeProportion.populationLabel'), value: inputs.N.toLocaleString() },
    { label: t('sampleSizeProportion.pLabel'), value: `${inputs.p} %` },
    { label: t('sampleSizeProportion.dLabel'), value: `${inputs.d} %` },
    { label: t('sampleSizeProportion.deffLabel'), value: inputs.deff.toFixed(1) },
  ];

  inputsData.forEach((item, i) => {
    const x = M + i * (cardW + gap);
    fill(P.white);
    draw(P.slate200);
    rr(x, y, cardW, cardH, 2.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    color(P.slate400);
    doc.text(item.label.toUpperCase(), x + cardW / 2, y + 6.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    color(P.slate700);
    doc.text(item.value, x + cardW / 2, y + 16.5, { align: 'center' });
  });
  y += cardH + 12;

  // Results table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  color(P.slate700);
  doc.text(t('sampleSizeProportion.resultsTitle').toUpperCase(), M, y);
  y += 2;
  draw(P.slate200);
  ln(M, y, M + CW, y, 0.3);
  y += 6;

  const tableRows = results.map((r) => [
    `${r.confidenceLevel} %`,
    r.sampleSize.toLocaleString(),
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      t('sampleSizeProportion.tableHeaderConfidence'),
      t('sampleSizeProportion.tableHeaderSampleSize'),
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
      0: { cellWidth: 60, halign: 'center', textColor: P.slate700 },
      1: { cellWidth: 40, halign: 'center', textColor: P.slate700, fontStyle: 'bold' },
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

  // Equation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  color(P.slate600);
  doc.text(t('sampleSizeProportion.equationTitle'), M, y);
  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  color(P.slate500);
  const eqLines = doc.splitTextToSize(
    t('sampleSizeProportion.equation'),
    CW
  );
  doc.text(eqLines, M, y);
  y += eqLines.length * 4 + 4;

  // Footnote
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  color(P.slate400);
  const foot = doc.splitTextToSize(
    t('sampleSizeProportion.footnote'),
    CW
  );
  doc.text(foot, M, y);

  // Footer
  const fY = 284;
  draw(P.slate200);
  ln(M, fY, W - M, fY, 0.3);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  color(P.slate400);
  doc.text(t('sampleSizeProportion.reportFooter'), M, fY + 4.5);
  doc.setFont('helvetica', 'bold');
  color(P.slate500);
  doc.text('1 / 1', W - M, fY + 6.5, { align: 'right' });

  doc.save(`SampleSize_${inputs.N}_p${inputs.p}_d${inputs.d}.pdf`);
}


// Main Component


export default function SampleSizeProportion() {
  const { t, i18n } = useTranslation();

  // Input states (as strings for easy binding)
  const [population, setPopulation] = useState('1000000');
  const [p, setP] = useState('50');
  const [d, setD] = useState('5');
  const [deff, setDeff] = useState('1');

  const [results, setResults] = useState<SampleSizeResult[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Recompute when any input changes
  useEffect(() => {
    const N = parseFloat(population);
    const prop = parseFloat(p);
    const prec = parseFloat(d);
    const design = parseFloat(deff);

    if (
      isNaN(N) || N <= 0 ||
      isNaN(prop) || prop < 0 || prop > 100 ||
      isNaN(prec) || prec < 0 || prec > 100 ||
      isNaN(design) || design < 0
    ) {
      setResults([]);
      return;
    }

    const sizes = computeAllSampleSizes(N, prop, prec, design);
    setResults(sizes);
  }, [population, p, d, deff]);

  // Handlers
  const handleClear = () => {
    setPopulation('');
    setP('');
    setD('');
    setDeff('');
    setResults([]);
    toast.info(t('sampleSizeProportion.clearMessage'));
  };

  const handleExample = () => {
    setPopulation('1000000');
    setP('50');
    setD('5');
    setDeff('1');
    toast.success(t('sampleSizeProportion.exampleLoaded'));
  };

  const handleCopy = async () => {
    if (results.length === 0) return;
    const lines = results.map(
      (r) => `${r.confidenceLevel}% : ${r.sampleSize.toLocaleString()}`
    );
    const text = `${t('sampleSizeProportion.copyPrefix')}\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('sampleSizeProportion.copySuccess'));
    } catch {
      toast.error(t('sampleSizeProportion.copyError'));
    }
  };

  const handleExport = () => {
    const N = parseFloat(population);
    const prop = parseFloat(p);
    const prec = parseFloat(d);
    const design = parseFloat(deff);
    if (results.length === 0 || isNaN(N) || isNaN(prop) || isNaN(prec) || isNaN(design)) {
      toast.error(t('sampleSizeProportion.exportError'));
      return;
    }
    try {
      exportSampleSizePdf(results, { N, p: prop, d: prec, deff: design }, t, i18n.language);
      toast.success(t('sampleSizeProportion.exportSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('sampleSizeProportion.exportError'));
    }
  };

  // UI helpers
  const showResults = results.length > 0;

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
                {t('sampleSizeProportion.title')}
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
                {t('sampleSizeProportion.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {t('sampleSizeProportion.subtitle')}
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
                {t('sampleSizeProportion.parameters')}
              </h2>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('sampleSizeProportion.populationLabel')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={population}
                    onChange={(e) => setPopulation(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('sampleSizeProportion.populationPlaceholder')}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t('sampleSizeProportion.populationNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('sampleSizeProportion.pLabel')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t('sampleSizeProportion.pNote')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('sampleSizeProportion.dLabel')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={d}
                    onChange={(e) => setD(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('sampleSizeProportion.deffLabel')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={deff}
                    onChange={(e) => setDeff(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t('sampleSizeProportion.deffNote')}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={handleExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('sampleSizeProportion.btnExample')}
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl"
                  aria-label={t('sampleSizeProportion.btnClear')}
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
                  {t('sampleSizeProportion.resultsTitle')}
                </h2>
                {showResults && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('sampleSizeProportion.btnCopy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleExport}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('sampleSizeProportion.btnExport')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 bg-slate-50/30 dark:bg-slate-900/10">
                {!showResults ? (
                  <div className="flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">
                      {t('sampleSizeProportion.enterData')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Results table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-3 text-left font-semibold text-slate-500">
                              {t('sampleSizeProportion.tableHeaderConfidence')}
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-500">
                              {t('sampleSizeProportion.tableHeaderSampleSize')}
                            </th>
                           </tr>
                        </thead>
                        <tbody>
                          {results.map((r) => (
                            <tr
                              key={r.confidenceLevel}
                              className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                            >
                              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                {r.confidenceLevel} %
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                {r.sampleSize.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Equation box */}
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-5 text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {t('sampleSizeProportion.equationTitle')}
                      </div>
                      <div className="leading-relaxed">
                        n = [DEFF × N × p(1-p)] / [ (d² / Z²<sub>1-α/2</sub>) × (N-1) + p(1-p) ]
                      </div>
                      <div className="mt-3 text-[11px] text-slate-400 italic">
                        {t('sampleSizeProportion.footnote')}
                      </div>
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
                  {t('sampleSizeProportion.helpTitle')}
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
                    {t('sampleSizeProportion.helpPrincipleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('sampleSizeProportion.helpPrinciple')}
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    {t('sampleSizeProportion.helpFormulaTitle')}
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm font-mono text-slate-700 dark:text-slate-300">
                    n = [DEFF × N × p(1-p)] / [ (d² / Z²) × (N-1) + p(1-p) ]
                  </div>
                  <ul className="mt-3 text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                    <li>{t('sampleSizeProportion.helpFormulaN')}</li>
                    <li>{t('sampleSizeProportion.helpFormulaP')}</li>
                    <li>{t('sampleSizeProportion.helpFormulaD')}</li>
                    <li>{t('sampleSizeProportion.helpFormulaDeff')}</li>
                    <li>{t('sampleSizeProportion.helpFormulaZ')}</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    {t('sampleSizeProportion.helpUsageTitle')}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('sampleSizeProportion.helpUsage')}
                  </p>
                </section>

                <div className="text-right">
                  <a
                    href="https://www.openepi.com/SampleSize/SSPropor.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700"
                  >
                    {t('sampleSizeProportion.helpSource')}
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