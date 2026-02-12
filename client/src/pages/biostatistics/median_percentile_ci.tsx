import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Calculator,
  BarChart3,
  Copy,
  FileDown,
  HelpCircle,
  X,
  Trash2,
  Info,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  Percent,
  Layers,
  Hash,
  Gauge
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MedianPercentileCI() {
  const [sampleSize, setSampleSize] = useState<string>('');
  const [percentile, setPercentile] = useState<string>('50');
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

  // Formatage des nombres
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === Infinity || num === -Infinity) return '∞';
    if (isNaN(num) || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  // Calcul principal – conforme à OpenEpi Median/Percentile CI
  const calculateMedianCI = () => {
    const n = parseInt(sampleSize) || 0;
    const perc = parseFloat(percentile) || 50;
    const conf = parseInt(confidenceLevel);
    const alpha = 1 - conf / 100;

    if (n < 2 || perc < 0 || perc > 100) {
      setResults(null);
      return;
    }

    // Approximation normale des rangs
    const p = perc / 100;
    const z = hasJStat
      ? (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1)
      : conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;

    const expectedRank = n * p;
    const se = Math.sqrt(n * p * (1 - p));

    // Limites de confiance pour les rangs (arrondies aux entiers)
    const lowerRank = Math.max(1, Math.floor(expectedRank - z * se));
    const upperRank = Math.min(n, Math.ceil(expectedRank + z * se));

    // Conversion en percentiles pour l'affichage
    const lowerPercentile = (lowerRank / n) * 100;
    const upperPercentile = (upperRank / n) * 100;

    setResults({
      n,
      percentile: perc,
      conf,
      p,
      expectedRank,
      se,
      z,
      lowerRank,
      upperRank,
      lowerPercentile,
      upperPercentile,
      hasJStat
    });
  };

  // Recalcul automatique
  useEffect(() => {
    calculateMedianCI();
  }, [sampleSize, percentile, confidenceLevel]);

  // Handlers
  const clear = () => {
    setSampleSize('');
    setPercentile('50');
    setConfidenceLevel('95');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setSampleSize('100');
    setPercentile('50');
    toast.success('Exemple chargé (n=100, percentile 50%)');
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Intervalle de confiance pour le percentile – OpenEpi MedianCI
Taille échantillon : ${results.n}
Percentile : ${results.percentile}%
Niveau de confiance : ${results.conf}%

Rang attendu : ${formatNumber(results.expectedRank, 2)}
Erreur standard : ${formatNumber(results.se, 4)}
Valeur critique Z : ${formatNumber(results.z, 4)}

IC ${results.conf}% du rang : [${results.lowerRank} – ${results.upperRank}]
IC ${results.conf}% du percentile : [${formatNumber(results.lowerPercentile)}% – ${formatNumber(results.upperPercentile)}%]

Interprétation : À ${results.conf}% de confiance, le ${results.percentile}ème percentile correspond aux rangs ${results.lowerRank} à ${results.upperRank} dans un échantillon trié de taille ${results.n}.`;
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
      doc.text("Rapport d'intervalle de confiance – Percentile", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('MedianCI – OpenEpi', 190, 32, { align: 'right' });

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
      doc.text(`Taille échantillon : ${results.n}`, 25, y); y += 6;
      doc.text(`Percentile : ${results.percentile}%`, 25, y); y += 6;
      doc.text(`Niveau de confiance : ${results.conf}%`, 25, y); y += 12;

      // Carte de l'intervalle
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(20, y, 170, 35, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`INTERVALLE DE CONFIANCE À ${results.conf}%`, 105, y + 8, { align: 'center' });
      doc.setFontSize(16);
      doc.text(`[${results.lowerRank} – ${results.upperRank}] (rangs)`, 105, y + 22, { align: 'center' });
      y += 45;

      // Tableau des résultats
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Résultats détaillés', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = [
        ['Rang attendu', formatNumber(results.expectedRank, 2), ''],
        ['Erreur standard du rang', formatNumber(results.se, 4), ''],
        ['Valeur critique Z', formatNumber(results.z, 4), ''],
        ['Limite inférieure (rang)', results.lowerRank.toString(), `${formatNumber(results.lowerPercentile)}%`],
        ['Limite supérieure (rang)', results.upperRank.toString(), `${formatNumber(results.upperPercentile)}%`],
        ['Largeur de l’intervalle (rangs)', (results.upperRank - results.lowerRank).toString(), ''],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Paramètre', 'Valeur', 'Percentile correspondant']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // Interprétation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Interprétation', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const interpretation = `À ${results.conf}% de confiance, le ${results.percentile}ème percentile de la population correspond aux rangs ${results.lowerRank} à ${results.upperRank} dans un échantillon trié de taille ${results.n}.\n\nPour obtenir l’intervalle de confiance sur la valeur du percentile :\n1. Triez vos ${results.n} observations par ordre croissant.\n2. La valeur à la position ${results.lowerRank} est la borne inférieure.\n3. La valeur à la position ${results.upperRank} est la borne supérieure.`;
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;

      // Références
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Méthode basée sur l’approximation normale des rangs (Conover, 1999).', 20, y); y += 4;
      doc.text('Conforme à OpenEpi – Module Median/Percentile CI.', 20, y); y += 4;

      // Pied de page
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('MedianCI – conforme OpenEpi', 20, footerY + 5);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`MedianCI_n${results.n}_p${results.percentile}_${results.conf}pc.pdf`);
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
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">MedianCI</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Percent className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Intervalle de confiance pour la médiane / percentile
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Estimation du rang du percentile dans la population – Méthode des rangs normaux (OpenEpi)
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
                    Taille de l'échantillon (n)
                  </label>
                  <input
                    type="number"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(e.target.value)}
                    min="2"
                    step="1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Percentile (p)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={percentile}
                      onChange={(e) => setPercentile(e.target.value)}
                      min="0"
                      max="100"
                      step="1"
                      className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    />
                    <span className="text-slate-500 dark:text-slate-400 text-lg font-medium">%</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setPercentile('25')}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Q1 (25%)
                    </button>
                    <button
                      onClick={() => setPercentile('50')}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Médiane (50%)
                    </button>
                    <button
                      onClick={() => setPercentile('75')}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Q3 (75%)
                    </button>
                  </div>
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
                    Approximation normale des rangs
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    L'intervalle est construit sur les rangs et non sur les valeurs. Appliquez les rangs obtenus à vos données triées pour obtenir l'IC du percentile.
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
                      title="Copier les résultats"
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
                    <p className="text-lg">Saisissez la taille de l'échantillon</p>
                    <p className="text-slate-400 text-sm mt-2">n doit être ≥ 2</p>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte principale : intervalle de confiance du rang */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        IC {results.conf}% du rang – percentile {results.percentile}%
                      </p>
                      <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                        [{results.lowerRank} – {results.upperRank}]
                      </div>
                      <p className="text-sm text-slate-500">
                        Rang attendu = {formatNumber(results.expectedRank, 2)}
                      </p>
                    </div>

                    {/* Statistiques clés */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Taille (n)</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{results.n}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Percentile</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{results.percentile}%</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Erreur std</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.se, 4)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Z critique</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.z, 4)}</p>
                      </div>
                    </div>

                    {/* Tableau détaillé */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Détail de l'intervalle de confiance
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
                              <th className="px-6 py-3 text-left font-semibold">Description</th>
                              <th className="px-6 py-3 text-center font-semibold">Rang</th>
                              <th className="px-6 py-3 text-center font-semibold">Percentile</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr>
                              <td className="px-6 py-3 font-medium">Borne inférieure</td>
                              <td className="px-6 py-3 text-center font-mono font-bold text-green-600 dark:text-green-400">
                                {results.lowerRank}
                              </td>
                              <td className="px-6 py-3 text-center font-mono">
                                {formatNumber(results.lowerPercentile)}%
                              </td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 font-medium">Rang attendu</td>
                              <td className="px-6 py-3 text-center font-mono">
                                {formatNumber(results.expectedRank, 2)}
                              </td>
                              <td className="px-6 py-3 text-center font-mono">
                                {results.percentile}%
                              </td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 font-medium">Borne supérieure</td>
                              <td className="px-6 py-3 text-center font-mono font-bold text-red-600 dark:text-red-400">
                                {results.upperRank}
                              </td>
                              <td className="px-6 py-3 text-center font-mono">
                                {formatNumber(results.upperPercentile)}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Détails des méthodes (repliable) */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <button
                        onClick={() => setShowMethodDetails(!showMethodDetails)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            showMethodDetails ? 'rotate-180' : ''
                          }`}
                        />
                        {showMethodDetails ? 'Masquer' : 'Afficher'} les notes méthodologiques
                      </button>
                      {showMethodDetails && (
                        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400 animate-in slide-in-from-top-2">
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Approximation normale des rangs</span> – L’intervalle de confiance pour le rang d’un percentile est construit à partir de la distribution normale : rang ~ N(np, np(1-p)).</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Bornes entières</span> – Les limites sont arrondies à l’entier le plus proche dans l’échantillon.</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Interprétation</span> – L’intervalle porte sur le <em>rang</em> du percentile dans la population. Pour obtenir l’IC sur la <em>valeur</em>, appliquez ces rangs à vos données triées.</p>
                          <p className="mt-2 text-blue-600 dark:text-blue-400 italic">
                            Méthode conforme à OpenEpi – Module Median/Percentile CI.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interprétation */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                            Comment utiliser ce résultat ?
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            1. Triez vos <strong>{results.n}</strong> observations par ordre croissant.<br />
                            2. La <strong>{results.lowerRank}e</strong> valeur est la borne inférieure de l’IC.<br />
                            3. La <strong>{results.upperRank}e</strong> valeur est la borne supérieure.<br />
                            <span className="block mt-1 text-blue-700 dark:text-blue-300">
                              À {results.conf}% de confiance, le vrai {results.percentile}e percentile se situe entre ces deux valeurs.
                            </span>
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
                  Guide – MedianCI (Percentile)
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
                    Ce module reproduit l'outil <strong>Median/Percentile CI</strong> d'OpenEpi. Il estime l’intervalle de confiance pour le <strong>rang</strong> d’un percentile dans la population, à partir de la taille de l’échantillon. L’approximation normale de la distribution binomiale est utilisée.
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      IC sur le rang
                    </div>
                    <div className="text-xs text-slate-500">L’intervalle est donné en position dans l’échantillon trié, pas directement en valeur.</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    Condition d’application
                    </div>
                    <div className="text-xs text-slate-500">L’approximation est valable si n·p ≥ 5 et n·(1‑p) ≥ 5.</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Méthode de calcul
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">Rang attendu</strong> – n × p</p>
                    <p><strong className="text-slate-900 dark:text-white">Erreur standard</strong> – √(n·p·(1‑p))</p>
                    <p><strong className="text-slate-900 dark:text-white">Intervalle</strong> – [max(1, floor(rang – z·SE)) , min(n, ceil(rang + z·SE))]</p>
                    <p><strong className="text-slate-900 dark:text-white">Percentiles correspondants</strong> – (rang / n) × 100%</p>
                  </div>
                  <a
                    href="https://www.openepi.com/Median/Median.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source : OpenEpi – Median/Percentile CI <ArrowRight className="w-3 h-3 ml-1" />
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
                      <a href="https://www.openepi.com/PDFDocs/MedianDoc.pdf" target="_blank" className="text-blue-600 hover:underline">
                        Documentation officielle OpenEpi (PDF)
                      </a>
                    </p>
                    <p>
                      Conover W.J. – <em>Practical Nonparametric Statistics</em>, 3rd ed.
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