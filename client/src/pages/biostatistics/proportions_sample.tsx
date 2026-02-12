import { useState, useEffect, useRef, useCallback } from 'react';
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
  Layers,
  Hash,
  Gauge,
  Target,
  Percent,
  Sigma
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SampleSizeProportion() {
  // Paramètres
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [marginError, setMarginError] = useState<string>('5');
  const [proportion, setProportion] = useState<string>('50');
  const [populationSize, setPopulationSize] = useState<string>('');
  const [designEffect, setDesignEffect] = useState<string>('1');

  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showMethodDetails, setShowMethodDetails] = useState<boolean>(false);
  const [isJStatReady, setIsJStatReady] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Chargement des scripts externes
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        script.onload = () => setIsJStatReady(true);
        document.body.appendChild(script);
      } else {
        setIsJStatReady(true);
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

  // Calcul principal – taille d'échantillon pour une proportion
  const calculateSampleSize = useCallback(() => {
    const conf = parseInt(confidenceLevel);
    const alpha = 1 - conf / 100;
    const d = parseFloat(marginError) / 100; // marge d'erreur en proportion
    const p = parseFloat(proportion) / 100; // proportion estimée
    const N = populationSize.trim() === '' ? Infinity : parseFloat(populationSize);
    const deff = parseFloat(designEffect) || 1;

    // Validations
    if (isNaN(p) || p <= 0 || p >= 1) {
      setResults(null);
      return;
    }
    if (isNaN(d) || d <= 0 || d >= 1) {
      setResults(null);
      return;
    }
    if (isNaN(N) || N < 0) {
      setResults(null);
      return;
    }
    if (isNaN(deff) || deff <= 0) {
      setResults(null);
      return;
    }

    // Valeur critique Z
    const z = isJStatReady && (window as any).jStat?.normal?.inv
      ? (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1)
      : conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;

    // Taille d'échantillon sans correction (population infinie)
    let n = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(d, 2);
    n = Math.ceil(n * deff); // application de l'effet de plan et arrondi supérieur

    // Taille d'échantillon avec correction pour population finie
    let n_adj = n;
    if (isFinite(N) && N > 0 && n > 0.05 * N) {
      n_adj = Math.ceil((n * N) / (n + (N - 1)));
    } else {
      n_adj = n;
    }

    // Calculs supplémentaires pour différentes marges d'erreur (affichage tableau)
    const margins = [1, 2, 3, 5, 10, 20].map(m => {
      const d_m = m / 100;
      let n_m = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(d_m, 2);
      n_m = Math.ceil(n_m * deff);
      let n_m_adj = n_m;
      if (isFinite(N) && N > 0 && n_m > 0.05 * N) {
        n_m_adj = Math.ceil((n_m * N) / (n_m + (N - 1)));
      }
      return { margin: m, n: n_m, n_adj: n_m_adj };
    });

    setResults({
      conf,
      marginError: d * 100,
      proportion: p * 100,
      populationSize: N,
      designEffect: deff,
      z,
      n,
      n_adj,
      margins,
      isJStatReady
    });
  }, [confidenceLevel, marginError, proportion, populationSize, designEffect, isJStatReady]);

  // Recalcul automatique
  useEffect(() => {
    calculateSampleSize();
  }, [calculateSampleSize]);

  // Handlers
  const clear = () => {
    setConfidenceLevel('95');
    setMarginError('5');
    setProportion('50');
    setPopulationSize('');
    setDesignEffect('1');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setConfidenceLevel('95');
    setMarginError('5');
    setProportion('50');
    setPopulationSize('10000');
    setDesignEffect('1');
    toast.success('Exemple chargé (population finie 10000)');
  };

  const copyResults = async () => {
    if (!results) return;

    let text = `Taille d'échantillon pour une proportion – OpenEpi SSPropor\n`;
    text += `Niveau de confiance : ${results.conf}%\n`;
    text += `Marge d'erreur : ${formatNumber(results.marginError)}%\n`;
    text += `Proportion estimée : ${formatNumber(results.proportion)}%\n`;
    text += `Taille de la population : ${isFinite(results.populationSize) ? results.populationSize : 'Infinie'}\n`;
    text += `Effet de plan : ${formatNumber(results.designEffect, 2)}\n`;
    text += `Valeur critique Z : ${formatNumber(results.z, 4)}\n\n`;
    text += `Taille d'échantillon requise :\n`;
    text += `• Sans correction pour population finie : ${results.n}\n`;
    text += `• Avec correction pour population finie : ${results.n_adj}\n\n`;
    text += `Taille d'échantillon pour différentes marges d'erreur :\n`;
    text += `Marge (%)\tSans correction\tAvec correction\n`;
    results.margins.forEach((m: any) => {
      text += `${m.margin}%\t${m.n}\t${m.n_adj}\n`;
    });

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
      doc.text("Rapport de taille d'échantillon – Proportion", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('SampleSizeProportion – OpenEpi', 190, 32, { align: 'right' });

      let y = 55;

      // Données saisies
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Paramètres', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Niveau de confiance : ${results.conf}%`, 25, y); y += 6;
      doc.text(`Marge d'erreur : ${formatNumber(results.marginError)}%`, 25, y); y += 6;
      doc.text(`Proportion estimée : ${formatNumber(results.proportion)}%`, 25, y); y += 6;
      doc.text(`Taille de la population : ${isFinite(results.populationSize) ? results.populationSize : 'Infinie'}`, 25, y); y += 6;
      doc.text(`Effet de plan : ${formatNumber(results.designEffect, 2)}`, 25, y); y += 6;
      doc.text(`Valeur critique Z : ${formatNumber(results.z, 4)}`, 25, y); y += 12;

      // Carte du résultat principal
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(20, y, 170, 40, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TAILLE D\'ÉCHANTILLON REQUISE', 105, y + 8, { align: 'center' });
      doc.setFontSize(24);
      doc.text(results.n_adj.toString(), 105, y + 28, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`(sans correction : ${results.n})`, 105, y + 35, { align: 'center' });
      y += 50;

      // Tableau pour différentes marges
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Taille d\'échantillon selon la marge d\'erreur', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const marginTableBody = results.margins.map((m: any) => [
        `${m.margin}%`,
        m.n.toString(),
        m.n_adj.toString()
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Marge d\'erreur', 'Sans correction', 'Avec correction']],
        body: marginTableBody,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 40, halign: 'center' },
          1: { cellWidth: 50, halign: 'center' },
          2: { cellWidth: 50, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 3, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] }
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

      let interpretation = `Pour estimer une proportion avec une marge d'erreur de ${formatNumber(results.marginError)}% `;
      interpretation += `et un niveau de confiance de ${results.conf}%, `;
      interpretation += `en supposant une proportion de ${formatNumber(results.proportion)}%, `;
      if (isFinite(results.populationSize)) {
        interpretation += `dans une population de ${results.populationSize} individus, `;
      }
      interpretation += `la taille d'échantillon nécessaire est de ${results.n_adj}. `;
      interpretation += `Sans correction pour population finie, il faudrait ${results.n} sujets.`;

      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;

      // Références
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Formule : n = (Z²·p·(1-p)) / d² · deff. Correction pour population finie : n_adj = (n·N)/(n+(N-1)).', 20, y); y += 4;
      doc.text('Conforme à OpenEpi – Module SSPropor.', 20, y); y += 4;

      // Pied de page
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('SampleSizeProportion – conforme OpenEpi', 20, footerY + 5);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`SampleSizeProportion_${results.n_adj}.pdf`);
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
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">SampleSizeProportion</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Target className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Taille d'échantillon pour une proportion
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Estimation de la taille d'échantillon nécessaire pour une enquête ou une étude – OpenEpi SSPropor
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
                    Niveau de confiance
                  </label>
                  <select
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="80">80%</option>
                    <option value="90">90%</option>
                    <option value="95">95% (Standard)</option>
                    <option value="99">99%</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Marge d'erreur (%) <span className="font-normal">(demi-largeur de l'IC)</span>
                  </label>
                  <input
                    type="number"
                    value={marginError}
                    onChange={(e) => setMarginError(e.target.value)}
                    min="0.1"
                    max="50"
                    step="0.1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Proportion estimée (%) <span className="font-normal">(p, utiliser 50% si inconnue)</span>
                  </label>
                  <input
                    type="number"
                    value={proportion}
                    onChange={(e) => setProportion(e.target.value)}
                    min="1"
                    max="99"
                    step="1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Taille de la population (N) <span className="font-normal">(optionnel, pour correction finie)</span>
                  </label>
                  <input
                    type="number"
                    value={populationSize}
                    onChange={(e) => setPopulationSize(e.target.value)}
                    min="1"
                    step="1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Laissez vide pour population infinie"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Effet de plan (DEFF) <span className="font-normal">(1 pour échantillon aléatoire simple)</span>
                  </label>
                  <input
                    type="number"
                    value={designEffect}
                    onChange={(e) => setDesignEffect(e.target.value)}
                    min="0.1"
                    step="0.1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="1.0"
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

            {/* Info complémentaire */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Formule utilisée
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    n = [Z²·p·(1-p)] / d² · DEFF. Correction pour population finie : n' = (n·N) / (n + N - 1). La proportion de 50% donne la taille maximale.
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
                    <p className="text-lg">Saisissez les paramètres</p>
                    <p className="text-slate-400 text-sm mt-2">Marge d'erreur et proportion doivent être {'>'} 0</p>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte du résultat principal */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        Taille d'échantillon requise
                      </p>
                      <div className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                        {results.n_adj}
                      </div>
                      <p className="text-sm text-slate-500">
                        avec correction pour population finie
                      </p>
                      <div className="flex justify-center gap-4 mt-3 text-xs">
                        <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                          Sans correction : {results.n}
                        </span>
                      </div>
                    </div>

                    {/* Paramètres clés */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Z critique</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.z, 4)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Marge</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.marginError)}%</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Proportion</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.proportion)}%</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Effet plan</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.designEffect, 2)}</p>
                      </div>
                    </div>

                    {/* Tableau pour différentes marges */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Taille d'échantillon selon la marge d'erreur
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-4 py-3 text-center">Marge d'erreur (%)</th>
                              <th className="px-4 py-3 text-center">Sans correction</th>
                              <th className="px-4 py-3 text-center">Avec correction</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {results.margins.map((m: any, idx: number) => (
                              <tr key={idx} className={m.margin === results.marginError ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                                <td className="px-4 py-3 text-center font-mono">{m.margin}%</td>
                                <td className="px-4 py-3 text-center font-mono">{m.n}</td>
                                <td className="px-4 py-3 text-center font-mono">{m.n_adj}</td>
                              </tr>
                            ))}
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
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Formule standard</span> – n = Z²·p·(1-p) / d², où Z est la valeur critique de la loi normale pour le niveau de confiance choisi, p la proportion estimée, d la marge d'erreur.</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Correction pour population finie</span> – n_adj = (n·N) / (n + N - 1). Applicable si n/N &gt; 0.05.</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Effet de plan (DEFF)</span> – Multiplicateur pour échantillonnage complexe (grappes, stratification). Pour un échantillon aléatoire simple, DEFF = 1.</p>
                          <p className="mt-2 text-blue-600 dark:text-blue-400 italic">
                            Méthodes conformes à OpenEpi – Module SSPropor.
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
                  Guide – Taille d'échantillon pour une proportion
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
                    Ce module reproduit l'outil <strong>SSPropor</strong> d'OpenEpi. Il calcule la taille d'échantillon nécessaire pour estimer une proportion avec une précision (marge d'erreur) et un niveau de confiance donnés. La formule repose sur la distribution normale. Une correction pour population finie peut être appliquée, ainsi qu'un effet de plan pour les sondages complexes.
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                       p = 50%
                    </div>
                    <div className="text-xs text-slate-500">Donne la taille d'échantillon maximale (cas le plus conservateur).</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      Correction finie
                    </div>
                    <div className="text-xs text-slate-500">Réduit la taille d'échantillon quand la population est petite.</div>
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
                    <p><strong className="text-slate-900 dark:text-white">Formule de base</strong> – n = Z²·p·(1-p) / d². Z est le quantile de la loi normale (1,96 pour 95%).</p>
                    <p><strong className="text-slate-900 dark:text-white">Correction pour population finie</strong> – n' = (n·N) / (n + N - 1). Utilisée quand l'échantillon dépasse 5% de la population.</p>
                    <p><strong className="text-slate-900 dark:text-white">Effet de plan (DEFF)</strong> – n_final = n × DEFF. Pour un sondage aléatoire simple, DEFF = 1. Pour un sondage en grappes, DEFF {'>'} 1.</p>
                  </div>
                  <a
                    href="https://www.openepi.com/SampleSize/SSPropor.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source : OpenEpi – SSPropor <ArrowRight className="w-3 h-3 ml-1" />
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
                      <a href="https://www.openepi.com/PDFDocs/SampleSizeDoc.pdf" target="_blank" className="text-blue-600 hover:underline">
                        Documentation officielle OpenEpi (PDF)
                      </a>
                    </p>
                    <p>
                      Cochran W.G. – <em>Sampling Techniques</em>, 3rd ed.
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