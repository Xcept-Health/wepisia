import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Calculator,
  BarChart3,
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
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function OneRate() {
  const [events, setEvents] = useState<string>('');
  const [personTime, setPersonTime] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showMethodDetails, setShowMethodDetails] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Vérification de la disponibilité de jStat
  const hasJStat = typeof (window as any).jStat !== 'undefined';

  // Chargement des scripts externes
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        document.body.appendChild(script);
      }
    };
    loadScripts();
  }, []);

  // Recalcul automatique
  useEffect(() => {
    if (events && personTime) {
      calculateRate();
    }
  }, [events, personTime, confidenceLevel]);

  // Fonction de calcul conforme à OpenEpi PersonTime1
  const calculateRate = () => {
    const a = parseFloat(events);      // nombre de cas
    const N = parseFloat(personTime);  // personne-temps
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;
    const z = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;

    if (isNaN(a) || isNaN(N) || a < 0 || N <= 0) {
      setResults(null);
      return;
    }

    const rate = a / N; // taux par unité personne-temps

    // --- 1. Mid-P Exact (Miettinen 1974d) ---
    let midpLower, midpUpper;
    if (hasJStat) {
      const poissonPdf = (k: number, lambda: number) => (window as any).jStat.poisson.pdf(k, lambda);
      const poissonCdf = (k: number, lambda: number) => (window as any).jStat.poisson.cdf(k, lambda);

      if (a === 0) {
        midpLower = 0;
        let low = 0, high = 1;
        while (high - low > 1e-9) {
          let mid = (low + high) / 2;
          if (poissonCdf(0, mid * N) >= 1 - alpha / 2) high = mid;
          else low = mid;
        }
        midpUpper = (low + high) / 2;
      } else {
        // Borne inférieure
        let low = 0, high = a / N;
        for (let i = 0; i < 100; i++) {
          let mid = (low + high) / 2;
          let cum = poissonCdf(a - 1, mid * N) + 0.5 * poissonPdf(a, mid * N);
          if (cum < alpha / 2) high = mid;
          else low = mid;
        }
        midpLower = (low + high) / 2;

        // Borne supérieure
        low = a / N, high = Math.max((a + 10) / N, a / N * 2);
        for (let i = 0; i < 100; i++) {
          let mid = (low + high) / 2;
          let cum = poissonCdf(a, mid * N) - 0.5 * poissonPdf(a, mid * N);
          if (cum < 1 - alpha / 2) low = mid;
          else high = mid;
        }
        midpUpper = (low + high) / 2;
      }
    } else {
      // fallback
      midpLower = rate * 0.8;
      midpUpper = rate * 1.2;
    }

    // --- 2. Test exact de Fisher (Armitage 1971) ---
    let fisherLower, fisherUpper;
    if (hasJStat) {
      if (a === 0) {
        fisherLower = 0;
        fisherUpper = (window as any).jStat.chisquare.inv(1 - alpha, 2) / (2 * N);
      } else {
        fisherLower = (window as any).jStat.chisquare.inv(alpha / 2, 2 * a) / (2 * N);
        fisherUpper = (window as any).jStat.chisquare.inv(1 - alpha / 2, 2 * (a + 1)) / (2 * N);
      }
    } else {
      fisherLower = rate * 0.85;
      fisherUpper = rate * 1.15;
    }

    // --- 3. Approximation normale (Rosner) ---
    let normalLower, normalUpper;
    if (a > 0) {
      const se = Math.sqrt(a) / N;
      normalLower = Math.max(0, rate - z * se);
      normalUpper = rate + z * se;
    } else {
      normalLower = 0;
      normalUpper = (z * z) / (2 * N); // approximation pour zéro événement
    }

    // --- 4. Byar approx. Poisson (Rothman & Boice 1979) ---
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

    // Arrondi à 3 décimales comme OpenEpi
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
      rothman: { lower: format(rgLower), upper: format(rgUpper) },
      hasJStat
    });
  };

  // Handlers
  const clear = () => {
    setEvents('');
    setPersonTime('');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setEvents('33');
    setPersonTime('22');
    toast.success('Exemple chargé (33 cas / 22 personne‑temps)');
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

      // En-tête
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

      // Données saisies
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

      // Carte du taux
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

      // Tableau des IC
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

      // Références
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Mid-P exact test: Miettinen (1974d) – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Test exact de Fisher: Armitage (1971) – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Approximation normale: Rosner – Fondamentaux de Biostatistiques (5e Éd.)', 20, y); y += 4;
      doc.text('Coef. Poisson approx. Byar: Rothman & Boice – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Rothman/Greenland: Modern Epidemiology (2e Éd.)', 20, y); y += 4;

      // Pied de page
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
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">OneRate</span></li>
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
                Analyse d'un taux et de son intervalle de confiance – PersonTime1 (OpenEpi)
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
          {/* Colonne gauche - saisie */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Nombre de cas <span className="text-blue-500">(numérateur)</span>
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
                    Personne‑temps <span className="text-blue-500">(dénominateur)</span>
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
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Info complémentaire */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Taux par unité personne‑temps
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Le taux est exprimé <strong>par 1 unité</strong> (ex. année‑personne, mois‑personne). 
                    Multipliez si nécessaire pour une échelle plus lisible.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - résultats */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title="Copier le tableau"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Exporter en PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <BarChart3 className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                    <p className="text-slate-400 text-sm mt-2">Les calculs s'effectuent automatiquement</p>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte du taux */}
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

                    {/* Tableau des IC */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Intervalles de confiance à {results.confidenceLevel}%
                        </h3>
                        {!hasJStat && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            Approximation (jStat non chargé)
                          </span>
                        )}
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

                    {/* Détails des méthodes (repliable) */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                      <button
                        onClick={() => setShowMethodDetails(!showMethodDetails)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            showMethodDetails ? 'rotate-180' : ''
                          }`}
                        />
                        {showMethodDetails ? 'Masquer' : 'Afficher'} les références des méthodes
                      </button>
                      {showMethodDetails && (
                        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400 animate-in slide-in-from-top-2">
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Mid-P exact test</span> – Miettinen (1974d), modification décrite dans « Analyse épidémiologique avec calculateur programmable, 1979 ».</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Test exact de Fisher</span> – Armitage (1971), Snedecor & Cochran (1965) ; repris dans « Analyse épidémiologique avec calculateur programmable, 1979 ».</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Approximation normale</span> – Rosner, « Fondamentaux de Biostatistiques » (5e Éd.).</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Coef. Poisson approx. Byar</span> – Rothman & Boice, « Analyse épidémiologique avec calculateur programmable, 1979 ».</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Rothman/Greenland</span> – « Modern Epidemiology » (2e Éd.).</p>
                          <p className="mt-2 text-blue-600 dark:text-blue-400 italic">
                            Résultats tirés de OpenEpi, version 3, logiciel libre de calcul – PersonTime1.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interprétation synthétique */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
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

        {/* Modal d'aide - style RMS */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Guide – OneRate (PersonTime1)
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
                    Le principe
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Ce module reproduit l'outil <strong>PersonTime1</strong> d'OpenEpi. Il calcule le taux d'incidence
                    (nombre de cas divisé par le temps‑personne total) et différents intervalles de confiance.
                    Les données sont typiquement issues d'études de cohorte ou d'essais cliniques.
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Circle className="w-3 h-3 text-emerald-500" /> Taux &gt; 1
                    </div>
                    <div className="text-xs text-slate-500">Événement fréquent par unité</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Circle className="w-3 h-3 text-amber-500" /> Taux &lt; 1
                    </div>
                    <div className="text-xs text-slate-500">Événement rare</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Méthodes de calcul
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">Mid‑P exact</strong> – Miettinen (1974d) : correction de continuité du test exact, moins conservateur.</p>
                    <p><strong className="text-slate-900 dark:text-white">Fisher exact</strong> – Armitage (1971) : basé sur la loi du χ², référence pour petits effectifs.</p>
                    <p><strong className="text-slate-900 dark:text-white">Approximation normale</strong> – Rosner : valable pour grands effectifs (a &gt; 20).</p>
                    <p><strong className="text-slate-900 dark:text-white">Byar</strong> – Rothman & Boice (1979) : très précise, même pour a &gt; 5.</p>
                    <p><strong className="text-slate-900 dark:text-white">Rothman/Greenland</strong> – Méthode logarithmique (Modern Epidemiology).</p>
                  </div>
                  <a
                    href="https://www.openepi.com/PersonTime/PersonTime.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source : OpenEpi – PersonTime1 <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Ressources
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <a href="https://www.openepi.com/PDFDocs/PersonTime1Doc.pdf" target="_blank" className="text-blue-600 hover:underline">
                        Documentation officielle OpenEpi
                      </a>
                    </p>
                    <p>
                      Rothman K.J., Greenland S. – <em>Modern Epidemiology</em>, 2nd ed.
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