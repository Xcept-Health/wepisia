import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Calculator, 
  Trash2, 
  HelpCircle, 
  BarChart3, 
  Copy, 
  Download, 
  X, 
  ChevronRight,
  Home,
  Edit,
  Check,
  AlertTriangle,
  Info,
  BookOpen,
  ExternalLink,
  PlayCircle,
  FileText,
  Shield,
  TrendingUp,
  Percent,
  Users,
  Target
} from 'lucide-react';
import { Link } from 'wouter';

interface ConfidenceInterval {
  lower: number;
  upper: number;
}

interface CalculationResults {
  numerator: number;
  denominator: number;
  proportion: number;
  confidenceLevel: number;
  standardError: number;
  wilsonCI: ConfidenceInterval;
  exactCI: ConfidenceInterval;
  normalCI: ConfidenceInterval;
  agrestiCoullCI: ConfidenceInterval;
}

export default function Proportion() {
  const [numerator, setNumerator] = useState<string>('');
  const [denominator, setDenominator] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load external scripts
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const jstatScript = document.createElement('script');
        jstatScript.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
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

  const validateInputs = (): boolean => {
    const num = parseInt(numerator);
    const den = parseInt(denominator);
    
    return !isNaN(num) && !isNaN(den) && 
           num >= 0 && den > 0 && num <= den;
  };

  const calculateProportion = (): number => {
    const num = parseInt(numerator);
    const den = parseInt(denominator);
    return den > 0 ? num / den : 0;
  };

  const getZValue = (alpha: number): number => {
    const p = 1 - alpha;
    if (p <= 0 || p >= 1) return NaN;
    
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;

    let x = p;
    if (p > 0.5) x = 1 - p;

    const t = Math.sqrt(-2 * Math.log(x));
    const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);

    return p > 0.5 ? z : -z;
  };

  const calculateWilsonCI = (x: number, n: number, alpha: number): ConfidenceInterval => {
    const z = getZValue(alpha / 2);
    const p = x / n;
    const z2 = z * z;
    
    const center = (p + z2 / (2 * n)) / (1 + z2 / n);
    const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / (1 + z2 / n);
    
    return {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin)
    };
  };

  const calculateExactCI = (x: number, n: number, alpha: number): ConfidenceInterval => {
    const alphaHalf = alpha / 2;
    
    if (x === 0) {
      return { lower: 0, upper: 1 - Math.pow(alphaHalf, 1 / n) };
    }
    if (x === n) {
      return { lower: Math.pow(alphaHalf, 1 / n), upper: 1 };
    }

    const lower = (window as any).jStat.beta.inv(alphaHalf, x, n - x + 1);
    const upper = (window as any).jStat.beta.inv(1 - alphaHalf, x + 1, n - x);
    
    return {
      lower: isNaN(lower) ? 0 : lower,
      upper: isNaN(upper) ? 1 : upper
    };
  };

  const calculateNormalCI = (p: number, se: number, alpha: number): ConfidenceInterval => {
    const z = getZValue(alpha / 2);
    const margin = z * se;
    
    return {
      lower: Math.max(0, p - margin),
      upper: Math.min(1, p + margin)
    };
  };

  const calculateAgrestiCoullCI = (x: number, n: number, alpha: number): ConfidenceInterval => {
    const z = getZValue(alpha / 2);
    const z2 = z * z;
    const nTilde = n + z2;
    const xTilde = x + z2 / 2;
    const pTilde = xTilde / nTilde;
    const margin = z * Math.sqrt(pTilde * (1 - pTilde) / nTilde);
    
    return {
      lower: Math.max(0, pTilde - margin),
      upper: Math.min(1, pTilde + margin)
    };
  };

  const calculate = (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    if (!validateInputs()) {
      alert('Veuillez entrer des valeurs valides. Le numérateur doit être ≤ dénominateur, et le dénominateur > 0.');
      return;
    }

    const num = parseInt(numerator);
    const den = parseInt(denominator);
    const confLevel = parseInt(confidenceLevel);
    const alpha = (100 - confLevel) / 100;

    const proportion = num / den;
    const standardError = Math.sqrt((proportion * (1 - proportion)) / den);

    const wilsonCI = calculateWilsonCI(num, den, alpha);
    const exactCI = calculateExactCI(num, den, alpha);
    const normalCI = calculateNormalCI(proportion, standardError, alpha);
    const agrestiCoullCI = calculateAgrestiCoullCI(num, den, alpha);

    setResults({
      numerator: num,
      denominator: den,
      proportion,
      confidenceLevel: confLevel,
      standardError,
      wilsonCI,
      exactCI,
      normalCI,
      agrestiCoullCI
    });
  };

  // Auto calculate if valid
  useEffect(() => {
    if (validateInputs() && (window as any).jStat) {
      calculate();
    }
  }, [numerator, denominator, confidenceLevel]);

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clearForm = () => {
    setNumerator('');
    setDenominator('');
    setConfidenceLevel('95');
    setResults(null);
  };

  const loadExample = () => {
    setNumerator('45');
    setDenominator('200');
    setConfidenceLevel('95');
  };

  const copyResults = async () => {
    if (!results) return;
    
    const text = `Résultats du Calcul de Proportion\n` +
                 `Numérateur: ${results.numerator}\n` +
                 `Dénominateur: ${results.denominator}\n` +
                 `Proportion: ${results.proportion.toFixed(4)} (${(results.proportion * 100).toFixed(2)}%)\n` +
                 `Niveau de confiance: ${results.confidenceLevel}%\n` +
                 `Erreur standard: ${results.standardError.toFixed(4)}\n\n` +
                 `Intervalles de confiance:\n` +
                 `Wilson: [${results.wilsonCI.lower.toFixed(4)}, ${results.wilsonCI.upper.toFixed(4)}]\n` +
                 `Exact (Clopper-Pearson): [${results.exactCI.lower.toFixed(4)}, ${results.exactCI.upper.toFixed(4)}]\n` +
                 `Normal (Wald): [${results.normalCI.lower.toFixed(4)}, ${results.normalCI.upper.toFixed(4)}]\n` +
                 `Agresti-Coull: [${results.agrestiCoullCI.lower.toFixed(4)}, ${results.agrestiCoullCI.upper.toFixed(4)}]`;
    
    try {
      await navigator.clipboard.writeText(text);
      alert('Résultats copiés dans le presse-papier !');
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
    
    // En-tête
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Résultats du Calcul de Proportion', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Intervalle de confiance - Outil statistique', 105, 30, { align: 'center' });
    
    // Informations principales
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Données de l\'échantillon', 20, 55);
    
    doc.setFontSize(12);
    const dataYStart = 65;
    doc.text(`Numérateur (événements) : ${results.numerator}`, 20, dataYStart);
    doc.text(`Dénominateur (taille échantillon) : ${results.denominator}`, 20, dataYStart + 8);
    doc.text(`Proportion : ${results.proportion.toFixed(4)}`, 20, dataYStart + 16);
    doc.text(`Pourcentage : ${(results.proportion * 100).toFixed(2)}%`, 20, dataYStart + 24);
    doc.text(`Niveau de confiance : ${results.confidenceLevel}%`, 20, dataYStart + 32);
    doc.text(`Erreur standard : ${results.standardError.toFixed(4)}`, 20, dataYStart + 40);
    
    // Tableau des résultats
    doc.setFontSize(16);
    doc.text('Intervalles de confiance calculés', 20, 115);
    
    const tableData = [
      [
        'Wilson (recommandé)',
        results.proportion.toFixed(4),
        `[${results.wilsonCI.lower.toFixed(4)}, ${results.wilsonCI.upper.toFixed(4)}]`,
        `[${(results.wilsonCI.lower * 100).toFixed(2)}%, ${(results.wilsonCI.upper * 100).toFixed(2)}%]`
      ],
      [
        'Exact (Clopper-Pearson)',
        results.proportion.toFixed(4),
        `[${results.exactCI.lower.toFixed(4)}, ${results.exactCI.upper.toFixed(4)}]`,
        `[${(results.exactCI.lower * 100).toFixed(2)}%, ${(results.exactCI.upper * 100).toFixed(2)}%]`
      ],
      [
        'Normal (Wald)',
        results.proportion.toFixed(4),
        `[${results.normalCI.lower.toFixed(4)}, ${results.normalCI.upper.toFixed(4)}]`,
        `[${(results.normalCI.lower * 100).toFixed(2)}%, ${(results.normalCI.upper * 100).toFixed(2)}%]`
      ],
      [
        'Agresti-Coull',
        results.proportion.toFixed(4),
        `[${results.agrestiCoullCI.lower.toFixed(4)}, ${results.agrestiCoullCI.upper.toFixed(4)}]`,
        `[${(results.agrestiCoullCI.lower * 100).toFixed(2)}%, ${(results.agrestiCoullCI.upper * 100).toFixed(2)}%]`
      ]
    ];
    
    // Création du tableau
    (doc as any).autoTable({
      startY: 120,
      head: [['Méthode', 'Proportion', `IC ${results.confidenceLevel}%`, `IC ${results.confidenceLevel}% (×100)`]],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 }
      }
    });
    
    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
    doc.text('StatTool - Outil de calcul statistique', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });
    
    doc.save('resultats_proportion_detaille.pdf');
  };

  const proportion = calculateProportion();

  return (
    <>
      <style jsx>{`
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

      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          {/* Breadcrumb */}
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href="/" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  <Home className="w-4 h-4 inline mr-1" />
                  Accueil
                </Link>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">Calcul de Proportion</span>
              </li>
            </ol>
          </nav>
          
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Percent className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Calcul de Proportion
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Intervalles de confiance avec méthodes Wilson, Exacte, Normale et Agresti-Coull
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Edit className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Saisie des données
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="numerator" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Numérateur (nombre d'événements)
                        </label>
                        <input
                          type="number"
                          id="numerator"
                          min="0"
                          step="1"
                          value={numerator}
                          onChange={(e) => setNumerator(e.target.value)}
                          className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Entrez le numérateur"
                        />
                      </div>
                      <div>
                        <label htmlFor="denominator" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Dénominateur (taille de l'échantillon)
                        </label>
                        <input
                          type="number"
                          id="denominator"
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
                      <label htmlFor="confidence-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Niveau de confiance
                      </label>
                      <select
                        id="confidence-level"
                        value={confidenceLevel}
                        onChange={(e) => setConfidenceLevel(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="90">90%</option>
                        <option value="95">95%</option>
                        <option value="99">99%</option>
                      </select>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Proportion calculée :
                      </div>
                      <div id="calculated-proportion" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {denominator && parseInt(denominator) > 0 ? proportion.toFixed(4) : '-'}
                      </div>
                      <div id="calculated-percentage" className="text-sm text-gray-500 dark:text-gray-400">
                        {denominator && parseInt(denominator) > 0 ? `${(proportion * 100).toFixed(2)}%` : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      type="button"
                      onClick={calculate}
                      disabled={!validateInputs()}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                    >
                      <Calculator className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Calculer
                    </button>
                    <button
                      type="button"
                      onClick={clearForm}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Effacer
                    </button>
                    <button
                      type="button"
                      onClick={loadExample}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Exemple
                    </button>
                  </div>
                </div>
              </div>

              {/* Information Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Comment utiliser cet outil
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Saisissez le nombre d'événements observés (numérateur)
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Saisissez la taille totale de l'échantillon (dénominateur)
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Choisissez le niveau de confiance souhaité
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Les intervalles de confiance sont calculés selon 4 méthodes
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        La méthode de Wilson est recommandée pour la plupart des cas
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
                      Résultats
                    </div>
                    {results && (
                      <div id="export-buttons" className="flex gap-4">
                        <button
                          id="copy-btn"
                          aria-label="Copier les résultats"
                          onClick={copyResults}
                          className="p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Copy className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                        <button
                          id="pdf-btn"
                          aria-label="Exporter en PDF"
                          onClick={exportPDF}
                          className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </h2>
                </div>
                
                <div className="p-6">
                  <div id="proportion-results" ref={resultsRef}>
                    {results ? (
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                            <Users className="w-5 h-5 mr-2" />
                            Résumé
                          </h3>
                          <p className="text-blue-800 dark:text-blue-200">
                            Sur <strong>{results.denominator}</strong> observations, <strong>{results.numerator}</strong> événements ont été observés, 
                            soit une proportion de <strong>{(results.proportion * 100).toFixed(2)}%</strong>.
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Erreur standard : {results.standardError.toFixed(4)}
                          </p>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                          <table className="min-w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                              <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Méthode</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Proportion</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">IC {results.confidenceLevel}%</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">IC {results.confidenceLevel}% (×100)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                              <tr className="bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  <div className="flex items-center">
                                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" strokeWidth={1.5} />
                                    Wilson (recommandé)
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">{results.proportion.toFixed(4)}</td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{results.wilsonCI.lower.toFixed(4)}, {results.wilsonCI.upper.toFixed(4)}]
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{(results.wilsonCI.lower * 100).toFixed(2)}%, {(results.wilsonCI.upper * 100).toFixed(2)}%]
                                </td>
                              </tr>
                              <tr className="bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  <div className="flex items-center">
                                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" strokeWidth={1.5} />
                                    Exact (Clopper-Pearson)
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">{results.proportion.toFixed(4)}</td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{results.exactCI.lower.toFixed(4)}, {results.exactCI.upper.toFixed(4)}]
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{(results.exactCI.lower * 100).toFixed(2)}%, {(results.exactCI.upper * 100).toFixed(2)}%]
                                </td>
                              </tr>
                              <tr className="bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  <div className="flex items-center">
                                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" strokeWidth={1.5} />
                                    Normal (Wald)
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">{results.proportion.toFixed(4)}</td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{results.normalCI.lower.toFixed(4)}, {results.normalCI.upper.toFixed(4)}]
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{(results.normalCI.lower * 100).toFixed(2)}%, {(results.normalCI.upper * 100).toFixed(2)}%]
                                </td>
                              </tr>
                              <tr className="bg-indigo-50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  <div className="flex items-center">
                                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-2" strokeWidth={1.5} />
                                    Agresti-Coull
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">{results.proportion.toFixed(4)}</td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{results.agrestiCoullCI.lower.toFixed(4)}, {results.agrestiCoullCI.upper.toFixed(4)}]
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  [{(results.agrestiCoullCI.lower * 100).toFixed(2)}%, {(results.agrestiCoullCI.upper * 100).toFixed(2)}%]
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Saisissez vos données pour voir les résultats</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Les intervalles de confiance apparaîtront automatiquement</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Information Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <Percent className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Intervalles de Confiance
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Estimation de la plage de valeurs dans laquelle se trouve la proportion réelle de la population avec un certain niveau de confiance.
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <Target className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Méthodes Comparées
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Wilson (recommandée), Exacte (Clopper-Pearson), Normale (Wald) et Agresti-Coull pour une précision optimale.
                  </p>
                </div>
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

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 overflow-y-auto">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/50 my-8 w-full max-w-3xl">
              <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aide complète & Ressources</h3>
                <button onClick={() => setShowHelpModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  <X className="w-7 h-7" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[70vh]">
                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                    <Info className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Comment utiliser cet outil
                  </h4>
                  <ul className="space-y-3 text-base bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Saisissez le nombre d'événements observés (numérateur)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Saisissez la taille totale de l'échantillon (dénominateur)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Choisissez le niveau de confiance souhaité
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les intervalles de confiance sont calculés selon 4 méthodes et s'affichent automatiquement
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      La méthode de Wilson est recommandée pour la plupart des cas
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-6 text-blue-700 dark:text-blue-400">
                    Méthodes d'intervalle de confiance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                          <Check className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <h5 className="text-lg font-semibold">Méthode de Wilson (recommandée)</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Fournit des intervalles plus précis, particulièrement pour les petits échantillons ou proportions proches de 0 ou 1.
                      </p>
                      <p className="text-xs mt-3 opacity-80">
                        Référence : Wilson, E.B. (1927). Journal of the American Statistical Association.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <h5 className="text-lg font-semibold">Méthode Exacte (Clopper-Pearson)</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Intervalles exacts basés sur la distribution binomiale. Conservatrice mais garantit le niveau de confiance.
                      </p>
                      <p className="text-xs mt-3 opacity-80">
                        Référence : Clopper & Pearson (1934). Biometrika.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center mr-3">
                          <AlertTriangle className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <h5 className="text-lg font-semibold">Méthode Normale (Wald)</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Approximation normale classique. Moins précise pour petits échantillons ou proportions extrêmes.
                      </p>
                      <p className="text-xs mt-3 opacity-80">
                        Référence : Approximation normale standard.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </div>
                        <h5 className="text-lg font-semibold">Méthode Agresti-Coull</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Ajustement ajoutant des observations fictives pour améliorer la précision, surtout pour petits échantillons.
                      </p>
                      <p className="text-xs mt-3 opacity-80">
                        Référence : Agresti & Coull (1998). The American Statistician.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}