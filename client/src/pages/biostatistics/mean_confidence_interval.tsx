import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Calculator,
  Presentation,
  Copy,
  FileDown,
  HelpCircle,
  X,
  Trash2,
  Info,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  TrendingUp,
  Scale,
  Layers,
  Activity,
  Sigma,
  Hash,
  Gauge
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Mean Confidence Interval Calculator (MeanCI)
 * 
 * This component replicates OpenEpi's MeanCI module for estimating a population mean
 * from sample statistics. It computes confidence intervals using both the normal
 * approximation (Z‑method) and the t‑distribution, with an optional finite population
 * correction (FPC) when the total population size is provided.
 * 
 * All critical values (z, t) are obtained from the jStat library when available;
 * otherwise, reasonable fallbacks are used. The results are displayed in a clean
 * interface and can be exported as a PDF report.
 */

export default function MeanConfidenceInterval() {
  const { t } = useTranslation();

  //  State declarations 
  const [sampleMean, setSampleMean] = useState<string>('');       // Sample mean (x̄)
  const [sampleStddev, setSampleStddev] = useState<string>('');   // Sample standard deviation (s)
  const [sampleSize, setSampleSize] = useState<string>('');       // Sample size (n)
  const [populationSize, setPopulationSize] = useState<string>(''); // Population size (N, optional)
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95'); // Confidence level (90,95,99)
  const [results, setResults] = useState<any>(null);              // Computed results object
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false); // Help modal visibility
  const [showMethodDetails, setShowMethodDetails] = useState<boolean>(false); // Toggle methodological notes
  const resultsRef = useRef<HTMLDivElement>(null);                // Reference to results container

  // Check if jStat is already available (e.g., from global scope)
  const hasJStat = typeof (window as any).jStat !== 'undefined';

  //  Dynamic loading of jStat 
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        document.body.appendChild(script);
      }
    };
    loadScripts();
  }, []); // Runs once on mount

  //  Formatting helper (consistent with OpenEpi's output style) 
  const formatNumber = (num: number, decimals: number = 4): string => {
    if (num === Infinity || num === -Infinity) return '∞';
    if (isNaN(num) || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  //  Core calculation function (matches OpenEpi MeanCI) 
  const calculateCI = () => {
    const mean = parseFloat(sampleMean) || 0;
    const stddev = parseFloat(sampleStddev) || 0;
    const n = parseInt(sampleSize) || 0;
    let N = populationSize.trim() === '' ? Infinity : parseFloat(populationSize);
    const conf = parseInt(confidenceLevel);
    const alpha = 1 - conf / 100;

    // Input validation
    if (stddev < 0 || n < 2 || isNaN(mean) || isNaN(stddev) || isNaN(n)) {
      setResults(null);
      return;
    }
    if (isNaN(N) || N <= 0) N = Infinity;
    if (N < n) N = n; // OpenEpi logic: N cannot be smaller than n

    //  Standard error 
    const seBase = stddev / Math.sqrt(n);
    // Finite population correction (FPC): sqrt((N-n)/(N-1))
    const fpc = N === Infinity ? 1 : Math.sqrt((N - n) / (N - 1));
    const se = seBase * fpc;

    const variance = stddev ** 2;

    //  Critical values 
    const z = hasJStat ? (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1) : 1.96;
    const df = n - 1;
    const t = hasJStat ? (window as any).jStat.studentt.inv(1 - alpha / 2, df) : 2.0;

    //  Margins of error and intervals 
    const zMargin = z * se;
    const tMargin = t * se;

    const zLower = mean - zMargin;
    const zUpper = mean + zMargin;
    const tLower = mean - tMargin;
    const tUpper = mean + tMargin;
    const zWidth = zUpper - zLower;
    const tWidth = tUpper - tLower;

    //  Assemble results object 
    setResults({
      mean,
      stddev,
      n,
      N,
      conf,
      se,
      variance,
      fpc,
      df,
      zValue: z,
      tValue: t,
      zLower,
      zUpper,
      zWidth,
      tLower,
      tUpper,
      tWidth,
      hasJStat
    });
  };

  //  Automatic recalculation whenever inputs change 
  useEffect(() => {
    calculateCI();
  }, [sampleMean, sampleStddev, sampleSize, populationSize, confidenceLevel]);

  //  UI handlers 

  // Reset all input fields
  const clear = () => {
    setSampleMean('');
    setSampleStddev('');
    setSampleSize('');
    setPopulationSize('');
    setConfidenceLevel('95');
    setResults(null);
    toast.info(t('meanCi.clearMessage'));
  };

  // Load an example dataset (typical values)
  const loadExample = () => {
    setSampleMean('50');
    setSampleStddev('10');
    setSampleSize('30');
    setPopulationSize('');
    toast.success(t('meanCi.exampleLoaded'));
  };

  // Copy results to clipboard as formatted text
  const copyResults = async () => {
    if (!results) return;
    const text = `${t('meanCi.copyPrefix')}
${t('meanCi.mean')} : ${formatNumber(results.mean)}
${t('meanCi.stddev')} : ${formatNumber(results.stddev)}
${t('meanCi.sampleSize')} : ${results.n}
${t('meanCi.populationSize')} : ${results.N === Infinity ? t('meanCi.infinite') : results.N}
${t('meanCi.confidenceLevel')} : ${results.conf}%

${t('meanCi.standardError')} : ${formatNumber(results.se, 6)}
${t('meanCi.fpc')} : ${formatNumber(results.fpc, 6)}
${t('meanCi.df')} : ${results.df}

${t('meanCi.zInterval', { level: results.conf })} : [${formatNumber(results.zLower)} – ${formatNumber(results.zUpper)}]
${t('meanCi.tInterval', { level: results.conf })} : [${formatNumber(results.tLower)} – ${formatNumber(results.tUpper)}]

${t('meanCi.interpretationText', {
  level: results.conf,
  lower: formatNumber(results.tLower),
  upper: formatNumber(results.tUpper)
})}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('meanCi.copySuccess'));
    } catch {
      toast.error(t('meanCi.copyError'));
    }
  };

  // Export a comprehensive PDF report
  const exportPDF = () => {
    if (!results) {
      toast.error(t('meanCi.exportNoData'));
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Colour definitions (Tailwind slate palette)
      const colorPrimary: [number, number, number] = [59, 130, 246]; // blue-500
      const colorSlate = {
        50: [248, 250, 252] as [number, number, number],
        100: [241, 245, 249] as [number, number, number],
        200: [226, 232, 240] as [number, number, number],
        500: [100, 116, 139] as [number, number, number],
        700: [51, 65, 85] as [number, number, number],
        900: [15, 23, 42] as [number, number, number],
      };

      //  Header 
      doc.setFillColor(...colorSlate[50]);
      doc.roundedRect(0, 0, 210, 40, 0, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('meanCi.reportTitle'), 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`${t('meanCi.reportGenerated')} ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('MeanCI – OpenEpi', 190, 32, { align: 'right' });

      //  Input data summary 
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('meanCi.analysedData'), 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${t('meanCi.mean')} : ${formatNumber(results.mean)}`, 25, y); y += 6;
      doc.text(`${t('meanCi.stddev')} : ${formatNumber(results.stddev)}`, 25, y); y += 6;
      doc.text(`${t('meanCi.sampleSize')} : ${results.n}`, 25, y); y += 6;
      doc.text(`${t('meanCi.populationSize')} : ${results.N === Infinity ? t('meanCi.infinite') : results.N}`, 25, y); y += 6;
      doc.text(`${t('meanCi.confidenceLevel')} : ${results.conf} %`, 25, y); y += 12;

      //  t‑interval card 
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(20, y, 170, 35, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(t('meanCi.tIntervalCard', { level: results.conf }), 105, y + 8, { align: 'center' });
      doc.setFontSize(16);
      doc.text(`[${formatNumber(results.tLower)} – ${formatNumber(results.tUpper)}]`, 105, y + 22, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`${t('meanCi.mean')} : ${formatNumber(results.mean)}`, 105, y + 30, { align: 'center' });
      y += 45;

      //  Descriptive statistics table 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('meanCi.descriptiveStats'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const statsTable = [
        [t('meanCi.variance'), formatNumber(results.variance, 4)],
        [t('meanCi.standardError'), formatNumber(results.se, 6)],
        [t('meanCi.fpc'), formatNumber(results.fpc, 6)],
        [t('meanCi.df'), results.df.toString()],
        [t('meanCi.zCritical'), formatNumber(results.zValue, 4)],
        [t('meanCi.tCritical'), formatNumber(results.tValue, 4)],
      ];

      autoTable(doc, {
        startY: y,
        body: statsTable,
        theme: 'grid',
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold', fillColor: colorSlate[50] },
          1: { cellWidth: 60, halign: 'right' },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      //  Confidence intervals comparison table 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('meanCi.ciComparison', { level: results.conf }), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const icTable = [
        [t('meanCi.zMethod'), formatNumber(results.zLower), formatNumber(results.zUpper), formatNumber(results.zWidth)],
        [t('meanCi.tMethod'), formatNumber(results.tLower), formatNumber(results.tUpper), formatNumber(results.tWidth)],
      ];

      autoTable(doc, {
        startY: y,
        head: [[t('meanCi.method'), t('meanCi.lower'), t('meanCi.upper'), t('meanCi.width')]],
        body: icTable,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      //  Interpretation 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('meanCi.interpretation'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const interpretation = t('meanCi.interpretationText', {
        level: results.conf,
        lower: formatNumber(results.tLower),
        upper: formatNumber(results.tUpper)
      });
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;

      //  References and notes 
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text(t('meanCi.referencesNote'), 20, y); y += 4;
      doc.text(t('meanCi.fpcNote'), 20, y); y += 4;

      //  Footer 
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('MeanCI – conforme OpenEpi', 20, footerY + 5);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`MeanCI_${results.mean.toFixed(1)}_n${results.n}.pdf`);
      toast.success(t('meanCi.exportSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('meanCi.exportError'));
    }
  };

  //  Render (JSX) 
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb navigation */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">{t('common.home')}</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">{t('meanCi.title')}</span></li>
          </ol>
        </nav>

        {/* Page header */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Sigma className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('meanCi.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {t('meanCi.description')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="hidden md:flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left column – input form */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> {t('meanCi.parameters')}
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanCi.sampleMean')}
                  </label>
                  <input
                    type="number"
                    value={sampleMean}
                    onChange={(e) => setSampleMean(e.target.value)}
                    step="any"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('meanCi.sampleMeanPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanCi.stddev')}
                  </label>
                  <input
                    type="number"
                    value={sampleStddev}
                    onChange={(e) => setSampleStddev(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('meanCi.stddevPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanCi.sampleSize')}
                  </label>
                  <input
                    type="number"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(e.target.value)}
                    min="2"
                    step="1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('meanCi.sampleSizePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanCi.populationSize')} <span className="font-normal">({t('meanCi.optional')})</span>
                  </label>
                  <input
                    type="number"
                    value={populationSize}
                    onChange={(e) => setPopulationSize(e.target.value)}
                    min="1"
                    step="1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('meanCi.populationSizePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('meanCi.confidenceLevel')}
                  </label>
                  <select
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="90">90%</option>
                    <option value="95">{t('meanCi.standard')} 95%</option>
                    <option value="99">99%</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('meanCi.example')}
                </button>
                <button
                  onClick={clear}
                  className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right column – results display */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> {t('meanCi.resultsTitle')}
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('meanCi.copyTooltip')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('meanCi.exportTooltip')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {!results ? (
                  // Placeholder when no results
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">{t('meanCi.enterData')}</p>
                    <div className="text-4xl font-bold mt-2">
                      0.00
                    </div>
                  </div>
                ) : (
                  // Results area
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* t‑interval card */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        {t('meanCi.tIntervalCard', { level: results.conf })}
                      </p>
                      <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                        [{formatNumber(results.tLower)} – {formatNumber(results.tUpper)}]
                      </div>
                      <p className="text-sm text-slate-500">
                        {t('meanCi.mean')} = {formatNumber(results.mean)} • {t('meanCi.width')} = {formatNumber(results.tWidth)}
                      </p>
                    </div>

                    {/* Descriptive statistics cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">{t('meanCi.standardError')}</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.se, 6)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">{t('meanCi.variance')}</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.variance, 4)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">{t('meanCi.df')}</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{results.df}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">{t('meanCi.fpc')}</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.fpc, 6)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">{t('meanCi.zCritical')}</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.zValue, 4)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">{t('meanCi.tCritical')}</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.tValue, 4)}</p>
                      </div>
                    </div>

                    {/* Z vs t comparison table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {t('meanCi.methodComparison')}
                        </h3>
                        {!hasJStat && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            {t('meanCi.approximationWarning')}
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-6 py-3 text-left font-semibold">{t('meanCi.method')}</th>
                              <th className="px-6 py-3 text-center font-semibold">{t('meanCi.lower')}</th>
                              <th className="px-6 py-3 text-center font-semibold">{t('meanCi.upper')}</th>
                              <th className="px-6 py-3 text-center font-semibold">{t('meanCi.width')}</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr>
                              <td className="px-6 py-3 font-medium">{t('meanCi.zMethod')}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.zLower)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.zUpper)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.zWidth)}</td>
                            </tr>
                            <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                              <td className="px-6 py-3 font-medium">{t('meanCi.tMethod')}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.tLower)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.tUpper)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.tWidth)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                            {t('meanCi.interpretation')}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {t('meanCi.interpretationText', {
                              level: results.conf,
                              lower: formatNumber(results.tLower),
                              upper: formatNumber(results.tUpper)
                            })}
                            {results.N !== Infinity && (
                              <> {t('meanCi.fpcApplied', { fpc: formatNumber(results.fpc, 4) })}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('meanCi.helpTitle')}
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      1
                    </div>
                    {t('meanCi.principleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('meanCi.principleText')}
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-500" /> Z vs t
                    </div>
                    <div className="text-xs text-slate-500">{t('meanCi.zVsT')}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-emerald-500" /> FPC
                    </div>
                    <div className="text-xs text-slate-500">{t('meanCi.fpcDesc')}</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    {t('meanCi.methodsTitle')}
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">{t('meanCi.zMethod')}</strong> – {t('meanCi.zDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('meanCi.tMethod')}</strong> – {t('meanCi.tDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('meanCi.fpc')}</strong> – {t('meanCi.fpcDesc')}</p>
                  </div>
                  <a
                    href="https://www.openepi.com/Mean/Mean.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    {t('meanCi.sourceLink')} <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    {t('meanCi.resourcesTitle')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <a href="https://www.openepi.com/PDFDocs/MeanDoc.pdf" target="_blank" className="text-blue-600 hover:underline">
                        {t('meanCi.openEpiPdf')}
                      </a>
                    </p>
                    <p>
                      Rosner B. – <em>Fundamentals of Biostatistics</em>, 8th ed.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}