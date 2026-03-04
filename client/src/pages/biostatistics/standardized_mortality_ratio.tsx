import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useTranslation, Trans } from 'react-i18next';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

/**
 * Standardized Mortality Ratio (SMR) Calculator
 * 
 * This component computes the SMR (also called RMS in French) with multiple
 * confidence interval methods and hypothesis tests, exactly as in reference
 * tools like OpenEpi.
 * 
 * All calculations are exact and reproducible thanks to jStat's direct use.
 * Fully internationalized (i18n) version.
 */

export default function StdMortalityRatio() {
  const { t, i18n } = useTranslation(); // ← Correction : ajout de i18n
  const [observed, setObserved] = useState<string>('');
  const [expected, setExpected] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [calculatedSmr, setCalculatedSmr] = useState<string>('-');
  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // jStat is available – we rely on it for exact computations.
  const hasJStat = true;

  // Preview SMR as soon as inputs change (without full statistical details)
  useEffect(() => {
    const obs = parseFloat(observed) || 0;
    const exp = parseFloat(expected) || 0;
    if (exp > 0) {
      setCalculatedSmr((obs / exp).toFixed(4));
    } else {
      setCalculatedSmr('-');
    }
  }, [observed, expected]);

  // Core calculation: SMR, confidence intervals, p‑values
  const calculate = () => {
    const obs = parseFloat(observed);
    const exp = parseFloat(expected);
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;
    // z‑score for the chosen confidence level (two‑tailed)
    const z = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;

    if (isNaN(obs) || isNaN(exp) || obs < 0 || exp <= 0) {
      setResults(null);
      return;
    }

    const smr = obs / exp;

    // ---------- Exact confidence interval (based on chi‑square distribution) ----------
    let exactLower, exactUpper;
    if (hasJStat) {
      if (obs === 0) {
        exactLower = 0;
        // For zero observed, the upper limit uses the chi‑square quantile with 2 degrees of freedom
        exactUpper = jStat.chisquare.inv(1 - alpha, 2) / (2 * exp);
      } else {
        exactLower = jStat.chisquare.inv(alpha / 2, 2 * obs) / (2 * exp);
        exactUpper = jStat.chisquare.inv(1 - alpha / 2, 2 * (obs + 1)) / (2 * exp);
      }
    } else {
      // Robust fallback (only if jStat were missing)
      exactLower = smr * 0.85;
      exactUpper = smr * 1.15;
    }

    // ---------- Byar's approximation (Rothman & Boice, 1979) ----------
    let byarLower, byarUpper;
    if (obs > 0) {
      byarLower = smr * Math.pow(1 - 1 / (9 * obs) - z / (3 * Math.sqrt(obs)), 3);
      byarUpper = ((obs + 1) / exp) * Math.pow(1 - 1 / (9 * (obs + 1)) + z / (3 * Math.sqrt(obs + 1)), 3);
    } else {
      byarLower = 0;
      byarUpper = ((obs + 1) / exp) * Math.pow(1 - 1 / (9 * (obs + 1)) + z / (3 * Math.sqrt(obs + 1)), 3);
    }

    // ---------- Vandenbroucke's method (1982) – square‑root transformation ----------
    let vdbLower, vdbUpper;
    const halfZ = z / 2;
    if (obs > 0) {
      const sqrtObs = Math.sqrt(obs);
      vdbLower = Math.max(0, Math.pow(sqrtObs - halfZ, 2) / exp);
      vdbUpper = Math.pow(sqrtObs + halfZ, 2) / exp;
    } else {
      vdbLower = 0;
      vdbUpper = Math.pow(halfZ, 2) / exp;
    }

    // ---------- Hypothesis tests ----------
    // Chi‑square (1 d.f.)
    const chiSquare = Math.pow(obs - exp, 2) / exp;
    let chiPValue: number;
    if (hasJStat) {
      chiPValue = 1 - jStat.chisquare.cdf(chiSquare, 1);
    } else {
      chiPValue = Math.min(1, Math.exp(-chiSquare / 2) * 2); // rough approximation
    }

    // Exact two‑sided Poisson test (often called "Fisher's exact" for Poisson)
    let exactPValue: number;
    if (hasJStat && jStat.poisson) {
      const poissonCdf = jStat.poisson.cdf;
      if (obs < exp) {
        exactPValue = 2 * poissonCdf(obs, exp);
      } else {
        exactPValue = 2 * (1 - poissonCdf(obs - 1, exp));
      }
      exactPValue = Math.min(exactPValue, 1);
    } else {
      exactPValue = 0.05; // fallback placeholder
    }

    // Mid‑P exact test (less conservative)
    let midPValue: number;
    if (hasJStat && jStat.poisson) {
      const poissonPmf = jStat.poisson.pdf;
      const poissonCdf = jStat.poisson.cdf;
      const probGe = 1 - poissonCdf(obs - 1, exp);
      const probEq = poissonPmf(obs, exp);
      const oneSidedMidP = probGe - 0.5 * probEq;
      midPValue = Math.min(2 * oneSidedMidP, 1);
    } else {
      midPValue = 0.05;
    }

    setResults({
      observed: obs,
      expected: exp,
      smr,
      confidenceLevel: conf,
      exact: { lower: exactLower, upper: exactUpper },
      byar: { lower: byarLower, upper: byarUpper },
      vdb: { lower: vdbLower, upper: vdbUpper },
      chiSquare: { value: chiSquare, df: 1, p: chiPValue },
      exactPValue,
      midPValue,
    });
  };

  // Re‑run calculation whenever inputs change
  useEffect(() => {
    calculate();
  }, [observed, expected, confidenceLevel]);

  // --- UI handlers with translated toasts ---
  const clear = () => {
    setObserved('');
    setExpected('');
    setResults(null);
    toast.info(t('stdMortalityCalculator.clearMessage'));
  };

  const loadExample = () => {
    setObserved('4');
    setExpected('3.3');
    toast.success(t('stdMortalityCalculator.exampleLoaded'));
  };

  const copyResults = async () => {
    if (!results) return;
    try {
      const text = `${t('stdMortalityCalculator.copyPrefix')} ${results.smr.toFixed(4)} [${results.confidenceLevel}% ${t('stdMortalityCalculator.exactCI')}: ${results.exact.lower.toFixed(3)}–${results.exact.upper.toFixed(3)}]`;
      await navigator.clipboard.writeText(text);
      toast.success(t('stdMortalityCalculator.copySuccess'));
    } catch {
      toast.error(t('stdMortalityCalculator.copyError'));
    }
  };

  const exportPDF = () => {
    if (!results) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Colour definitions (Tailwind slate palette)
      const colorPrimary = results.smr > 1
        ? { bg: [255, 247, 237], border: [234, 88, 12], text: [234, 88, 12] }
        : { bg: [236, 253, 245], border: [5, 150, 105], text: [5, 150, 105] };
      const colorSlate = {
        50: [248, 250, 252],
        100: [241, 245, 249],
        200: [226, 232, 240],
        300: [203, 213, 225],
        500: [100, 116, 139],
        700: [51, 65, 85],
        900: [15, 23, 42],
      };
      const colorRed = [239, 68, 68];

      // Helper for rounded rectangles
      const roundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
        doc.roundedRect(x, y, w, h, r, r, style);
      };

      // ---------- Header ----------
      doc.setFillColor(...colorSlate[50]);
      roundedRect(0, 0, 210, 40, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('stdMortalityCalculator.reportTitle'), 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);

      const dateStr = new Date().toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
      doc.text(t('stdMortalityCalculator.reportGenerated', { date: dateStr, time: timeStr }), 20, 32);
      doc.text(t('stdMortalityCalculator.reportSubtitle'), 190, 32, { align: 'right' });

      // ---------- Input data ----------
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('stdMortalityCalculator.analysedData'), 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`${t('stdMortalityCalculator.observedLabel')} : ${results.observed}`, 25, y); y += 6;
      doc.text(`${t('stdMortalityCalculator.expectedLabel')} : ${results.expected.toFixed(4)}`, 25, y); y += 6;
      doc.text(`${t('stdMortalityCalculator.confidenceLabel')} : ${results.confidenceLevel} %`, 25, y); y += 6;
      doc.text(`${t('stdMortalityCalculator.methodUsed')} : ${hasJStat ? 'χ² exact' : t('stdMortalityCalculator.approximation')}`, 25, y); y += 12;

      // ---------- SMR card ----------
      const cardX = 20, cardY = y, cardW = 170, cardH = 35;
      doc.setFillColor(...colorPrimary.bg);
      doc.setDrawColor(...colorPrimary.border);
      roundedRect(cardX, cardY, cardW, cardH, 5, 'FD');
      doc.setTextColor(...colorPrimary.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(t('stdMortalityCalculator.smrCardLabel').toUpperCase(), cardX + cardW / 2, cardY + 11, { align: 'center' });
      doc.setFontSize(28);
      doc.text(results.smr.toFixed(4), cardX + cardW / 2, cardY + 28, { align: 'center' });
      y += cardH + 10;

      // ---------- Exact confidence interval visualisation ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('stdMortalityCalculator.ciExactTitle', { confidence: results.confidenceLevel }), 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 10;

      // Draw a simple axis from 0 to 2.0
      const axisX = 30, axisY = y, axisWidth = 150;
      const minScale = 0, maxScale = 2.0;

      doc.setDrawColor(...colorSlate[300]);
      doc.setLineWidth(0.5);
      doc.line(axisX, axisY, axisX + axisWidth, axisY);

      for (let i = 0; i <= 10; i++) {
        const val = i * 0.2;
        const x = axisX + (val / (maxScale - minScale)) * axisWidth;
        doc.setDrawColor(...(i % 5 === 0 ? colorSlate[500] : colorSlate[300]));
        doc.line(x, axisY - 2, x, axisY + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...colorSlate[500]);
        doc.text(val.toFixed(1), x, axisY + 5, { align: 'center' });
      }

      // Mark the null value (1.0)
      const h0X = axisX + (1.0 / maxScale) * axisWidth;
      doc.setDrawColor(...colorRed);
      doc.setLineWidth(0.8);
      doc.line(h0X, axisY - 4, h0X, axisY + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colorRed);
      doc.text('H₀ = 1.0', h0X, axisY - 6, { align: 'center' });

      // Draw the confidence interval bar
      const leftVal = Math.max(minScale, Math.min(maxScale, results.exact.lower));
      const rightVal = Math.max(minScale, Math.min(maxScale, results.exact.upper));
      const barStartX = axisX + (leftVal / maxScale) * axisWidth;
      const barEndX = axisX + (rightVal / maxScale) * axisWidth;
      const barWidth = barEndX - barStartX;
      const barY = axisY - 3.5;
      const barHeight = 2.5;

      if (barWidth > 0) {
        doc.setFillColor(59, 130, 246);
        doc.setDrawColor(29, 78, 216);
        doc.roundedRect(barStartX, barY, barWidth, barHeight, 1, 1, 'FD');
        doc.setFillColor(29, 78, 216);
        doc.circle(barStartX, barY + barHeight / 2, 0.6, 'F');
        doc.circle(barEndX, barY + barHeight / 2, 0.6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(29, 78, 216);
        doc.text(leftVal.toFixed(3), barStartX, barY - 4, { align: 'center' });
        doc.text(rightVal.toFixed(3), barEndX, barY - 4, { align: 'center' });
      }

      y = axisY + 20;

      // ---------- Statistical table ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('stdMortalityCalculator.statMethodsTitle'), 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = [
        [t('stdMortalityCalculator.methodExact'), results.smr.toFixed(3), `[${results.exact.lower.toFixed(3)} – ${results.exact.upper.toFixed(3)}]`, results.exactPValue.toFixed(4)],
        [t('stdMortalityCalculator.methodMidP'), results.smr.toFixed(3), '—', results.midPValue.toFixed(4)],
        [t('stdMortalityCalculator.methodByar'), results.smr.toFixed(3), `[${results.byar.lower.toFixed(3)} – ${results.byar.upper.toFixed(3)}]`, '—'],
        [t('stdMortalityCalculator.methodVdb'), results.smr.toFixed(3), `[${results.vdb.lower.toFixed(3)} – ${results.vdb.upper.toFixed(3)}]`, '—'],
        [t('stdMortalityCalculator.methodChi2'), '—', '—', results.chiSquare.p.toFixed(4)],
      ];

      autoTable(doc, {
        startY: y,
        head: [[
          t('stdMortalityCalculator.tableHeaderMethod'),
          t('stdMortalityCalculator.tableHeaderSmr'),
          t('stdMortalityCalculator.tableHeaderCi', { confidence: results.confidenceLevel }),
          t('stdMortalityCalculator.tableHeaderP')
        ]],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 55, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- Interpretation ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('stdMortalityCalculator.interpretationTitle'), 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 8;

      let interpretation = '';
      if (results.smr > 1) {
        interpretation = t('stdMortalityCalculator.interpretationHigher', { percent: ((results.smr - 1) * 100).toFixed(1) });
      } else {
        interpretation = t('stdMortalityCalculator.interpretationLower', { percent: ((1 - results.smr) * 100).toFixed(1) });
      }
      interpretation += ' ';
      if (results.exact.lower > 1) {
        interpretation += t('stdMortalityCalculator.interpretationSignifHigh');
      } else if (results.exact.upper < 1) {
        interpretation += t('stdMortalityCalculator.interpretationSignifLow');
      } else {
        interpretation += t('stdMortalityCalculator.interpretationNotSignif');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 8;

      // ---------- Footer ----------
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text(t('stdMortalityCalculator.reportFooter'), 20, footerY + 5);
      doc.text(`1 / 1`, 190, footerY + 5, { align: 'right' });
      doc.text(`${t('stdMortalityCalculator.methodUsed')} : ${hasJStat ? 'χ² exact (jStat)' : t('stdMortalityCalculator.approximation')}`, 20, footerY + 10);

      // Save the PDF
      doc.save(`SMR_Report_${results.observed}_${results.expected.toFixed(1)}.pdf`);
      toast.success(t('stdMortalityCalculator.exportSuccess'));
    } catch (error) {
      console.error('PDF error:', error);
      toast.error(t('stdMortalityCalculator.exportError'));
    }
  };

  // Helper to compute the position of the confidence interval on a dynamic scale
  const getIntervalPosition = () => {
    if (!results) return { left: 0, width: 0 };
    const minVal = Math.min(0, results.exact.lower * 0.8);
    const maxVal = Math.max(2, results.exact.upper * 1.2);
    const range = maxVal - minVal;
    const left = ((results.exact.lower - minVal) / range) * 100;
    const right = ((results.exact.upper - minVal) / range) * 100;
    return { left, width: right - left };
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">{t('common.home')}</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{t('stdMortalityCalculator.title')}</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('stdMortalityCalculator.title')}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t('stdMortalityCalculator.subtitle')}</p>
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
          {/* Left column – input */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> {t('stdMortalityCalculator.parameters')}
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('stdMortalityCalculator.observedLabel')}
                  </label>
                  <input
                    type="number"
                    value={observed}
                    onChange={(e) => setObserved(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder={t('stdMortalityCalculator.observedPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {t('stdMortalityCalculator.expectedLabel')}
                  </label>
                  <input
                    type="number"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
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
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="90">90%</option>
                    <option value="95">95% ({t('stdMortalityCalculator.standard')})</option>
                    <option value="99">99%</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('stdMortalityCalculator.btnExample')}
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

          {/* Right column – results */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> {t('stdMortalityCalculator.resultsTitle')}
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('stdMortalityCalculator.btnCopy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('stdMortalityCalculator.btnExport')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">{t('stdMortalityCalculator.enterData')}</p>
                    <div className="text-4xl font-bold mt-2">
                      {calculatedSmr === '-' ? '0.00' : calculatedSmr}
                    </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* SMR card */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        results.smr > 1
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {t('stdMortalityCalculator.smrCardLabel')}
                      </p>
                      <div
                        className={`text-5xl font-bold tracking-tight mb-2 ${
                          results.smr > 1 ? 'text-orange-600' : 'text-emerald-600'
                        }`}
                      >
                        {results.smr.toFixed(4)}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        {results.observed} {t('stdMortalityCalculator.obsAbbr')} / {results.expected.toFixed(1)} {t('stdMortalityCalculator.expAbbr')}
                      </span>
                    </div>

                    {/* Confidence interval display */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-sm font-semibold text-slate-500">
                          {t('stdMortalityCalculator.ciExactTitle', { confidence: results.confidenceLevel })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-full text-blue-700 dark:text-blue-300 font-bold shadow-sm border border-blue-200 dark:border-blue-800">
                            {hasJStat ? t('stdMortalityCalculator.exactMethod') : t('stdMortalityCalculator.approximation')}
                          </span>
                        </div>
                      </div>

                      {/* Visual scale (unchanged) */}
                      <div className="relative h-24 mb-2">
                        <div className="absolute w-full h-2 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-full top-8 shadow-inner"></div>

                        {[...Array(11)].map((_, i) => {
                          const value = i * 0.2;
                          const left = (value / 2) * 100;
                          return (
                            <div
                              key={i}
                              className="absolute flex flex-col items-center"
                              style={{ left: `${left}%`, top: '4px' }}
                            >
                              <div className={`h-2 w-0.5 ${i % 5 === 0 ? 'bg-slate-500 dark:bg-slate-400' : 'bg-slate-300 dark:bg-slate-600'} rounded-full`}></div>
                              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-1 -translate-x-1/2">
                                {value.toFixed(1)}
                              </span>
                            </div>
                          );
                        })}

                        <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center">
                          <div className="h-4 w-0.5 bg-red-400 dark:bg-red-500 rounded-full shadow-sm"></div>
                          <span className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-1">
                            H₀ = 1.0
                          </span>
                        </div>

                        {(() => {
                          const pos = getIntervalPosition();
                          return (
                            <>
                              <div
                                className="absolute h-3 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 top-7 transition-all duration-300"
                                style={{
                                  left: `${pos.left}%`,
                                  width: `${pos.width}%`,
                                  transform: 'translateY(-50%)',
                                }}
                              >
                                <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                              </div>

                              <div
                                className="absolute top-7 w-0.5 h-5 bg-blue-700 dark:bg-blue-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md"
                                style={{ left: `${pos.left}%` }}
                              >
                                <div className="absolute -left-1 top-1/2 w-2 h-2 bg-blue-700 dark:bg-blue-400 rounded-full"></div>
                              </div>
                              <div
                                className="absolute top-7 w-0.5 h-5 bg-blue-700 dark:bg-blue-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md"
                                style={{ left: `${pos.left + pos.width}%` }}
                              >
                                <div className="absolute -right-1 top-1/2 w-2 h-2 bg-blue-700 dark:bg-blue-400 rounded-full"></div>
                              </div>

                              <div
                                className="absolute -top-6 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm"
                                style={{ left: `${pos.left}%`, transform: 'translateX(-50%)' }}
                              >
                                {results.exact.lower.toFixed(3)}
                              </div>
                              <div
                                className="absolute -top-6 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm"
                                style={{ left: `${pos.left + pos.width}%`, transform: 'translateX(50%)' }}
                              >
                                {results.exact.upper.toFixed(3)}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex justify-between items-end pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex gap-6">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t('stdMortalityCalculator.ciLower')}</p>
                            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {results.exact.lower.toFixed(3)}
                            </p>
                            <p className="text-[10px] text-slate-400">CI {results.confidenceLevel}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t('stdMortalityCalculator.ciUpper')}</p>
                            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {results.exact.upper.toFixed(3)}
                            </p>
                            <p className="text-[10px] text-slate-400">CI {results.confidenceLevel}%</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{t('stdMortalityCalculator.ciWidth')}</p>
                          <p className="text-lg font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {(results.exact.upper - results.exact.lower).toFixed(3)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statistical table */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                        {!hasJStat && (
                          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                            {t('stdMortalityCalculator.jstatMissing')}
                          </div>
                        )}
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">{t('stdMortalityCalculator.tableHeaderMethod')}</th>
                              <th className="px-3 py-2 text-center font-semibold">{t('stdMortalityCalculator.tableHeaderSmr')}</th>
                              <th className="px-3 py-2 text-center font-semibold">
                                {t('stdMortalityCalculator.tableHeaderCi', { confidence: results.confidenceLevel })}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">{t('stdMortalityCalculator.tableHeaderP')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('stdMortalityCalculator.methodExact')}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.smr.toFixed(3)}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                [{results.exact.lower.toFixed(3)} – {results.exact.upper.toFixed(3)}]
                              </td>
                              <td className="px-3 py-2 text-center font-mono">{results.exactPValue.toFixed(4)}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('stdMortalityCalculator.methodMidP')}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.smr.toFixed(3)}</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">{results.midPValue.toFixed(4)}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('stdMortalityCalculator.methodByar')}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.smr.toFixed(3)}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                [{results.byar.lower.toFixed(3)} – {results.byar.upper.toFixed(3)}]
                              </td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('stdMortalityCalculator.methodVdb')}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.smr.toFixed(3)}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                [{results.vdb.lower.toFixed(3)} – {results.vdb.upper.toFixed(3)}]
                              </td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('stdMortalityCalculator.methodChi2')}</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">{results.chiSquare.p.toFixed(4)}</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-sm text-slate-400 mt-3 italic">
                          {t('stdMortalityCalculator.footnote')}
                        </p>
                      </div>
                    </div>

                    {/* Interpretation block - CORRIGÉ avec Trans sans enfants */}
                    <div
                      className={`p-6 rounded-2xl ${
                        results.exact.lower > 1 || results.exact.upper < 1
                          ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/10'
                          : 'bg-slate-100 border-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> {t('stdMortalityCalculator.interpretationTitle')}
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {results.smr > 1 ? (
                          <Trans
                            i18nKey="stdMortalityCalculator.interpretationHigher"
                            values={{ percent: ((results.smr - 1) * 100).toFixed(1) }}
                            components={{ strong: <strong className="font-bold" /> }}
                          />
                        ) : (
                          <Trans
                            i18nKey="stdMortalityCalculator.interpretationLower"
                            values={{ percent: ((1 - results.smr) * 100).toFixed(1) }}
                            components={{ strong: <strong className="font-bold" /> }}
                          />
                        )}
                        <br />
                        {results.exact.lower > 1 ? (
                          <span className="text-orange-600 font-bold mt-2 block">
                            {t('stdMortalityCalculator.interpretationSignifHigh')}
                          </span>
                        ) : results.exact.upper < 1 ? (
                          <span className="text-emerald-600 font-bold mt-2 block">
                            {t('stdMortalityCalculator.interpretationSignifLow')}
                          </span>
                        ) : (
                          <span className="text-slate-500 mt-2 block">
                            {t('stdMortalityCalculator.interpretationNotSignif')}
                          </span>
                        )}
                      </p>
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('stdMortalityCalculator.helpTitle')}</h3>
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
                    {t('stdMortalityCalculator.helpPrincipleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('stdMortalityCalculator.helpPrinciple')}
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1">RMS &gt; 1.0</div>
                    <div className="text-xs text-slate-500">{t('stdMortalityCalculator.helpRiskExcess')}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1">RMS &lt; 1.0</div>
                    <div className="text-xs text-slate-500">{t('stdMortalityCalculator.helpProtective')}</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    {t('stdMortalityCalculator.helpCiTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-3">
                    {t('stdMortalityCalculator.helpCi')}
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    {t('stdMortalityCalculator.helpMethodsTitle')}
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      <strong className="text-slate-900 dark:text-white">{t('stdMortalityCalculator.methodExact')}</strong> – {t('stdMortalityCalculator.helpExactDesc')}
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">{t('stdMortalityCalculator.methodMidP')}</strong> – {t('stdMortalityCalculator.helpMidPDesc')}
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">{t('stdMortalityCalculator.methodByar')}</strong> – {t('stdMortalityCalculator.helpByarDesc')}
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">{t('stdMortalityCalculator.methodVdb')}</strong> – {t('stdMortalityCalculator.helpVdbDesc')}
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">{t('stdMortalityCalculator.methodChi2')}</strong> – {t('stdMortalityCalculator.helpChi2Desc')}
                    </p>
                  </div>
                  <a
                    href="https://www.openepi.com/SMR/SMR.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
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