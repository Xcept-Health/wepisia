import { useState, useEffect, useRef, useCallback } from 'react';
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
  Target
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Sample Size for a Proportion (SSPropor)
 * 
 * This component replicates OpenEpi's SSPropor module.
 * Results and preview now appear ONLY AFTER the user starts typing.
 * Initial states are empty so nothing shows on page load.
 * UI text remains in French, comments in English.
 */

export default function SampleSizeProportion() {
  // ----- State declarations -----
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [marginError, setMarginError] = useState<string>('');
  const [proportion, setProportion] = useState<string>('');
  const [populationSize, setPopulationSize] = useState<string>('');
  const [designEffect, setDesignEffect] = useState<string>('1');

  const [results, setResults] = useState<any>(null);
  const [previewN, setPreviewN] = useState<string>('-');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isJStatReady, setIsJStatReady] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ----- Dynamic loading of jStat -----
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

  // ----- Formatting helper -----
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === Infinity || num === -Infinity) return '∞';
    if (isNaN(num) || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  // ----- Preview calculation (only when user has entered values) -----
  useEffect(() => {
    const margStr = marginError.trim();
    const propStr = proportion.trim();

    // Do not show preview until user has typed something
    if (!margStr || !propStr) {
      setPreviewN('-');
      return;
    }

    const d = parseFloat(margStr) / 100;
    const p = parseFloat(propStr) / 100;
    const deff = parseFloat(designEffect) || 1;

    if (isNaN(p) || p <= 0 || p >= 1 || isNaN(d) || d <= 0 || d >= 1 || isNaN(deff) || deff <= 0) {
      setPreviewN('-');
      return;
    }

    // z-value for preview
    let z = 1.96;
    if (confidenceLevel === '80') z = 1.282;
    else if (confidenceLevel === '90') z = 1.645;
    else if (confidenceLevel === '99') z = 2.576;

    let n = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(d, 2);
    n = Math.ceil(n * deff);
    setPreviewN(n.toString());
  }, [confidenceLevel, marginError, proportion, designEffect]);

  // ----- Core calculation function -----
  const calculateSampleSize = useCallback(() => {
    const margStr = marginError.trim();
    const propStr = proportion.trim();

    // Do not calculate anything if user hasn't entered required fields
    if (!margStr || !propStr) {
      setResults(null);
      return;
    }

    const conf = parseInt(confidenceLevel);
    const alpha = 1 - conf / 100;
    const d = parseFloat(margStr) / 100;
    const p = parseFloat(propStr) / 100;
    const N = populationSize.trim() === '' ? Infinity : parseFloat(populationSize);
    const deff = parseFloat(designEffect) || 1;

    // Input validation
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

    // Critical z-value
    const z = isJStatReady && (window as any).jStat?.normal?.inv
      ? (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1)
      : confidenceLevel === '80' ? 1.282
      : confidenceLevel === '90' ? 1.645
      : confidenceLevel === '95' ? 1.96
      : 2.576;

    // Sample size without finite correction
    let n = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(d, 2);
    n = Math.ceil(n * deff);

    // With finite population correction
    let n_adj = n;
    if (isFinite(N) && N > 0 && n > 0.05 * N) {
      n_adj = Math.ceil((n * N) / (n + (N - 1)));
    }

    // Table for different margins
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

  // ----- Automatic recalculation (only when inputs change) -----
  useEffect(() => {
    calculateSampleSize();
  }, [calculateSampleSize]);

  // ----- UI handlers -----
  const clear = () => {
    setConfidenceLevel('95');
    setMarginError('');
    setProportion('');
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
    try {
      const text = `Taille d'échantillon pour une proportion\n\n` +
        `Niveau de confiance : ${results.conf}%\n` +
        `Marge d'erreur : ${results.marginError}%\n` +
        `Proportion estimée : ${results.proportion}%\n` +
        `Taille requise (avec correction) : ${results.n_adj}\n` +
        `Sans correction : ${results.n}\n` +
        `Population : ${isFinite(results.populationSize) ? results.populationSize : 'Infinie'}`;
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
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Taille d'échantillon pour une proportion", 20, 20);
      doc.setFontSize(12);
      doc.text(`Niveau de confiance : ${results.conf}%`, 20, 40);
      doc.text(`Marge d'erreur : ${results.marginError}%`, 20, 50);
      doc.text(`Proportion estimée : ${results.proportion}%`, 20, 60);
      doc.text(`Taille requise : ${results.n_adj}`, 20, 80);
      doc.text(`(sans correction : ${results.n})`, 20, 90);
      doc.save(`Taille_Echantillon_${results.n_adj}.pdf`);
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // ----- Render -----
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">Taille d'échantillon pour une proportion</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Target className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Taille d'échantillon pour une proportion
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Estimation de la taille d'échantillon nécessaire – OpenEpi SSPropor
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
                    Taille de la population (N) <span className="font-normal">(optionnel)</span>
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
                    Effet de plan (DEFF)
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
          </div>

          {/* Right column – results */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button onClick={copyResults} className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={exportPDF} className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors">
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les paramètres</p>
                    <div className="text-4xl font-bold mt-2">
                      {previewN === '-' ? '—' : previewN}
                    </div>
                    <p className="text-slate-400 text-sm mt-2">Aperçu de la taille nécessaire</p>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main result card */}
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

                    {/* Key parameters cards */}
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

                    {/* Table for different margins */}
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help modal  */}
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