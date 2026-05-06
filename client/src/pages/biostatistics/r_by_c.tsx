import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
  ChevronDown, Plus, Minus, 
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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

    // Build interpretation using translation
    let interpretation = '';
    if (pValue < 0.05) {
      interpretation = t('rByC.significantInterpretation', {
        p: pValue.toFixed(6),
        v: cramersV.toFixed(4)
      });
    } else {
      interpretation = t('rByC.nonSignificantInterpretation', {
        p: pValue.toFixed(6),
        v: cramersV.toFixed(4)
      });
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
      toast.error(t('rByC.jStatError'));
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
    if (tableData.rows <= 2) {
      toast.warning(t('rByC.minRows'));
      return;
    }
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
    if (tableData.cols <= 2) {
      toast.warning(t('rByC.minCols'));
      return;
    }
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
    toast.info(t('rByC.clearMessage'));
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
      toast.success(t('rByC.exampleLoaded'));
    }, 100);
  };

  const copyResults = async () => {
    if (!results) return;
    
    const text = `${t('rByC.copyPrefix')}\n` +
                 `${t('rByC.chiSquare')}: ${results.chiSquare.toFixed(4)}\n` +
                 `${t('rByC.df')}: ${results.degreesOfFreedom}\n` +
                 `${t('rByC.pValue')}: ${results.pValue.toExponential(6)}\n` +
                 `${t('rByC.cramersV')}: ${results.cramersV.toFixed(4)}\n\n` +
                 `${t('rByC.interpretation')}:\n${results.interpretation}`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('rByC.copySuccess'));
    } catch (err) {
      toast.error(t('rByC.copyError'));
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error(t('rByC.exportNoData'));
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

      // Header
      doc.setFillColor(...colorSlate[50]);
      roundedRect(0, 0, 210, 40, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('rByC.reportTitle'), 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`${t('rByC.reportGenerated')} ${new Date().toLocaleDateString('fr-FR')} ${t('rByC.at')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text(t('rByC.reportSubtitle'), 190, 32, { align: 'right' });

      // Input summary
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('rByC.configuration'), 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`${t('rByC.rows')}: ${tableData.rows}`, 25, y); y += 6;
      doc.text(`${t('rByC.columns')}: ${tableData.cols}`, 25, y); y += 6;
      doc.text(`${t('rByC.grandTotal')}: ${tableData.grandTotal}`, 25, y); y += 6;
      doc.text(`${t('rByC.df')}: ${results.degreesOfFreedom}`, 25, y); y += 12;

      // Observed frequencies
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('rByC.observedData'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const observedData = [];
      for (let i = 0; i < tableData.rows; i++) {
        const row = [`${t('rByC.row')} ${i + 1}`];
        for (let j = 0; j < tableData.cols; j++) {
          row.push(tableData.data[i][j].toString());
        }
        row.push(tableData.rowTotals[i].toString());
        observedData.push(row);
      }
      
      const colTotalRow = [t('rByC.total')];
      for (let j = 0; j < tableData.cols; j++) {
        colTotalRow.push(tableData.colTotals[j].toString());
      }
      colTotalRow.push(tableData.grandTotal.toString());
      observedData.push(colTotalRow);
      
      const head = [t('rByC.rowCol')];
      for (let j = 1; j <= tableData.cols; j++) head.push(`${t('rByC.column')} ${j}`);
      head.push(t('rByC.total'));
      
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

      // Expected frequencies
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('rByC.expectedFrequencies'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const expectedData = [];
      for (let i = 0; i < tableData.rows; i++) {
        const row = [`${t('rByC.row')} ${i + 1}`];
        for (let j = 0; j < tableData.cols; j++) {
          row.push(results.expected[i][j].toFixed(2));
        }
        expectedData.push(row);
      }

      const expectedHead = [t('rByC.rowCol')];
      for (let j = 1; j <= tableData.cols; j++) expectedHead.push(`${t('rByC.column')} ${j}`);

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

      // Statistical results
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('rByC.statisticalResults'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const resultsTable = [
        [t('rByC.chiSquare'), results.chiSquare.toFixed(4)],
        [t('rByC.df'), results.degreesOfFreedom.toString()],
        [t('rByC.pValue'), results.pValue.toExponential(6)],
        [t('rByC.cramersV'), results.cramersV.toFixed(4)]
      ];

      autoTable(doc, {
        startY: y,
        head: [[t('rByC.statistic'), t('rByC.value')]],
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

      // Interpretation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('rByC.interpretation'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const splitText = doc.splitTextToSize(results.interpretation, 170);
      doc.text(splitText, 20, y);

      // Footer
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text(t('rByC.reportFooter'), 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });

      doc.save('Rapport_RxC.pdf');
      toast.success(t('rByC.exportSuccess'));
    } catch (error) {
      console.error('PDF error:', error);
      toast.error(t('rByC.exportError'));
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">{t('common.home')}</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">{t('rByC.title')}</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('rByC.title')}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t('rByC.description')}</p>
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
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> {t('rByC.parameters')}
              </h2>

              {/* Row/Column steppers */}
              <div className="space-y-5 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: t('rByC.rows'), val: numRows, set: setNumRows, add: addRow, rem: removeRow, min: 2 },
                    { label: t('rByC.columns'), val: numCols, set: setNumCols, add: addColumn, rem: removeColumn, min: 2 }
                  ].map((ctrl, i) => (
                    <div key={i} className="space-y-2">
                      <label className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide ml-1">
                        {ctrl.label}
                      </label>
                      <div className="flex items-center border-b border-transparent hover:border-gray-200 dark:hover:border-slate-700 focus-within:border-blue-500 transition-all">
                        <button
                          onClick={ctrl.rem}
                          disabled={ctrl.val <= ctrl.min}
                          className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-20 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={ctrl.val}
                          onChange={(e) => ctrl.set(e.target.value)}
                          className="w-full bg-transparent text-center font-semibold text-slate-700 dark:text-slate-200 border-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none"
                        />
                        <button
                          onClick={ctrl.add}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contingency table input */}
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800">
                        <th className="py-4 px-4 font-medium text-gray-400 dark:text-slate-500">{t('rByC.ref')}</th>
                        {Array.from({ length: tableData.cols }, (_, i) => (
                          <th key={i} className="py-4 px-4 font-medium text-center text-gray-500 dark:text-slate-400">
                            {t('rByC.column')} {i + 1}
                          </th>
                        ))}
                        <th className="py-4 px-4 font-medium text-center text-blue-500 dark:text-blue-400">
                          {t('rByC.total')}
                        </th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                      {tableData.data.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-5 px-4 text-[11px] font-medium text-gray-400 dark:text-slate-500">
                            {t('rByC.row')} {rowIndex + 1}
                          </td>
                          {row.map((cell, colIndex) => (
                            <td key={colIndex} className="py-5 px-4 text-center">
                              <input
                                type="number"
                                value={cell}
                                onChange={(e) => updateCellValue(rowIndex, colIndex, e.target.value)}
                                className="w-16 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums font-semibold text-slate-600 dark:text-slate-300"
                              />
                            </td>
                          ))}
                          <td className="py-5 px-4 text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {tableData.rowTotals[rowIndex]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={generateTable}
                  className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all gap-2"
                >
                  <Plus className="w-4 h-4" /> {t('rByC.updateStructure')}
                </button>
              </div>

              {/* Footer actions */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('rByC.example')}
                </button>
                <button
                  onClick={clearForm}
                  className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl flex items-center justify-center"
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
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> {t('rByC.resultsTitle')}
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('rByC.copyTooltip')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('rByC.exportTooltip')}
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
                    <p className="text-lg">{t('rByC.enterData')}</p>
                    <div className="text-4xl font-bold mt-2">0.00</div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main results card */}
                    <div className="bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30 p-4 sm:p-6 rounded-3xl border">
  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 sm:mb-2">
    {t('rByC.statisticalResults')}
  </p>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="flex flex-col items-center py-2">
      <div className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 sm:mb-2 text-orange-600">
        {results.chiSquare.toFixed(4)}
      </div>
      <span className="text-xs text-center">{t('rByC.chiSquare')}</span>
    </div>
    <div className="flex flex-col items-center py-2">
      <div className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 sm:mb-2 text-orange-600">
        {results.pValue.toExponential(6)}
      </div>
      <span className="text-xs text-center">{t('rByC.pValue')}</span>
    </div>
    <div className="flex flex-col items-center py-2">
      <div className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 sm:mb-2 text-orange-600">
        {results.degreesOfFreedom}
      </div>
      <span className="text-xs text-center">{t('rByC.df')}</span>
    </div>
    <div className="flex flex-col items-center py-2">
      <div className="text-2xl sm:text-4xl font-bold tracking-tight mb-1 sm:mb-2 text-orange-600">
        {results.cramersV.toFixed(4)}
      </div>
      <span className="text-xs text-center">{t('rByC.cramersV')}</span>
    </div>
  </div>
</div>

                    {/* Expected frequencies table */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">{t('rByC.rowCol')}</th>
                              {Array.from({ length: tableData.cols }, (_, i) => (
                                <th key={i} className="px-3 py-2 text-center font-semibold">{t('rByC.column')} {i + 1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {results.expected.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                <td className="px-3 py-2 font-medium">{t('rByC.row')} {rowIndex + 1}</td>
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
                        <Info className="w-4 h-4 text-blue-500" /> {t('rByC.interpretation')}
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('rByC.helpTitle')}</h3>
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
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">1</div>
                    {t('rByC.principleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('rByC.principleText')}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">H₀ : {t('rByC.independence')}</div>
                      <div className="text-slate-500">{t('rByC.independenceDesc')}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">H₁ : {t('rByC.dependence')}</div>
                      <div className="text-slate-500">{t('rByC.dependenceDesc')}</div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">2</div>
                    {t('rByC.conditionsTitle')}
                  </h4>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li><strong className="text-slate-900 dark:text-white">{t('rByC.independentSample')}</strong> – {t('rByC.independentSampleDesc')}</li>
                    <li><strong className="text-slate-900 dark:text-white">{t('rByC.expectedCounts')}</strong> – {t('rByC.expectedCountsDesc')}</li>
                    <li><strong className="text-slate-900 dark:text-white">{t('rByC.unpairedData')}</strong> – {t('rByC.unpairedDataDesc')}</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">3</div>
                    {t('rByC.calculatedStatsTitle')}
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{t('rByC.chiSquare')}</div>
                      <p className="text-slate-600 dark:text-slate-300">{t('rByC.chiSquareDesc')}</p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{t('rByC.df')}</div>
                      <p className="text-slate-600 dark:text-slate-300">{t('rByC.dfDesc')}</p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{t('rByC.pValue')}</div>
                      <p className="text-slate-600 dark:text-slate-300">{t('rByC.pValueDesc')}</p>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{t('rByC.cramersV')}</div>
                      <p className="text-slate-600 dark:text-slate-300">{t('rByC.cramersVDesc')}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0 &lt; V ≤ 0.1 : {t('rByC.veryWeak')}</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.1 &lt; V ≤ 0.3 : {t('rByC.weak')}</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.3 &lt; V ≤ 0.5 : {t('rByC.moderate')}</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.5 &lt; V ≤ 0.7 : {t('rByC.strong')}</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">0.7 &lt; V ≤ 1.0 : {t('rByC.veryStrong')}</div>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">4</div>
                    {t('rByC.complementaryMethodsTitle')}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{t('rByC.complementaryMethodsDesc')}</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <li><strong className="text-slate-900 dark:text-white">{t('rByC.fisherExact')}</strong> – {t('rByC.fisherExactDesc')}</li>
                    <li><strong className="text-slate-900 dark:text-white">{t('rByC.yatesCorrection')}</strong> – {t('rByC.yatesCorrectionDesc')}</li>
                  </ul>
                  <p className="mt-3 text-sm text-slate-500 italic">{t('rByC.jStatNote')}</p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold">5</div>
                    {t('rByC.exampleTitle')}
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm">
                    <p className="mb-2">{t('rByC.exampleText')}</p>
                    <pre className="bg-white dark:bg-slate-900 p-2 rounded text-xs overflow-x-auto">
{`            ${t('rByC.cancerYes')}  ${t('rByC.cancerNo')}  ${t('rByC.total')}
                    ${t('rByC.smoker')}          30          20        50
                    ${t('rByC.nonSmoker')}      10          40        50
                    ${t('rByC.total')}           40          60       100`}
                    </pre>
                    <p className="mt-2">{t('rByC.exampleInterpretation')}</p>
                  </div>
                  <a
                    href="https://www.openepi.com/Proportion/Proportion.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    {t('rByC.sourceLink')} <ArrowRight className="w-3 h-3 ml-1" />
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