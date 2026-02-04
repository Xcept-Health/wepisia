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
  Table,
  Plus,
  Minus,
  AlertTriangle,
  Info,
  BookOpen,
  ExternalLink,
  FileText,
  TrendingUp,
  Users,
  Target,
  Grid3x3,
  Columns
} from 'lucide-react';
import { Link } from 'wouter';

interface TableData {
  rows: number;
  cols: number;
  data: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

interface ChiSquareResults {
  chiSquare: number;
  degreesOfFreedom: number;
  pValue: number;
  cramersV: number;
  expected: number[][];
  interpretation: string;
}

export default function RxcTable() {
  const [numRows, setNumRows] = useState<string>('2');
  const [numCols, setNumCols] = useState<string>('2');
  const [tableData, setTableData] = useState<TableData>({
    rows: 2,
    cols: 2,
    data: [[0, 0], [0, 0]],
    rowTotals: [0, 0],
    colTotals: [0, 0],
    grandTotal: 0
  });
  const [results, setResults] = useState<ChiSquareResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [hasData, setHasData] = useState<boolean>(false);

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

  // Generate initial table
  useEffect(() => {
    generateTable();
  }, []);

  const generateTable = () => {
    const rows = Math.max(2, parseInt(numRows) || 2);
    const cols = Math.max(2, parseInt(numCols) || 2);
    
    const newData = Array(rows).fill(0).map(() => Array(cols).fill(0));
    const rowTotals = Array(rows).fill(0);
    const colTotals = Array(cols).fill(0);
    
    setTableData({
      rows,
      cols,
      data: newData,
      rowTotals,
      colTotals,
      grandTotal: 0
    });
    
    setNumRows(rows.toString());
    setNumCols(cols.toString());
    setResults(null);
    setHasData(false);
  };

  const updateCellValue = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...tableData.data];
    const numValue = parseInt(value) || 0;
    newData[rowIndex][colIndex] = numValue;
    
    // Calculate row totals
    const newRowTotals = newData.map(row => row.reduce((sum, cell) => sum + cell, 0));
    
    // Calculate column totals
    const newColTotals = Array(tableData.cols).fill(0);
    for (let i = 0; i < tableData.rows; i++) {
      for (let j = 0; j < tableData.cols; j++) {
        newColTotals[j] += newData[i][j];
      }
    }
    
    // Calculate grand total
    const newGrandTotal = newRowTotals.reduce((sum, total) => sum + total, 0);
    
    setTableData({
      ...tableData,
      data: newData,
      rowTotals: newRowTotals,
      colTotals: newColTotals,
      grandTotal: newGrandTotal
    });
    
    // Check if we have any data for calculation
    const anyData = newData.some(row => row.some(cell => cell > 0));
    setHasData(anyData);
    
