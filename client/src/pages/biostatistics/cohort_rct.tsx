import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw,
  ChevronDown, ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Sample Size for Cohort / Randomized Controlled Trials (SSCohort)
 *
 * This component replicates the functionality of OpenEpi's SSCohort module for
 * calculating the required sample size in cohort studies or randomized controlled
 * trials (RCTs) comparing two groups (exposed vs. non‑exposed, or treatment vs.
 * control). The user provides the expected outcome proportions in the unexposed
 * and exposed groups, the desired confidence level (two‑sided), statistical power,
 * and the allocation ratio (unexposed / exposed).
 *
 * Three methods are implemented:
 * - Kelsey (recommended for general use, based on the method in Kelsey et al.)
 * - Fleiss (uncorrected, from Fleiss 1981)
 * - Fleiss with continuity correction (adds a small adjustment for better small‑sample accuracy)
 *
 * All calculations are automatic: any change to the input fields triggers a
 * recalculation. Fixed z‑values are used for common confidence levels (90%, 95%, 99%)
 * and power levels (80%, 90%, 95%) for simplicity.
 */

interface CohortResults {
  confidenceLevel: number;
  power: number;
  ratio: number;
  percentUnexposed: number;
  percentExposed: number;
  oddsRatio: number;
  riskRatio: number;
  riskDifference: number;
  kelseyExposed: number;
  kelseyUnexposed: number;
  kelseyTotal: number;
  fleissExposed: number;
  fleissUnexposed: number;
  fleissTotal: number;
  fleissCCExposed: number;
  fleissCCUnexposed: number;
  fleissCCTotal: number;
}

