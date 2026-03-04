import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw,
  ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat'; 

/**
 * Sample Size for Comparing Two Means (SSMeanDiff)
 *
 * This component replicates the functionality of OpenEpi's SSMean module for
 * calculating the required sample size to detect a difference between two
 * independent group means. The user provides the expected means and standard
 * deviations for both groups, the desired confidence level (two‑sided),
 * statistical power, and the allocation ratio (group2 / group1).
 *
 * The calculation uses the standard formula based on the normal distribution,
 * with exact quantiles obtained from the jStat library. The result gives the
 * minimum number of subjects needed in each group and the total, rounded up
 * to ensure the specified power.
 *
 * All calculations are automatic: any change to the input fields triggers
 * a recalculation.
 */

interface SampleSizeResults {
  mean1: number;
  mean2: number;
  sd1: number;
  sd2: number;
  difference: number;
  pooledVariance: number;
  confidenceLevel: number;
  power: number;
  ratio: number;
  n1: number;
  n2: number;
  totalN: number;
}

export default function SampleSizeMeanDifference() {
  const [mean1, setMean1] = useState<string>('');
  const [mean2, setMean2] = useState<string>('');
  const [sd1, setSd1] = useState<string>('');
  const [sd2, setSd2] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [power, setPower] = useState<string>('80');
  const [ratio, setRatio] = useState<string>('1');
  const [results, setResults] = useState<SampleSizeResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    calculate();
  }, [mean1, mean2, sd1, sd2, confidenceLevel, power, ratio]);

  const calculate = () => {
    const m1 = parseFloat(mean1);
    const m2 = parseFloat(mean2);
    const s1 = parseFloat(sd1);
    const s2 = parseFloat(sd2);
    const conf = parseInt(confidenceLevel);
    const pow = parseInt(power) / 100;
    const rat = parseFloat(ratio) || 1;

    if (isNaN(m1) || isNaN(m2) || isNaN(s1) || isNaN(s2) || s1 <= 0 || s2 <= 0 || rat <= 0) {
      setResults(null);
      return;
    }

    const diff = Math.abs(m1 - m2);
    const alpha = 1 - conf / 100;
    const beta = 1 - pow;

    // Quantiles exacts de la loi normale via jStat
    const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
    const zBeta = jStat.normal.inv(1 - beta, 0, 1);

    // Variance poolée (pour information)
    const pooledVar = (s1 ** 2 + s2 ** 2 * rat) / (1 + rat);

    // Taille d'échantillon pour le groupe 2 (formule standard)
    let n2 = ((zAlpha + zBeta) ** 2 * (s1 ** 2 / rat + s2 ** 2)) / diff ** 2;

    // Arrondi à l'entier supérieur pour garantir la puissance
    n2 = Math.ceil(n2);
    const n1 = Math.ceil(n2 * rat);
    const totalN = n1 + n2;

    setResults({
      mean1: m1,
      mean2: m2,
      sd1: s1,
      sd2: s2,
      difference: diff,
      pooledVariance: pooledVar,
      confidenceLevel: conf,
      power: pow * 100,
      ratio: rat,
      n1,
      n2,
      totalN
    });
  };

  const clearForm = () => {
    setMean1(''); setMean2(''); setSd1(''); setSd2('');
    setConfidenceLevel('95'); setPower('80'); setRatio('1');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setMean1('132.86'); setMean2('127.44');
    setSd1('15.34'); setSd2('18.23');
    setConfidenceLevel('95'); setPower('80'); setRatio('1');
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Taille d’échantillon pour comparaison de deux moyennes\n\n` +
                 `Groupe 1 → Moyenne: ${results.mean1} | Écart-type: ${results.sd1}\n` +
                 `Groupe 2 → Moyenne: ${results.mean2} | Écart-type: ${results.sd2}\n` +
                 `Différence: ${results.difference.toFixed(2)}\n` +
                 `IC: ${results.confidenceLevel}% | Puissance: ${results.power}%\n` +
                 `Ratio: ${results.ratio}\n\n` +
                 `Taille échantillon Groupe 1: ${results.n1}\n` +
                 `Taille échantillon Groupe 2: ${results.n2}\n` +
                 `Taille totale: ${results.totalN}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) return;
    toast.info('Export PDF bientôt disponible');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Taille d’Échantillon - Différence de Moyennes</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Taille d’Échantillon - Différence de Moyennes</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Calcul de la taille d’échantillon requise pour détecter une différence entre deux moyennes.</p>
            </div>
          </div>
          <button onClick={() => setShowHelpModal(true)} className="hidden md:flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left column - inputs */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                {/* Means */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Moyenne Groupe 1</label>
                    <input type="number" value={mean1} onChange={(e) => setMean1(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium" placeholder="Ex: 132.86" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Moyenne Groupe 2</label>
                    <input type="number" value={mean2} onChange={(e) => setMean2(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium" placeholder="Ex: 127.44" />
                  </div>
                </div>
                {/* Standard deviations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Écart-type Groupe 1</label>
                    <input type="number" value={sd1} onChange={(e) => setSd1(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium" placeholder="Ex: 15.34" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Écart-type Groupe 2</label>
                    <input type="number" value={sd2} onChange={(e) => setSd2(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium" placeholder="Ex: 18.23" />
                  </div>
                </div>
                {/* Confidence, power, ratio */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">IC bilatéral</label>
                    <select value={confidenceLevel} onChange={(e) => setConfidenceLevel(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium">
                      <option value="90">90%</option>
                      <option value="95">95%</option>
                      <option value="99">99%</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Puissance</label>
                    <select value={power} onChange={(e) => setPower(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium">
                      <option value="80">80%</option>
                      <option value="90">90%</option>
                      <option value="95">95%</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Ratio (G2/G1)</label>
                    <input type="number" value={ratio} onChange={(e) => setRatio(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium" placeholder="1" />
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button onClick={loadExample} className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Info className="w-4 h-4" /> Exemple
                </button>
                <button onClick={clearForm} className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl flex items-center justify-center">
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
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                    <div className="text-4xl font-bold mt-2">
                      0.00
                    </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Total sample size card */}
                    <div className="p-8 rounded-3xl text-center border bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/30">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Taille totale de l’échantillon</p>
                      <div className="text-5xl font-bold tracking-tight mb-2 text-indigo-600">{results.totalN}</div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        Groupe 1: {results.n1} | Groupe 2: {results.n2}
                      </span>
                    </div>

                    {/* Difference and pooled SD cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700">
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Différence</h3>
                        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{results.difference.toFixed(2)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
                        <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">Écart-type poolé</h3>
                        <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{Math.sqrt(results.pooledVariance).toFixed(2)}</div>
                      </div>
                    </div>

                    {/* Detailed table */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Paramètre</th>
                              <th className="px-3 py-2 text-center font-semibold">Valeur</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr><td>Groupe 1 - Taille</td><td className="text-center font-mono">{results.n1}</td></tr>
                            <tr><td>Groupe 2 - Taille</td><td className="text-center font-mono">{results.n2}</td></tr>
                            <tr><td>Taille totale</td><td className="text-center font-mono">{results.totalN}</td></tr>
                            <tr><td>Différence</td><td className="text-center font-mono">{results.difference.toFixed(2)}</td></tr>
                            <tr><td>Écart-type poolé</td><td className="text-center font-mono">{Math.sqrt(results.pooledVariance).toFixed(2)}</td></tr>
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
                  Guide – Taille d’échantillon pour deux moyennes
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
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">1</div>
                    Principe
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Ce calculateur estime le nombre de sujets nécessaires dans chaque groupe pour détecter une différence donnée entre deux moyennes, avec un niveau de confiance et une puissance statistique spécifiés. Il s’applique aux études comparant deux groupes indépendants (par exemple, un groupe traité vs un groupe témoin).
                  </p>
                </section>

                {/* Section 2 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">2</div>
                    Paramètres
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong className="text-slate-900 dark:text-white">Moyennes des deux groupes</strong> – valeurs attendues de la variable quantitative.</li>
                    <li><strong className="text-slate-900 dark:text-white">Écarts-types</strong> – mesures de la dispersion dans chaque groupe (doivent être positifs).</li>
                    <li><strong className="text-slate-900 dark:text-white">IC bilatéral</strong> – niveau de confiance (1‑α) pour l’intervalle entourant la différence estimée.</li>
                    <li><strong className="text-slate-900 dark:text-white">Puissance</strong> – probabilité (1‑β) de rejeter l’hypothèse nulle si la différence est réelle.</li>
                    <li><strong className="text-slate-900 dark:text-white">Ratio</strong> – nombre de sujets dans le groupe 2 pour un sujet dans le groupe 1 (par défaut 1, soit groupes de taille égale).</li>
                  </ul>
                </section>

                {/* Section 3 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">3</div>
                    Méthode de calcul
                  </h4>
                  <p className="text-sm leading-relaxed">
                    La taille d’échantillon est calculée avec la formule classique pour deux groupes indépendants, en utilisant les quantiles exacts de la loi normale obtenus via la librairie <strong>jStat</strong>. Pour référence, les valeurs approximatives couramment utilisées sont :
                  </p>
                  <ul className="list-disc list-inside text-sm mt-2">
                    <li>z<sub>α/2</sub> : 1,645 (90% IC), 1,96 (95% IC), 2,576 (99% IC)</li>
                    <li>z<sub>β</sub> : 0,8416 (80% puissance), 1,2816 (90%), 1,6449 (95%)</li>
                  </ul>
                  <p className="text-sm mt-2">
                    La taille pour le groupe 2 est donnée par :<br />
                    <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                      n₂ = ⌈(z<sub>α/2</sub> + z<sub>β</sub>)² × (σ₁² / r + σ₂²) / Δ²⌉
                    </code><br />
                    où <em>Δ</em> = |m₁ – m₂|, <em>r</em> est le ratio (n₂ / n₁), et <em>σ₁, σ₂</em> les écarts-types. La taille du groupe 1 est <em>n₁ = ⌈r × n₂⌉</em>. L’arrondi est toujours fait à l’entier supérieur pour garantir la puissance nominale.
                  </p>
                </section>

                {/* Section 4 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">4</div>
                    Interprétation des résultats
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Les nombres affichés sont les effectifs minimums arrondis à l’entier supérieur. Si la différence réelle est plus petite que celle anticipée, ou si les variances sont plus grandes, l’étude pourrait manquer de puissance. Il est conseillé d’ajouter un taux d’attrition (pertes de suivi) dans la planification finale.
                  </p>
                </section>

                {/* Section 5 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">5</div>
                    Exemple
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Avec les valeurs par défaut (m₁ = 132,86, m₂ = 127,44, σ₁ = 15,34, σ₂ = 18,23, IC 95%, puissance 80%, ratio = 1), la différence est de 5,42 et l’écart‑type poolé d’environ 16,83. Le calculateur donne n₁ = n₂ = <strong>152</strong>, soit un total de <strong>304</strong> sujets (arrondi supérieur). La valeur exacte avant arrondi est 151,68. OpenEpi affiche parfois 151 car il n’applique pas l’arrondi supérieur, mais pour garantir la puissance, l’arrondi à l’entier supérieur est recommandé.
                  </p>
                </section>

                {/* Section 6 */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">6</div>
                    Source
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Cet outil reproduit le module « Sample Size for Two Means » d’
                    <a
                      href="https://www.openepi.com/SampleSize/SSMean.htm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 underline font-medium ml-1"
                    >OpenEpi</a>.
                  </p>
                  <a
                    href="https://www.openepi.com/SampleSize/SSMean.htm"
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