    // Auto-calculate if we have data
    if (anyData && (window as any).jStat) {
      calculateChiSquare();
    }
  };

  const calculateChiSquare = () => {
    if (!hasData || !(window as any).jStat) return;

    const { rows, cols, data, rowTotals, colTotals, grandTotal } = tableData;
    
    if (grandTotal === 0) {
      setResults(null);
      return;
    }

    // Calculate expected frequencies
    const expected: number[][] = [];
    let chiSquare = 0;

    for (let i = 0; i < rows; i++) {
      expected[i] = [];
      for (let j = 0; j < cols; j++) {
        const expectedValue = (rowTotals[i] * colTotals[j]) / grandTotal;
        expected[i][j] = expectedValue;
        
        if (expectedValue > 0) {
          const diff = data[i][j] - expectedValue;
          chiSquare += (diff * diff) / expectedValue;
        }
      }
    }

    // Calculate degrees of freedom
    const degreesOfFreedom = (rows - 1) * (cols - 1);
    
    // Calculate p-value
    const pValue = 1 - (window as any).jStat.chisquare.cdf(chiSquare, degreesOfFreedom);
    
    // Calculate Cramér's V
    const n = grandTotal;
    const k = Math.min(rows, cols) - 1;
    const cramersV = Math.sqrt(chiSquare / (n * k));

    // Create interpretation
    let interpretation = '';
    if (pValue < 0.05) {
      interpretation = `La valeur p de ${pValue.toFixed(6)} indique une association significative entre les variables (p < 0.05). Le V de Cramér de ${cramersV.toFixed(4)} mesure l'intensité de cette association.`;
    } else {
      interpretation = `La valeur p de ${pValue.toFixed(6)} n'indique pas d'association significative entre les variables (p ≥ 0.05). Le V de Cramér de ${cramersV.toFixed(4)} suggère une association faible ou inexistante.`;
    }

    setResults({
      chiSquare,
      degreesOfFreedom,
      pValue,
      cramersV,
      expected,
      interpretation
    });
  };

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clearForm = () => {
    setNumRows('2');
    setNumCols('2');
    generateTable();
  };

  const loadExample = () => {
    setNumRows('3');
    setNumCols('3');
    
    setTimeout(() => {
      const exampleData = [
        [30, 20, 10],
        [15, 25, 20],
        [5, 10, 15]
      ];
      
      setTableData({
        rows: 3,
        cols: 3,
        data: exampleData,
        rowTotals: exampleData.map(row => row.reduce((a, b) => a + b, 0)),
        colTotals: exampleData[0].map((_, colIndex) => 
          exampleData.reduce((sum, row) => sum + row[colIndex], 0)
        ),
        grandTotal: exampleData.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0)
      });
      
      setHasData(true);
    }, 100);
  };

  const copyResults = async () => {
    if (!results) return;
    
    const text = `Résultats de l'analyse R×C\n` +
                 `Chi-carré de Pearson: ${results.chiSquare.toFixed(4)}\n` +
                 `Degrés de liberté: ${results.degreesOfFreedom}\n` +
                 `Valeur p: ${results.pValue.toFixed(6)}\n` +
                 `V de Cramér: ${results.cramersV.toFixed(4)}\n\n` +
                 `Interprétation:\n${results.interpretation}`;
    
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
    doc.text('Analyse de Tableau R×C', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Test du Chi-carré et mesure d\'association', 105, 30, { align: 'center' });
    
    // Informations principales
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Configuration du tableau', 20, 55);
    doc.setFontSize(12);
    const dataYStart = 65;
    doc.text(`Nombre de lignes: ${tableData.rows}`, 20, dataYStart);
    doc.text(`Nombre de colonnes: ${tableData.cols}`, 20, dataYStart + 8);
    doc.text(`Effectif total: ${tableData.grandTotal}`, 20, dataYStart + 16);
    doc.text(`Degrés de liberté: ${results.degreesOfFreedom}`, 20, dataYStart + 24);
    
    // Tableau des données observées
    doc.setFontSize(16);
    doc.text('Données observées', 20, 95);
    
    const observedData = [];
    for (let i = 0; i < tableData.rows; i++) {
      const row = [`Ligne ${i + 1}`];
      for (let j = 0; j < tableData.cols; j++) {
        row.push(tableData.data[i][j].toString());
      }
      row.push(tableData.rowTotals[i].toString());
      observedData.push(row);
    }
    
    const colTotalRow = ['Total'];
    for (let j = 0; j < tableData.cols; j++) {
      colTotalRow.push(tableData.colTotals[j].toString());
    }
    colTotalRow.push(tableData.grandTotal.toString());
    observedData.push(colTotalRow);
    
    const head = ['Ligne/Col'];
    for (let j = 1; j <= tableData.cols; j++) head.push(`Col ${j}`);
    head.push('Total');
    
    (doc as any).autoTable({
      startY: 100,
      head: [head],
      body: observedData,
      theme: 'striped',
      headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' }
    });
    
    // Tableau des effectifs théoriques
    const expectedY = (doc as any).autoTable.previous.finalY + 20;
    doc.setFontSize(16);
    doc.text('Effectifs théoriques', 20, expectedY);
    
    const expectedData = [];
    for (let i = 0; i < tableData.rows; i++) {
      const row = [`Ligne ${i + 1}`];
      for (let j = 0; j < tableData.cols; j++) {
        row.push(results.expected[i][j].toFixed(2));
      }
      expectedData.push(row);
    }
    
    (doc as any).autoTable({
      startY: expectedY + 5,
      head: [head.slice(0, -1)],
      body: expectedData,
      theme: 'grid',
      headStyles: { fillColor: accentColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 }
    });
    
    // Résultats statistiques
    const resultsY = (doc as any).autoTable.previous.finalY + 20;
    doc.setFontSize(16);
    doc.text('Résultats statistiques', 20, resultsY);
    
    const resultsTableData = [
      ['Chi-carré de Pearson', results.chiSquare.toFixed(4)],
      ['Degrés de liberté', results.degreesOfFreedom.toString()],
      ['Valeur p', results.pValue.toFixed(6)],
      ['V de Cramér', results.cramersV.toFixed(4)]
    ];
    
    (doc as any).autoTable({
      startY: resultsY + 5,
      head: [['Statistique', 'Valeur']],
      body: resultsTableData,
      theme: 'plain',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });
    
    // Interprétation
    const interpretationY = (doc as any).autoTable.previous.finalY + 15;
    doc.setFillColor(240, 240, 255);
    doc.rect(20, interpretationY, 170, 25, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.rect(20, interpretationY, 170, 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Interprétation:', 25, interpretationY + 8);
    doc.text(results.interpretation, 25, interpretationY + 16);
    
    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
    doc.text('StatTool - Analyse Tableau R×C', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });
    
    doc.save('resultats_tableau_rxc_detaille.pdf');
  };

  // Auto calculate when data changes
  useEffect(() => {
    if (hasData && (window as any).jStat) {
      calculateChiSquare();
    }
  }, [tableData.data, hasData]);

  const addRow = () => {
    const newRows = parseInt(numRows) + 1;
    setNumRows(newRows.toString());
    
    const newData = [...tableData.data, Array(tableData.cols).fill(0)];
    setTableData({
      ...tableData,
      rows: newRows,
      data: newData,
      rowTotals: [...tableData.rowTotals, 0]
    });
  };

  const removeRow = () => {
    if (parseInt(numRows) <= 2) return;
    const newRows = parseInt(numRows) - 1;
    setNumRows(newRows.toString());
    
    const newData = tableData.data.slice(0, -1);
    const newRowTotals = tableData.rowTotals.slice(0, -1);
    
    setTableData({
      ...tableData,
      rows: newRows,
      data: newData,
      rowTotals: newRowTotals
    });
  };

  const addColumn = () => {
    const newCols = parseInt(numCols) + 1;
    setNumCols(newCols.toString());
    
    const newData = tableData.data.map(row => [...row, 0]);
    setTableData({
      ...tableData,
      cols: newCols,
      data: newData,
      colTotals: [...tableData.colTotals, 0]
    });
  };

  const removeColumn = () => {
    if (parseInt(numCols) <= 2) return;
    const newCols = parseInt(numCols) - 1;
    setNumCols(newCols.toString());
    
    const newData = tableData.data.map(row => row.slice(0, -1));
    const newColTotals = tableData.colTotals.slice(0, -1);
    
    setTableData({
      ...tableData,
      cols: newCols,
      data: newData,
      colTotals: newColTotals
    });
  };

  return (
    <>
      <style jsx>{`
        #results > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #results > div.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
        .table-header {
          padding: 1rem 0.5rem;
          text-align: center;
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
        }
        .table-cell {
          padding: 0.75rem 0.5rem;
          text-align: center;
          vertical-align: middle;
        }
        .row-label {
          text-align: left;
          padding-left: 1rem;
          font-weight: 500;
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Tableaux R×C</span>
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
                Tableaux R×C
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Analyse des associations dans les tableaux de contingence de taille arbitraire.
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
                    <Columns className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Configuration du tableau
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="num-rows" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Lignes
                      </label>
                      <input
                        type="number"
                        id="num-rows"
                        value={numRows}
                        onChange={(e) => setNumRows(e.target.value)}
                        min="2"
                        step="1"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <div className="flex space-x-2 mt-2">
                        <button
                          type="button"
                          onClick={addRow}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={removeRow}
                          disabled={parseInt(numRows) <= 2}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="num-cols" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Colonnes
                      </label>
                      <input
                        type="number"
                        id="num-cols"
                        value={numCols}
                        onChange={(e) => setNumCols(e.target.value)}
                        min="2"
                        step="1"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <div className="flex space-x-2 mt-2">
                        <button
                          type="button"
                          onClick={addColumn}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={removeColumn}
                          disabled={parseInt(numCols) <= 2}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={generateTable}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                  >
                    <Table className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Générer le tableau
                  </button>
                </div>
              </div>

              {/* Input Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Edit className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Saisie des données
                  </h2>
                </div>
                <div className="p-6 overflow-x-auto">
                  <div id="data-table-container">
                    <div className="overflow-x-auto">
                      <table className="w-full rounded-xl border border-gray-200 dark:border-slate-600">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <tr>
                            <th className="table-header row-label">Lignes/Colonnes</th>
                            {Array.from({ length: tableData.cols }, (_, colIndex) => (
                              <th key={colIndex} className="table-header">Col {colIndex + 1}</th>
                            ))}
                            <th className="table-header">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                          {Array.from({ length: tableData.rows }, (_, rowIndex) => (
                            <tr key={rowIndex} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                              <td className="table-cell row-label text-sm font-medium text-gray-900 dark:text-gray-100">
                                Ligne {rowIndex + 1}
                              </td>
                              {Array.from({ length: tableData.cols }, (_, colIndex) => (
                                <td key={colIndex} className="table-cell">
                                  <input
                                    type="number"
                                    className="data-cell w-16 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={tableData.data[rowIndex][colIndex] || ''}
                                    onChange={(e) => updateCellValue(rowIndex, colIndex, e.target.value)}
                                  />
                                </td>
                              ))}
                              <td className="table-cell text-sm font-medium text-gray-600 dark:text-gray-400">
                                <span className="row-total">{tableData.rowTotals[rowIndex]}</span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                            <td className="table-cell row-label text-sm font-semibold text-gray-900 dark:text-gray-100">Total</td>
                            {Array.from({ length: tableData.cols }, (_, colIndex) => (
                              <td key={colIndex} className="table-cell text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <span className="col-total">{tableData.colTotals[colIndex]}</span>
                              </td>
                            ))}
                            <td className="table-cell text-sm font-bold text-gray-900 dark:text-gray-100">
                              <span className="grand-total">{tableData.grandTotal}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      type="button"
                      onClick={calculateChiSquare}
                      disabled={!hasData}
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
                  <div id="results" ref={resultsRef}>
                    {results ? (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Chi-carré de Pearson</span>
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{results.chiSquare.toFixed(4)}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-600/50 rounded-lg">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Degrés de liberté</span>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{results.degreesOfFreedom}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
                            <span className="text-sm font-semibold text-green-900 dark:text-green-100">Valeur p</span>
                            <span className="text-sm font-bold text-green-700 dark:text-green-300">{results.pValue.toFixed(6)}</span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                            <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">V de Cramér</span>
                            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{results.cramersV.toFixed(4)}</span>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                            Interprétation
                          </h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {results.interpretation}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Effectifs théoriques
                          </h3>
                          <div id="expected-table-container" className="overflow-x-auto">
                            <table className="w-full rounded-xl border border-gray-200 dark:border-slate-600 text-sm">
                              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                                <tr>
                                  <th className="table-header row-label">Lignes/Colonnes</th>
                                  {Array.from({ length: tableData.cols }, (_, colIndex) => (
                                    <th key={colIndex} className="table-header">Col {colIndex + 1}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                                {Array.from({ length: tableData.rows }, (_, rowIndex) => (
                                  <tr key={rowIndex} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                    <td className="table-cell row-label text-sm font-medium text-gray-900 dark:text-gray-100">
                                      Ligne {rowIndex + 1}
                                    </td>
                                    {Array.from({ length: tableData.cols }, (_, colIndex) => (
                                      <td key={colIndex} className="table-cell text-sm text-gray-700 dark:text-gray-300">
                                        {results.expected[rowIndex][colIndex].toFixed(2)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div id="no-results" className="">
                        <div className="text-center py-16">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-lg">Générez un tableau et entrez vos données pour voir les résultats</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Les calculs apparaîtront automatiquement</p>
                        </div>
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
                      Entrez le nombre de lignes et de colonnes ou utilisez les boutons pour ajuster.
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
                      Les résultats se calculent automatiquement quand vous modifiez les données.
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Utilisez Exemple pour charger des données de démonstration.
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