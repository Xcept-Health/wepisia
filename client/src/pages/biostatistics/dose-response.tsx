import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
  Plus, Trash2
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

/**
 * Dose-Response (Trend Test) Analysis
 *
 * This component performs a linear trend test for exposure levels with case-control data,
 * computing odds ratios and relative risks for each level compared to the reference (lowest dose),
 * and a chi-square test for trend (Mantel extension). All calculations rely on jStat for
 * the chi-square distribution.
 */

interface DoseRow {
  id: string;
  exposure: string;   // descriptive label
  dose: number;       // numeric score (e.g., midpoint)
  cases: number;
  controls: number;
}

interface LevelResult {
  exposure: string;
  dose: number;
  proportion: number;
  oddsRatio: number | null;
  orLower: number | null;
  orUpper: number | null;
  relativeRisk: number | null;
  rrLower: number | null;
  rrUpper: number | null;
}

interface TrendResults {
  levels: LevelResult[];
  chiSquare: number;
  pValue: number;
  trendDirection: 'positive' | 'negative' | 'none';
}

export default function DoseResponse() {
  // Input state
  const [rows, setRows] = useState<DoseRow[]>([
    { id: '1', exposure: 'Niveau 0', dose: 0, cases: 0, controls: 0 },
  ]);

  const [results, setResults] = useState<TrendResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const hasJStat = true; // jStat is imported

  // Recalculate whenever rows change
  useEffect(() => {
    const hasData = rows.some(r => r.cases > 0 || r.controls > 0);
    if (hasData && hasJStat) {
      calculateTrend();
    } else {
      setResults(null);
    }
  }, [rows]);

  // Trigger animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  // ---------- Core calculation ----------
  const calculateTrend = () => {
    // Filter rows with valid numbers (cases/controls >=0)
    const validRows = rows.filter(r => r.cases >= 0 && r.controls >= 0 && (r.cases + r.controls) > 0);
    if (validRows.length < 2) {
      setResults(null);
      return;
    }

    // Sort by dose (ascending)
    const sorted = [...validRows].sort((a, b) => a.dose - b.dose);
    const ref = sorted[0]; // reference level (lowest dose)

    // Compute odds and proportions for reference
    const refOdds = ref.controls > 0 ? ref.cases / ref.controls : 0;
    const refProp = (ref.cases + ref.controls) > 0 ? ref.cases / (ref.cases + ref.controls) : 0;

    // Compute results for each level
    const levels: LevelResult[] = sorted.map(row => {
      const total = row.cases + row.controls;
      const proportion = total > 0 ? row.cases / total : 0;

      // Odds Ratio vs reference
      let oddsRatio: number | null = null;
      let orLower: number | null = null;
      let orUpper: number | null = null;
      if (row.controls > 0 && refOdds > 0) {
        oddsRatio = (row.cases / row.controls) / refOdds;
        if (Number.isFinite(oddsRatio) && oddsRatio > 0) {
          const lnOR = Math.log(oddsRatio);
          const seOR = Math.sqrt(1/row.cases + 1/row.controls + 1/ref.cases + 1/ref.controls);
          const z = 1.96; // 95% CI
          orLower = Math.exp(lnOR - z * seOR);
          orUpper = Math.exp(lnOR + z * seOR);
        }
      }

      // Relative Risk vs reference
      let relativeRisk: number | null = null;
      let rrLower: number | null = null;
      let rrUpper: number | null = null;
      if (refProp > 0) {
        relativeRisk = proportion / refProp;
        if (Number.isFinite(relativeRisk) && relativeRisk > 0) {
          const lnRR = Math.log(relativeRisk);
          const seRR = Math.sqrt((1 - proportion)/row.cases + (1 - refProp)/ref.cases);
          const z = 1.96;
          rrLower = Math.exp(lnRR - z * seRR);
          rrUpper = Math.exp(lnRR + z * seRR);
        }
      }

      return {
        exposure: row.exposure,
        dose: row.dose,
        proportion,
        oddsRatio,
        orLower,
        orUpper,
        relativeRisk,
        rrLower,
        rrUpper,
      };
    });

    // Trend test (Mantel extension)
    // Compute sums for the linear trend statistic
    let sumCases = 0;
    let sumTotal = 0;
    let sumScore = 0;
    let sumScoreCases = 0;
    let sumScoreSquared = 0;

    sorted.forEach(row => {
      const score = row.dose;
      const total = row.cases + row.controls;

      sumCases += row.cases;
      sumTotal += total;
      sumScore += score * total;
      sumScoreCases += score * row.cases;
      sumScoreSquared += score * score * total;
    });

    const expectedScoreCases = (sumCases / sumTotal) * sumScore;
    const meanScore = sumScore / sumTotal;
    const variance = (sumCases * (sumTotal - sumCases) / (sumTotal * (sumTotal - 1))) *
                     (sumScoreSquared - sumTotal * meanScore * meanScore);

    let chiSquare = 0;
    if (variance > 0) {
      chiSquare = Math.pow(sumScoreCases - expectedScoreCases, 2) / variance;
    }

    const pValue = hasJStat ? 1 - jStat.chisquare.cdf(chiSquare, 1) : NaN;

    const diff = sumScoreCases - expectedScoreCases;
    let trendDirection: 'positive' | 'negative' | 'none' = 'none';
    if (Math.abs(diff) > 1e-12) {
      trendDirection = diff > 0 ? 'positive' : 'negative';
    }

    setResults({
      levels,
      chiSquare,
      pValue,
      trendDirection,
    });
  };

  // ---------- UI Handlers ----------
  const addRow = () => {
    const newId = (rows.length + 1).toString();
    const newDose = rows.length; // default dose increment
    setRows([
      ...rows,
      { id: newId, exposure: `Niveau ${rows.length}`, dose: newDose, cases: 0, controls: 0 },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof DoseRow, value: string) => {
    let newValue: string | number = value;
    if (field === 'dose' || field === 'cases' || field === 'controls') {
      newValue = parseFloat(value) || 0;
    }
    setRows(rows.map(r => (r.id === id ? { ...r, [field]: newValue } : r)));
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

    const formatNum = (val: number | null, digits = 3) => val?.toFixed(digits) ?? 'N/A';
    const formatCI = (lower: number | null, upper: number | null) => 
      lower && upper ? `${formatNum(lower)}–${formatNum(upper)}` : 'N/A';

    let text = `Résultats de l'Analyse Dose-Réponse\n\n`;
    text += `Niveaux (référence = premier niveau) :\n`;
    results.levels.forEach(level => {
      text += `${level.exposure} (dose ${level.dose}) :\n`;
      text += `  Proportion cas : ${(level.proportion * 100).toFixed(1)}%\n`;
      text += `  Odds Ratio : ${formatNum(level.oddsRatio)} (95% CI : ${formatCI(level.orLower, level.orUpper)})\n`;
      text += `  Risque Relatif : ${formatNum(level.relativeRisk)} (95% CI : ${formatCI(level.rrLower, level.rrUpper)})\n\n`;
    });
    text += `Test de tendance linéaire (Mantel extension) :\n`;
    text += `  χ² = ${results.chiSquare.toFixed(3)}\n`;
    text += `  p = ${results.pValue.toFixed(4)}\n`;
    text += `  Direction : ${results.trendDirection === 'positive' ? 'positive' : results.trendDirection === 'negative' ? 'négative' : 'aucune'}\n`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) return;

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const colorPrimary = results.trendDirection === 'positive'
        ? { bg: [255, 247, 237] as [number, number, number], border: [234, 88, 12] as [number, number, number], text: [234, 88, 12] as [number, number, number] }
        : { bg: [236, 253, 245] as [number, number, number], border: [5, 150, 105] as [number, number, number], text: [5, 150, 105] as [number, number, number] };
      const colorSlate = {
        50: [248, 250, 252] as [number, number, number],
        100: [241, 245, 249] as [number, number, number],
        200: [226, 232, 240] as [number, number, number],
        300: [203, 213, 225] as [number, number, number],
        500: [100, 116, 139] as [number, number, number],
        700: [51, 65, 85] as [number, number, number],
        900: [15, 23, 42] as [number, number, number],
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
      doc.text("Rapport d'Analyse Dose-Réponse", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Calculateur Dose-Réponse – Épidémiologie', 190, 32, { align: 'right' });

      // Input data table
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;

      const inputRows = rows.map(r => [r.exposure, r.dose.toString(), r.cases.toString(), r.controls.toString(), (r.cases + r.controls).toString()]);

      autoTable(doc, {
        startY: y,
        head: [['Niveau', 'Dose', 'Cas', 'Témoins', 'Total']],
        body: inputRows,
        theme: 'striped',
        headStyles: { fillColor: colorSlate[100], textColor: colorSlate[900], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Results per level
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Résultats par niveau (vs référence)', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      const levelRows = results.levels.map(l => [
        l.exposure,
        l.dose.toString(),
        (l.proportion * 100).toFixed(1) + '%',
        l.oddsRatio?.toFixed(3) ?? 'N/A',
        l.orLower && l.orUpper ? `${l.orLower.toFixed(3)}–${l.orUpper.toFixed(3)}` : 'N/A',
        l.relativeRisk?.toFixed(3) ?? 'N/A',
        l.rrLower && l.rrUpper ? `${l.rrLower.toFixed(3)}–${l.rrUpper.toFixed(3)}` : 'N/A',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Niveau', 'Dose', '% Cas', 'OR', 'IC 95% OR', 'RR', 'IC 95% RR']],
        body: levelRows,
        theme: 'striped',
        headStyles: { fillColor: colorSlate[100], textColor: colorSlate[900], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Trend test
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Test de tendance linéaire (Mantel extension)', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      const trendRows = [
        ['χ²', results.chiSquare.toFixed(3)],
        ['p-value', results.pValue.toFixed(4)],
        ['Direction', results.trendDirection === 'positive' ? 'positive' : results.trendDirection === 'negative' ? 'négative' : 'aucune'],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Paramètre', 'Valeur']],
        body: trendRows,
        theme: 'grid',
        headStyles: { fillColor: colorSlate[100], textColor: colorSlate[900], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 60, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Interpretation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Interprétation', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      let interpretation = '';
      if (results.pValue < 0.05) {
        interpretation = `Tendance ${results.trendDirection === 'positive' ? 'positive' : 'négative'} statistiquement significative (p < 0.05). `;
      } else {
        interpretation = 'Aucune tendance significative (p ≥ 0.05). ';
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);

      // Footer
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Calculateur Dose-Réponse – Outil statistique pour épidémiologie', 20, footerY + 5);
      doc.text('Page 1 / 1', 190, footerY + 5, { align: 'right' });
      doc.text(`Méthode : ${hasJStat ? 'jStat (exact)' : 'Approximation'}`, 20, footerY + 10);

      doc.save('Rapport_Dose_Response.pdf');
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // ---------- Render ----------
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
          {/* Left column – input */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                <div className="w-full max-w-2xl mx-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-800">
                          <th className="py-4 px-4 font-medium text-gray-400 dark:text-slate-500">Niveau</th>
                          <th className="py-4 px-4 font-medium text-center text-gray-500 dark:text-slate-400">Dose</th>
                          <th className="py-4 px-4 font-medium text-center text-gray-500 dark:text-slate-400">Cas</th>
                          <th className="py-4 px-4 font-medium text-center text-gray-500 dark:text-slate-400">Témoins</th>
                          <th className="py-4 px-4 font-medium text-center text-gray-400 dark:text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
                          >
                            <td className="py-5 px-4">
                              <input
                                type="text"
                                value={row.exposure}
                                onChange={(e) => updateRow(row.id, 'exposure', e.target.value)}
                                className="w-full bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none transition-all"
                                placeholder="Niveau"
                              />
                            </td>
                            <td className="py-5 px-4 text-center">
                              <input
                                type="number"
                                step="any"
                                value={row.dose}
                                onChange={(e) => updateRow(row.id, 'dose', e.target.value)}
                                className="w-20 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-5 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={row.cases}
                                onChange={(e) => updateRow(row.id, 'cases', e.target.value)}
                                className="w-16 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-5 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={row.controls}
                                onChange={(e) => updateRow(row.id, 'controls', e.target.value)}
                                className="w-16 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-5 px-4 text-center">
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
                    <div className="text-4xl font-bold mt-2">0.00</div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                      {/* Trend test card */}
                      <div
                      className={`p-8 rounded-3xl text-center border ${
                        results.pValue < 0.05
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Test de tendance linéaire (Mantel extension)
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className={`text-3xl font-bold tracking-tight mb-2 ${results.pValue < 0.05 ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {results.chiSquare.toFixed(3)}
                          </div>
                          <span className="text-xs">χ²</span>
                        </div>
                        <div>
                          <div className={`text-3xl font-bold tracking-tight mb-2 ${results.pValue < 0.05 ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {results.pValue.toFixed(4)}
                          </div>
                          <span className="text-xs">p-value</span>
                        </div>
                        <div>
                          <div className={`text-3xl font-bold tracking-tight mb-2 ${results.pValue < 0.05 ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {results.trendDirection === 'positive' ? 'Positive' : results.trendDirection === 'negative' ? 'Négative' : 'Aucune'}
                          </div>
                          <span className="text-xs">Direction</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Results per level table */}
                    <div className="p-6 rounded-3xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Résultats par niveau (référence = premier niveau)
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
                            {results.levels.map((level, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 font-medium">{level.exposure}</td>
                                <td className="px-3 py-2 text-center font-mono">{level.dose}</td>
                                <td className="px-3 py-2 text-center font-mono">{(level.proportion * 100).toFixed(1)}%</td>
                                <td className="px-3 py-2 text-center font-mono">{level.oddsRatio?.toFixed(3) ?? 'N/A'}</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {level.orLower && level.orUpper ? `${level.orLower.toFixed(3)}–${level.orUpper.toFixed(3)}` : 'N/A'}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">{level.relativeRisk?.toFixed(3) ?? 'N/A'}</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {level.rrLower && level.rrUpper ? `${level.rrLower.toFixed(3)}–${level.rrUpper.toFixed(3)}` : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>


                    {/* Interpretation block */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> Interprétation
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {results.pValue < 0.05
                          ? `Tendance ${results.trendDirection === 'positive' ? 'positive' : 'négative'} statistiquement significative (p < 0.05).`
                          : 'Aucune tendance significative (p ≥ 0.05).'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide Rapide – Dose-Réponse</h3>
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
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">1</div>
                    Le Principe
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Ce test évalue s'il existe une tendance linéaire entre le niveau d'exposition (dose) et le risque de maladie. Il est utilisé dans les études cas-témoins ou de cohorte avec plusieurs niveaux d'exposition ordonnés.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">2</div>
                    Méthodes
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Pour chaque niveau, on calcule l'odds ratio et le risque relatif par rapport au niveau de référence (le plus faible). Le test de tendance est une extension du test du χ² (Mantel), avec une statistique distribuée selon un χ² à 1 degré de liberté.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">3</div>
                    Interprétation
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Une p-value &lt; 0.05 indique une tendance significative. La direction (positive/négative) indique si le risque augmente ou diminue avec la dose.
                  </p>
                </section>

                <a
                  href="https://www.openepi.com/DoseResponse/DoseResponse.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700"
                >
                  Source: OpenEpi <ArrowRight className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}