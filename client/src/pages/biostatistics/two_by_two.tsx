import React, { useState, useEffect, useRef } from 'react';
import {
  Grid2X2,
  ChevronRight,
  Calculator,
  BarChart3,
  Copy,
  FileDown,
  HelpCircle,
  X,
} from 'lucide-react';

interface TwoByTwoResults {
  a: number;
  b: number;
  c: number;
  d: number;
  or: string;
  rr: string;
  chi2: string;
  pValue: string;
}

const TwoByTwo: React.FC = () => {
  const [cellA, setCellA] = useState<number>(0);
  const [cellB, setCellB] = useState<number>(0);
  const [cellC, setCellC] = useState<number>(0);
  const [cellD, setCellD] = useState<number>(0);
  const [results, setResults] = useState<TwoByTwoResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-calculate on any cell change
  useEffect(() => {
    if (cellA > 0 || cellB > 0 || cellC > 0 || cellD > 0) {
      calculateTwoByTwo();
    } else {
      setResults(null);
    }
  }, [cellA, cellB, cellC, cellD]);

  // Trigger animation when results change
  useEffect(() => {
    if (results && resultsRef.current) {
      const child = resultsRef.current.querySelector(':scope > div');
      if (child) {
        (child as HTMLElement).classList.remove('fade-in');
        void (child as HTMLElement).offsetWidth;
        (child as HTMLElement).classList.add('fade-in');
      }
    }
  }, [results]);

  const calculateTwoByTwo = () => {
    const n = cellA + cellB + cellC + cellD;
    if (n === 0) {
      setResults(null);
      return;
    }

    // Calculate Odds Ratio
    const or =
      cellB * cellC === 0 ? Infinity : (cellA * cellD) / (cellB * cellC);

    // Calculate Relative Risk
    const rr =
      cellA + cellB === 0 || cellC + cellD === 0
        ? Infinity
        : (cellA / (cellA + cellB)) / (cellC / (cellC + cellD));

    // Calculate Chi-square (uncorrected)
    const expectedA = ((cellA + cellB) * (cellA + cellC)) / n;
    const expectedB = ((cellA + cellB) * (cellB + cellD)) / n;
    const expectedC = ((cellC + cellD) * (cellA + cellC)) / n;
    const expectedD = ((cellC + cellD) * (cellB + cellD)) / n;

    const chi2 =
      (expectedA > 0 ? Math.pow(cellA - expectedA, 2) / expectedA : 0) +
      (expectedB > 0 ? Math.pow(cellB - expectedB, 2) / expectedB : 0) +
      (expectedC > 0 ? Math.pow(cellC - expectedC, 2) / expectedC : 0) +
      (expectedD > 0 ? Math.pow(cellD - expectedD, 2) / expectedD : 0);

    // Calculate p-value using chi-square CDF
    const pValue = calculatePValue(chi2, 1);

    setResults({
      a: cellA,
      b: cellB,
      c: cellC,
      d: cellD,
      or: or === Infinity ? '∞' : or.toFixed(3),
      rr: rr === Infinity ? '∞' : rr.toFixed(3),
      chi2: chi2.toFixed(3),
      pValue: pValue.toFixed(4),
    });
  };

  const calculatePValue = (chiSquare: number, df: number): number => {
    if (typeof (window as any).jStat !== 'undefined') {
      return 1 - (window as any).jStat.chisquare.cdf(chiSquare, df);
    }
    return Math.exp(-chiSquare / 2);
  };

  const clear = () => {
    setCellA(0);
    setCellB(0);
    setCellC(0);
    setCellD(0);
    setResults(null);
  };

  const loadExample = () => {
    setCellA(60);
    setCellB(40);
    setCellC(30);
    setCellD(70);
  };

  const copyResults = async () => {
    if (!results || !resultsRef.current) return;
    try {
      const text = resultsRef.current.innerText;
      await navigator.clipboard.writeText(text);
      const copyBtn = document.getElementById('copy-btn-2x2');
      if (copyBtn) {
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = original;
        }, 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const exportPDF = async () => {
    if (!results) return;

    try {
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
      doc.setFont('helvetica', 'bold');
      doc.text('Résultats de l\'Analyse 2×2', 105, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Odds Ratio, Risque Relatif & Test du Chi-carré', 105, 30, {
        align: 'center',
      });

      // Contingency table
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Tableau de contingence', 20, 55);

      const tableData: (string | number)[][] = [
        [
          'Exposé',
          results.a,
          results.b,
          results.a + results.b,
        ],
        [
          'Non-exposé',
          results.c,
          results.d,
          results.c + results.d,
        ],
        [
          'Total',
          results.a + results.c,
          results.b + results.d,
          results.a + results.b + results.c + results.d,
        ],
      ];

      (doc as any).autoTable({
        startY: 60,
        head: [['Exposition', 'Malade', 'Non-malade', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: secondaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      // Results section
      const resultsY = (doc as any).autoTable.previous.finalY + 20;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Mesures d\'association', 20, resultsY);

      const measuresTable: (string | number)[][] = [
        ['Odds Ratio (OR)', results.or],
        ['Risque Relatif (RR)', results.rr],
      ];

      (doc as any).autoTable({
        startY: resultsY + 10,
        head: [['Mesure', 'Valeur']],
        body: measuresTable,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Chi-square test
      const testY = (doc as any).autoTable.previous.finalY + 20;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Test statistique', 20, testY);

      const testTable: (string | number)[][] = [
        ['Chi-carré (χ²)', results.chi2],
        ['Degrés de liberté', '1'],
        ['Valeur p', results.pValue],
      ];

      (doc as any).autoTable({
        startY: testY + 10,
        head: [['Paramètre', 'Valeur']],
        body: testTable,
        theme: 'grid',
        headStyles: {
          fillColor: accentColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      doc.save('resultats_analyse_2x2_detaille.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <>
      <style>{`
        #results-container-2x2 > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #results-container-2x2 > div.fade-in {
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
                <a
                  href="/"
                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                >
                  Accueil
                </a>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  Tableau 2×2
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Grid2X2 className="w-6 h-6 text-white" strokeWidth={1.5} />
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
                    <Calculator className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Saisie des données
                  </h2>
                </div>
                <div className="p-6">
                  {/* Data Table */}
                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600 mb-6">
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
                              min="0"
                              step="1"
                              value={cellA}
                              onChange={(e) =>
                                setCellA(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="a"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={cellB}
                              onChange={(e) =>
                                setCellB(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="b"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            {cellA + cellB}
                          </td>
                        </tr>
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Non-exposé
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={cellC}
                              onChange={(e) =>
                                setCellC(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="c"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={cellD}
                              onChange={(e) =>
                                setCellD(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="d"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            {cellC + cellD}
                          </td>
                        </tr>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {cellA + cellC}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {cellB + cellD}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                            {cellA + cellB + cellC + cellD}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={clear}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <X className="w-4 h-4 mr-2" strokeWidth={1.5} />
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
                        id="copy-btn-2x2"
                        onClick={copyResults}
                        className="p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        aria-label="Copier les résultats"
                      >
                        <Copy className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={exportPDF}
                        className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        aria-label="Exporter en PDF"
                      >
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div id="results-container-2x2">
                    {results ? (
                      <div ref={resultsRef} className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                            Mesures d'association
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">
                                Odds Ratio (OR)
                              </p>
                              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                                {results.or}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">
                                Risque Relatif (RR)
                              </p>
                              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                                {results.rr}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
                          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
                            Test du Chi²
                          </h3>
                          <dl className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-green-200 dark:border-green-700">
                              <dt className="text-sm font-medium text-green-800 dark:text-green-200">
                                Chi² (non corrigé)
                              </dt>
                              <dd className="font-bold text-green-700 dark:text-green-300">
                                {results.chi2}
                              </dd>
                            </div>
                            <div className="flex justify-between py-2 border-b border-green-200 dark:border-green-700">
                              <dt className="text-sm font-medium text-green-800 dark:text-green-200">
                                Degrés de liberté
                              </dt>
                              <dd className="font-bold text-green-700 dark:text-green-300">
                                1
                              </dd>
                            </div>
                            <div className="flex justify-between py-2">
                              <dt className="text-sm font-medium text-green-800 dark:text-green-200">
                                Valeur p
                              </dt>
                              <dd className="font-bold text-green-700 dark:text-green-300">
                                {results.pValue}
                              </dd>
                            </div>
                          </dl>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-4">
                            {parseFloat(results.pValue) < 0.05
                              ? 'Association significative (p < 0.05)'
                              : 'Aucune association significative (p ≥ 0.05)'}
                          </p>
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
                          Les calculs apparaîtront automatiquement
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Help Button */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          aria-label="Aide et ressources"
        >
          <HelpCircle className="w-7 h-7" strokeWidth={1.5} />
        </button>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 overflow-y-auto">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 my-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Aide &amp; Ressources
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-7 h-7" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300">
                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                    <HelpCircle className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Comment utiliser cet outil
                  </h4>
                  <ul className="space-y-3 text-base bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Saisissez les effectifs dans chaque cellule du tableau
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>a</strong> = exposés malades, <strong>b</strong> =
                      exposés non-malades
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>c</strong> = non-exposés malades,{' '}
                      <strong>d</strong> = non-exposés non-malades
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les résultats se calculent automatiquement
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-6 text-blue-700 dark:text-blue-400">
                    Mesures calculées
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            OR
                          </span>
                        </div>
                        <h5 className="text-lg font-semibold">Odds Ratio</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Mesure l'association (a×d)/(b×c). OR &gt; 1 = risque
                        accru, OR &lt; 1 = effet protecteur.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            RR
                          </span>
                        </div>
                        <h5 className="text-lg font-semibold">Risque Relatif</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Compare le risque entre exposés et non-exposés :
                        [a/(a+b)] / [c/(c+d)].
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            χ²
                          </span>
                        </div>
                        <h5 className="text-lg font-semibold">Test du Chi-carré</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Teste l'indépendance entre exposition et maladie.
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
};

export default TwoByTwo;