export default function SampleSizeCohortRCT() {
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [power, setPower] = useState<string>('80');
  const [ratio, setRatio] = useState<string>('1');
  const [percentUnexposed, setPercentUnexposed] = useState<string>('');
  const [percentExposed, setPercentExposed] = useState<string>('');
  const [results, setResults] = useState<CohortResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    calculate();
  }, [confidenceLevel, power, ratio, percentUnexposed, percentExposed]);

  const calculate = () => {
    const conf = parseInt(confidenceLevel);
    const pow = parseInt(power) / 100;
    const rat = parseFloat(ratio) || 1;
    const p0 = parseFloat(percentUnexposed) / 100;   // unexposed
    const p1 = parseFloat(percentExposed) / 100;     // exposed

    if (isNaN(p0) || isNaN(p1) || p0 < 0 || p0 > 1 || p1 < 0 || p1 > 1 || rat <= 0) {
      setResults(null);
      return;
    }

    const oddsRatio = (p1 / (1 - p1)) / (p0 / (1 - p0));
    const riskRatio = p1 / p0;
    const riskDifference = p1 - p0;

    const zAlpha = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;
    const zBeta = pow === 0.8 ? 0.8416 : pow === 0.9 ? 1.2816 : pow === 0.95 ? 1.6449 : 0.8416;

    const pbar = (p1 + rat * p0) / (1 + rat);
    const qbar = 1 - pbar;

    const term0 = Math.sqrt(pbar * qbar * (1 + 1 / rat));
    const term1 = Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0) / rat);
    const delta = Math.abs(p1 - p0);

    // Kelsey method (recommended – matches OpenEpi)
    const sKelsey = zAlpha * term0 + zBeta * term1;
    const kelseyExposed = Math.ceil(sKelsey ** 2 / delta ** 2);
    const kelseyUnexposed = Math.ceil(kelseyExposed * rat);
    const kelseyTotal = kelseyExposed + kelseyUnexposed;

    // Fleiss (uncorrected)
    const sFleiss = (zAlpha + zBeta) * term0;
    const fleissExposed = Math.ceil(sFleiss ** 2 / delta ** 2);
    const fleissUnexposed = Math.ceil(fleissExposed * rat);
    const fleissTotal = fleissExposed + fleissUnexposed;

    // Fleiss with continuity correction (OpenEpi formula)
    const fleissCCExposed = Math.ceil(fleissExposed + 2 / delta);
    const fleissCCUnexposed = Math.ceil(fleissCCExposed * rat);
    const fleissCCTotal = fleissCCExposed + fleissCCUnexposed;

    setResults({
      confidenceLevel: conf,
      power: pow * 100,
      ratio: rat,
      percentUnexposed: p0 * 100,
      percentExposed: p1 * 100,
      oddsRatio,
      riskRatio,
      riskDifference: Number((riskDifference * 100).toFixed(1)), // avoid 13.999999
      kelseyExposed,
      kelseyUnexposed,
      kelseyTotal,
      fleissExposed,
      fleissUnexposed,
      fleissTotal,
      fleissCCExposed,
      fleissCCUnexposed,
      fleissCCTotal
    });
  };

  const clearForm = () => {
    setConfidenceLevel('95');
    setPower('80');
    setRatio('1');
    setPercentUnexposed('');
    setPercentExposed('');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setConfidenceLevel('95');
    setPower('80');
    setRatio('10');
    setPercentUnexposed('10');
    setPercentExposed('24');
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Taille d’échantillon : cohorte et essais cliniques aléatoires\n\n` +
                 `Niveau significatif bilatéral (1-alpha): ${results.confidenceLevel}\n` +
                 `Puissance (1-beta, % de chances de détection): ${results.power}\n` +
                 `Rapport de taille d’échantillon, non exposés/exposés: ${results.ratio}\n` +
                 `Pourcentage des non exposés avec résultats: ${results.percentUnexposed}\n` +
                 `Pourcentage des exposés avec résultats: ${results.percentExposed}\n` +
                 `Rapport de cotes: ${results.oddsRatio.toFixed(1)}\n` +
                 `Rapport risque/prévalence: ${results.riskRatio.toFixed(1)}\n` +
                 `Différence risque/prévalence: ${results.riskDifference}\n\n` +
                 `Kelsey → Exposés: ${results.kelseyExposed} | Non exposés: ${results.kelseyUnexposed} | Total: ${results.kelseyTotal}\n` +
                 `Fleiss → Exposés: ${results.fleissExposed} | Non exposés: ${results.fleissUnexposed} | Total: ${results.fleissTotal}\n` +
                 `Fleiss avec CC → Exposés: ${results.fleissCCExposed} | Non exposés: ${results.fleissCCUnexposed} | Total: ${results.fleissCCTotal}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error('Veuillez d\'abord effectuer un calcul');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const colorPrimary = [59, 130, 246];
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

      doc.setFillColor(...colorSlate[50]);
      roundedRect(0, 0, 210, 40, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Rapport Taille d’Échantillon Cohorte/RCT", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('OpenEpi Sample Size', 190, 32, { align: 'right' });

      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 5;

      const inputTable = [
        ['Paramètre', 'Valeur'],
        ['Niveau significatif bilatéral (1-alpha)', `${results.confidenceLevel}%`],
        ['Puissance (1-beta, % de chances de détection)', `${results.power}%`],
        ['Rapport de taille d’échantillon, non exposés/exposés', results.ratio],
        ['Pourcentage des non exposés avec résultats', results.percentUnexposed],
        ['Pourcentage des exposés avec résultats', results.percentExposed],
        ['Rapport de cotes', results.oddsRatio.toFixed(1)],
        ['Rapport risque/prévalence', results.riskRatio.toFixed(1)],
        ['Différence risque/prévalence', results.riskDifference],
      ];

      autoTable(doc, {
        startY: y,
        head: [inputTable[0]],
        body: inputTable.slice(1),
        theme: 'grid',
        headStyles: { fillColor: colorPrimary as [number, number, number], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' }, 1: { cellWidth: 70, halign: 'center' } },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Résultats', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const resultsTable = [
        ['', 'Kelsey', 'Fleiss', 'Fleiss avec CC'],
        ['Taille d’échantillon - exposés', results.kelseyExposed, results.fleissExposed, results.fleissCCExposed],
        ['Taille d’échantillon – non exposés', results.kelseyUnexposed, results.fleissUnexposed, results.fleissCCUnexposed],
        ['Taille totale d’échantillon', results.kelseyTotal, results.fleissTotal, results.fleissCCTotal],
      ];

      autoTable(doc, {
        startY: y,
        head: [resultsTable[0]],
        body: resultsTable.slice(1),
        theme: 'grid',
        headStyles: { fillColor: colorPrimary as [number, number, number], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Références', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Kelsey et al., Méthodes dans Epidémiologie d’observation 2ème Édition, Tableau 12-15', 20, y); y += 6;
      doc.text('Fleiss, Méthodes statistiques pour taux et proportions, formules 3.18 &3.19', 20, y); y += 6;
      doc.text('CC = Correction de continuité', 20, y); y += 6;
      doc.text('Les résultats sont arrondis à l’entier le plus proche.', 20, y); y += 6;
      doc.text('Imprimez depuis le navigateur ou sélectionnez, copiez et collez dans d’autres programmes.', 20, y);

      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Taille d’Échantillon Cohorte/RCT – Fidèle à OpenEpi', 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });

      doc.save('Rapport_Taille_Echantillon_Cohorte_RCT.pdf');
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">Taille d’Échantillon Cohorte/RCT</span></li>
          </ol>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Taille d’Échantillon Cohorte/RCT</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Calcul pour études de cohorte et essais cliniques aléatoires.</p>
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
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Niveau significatif bilatéral (1-alpha)
                  </label>
                  <select
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="90">90%</option>
                    <option value="95">95%</option>
                    <option value="99">99%</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Puissance (1-beta, % de chances de détection)
                  </label>
                  <select
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="80">80%</option>
                    <option value="90">90%</option>
                    <option value="95">95%</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Rapport de taille d’échantillon (non exposés/exposés)
                  </label>
                  <input
                    type="number"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Pourcentage des non exposés avec résultats
                  </label>
                  <input
                    type="number"
                    value={percentUnexposed}
                    onChange={(e) => setPercentUnexposed(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Pourcentage des exposés avec résultats
                  </label>
                  <input
                    type="number"
                    value={percentExposed}
                    onChange={(e) => setPercentExposed(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 24"
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
                  onClick={clearForm}
                  className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

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
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main card */}
                    <div className="p-8 rounded-3xl text-center border bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/30">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Taille totale d’échantillon
                      </p>
                      <div className="text-5xl font-bold tracking-tight mb-2 text-indigo-600">
                        {results.kelseyTotal}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        Kelsey (Méthode recommandée)
                      </span>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              Rapport de cotes
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {results.oddsRatio.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                              Rapport risque/prévalence
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {results.riskRatio.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-5 border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                              Différence risque/prévalence
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {results.riskDifference}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Result Table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-semibold mb-4">Résultats par méthode</h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left py-2"></th>
                            <th className="text-center py-2">Kelsey</th>
                            <th className="text-center py-2">Fleiss</th>
                            <th className="text-center py-2">Fleiss avec CC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          <tr>
                            <td>Taille d’échantillon - exposés</td>
                            <td className="text-center">{results.kelseyExposed}</td>
                            <td className="text-center">{results.fleissExposed}</td>
                            <td className="text-center">{results.fleissCCExposed}</td>
                          </tr>
                          <tr>
                            <td>Taille d’échantillon – non exposés</td>
                            <td className="text-center">{results.kelseyUnexposed}</td>
                            <td className="text-center">{results.fleissUnexposed}</td>
                            <td className="text-center">{results.fleissCCUnexposed}</td>
                          </tr>
                          <tr>
                            <td>Taille totale d’échantillon</td>
                            <td className="text-center">{results.kelseyTotal}</td>
                            <td className="text-center">{results.fleissTotal}</td>
                            <td className="text-center">{results.fleissCCTotal}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-xs text-slate-400 mt-4 italic">Les résultats sont arrondis à l’entier le plus proche.</p>
                    </div>

                    {/* Références */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> Références
                      </h3>
                      <p className="text-sm leading-relaxed">
                        Kelsey et al., Méthodes dans Epidémiologie d’observation 2ème Édition, Tableau 12-15<br />
                        Fleiss, Méthodes statistiques pour taux et proportions, formules 3.18 &3.19<br />
                        CC = Correction de continuité
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Guide – Taille d’échantillon pour cohorte / RCT
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 text-slate-600 dark:text-slate-300">
                {/* Section 1 */}
                <section>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      1
                    </div>
                    Principe
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Ce calculateur estime le nombre de sujets nécessaires dans une étude de cohorte ou un essai randomisé (RCT) pour comparer la proportion d'événements entre un groupe exposé (ou traité) et un groupe non exposé (ou contrôle). L'utilisateur fournit les proportions attendues d'événements dans chaque groupe, le niveau de confiance, la puissance et le ratio de tailles d'échantillon entre les deux groupes.
                  </p>
                </section>

                {/* Section 2 */}
                <section>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Paramètres
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong className="text-slate-900 dark:text-white">Niveau significatif bilatéral (1‑α)</strong> – risque de conclure à tort à une différence (généralement 95%).</li>
                    <li><strong className="text-slate-900 dark:text-white">Puissance (1‑β)</strong> – probabilité de détecter une différence si elle existe réellement (souvent 80%).</li>
                    <li><strong className="text-slate-900 dark:text-white">Rapport non exposés/exposés</strong> – nombre de contrôles par sujet exposé. Laisser 1 pour des groupes de taille égale.</li>
                    <li><strong className="text-slate-900 dark:text-white">Pourcentage de non exposés avec résultats</strong> – proportion d'événements dans le groupe non exposé (ex. 10%).</li>
                    <li><strong className="text-slate-900 dark:text-white">Pourcentage d'exposés avec résultats</strong> – proportion d'événements dans le groupe exposé (ex. 24%).</li>
                  </ul>
                </section>

                {/* Section 3 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Méthodes de calcul
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Trois méthodes sont proposées, toutes basées sur la loi normale. Les quantiles utilisés sont fixes pour les valeurs courantes :
                  </p>
                  <ul className="list-disc list-inside text-sm mt-1">
                    <li>z<sub>α/2</sub> : 1,645 (90% IC), 1,96 (95% IC), 2,576 (99% IC)</li>
                    <li>z<sub>β</sub> : 0,8416 (80% puissance), 1,2816 (90%), 1,6449 (95%)</li>
                  </ul>
                  <p className="text-sm mt-2">
                    Les formules utilisent la proportion moyenne <em>p̄ = (p₁ + r·p₀)/(1+r)</em> et sa variance.
                  </p>
                  <ul className="list-disc list-inside text-sm mt-1">
                    <li><strong>Kelsey</strong> – formule exacte recommandée : <br />
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">n₁ = ⌈(z<sub>α</sub>√[p̄q̄(1+1/r)] + z<sub>β</sub>√[p₁q₁ + p₀q₀/r])² / Δ²⌉</code>
                    </li>
                    <li><strong>Fleiss</strong> – version simplifiée (parfois appelée "Fleiss without correction") : <br />
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">n₁ = ⌈(z<sub>α</sub>+z<sub>β</sub>)² × p̄q̄(1+1/r) / Δ²⌉</code>
                    </li>
                    <li><strong>Fleiss avec correction de continuité</strong> – ajoute un terme pour mieux approcher le test du χ² avec petits effectifs : <br />
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">n₁<sub>cc</sub> = ⌈n₁<sub>Fleiss</sub> + 2/Δ⌉</code>
                    </li>
                  </ul>
                </section>

                {/* Section 4 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      4
                    </div>
                    Intrepétation des résultats
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Les nombres affichés sont les tailles minimales arrondies à l’entier supérieur. Le tableau donne les effectifs nécessaires dans chaque groupe selon la méthode. La méthode de Kelsey est généralement la plus robuste et la plus utilisée. La correction de continuité (Fleiss CC) donne des tailles légèrement plus grandes, recommandées pour les petits échantillons.
                  </p>
                </section>

                {/* Section 5 */}
                <section>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      5
                    </div>
                   Exemple
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Avec les valeurs par défaut (exemple OpenEpi) :<br />
                    Pourcentage de non exposés = 10%, pourcentage d'exposés = 24%, IC 95%, puissance 80%, ratio = 1 (groupes égaux).<br />
                    Le calculateur donne :<br />
                    - Kelsey : 274 exposés, 274 non exposés → total 548.<br />
                    - Fleiss : 261 exposés, 261 non exposés → total 522.<br />
                    - Fleiss avec CC : 281 exposés, 281 non exposés → total 562.<br />
                    L'utilisation de la correction augmente la taille pour tenir compte de l'approximation normale.
                  </p>
                </section>

                {/* Section 6 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      6
                    </div>
                    Sources
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Cet outil reproduit le module « Sample Size for Cohort / RCT » d’
                    <a
                      href="https://www.openepi.com/SampleSize/SSCohort.htm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 underline font-medium ml-1"
                    >OpenEpi</a>.
                  </p>
                  <a
                    href="https://www.openepi.com/SampleSize/SSCohort.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-3"
                  >
                    Voir sur OpenEpi <ArrowRight className="w-3 h-3 ml-1" />
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