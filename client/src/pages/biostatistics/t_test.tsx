import { useState, useEffect, useRef, FormEvent } from 'react';

export default function TTestCalculator() {
  const [testType, setTestType] = useState<string>('independent');
  const [mean1, setMean1] = useState<string>('');
  const [stddev1, setStddev1] = useState<string>('');
  const [n1, setN1] = useState<string>('');
  const [mean2, setMean2] = useState<string>('');
  const [stddev2, setStddev2] = useState<string>('');
  const [n2, setN2] = useState<string>('');
  const [differences, setDifferences] = useState<string>('');
  const [varianceAssumption, setVarianceAssumption] = useState<string>('equal');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [hypothesisType, setHypothesisType] = useState<string>('two-tailed');
  const [results, setResults] = useState<{
    tValue: number;
    df: number;
    pValue: number;
    lowerCI: number;
    upperCI: number;
    alpha: number;
  } | null>(null);
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
    };
    loadScripts();
  }, []);

  const updateFormState = (): boolean => {
    let hasValidInput = false;

    if (testType === 'independent') {
      const m1 = parseFloat(mean1);
      const s1 = parseFloat(stddev1);
      const nn1 = parseInt(n1);
      const m2 = parseFloat(mean2);
      const s2 = parseFloat(stddev2);
      const nn2 = parseInt(n2);
      hasValidInput = !isNaN(m1) && !isNaN(s1) && s1 >= 0 && !isNaN(nn1) && nn1 >= 2 &&
                      !isNaN(m2) && !isNaN(s2) && s2 >= 0 && !isNaN(nn2) && nn2 >= 2;
    } else {
      const diffs = differences.split(/[,\s]+/).filter(n => n).map(Number);
      hasValidInput = diffs.length >= 2 && !diffs.some(isNaN);
    }

    return hasValidInput;
  };

  const calculateTTest = (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    if (!updateFormState()) {
      alert('Veuillez remplir tous les champs requis avec des valeurs valides');
      return;
    }

    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;

    let tValue: number, df: number, pValue: number, lowerCI: number, upperCI: number;
    let standardError: number = 0;

    if (testType === 'independent') {
      const m1 = parseFloat(mean1);
      const s1 = parseFloat(stddev1);
      const nn1 = parseInt(n1);
      const m2 = parseFloat(mean2);
      const s2 = parseFloat(stddev2);
      const nn2 = parseInt(n2);

      if (isNaN(m1) || isNaN(s1) || s1 < 0 || isNaN(nn1) || nn1 < 2 ||
          isNaN(m2) || isNaN(s2) || s2 < 0 || isNaN(nn2) || nn2 < 2) {
        alert('Veuillez entrer des valeurs numériques valides et non négatives pour les écarts-types, et des tailles d\'échantillon d\'au moins 2.');
        return;
      }

      if (varianceAssumption === 'equal') {
        const pooledVariance = ((nn1 - 1) * Math.pow(s1, 2) + (nn2 - 1) * Math.pow(s2, 2)) / (nn1 + nn2 - 2);
        standardError = Math.sqrt(pooledVariance * (1 / nn1 + 1 / nn2));
        tValue = (m1 - m2) / standardError;
        df = nn1 + nn2 - 2;
      } else {
        const se1_sq = Math.pow(s1, 2) / nn1;
        const se2_sq = Math.pow(s2, 2) / nn2;
        standardError = Math.sqrt(se1_sq + se2_sq);
        tValue = (m1 - m2) / standardError;
        df = Math.pow(se1_sq + se2_sq, 2) / (Math.pow(se1_sq, 2) / (nn1 - 1) + Math.pow(se2_sq, 2) / (nn2 - 1));
      }

      const tCritical = (window as any).jStat.studentt.inv(1 - alpha / 2, df);
      const marginOfError = tCritical * standardError;
      lowerCI = (m1 - m2) - marginOfError;
      upperCI = (m1 - m2) + marginOfError;

    } else {
      const diffs = differences.split(/[,\s]+/).filter(n => n).map(Number);

      if (diffs.length < 2 || diffs.some(isNaN)) {
        alert('Veuillez entrer au moins deux différences numériques valides.');
        return;
      }

      const n_diff = diffs.length;
      const mean_diff = (window as any).jStat.mean(diffs);
      const stddev_diff = (window as any).jStat.stdev(diffs, true);
      standardError = stddev_diff / Math.sqrt(n_diff);
      tValue = mean_diff / standardError;
      df = n_diff - 1;

      const tCritical = (window as any).jStat.studentt.inv(1 - alpha / 2, df);
      const marginOfError = tCritical * standardError;
      lowerCI = mean_diff - marginOfError;
      upperCI = mean_diff + marginOfError;
    }

    if (hypothesisType === 'two-tailed') {
      pValue = 2 * (1 - (window as any).jStat.studentt.cdf(Math.abs(tValue), df));
    } else if (hypothesisType === 'greater') {
      pValue = 1 - (window as any).jStat.studentt.cdf(tValue, df);
    } else {
      pValue = (window as any).jStat.studentt.cdf(tValue, df);
    }

    setResults({ tValue, df, pValue, lowerCI, upperCI, alpha });

    const interp = pValue < alpha ?
      `La valeur p (${pValue.toFixed(6)}) est inférieure au niveau de signification (α = ${alpha}), ce qui indique une différence statistiquement significative entre les moyennes des groupes.` :
      `La valeur p (${pValue.toFixed(6)}) est supérieure au niveau de signification (α = ${alpha}), ce qui indique qu'il n'y a pas de différence statistiquement significative entre les moyennes des groupes.`;
    setInterpretationText(interp);
  };

  // Auto calculate if valid
  useEffect(() => {
    if (updateFormState() && (window as any).jStat) {
      calculateTTest();
    }
  }, [testType, mean1, stddev1, n1, mean2, stddev2, n2, differences, varianceAssumption, confidenceLevel, hypothesisType]);

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clearForm = () => {
    setTestType('independent');
    setMean1('');
    setStddev1('');
    setN1('');
    setMean2('');
    setStddev2('');
    setN2('');
    setDifferences('');
    setVarianceAssumption('equal');
    setConfidenceLevel('95');
    setHypothesisType('two-tailed');
    setResults(null);
    setInterpretationText('');
  };

  const loadExample = () => {
    if (testType === 'independent') {
      setMean1('50');
      setStddev1('10');
      setN1('30');
      setMean2('55');
      setStddev2('12');
      setN2('25');
    } else {
      setDifferences('2.5, -1.2, 0.8, 3.1, -0.5');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto p-6 lg:p-8">
        {/* Breadcrumb */}
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <a href="/" className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors duration-200">
                Accueil
              </a>
            </li>
            <li>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <a href="/biostatistics/continuous" className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors duration-200">
                Variables continues
              </a>
            </li>
            <li>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Test t</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 17h-3M22 7h-5M5 17H2M7 7H2M5 14h14a2 2 0 002-2v0a2 2 0 00-2-2H5a2 2 0 00-2 2v0a2 2 0 002 2zM7 4h10a2 2 0 012 2v0a2 2 0 01-2 2H7a2 2 0 01-2-2v0a2 2 0 012-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Test t
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
              Comparaison de moyennes entre deux groupes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Saisie des données
                </h2>
              </div>
              <div className="p-6">
                <form id="t-test-form" className="space-y-4" onSubmit={calculateTTest}>
                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                    <div>
                      <label htmlFor="test-type" className="form-label">Type de test t</label>
                      <select
                        id="test-type"
                        value={testType}
                        onChange={(e) => setTestType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      >
                        <option value="independent">Échantillons indépendants</option>
                        <option value="paired">Échantillons appariés</option>
                      </select>
                    </div>
                    <div id="independent-samples-input" className={testType === 'independent' ? '' : 'hidden'}>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Groupe 1</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="mean1" className="form-label">Moyenne (x̄1)</label>
                          <input
                            type="number"
                            id="mean1"
                            value={mean1}
                            onChange={(e) => setMean1(e.target.value)}
                            className="form-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            step="any"
                            required
                            placeholder="Entrez la moyenne"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Moyenne du premier groupe.</p>
                        </div>
                        <div>
                          <label htmlFor="stddev1" className="form-label">Écart-type (s1)</label>
                          <input
                            type="number"
                            id="stddev1"
                            value={stddev1}
                            onChange={(e) => setStddev1(e.target.value)}
                            className="form-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            min="0"
                            step="any"
                            required
                            placeholder="Entrez l'écart-type"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Écart-type (≥0).</p>
                        </div>
                        <div>
                          <label htmlFor="n1" className="form-label">Taille de l'échantillon (n1)</label>
                          <input
                            type="number"
                            id="n1"
                            value={n1}
                            onChange={(e) => setN1(e.target.value)}
                            className="form-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            min="2"
                            step="1"
                            required
                            placeholder="Entrez la taille"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nombre d'observations (≥2).</p>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 mt-6">Groupe 2</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="mean2" className="form-label">Moyenne (x̄2)</label>
                          <input
                            type="number"
                            id="mean2"
                            value={mean2}
                            onChange={(e) => setMean2(e.target.value)}
                            className="form-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            step="any"
                            required
                            placeholder="Entrez la moyenne"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Moyenne du second groupe.</p>
                        </div>
                        <div>
                          <label htmlFor="stddev2" className="form-label">Écart-type (s2)</label>
                          <input
                            type="number"
                            id="stddev2"
                            value={stddev2}
                            onChange={(e) => setStddev2(e.target.value)}
                            className="form-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            min="0"
                            step="any"
                            required
                            placeholder="Entrez l'écart-type"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Écart-type (≥0).</p>
                        </div>
                        <div>
                          <label htmlFor="n2" className="form-label">Taille de l'échantillon (n2)</label>
                          <input
                            type="number"
                            id="n2"
                            value={n2}
                            onChange={(e) => setN2(e.target.value)}
                            className="form-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            min="2"
                            step="1"
                            required
                            placeholder="Entrez la taille"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nombre d'observations (≥2).</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label htmlFor="variance-assumption" className="form-label">Hypothèse sur les variances</label>
                        <select
                          id="variance-assumption"
                          value={varianceAssumption}
                          onChange={(e) => setVarianceAssumption(e.target.value)}
                          className="form-select w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        >
                          <option value="equal">Variances égales</option>
                          <option value="unequal">Variances inégales (Welch's t-test)</option>
                        </select>
                      </div>
                    </div>
                    <div id="paired-samples-input" className={testType === 'paired' ? '' : 'hidden'}>
                      <div>
                        <label htmlFor="differences" className="form-label">Différences (séparées par des virgules ou des espaces)</label>
                        <textarea
                          id="differences"
                          rows={6}
                          value={differences}
                          onChange={(e) => setDifferences(e.target.value)}
                          className="form-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                          required
                          placeholder="Ex: 2.5, -1.2, 0.8, 3.1, -0.5"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Entrez les différences séparées par des virgules ou des espaces.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="confidence-level" className="form-label">Niveau de confiance (%)</label>
                        <select
                          id="confidence-level"
                          value={confidenceLevel}
                          onChange={(e) => setConfidenceLevel(e.target.value)}
                          className="form-select w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        >
                          <option value="90">90%</option>
                          <option value="95">95%</option>
                          <option value="99">99%</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="hypothesis-type" className="form-label">Type d'hypothèse</label>
                        <select
                          id="hypothesis-type"
                          value={hypothesisType}
                          onChange={(e) => setHypothesisType(e.target.value)}
                          className="form-select w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        >
                          <option value="two-tailed">Bilatéral (μ1 ≠ μ2)</option>
                          <option value="greater">Unilatéral (μ1 sup μ2)</option>
                          <option value="less">Unilatéral (μ1 inf μ2)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      id="calculate-btn"
                      disabled={!updateFormState()}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary-700 hover:to-primary-800 transform hover:scale-105 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Calculer
                    </button>
                    <button
                      type="button"
                      id="clear-btn"
                      onClick={clearForm}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Effacer
                    </button>
                    <button
                      type="button"
                      id="example-btn"
                      onClick={loadExample}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg shadow hover:shadow-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transform hover:scale-105 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Exemple
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Contextual Help */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Comment utiliser cet outil
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Sélectionnez le type de test t (indépendant ou apparié).</li>
                    <li>• Pour échantillons indépendants, entrez les moyennes, écarts-types et tailles des deux groupes.</li>
                    <li>• Pour échantillons appariés, entrez les différences séparées par des virgules ou des espaces.</li>
                    <li>• Choisissez le niveau de confiance et le type d'hypothèse.</li>
                    <li>• Cliquez sur Calculer pour obtenir les résultats.</li>
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
                  <svg className="w-5 h-5 mr-2 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Résultats
                </h2>
              </div>
              <div className="p-6">
                {results ? (
                  <div ref={resultsRef} className="space-y-4 fade-in">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Valeur t</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 stat-value">{results.tValue.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Degrés de liberté</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 stat-value">{results.df.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Valeur p</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 stat-value">{results.pValue.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Intervalle de Confiance de la différence</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 stat-value">[{results.lowerCI.toFixed(4)}, {results.upperCI.toFixed(4)}]</span>
                    </div>
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                        Interprétation
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {interpretationText}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div id="no-results" className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">Entrez vos données pour voir les résultats</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Les calculs apparaîtront automatiquement</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Information Sections */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test t
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Compare les moyennes de deux groupes pour déterminer s'il existe une différence significative.
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
                Variantes
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Échantillons indépendants (variances égales ou Welch) ou appariés pour des mesures liées.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }
        
        .dark .form-label {
          color: #d1d5db;
        }
        
        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background-color: white;
          color: #111827;
          transition: all 0.2s;
        }
        
        .dark .form-input,
        .dark .form-select,
        .dark .form-textarea {
          background-color: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          ring-width: 2px;
          ring-color: #3b82f6;
          border-color: #3b82f6;
        }
        
        .stat-value {
          transition: transform 0.15s;
        }
      `}</style>
    </div>
  );
}