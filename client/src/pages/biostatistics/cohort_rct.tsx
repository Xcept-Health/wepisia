import { useState, useEffect, useRef } from 'react';
import { 
  Blocks, ChevronRight, Calculator, BarChart3, 
  Copy, FileDown, HelpCircle, X, Info, RotateCcw,
  ChevronDown
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [showStatsDetail, setShowStatsDetail] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    calculate();
  }, [confidenceLevel, power, ratio, percentUnexposed, percentExposed]);

  const calculate = () => {
    const conf = parseInt(confidenceLevel);
    const pow = parseInt(power) / 100;
    const rat = parseFloat(ratio) || 1;
    const p0 = parseFloat(percentUnexposed) / 100;
    const p1 = parseFloat(percentExposed) / 100;

    if (isNaN(p0) || isNaN(p1) || p0 < 0 || p0 > 1 || p1 < 0 || p1 > 1 || rat <= 0) {
      setResults(null);
      return;
    }

    const oddsRatio = (p1 / (1 - p1)) / (p0 / (1 - p0));
    const riskRatio = p1 / p0;
    const riskDiff = p1 - p0;

    const zAlpha = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;
    const zBeta = pow === 0.8 ? 0.8416 : pow === 0.9 ? 1.2816 : pow === 0.95 ? 1.6449 : 0.8416;

    // Kelsey method
    const kelseyN1 = Math.ceil((zAlpha * Math.sqrt(rat * p0 * (1 - p0) + p1 * (1 - p1)) + zBeta * Math.sqrt(rat * p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (rat * (p1 - p0) ** 2));
    const kelseyN2 = Math.ceil(kelseyN1 * rat);
    const kelseyTotal = kelseyN1 + kelseyN2;

    // Fleiss method
    const fleissN1 = Math.ceil((zAlpha * Math.sqrt((rat + 1) * (p0 * (1 - p0) + p1 * (1 - p1) / rat)) + zBeta * Math.sqrt((rat + 1) * (p0 * (1 - p0) + p1 * (1 - p1) / rat))) ** 2 / (rat * (p1 - p0) ** 2));
    const fleissN2 = Math.ceil(fleissN1 * rat);
    const fleissTotal = fleissN1 + fleissN2;

    // Fleiss with CC
    const fleissCCN1 = Math.ceil(fleissN1 * (1 + 2 / (rat * Math.abs(p1 - p0))));
    const fleissCCN2 = Math.ceil(fleissCCN1 * rat);
    const fleissCCTotal = fleissCCN1 + fleissCCN2;

    setResults({
      confidenceLevel: conf,
      power: pow * 100,
      ratio: rat,
      percentUnexposed: p0 * 100,
      percentExposed: p1 * 100,
      oddsRatio,
      riskRatio,
      riskDifference: riskDiff * 100,
      kelseyExposed: kelseyN1,
      kelseyUnexposed: kelseyN2,
      kelseyTotal,
      fleissExposed: fleissN1,
      fleissUnexposed: fleissN2,
      fleissTotal,
      fleissCCExposed: fleissCCN1,
      fleissCCUnexposed: fleissCCN2,
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
    const text = `Taille d’échantillon : x- d’un groupe, cohorte et essais cliniques aléatoires\n\n` +
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
        columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' } },
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
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Taille d’Échantillon Cohorte/RCT</span></li>
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
                  <BarChart3 className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
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
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte principale */}
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

                    {/* Statistiques secondaires */}
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

                    {/* Tableau des résultats */}
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

        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide Rapide (OpenEpi)</h3>
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
                    Calcule la taille d’échantillon pour détecter une différence dans les proportions d'événements entre groupes exposés et non exposés dans des études de cohorte ou RCT.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Méthodes
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Kelsey, Fleiss, et Fleiss avec correction de continuité. Utilisez Kelsey pour les petits échantillons.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}