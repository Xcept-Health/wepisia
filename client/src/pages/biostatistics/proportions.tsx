import { useState, useEffect, useRef } from 'react';

import {
  Calculator as CalculatorIcon,
  X,
  HelpCircle,
  Copy,
  FileDown,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { Link } from 'wouter';

// Dépendances nécessaires :
// npm install jstat jspdf jspdf-autotable


declare const jstat: any;

export default function ProportionsCalculator() {
  const [numerator, setNumerator] = useState<string>('');
  const [denominator, setDenominator] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');

  const [calculatedProportion, setCalculatedProportion] = useState<string>('-');
  const [calculatedPercentage, setCalculatedPercentage] = useState<string>('-');

  const [resultsHtml, setResultsHtml] = useState<string>('');

  const [showExportButtons, setShowExportButtons] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    const n = parseInt(numerator) || 0;
    const d = parseInt(denominator) || 0;

    if (d > 0) {
      const prop = n / d;
      setCalculatedProportion(prop.toFixed(4));
      setCalculatedPercentage(`${(prop * 100).toFixed(2)}%`);
    } else {
      setCalculatedProportion('-');
      setCalculatedPercentage('-');
    }
  }, [numerator, denominator]);

  // Validation + calcul automatique
  useEffect(() => {
    const n = parseInt(numerator);
    const d = parseInt(denominator);

    const isValid = !isNaN(n) && !isNaN(d) && n >= 0 && d > 0 && n <= d;

    if (isValid) {
      calculate();
      setShowExportButtons(true);
    } else {
      setResultsHtml('');
      setShowExportButtons(false);
    }
  }, [numerator, denominator, confidenceLevel]);

  const calculate = () => {
    const num = parseInt(numerator);
    const den = parseInt(denominator);
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;

    const proportion = num / den;
    const standardError = Math.sqrt((proportion * (1 - proportion)) / den);

    const wilsonCI   = calculateWilsonCI(num, den, alpha);
    const exactCI    = calculateExactCI(num, den, alpha);
    const normalCI   = calculateNormalCI(proportion, standardError, alpha);
    const agrestiCI  = calculateAgrestiCoullCI(num, den, alpha);

    const content = `
      <div class="space-y-6">
        <div class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Résumé</h3>
          <p class="text-blue-800 dark:text-blue-200">
            Sur <strong>${den}</strong> observations, <strong>${num}</strong> événements ont été observés, 
            soit une proportion de <strong>${(proportion * 100).toFixed(2)}%</strong>.
          </p>
          <p class="text-sm text-blue-700 dark:text-blue-300 mt-2">
            Erreur standard : ${standardError.toFixed(4)}
          </p>
        </div>

        <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
          <table class="min-w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
              <tr>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Méthode</th>
                <th class="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Proportion</th>
                <th class="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">IC ${conf}%</th>
                <th class="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">IC ${conf}% (×100)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-slate-600">
              <tr class="bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
                <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Wilson (recommandé)
                  </div>
                </td>
                <td class="px-6 py-4 text-center">${proportion.toFixed(4)}</td>
                <td class="px-6 py-4 text-center">[${wilsonCI.lower.toFixed(4)}, ${wilsonCI.upper.toFixed(4)}]</td>
                <td class="px-6 py-4 text-center">[${(wilsonCI.lower * 100).toFixed(2)}%, ${(wilsonCI.upper * 100).toFixed(2)}%]</td>
              </tr>
              <tr class="bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">Exact (Clopper-Pearson)</td>
                <td class="px-6 py-4 text-center">${proportion.toFixed(4)}</td>
                <td class="px-6 py-4 text-center">[${exactCI.lower.toFixed(4)}, ${exactCI.upper.toFixed(4)}]</td>
                <td class="px-6 py-4 text-center">[${(exactCI.lower * 100).toFixed(2)}%, ${(exactCI.upper * 100).toFixed(2)}%]</td>
              </tr>
              <tr class="bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors">
                <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">Normal (Wald)</td>
                <td class="px-6 py-4 text-center">${proportion.toFixed(4)}</td>
                <td class="px-6 py-4 text-center">[${normalCI.lower.toFixed(4)}, ${normalCI.upper.toFixed(4)}]</td>
                <td class="px-6 py-4 text-center">[${(normalCI.lower * 100).toFixed(2)}%, ${(normalCI.upper * 100).toFixed(2)}%]</td>
              </tr>
              <tr class="bg-indigo-50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors">
                <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">Agresti-Coull</td>
                <td class="px-6 py-4 text-center">${proportion.toFixed(4)}</td>
                <td class="px-6 py-4 text-center">[${agrestiCI.lower.toFixed(4)}, ${agrestiCI.upper.toFixed(4)}]</td>
                <td class="px-6 py-4 text-center">[${(agrestiCI.lower * 100).toFixed(2)}%, ${(agrestiCI.upper * 100).toFixed(2)}%]</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    setResultsHtml(content);
  };

  // ────────────────────────────────────────────────
  // Fonctions de calcul (inchangées par rapport à ton code)
  // ────────────────────────────────────────────────

  function getZValue(alpha: number) {
    const p = 1 - alpha;
    if (p <= 0 || p >= 1) return NaN;

    let x = p > 0.5 ? 1 - p : p;
    const t = Math.sqrt(-2 * Math.log(x));

    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;

    let z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);

    return p > 0.5 ? z : -z;
  }

  function calculateWilsonCI(x: number, n: number, alpha: number) {
    const z = getZValue(alpha / 2);
    const p = x / n;
    const z2 = z * z;

    const center = (p + z2 / (2 * n)) / (1 + z2 / n);
    const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / (1 + z2 / n);

    return { lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
  }

  function calculateExactCI(x: number, n: number, alpha: number) {
    const a = alpha / 2;

    if (x === 0) return { lower: 0, upper: 1 - Math.pow(a, 1 / n) };
    if (x === n) return { lower: Math.pow(a, 1 / n), upper: 1 };

    const lower = jstat.beta.inv(a, x, n - x + 1);
    const upper = jstat.beta.inv(1 - a, x + 1, n - x);

    return { lower: isNaN(lower) ? 0 : lower, upper: isNaN(upper) ? 1 : upper };
  }

  function calculateNormalCI(p: number, se: number, alpha: number) {
    const z = getZValue(alpha / 2);
    const margin = z * se;
    return { lower: Math.max(0, p - margin), upper: Math.min(1, p + margin) };
  }

  function calculateAgrestiCoullCI(x: number, n: number, alpha: number) {
    const z = getZValue(alpha / 2);
    const z2 = z * z;
    const nTilde = n + z2;
    const xTilde = x + z2 / 2;
    const pTilde = xTilde / nTilde;
    const margin = z * Math.sqrt(pTilde * (1 - pTilde) / nTilde);

    return { lower: Math.max(0, pTilde - margin), upper: Math.min(1, pTilde + margin) };
  }

  // ────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────

  const clearAll = () => {
    setNumerator('');
    setDenominator('');
    setConfidenceLevel('95');
    setResultsHtml('');
    setShowExportButtons(false);
  };

  const loadExample = () => {
    setNumerator('45');
    setDenominator('200');
    setConfidenceLevel('95');
  };

  const copyResults = async () => {
    if (!resultsRef.current) return;
    try {
      await navigator.clipboard.writeText(resultsRef.current.innerText);
    } catch (err) {
      console.error('Échec de la copie', err);
    }
  };

  const exportToPDF = () => {
    if (!numerator || !denominator) {
      alert("Veuillez d'abord effectuer un calcul");
      return;
    }

    const { jsPDF } = window.jspdf as any;
    const doc = new jsPDF();

    const primaryColor = [59, 130, 246];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Résultats du Calcul de Proportion', 105, 25, { align: 'center' });

    // Tu peux compléter ici toute la logique PDF que tu avais dans le code original

    doc.save(`proportion_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <>
      {/* Animation CSS identique à ton original */}
      <style jsx global>{`
        #proportion-results > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #proportion-results > div.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Header + breadcrumb – fidèle à l’original */}
        <div className="mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href="/" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">Calcul de Proportion</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="M12 9v11" />
                <path d="M2 9h13a2 2 0 0 1 2 2v9" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calcul de Proportion</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Intervalles de confiance avec méthodes Wilson, Exacte, Normale et Agresti-Coull
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Panneau de saisie */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Saisie des données
                </h2>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Numérateur (nombre d'événements)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={numerator}
                        onChange={(e) => setNumerator(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Entrez le numérateur"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dénominateur (taille de l'échantillon)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={denominator}
                        onChange={(e) => setDenominator(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Entrez le dénominateur"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Niveau de confiance
                    </label>
                    <select
                      value={confidenceLevel}
                      onChange={(e) => setConfidenceLevel(e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="90">90%</option>
                      <option value="95" selected>95%</option>
                      <option value="99">99%</option>
                    </select>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Proportion calculée :</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{calculatedProportion}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{calculatedPercentage}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  <button
                    type="button"
                    disabled={calculatedProportion === '-'}
                    onClick={calculate}
                    className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Calculer
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Effacer
                  </button>

                  <button
                    type="button"
                    onClick={loadExample}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Exemple
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panneau résultats */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Résultats
                </h2>

                {showExportButtons && (
                  <div className="flex gap-4">
                    <button
                      onClick={copyResults}
                      className="p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FileDown className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div id="proportion-results" ref={resultsRef}>
                  {resultsHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: resultsHtml }} />
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        Saisissez vos données pour voir les résultats
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                        Les intervalles de confiance apparaîtront automatiquement
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton aide flottant */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 8.5C8.228 7.119 9.343 6 10.728 6s2.5 1.119 2.5 2.5c0 1.381-1.115 2.5-2.5 2.5v2M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Modal d’aide – tu peux copier le contenu exact de ton modal ici */}
        {showHelpModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 overflow-y-auto"
            onClick={() => setShowHelpModal(false)}
          >
            <div
              className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/50 my-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Contenu du modal */}
              <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aide complète & Ressources</h3>
                <button onClick={() => setShowHelpModal(false)}>
                  <X className="w-7 h-7" />
                </button>
              </div>

              {/* contenu du modal d’aide */}
              <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300">
                {/* ...  contenu ... */}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}