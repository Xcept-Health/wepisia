import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, BarChart3,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
  ChevronDown, Plus, Minus
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [showStatsDetail, setShowStatsDetail] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [hasData, setHasData] = useState<boolean>(false);

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

  const hasJStat = !!(window as any).jStat;

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
  };

  const calculateChiSquare = () => {
    if (!hasData || !hasJStat) return;

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
    const jStat = (window as any).jStat;
    const pValue = 1 - jStat.chisquare.cdf(chiSquare, degreesOfFreedom);
    
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

  // Auto calculate when data changes
  useEffect(() => {
    if (hasData && hasJStat) {
      calculateChiSquare();
    } else if (!hasJStat) {
      toast.error('jStat non disponible - les calculs sont désactivés');
    }
  }, [tableData.data, hasData, hasJStat]);

  const addRow = () => {
    const newRows = tableData.rows + 1;
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
    if (tableData.rows <= 2) return;
    const newRows = tableData.rows - 1;
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
    const newCols = tableData.cols + 1;
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
    if (tableData.cols <= 2) return;
    const newCols = tableData.cols - 1;
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

  const clearForm = () => {
    setNumRows('2');
    setNumCols('2');
    generateTable();
    toast.info('Champs réinitialisés');
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
      toast.success('Exemple chargé');
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
      toast.success('Résultats copiés');
    } catch (err) {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error('Veuillez d\'abord effectuer un calcul');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Couleurs
      const colorPrimary = Number(results.pValue) < 0.05
        ? { bg: [255, 247, 237], border: [234, 88, 12], text: [234, 88, 12] }
        : { bg: [236, 253, 245], border: [5, 150, 105], text: [5, 150, 105] };
      const colorSlate = {
        50: [248, 250, 252],
        100: [241, 245, 249],
        200: [226, 232, 240],
        300: [203, 213, 225],
        500: [100, 116, 139],
        700: [51, 65, 85],
        900: [15, 23, 42],
      };

      // Helper rectangle arrondi
      const roundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
        doc.roundedRect(x, y, w, h, r, r, style);
      };

      // ---------- EN-TÊTE ----------
      doc.setFillColor(...colorSlate[50]);
      roundedRect(0, 0, 210, 40, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Rapport d'Analyse Tableau R×C", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Calculateur R×C – OpenEpi', 190, 32, { align: 'right' });

      // ---------- CONFIGURATION ----------
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Configuration', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`Lignes: ${tableData.rows}`, 25, y); y += 6;
      doc.text(`Colonnes: ${tableData.cols}`, 25, y); y += 6;
      doc.text(`Effectif total: ${tableData.grandTotal}`, 25, y); y += 6;
      doc.text(`Degrés de liberté: ${results.degreesOfFreedom}`, 25, y); y += 12;

      // ---------- DONNÉES OBSERVÉES ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Données observées', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

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
      
      autoTable(doc, {
        startY: y,
        head: [head],
        body: observedData,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- EFFECTIFS THÉORIQUES ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Effectifs théoriques', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const expectedData = [];
      for (let i = 0; i < tableData.rows; i++) {
        const row = [`Ligne ${i + 1}`];
        for (let j = 0; j < tableData.cols; j++) {
          row.push(results.expected[i][j].toFixed(2));
        }
        expectedData.push(row);
      }

      const expectedHead = ['Ligne/Col'];
      for (let j = 1; j <= tableData.cols; j++) expectedHead.push(`Col ${j}`);

      autoTable(doc, {
        startY: y,
        head: [expectedHead],
        body: expectedData,
        theme: 'grid',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- RÉSULTATS ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Résultats', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const resultsTable = [
        ['Chi-carré de Pearson', results.chiSquare.toFixed(4)],
        ['Degrés de liberté', results.degreesOfFreedom.toString()],
        ['Valeur p', results.pValue.toFixed(6)],
        ['V de Cramér', results.cramersV.toFixed(4)]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Statistique', 'Valeur']],
        body: resultsTable,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- INTERPRÉTATION ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Interprétation', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const splitText = doc.splitTextToSize(results.interpretation, 170);
      doc.text(splitText, 20, y);

      // ---------- PIED DE PAGE ----------
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Calculateur R×C – Fidèle à OpenEpi', 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });

      doc.save('Rapport_RxC.pdf');
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Tableaux R×C</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Analyse de Tableaux R×C</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Test du chi-carré pour tableaux de contingence.</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="hidden md:flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Colonne gauche - saisie */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
  <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
    
    {/* En-tête */}
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
          <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        Paramètres du tableau
      </h2>
      <div className="text-xs font-medium px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
        {tableData.rows} x {tableData.cols}
      </div>
    </div>

    <div className="space-y-6">
      {/* Contrôles Lignes et Colonnes (Design Stepper) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contrôle Lignes */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Lignes
          </label>
          <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-1">
            <button
              onClick={removeRow}
              disabled={tableData.rows <= 2}
              className="p-3 text-slate-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              type="number"
              value={numRows}
              onChange={(e) => setNumRows(e.target.value)}
              className="flex-1 bg-transparent text-center font-bold text-lg text-slate-800 dark:text-slate-100 focus:outline-none border-none p-0"
              min="2"
            />
            <button
              onClick={addRow}
              className="p-3 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contrôle Colonnes */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
            Colonnes
          </label>
          <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-1">
            <button
              onClick={removeColumn}
              disabled={tableData.cols <= 2}
              className="p-3 text-slate-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              type="number"
              value={numCols}
              onChange={(e) => setNumCols(e.target.value)}
              className="flex-1 bg-transparent text-center font-bold text-lg text-slate-800 dark:text-slate-100 focus:outline-none border-none p-0"
              min="2"
            />
            <button
              onClick={addColumn}
              className="p-3 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={generateTable}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all transform active:scale-[0.98]"
      >
        Actualiser la structure
      </button>
    </div>

    {/* Zone du Tableau avec Scroll Horizontal géré */}
    <div className="mt-8 relative">
      <div className="absolute inset-0 border border-slate-200 dark:border-slate-700 rounded-xl pointer-events-none z-10"></div>
      
      {/* overflow-x-auto permet le scroll horizontal */}
      <div className="overflow-x-auto rounded-xl custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                #
              </th>
              {Array.from({ length: tableData.cols }, (_, i) => (
                <th key={i} className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[100px]">
                  Col {i + 1}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {tableData.data.map((row, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                {/* Première colonne (Label Ligne) Sticky pour rester visible au scroll */}
                <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-800/50 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap">
                  Ligne {rowIndex + 1}
                </td>
                
                {/* Cellules Input */}
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="p-1">
                    <input
                      type="number"
                      min="0"
                      value={cell}
                      onChange={(e) => updateCellValue(rowIndex, colIndex, e.target.value)}
                      className="w-full text-center py-2 px-1 text-sm text-slate-700 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-600 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 rounded-lg transition-all outline-none font-medium placeholder:text-slate-300"
                      placeholder="-"
                    />
                  </td>
                ))}
                
                {/* Total Ligne */}
                <td className="px-4 py-3 text-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-slate-50/50 dark:bg-slate-800/30">
                  {tableData.rowTotals[rowIndex]}
                </td>
              </tr>
            ))}
            
            {/* Rangée Totaux Finaux */}
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-t-2 border-slate-200 dark:border-slate-600">
              <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white uppercase sticky left-0 bg-slate-50 dark:bg-slate-700/50 z-10">
                Total
              </td>
              {tableData.colTotals.map((total, i) => (
                <td key={i} className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-slate-300">
                  {total}
                </td>
              ))}
              <td className="px-4 py-3 text-center text-base font-black text-blue-700 dark:text-blue-400">
                {tableData.grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Actions Bas de page */}
    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-4">
      <button
        onClick={loadExample}
        className="flex-1 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <Info className="w-4 h-4 text-blue-500" /> Charger un exemple
      </button>
      <button
        onClick={clearForm}
        className="px-5 py-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-transparent hover:border-red-100 dark:hover:border-red-900/30 transition-all flex items-center justify-center group"
        title="Réinitialiser"
      >
        <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
      </button>
    </div>
  </div>
</div>

          {/* Colonne droite - résultats */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3 text-indigo-500" /> Analyse des résultats
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title="Copier le résultat principal"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Exporter en PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <BarChart3 className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                    <p className="text-slate-400 text-sm mt-2">Les calculs apparaîtront automatiquement</p>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Résultats principaux */}
                    <div className="bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30 p-6 rounded-3xl border">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Résultats statistiques
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-4xl font-bold tracking-tight mb-2 text-orange-600">
                            {results.chiSquare.toFixed(4)}
                          </div>
                          <span className="text-xs">Chi-carré</span>
                        </div>
                        <div>
                          <div className="text-4xl font-bold tracking-tight mb-2 text-orange-600">
                            {results.pValue.toFixed(6)}
                          </div>
                          <span className="text-xs">p-value</span>
                        </div>
                        <div>
                          <div className="text-4xl font-bold tracking-tight mb-2 text-orange-600">
                            {results.degreesOfFreedom}
                          </div>
                          <span className="text-xs">Degrés de liberté</span>
                        </div>
                        <div>
                          <div className="text-4xl font-bold tracking-tight mb-2 text-orange-600">
                            {results.cramersV.toFixed(4)}
                          </div>
                          <span className="text-xs">V de Cramér</span>
                        </div>
                      </div>
                    </div>

                    {/* Détails statistiques avancés (repliables) */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setShowStatsDetail(!showStatsDetail)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            showStatsDetail ? 'rotate-180' : ''
                          }`}
                        />
                        {showStatsDetail ? 'Masquer' : 'Afficher'} les effectifs théoriques
                      </button>

                      {showStatsDetail && (
                        <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold">Ligne / Colonne</th>
                                {Array.from({ length: tableData.cols }, (_, i) => (
                                  <th key={i} className="px-3 py-2 text-center font-semibold">Col {i + 1}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {results.expected.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  <td className="px-3 py-2 font-medium">Ligne {rowIndex + 1}</td>
                                  {row.map((cell, colIndex) => (
                                    <td key={colIndex} className="px-3 py-2 text-center font-mono">{cell.toFixed(2)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Test et Interprétation */}
                    <div
                      className={`p-6 rounded-2xl ${
                        results.pValue < 0.05
                          ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/10'
                          : 'bg-slate-100 border-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> Interprétation
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {results.interpretation}
                      </p>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal d'aide */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide Rapide (OpenEpi)</h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      1
                    </div>
                    Le Principe
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Test du chi-carré pour indépendance dans tableaux R×C, avec V de Cramér pour force d'association.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Méthodes
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Chi² de Pearson, p-value exacte via jStat, V de Cramér. Vérifiez les effectifs théoriques {'>'}5 pour validité.
                  </p>
                </section>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}