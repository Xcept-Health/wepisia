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
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MeanConfidenceInterval() {
  const [sampleMean, setSampleMean] = useState<string>('');
  const [sampleStddev, setSampleStddev] = useState<string>('');
  const [sampleSize, setSampleSize] = useState<string>('');
  const [populationSize, setPopulationSize] = useState<string>('');
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
  const formatNumber = (num: number, decimals: number = 4): string => {
    if (num === Infinity || num === -Infinity) return '∞';
    if (isNaN(num) || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  // Calcul principal conforme à OpenEpi MeanCI
  const calculateCI = () => {
    const mean = parseFloat(sampleMean) || 0;
    const stddev = parseFloat(sampleStddev) || 0;
    const n = parseInt(sampleSize) || 0;
    let N = populationSize.trim() === '' ? Infinity : parseFloat(populationSize);
    const conf = parseInt(confidenceLevel);
    const alpha = 1 - conf / 100;

    if (stddev < 0 || n < 2 || isNaN(mean) || isNaN(stddev) || isNaN(n)) {
      setResults(null);
      return;
    }
    if (isNaN(N) || N <= 0) N = Infinity;
    if (N < n) N = n; // logique OpenEpi : N ne peut être inférieur à n

    // Erreur-type de base
    const seBase = stddev / Math.sqrt(n);
    // Facteur de correction pour population finie
    const fpc = N === Infinity ? 1 : Math.sqrt((N - n) / (N - 1));
    const se = seBase * fpc;

    const variance = stddev ** 2;

    // Valeurs critiques
    const z = hasJStat ? (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1) : 1.96;
    const df = n - 1;
    const t = hasJStat ? (window as any).jStat.studentt.inv(1 - alpha / 2, df) : 2.0;

    // Marges d'erreur
    const zMargin = z * se;
    const tMargin = t * se;

    // Intervalles
    const zLower = mean - zMargin;
    const zUpper = mean + zMargin;
    const tLower = mean - tMargin;
    const tUpper = mean + tMargin;
    const zWidth = zUpper - zLower;
    const tWidth = tUpper - tLower;

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

  // Recalcul automatique
  useEffect(() => {
    calculateCI();
  }, [sampleMean, sampleStddev, sampleSize, populationSize, confidenceLevel]);

  // Handlers
  const clear = () => {
    setSampleMean('');
    setSampleStddev('');
    setSampleSize('');
    setPopulationSize('');
    setConfidenceLevel('95');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setSampleMean('50');
    setSampleStddev('10');
    setSampleSize('30');
    setPopulationSize('');
    toast.success('Exemple chargé (moyenne 50, écart-type 10, n=30)');
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Intervalle de confiance pour la moyenne – OpenEpi MeanCI
Moyenne : ${formatNumber(results.mean)}
Écart-type : ${formatNumber(results.stddev)}
Taille échantillon : ${results.n}
Taille population : ${results.N === Infinity ? 'Infinie' : results.N}
Niveau de confiance : ${results.conf}%

Erreur-type : ${formatNumber(results.se, 6)}
Facteur correction : ${formatNumber(results.fpc, 6)}
Degrés de liberté : ${results.df}

Intervalle Z (IC ${results.conf}%) : [${formatNumber(results.zLower)} – ${formatNumber(results.zUpper)}]
Intervalle t (IC ${results.conf}%) : [${formatNumber(results.tLower)} – ${formatNumber(results.tUpper)}]

Interprétation : À ${results.conf}% de confiance, la vraie moyenne de la population se situe entre ${formatNumber(results.tLower)} et ${formatNumber(results.tUpper)} (méthode t recommandée).`;
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
      doc.text("Rapport d'intervalle de confiance – Moyenne", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('MeanCI – OpenEpi', 190, 32, { align: 'right' });

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
      doc.text(`Moyenne : ${formatNumber(results.mean)}`, 25, y); y += 6;
      doc.text(`Écart-type : ${formatNumber(results.stddev)}`, 25, y); y += 6;
      doc.text(`Taille échantillon : ${results.n}`, 25, y); y += 6;
      doc.text(`Taille population : ${results.N === Infinity ? 'Infinie' : results.N}`, 25, y); y += 6;
      doc.text(`Niveau de confiance : ${results.conf} %`, 25, y); y += 12;

      // Carte de l'intervalle t
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(20, y, 170, 35, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('INTERVALLE DE CONFIANCE (t de Student)', 105, y + 8, { align: 'center' });
      doc.setFontSize(16);
      doc.text(`[${formatNumber(results.tLower)} – ${formatNumber(results.tUpper)}]`, 105, y + 22, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Moyenne : ${formatNumber(results.mean)}`, 105, y + 30, { align: 'center' });
      y += 45;

      // Statistiques descriptives
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Statistiques descriptives', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const statsTable = [
        ['Variance', formatNumber(results.variance, 4)],
        ['Erreur-type corrigée', formatNumber(results.se, 6)],
        ['Facteur de correction (FPC)', formatNumber(results.fpc, 6)],
        ['Degrés de liberté', results.df.toString()],
        ['Valeur critique Z', formatNumber(results.zValue, 4)],
        ['Valeur critique t', formatNumber(results.tValue, 4)],
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

      // Tableau des IC
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Intervalles de confiance à ${results.conf}%`, 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const icTable = [
        ['Z (grands échantillons)', formatNumber(results.zLower), formatNumber(results.zUpper), formatNumber(results.zWidth)],
        ['t de Student (recommandé)', formatNumber(results.tLower), formatNumber(results.tUpper), formatNumber(results.tWidth)],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'Limite inf.', 'Limite sup.', 'Largeur']],
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
      const interpretation = `À ${results.conf}% de confiance, la vraie moyenne de la population se situe entre ${formatNumber(results.tLower)} et ${formatNumber(results.tUpper)}. L'intervalle basé sur la distribution t de Student est recommandé pour les petits échantillons (n < 30) ou lorsque l'écart-type de la population est inconnu.`;
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;

      // Références
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Méthodes basées sur OpenEpi – MeanCI. Intervalle Z : approximation normale. Intervalle t : distribution t de Student.', 20, y); y += 4;
      doc.text('Correction pour population finie appliquée si N est spécifié et inférieur à 999 999 999.', 20, y); y += 4;

      // Pied de page
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('MeanCI – conforme OpenEpi', 20, footerY + 5);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`MeanCI_${results.mean.toFixed(1)}_n${results.n}.pdf`);
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
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">MeanCI</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Sigma className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Intervalle de confiance pour la moyenne
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Estimation de la moyenne populationnelle avec IC – Méthodes Z et t (OpenEpi)
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
                    Moyenne de l'échantillon (x̄)
                  </label>
                  <input
                    type="number"
                    value={sampleMean}
                    onChange={(e) => setSampleMean(e.target.value)}
                    step="any"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Écart-type de l'échantillon (s)
                  </label>
                  <input
                    type="number"
                    value={sampleStddev}
                    onChange={(e) => setSampleStddev(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 10"
                  />
                </div>
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
                    placeholder="Ex: 30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Taille de la population (N) <span className="font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="number"
                    value={populationSize}
                    onChange={(e) => setPopulationSize(e.target.value)}
                    min="1"
                    step="1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Laissez vide pour infini"
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
                    Correction pour population finie
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Si vous connaissez la taille de la population totale (N), entrez-la pour appliquer le facteur de correction. L'erreur-type sera réduite et l'intervalle plus étroit.
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
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
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
                 
                  <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                  <p className="text-lg">Saisissez les données pour l'analyse</p>
                  <div className="text-4xl font-bold mt-2">
                    0.00
                  </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte de l'intervalle t */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        Intervalle de confiance à {results.conf}% (t de Student)
                      </p>
                      <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                        [{formatNumber(results.tLower)} – {formatNumber(results.tUpper)}]
                      </div>
                      <p className="text-sm text-slate-500">
                        Moyenne = {formatNumber(results.mean)} • Largeur = {formatNumber(results.tWidth)}
                      </p>
                    </div>

                    {/* Statistiques descriptives */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Erreur-type</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.se, 6)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Variance</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.variance, 4)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">ddl (df)</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{results.df}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">FPC</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.fpc, 6)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Z critique</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.zValue, 4)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">t critique</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.tValue, 4)}</p>
                      </div>
                    </div>

                    {/* Tableau comparatif Z vs t */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Méthodes d'intervalle de confiance
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
                              <th className="px-6 py-3 text-left font-semibold">Méthode</th>
                              <th className="px-6 py-3 text-center font-semibold">Limite inf.</th>
                              <th className="px-6 py-3 text-center font-semibold">Limite sup.</th>
                              <th className="px-6 py-3 text-center font-semibold">Largeur</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr>
                              <td className="px-6 py-3 font-medium">Z (grands échantillons)</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.zLower)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.zUpper)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.zWidth)}</td>
                            </tr>
                            <tr className="bg-emerald-50/30 dark:bg-emerald-900/10">
                              <td className="px-6 py-3 font-medium">t de Student (recommandé)</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.tLower)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.tUpper)}</td>
                              <td className="px-6 py-3 text-center font-mono">{formatNumber(results.tWidth)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Interprétation */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                            Interprétation
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            À <strong>{results.conf}%</strong> de confiance, la vraie moyenne de la population se situe entre{' '}
                            <strong>{formatNumber(results.tLower)}</strong> et <strong>{formatNumber(results.tUpper)}</strong>.
                            L'intervalle basé sur la distribution <strong>t de Student</strong> est recommandé, surtout lorsque
                            n &lt; 30 ou que l'écart-type de la population est inconnu.
                            {results.N !== Infinity && (
                              <> Une correction pour population finie a été appliquée (FPC = {formatNumber(results.fpc, 4)}).</>
                            )}
                          </p>
                        </div>
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
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Méthode Z</span> – Approximation normale, valable pour n ≥ 30 ou lorsque l'écart-type de la population est connu. IC = x̄ ± z·σ/√n.</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Méthode t</span> – Distribution t de Student, recommandée pour petits échantillons ou écart-type inconnu. IC = x̄ ± t·s/√n.</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Correction pour population finie (FPC)</span> – Applique le facteur √((N−n)/(N−1)) lorsque N est spécifié et inférieur à 999 999 999.</p>
                          <p className="mt-2 text-blue-600 dark:text-blue-400 italic">
                            Calculs conformes à OpenEpi – Module MeanCI.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

{/* Modal d'aide  */}
{showHelpModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
      onClick={() => setShowHelpModal(false)}
    />
    <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Guide – MeanCI (Intervalle pour une moyenne)
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
            Ce module reproduit l'outil <strong>MeanCI</strong> d'OpenEpi. Il calcule l'intervalle de confiance pour une moyenne
            à partir des statistiques d'un échantillon. Deux méthodes sont proposées : l'approximation normale (Z) et la
            distribution t de Student, plus adaptée aux petits échantillons. Une correction pour population finie peut être
            appliquée si la taille de la population totale est connue.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-500" /> Z vs t
            </div>
            <div className="text-xs text-slate-500">Z : grand échantillon (n &ge; 30). t : petit échantillon (n {'<'} 30) ou σ inconnu.</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-500" /> FPC
            </div>
            <div className="text-xs text-slate-500">Réduit l'erreur-type quand l'échantillon couvre une part importante de la population.</div>
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
            <p><strong className="text-slate-900 dark:text-white">Intervalle Z</strong> – IC = x̄ ± z·σ/√n, où z est la quantile de la loi normale. Utilisable pour n ≥ 30 ou σ connu.</p>
            <p><strong className="text-slate-900 dark:text-white">Intervalle t</strong> – IC = x̄ ± t·s/√n, avec t quantile de Student à (n‑1) ddl. Recommandé en pratique.</p>
            <p><strong className="text-slate-900 dark:text-white">Correction de population finie (FPC)</strong> – L'erreur-type est multipliée par √((N‑n)/(N‑1)). Appliquée si N est saisi et N {'<'} 999 999 999.</p>
          </div>
          <a
            href="https://www.openepi.com/Mean/Mean.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
          >
            Source : OpenEpi – MeanCI <ArrowRight className="w-3 h-3 ml-1" />
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
              <a href="https://www.openepi.com/PDFDocs/MeanDoc.pdf" target="_blank" className="text-blue-600 hover:underline">
                Documentation officielle OpenEpi (PDF)
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