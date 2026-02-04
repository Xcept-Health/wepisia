import { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, Calculator, BarChart3, Copy, FileDown, 
  HelpCircle, X, Trash2, Link as LinkIcon, AlertCircle,
  CheckCircle, PieChart, TrendingUp, Hash, Percent,
  Clock, Users, Target, Brain
} from 'lucide-react';
import { Link } from 'wouter';

interface MatchedCaseControlResult {
  oddsRatio: number;
  oddsRatioCI: [number, number];
  mcnemarChi2: number;
  mcnemarPValue: number;
  exactPValue: number;
  confidenceLevel: number;
  interpretation: string;
  summary: string;
}

interface ContingencyTable {
  a: number; // Cas exposé, Témoin exposé
  b: number; // Cas exposé, Témoin non-exposé
  c: number; // Cas non-exposé, Témoin exposé
  d: number; // Cas non-exposé, Témoin non-exposé
}

export default function MatchedCaseControl() {
  // Tableau de contingence
  const [table, setTable] = useState<ContingencyTable>({
    a: 0,
    b: 0,
    c: 0,
    d: 0
  });

  // Niveau de confiance
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);

  // Résultats
  const [results, setResults] = useState<MatchedCaseControlResult | null>(null);
  
  // UI states
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculer les totaux
  const totals = {
    exposedCases: table.a + table.b,
    unexposedCases: table.c + table.d,
    exposedControls: table.a + table.c,
    unexposedControls: table.b + table.d,
    total: table.a + table.b + table.c + table.d
  };

  // Charger jStat dynamiquement
  useEffect(() => {
    const loadJStat = async () => {
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@1.9.4/dist/jstat.min.js';
        script.onload = () => {
          if (isValidTable()) {
            calculateResults();
          }
        };
        document.body.appendChild(script);
      }
    };
    loadJStat();
  }, []);

  // Calcul automatique quand le tableau change
  useEffect(() => {
    if (isValidTable()) {
      calculateResults();
    } else {
      setResults(null);
    }
  }, [table, confidenceLevel]);

  // Animation pour les résultats
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  // Nettoyer les timeouts
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const isValidTable = (): boolean => {
    return Object.values(table).every(value => 
      !isNaN(value) && value >= 0 && Number.isInteger(value)
    ) && totals.total > 0;
  };

  const validateInputs = (): boolean => {
    if (!isValidTable()) {
      setErrorMessage('Veuillez entrer des nombres entiers non négatifs valides pour toutes les cellules.');
      setShowError(true);
      return false;
    }

    if (table.b + table.c === 0) {
      setErrorMessage('Erreur: Le nombre de paires discordantes (b + c) doit être supérieur à 0 pour le calcul.');
      setShowError(true);
      return false;
    }

    setShowError(false);
    return true;
  };

  const calculateResults = () => {
    if (!validateInputs() || !(window as any).jStat) return;

    setIsCalculating(true);

    // Calcul de l'Odds Ratio
    const oddsRatio = table.c > 0 ? table.b / table.c : (table.b > 0 ? Infinity : 1);
    
    // Calcul de l'intervalle de confiance
    const alpha = (100 - confidenceLevel) / 100;
    const zValue = (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1);
    
    let orLowerCI, orUpperCI;
    if (table.b > 0 && table.c > 0) {
      const logOR = Math.log(oddsRatio);
      const seLogOR = Math.sqrt(1 / table.b + 1 / table.c);
      const logLowerCI = logOR - zValue * seLogOR;
      const logUpperCI = logOR + zValue * seLogOR;
      orLowerCI = Math.exp(logLowerCI);
      orUpperCI = Math.exp(logUpperCI);
    } else {
      orLowerCI = 0;
      orUpperCI = Infinity;
    }

    // Test de McNemar avec correction de continuité
    const mcnemarChi2 = Math.pow(Math.abs(table.b - table.c) - 0.5, 2) / (table.b + table.c);
    const mcnemarPValue = 1 - (window as any).jStat.chisquare.cdf(mcnemarChi2, 1);

    // Test exact (distribution binomiale)
    const exactPValue = 2 * Math.min(
      (window as any).jStat.binomial.cdf(Math.min(table.b, table.c), table.b + table.c, 0.5),
      1 - (window as any).jStat.binomial.cdf(Math.min(table.b, table.c) - 1, table.b + table.c, 0.5)
    );

    // Générer l'interprétation
    const interpretation = generateInterpretation(oddsRatio, mcnemarPValue, exactPValue);
    const summary = generateSummary(oddsRatio, mcnemarPValue);

    setResults({
      oddsRatio,
      oddsRatioCI: [orLowerCI, orUpperCI],
      mcnemarChi2,
      mcnemarPValue,
      exactPValue,
      confidenceLevel,
      interpretation,
      summary
    });

    setIsCalculating(false);
  };

  const generateInterpretation = (or: number, mcnemarP: number, exactP: number): string => {
    let interpretation = '';
    
    if (or > 1) {
      interpretation += `L'exposition semble être un facteur de risque (OR = ${or.toFixed(2)}). `;
      interpretation += `Les cas exposés ont ${or.toFixed(2)} fois plus de chances d'être exposés que les témoins. `;
    } else if (or < 1) {
      interpretation += `L'exposition semble être un facteur protecteur (OR = ${or.toFixed(2)}). `;
      interpretation += `Les cas exposés ont ${(1/or).toFixed(2)} fois moins de chances d'être exposés que les témoins. `;
    } else {
      interpretation += `Pas d'association apparente entre l'exposition et la maladie (OR = 1). `;
    }
    
    const pValue = Math.min(mcnemarP, exactP);
    if (pValue < 0.05) {
      interpretation += `L'association est statistiquement significative (p = ${pValue.toFixed(4)}). `;
    } else {
      interpretation += `L'association n'est pas statistiquement significative (p = ${pValue.toFixed(4)}). `;
    }
    
    interpretation += `Niveau de confiance: ${confidenceLevel}%.`;
    
    return interpretation;
  };

  const generateSummary = (or: number, mcnemarP: number): string => {
    const pValue = mcnemarP;
    
    if (pValue < 0.05) {
      if (or > 1) {
        return `Association significative positive (OR = ${or.toFixed(2)}, p = ${pValue.toFixed(4)})`;
      } else if (or < 1) {
        return `Association significative négative (OR = ${or.toFixed(2)}, p = ${pValue.toFixed(4)})`;
      }
    }
    
    return `Pas d'association significative (OR = ${or.toFixed(2)}, p = ${pValue.toFixed(4)})`;
  };

  const clearInputs = () => {
    setTable({ a: 0, b: 0, c: 0, d: 0 });
    setConfidenceLevel(95);
    setResults(null);
    setShowError(false);
  };

  const loadExample = () => {
    // Exemple réaliste pour cas-témoins appariés
    setTable({ a: 20, b: 50, c: 30, d: 100 });
    setConfidenceLevel(95);
  };

  const copyResults = async () => {
    if (!results) return;
    
    let text = `Analyse Cas-Témoins Appariés\n\n`;
    text += `Tableau de contingence:\n`;
    text += `a (Cas+/Témoin+): ${table.a}\n`;
    text += `b (Cas+/Témoin-): ${table.b}\n`;
    text += `c (Cas-/Témoin+): ${table.c}\n`;
    text += `d (Cas-/Témoin-): ${table.d}\n\n`;
    text += `Résultats:\n`;
    text += `Odds Ratio (OR): ${results.oddsRatio.toFixed(4)}\n`;
    text += `IC ${results.confidenceLevel}%: [${results.oddsRatioCI[0].toFixed(4)}, ${results.oddsRatioCI[1] === Infinity ? '∞' : results.oddsRatioCI[1].toFixed(4)}]\n`;
    text += `Chi-carré de McNemar: ${results.mcnemarChi2.toFixed(4)}\n`;
    text += `Valeur p (McNemar): ${results.mcnemarPValue.toFixed(6)}\n`;
    text += `Valeur p exacte: ${results.exactPValue.toFixed(6)}\n\n`;
    text += `Interprétation: ${results.interpretation}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      alert('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      alert('Veuillez d\'abord effectuer un calcul');
      return;
    }

    // Charger jspdf dynamiquement
    const loadPDF = async () => {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();

      const primaryColor = [59, 130, 246];
      const secondaryColor = [99, 102, 241];

      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Analyse Cas-Témoins Appariés', 105, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Odds Ratio et Test de McNemar pour paires appariées', 105, 30, { align: 'center' });

      // Tableau de données
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text('Tableau de contingence', 20, 55);
      
      const tableData = [
        ['', 'Témoin Exposé', 'Témoin Non-exposé', 'Total'],
        ['Cas Exposé', table.a.toString(), table.b.toString(), totals.exposedCases.toString()],
        ['Cas Non-exposé', table.c.toString(), table.d.toString(), totals.unexposedCases.toString()],
        ['Total', totals.exposedControls.toString(), totals.unexposedControls.toString(), totals.total.toString()]
      ];

      (doc as any).autoTable({
        startY: 65,
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: 'grid',
        headStyles: { 
          fillColor: secondaryColor, 
          textColor: 255, 
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: { halign: 'center' },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 5 }
      });

      // Résultats
      const resultsY = (doc as any).autoTable.previous.finalY + 15;
      doc.setFontSize(16);
      doc.text('Résultats statistiques', 20, resultsY);

      const resultsData = [
        ['Paramètre', 'Valeur'],
        ['Odds Ratio (OR)', results.oddsRatio === Infinity ? '∞' : results.oddsRatio.toFixed(4)],
        [`IC ${results.confidenceLevel}%`, `[${results.oddsRatioCI[0].toFixed(4)}, ${results.oddsRatioCI[1] === Infinity ? '∞' : results.oddsRatioCI[1].toFixed(4)}]`],
        ['Chi-carré de McNemar', results.mcnemarChi2.toFixed(4)],
        ['Valeur p (McNemar)', results.mcnemarPValue.toFixed(6)],
        ['Valeur p exacte', results.exactPValue.toFixed(6)]
      ];

      (doc as any).autoTable({
        startY: resultsY + 5,
        head: [resultsData[0]],
        body: resultsData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 4 }
      });

      // Interprétation
      const interpY = (doc as any).autoTable.previous.finalY + 15;
      const splitText = doc.splitTextToSize(results.interpretation, 170);
      const interpHeight = 20 + splitText.length * 8;
      
      doc.setFillColor(240, 250, 255);
      doc.rect(20, interpY, 170, interpHeight, 'F');
      doc.setDrawColor(...primaryColor);
      doc.rect(20, interpY, 170, interpHeight);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Interprétation', 25, interpY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(splitText, 25, interpY + 16);

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
      doc.text('StatTool - Analyse Cas-Témoins Appariés', 105, pageHeight - 20, { align: 'center' });
      doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });

      doc.save(`cas_temoins_apparies_${new Date().getTime()}.pdf`);
    };

    loadPDF();
  };

  const handleInputChange = (cell: keyof ContingencyTable, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setTable(prev => ({ ...prev, [cell]: numValue }));
    }
  };

  return (
    <>
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
        
        .table-input:focus {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
        
        .pulse-animation {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Cas-Témoins Appariés</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analyse Cas-Témoins Appariés
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez l'odds ratio et le test de McNemar pour les paires appariées
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
                  {showError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Contingency Table */}
                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600 mb-6">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200" rowSpan={2}>
                            Cas
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200" colSpan={2}>
                            Témoins
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200" rowSpan={2}>
                            Total
                          </th>
                        </tr>
                        <tr>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Exposé
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Non exposé
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Exposé
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              value={table.a || ''}
                              onChange={(e) => handleInputChange('a', e.target.value)}
                              min="0"
                              step="1"
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors table-input"
                              placeholder="a"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              value={table.b || ''}
                              onChange={(e) => handleInputChange('b', e.target.value)}
                              min="0"
                              step="1"
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors table-input"
                              placeholder="b"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            {totals.exposedCases || '-'}
                          </td>
                        </tr>
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Non exposé
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              value={table.c || ''}
                              onChange={(e) => handleInputChange('c', e.target.value)}
                              min="0"
                              step="1"
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors table-input"
                              placeholder="c"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              value={table.d || ''}
                              onChange={(e) => handleInputChange('d', e.target.value)}
                              min="0"
                              step="1"
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors table-input"
                              placeholder="d"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            {totals.unexposedCases || '-'}
                          </td>
                        </tr>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {totals.exposedControls || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {totals.unexposedControls || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                            {totals.total || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Confidence Level */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">
                      Niveau de confiance (%)
                    </label>
                    <select
                      value={confidenceLevel}
                      onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="90">90%</option>
                      <option value="95">95%</option>
                      <option value="99">99%</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={calculateResults}
                      disabled={!isValidTable() || isCalculating}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                    >
                      {isCalculating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Calcul...
                        </>
                      ) : (
                        <>
                          <Calculator className="w-4 h-4 mr-2" />
                          Calculer
                        </>
                      )}
                    </button>
                    <button
                      onClick={clearInputs}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Effacer
                    </button>
                    <button
                      onClick={loadExample}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Exemple
                    </button>
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
                      <li>• Saisissez le nombre de paires dans chaque cellule du tableau</li>
                      <li>• <strong>a</strong>: Paires où cas et témoin sont exposés</li>
                      <li>• <strong>b</strong>: Paires où le cas est exposé, le témoin non exposé</li>
                      <li>• <strong>c</strong>: Paires où le cas n'est pas exposé, le témoin est exposé</li>
                      <li>• <strong>d</strong>: Paires où cas et témoin ne sont pas exposés</li>
                      <li>• Les calculs se mettent à jour automatiquement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
                    Résultats
                  </h2>
                  {results && (
                    <div className="flex gap-4">
                      <button
                        onClick={copyResults}
                        className="relative p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        {copied ? (
                          <CheckCircle className="w-5 h-5" strokeWidth={1.5} />
                        ) : (
                          <Copy className="w-5 h-5" strokeWidth={1.5} />
                        )}
                        {copied && (
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            Copié!
                          </span>
                        )}
                      </button>
                      <button
                        onClick={exportPDF}
                        className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div id="results-container" ref={resultsRef}>
                    {results ? (
                      <div className="space-y-6">
                        {/* Odds Ratio */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                            <Target className="w-5 h-5 mr-2" />
                            Odds Ratio (OR)
                          </h3>
                          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                            {results.oddsRatio === Infinity ? '∞' : results.oddsRatio.toFixed(4)}
                          </div>
                          <p className="text-blue-800 dark:text-blue-200 text-sm">
                            IC {results.confidenceLevel}%: [{results.oddsRatioCI[0].toFixed(4)}, {results.oddsRatioCI[1] === Infinity ? '∞' : results.oddsRatioCI[1].toFixed(4)}]
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            OR = b/c = {table.b}/{table.c}
                          </p>
                        </div>

                        {/* Statistical Tests */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
                            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                              <Hash className="w-4 h-4 mr-2" />
                              Chi-carré de McNemar
                            </h4>
                            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                              {results.mcnemarChi2.toFixed(4)}
                            </div>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                              χ² = (|b-c|-0.5)²/(b+c)
                            </p>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center">
                              <Percent className="w-4 h-4 mr-2" />
                              Valeur p (McNemar)
                            </h4>
                            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                              {results.mcnemarPValue.toFixed(6)}
                            </div>
                            <div className={`mt-1 px-2 py-1 rounded-full text-xs font-medium inline-block ${
                              results.mcnemarPValue < 0.05 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {results.mcnemarPValue < 0.05 ? 'Significatif' : 'Non significatif'}
                            </div>
                          </div>
                        </div>

                        {/* Exact Test */}
                        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                          <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center">
                            <Brain className="w-4 h-4 mr-2" />
                            Test exact binomial
                          </h4>
                          <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                            p = {results.exactPValue.toFixed(6)}
                          </div>
                          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                            Test exact basé sur la distribution binomiale
                          </p>
                        </div>

                        {/* Interpretation */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            Interprétation
                          </h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {results.interpretation}
                          </p>
                          <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700">
                            <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              Résumé
                            </h4>
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                              {results.summary}
                            </p>
                          </div>
                        </div>

                        {/* Discordant Pairs Analysis */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 border border-gray-200 dark:border-slate-600">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Analyse des paires discordantes
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {table.b}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Paires Cas+/Témoin-
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Favorise le risque
                              </div>
                            </div>
                            <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {table.c}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Paires Cas-/Témoin+
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Favorise la protection
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 text-center">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Ratio discordant: {table.c > 0 ? (table.b / table.c).toFixed(2) : '∞'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              b/c = {table.b}/{table.c}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          Saisissez vos données pour voir les résultats
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                          L'Odds Ratio et le test de McNemar apparaîtront automatiquement
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">OR</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Odds Ratio Apparié
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Mesure l'association entre l'exposition et la maladie pour les paires appariées. 
                OR = b/c. OR sup 1 indique un risque accru, OR &lt; 1 un effet protecteur, OR = 1 pas d'association.
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">χ²</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Test de McNemar
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Teste l'association entre l'exposition et la maladie en utilisant uniquement les paires discordantes (b et c). 
                Une valeur p &lt; 0,05 indique une association statistiquement significative.
              </p>
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
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 my-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aide complète & Ressources</h3>
                  <button onClick={() => setShowHelpModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <X className="w-7 h-7" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300">
                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      À propos de cet outil
                    </h4>
                    <p className="text-sm leading-relaxed">
                      Cet outil calcule l'Odds Ratio (OR) et effectue le test de McNemar pour les études cas-témoins appariées. 
                      Il est utilisé en épidémiologie pour analyser l'association entre une exposition et une maladie lorsque 
                      les cas et les témoins sont appariés (par âge, sexe, etc.).
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      Méthodes de calcul
                    </h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>Odds Ratio apparié :</strong> OR = b / c (seules les paires discordantes comptent)</p>
                      <p><strong>Intervalle de confiance :</strong> Méthode de Woolf sur le log(OR)</p>
                      <p><strong>Test de McNemar :</strong> χ² = (|b-c|-0.5)²/(b+c) avec correction de continuité</p>
                      <p><strong>Test exact binomial :</strong> Distribution binomiale pour les paires discordantes</p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <BarChart3 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Interprétation des résultats
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Odds Ratio</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <strong>OR &gt; 1 :</strong> L'exposition est associée à un risque accru de maladie</li>
                          <li>• <strong>OR = 1 :</strong> Pas d'association entre exposition et maladie</li>
                          <li>• <strong>OR &lt; 1 :</strong> L'exposition est associée à un risque réduit de maladie</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Signification statistique</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <strong>p &lt; 0.05 :</strong> Association statistiquement significative</li>
                          <li>• <strong>p ≥ 0.05 :</strong> Association non significative</li>
                          <li>• L'intervalle de confiance doit être considéré avec la valeur p</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      Ressources & Tutoriels
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Références statistiques</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• Rothman KJ, Greenland S. <em>Modern Epidemiology</em></li>
                          <li>• Szklo M, Nieto FJ. <em>Epidemiology: Beyond the Basics</em></li>
                          <li>• McNemar Q. <em>Note on the sampling error of the difference between correlated proportions</em></li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}