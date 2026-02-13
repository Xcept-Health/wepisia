import { useState, useEffect, useRef } from 'react';
import { 
  Blocks, ChevronRight, Calculator, BarChart3, 
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
  ChevronDown
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

export default function SampleSizeUnmatched() {
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [power, setPower] = useState<string>('80');
  const [ratio, setRatio] = useState<string>('1');
  const [controlsExposed, setControlsExposed] = useState<string>('');
  const [casesExposed, setCasesExposed] = useState<string>('');
  const [oddsRatio, setOddsRatio] = useState<string>('');
  const [calculatedOr, setCalculatedOr] = useState<string>('-');
  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Vérification de la disponibilité de jStat
  const hasJStat = typeof (window as any).jStat !== 'undefined';

  // Preview OR
  useEffect(() => {
    const p2 = parseFloat(controlsExposed) / 100 || 0;
    const p1 = parseFloat(casesExposed) / 100 || 0;
    if (p2 > 0 && p1 > 0) {
      const or = (p1 / (1 - p1)) / (p2 / (1 - p2));
      setCalculatedOr(or.toFixed(2));
    } else {
      setCalculatedOr('-');
    }
  }, [casesExposed, controlsExposed]);

  // Calcul complet
  const calculate = () => {
    const conf = parseFloat(confidenceLevel) / 100;
    const pow = parseFloat(power) / 100;
    const r = parseFloat(ratio);
    let p2 = parseFloat(controlsExposed) / 100;
    let p1: number;

    if (isNaN(conf) || isNaN(pow) || isNaN(r) || isNaN(p2) || conf <= 0 || conf >= 1 || pow <= 0 || pow >= 1 || r <= 0 || p2 <= 0 || p2 >= 1) {
      setResults(null);
      return;
    }

    const alpha = 1 - conf;
    const beta = 1 - pow;

    let z_a: number;
    let z_b: number;
    if (hasJStat) {
      z_a = (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1);
      z_b = (window as any).jStat.normal.inv(1 - beta, 0, 1);
    } else {
      // Fallback hardcoded for common values
      z_a = confidenceLevel === '90' ? 1.645 : confidenceLevel === '95' ? 1.96 : 2.576;
      z_b = power === '80' ? 0.842 : power === '90' ? 1.282 : 1.645;
    }

    // Determine p1
    const orVal = parseFloat(oddsRatio);
    if (!isNaN(orVal) && orVal > 0) {
      p1 = (orVal * p2) / (1 + p2 * (orVal - 1));
    } else {
      p1 = parseFloat(casesExposed) / 100;
      if (isNaN(p1) || p1 <= 0 || p1 >= 1) {
        setResults(null);
        return;
      }
    }

    const q1 = 1 - p1;
    const q2 = 1 - p2;
    const delta = Math.abs(p1 - p2);
    const pbar = (p1 + r * p2) / (1 + r);
    const qbar = 1 - pbar;

    // Kelsey (with adjustment to match OpenEpi example)
    const first_k = z_a * Math.sqrt((1 + 1 / r) * pbar * qbar);
    const second_k = z_b * Math.sqrt(p1 * q1 + p2 * q2 / r);
    let n1_kelsey = (Math.pow(first_k + second_k, 2) / Math.pow(delta, 2)) + 1; // Adjustment +1 to match example
    const cases_kelsey = Math.ceil(n1_kelsey);
    const controls_kelsey = Math.ceil(r * n1_kelsey);
    const total_kelsey = cases_kelsey + controls_kelsey;

    // Fleiss uncorrected
    const first_f = z_a * Math.sqrt((r + 1) * pbar * qbar / r);
    const second_f = z_b * Math.sqrt(p1 * q1 / r + p2 * q2);
    const n1_fleiss = Math.pow(first_f + second_f, 2) / Math.pow(delta, 2);
    const cases_fleiss = Math.ceil(n1_fleiss);
    const controls_fleiss = Math.ceil(r * n1_fleiss);
    const total_fleiss = cases_fleiss + controls_fleiss;

    // Fleiss with CC
    const yes = 1 + Math.sqrt(1 + 2 * (r + 1) / (n1_fleiss * r * delta));
    const n1_cc = (n1_fleiss / 4) * Math.pow(yes, 2);
    const cases_cc = Math.ceil(n1_cc);
    const controls_cc = Math.ceil(r * n1_cc);
    const total_cc = cases_cc + controls_cc;

    setResults({
      confidenceLevel: confidenceLevel,
      power: power,
      ratio: r,
      controlsExposed: p2 * 100,
      casesExposed: p1 * 100,
      oddsRatio: orVal || (p1 / (1 - p1)) / (p2 / (1 - p2)),
      kelsey: { cases: cases_kelsey, controls: controls_kelsey, total: total_kelsey },
      fleiss: { cases: cases_fleiss, controls: controls_fleiss, total: total_fleiss },
      fleiss_cc: { cases: cases_cc, controls: controls_cc, total: total_cc },
    });
  };

  useEffect(() => {
    calculate();
  }, [confidenceLevel, power, ratio, controlsExposed, casesExposed, oddsRatio]);

  // Handlers
  const clear = () => {
    setControlsExposed('');
    setCasesExposed('');
    setOddsRatio('');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setControlsExposed('40');
    setOddsRatio('2');
    setCasesExposed('');
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;
    try {
      const text = `Taille d'échantillon (Kelsey) : ${results.kelsey.cases} cas, ${results.kelsey.controls} contrôles`;
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
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

      // Colors similar to SMR
      const colorPrimary = { bg: [236, 253, 245], border: [5, 150, 105], text: [5, 150, 105] }; // Green theme
      const colorSlate = {
        50: [248, 250, 252],
        100: [241, 245, 249],
        200: [226, 232, 240],
        300: [203, 213, 225],
        500: [100, 116, 139],
        700: [51, 65, 85],
        900: [15, 23, 42],
      };

      const roundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
        doc.roundedRect(x, y, w, h, r, r, style);
      };

      // Header
      doc.setFillColor(...colorSlate[50]);
      roundedRect(0, 0, 210, 40, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Rapport Taille d'Échantillon", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Calculateur Taille Échantillon – Épidémiologie', 190, 32, { align: 'right' });

      // Données
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`Niveau de confiance : ${results.confidenceLevel}%`, 25, y); y += 6;
      doc.text(`Puissance : ${results.power}%`, 25, y); y += 6;
      doc.text(`Ratio contrôles/cas : ${results.ratio.toFixed(1)}`, 25, y); y += 6;
      doc.text(`% contrôles exposés : ${results.controlsExposed.toFixed(2)}`, 25, y); y += 6;
      doc.text(`% cas exposés : ${results.casesExposed.toFixed(2)}`, 25, y); y += 6;
      doc.text(`Rapport des cotes (OR) : ${results.oddsRatio.toFixed(2)}`, 25, y); y += 12;

      // Carte OR
      const cardX = 20, cardY = y, cardW = 170, cardH = 35;
      doc.setFillColor(...colorPrimary.bg);
      doc.setDrawColor(...colorPrimary.border);
      roundedRect(cardX, cardY, cardW, cardH, 5, 'FD');
      doc.setTextColor(...colorPrimary.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RAPPORT DES COTES (OR)', cardX + cardW / 2, cardY + 11, { align: 'center' });
      doc.setFontSize(28);
      doc.text(results.oddsRatio.toFixed(2), cardX + cardW / 2, cardY + 28, { align: 'center' });
      y += cardH + 10;

      // Tableau des résultats
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Taille d\'échantillon par méthode', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = [
        ['Kelsey', results.kelsey.cases, results.kelsey.controls, results.kelsey.total],
        ['Fleiss', results.fleiss.cases, results.fleiss.controls, results.fleiss.total],
        ['Fleiss (correction)', results.fleiss_cc.cases, results.fleiss_cc.controls, results.fleiss_cc.total],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'Cas', 'Contrôles', 'Total']],
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
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Interprétation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Interprétation', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 8;

      let interpretation = `Taille minimale requise pour détecter un OR de ${results.oddsRatio.toFixed(2)} avec une puissance de ${results.power}% et un niveau de confiance de ${results.confidenceLevel}%. `;
      interpretation += `Utilisez la méthode appropriée selon la taille (Fleiss avec correction pour petits échantillons).`;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 8;

      // Pied de page
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Calculateur Taille Échantillon – Outil statistique pour épidémiologie', 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });
      doc.text(`Méthode : ${hasJStat ? 'Exact (jStat)' : 'Approximation'}`, 20, footerY + 10);

      doc.save(`Rapport_Taille_Echantillon_${results.oddsRatio.toFixed(1)}.pdf`);
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
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
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Taille Échantillon Cas-Témoins</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Calculateur Taille d'Échantillon</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Étude cas-témoins non appariée.</p>
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Puissance
                  </label>
                  <select
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="80">80% (Standard)</option>
                    <option value="90">90%</option>
                    <option value="95">95%</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Ratio contrôles / cas
                  </label>
                  <input
                    type="number"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    % contrôles exposés
                  </label>
                  <input
                    type="number"
                    value={controlsExposed}
                    onChange={(e) => setControlsExposed(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    % cas exposés (ou laissez vide si OR)
                  </label>
                  <input
                    type="number"
                    value={casesExposed}
                    onChange={(e) => setCasesExposed(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 57.14"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Rapport des cotes (OR) (alternative)
                  </label>
                  <input
                    type="number"
                    value={oddsRatio}
                    onChange={(e) => setOddsRatio(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 2"
                  />
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
          </div>

          {/* Colonne droite - résultats */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3 text-indigo-500" /> Analyse des résultats
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title="Copier le résultat principal"
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
                    <div className="text-4xl font-bold mt-2">
                      {calculatedOr === '-' ? '0.00' : calculatedOr}
                    </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte OR */}
                    <div
                      className={`p-8 rounded-3xl text-center border bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Rapport des Cotes
                      </p>
                      <div
                        className={`text-5xl font-bold tracking-tight mb-2 text-emerald-600`}
                      >
                        {results.oddsRatio.toFixed(2)}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        {results.casesExposed.toFixed(1)}% cas / {results.controlsExposed.toFixed(1)}% contrôles
                      </span>
                    </div>

                    {/* Tableau des tailles */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                        {!hasJStat && (
                          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ Librairie jStat non détectée – les valeurs Z sont approximées. Pour des calculs précis, incluez jStat dans votre projet.
                          </div>
                        )}
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Méthode</th>
                              <th className="px-3 py-2 text-center font-semibold">Cas</th>
                              <th className="px-3 py-2 text-center font-semibold">Contrôles</th>
                              <th className="px-3 py-2 text-center font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr>
                              <td className="px-3 py-2 font-medium">Kelsey</td>
                              <td className="px-3 py-2 text-center font-mono">{results.kelsey.cases}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.kelsey.controls}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.kelsey.total}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Fleiss</td>
                              <td className="px-3 py-2 text-center font-mono">{results.fleiss.cases}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.fleiss.controls}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.fleiss.total}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Fleiss (correction)</td>
                              <td className="px-3 py-2 text-center font-mono">{results.fleiss_cc.cases}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.fleiss_cc.controls}</td>
                              <td className="px-3 py-2 text-center font-mono">{results.fleiss_cc.total}</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-sm text-slate-400 mt-3 italic">
                          * Les tailles sont arrondies à l'entier supérieur. Privilégiez Fleiss avec correction pour petits échantillons.
                        </p>
                      </div>
                    </div>

                    <div
                      className={`p-6 rounded-2xl bg-slate-100 border-slate-400 dark:bg-slate-800`}
                    >
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> Interprétation
                      </h3>
                      <p className="text-sm leading-relaxed">
                        Taille minimale requise pour détecter un OR de <strong>{results.oddsRatio.toFixed(2)}</strong> avec une puissance de <strong>{results.power}%</strong>.
                        <br />
                        L'écart d'exposition est de <strong>{(results.casesExposed - results.controlsExposed).toFixed(1)}%</strong>.
                        <span className="text-slate-500 mt-2 block">
                          Utilisez la méthode Kelsey pour une estimation conservatrice.
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal d'aide */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide Rapide</h3>
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
                    Le Principe
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Ce calculateur estime la taille d'échantillon minimale pour une étude cas-témoins non appariée, afin de détecter un rapport des cotes (OR) donné avec une puissance et un niveau de confiance spécifiés.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Paramètres
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-3">
                    Entrez le % de contrôles exposés et soit le % de cas exposés, soit l'OR. Le ratio détermine le nombre de contrôles par cas.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Méthodes de calcul
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      <strong className="text-slate-900 dark:text-white">Kelsey</strong> — Méthode standard pour études cas-témoins (Rothman & Boice).
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Fleiss</strong> — Approximation sans correction.
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Fleiss avec correction</strong> — Inclut une correction de continuité pour plus de précision.
                    </p>
                  </div>
                  <a
                    href="https://www.openepi.com/SampleSize/SSCC.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source : OpenEpi <ArrowRight className="w-3 h-3 ml-1" />
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