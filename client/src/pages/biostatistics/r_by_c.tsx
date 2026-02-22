import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
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
  {/* Carte Principale avec gestion des débordements */}
  <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
    
    {/* Header Section */}
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

      {/* Steppers Modernes */}
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

    {/* Zone Tableau avec Dégradé de défilement */}
    <div className="relative group/table">
      {/* Ombre de scroll à droite (invisible si pas de scroll) */}
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

    {/* Footer Actions */}
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

          {/* Colonne droite - résultats */}
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