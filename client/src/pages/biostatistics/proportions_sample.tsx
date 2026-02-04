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
  PieChart,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Target,
  Database,
  Percent,
  FileText,
  Shield,
  GitCompare,
  Activity
} from 'lucide-react';

interface ConfidenceInterval {
  lower: number;
  upper: number;
}

interface ProportionResults {
  numerator: number;
  denominator: number;
  proportion: number;
  standardError: number;
  confidenceLevel: number;
  wilsonCI: ConfidenceInterval;
  exactCI: ConfidenceInterval;
  normalCI: ConfidenceInterval;
}

export default function ProportionsSample() {
  const [numerator, setNumerator] = useState<string>('');
  const [denominator, setDenominator] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [results, setResults] = useState<ProportionResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [proportion, setProportion] = useState<number>(0);
  const [percentage, setPercentage] = useState<string>('-');

  // Load external scripts
  useEffect(() => {
    const loadScripts = async () => {
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

  // Update proportion automatically
  useEffect(() => {
    const num = parseInt(numerator) || 0;
    const den = parseInt(denominator) || 0;
    
    if (den > 0) {
      const prop = num / den;
      const perc = prop * 100;
      
      setProportion(prop);
      setPercentage(`${perc.toFixed(2)}%`);
      
      // Auto-calculate if valid
      if (num >= 0 && den > 0 && num <= den) {
        calculateProportion();
      }
    } else {
      setProportion(0);
      setPercentage('-');
    }
  }, [numerator, denominator, confidenceLevel]);

  const validateInputs = (): boolean => {
    const num = parseInt(numerator);
    const den = parseInt(denominator);

    return !isNaN(num) && !isNaN(den) && 
           num >= 0 && den > 0 && num <= den;
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
    if (x === 0) {
      return {
        lower: 0,
        upper: 1 - Math.pow(alpha / 2, 1 / n)
      };
    }
    if (x === n) {
      return {
        lower: Math.pow(alpha / 2, 1 / n),
        upper: 1
      };
    }
    
    // For other cases, use Wilson method as approximation
    return calculateWilsonCI(x, n, alpha);
  };

  const calculateNormalCI = (p: number, se: number, alpha: number): ConfidenceInterval => {
    const z = getZValue(alpha / 2);
    const margin = z * se;
    
    return {
      lower: Math.max(0, p - margin),
      upper: Math.min(1, p + margin)
    };
  };

  const calculateProportion = (e?: FormEvent) => {
    if (e) e.preventDefault();
    
    if (!validateInputs()) {
      alert('Veuillez remplir tous les champs avec des valeurs valides. Le numérateur doit être inférieur ou égal au dénominateur.');
      return;
    }

    const num = parseInt(numerator);
    const den = parseInt(denominator);
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;

    const prop = num / den;
    const standardError = Math.sqrt((prop * (1 - prop)) / den);

    const wilsonCI = calculateWilsonCI(num, den, alpha);
    const exactCI = calculateExactCI(num, den, alpha);
    const normalCI = calculateNormalCI(prop, standardError, alpha);

    const resultsData: ProportionResults = {
      numerator: num,
      denominator: den,
      proportion: prop,
      standardError,
      confidenceLevel: conf,
      wilsonCI,
      exactCI,
      normalCI
    };

    setResults(resultsData);

    // Animation
    setTimeout(() => {
      if (resultsRef.current) {
        const children = resultsRef.current.children;
        Array.from(children).forEach((el, index) => {
          setTimeout(() => {
            el.classList.add('opacity-100', 'translate-y-0');
            el.classList.remove('opacity-0', 'translate-y-5');
          }, index * 150);
        });
      }
    }, 100);
  };

  const clearForm = () => {
    setNumerator('');
    setDenominator('');
    setConfidenceLevel('95');
    setResults(null);
    setProportion(0);
    setPercentage('-');
  };

  const loadExample = () => {
    setNumerator('45');
    setDenominator('200');
    setConfidenceLevel('95');
  };

  const copyResults = async () => {
    if (!results) return;
    
    const text = `Résultats du Calcul de Proportion\n\n` +
                 `Données : ${results.numerator} événements / ${results.denominator} observations\n` +
                 `Proportion : ${(results.proportion * 100).toFixed(2)}%\n` +
                 `Erreur standard : ${results.standardError.toFixed(4)}\n\n` +
                 `Intervalles de confiance ${results.confidenceLevel}% :\n` +
                 `Wilson : [${(results.wilsonCI.lower * 100).toFixed(2)}%, ${(results.wilsonCI.upper * 100).toFixed(2)}%]\n` +
                 `Exact : [${(results.exactCI.lower * 100).toFixed(2)}%, ${(results.exactCI.upper * 100).toFixed(2)}%]\n` +
                 `Normal : [${(results.normalCI.lower * 100).toFixed(2)}%, ${(results.normalCI.upper * 100).toFixed(2)}%]`;
    
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

  const exportToPDF = () => {
    if (!results) return;

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const primaryColor = [59, 130, 246];
    const secondaryColor = [99, 102, 241];
    const accentColor = [16, 185, 129];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Analyse de Proportion', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Intervalles de confiance - Wilson, Exact et Normal', 105, 30, { align: 'center' });

    // Informations de base
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Données d\'entrée', 20, 55);
    doc.setFontSize(12);
    doc.text(`Numérateur (événements) : ${results.numerator}`, 20, 65);
    doc.text(`Dénominateur (observations) : ${results.denominator}`, 20, 72);
    doc.text(`Proportion : ${(results.proportion * 100).toFixed(2)}%`, 20, 79);
    doc.text(`Niveau de confiance : ${results.confidenceLevel}%`, 20, 86);
    doc.text(`Erreur standard : ${results.standardError.toFixed(4)}`, 20, 93);

    // Tableau des résultats
    doc.setFontSize(16);
    doc.text('Intervalles de confiance', 20, 110);

    const tableData = [
      ['Méthode', 'Proportion', `IC ${results.confidenceLevel}%`, `IC ${results.confidenceLevel}% (%)`],
      ['Wilson (recommandé)', 
       results.proportion.toFixed(4), 
       `[${results.wilsonCI.lower.toFixed(4)}, ${results.wilsonCI.upper.toFixed(4)}]`,
       `[${(results.wilsonCI.lower * 100).toFixed(2)}%, ${(results.wilsonCI.upper * 100).toFixed(2)}%]`],
      ['Exact (Clopper-Pearson)', 
       results.proportion.toFixed(4), 
       `[${results.exactCI.lower.toFixed(4)}, ${results.exactCI.upper.toFixed(4)}]`,
       `[${(results.exactCI.lower * 100).toFixed(2)}%, ${(results.exactCI.upper * 100).toFixed(2)}%]`],
      ['Normal (Wald)', 
       results.proportion.toFixed(4), 
       `[${results.normalCI.lower.toFixed(4)}, ${results.normalCI.upper.toFixed(4)}]`,
       `[${(results.normalCI.lower * 100).toFixed(2)}%, ${(results.normalCI.upper * 100).toFixed(2)}%]`]
    ];

    (doc as any).autoTable({
      startY: 115,
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: secondaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 10,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 20, right: 20 },
      styles: {
        cellPadding: 6,
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      }
    });

    // Interprétation
    const interpY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFillColor(240, 250, 255);
    doc.roundedRect(20, interpY, 170, 30, 3, 3, 'F');
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, interpY, 170, 30, 3, 3);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Interprétation', 25, interpY + 8);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const interpretation = `Sur ${results.denominator} observations, ${results.numerator} événements observés (${(results.proportion * 100).toFixed(2)}%). 
Les intervalles de confiance ${results.confidenceLevel}% indiquent la plage probable de la proportion réelle.`;
    const interpLines = doc.splitTextToSize(interpretation, 160);
    doc.text(interpLines, 25, interpY + 16);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    const footerY = pageHeight - 15;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, footerY - 5, 190, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Proportion Calculator - Outil d\'analyse statistique', 105, footerY, { align: 'center' });
    
    doc.setFontSize(7);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, footerY);
    doc.text('Page 1/1', 190, footerY, { align: 'right' });

    doc.save(`Proportion_Analyse_${new Date().toISOString().split('T')[0]}.pdf`);
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
              <span className="text-gray-900 dark:text-gray-100 font-medium">Calcul de Proportion</span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <PieChart className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Calcul de Proportion
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Intervalles de confiance avec méthodes Wilson, Fisher Exact et Normale
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Data Input Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Database className="w-5 h-5 mr-2 text-blue-500" />
                  Saisie des données
                </h2>
              </div>
              
              <div className="p-6">
                <form id="proportion-form" className="space-y-6" onSubmit={calculateProportion}>
                  {/* Input Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="numerator" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        <span className="flex items-center">
                          <Target className="w-4 h-4 mr-2 text-blue-500" />
                          Numérateur (nombre d'événements)
                        </span>
                      </label>
                      <input
                        type="number"
                        id="numerator"
                        value={numerator}
                        onChange={(e) => setNumerator(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="1"
                        placeholder="Ex: 45"
                      />
                    </div>
                    <div>
                      <label htmlFor="denominator" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        <span className="flex items-center">
                          <Database className="w-4 h-4 mr-2 text-blue-500" />
                          Dénominateur (taille de l'échantillon)
                        </span>
                      </label>
                      <input
                        type="number"
                        id="denominator"
                        value={denominator}
                        onChange={(e) => setDenominator(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                        step="1"
                        placeholder="Ex: 200"
                      />
                    </div>
                  </div>

                  {/* Confidence Level */}
                  <div>
                    <label htmlFor="confidence-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      <span className="flex items-center">
                        <Shield className="w-4 h-4 mr-2 text-blue-500" />
                        Niveau de confiance
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['90', '95', '99'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setConfidenceLevel(level)}
                          className={`py-3 rounded-xl border transition-all duration-300 ${
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

                  {/* Calculated Proportion */}
                  <div className="bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 rounded-xl p-5 border border-blue-200 dark:border-blue-700/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Proportion calculée
                        </h3>
                        <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                          Événements / Observations
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {proportion > 0 ? proportion.toFixed(4) : '-'}
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                          {percentage}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={!validateInputs()}
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
                    Comment utiliser cet outil
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
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
                      Les intervalles de confiance sont calculés selon 3 méthodes
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
            {/* Results Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Résultats
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
                        onClick={exportToPDF}
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
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700 transition-all duration-500 opacity-0 translate-y-5">
                      <div className="flex items-center mb-3">
                        <Percent className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Résumé
                        </h3>
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                        Sur <strong>{results.denominator}</strong> observations, <strong>{results.numerator}</strong> événements ont été observés, 
                        soit une proportion de <strong>{(results.proportion * 100).toFixed(2)}%</strong>.
                      </p>
                      <div className="mt-2 text-xs text-blue-700/80 dark:text-blue-300/80">
                        Erreur standard : {results.standardError.toFixed(4)}
                      </div>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm">
                      <table className="min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                              Méthode
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                              Proportion
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                              IC {results.confidenceLevel}%
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                              IC {results.confidenceLevel}% (%)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                          <tr className="bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors duration-300">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Wilson (recommandé)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              {results.proportion.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              [{results.wilsonCI.lower.toFixed(4)}, {results.wilsonCI.upper.toFixed(4)}]
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              [{(results.wilsonCI.lower * 100).toFixed(2)}%, {(results.wilsonCI.upper * 100).toFixed(2)}%]
                            </td>
                          </tr>
                          <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors duration-300">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Exact (Clopper-Pearson)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              {results.proportion.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              [{results.exactCI.lower.toFixed(4)}, {results.exactCI.upper.toFixed(4)}]
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              [{(results.exactCI.lower * 100).toFixed(2)}%, {(results.exactCI.upper * 100).toFixed(2)}%]
                            </td>
                          </tr>
                          <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors duration-300">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Normal (Wald)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              {results.proportion.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              [{results.normalCI.lower.toFixed(4)}, {results.normalCI.upper.toFixed(4)}]
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                              [{(results.normalCI.lower * 100).toFixed(2)}%, {(results.normalCI.upper * 100).toFixed(2)}%]
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center shadow-lg">
                      <PieChart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                      Saisissez vos données pour voir les résultats
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Les intervalles de confiance apparaîtront automatiquement
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Méthode de Wilson
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Méthode recommandée pour sa précision, particulièrement pour les petits échantillons ou les proportions proches de 0 ou 1.
                </p>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Méthode Exacte
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Méthode de Clopper-Pearson basée sur la distribution binomiale. Conservative mais garantit le niveau de confiance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Sections */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Méthode de Wilson
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Méthode recommandée qui fournit des intervalles de confiance plus précis, particulièrement pour les petits échantillons ou les proportions proches de 0 ou 1.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Référence: Wilson, E.B. (1927). Journal of the American Statistical Association.
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Méthode Exacte
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Méthode de Clopper-Pearson qui fournit des intervalles de confiance exacts basés sur la distribution binomiale. Conservative mais garantit le niveau de confiance.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Référence: Clopper & Pearson (1934). Biometrika.
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Méthode Normale
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Méthode classique de Wald basée sur l'approximation normale. Moins précise pour les petits échantillons ou les proportions extrêmes.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Référence: Méthode classique d'approximation normale.
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
                  Guide du Calcul de Proportion
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
                  Comment utiliser cet outil
                </h4>
                <div className="space-y-3 text-sm bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">1</span>
                    </div>
                    <div>
                      <strong>Numérateur</strong> : Nombre d'événements observés (ex: nombre de patients guéris)
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">2</span>
                    </div>
                    <div>
                      <strong>Dénominateur</strong> : Taille totale de l'échantillon (ex: nombre total de patients)
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">3</span>
                    </div>
                    <div>
                      <strong>Niveau de confiance</strong> : Fiabilité de l'intervalle (95% recommandé)
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">4</span>
                    </div>
                    <div>
                      <strong>Interprétation</strong> : L'intervalle contient la proportion réelle avec le niveau de confiance choisi
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Choix de la méthode
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 rounded-xl p-4 border border-green-200 dark:border-green-700/30">
                    <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                      Wilson
                    </h5>
                    <p className="text-sm">
                      <strong>Recommandée</strong> pour tous les cas<br/>
                      Précise même pour petits échantillons
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/10 rounded-xl p-4 border border-blue-200 dark:border-blue-700/30">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      Exacte
                    </h5>
                    <p className="text-sm">
                      <strong>Conservative</strong><br/>
                      Garantit le niveau de confiance
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/10 dark:to-yellow-800/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700/30">
                    <h5 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                      Normale
                    </h5>
                    <p className="text-sm">
                      <strong>Classique</strong><br/>
                      Pour grands échantillons seulement
                    </p>
                  </div>
                </div>
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