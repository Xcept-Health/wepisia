import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
  ChevronDown, Plus, Minus, 
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * R×C Contingency Table Analysis Component
 *
 * This component performs a chi-square test of independence on an R×C contingency table.
 * It calculates:
 *   - Pearson chi-square statistic
 *   - Degrees of freedom
 *   - p‑value (using jStat's chi‑square distribution)
 *   - Cramér's V (measure of association strength)
 *   - Expected frequencies under independence
 *
 * The interface allows dynamic resizing of the table (add/remove rows/columns)
 * and provides a detailed PDF report.
 *
 * All statistical calculations rely on the jStat library for exact results.
 */

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

  // Load jStat dynamically (fallback if not installed via npm)
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const jstatScript = document.createElement('script');
        jstatScript.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        document.body.appendChild(jstatScript);
      }
    };
    loadScripts();
  }, []);

  const hasJStat = !!(window as any).jStat;

  // Generate initial table (2×2)
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
    
    // Recompute row totals
    const newRowTotals = newData.map(row => row.reduce((sum, cell) => sum + cell, 0));
    
    // Recompute column totals
    const newColTotals = Array(tableData.cols).fill(0);
    for (let i = 0; i < tableData.rows; i++) {
      for (let j = 0; j < tableData.cols; j++) {
        newColTotals[j] += newData[i][j];
      }
    }
    
    const newGrandTotal = newRowTotals.reduce((sum, total) => sum + total, 0);
    
    setTableData({
      ...tableData,
      data: newData,
      rowTotals: newRowTotals,
      colTotals: newColTotals,
      grandTotal: newGrandTotal
    });
    
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

    // Expected frequencies under independence
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

    const degreesOfFreedom = (rows - 1) * (cols - 1);
    
    const jStat = (window as any).jStat;
    const pValue = 1 - jStat.chisquare.cdf(chiSquare, degreesOfFreedom);
    
    // Cramér's V
    const n = grandTotal;
    const k = Math.min(rows, cols) - 1;
    const cramersV = Math.sqrt(chiSquare / (n * k));

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

  // Trigger calculation whenever data changes
  useEffect(() => {
    if (hasData && hasJStat) {
      calculateChiSquare();
    } else if (!hasJStat) {
      toast.error('jStat non disponible - les calculs sont désactivés');
    }
  }, [tableData.data, hasData, hasJStat]);

  // Simple animation when results update
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  // Table manipulation handlers
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
    
    // Slight delay to allow state update before filling table
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

      // Colour palette (matching Tailwind slate)
      const colorSlate = {
        50: [248, 250, 252],
        100: [241, 245, 249],
        200: [226, 232, 240],
        300: [203, 213, 225],
        500: [100, 116, 139],
        700: [51, 65, 85],
        900: [15, 23, 42],
      };

      const roundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
        doc.roundedRect(x, y, w, h, r, r, style);
      };

      // ---------- Header ----------
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

      // ---------- Input summary ----------
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

      // ---------- Observed frequencies ----------
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

      // ---------- Expected frequencies ----------
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

      // ---------- Statistical results ----------
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

      // ---------- Interpretation ----------
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

      // ---------- Footer ----------
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

  // render
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
          {/* Left column – input controls */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="p-6 lg:p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center tracking-tight">
                    <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl mr-3">
                      <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Paramètres
                  </h2>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-500 uppercase tracking-widest">
                      {tableData.rows} Lignes
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-500 uppercase tracking-widest">
                      {tableData.cols} Cols
                    </span>
                  </div>
                </div>

                {/* Row/Column steppers */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'Lignes', val: numRows, set: setNumRows, add: addRow, rem: removeRow, min: 2 },
                    { label: 'Colonnes', val: numCols, set: setNumCols, add: addColumn, rem: removeColumn, min: 2 }
                  ].map((ctrl, i) => (
                    <div key={i} className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 tracking-wide">{ctrl.label}</label>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700 p-1 group focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                        <button onClick={ctrl.rem} disabled={ctrl.val <= ctrl.min} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl disabled:opacity-20 transition-all">
                          <Minus className="w-4 h-4" />
                        </button>
                        <input 
                          type="number" 
                          value={ctrl.val} 
                          onChange={(e) => ctrl.set(e.target.value)}
                          className="w-full bg-transparent text-center font-bold text-slate-700 dark:text-slate-200 border-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button onClick={ctrl.add} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={generateTable}
                  className="w-full py-3.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-slate-200 dark:shadow-blue-900/20 active:scale-[0.98]"
                >
                  Mettre à jour la structure
                </button>
              </div>

              {/* Contingency table input */}
              <div className="relative group/table">
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-800 to-transparent z-10 pointer-events-none opacity-0 group-hover/table:opacity-100 transition-opacity" />
                <div className="overflow-x-auto scrollbar-hide select-none">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                        <th className="sticky left-0 z-30 px-6 py-4 text-[11px] font-black text-slate-400 uppercase bg-white dark:bg-slate-800 border-b border-r border-slate-100 dark:border-slate-700">
                          Ref.
                        </th>
                        {Array.from({ length: tableData.cols }, (_, i) => (
                          <th key={i} className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700 min-w-[100px]">
                            C{i + 1}
                          </th>
                        ))}
                        <th className="px-6 py-4 text-center text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase border-b border-slate-100 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-900/10">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {tableData.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="group/row hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="sticky left-0 z-20 px-6 py-4 text-[11px] font-bold text-slate-400 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 group-hover/row:bg-slate-50 dark:group-hover/row:bg-slate-700 transition-colors">
                            L{rowIndex + 1}
                          </td>
                          {row.map((cell, colIndex) => (
                            <td key={colIndex} className="p-1">
                              <input
                                type="number"
                                value={cell}
                                onChange={(e) => updateCellValue(rowIndex, colIndex, e.target.value)}
                                className="w-full text-center py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-transparent rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                              />
                            </td>
                          ))}
                          <td className="px-6 py-4 text-center text-sm font-bold text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-900/10">
                            {tableData.rowTotals[rowIndex]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-sm transition-all active:scale-95"
                >
                  <Info className="w-4 h-4 text-blue-500" /> Charger Exemple
                </button>
                <button
                  onClick={clearForm}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right column – results */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> Analyse des résultats
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
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                    <div className="text-4xl font-bold mt-2">
                      0.00
                    </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main results cards */}
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

                    {/* expected frequencies */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                     
                  
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
       
                    </div>

                    {/* Interpretation block */}
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

        {/* Help modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide : Tableau R×C</h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Section 1  */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    Principe du test du χ²
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Le test du chi-carré (χ²) de Pearson est utilisé pour déterminer s'il existe une 
                    <strong className="text-slate-900 dark:text-white"> association statistiquement significative</strong> entre deux variables catégorielles. 
                    Il compare les fréquences observées dans un tableau de contingence R×C aux fréquences théoriques attendues sous l'hypothèse d'indépendance.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">H₀ : Indépendance</div>
                      <div className="text-slate-500">Les deux variables ne sont pas liées.</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">H₁ : Dépendance</div>
                      <div className="text-slate-500">Il existe une association entre elles.</div>
                    </div>
                  </div>
                </section>

                {/* Section 2  */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    Conditions de validité
                  </h4>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li>
                      <strong className="text-slate-900 dark:text-white">Échantillon indépendant</strong> – Les observations doivent être indépendantes.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Effectifs théoriques suffisants</strong> – Règle courante : 
                      moins de 20 % des cellules doivent avoir un effectif attendu inférieur à 5, et aucun effectif attendu ne doit être inférieur à 1. 
                      Si cette condition n'est pas remplie, envisagez un test exact (p. ex. test de Fisher pour les tableaux 2×2).
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Données non appariées</strong> – Chaque sujet contribue à une seule cellule.
                    </li>
                  </ul>
                </section>

                {/* Section 3  */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    Statistiques calculées
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Chi-carré (χ²)</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Somme des (observé – attendu)² / attendu. Plus la valeur est élevée, plus l'écart à l'indépendance est grand.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Degrés de liberté (ddl)</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        (nombre de lignes – 1) × (nombre de colonnes – 1). Ils déterminent la forme de la distribution du χ² sous H₀.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">p-value</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Probabilité d'observer une valeur du χ² aussi extrême (ou plus) sous H₀. 
                        Si p &lt; 0,05 (seuil usuel), on rejette H₀ au risque de 5 %.
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">V de Cramér</div>
                      <p className="text-slate-600 dark:text-slate-300">
                        Mesure de la force de l'association, variant de 0 (indépendance) à 1 (dépendance parfaite). 
                        Interprétation usuelle :
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0 &lt; V ≤ 0.1 : très faible</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.1 &lt; V ≤ 0.3 : faible</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.3 &lt; V ≤ 0.5 : modéré</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.5 &lt; V ≤ 0.7 : fort</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.7 &lt; V ≤ 1.0 : très fort</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 4  */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      4
                    </div>
                    Méthodes complémentaires
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                    Pour les tableaux 2×2, d'autres tests peuvent être plus appropriés :
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <li>
                      <strong className="text-slate-900 dark:text-white">Test exact de Fisher</strong> – Recommandé lorsque les effectifs théoriques sont faibles (attendu &lt; 5).
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Correction de continuité de Yates</strong> – Parfois appliquée au χ² pour les tableaux 2×2, elle rend le test plus conservateur.
                    </li>
                  </ul>
                  <p className="mt-3 text-sm text-slate-500 italic">
                    Ce calculateur utilise la bibliothèque jStat pour obtenir des p‑values exactes à partir de la distribution du χ².
                  </p>
                </section>

                {/* Section 5  */}
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">
                      5
                    </div>
                    Exemple concret
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm">
                    <p className="mb-2">
                      Supposons que l'on étudie la relation entre le tabagisme (fumeur / non‑fumeur) et la survenue d'un cancer du poumon (oui / non). 
                      Un tableau 2×2 pourrait être :
                    </p>
                    <pre className="bg-white dark:bg-slate-900 p-2 rounded text-xs overflow-x-auto">
                      {`            Cancer oui  Cancer non  Total
        Fumeur          30          20        50
        Non‑fumeur      10          40        50
        Total           40          60       100`}
                    </pre>
                    <p className="mt-2">
                      Le test du χ² donnerait une p-value &lt; 0,001, indiquant une association significative. Le V de Cramér serait d'environ 0,45, soit une force modérée.
                    </p>
                  </div>
                  <a
                    href="https://www.openepi.com/Proportion/Proportion.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Voir sur OpenEpi <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>

              
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// TypeScript interfaces for clarity
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