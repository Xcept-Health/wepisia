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
  Grid3x3,
  AlertTriangle,
  Info,
  BookOpen,
  ExternalLink,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Link } from 'wouter';

interface TwoByTwoResults {
  or: number | string;
  rr: number | string;
  chi2: string;
  pValue: string;
  orInterpretation: string;
  rrInterpretation: string;
  chi2Interpretation: string;
  a: number;
  b: number;
  c: number;
  d: number;
}

export default function TwoByTwo() {
  const [a, setA] = useState<string>('');
  const [b, setB] = useState<string>('');
  const [c, setC] = useState<string>('');
  const [d, setD] = useState<string>('');
  const [results, setResults] = useState<TwoByTwoResults | null>(null);
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
    const aVal = parseInt(a);
    const bVal = parseInt(b);
    const cVal = parseInt(c);
    const dVal = parseInt(d);
    
    return !isNaN(aVal) && !isNaN(bVal) && !isNaN(cVal) && !isNaN(dVal) &&
           aVal >= 0 && bVal >= 0 && cVal >= 0 && dVal >= 0;
  };

  const calculateTotals = () => {
    const aVal = parseInt(a) || 0;
    const bVal = parseInt(b) || 0;
    const cVal = parseInt(c) || 0;
    const dVal = parseInt(d) || 0;

    return {
      totalExposed: aVal + bVal,
      totalUnexposed: cVal + dVal,
      totalDiseased: aVal + cVal,
      totalUndiseased: bVal + dVal,
      totalAll: aVal + bVal + cVal + dVal
    };
  };

  const calculateResults = () => {
    const aVal = parseInt(a) || 0;
    const bVal = parseInt(b) || 0;
    const cVal = parseInt(c) || 0;
    const dVal = parseInt(d) || 0;
    const n = aVal + bVal + cVal + dVal;

    if (n === 0) {
      setResults(null);
      return;
    }

    // Calculate Odds Ratio (OR)
    let or: number | string = 0;
    if (bVal * cVal === 0) {
      or = '∞';
    } else {
      or = (aVal * dVal) / (bVal * cVal);
    }

    // Calculate Relative Risk (RR)
    let rr: number | string = 0;
    if ((aVal + bVal === 0) || (cVal + dVal === 0)) {
      rr = '∞';
    } else {
      rr = (aVal / (aVal + bVal)) / (cVal / (cVal + dVal));
    }

    // Calculate Chi-square
    const expectedA = (aVal + bVal) * (aVal + cVal) / n;
    const expectedB = (aVal + bVal) * (bVal + dVal) / n;
    const expectedC = (cVal + dVal) * (aVal + cVal) / n;
    const expectedD = (cVal + dVal) * (bVal + dVal) / n;

    const chi2 = (
      (expectedA > 0 ? Math.pow(aVal - expectedA, 2) / expectedA : 0) +
      (expectedB > 0 ? Math.pow(bVal - expectedB, 2) / expectedB : 0) +
      (expectedC > 0 ? Math.pow(cVal - expectedC, 2) / expectedC : 0) +
      (expectedD > 0 ? Math.pow(dVal - expectedD, 2) / expectedD : 0)
    );

    // Calculate p-value
    const pValue = 1 - (window as any).jStat?.chisquare?.cdf(chi2, 1) || 0;

    // Interpretations
    const orInterpretation = or === '∞' ? 'Non calculable' :
      typeof or === 'number' ? (
        or > 1 ? 'Risque accru' :
        or < 1 ? 'Effet protecteur' : 'Aucune association'
      ) : 'Non calculable';

    const rrInterpretation = rr === '∞' ? 'Non calculable' :
      typeof rr === 'number' ? (
        rr > 1 ? 'Risque accru' :
        rr < 1 ? 'Risque réduit' : 'Risque égal'
      ) : 'Non calculable';

    const chi2Interpretation = pValue < 0.05 ? 'Association significative' : 'Aucune association significative';

    setResults({
      or,
      rr,
      chi2: chi2.toFixed(3),
      pValue: pValue.toFixed(4),
      orInterpretation,
      rrInterpretation,
      chi2Interpretation,
      a: aVal,
      b: bVal,
      c: cVal,
      d: dVal
    });
  };

  // Auto calculate if valid
  useEffect(() => {
    if (validateInputs() && (window as any).jStat) {
      calculateResults();
    }
  }, [a, b, c, d]);

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clearForm = () => {
    setA('');
    setB('');
    setC('');
    setD('');
    setResults(null);
  };

  const loadExample = () => {
    setA('60');
    setB('40');
    setC('30');
    setD('70');
  };

  const copyResults = async () => {
    if (!results) return;
    
    const text = `Résultats de l'Analyse 2×2\n` +
                 `Tableau:\n` +
                 `a (exposés malades): ${results.a}\n` +
                 `b (exposés non-malades): ${results.b}\n` +
                 `c (non-exposés malades): ${results.c}\n` +
                 `d (non-exposés non-malades): ${results.d}\n\n` +
                 `Odds Ratio (OR): ${results.or}\n` +
                 `Interprétation: ${results.orInterpretation}\n\n` +
                 `Risque Relatif (RR): ${results.rr}\n` +
                 `Interprétation: ${results.rrInterpretation}\n\n` +
                 `Chi-carré: ${results.chi2}\n` +
                 `Valeur p: ${results.pValue}\n` +
                 `Interprétation: ${results.chi2Interpretation}`;
    
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
    const secondaryColor = [99, 102, 241];
    const accentColor = [16, 185, 129];
    
    // En-tête
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Résultats de l\'Analyse 2×2', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Odds Ratio, Risque Relatif & Test du Chi-carré', 105, 30, { align: 'center' });
    
    // Informations principales
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Tableau de contingence', 20, 55);
    
    // Tableau des données
    const tableData = [
      ['Exposé', results.a, results.b, results.a + results.b],
      ['Non-exposé', results.c, results.d, results.c + results.d],
      ['Total', results.a + results.c, results.b + results.d, results.a + results.b + results.c + results.d]
    ];
    
    (doc as any).autoTable({
      startY: 60,
      head: [['Exposition', 'Malade', 'Non-malade', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: secondaryColor,
        textColor: 255,
        fontStyle: 'bold'
      },
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 11,
        cellPadding: 5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
      }
    });
    
    // Mesures d'association
    const measuresY = (doc as any).autoTable.previous.finalY + 20;
    doc.setFontSize(16);
    doc.text('Mesures d\'association', 20, measuresY);
    
    const measuresTable = [
      ['Odds Ratio (OR)', results.or.toString(), results.orInterpretation],
      ['Risque Relatif (RR)', results.rr.toString(), results.rrInterpretation]
    ];
    
    (doc as any).autoTable({
      startY: measuresY + 10,
      head: [['Mesure', 'Valeur', 'Interprétation']],
      body: measuresTable,
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
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 75 }
      }
    });
    
    // Test statistique
    const testY = (doc as any).autoTable.previous.finalY + 20;
    doc.setFontSize(16);
    doc.text('Test statistique', 20, testY);
    
    const testTable = [
      ['Chi-carré (χ²)', results.chi2],
      ['Degrés de liberté', '1'],
      ['Valeur p', results.pValue],
      ['Interprétation', results.chi2Interpretation]
    ];
    
    (doc as any).autoTable({
      startY: testY + 10,
      head: [['Paramètre', 'Valeur']],
      body: testTable,
      theme: 'grid',
      headStyles: {
        fillColor: accentColor,
        textColor: 255,
        fontStyle: 'bold'
      },
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'center' }
      }
    });
    
    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
    doc.text('StatTool - Analyse Épidémiologique 2×2', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });
    
    doc.save('resultats_analyse_2x2_detaille.pdf');
  };

  const totals = calculateTotals();

  return (
    <>
      <style jsx>{`
        #two-by-two-results {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #two-by-two-results.fade-in {
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Tableau 2×2</span>
              </li>
            </ol>
          </nav>
          
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Grid3x3 className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analyse de tableau 2×2
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez l'odds ratio, le risque relatif et le chi-carré
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
                  {/* Table */}
                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Exposition
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Malade
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Non-malade
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Total
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
                              id="cell-a"
                              min="0"
                              step="1"
                              value={a}
                              onChange={(e) => setA(e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="a"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-b"
                              min="0"
                              step="1"
                              value={b}
                              onChange={(e) => setB(e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="b"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400" id="total-exposed">
                            {totals.totalExposed || '-'}
                          </td>
                        </tr>
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Non-exposé
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-c"
                              min="0"
                              step="1"
                              value={c}
                              onChange={(e) => setC(e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="c"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-d"
                              min="0"
                              step="1"
                              value={d}
                              onChange={(e) => setD(e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="d"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400" id="total-unexposed">
                            {totals.totalUnexposed || '-'}
                          </td>
                        </tr>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Total</td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300" id="total-diseased">
                            {totals.totalDiseased || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300" id="total-undiseased">
                            {totals.totalUndiseased || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-gray-100" id="total-all">
                            {totals.totalAll || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      type="button"
                      onClick={calculateResults}
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
                  <div id="two-by-two-results" ref={resultsRef}>
                    {results ? (
                      <div className="space-y-8">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Mesures d'association
                          </h3>
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
                            <div>
                              <dt className="font-medium text-sm mb-1">Odds Ratio (OR)</dt>
                              <dd className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2">
                                {typeof results.or === 'number' ? results.or.toFixed(3) : results.or}
                              </dd>
                              <dd className="text-sm text-gray-600 dark:text-gray-400">{results.orInterpretation}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-sm mb-1">Risque Relatif (RR)</dt>
                              <dd className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                                {typeof results.rr === 'number' ? results.rr.toFixed(3) : results.rr}
                              </dd>
                              <dd className="text-sm text-gray-600 dark:text-gray-400">{results.rrInterpretation}</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            Test du Chi²
                          </h3>
                          <dl className="space-y-3 text-lg">
                            <div className="flex justify-between py-3 border-b border-gray-200 dark:border-slate-600">
                              <dt>Chi² (non corrigé)</dt>
                              <dd className="font-bold">{results.chi2}</dd>
                            </div>
                            <div className="flex justify-between py-3 border-b border-gray-200 dark:border-slate-600">
                              <dt>Degrés de liberté</dt>
                              <dd className="font-bold">1</dd>
                            </div>
                            <div className="flex justify-between py-3">
                              <dt>Valeur p</dt>
                              <dd className="font-bold">{results.pValue}</dd>
                            </div>
                          </dl>
                          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                            {results.chi2Interpretation} ({parseFloat(results.pValue) < 0.05 ? 'p < 0.05' : 'p ≥ 0.05'})
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Saisissez vos données pour voir les résultats</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Les calculs apparaîtront automatiquement</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">OR</span>
                    </div>
                    <h5 className="text-lg font-semibold">Odds Ratio</h5>
                  </div>
                  <p className="text-sm leading-relaxed">
                    Mesure l'association (a×d)/(b×c). OR &gt; 1 = risque accru, OR &lt; 1 = effet protecteur.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-6 shadow-md">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">RR</span>
                    </div>
                    <h5 className="text-lg font-semibold">Risque Relatif</h5>
                  </div>
                  <p className="text-sm leading-relaxed">
                    Compare le risque entre exposés et non-exposés : [a/(a+b)] / [c/(c+d)].
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-6 shadow-md">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">χ²</span>
                    </div>
                    <h5 className="text-lg font-semibold">Test du Chi-carré</h5>
                  </div>
                  <p className="text-sm leading-relaxed">
                    Teste l'indépendance entre exposition et maladie.
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
                      Saisissez les effectifs dans chaque cellule du tableau
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>a</strong> = exposés malades, <strong>b</strong> = exposés non-malades
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>c</strong> = non-exposés malades, <strong>d</strong> = non-exposés non-malades
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les totaux et résultats se mettent à jour automatiquement
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}