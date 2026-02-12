import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, BarChart3,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
  ChevronDown, Plus, Trash2
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DoseRow {
  id: string;
  exposure: string;
  dose: number;
  cases: number;
  controls: number;
}

interface LevelResult {
  exposure: string;
  dose: number;
  proportion: number;
  or: number | string;
  orLower: number | string;
  orUpper: number | string;
  rr: number | string;
  rrLower: number | string;
  rrUpper: number | string;
}

interface DoseResults {
  levels: LevelResult[];
  chiSquare: string;
  pValue: string;
  trend: string;
  trendDirection: string;
}

export default function DoseResponse() {
  const [rows, setRows] = useState<DoseRow[]>([
    { id: '1', exposure: 'Niveau 0', dose: 0, cases: 0, controls: 0 },
  ]);
  const [results, setResults] = useState<DoseResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showStatsDetail, setShowStatsDetail] = useState<boolean>(false);
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

  const hasJStat = !!(window as any).jStat;

  // Auto-calculate on any data change
  useEffect(() => {
    const hasData = rows.some((r) => r.cases > 0 || r.controls > 0);
    if (hasData && hasJStat) {
      calculateDoseResponse();
    } else {
      setResults(null);
    }
  }, [rows, hasJStat]);

  // Trigger animation when results change
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const calculateDoseResponse = () => {
    const validRows = rows.filter((r) => r.cases >= 0 && r.controls >= 0 && (r.cases > 0 || r.controls > 0));
    if (validRows.length < 2) {
      setResults(null);
      return;
    }

    // Sort by dose for calculation
    const sortedRows = [...validRows].sort((a, b) => a.dose - b.dose);

    // Reference is the first (lowest dose)
    const ref = sortedRows[0];
    const refProportion = ref.controls > 0 ? ref.cases / (ref.cases + ref.controls) : 0;
    const refOr = ref.controls > 0 ? ref.cases / ref.controls : 0;

    const levels: LevelResult[] = sortedRows.map((row) => {
      const total = row.cases + row.controls;
      const proportion = total > 0 ? row.cases / total : 0;

      let or: number | string = 'N/A';
      let orLower: number | string = 'N/A';
      let orUpper: number | string = 'N/A';
      if (row.controls > 0 && ref.controls > 0) {
        or = (row.cases / row.controls) / refOr;
        if (typeof or === 'number' && isFinite(or)) {
          const lnor = Math.log(or);
          const se = Math.sqrt(1/row.cases + 1/row.controls + 1/ref.cases + 1/ref.controls);
          const z = 1.96;
          orLower = Math.exp(lnor - z * se).toFixed(3);
          orUpper = Math.exp(lnor + z * se).toFixed(3);
          or = or.toFixed(3);
        } else if (or === 0) {
          or = '0';
        } else {
          or = '∞';
        }
      }

      let rr: number | string = 'N/A';
      let rrLower: number | string = 'N/A';
      let rrUpper: number | string = 'N/A';
      if (refProportion > 0) {
        rr = proportion / refProportion;
        if (typeof rr === 'number' && isFinite(rr)) {
          const lnrr = Math.log(rr);
          const se = Math.sqrt((1 - proportion)/ (row.cases) + (1 - refProportion)/ref.cases);
          const z = 1.96;
          rrLower = Math.exp(lnrr - z * se).toFixed(3);
          rrUpper = Math.exp(lnrr + z * se).toFixed(3);
          rr = rr.toFixed(3);
        } else if (rr === 0) {
          rr = '0';
        } else {
          rr = '∞';
        }
      }

      return {
        exposure: row.exposure,
        dose: row.dose,
        proportion,
        or,
        orLower,
        orUpper,
        rr,
        rrLower,
        rrUpper,
      };
    });

    // Trend test
    let sumCases = 0;
    let sumTotal = 0;
    let sumScore = 0;
    let sumScoreCases = 0;
    let sumScoreSquared = 0;

    sortedRows.forEach((row) => {
      const score = row.dose;
      const total = row.cases + row.controls;

      sumCases += row.cases;
      sumTotal += total;
      sumScore += score * total;
      sumScoreCases += score * row.cases;
      sumScoreSquared += score * score * total;
    });

    const expectedScoreCases = (sumCases / sumTotal) * sumScore;
    const variance = (sumCases * (sumTotal - sumCases) / sumTotal) * ((sumScoreSquared / sumTotal) - Math.pow(sumScore / sumTotal, 2));
    let chiSquare = variance > 0 ? Math.pow(sumScoreCases - expectedScoreCases, 2) / variance : 0;

    let pValue = 'N/A';
    if (hasJStat) {
      const jStat = (window as any).jStat;
      pValue = (1 - jStat.chisquare.cdf(chiSquare, 1)).toFixed(4);
    }

    const direction = (sumScoreCases - expectedScoreCases) > 0 ? 'positive' : 'negative';
    const trend = Number(pValue) < 0.05 ? `Tendance significative ${direction}` : 'Aucune tendance significative';

    setResults({
      levels,
      chiSquare: chiSquare.toFixed(3),
      pValue,
      trend,
      trendDirection: direction,
    });
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    const newDose = rows.length;
    setRows([
      ...rows,
      { id: newId, exposure: `Niveau ${rows.length}`, dose: newDose, cases: 0, controls: 0 },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (
    id: string,
    field: 'exposure' | 'dose' | 'cases' | 'controls',
    value: string
  ) => {
    let newValue: string | number = value;
    if (field === 'dose' || field === 'cases' || field === 'controls') {
      newValue = parseFloat(value) || 0;
    }
    setRows(
      rows.map((r) =>
        r.id === id ? { ...r, [field]: newValue } : r
      )
    );
  };

  const clearForm = () => {
    setRows([{ id: '1', exposure: 'Niveau 0', dose: 0, cases: 0, controls: 0 }]);
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setRows([
      { id: '1', exposure: '0 cig/j', dose: 0, cases: 5, controls: 95 },
      { id: '2', exposure: '7.5 cig/j', dose: 7.5, cases: 15, controls: 85 },
      { id: '3', exposure: '17.5 cig/j', dose: 17.5, cases: 30, controls: 70 },
      { id: '4', exposure: '27.5 cig/j', dose: 27.5, cases: 50, controls: 50 },
    ]);
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;
    
    let text = 'Résultats de l\'Analyse Dose-Réponse\n\n';
    text += 'Niveaux:\n';
    results.levels.forEach((level) => {
      text += `${level.exposure} (dose ${level.dose}):\n`;
      text += `Proportion: ${(level.proportion * 100).toFixed(1)}%\n`;
      text += `OR: ${level.or} (95% CI: ${level.orLower} - ${level.orUpper})\n`;
      text += `RR: ${level.rr} (95% CI: ${level.rrLower} - ${level.rrUpper})\n\n`;
    });
    text += `Chi-carré de tendance: ${results.chiSquare}\n`;
    text += `Valeur p: ${results.pValue}\n`;
    text += `Interprétation: ${results.trend}\n`;

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
      const colorPrimary = results.trendDirection === 'positive'
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
      doc.text("Rapport d'Analyse Dose-Réponse", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Calculateur Dose-Réponse – OpenEpi', 190, 32, { align: 'right' });

      // ---------- DONNÉES ----------
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 5;

      const tableData = rows.map((r) => [
        r.exposure,
        r.dose,
        r.cases,
        r.controls,
        r.cases + r.controls,
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Niveau d\'Exposition', 'Dose', 'Cas', 'Témoins', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- RÉSULTATS PAR NIVEAU ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Résultats par niveau (vs référence)', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const levelTable = results.levels.map((l) => [
        l.exposure,
        l.dose,
        (l.proportion * 100).toFixed(1) + '%',
        l.or,
        `${l.orLower} – ${l.orUpper}`,
        l.rr,
        `${l.rrLower} – ${l.rrUpper}`,
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Niveau', 'Dose', '% Cas', 'OR', 'IC 95% OR', 'RR', 'IC 95% RR']],
        body: levelTable,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- TEST DE TENDANCE ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Test de tendance', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const trendTable = [
        ['Chi-carré de tendance', results.chiSquare],
        ['Valeur p', results.pValue],
        ['Interprétation', results.trend],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Paramètre', 'Valeur']],
        body: trendTable,
        theme: 'grid',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 60, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      // ---------- PIED DE PAGE ----------
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Calculateur Dose-Réponse – Fidèle à OpenEpi', 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });

      doc.save('Rapport_Dose_Response.pdf');
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
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Réponse à la Dose</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Analyse de la Réponse à la Dose</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Test de tendance linéaire pour différents niveaux d'exposition.</p>
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
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Niveau d'Exposition
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Dose Score
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Cas
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Témoins
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                      {rows.map((row) => (
                        <tr key={row.id} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={row.exposure}
                              onChange={(e) => updateRow(row.id, 'exposure', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              value={row.dose}
                              onChange={(e) => updateRow(row.id, 'dose', e.target.value)}
                              className="w-20 px-2 py-1 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.cases}
                              onChange={(e) => updateRow(row.id, 'cases', e.target.value)}
                              className="w-16 px-2 py-1 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.controls}
                              onChange={(e) => updateRow(row.id, 'controls', e.target.value)}
                              className="w-16 px-2 py-1 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeRow(row.id)}
                              disabled={rows.length === 1}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={addRow}
                  className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex gap-2"
                >
                  <Plus className="w-4 h-4" /> Ajouter un niveau
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> Exemple
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
                    {/* Table per level */}
                    <div className="bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30 p-6 rounded-3xl border">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Résultats par niveau (vs référence)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Niveau</th>
                              <th className="px-3 py-2 text-center font-semibold">Dose</th>
                              <th className="px-3 py-2 text-center font-semibold">% Cas</th>
                              <th className="px-3 py-2 text-center font-semibold">OR</th>
                              <th className="px-3 py-2 text-center font-semibold">IC 95% OR</th>
                              <th className="px-3 py-2 text-center font-semibold">RR</th>
                              <th className="px-3 py-2 text-center font-semibold">IC 95% RR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {results.levels.map((level, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 font-medium">{level.exposure}</td>
                                <td className="px-3 py-2 text-center font-mono">{level.dose}</td>
                                <td className="px-3 py-2 text-center font-mono">{(level.proportion * 100).toFixed(1)}%</td>
                                <td className="px-3 py-2 text-center font-mono">{level.or}</td>
                                <td className="px-3 py-2 text-center font-mono">{level.orLower} – {level.orUpper}</td>
                                <td className="px-3 py-2 text-center font-mono">{level.rr}</td>
                                <td className="px-3 py-2 text-center font-mono">{level.rrLower} – {level.rrUpper}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Trend test */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        Number(results.pValue) < 0.05
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Test de tendance linéaire
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-3xl font-bold tracking-tight mb-2 text-orange-600">
                            {results.chiSquare}
                          </div>
                          <span className="text-xs">Chi-carré</span>
                        </div>
                        <div>
                          <div className="text-3xl font-bold tracking-tight mb-2 text-orange-600">
                            {results.pValue}
                          </div>
                          <span className="text-xs">p-value</span>
                        </div>
                        <div>
                          <div className="text-3xl font-bold tracking-tight mb-2 text-orange-600">
                            {results.trend}
                          </div>
                          <span className="text-xs">Interprétation</span>
                        </div>
                      </div>
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
                    Test pour tendance lorsque plus de deux niveaux d'exposition. Utilisé pour études dose-réponse, tendances avec âge, temps, etc.
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
                    Calcule OR et RR par niveau vs référence, avec IC 95%. Test chi² pour tendance linéaire (Mantel extension), p-value.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Entrées
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Pour chaque niveau: label, score dose (midpoint), cas, témoins.
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