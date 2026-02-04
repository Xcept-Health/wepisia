import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Calculator, BarChart3, Copy, FileDown, HelpCircle, X, Trash2 } from 'lucide-react';
import { Link } from 'wouter';

export default function ANOVA() {
  const [numGroups, setNumGroups] = useState<string>('3');
  const [groupData, setGroupData] = useState<string[]>(['', '', '']);
  const [alphaLevel, setAlphaLevel] = useState<string>('0.05');
  const [results, setResults] = useState<any>(null);
  const [interpretationText, setInterpretationText] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load external scripts
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const jstatScript = document.createElement('script');
        jstatScript.src = 'https://cdn.jsdelivr.net/npm/jstat@1.9.4/dist/jstat.min.js';
        document.body.appendChild(jstatScript);
      }
      if (!(window as any).jspdf) {
        const jspdfScript = document.createElement('script');
        jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.body.appendChild(jspdfScript);

        const autotableScript = document.createElement('script');
        autotableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js';
        document.body.appendChild(autotableScript);
      }
    };
    loadScripts();
  }, []);

  useEffect(() => {
    const newNum = parseInt(numGroups);
    setGroupData(Array(newNum).fill(''));
  }, [numGroups]);

  const handleGroupDataChange = (index: number, value: string) => {
    const newData = [...groupData];
    newData[index] = value;
    setGroupData(newData);
  };

  const updateFormState = () => {
    const hasValidInput = groupData.every(data => {
      const values = data.trim().split(/[,\s]+/).filter(n => n).map(Number);
      return values.length >= 2 && !values.some(isNaN);
    });
    return hasValidInput;
  };

  const calculateANOVA = () => {
    const alpha = parseFloat(alphaLevel);
    const numG = parseInt(numGroups);
    let allData: number[] = [];
    let groupMeans: number[] = [];
    let groupSizes: number[] = [];
    let groupVariances: number[] = [];

    for (let i = 0; i < numG; i++) {
      const data = groupData[i].trim().split(/[,\s]+/).filter(n => n).map(Number);
      if (data.length < 2 || data.some(isNaN)) {
        alert(`Veuillez entrer au moins deux données numériques valides pour le groupe ${i + 1}.`);
        return;
      }
      allData = allData.concat(data);
      groupMeans.push((window as any).jStat.mean(data));
      groupSizes.push(data.length);
      groupVariances.push((window as any).jStat.variance(data, true));
    }

    const N = allData.length;
    const grandMean = (window as any).jStat.mean(allData);

    let ssb = 0;
    for (let i = 0; i < numG; i++) {
      ssb += groupSizes[i] * Math.pow(groupMeans[i] - grandMean, 2);
    }

    let ssw = 0;
    for (let i = 0; i < numG; i++) {
      ssw += groupVariances[i] * (groupSizes[i] - 1);
    }

    const dfBetween = numG - 1;
    const dfWithin = N - numG;

    const msb = ssb / dfBetween;
    const msw = ssw / dfWithin;

    const fValue = msb / msw;
    const pValue = 1 - (window as any).jStat.centralF.cdf(fValue, dfBetween, dfWithin);

    setResults({ fValue, pValue, dfBetween, dfWithin, alpha });

    const interp = pValue < alpha ?
      `La valeur p (${pValue.toFixed(6)}) est inférieure au niveau de signification (α = ${alpha}), ce qui indique qu'il existe une différence statistiquement significative entre les moyennes d'au moins deux des groupes.` :
      `La valeur p (${pValue.toFixed(6)}) est supérieure au niveau de signification (α = ${alpha}), ce qui indique qu'il n'y a pas de différence statistiquement significative entre les moyennes des groupes.`;
    setInterpretationText(interp);
  };

  // Auto calculate if valid
  useEffect(() => {
    if (updateFormState()) {
      calculateANOVA();
    }
  }, [numGroups, groupData, alphaLevel]);

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clearForm = () => {
    setNumGroups('3');
    setGroupData(['', '', '']);
    setAlphaLevel('0.05');
    setResults(null);
  };

  const loadExample = () => {
    const numG = parseInt(numGroups);
    const exampleData = [
      '10, 12, 15, 18, 20',
      '8, 9, 11, 14, 16',
      '12, 14, 17, 19, 21',
      '9, 10, 13, 15, 17',
      '11, 13, 16, 18, 20'
    ].slice(0, numG);
    setGroupData(exampleData);
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `ANOVA Results\n` +
                 `F-value: ${results.fValue.toFixed(4)}\n` +
                 `Degrees of freedom (between): ${results.dfBetween}\n` +
                 `Degrees of freedom (within): ${results.dfWithIn}\n` +
                 `p-value: ${results.pValue.toFixed(6)}\n` +
                 `\nInterpretation:\n${interpretationText}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      alert('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      alert('Veuillez d\'abord effectuer un calcul');
      return;
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    const primaryColor = [59, 130, 246];
    const secondaryColor = [99, 102, 241];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Analyse de la Variance (ANOVA)', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Comparison of Means', 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Results', 20, 55);
    doc.setFontSize(12);
    doc.text(`F-value: ${results.fValue.toFixed(4)}`, 20, 65);
    doc.text(`Degrees of freedom (between): ${results.dfBetween}`, 20, 75);
    doc.text(`Degrees of freedom (within): ${results.dfWithin}`, 20, 85);
    doc.text(`p-value: ${results.pValue.toFixed(6)}`, 20, 95);

    doc.setFontSize(16);
    doc.text('Interpretation', 20, 115);
    const splitInterp = doc.splitTextToSize(interpretationText, 170);
    doc.text(splitInterp, 20, 125);

    doc.save('anova_results.pdf');
  };

  return (
    <>
      <style jsx>{`
        #results-container > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #results-container > div.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          {/* Breadcrumb */}
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href="/" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <Link href="/biostatistics/continuous" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  Variables continues
                </Link>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">ANOVA</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analyse de la Variance (ANOVA)
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                Comparez les moyennes entre trois groupes ou plus pour détecter des différences significatives.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Saisie des données
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3 bg-white dark:bg-slate-800 transition-colors">
                      <div>
                        <label htmlFor="num-groups" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de groupes</label>
                        <select
                          id="num-groups"
                          value={numGroups}
                          onChange={(e) => setNumGroups(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      </div>
                      <div id="groups-data-input" className="space-y-4">
                        {groupData.map((data, index) => (
                          <div key={index}>
                            <label htmlFor={`group-${index + 1}-data`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Groupe {index + 1} (séparé par des virgules ou espaces)</label>
                            <textarea
                              id={`group-${index + 1}-data`}
                              rows={4}
                              value={data}
                              onChange={(e) => handleGroupDataChange(index, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="Ex: 10, 12, 15, 18, 20"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label htmlFor="alpha-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niveau de signification (α)</label>
                        <select
                          id="alpha-level"
                          value={alphaLevel}
                          onChange={(e) => setAlphaLevel(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="0.10">0.10 (10%)</option>
                          <option value="0.05">0.05 (5%)</option>
                          <option value="0.01">0.01 (1%)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={calculateANOVA}
                        disabled={!updateFormState()}
                        className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                      >
                        <Calculator className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Calculer
                      </button>
                      <button
                        onClick={clearForm}
                        className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Effacer
                      </button>
                      <button
                        onClick={loadExample}
                        className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200"
                      >
                        <HelpCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Exemple
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contextual Help */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Comment utiliser cet outil
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Sélectionnez le nombre de groupes (3 à 5).</li>
                      <li>• Entrez les données de chaque groupe, séparées par des virgules ou des espaces.</li>
                      <li>• Choisissez un niveau de signification (α).</li>
                      <li>• Cliquez sur Calculer pour obtenir les résultats de l'ANOVA.</li>
                      <li>• Utilisez le bouton Exemple pour remplir avec des données de test.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
                    Résultats
                  </h2>
                </div>
                <div className="p-6">
                  <div id="results-container">
                    {results ? (
                      <div ref={resultsRef} className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Valeur F</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{results.fValue.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Valeur p</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{results.pValue.toFixed(6)}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Degrés de liberté (entre groupes)</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{results.dfBetween}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Degrés de liberté (dans les groupes)</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{results.dfWithin}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Entrez vos données pour voir les résultats</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Les calculs apparaîtront automatiquement</p>
                      </div>
                    )}
                    {results && (
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                          Interprétation
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {interpretationText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Information Sections */}
              <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      ANOVA à un facteur
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Compare les moyennes de plusieurs groupes pour déterminer s'il existe des différences significatives, en analysant la variance entre et à l'intérieur des groupes.
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Valeur F et p
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    La valeur F mesure le rapport entre la variance inter-groupes et intra-groupes. Une valeur p faible indique une différence significative entre les moyennes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          >
            <HelpCircle className="w-7 h-7" strokeWidth={1.5} />
          </button>

          {/* Help Modal - Placeholder */}
          {showHelpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 overflow-y-auto">
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 my-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aide complète & Ressources</h3>
                  <button onClick={() => setShowHelpModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <X className="w-7 h-7" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300">
                  {/* Add modal content if needed */}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}