import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Calculator,
  Trash2,
  Info,
  BarChart3,
  Copy,
  Download,
  X,
  HelpCircle,
  ChevronRight,
  Home,
  Edit,
  TrendingUp,
  Target,
  AlertCircle,
  BookOpen,
  Shield,
  CheckCircle,
  FileText,
  Database,
  GitCompare,
  BarChart,
  TrendingDown,
  Activity,
  DivideCircle,
  PieChart
} from 'lucide-react';

interface TTestResults {
  tValue: number;
  df: number;
  pValue: number;
  lowerCI: number;
  upperCI: number;
  alpha: number;
}

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
  const [results, setResults] = useState<TTestResults | null>(null);
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
      const children = resultsRef.current.children;
      Array.from(children).forEach((el, index) => {
        setTimeout(() => {
          el.classList.add('opacity-100', 'translate-y-0');
          el.classList.remove('opacity-0', 'translate-y-5');
        }, index * 150);
      });
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

  const copyResults = async () => {
    if (!results) return;
    const text = `Test t - Résultats:
Valeur t: ${results.tValue.toFixed(4)}
Degrés de liberté: ${results.df.toFixed(2)}
Valeur p: ${results.pValue.toFixed(6)}
Intervalle de confiance: [${results.lowerCI.toFixed(4)}, ${results.upperCI.toFixed(4)}]
Niveau de confiance: ${(100 - results.alpha * 100)}%
Interprétation: ${interpretationText}`;
    
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('copy-btn');
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = `<CheckCircle className="w-5 h-5" />`;
        setTimeout(() => {
          btn.innerHTML = original;
        }, 2000);
      }
    } catch (err) {
      console.error('Échec de la copie:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <a href="/" className="flex items-center text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                <Home className="w-4 h-4 mr-1" />
                Accueil
              </a>
            </li>
            <li>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </li>
            <li>
              <a href="/biostatistics/continuous" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                Variables continues
              </a>
            </li>
            <li>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </li>
            <li>
              <span className="text-gray-900 dark:text-gray-100 font-medium">Test t</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analyse par Test t
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comparaison de moyennes entre deux groupes (indépendants ou appariés)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Configuration Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Edit className="w-5 h-5 mr-2 text-blue-500" />
                  Configuration du test
                </h2>
              </div>
              <div className="p-6">
                <form id="t-test-form" className="space-y-6" onSubmit={calculateTTest}>
                  {/* Test Type Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setTestType('independent')}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        testType === 'independent'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <Database className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold">Échantillons indépendants</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestType('paired')}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        testType === 'paired'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <GitCompare className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold">Échantillons appariés</div>
                    </button>
                  </div>

                  {/* Independent Samples Input */}
                  {testType === 'independent' && (
                    <div className="space-y-6">
                      {/* Group 1 */}
                      <div className="bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 rounded-xl p-5 border border-blue-200 dark:border-blue-700/30">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          Groupe 1
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="mean1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Moyenne (x̄₁)
                            </label>
                            <input
                              type="number"
                              id="mean1"
                              value={mean1}
                              onChange={(e) => setMean1(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              step="any"
                              required
                              placeholder="50.0"
                            />
                          </div>
                          <div>
                            <label htmlFor="stddev1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Écart-type (s₁)
                            </label>
                            <input
                              type="number"
                              id="stddev1"
                              value={stddev1}
                              onChange={(e) => setStddev1(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0"
                              step="any"
                              required
                              placeholder="10.0"
                            />
                          </div>
                          <div>
                            <label htmlFor="n1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Taille (n₁)
                            </label>
                            <input
                              type="number"
                              id="n1"
                              value={n1}
                              onChange={(e) => setN1(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="2"
                              step="1"
                              required
                              placeholder="30"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Group 2 */}
                      <div className="bg-gradient-to-r from-purple-50/50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/10 rounded-xl p-5 border border-purple-200 dark:border-purple-700/30">
                        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-4 flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          Groupe 2
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="mean2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Moyenne (x̄₂)
                            </label>
                            <input
                              type="number"
                              id="mean2"
                              value={mean2}
                              onChange={(e) => setMean2(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              step="any"
                              required
                              placeholder="55.0"
                            />
                          </div>
                          <div>
                            <label htmlFor="stddev2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Écart-type (s₂)
                            </label>
                            <input
                              type="number"
                              id="stddev2"
                              value={stddev2}
                              onChange={(e) => setStddev2(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0"
                              step="any"
                              required
                              placeholder="12.0"
                            />
                          </div>
                          <div>
                            <label htmlFor="n2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Taille (n₂)
                            </label>
                            <input
                              type="number"
                              id="n2"
                              value={n2}
                              onChange={(e) => setN2(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="2"
                              step="1"
                              required
                              placeholder="25"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Variance Assumption */}
                      <div>
                        <label htmlFor="variance-assumption" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Hypothèse sur les variances
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setVarianceAssumption('equal')}
                            className={`p-3 rounded-lg border transition-all duration-300 ${
                              varianceAssumption === 'equal'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-green-400 dark:hover:border-green-500'
                            }`}
                          >
                            <div className="text-sm font-semibold">Variances égales</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Test t standard</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVarianceAssumption('unequal')}
                            className={`p-3 rounded-lg border transition-all duration-300 ${
                              varianceAssumption === 'unequal'
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-yellow-400 dark:hover:border-yellow-500'
                            }`}
                          >
                            <div className="text-sm font-semibold">Variances inégales</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Test t de Welch</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Paired Samples Input */}
                  {testType === 'paired' && (
                    <div className="bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-800/10 rounded-xl p-5 border border-emerald-200 dark:border-emerald-700/30">
                      <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-300 mb-4 flex items-center">
                        <GitCompare className="w-5 h-5 mr-2" />
                        Différences appariées
                      </h3>
                      <div>
                        <label htmlFor="differences" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Entrez les différences (séparées par des virgules)
                        </label>
                        <textarea
                          id="differences"
                          rows={4}
                          value={differences}
                          onChange={(e) => setDifferences(e.target.value)}
                          className="w-full px-3 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          required
                          placeholder="Exemple : 2.5, -1.2, 0.8, 3.1, -0.5, 1.7"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Entrez les différences entre les mesures appariées (mesure2 - mesure1)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Confidence Level and Hypothesis Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="confidence-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Niveau de confiance
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['90', '95', '99'].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setConfidenceLevel(level)}
                            className={`py-2 rounded-lg border transition-all duration-300 ${
                              confidenceLevel === level
                                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500'
                            }`}
                          >
                            <div className="text-sm font-semibold">{level}%</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="hypothesis-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Type d'hypothèse
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'two-tailed', label: 'Bilatéral (μ₁ ≠ μ₂)', icon: TrendingUp },
                          { value: 'greater', label: 'Unilatéral (μ₁ > μ₂)', icon: TrendingUp },
                          { value: 'less', label: 'Unilatéral (μ₁ < μ₂)', icon: TrendingDown }
                        ].map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setHypothesisType(value)}
                            className={`w-full px-3 py-2 rounded-lg border flex items-center justify-between transition-all duration-300 ${
                              hypothesisType === value
                                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-purple-400 dark:hover:border-purple-500'
                            }`}
                          >
                            <div className="text-sm font-medium">{label}</div>
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={!updateFormState()}
                      className="flex-1 min-w-[140px] inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculer
                    </button>
                    <button
                      type="button"
                      onClick={clearForm}
                      className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-[1.02] transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Effacer
                    </button>
                    <button
                      type="button"
                      onClick={loadExample}
                      className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-[1.02] transition-all duration-200"
                    >
                      <Info className="w-4 h-4 mr-2" />
                      Exemple
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Contextual Help */}
            <div className="bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 rounded-2xl p-6 border border-blue-200 dark:border-blue-700/30">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Guide d'utilisation
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Sélectionnez le type de test (indépendant ou apparié)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Pour échantillons indépendants, entrez les statistiques des deux groupes
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Pour échantillons appariés, entrez les différences entre les mesures
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Choisissez le niveau de confiance et le type d'hypothèse
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les calculs se font automatiquement lorsque les données sont valides
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart className="w-5 h-5 mr-2 text-purple-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Résultats du test t
                    </h2>
                  </div>
                  {results && (
                    <div className="flex gap-2">
                      <button
                        id="copy-btn"
                        onClick={copyResults}
                        className="p-2.5 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 hover:scale-105"
                        title="Copier les résultats"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {/* PDF export functionality */}}
                        className="p-2.5 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-md"
                        title="Exporter en PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {results ? (
                  <div ref={resultsRef} className="space-y-6">
                    {/* Main Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700 transition-all duration-500 opacity-0 translate-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              Valeur t
                            </h3>
                            <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                              Statistique de test
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {results.tValue.toFixed(4)}
                            </div>
                            <div className={`text-xs font-medium mt-1 ${
                              Math.abs(results.tValue) > 2 ? 'text-green-600' : 
                              Math.abs(results.tValue) > 1 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {Math.abs(results.tValue) > 2 ? 'Élevée' : 
                               Math.abs(results.tValue) > 1 ? 'Modérée' : 'Faible'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700 transition-all duration-500 opacity-0 translate-y-5 delay-150">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                              Degrés de liberté
                            </h3>
                            <p className="text-xs text-purple-700/80 dark:text-purple-300/80">
                              Nombre de degrés
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {results.df.toFixed(1)}
                            </div>
                            <div className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">
                              d.f.
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-700 transition-all duration-500 opacity-0 translate-y-5 delay-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                              Valeur p
                            </h3>
                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                              Signification statistique
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                              {results.pValue.toFixed(6)}
                            </div>
                            <div className={`text-xs font-medium mt-1 ${
                              results.pValue < 0.001 ? 'text-green-600' : 
                              results.pValue < 0.01 ? 'text-green-500' :
                              results.pValue < 0.05 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {results.pValue < 0.001 ? 'Très significatif' : 
                               results.pValue < 0.01 ? 'Significatif' :
                               results.pValue < 0.05 ? 'Limite' : 'Non significatif'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl p-5 border border-cyan-200 dark:border-cyan-700 transition-all duration-500 opacity-0 translate-y-5 delay-450">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
                              Niveau de confiance
                            </h3>
                            <p className="text-xs text-cyan-700/80 dark:text-cyan-300/80">
                              Fiabilité de l'estimation
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                              {(100 - results.alpha * 100)}%
                            </div>
                            <div className="text-xs text-cyan-600/80 dark:text-cyan-400/80 mt-1">
                              α = {results.alpha.toFixed(3)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Interval */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-600/50 rounded-xl p-5 border border-gray-200/50 dark:border-slate-600/50 transition-all duration-700 opacity-0 translate-y-5 delay-600">
                      <div className="flex items-center mb-3">
                        <Activity className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Intervalle de confiance de la différence
                        </h3>
                      </div>
                      <div className="text-center py-4">
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                          [{results.lowerCI.toFixed(4)}, {results.upperCI.toFixed(4)}]
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Avec {(100 - results.alpha * 100)}% de confiance, la différence réelle se situe dans cet intervalle
                        </div>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700 transition-all duration-700 opacity-0 translate-y-5 delay-750">
                      <div className="flex items-center mb-3">
                        <BookOpen className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Interprétation statistique
                        </h3>
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                        {interpretationText}
                      </p>
                      <div className={`mt-3 p-3 rounded-lg ${
                        results.pValue < results.alpha
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        <div className="flex items-center">
                          {results.pValue < results.alpha ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">Différence significative détectée</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 mr-2" />
                              <span className="text-sm font-medium">Différence non significative</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                      Configuration du test en cours
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Entrez les données pour calculer le test t
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <Shield className="w-5 h-5 mr-2 text-blue-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Test t indépendant
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Compare les moyennes de deux groupes indépendants. Vérifiez l'égalité des variances avant de choisir la méthode.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <GitCompare className="w-5 h-5 mr-2 text-purple-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Test t apparié
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pour mesures répétées sur les mêmes sujets. Teste si la moyenne des différences est significativement différente de zéro.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <DivideCircle className="w-5 h-5 mr-2 text-emerald-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    V de Cramér
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mesure l'intensité de l'association entre deux variables nominales. Variante du chi² ajustée pour la taille de l'échantillon.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <PieChart className="w-5 h-5 mr-2 text-cyan-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Interprétation des p-values
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  p &lt; 0.05 : significatif, p &lt; 0.01 : très significatif, p &lt; 0.001 : hautement significatif.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-3xl active:scale-105 group"
      >
        <HelpCircle className="w-7 h-7" />
        <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Aide & Documentation
        </span>
      </button>

      {/* Help Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/50 my-8 w-full max-w-4xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <HelpCircle className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Guide du test t
                </h3>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-8 text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[60vh]">
              <section>
                <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Types de test t
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Échantillons indépendants</h5>
                    <p className="text-sm">Compare deux groupes différents (ex: hommes vs femmes).</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                    <h5 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Échantillons appariés</h5>
                    <p className="text-sm">Compare les mêmes sujets dans deux conditions (avant/après).</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Conditions d'application
                </h4>
                <ul className="space-y-2 text-sm bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    Normalité approximative des données (ou grands échantillons)
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    Homogénéité des variances (pour test t standard)
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    Indépendance des observations
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    Variables quantitatives continues
                  </li>
                </ul>
              </section>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 p-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}