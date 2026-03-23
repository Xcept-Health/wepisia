import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Calculator,
  Presentation,
  Copy,
  FileDown,
  HelpCircle,
  X,
  Info,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  Circle,
  Activity,
  Scale,
  Layers
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

/**
 * OneRate Component – Analysis of a single rate and its confidence intervals
 * 
 * This component replicates OpenEpi's PersonTime1 tool. It computes the incidence rate
 * (number of cases divided by total person‑time) and provides five different methods
 * for estimating the confidence interval:
 * - Mid‑P exact test (Miettinen, 1974d)
 * - Fisher exact test (Armitage, 1971)
 * - Normal approximation (Rosner)
 * - Byar approximation (Rothman & Boice, 1979)
 * - Rothman/Greenland logarithmic method (Modern Epidemiology, 2nd ed.)
 * 
 * All calculations rely on the jStat library to ensure exactness of Poisson and χ² distributions.
 */

export default function OneRate() {
  const [events, setEvents] = useState<string>('');           // number of cases
  const [personTime, setPersonTime] = useState<string>('');   // person‑time
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showMethodDetails, setShowMethodDetails] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto‑recalculate whenever an input changes
  useEffect(() => {
    if (events && personTime) {
      calculateRate();
    }
  }, [events, personTime, confidenceLevel]);

  /**
   * Computes the rate and the five confidence intervals.
   * Formulas are those used by OpenEpi (PersonTime1).
   */
  const calculateRate = () => {
    const a = parseFloat(events);      // number of cases
    const N = parseFloat(personTime);  // person‑time
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;
    const z = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;

    if (isNaN(a) || isNaN(N) || a < 0 || N <= 0) {
      setResults(null);
      return;
    }

    const rate = a / N; // rate per person‑time unit

    // --- 1. Mid-P Exact (Miettinen 1974d) ---
    let midpLower, midpUpper;
    if (a === 0) {
      midpLower = 0;
      // Dichotomous search for the upper bound
      let low = 0, high = 1;
      while (high - low > 1e-9) {
        let mid = (low + high) / 2;
        if (jStat.poisson.cdf(0, mid * N) >= 1 - alpha / 2) high = mid;
        else low = mid;
      }
      midpUpper = (low + high) / 2;
    } else {
      // Lower bound
      let low = 0, high = a / N;
      for (let i = 0; i < 100; i++) {
        let mid = (low + high) / 2;
        let cum = jStat.poisson.cdf(a - 1, mid * N) + 0.5 * jStat.poisson.pdf(a, mid * N);
        if (cum < alpha / 2) high = mid;
        else low = mid;
      }
      midpLower = (low + high) / 2;

      // Upper bound
      low = a / N;
      high = Math.max((a + 10) / N, a / N * 2);
      for (let i = 0; i < 100; i++) {
        let mid = (low + high) / 2;
        let cum = jStat.poisson.cdf(a, mid * N) - 0.5 * jStat.poisson.pdf(a, mid * N);
        if (cum < 1 - alpha / 2) low = mid;
        else high = mid;
      }
      midpUpper = (low + high) / 2;
    }

    // --- 2. Fisher exact test (Armitage 1971) ---
    let fisherLower, fisherUpper;
    if (a === 0) {
      fisherLower = 0;
      fisherUpper = jStat.chisquare.inv(1 - alpha, 2) / (2 * N);
    } else {
      fisherLower = jStat.chisquare.inv(alpha / 2, 2 * a) / (2 * N);
      fisherUpper = jStat.chisquare.inv(1 - alpha / 2, 2 * (a + 1)) / (2 * N);
    }

    // --- 3. Normal approximation (Rosner) ---
    let normalLower, normalUpper;
    if (a > 0) {
      const se = Math.sqrt(a) / N;
      normalLower = Math.max(0, rate - z * se);
      normalUpper = rate + z * se;
    } else {
      normalLower = 0;
      normalUpper = (z * z) / (2 * N); // approximation for zero events
    }

    // --- 4. Byar Poisson approximation (Rothman & Boice 1979) ---
    let byarLower, byarUpper;
    if (a === 0) {
      byarLower = 0;
      byarUpper = fisherUpper;
    } else {
      const termLower = 1 - 1 / (9 * a) - z / (3 * Math.sqrt(a));
      byarLower = Math.pow(termLower, 3) * (a / N);
      const termUpper = 1 - 1 / (9 * (a + 1)) + z / (3 * Math.sqrt(a + 1));
      byarUpper = Math.pow(termUpper, 3) * ((a + 1) / N);
    }
    byarLower = Math.max(0, byarLower);

    // --- 5. Rothman/Greenland (Modern Epidemiology 2nd Ed.) ---
    let rgLower, rgUpper;
    if (a === 0) {
      rgLower = 0;
      rgUpper = fisherUpper;
    } else {
      const logRate = Math.log(rate);
      const seLog = Math.sqrt(1 / a);
      rgLower = Math.exp(logRate - z * seLog);
      rgUpper = Math.exp(logRate + z * seLog);
    }

    // Round to 3 decimals as OpenEpi does
    const format = (x: number) => parseFloat(x.toFixed(3));

    setResults({
      events: a,
      personTime: N,
      rate: format(rate),
      confidenceLevel: conf,
      midp: { lower: format(midpLower), upper: format(midpUpper) },
      fisher: { lower: format(fisherLower), upper: format(fisherUpper) },
      normal: { lower: format(normalLower), upper: format(normalUpper) },
      byar: { lower: format(byarLower), upper: format(byarUpper) },
      rothman: { lower: format(rgLower), upper: format(rgUpper) }
    });
  };

  // --- Event handlers ---
  const clear = () => {
    setEvents('');
    setPersonTime('');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setEvents('33');
    setPersonTime('22');
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Analyse de taux (PersonTime1) – OpenEpi
Cas : ${results.events}
Personne‑temps : ${results.personTime}
Taux : ${results.rate} par unité

IC ${results.confidenceLevel}% :
Mid-P exact : [${results.midp.lower} – ${results.midp.upper}]
Fisher exact : [${results.fisher.lower} – ${results.fisher.upper}]
Approx. normale : [${results.normal.lower} – ${results.normal.upper}]
Byar approx. : [${results.byar.lower} – ${results.byar.upper}]
Rothman/Greenland : [${results.rothman.lower} – ${results.rothman.upper}]`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error('Veuillez d’abord effectuer un calcul');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const colorPrimary: [number, number, number] = [59, 130, 246];
      const colorSlate = {
        50: [248, 250, 252] as [number, number, number],
        100: [241, 245, 249] as [number, number, number],
        200: [226, 232, 240] as [number, number, number],
        500: [100, 116, 139] as [number, number, number],
        700: [51, 65, 85] as [number, number, number],
        900: [15, 23, 42] as [number, number, number],
      };

      // Header
      doc.setFillColor(...colorSlate[50]);
      doc.roundedRect(0, 0, 210, 40, 0, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Rapport d'analyse d'un taux", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('OneRate – OpenEpi PersonTime1', 190, 32, { align: 'right' });

      // Input data
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Nombre de cas : ${results.events}`, 25, y); y += 6;
      doc.text(`Personne‑temps : ${results.personTime}`, 25, y); y += 6;
      doc.text(`Niveau de confiance : ${results.confidenceLevel} %`, 25, y); y += 12;

      // Rate card
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(20, y, 170, 30, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TAUX OBSERVÉ', 105, y + 8, { align: 'center' });
      doc.setFontSize(22);
      doc.text(results.rate.toString(), 105, y + 22, { align: 'center' });
      doc.setFontSize(9);
      doc.text('par unité personne‑temps', 105, y + 27, { align: 'center' });
      y += 40;

      // CI table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Intervalles de confiance à ${results.confidenceLevel}%`, 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = [
        ['Test exact Mid‑P', results.midp.lower, results.rate, results.midp.upper],
        ['Test exact de Fisher', results.fisher.lower, results.rate, results.fisher.upper],
        ['Approximation normale', results.normal.lower, results.rate, results.normal.upper],
        ['Coef. Poisson approx. Byar', results.byar.lower, results.rate, results.byar.upper],
        ['Rothman/Greenland', results.rothman.lower, results.rate, results.rothman.upper],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'CL bas', 'Taux', 'CL haut']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // References
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Mid-P exact test: Miettinen (1974d) – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Test exact de Fisher: Armitage (1971) – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Approximation normale: Rosner – Fondamentaux de Biostatistiques (5e Éd.)', 20, y); y += 4;
      doc.text('Coef. Poisson approx. Byar: Rothman & Boice – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Rothman/Greenland: Modern Epidemiology (2e Éd.)', 20, y); y += 4;

      // Footer
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('OneRate – conforme OpenEpi PersonTime1', 20, footerY + 5);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`OneRate_${results.events}_${results.personTime}.pdf`);
      toast.success('Rapport PDF exporté');
    } catch (error) {
      console.error(error);
      toast.error('Erreur PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Fil d'Ariane">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">One Rate</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">OneRate</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Analyse d'un taux et de son intervalle de confiance – PersonTime1
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="hidden md:flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
            aria-label="Aide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left column - input */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Nombre de cas (numérateur)
                  </label>
                  <input
                    type="number"
                    value={events}
                    onChange={(e) => setEvents(e.target.value)}
                    min="0"
                    step="1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 33"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Personne‑temps (dénominateur)
                  </label>
                  <input
                    type="number"
                    value={personTime}
                    onChange={(e) => setPersonTime(e.target.value)}
                    min="0.0001"
                    step="any"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 22"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Niveau de confiance
                  </label>
                  <select
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="90">90%</option>
                    <option value="95">95% (Standard)</option>
                    <option value="99">99%</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> Exemple
                </button>
                <button
                  onClick={clear}
                  className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl flex items-center justify-center"
                  aria-label="Réinitialiser"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

           
          </div>

          {/* Right column - results */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title="Copier le tableau"
                      aria-label="Copier les résultats"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Exporter en PDF"
                      aria-label="Exporter en PDF"
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
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                    <div className="text-4xl font-bold mt-2">0.00</div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Rate card */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Taux observé
                      </p>
                      <div className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {results.rate}
                      </div>
                      <p className="text-sm text-slate-500">
                        par unité personne‑temps
                      </p>
                      <div className="flex justify-center gap-4 mt-3 text-xs text-slate-500">
                        <span>{results.events} cas</span>
                        <span>•</span>
                        <span>{results.personTime} personne‑temps</span>
                      </div>
                    </div>

                    {/* CI table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Intervalles de confiance à {results.confidenceLevel}%
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Méthode</th>
                              <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">CL bas</th>
                              <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Taux</th>
                              <th className="px-6 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">CL haut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-6 py-3 font-medium">Test exact Mid‑P</td>
                              <td className="px-6 py-3 text-center font-mono">{results.midp.lower}</td>
                              <td className="px-6 py-3 text-center font-mono bg-slate-50 dark:bg-slate-700/30 font-bold">{results.rate}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.midp.upper}</td>
                            </tr>
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-6 py-3 font-medium">Test exact de Fisher</td>
                              <td className="px-6 py-3 text-center font-mono">{results.fisher.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rate}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.fisher.upper}</td>
                            </tr>
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-6 py-3 font-medium">Approximation normale</td>
                              <td className="px-6 py-3 text-center font-mono">{results.normal.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rate}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.normal.upper}</td>
                            </tr>
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-6 py-3 font-medium">Coef. Poisson approx. Byar</td>
                              <td className="px-6 py-3 text-center font-mono">{results.byar.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rate}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.byar.upper}</td>
                            </tr>
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-6 py-3 font-medium">Rothman/Greenland</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rothman.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rate}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rothman.upper}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                   
                    {/* interpretation */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                            Interprétation
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Le taux observé est de <strong>{results.rate} événement(s) par unité personne‑temps</strong>.
                            L'intervalle de confiance à {results.confidenceLevel}% (méthode de Fisher) s'étend de {results.fisher.lower} à {results.fisher.upper}.
                            {results.fisher.lower > results.rate / 2 ? ' La précision est modérée.' : ''}
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

        {/* help modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Guide : OneRate
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Section 1 : General principle */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    Principe du taux d'incidence
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Le taux d'incidence (ou densité d'incidence) mesure la vitesse à laquelle les événements surviennent dans une population suivie pendant une certaine durée. Il se calcule comme le nombre de nouveaux cas divisé par la somme des temps de participation (personne‑temps). Son intervalle de confiance reflète la précision de cette estimation.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">Taux &gt; 1</div>
                      <div className="text-slate-500">Événement fréquent par unité de temps</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">Taux &lt; 1</div>
                      <div className="text-slate-500">Événement rare</div>
                    </div>
                  </div>
                </section>

                {/* Section 2 : Interpretation of CI */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    Intervalle de confiance
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    L'intervalle de confiance à 95 % (par défaut) indique la plage de valeurs dans laquelle se situe le vrai taux avec une probabilité de 95 %. Plus l'intervalle est étroit, plus l'estimation est précise. Si l'intervalle contient la valeur 1, on ne peut pas conclure à un excès ou un déficit de risque par rapport à une population de référence (dans le cas d'une comparaison externe).
                  </p>
                </section>

                {/* Section 3 : Calculation methods */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    Méthodes de calcul
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Test exact Mid‑P (Miettinen, 1974d)</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Correction de continuité du test exact de Poisson, moins conservateur que le test exact de Fisher. Il est recommandé pour les petits effectifs.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Test exact de Fisher (Armitage, 1971)</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Basé sur la distribution du χ², c'est la méthode de référence pour les petits nombres. Elle garantit un risque d'erreur de première espèce au plus égal au seuil nominal.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Approximation normale (Rosner)</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Valable pour les grands effectifs (généralement a &gt; 20). Elle utilise l'erreur standard √a / N.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Approximation de Byar (Rothman & Boice, 1979)</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Très précise même pour des effectifs modestes (a &gt; 5). Elle repose sur une transformation du paramètre de Poisson.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Méthode logarithmique (Rothman/Greenland)</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Utilise le logarithme du taux et son erreur standard (1/√a). L'intervalle est ensuite exponentiel. Elle assure que la borne inférieure reste positive.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 4 : example */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    Exemple concret
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm">
                    <p className="mb-2">
                      Dans une étude de cohorte, on observe 33 cas de cancer chez des travailleurs suivis pendant 22 années‑personnes. Le taux d'incidence est :
                    </p>
                    <pre className="bg-white dark:bg-slate-900 p-2 rounded text-xs overflow-x-auto">
                      {`Taux = 33 / 22 = 1,5 par année‑personne`}
                    </pre>
                    <p className="mt-2">
                      L'intervalle de confiance à 95 % par la méthode exacte de Fisher est [1,03 – 2,10] (arrondi). Cela signifie que le vrai taux a 95 % de chances de se situer entre 1,03 et 2,10 événements par année‑personne.
                    </p>
                  </div>
                </section>

                {/* Section 5 : References */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      5
                    </div>
                    Références et ressources
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <li>Rothman K.J., Greenland S. – <em>Modern Epidemiology</em>, 2nd ed., Lippincott-Raven, 1998.</li>
                    <li>Rothman K.J., Boice J.D. – <em>Epidemiologic Analysis with a Programmable Calculator</em>, 1979.</li>
                    <li>Miettinen O.S. – Comment dans <em>American Journal of Epidemiology</em>, 1974.</li>
                    <li>Armitage P. – <em>Statistical Methods in Medical Research</em>, 1971.</li>
                  </ul>
                  <a
                    href="https://www.openepi.com/PersonTime/PersonTime.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Voir sur OpenEpi – PersonTime1 <ArrowRight className="w-3 h-3 ml-1" />
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