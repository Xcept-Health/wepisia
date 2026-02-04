import React, { useState, useEffect, useRef } from 'react';
import {
  Grid3x3,
  ChevronRight,
  Calculator,
  BarChart3,
  Copy,
  FileDown,
  HelpCircle,
  X,
  Plus,
  Minus,
} from 'lucide-react';

// Type definitions
interface RxCResults {
  observed: number[][];
  expected: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  chiSquare: string;
  degreesOfFreedom: number;
  pValue: string;
  cramersV: string;
  rows: number;
  cols: number;
}

interface TableDimensions {
  rows: number;
  cols: number;
}


const RxCTable: React.FC = () => {
  // State management
  const [numRows, setNumRows] = useState<number>(2);
  const [numCols, setNumCols] = useState<number>(2);
  const [observedData, setObservedData] = useState<number[][]>([
    [0, 0],
    [0, 0],
  ]);
  const [results, setResults] = useState<RxCResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize table on mount
  useEffect(() => {
    generateTable(numRows, numCols);
  }, []);

  // Generate table structure
  const generateTable = (rows: number, cols: number) => {
    const newData: number[][] = [];
    for (let i = 0; i < rows; i++) {
      newData[i] = [];
      for (let j = 0; j < cols; j++) {
        newData[i][j] = 0;
      }
    }
    setObservedData(newData);
    setResults(null);
    setError(null);
  };

  // Update a single cell value
  const updateCell = (row: number, col: number, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0) return;

    const newData = observedData.map((r) => [...r]);
    newData[row][col] = numValue;
    setObservedData(newData);
    setError(null);

    // Auto-calculate if data is valid
    if (validateDataForCalculation(newData)) {
      calculateResults(newData);
    }
  };

  // Validate data for calculation
  const validateDataForCalculation = (data: number[][]): boolean => {
    let hasData = false;
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].length; j++) {
        if (data[i][j] > 0) {
          hasData = true;
          break;
        }
      }
      if (hasData) break;
    }

    // Check if any row or column is empty
    for (let i = 0; i < data.length; i++) {
      let rowSum = 0;
      for (let j = 0; j < data[i].length; j++) {
        rowSum += data[i][j];
      }
      if (rowSum === 0) return false;
    }

    for (let j = 0; j < data[0].length; j++) {
      let colSum = 0;
      for (let i = 0; i < data.length; i++) {
        colSum += data[i][j];
      }
      if (colSum === 0) return false;
    }

    return hasData;
  };

  // Calculate statistical results
  const calculateResults = (data: number[][]) => {
    const rows = data.length;
    const cols = data[0].length;

    // Calculate totals
    const rowTotals: number[] = [];
    const colTotals: number[] = new Array(cols).fill(0);
    let grandTotal = 0;

    for (let i = 0; i < rows; i++) {
      let rowSum = 0;
      for (let j = 0; j < cols; j++) {
        rowSum += data[i][j];
        colTotals[j] += data[i][j];
      }
      rowTotals[i] = rowSum;
      grandTotal += rowSum;
    }

    // Calculate expected frequencies and chi-square
    const expected: number[][] = [];
    let chiSquare = 0;

    for (let i = 0; i < rows; i++) {
      expected[i] = [];
      for (let j = 0; j < cols; j++) {
        expected[i][j] = (rowTotals[i] * colTotals[j]) / grandTotal;
        const diff = data[i][j] - expected[i][j];
        chiSquare += (diff * diff) / expected[i][j];
      }
    }

    // Calculate degrees of freedom
    const degreesOfFreedom = (rows - 1) * (cols - 1);

    // Calculate p-value using chi-square CDF (approximation)
    const pValue = calculatePValue(chiSquare, degreesOfFreedom);

    // Calculate Cramér's V
    const cramersV = Math.sqrt(
      chiSquare / (grandTotal * Math.min(rows - 1, cols - 1))
    );

    const newResults: RxCResults = {
      observed: data,
      expected,
      rowTotals,
      colTotals,
      grandTotal,
      chiSquare: chiSquare.toFixed(4),
      degreesOfFreedom,
      pValue: pValue.toFixed(6),
      cramersV: cramersV.toFixed(4),
      rows,
      cols,
    };

    setResults(newResults);
    setError(null);

    // Trigger animation
    if (resultsRef.current) {
      const children = resultsRef.current.querySelectorAll(':scope > div');
      children.forEach((el) => {
        (el as HTMLElement).classList.remove('fade-in');
        void (el as HTMLElement).offsetWidth;
        (el as HTMLElement).classList.add('fade-in');
      });
    }
  };

  // Chi-square CDF approximation (simplified)
  const calculatePValue = (chiSquare: number, df: number): number => {
    // Simple approximation using incomplete gamma function
    // For production, use jStat library
    if (typeof (window as any).jStat !== 'undefined') {
      return 1 - (window as any).jStat.chisquare.cdf(chiSquare, df);
    }
    // Fallback approximation
    return Math.exp(-chiSquare / 2);
  };

  // Handle row/col adjustment
  const adjustDimensions = (newRows: number, newCols: number) => {
    if (newRows < 2 || newCols < 2) return;
    setNumRows(newRows);
    setNumCols(newCols);
    generateTable(newRows, newCols);
  };

  // Clear all data
  const clear = () => {
    setNumRows(2);
    setNumCols(2);
    generateTable(2, 2);
    setResults(null);
    setError(null);
  };

  // Load example data
  const loadExample = () => {
    const exampleData = [
      [30, 20],
      [10, 40],
    ];
    setNumRows(2);
    setNumCols(2);
    setObservedData(exampleData);
    calculateResults(exampleData);
  };

  // Copy results to clipboard
  const copyResults = async () => {
    if (!results || !resultsRef.current) return;
    try {
      const text = resultsRef.current.innerText;
      await navigator.clipboard.writeText(text);
      // Visual feedback
      const copyBtn = document.getElementById('copy-btn');
      if (copyBtn) {
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = original;
        }, 2000);
      }
    } catch (err) {
      setError('Échec de la copie');
    }
  };

  // Export to PDF
  const exportPDF = async () => {
    if (!results) {
      setError('Veuillez d\'abord effectuer un calcul');
      return;
    }

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
      doc.text('Analyse de Tableau R×C', 105, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Test du Chi-carré et mesure d\'association', 105, 30, {
        align: 'center',
      });

      // Configuration
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text('Configuration du tableau', 20, 55);
      doc.setFontSize(12);
      const dataYStart = 65;
      doc.text(`Nombre de lignes : ${results.rows}`, 20, dataYStart);
      doc.text(`Nombre de colonnes : ${results.cols}`, 20, dataYStart + 8);
      doc.text(`Effectif total : ${results.grandTotal}`, 20, dataYStart + 16);
      doc.text(
        `Degrés de liberté : ${results.degreesOfFreedom}`,
        20,
        dataYStart + 24
      );

      // Observed data table
      doc.setFontSize(16);
      doc.text('Données observées', 20, 95);

      const tableData: (string | number)[][] = [];
      for (let i = 0; i < results.rows; i++) {
        const row: (string | number)[] = [`Ligne ${i + 1}`];
        for (let j = 0; j < results.cols; j++) {
          row.push(results.observed[i][j]);
        }
        row.push(results.rowTotals[i]);
        tableData.push(row);
      }
      const colTotalRow: (string | number)[] = ['Total'];
      for (let j = 0; j < results.cols; j++) {
        colTotalRow.push(results.colTotals[j]);
      }
      colTotalRow.push(results.grandTotal);
      tableData.push(colTotalRow);

      const head = ['Ligne/Col'];
      for (let j = 1; j <= results.cols; j++) {
        head.push(`Col ${j}`);
      }
      head.push('Total');

      (doc as any).autoTable({
        startY: 100,
        head: [head],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: secondaryColor, textColor: [255, 255, 255] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2 },
      });

      // Results section
      const resultsY = (doc as any).autoTable.previous.finalY + 20;
      doc.setFontSize(16);
      doc.text('Résultats statistiques', 20, resultsY);

      const resultsTableData = [
        ['Chi-carré de Pearson', results.chiSquare],
        ['Degrés de liberté', results.degreesOfFreedom],
        ['Valeur p', results.pValue],
        ['V de Cramér', results.cramersV],
      ];

      (doc as any).autoTable({
        startY: resultsY + 5,
        head: [['Statistique', 'Valeur']],
        body: resultsTableData,
        theme: 'plain',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Généré le ' + new Date().toLocaleDateString('fr-FR'),
        20,
        pageHeight - 20
      );
      doc.text('StatTool - Analyse Tableau R×C', 105, pageHeight - 20, {
        align: 'center',
      });

      doc.save('resultats_tableau_rxc_detaille.pdf');
    } catch (err) {
      setError('Erreur lors de l\'export PDF');
    }
  };

  // Calculate row and column totals for display
  const getRowTotal = (rowIndex: number): number => {
    return observedData[rowIndex].reduce((sum, val) => sum + val, 0);
  };

  const getColTotal = (colIndex: number): number => {
    return observedData.reduce((sum, row) => sum + (row[colIndex] || 0), 0);
  };

  const getGrandTotal = (): number => {
    return observedData.reduce(
      (sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0),
      0
    );
  };

  return (
    <>
      <style>{`
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
                  Tableaux R×C
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Grid3x3 className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Tableaux R×C
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Analyse des associations dans les tableaux de contingence de
                taille arbitraire.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              {/* Configuration Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Configuration du tableau
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="num-rows"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Lignes
                      </label>
                      <input
                        type="number"
                        id="num-rows"
                        min="2"
                        step="1"
                        value={numRows}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 2;
                          setNumRows(val);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <div className="flex space-x-2 mt-2">
                        <button
                          type="button"
                          onClick={() => adjustDimensions(numRows + 1, numCols)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustDimensions(numRows - 1, numCols)}
                          disabled={numRows <= 2}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="num-cols"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Colonnes
                      </label>
                      <input
                        type="number"
                        id="num-cols"
                        min="2"
                        step="1"
                        value={numCols}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 2;
                          setNumCols(val);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <div className="flex space-x-2 mt-2">
                        <button
                          type="button"
                          onClick={() => adjustDimensions(numRows, numCols + 1)}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustDimensions(numRows, numCols - 1)}
                          disabled={numCols <= 2}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => generateTable(numRows, numCols)}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                  >
                    <Grid3x3 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Générer le tableau
                  </button>
                </div>
              </div>

              {/* Data Input Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Saisie des données
                  </h2>
                </div>
                <div className="p-6 overflow-x-auto">
                  {/* Data Table */}
                  <div className="mb-6">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600">
                            Lignes/Colonnes
                          </th>
                          {Array.from({ length: numCols }).map((_, j) => (
                            <th
                              key={`col-header-${j}`}
                              className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600"
                            >
                              Col {j + 1}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: numRows }).map((_, i) => (
                          <tr
                            key={`row-${i}`}
                            className="hover:bg-gray-50 dark:hover:bg-slate-700/50"
                          >
                            <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30">
                              Ligne {i + 1}
                            </td>
                            {Array.from({ length: numCols }).map((_, j) => (
                              <td
                                key={`cell-${i}-${j}`}
                                className="px-4 py-3 border border-gray-200 dark:border-slate-600"
                              >
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={observedData[i]?.[j] || 0}
                                  onChange={(e) => updateCell(i, j, e.target.value)}
                                  className="w-full px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30">
                              {getRowTotal(i)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600">
                            Total
                          </td>
                          {Array.from({ length: numCols }).map((_, j) => (
                            <td
                              key={`col-total-${j}`}
                              className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600"
                            >
                              {getColTotal(j)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600">
                            {getGrandTotal()}
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
                        id="copy-btn"
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
                  <div id="results-container">
                    {results ? (
                      <div ref={resultsRef} className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                            Résumé
                          </h3>
                          <p className="text-blue-800 dark:text-blue-200">
                            Chi-carré :{' '}
                            <strong>{results.chiSquare}</strong> | Valeur p :{' '}
                            <strong>{results.pValue}</strong> | V de Cramér :{' '}
                            <strong>{results.cramersV}</strong>
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                              Chi-carré de Pearson
                            </span>
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                              {results.chiSquare}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-600/50 rounded-lg">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Degrés de liberté
                            </span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {results.degreesOfFreedom}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
                            <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                              Valeur p
                            </span>
                            <span className="text-sm font-bold text-green-700 dark:text-green-300">
                              {results.pValue}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
                            <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                              V de Cramér
                            </span>
                            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                              {results.cramersV}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                            Interprétation
                          </h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {parseFloat(results.pValue) < 0.05
                              ? `La valeur p de ${results.pValue} indique une association significative entre les variables (p < 0,05). Le V de Cramér de ${results.cramersV} mesure l'intensité de cette association.`
                              : `La valeur p de ${results.pValue} n'indique pas d'association significative entre les variables (p ≥ 0,05). Le V de Cramér de ${results.cramersV} suggère une association faible ou inexistante.`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          Générez un tableau et entrez vos données pour voir les
                          résultats
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
                      Entrez le nombre de lignes et de colonnes ou utilisez les
                      boutons pour ajuster.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Cliquez sur Générer pour créer le tableau.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Entrez les effectifs dans chaque cellule.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les totaux sont calculés automatiquement.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les résultats se calculent automatiquement quand vous
                      modifiez les données.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Utilisez Exemple pour charger des données de démonstration.
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-6 text-blue-700 dark:text-blue-400">
                    Mesures calculées
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">χ²</span>
                        </div>
                        <h5 className="text-lg font-semibold">
                          Chi-carré de Pearson
                        </h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Teste l'hypothèse nulle d'indépendance entre les
                        variables. Une valeur élevée indique une association
                        significative entre les lignes et les colonnes.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-6 shadow-md">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">V</span>
                        </div>
                        <h5 className="text-lg font-semibold">V de Cramér</h5>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Mesure standardisée de l'association (0 à 1). Utile pour
                        comparer la force des associations dans des tableaux de
                        tailles différentes.
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

export default RxCTable;
