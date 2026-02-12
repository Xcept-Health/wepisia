import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, BarChart3,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
  ChevronDown
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TwoByTwoResults {
  a: number;
  b: number;
  c: number;
  d: number;
  totalExposed: number;
  totalUnexposed: number;
  totalDiseased: number;
  totalUndiseased: number;
  total: number;
  incExposed: number;
  incUnexposed: number;
  incTotal: number;
  incExposedPct: string;
  incUnexposedPct: string;
  incTotalPct: string;
  or: number | string;
  rr: number | string;
  orLower: number | string;
  orUpper: number | string;
  rrLower: number | string;
  rrUpper: number | string;
  orInterpretation: string;
  rrInterpretation: string;
  chi2unc: string;
  punc: string;
  chi2mh: string;
  pmh: string;
  chi2yates: string;
  pyates: string;
  fisherOne: string;
  fisherTwo: string;
  chi2Interpretation: string;
}

export default function TwoByTwo() {
  const [a, setA] = useState<string>('');
  const [b, setB] = useState<string>('');
  const [c, setC] = useState<string>('');
  const [d, setD] = useState<string>('');
  const [results, setResults] = useState<TwoByTwoResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showStatsDetail, setShowStatsDetail] = useState<boolean>(false);
  const [jStatReady, setJStatReady] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load jStat script and verify that required methods are available
  useEffect(() => {
    const loadScripts = async () => {
      // If jStat already exists globally
      if ((window as any).jStat) {
        // Check if hypergeometric.pdf is present
        if (typeof (window as any).jStat.hypergeometric?.pdf === 'function') {
          setJStatReady(true);
        } else {
          console.warn('jStat hypergeometric not available, reloading...');
          // Force reload by removing and re-adding script
          delete (window as any).jStat;
        }
      }

      // If still not ready, load the script
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        script.onload = () => {
          // After loading, check again
          if (typeof (window as any).jStat?.hypergeometric?.pdf === 'function') {
            setJStatReady(true);
          } else {
            console.error('jStat loaded but hypergeometric.pdf missing');
            toast.error('jStat incomplet – calculs exacts désactivés');
          }
        };
        script.onerror = () => {
          toast.error('Impossible de charger jStat – calculs exacts désactivés');
        };
        document.body.appendChild(script);
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

  // Fisher exact test using jStat with safety check
  const getFisherP = (a: number, b: number, c: number, d: number) => {
    // Return default values if jStat or hypergeometric is not ready
    if (!jStatReady) {
      return { oneTail: 'N/A', twoTail: 'N/A' };
    }

    const jStat = (window as any).jStat;
    const n = a + b + c + d;
    const r1 = a + b;
    const c1 = a + c;
    const minA = Math.max(0, r1 + c1 - n);
    const maxA = Math.min(r1, c1);
    
    // Additional safety: ensure pdf is a function
    if (typeof jStat.hypergeometric.pdf !== 'function') {
      return { oneTail: 'N/A', twoTail: 'N/A' };
    }

    const observedProb = jStat.hypergeometric.pdf(a, n, c1, r1);
    const expected = r1 * c1 / n;
    let oneTail = 0;
    let twoTail = 0;

    for (let k = minA; k <= maxA; k++) {
      const p = jStat.hypergeometric.pdf(k, n, c1, r1);
      if (p <= observedProb + Number.EPSILON) twoTail += p;
      if (a >= expected) {
        if (k >= a) oneTail += p;
      } else {
        if (k <= a) oneTail += p;
      }
    }

    return { oneTail, twoTail };
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

    const r1 = aVal + bVal;
    const r2 = cVal + dVal;
    const c1 = aVal + cVal;
    const c2 = bVal + dVal;
    const denom = r1 * r2 * c1 * c2;

    const incExposed = r1 > 0 ? aVal / r1 : 0;
    const incUnexposed = r2 > 0 ? cVal / r2 : 0;
    const incTotal = n > 0 ? c1 / n : 0;
    const incExposedPct = (incExposed * 100).toFixed(1) + '%';
    const incUnexposedPct = (incUnexposed * 100).toFixed(1) + '%';
    const incTotalPct = (incTotal * 100).toFixed(1) + '%';

    let or: number | string = 'Non calculable';
    let orLower: number | string = 'Non calculable';
    let orUpper: number | string = 'Non calculable';
    if (bVal * cVal !== 0) {
      or = (aVal * dVal) / (bVal * cVal);
      const lnor = Math.log(or as number);
      const se = Math.sqrt(1 / aVal + 1 / bVal + 1 / cVal + 1 / dVal);
      const z = 1.96;
      orLower = Math.exp(lnor - z * se);
      orUpper = Math.exp(lnor + z * se);
      or = (or as number).toFixed(3);
      orLower = (orLower as number).toFixed(3);
      orUpper = (orUpper as number).toFixed(3);
    } else if (aVal === 0 && dVal === 0) {
      or = 'Indéterminé';
    } else if (bVal === 0 || cVal === 0) {
      or = '∞';
    }

    let rr: number | string = 'Non calculable';
    let rrLower: number | string = 'Non calculable';
    let rrUpper: number | string = 'Non calculable';
    if (incUnexposed !== 0) {
      rr = incExposed / incUnexposed;
      if (Number.isFinite(rr as number) && rr !== 0) {
        const lnrr = Math.log(rr as number);
        const se = Math.sqrt((bVal / (aVal * r1)) + (dVal / (cVal * r2)));
        const z = 1.96;
        rrLower = Math.exp(lnrr - z * se);
        rrUpper = Math.exp(lnrr + z * se);
        rr = (rr as number).toFixed(3);
        rrLower = (rrLower as number).toFixed(3);
        rrUpper = (rrUpper as number).toFixed(3);
      } else if (rr === 0) {
        rr = 0;
      } else {
        rr = '∞';
      }
    }

    const adbc = aVal * dVal - bVal * cVal;
    const absadbc = Math.abs(adbc);

    let chi2unc = denom > 0 ? (adbc ** 2 * n) / denom : 0;
    let chi2mh = denom > 0 && n > 1 ? (adbc ** 2 * (n - 1)) / denom : 0;
    let chi2yates = denom > 0 ? ((absadbc - 0.5 * n) ** 2 * n) / denom : 0;

    let punc = 'N/A';
    let pmh = 'N/A';
    let pyates = 'N/A';
    if (jStatReady) {
      const jStat = (window as any).jStat;
      punc = (1 - jStat.chisquare.cdf(chi2unc, 1)).toFixed(4);
      pmh = (1 - jStat.chisquare.cdf(chi2mh, 1)).toFixed(4);
      pyates = (1 - jStat.chisquare.cdf(chi2yates, 1)).toFixed(4);
    }

    let fisherOne = 'N/A';
    let fisherTwo = 'N/A';
    if (jStatReady) {
      const { oneTail, twoTail } = getFisherP(aVal, bVal, cVal, dVal);
      fisherOne = oneTail.toFixed(4);
      fisherTwo = twoTail.toFixed(4);
    }

    const orInterpretation = typeof or === 'string' ? or : Number(or) > 1 ? 'Risque accru' : Number(or) < 1 ? 'Effet protecteur' : 'Aucune association';
    const rrInterpretation = typeof rr === 'string' ? rr : Number(rr) > 1 ? 'Risque accru' : Number(rr) < 1 ? 'Risque réduit' : 'Risque égal';
    const chi2Interpretation = Number(punc) < 0.05 ? 'Association significative' : 'Aucune association significative';

    setResults({
      a: aVal,
      b: bVal,
      c: cVal,
      d: dVal,
      totalExposed: r1,
      totalUnexposed: r2,
      totalDiseased: c1,
      totalUndiseased: c2,
      total: n,
      incExposed,
      incUnexposed,
      incTotal,
      incExposedPct,
      incUnexposedPct,
      incTotalPct,
      or,
      rr,
      orLower,
      orUpper,
      rrLower,
      rrUpper,
      orInterpretation,
      rrInterpretation,
      chi2unc: chi2unc.toFixed(3),
      punc,
      chi2mh: chi2mh.toFixed(3),
      pmh,
      chi2yates: chi2yates.toFixed(3),
      pyates,
      fisherOne,
      fisherTwo,
      chi2Interpretation
    });
  };

  // Auto calculate if valid
  useEffect(() => {
    if (validateInputs()) {
      calculateResults();
    }
    // We don't depend on jStatReady here because calculateResults already checks it
  }, [a, b, c, d, jStatReady]); // Add jStatReady to re-run when library becomes available

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
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setA('60');
    setB('40');
    setC('30');
    setD('70');
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;
    
    const text = `Résultats de l'Analyse 2×2\n` +
                 `Tableau:\n` +
                 `a (exposés malades): ${results.a}\n` +
                 `b (exposés non-malades): ${results.b}\n` +
                 `c (non-exposés malades): ${results.c}\n` +
                 `d (non-exposés non-malades): ${results.d}\n\n` +
                 `Incidence chez les exposés: ${results.incExposedPct}\n` +
                 `Incidence chez les non-exposés: ${results.incUnexposedPct}\n` +
                 `Incidence totale: ${results.incTotalPct}\n\n` +
                 `Odds Ratio (OR): ${results.or} (95% CI: ${results.orLower} - ${results.orUpper})\n` +
                 `Interprétation: ${results.orInterpretation}\n\n` +
                 `Risque Relatif (RR): ${results.rr} (95% CI: ${results.rrLower} - ${results.rrUpper})\n` +
                 `Interprétation: ${results.rrInterpretation}\n\n` +
                 `Chi-carré non corrigé: ${results.chi2unc} (p = ${results.punc})\n` +
                 `Chi-carré Mantel-Haenszel: ${results.chi2mh} (p = ${results.pmh})\n` +
                 `Chi-carré corrigé (Yates): ${results.chi2yates} (p = ${results.pyates})\n` +
                 `Fisher exact 1-queue: ${results.fisherOne}\n` +
                 `Fisher exact 2-queues: ${results.fisherTwo}\n` +
                 `Interprétation: ${results.chi2Interpretation}`;
    
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
      const colorPrimary = Number(results.rr) > 1
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
      const colorRed = [239, 68, 68];

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
      doc.text("Rapport d'Analyse 2x2", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Calculateur 2x2 – OpenEpi', 190, 32, { align: 'right' });

      // ---------- DONNÉES ----------
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`Exposés malades (a) : ${results.a}`, 25, y); y += 6;
      doc.text(`Exposés non-malades (b) : ${results.b}`, 25, y); y += 6;
      doc.text(`Non-exposés malades (c) : ${results.c}`, 25, y); y += 6;
      doc.text(`Non-exposés non-malades (d) : ${results.d}`, 25, y); y += 12;

      // ---------- TABLEAU CONTINGENCE ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Tableau de contingence', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;

      const tableData = [
        ['Exposé', results.a, results.b, results.totalExposed],
        ['Non-exposé', results.c, results.d, results.totalUnexposed],
        ['Total', results.totalDiseased, results.totalUndiseased, results.total]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Exposition', 'Malade', 'Non-malade', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- INCIDENCES ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Incidences', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;

      const incTable = [
        ['Chez exposés', results.incExposedPct],
        ['Chez non-exposés', results.incUnexposedPct],
        ['Totale', results.incTotalPct]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Paramètre', 'Valeur']],
        body: incTable,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- MESURES ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Mesures d\'association', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;

      const measuresTable = [
        ['Odds Ratio (OR)', `${results.or}`, `${results.orLower} – ${results.orUpper}`, results.orInterpretation],
        ['Risque Relatif (RR)', `${results.rr}`, `${results.rrLower} – ${results.rrUpper}`, results.rrInterpretation]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Mesure', 'Valeur', 'IC 95%', 'Interprétation']],
        body: measuresTable,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 55 }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- TESTS ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Tests statistiques', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;

      const testTable = [
        ['Chi² non corrigé', results.chi2unc, results.punc],
        ['Chi² Mantel-Haenszel', results.chi2mh, results.pmh],
        ['Chi² corrigé (Yates)', results.chi2yates, results.pyates],
        ['Fisher exact 1-queue', '—', results.fisherOne],
        ['Fisher exact 2-queues', '—', results.fisherTwo]
      ];

      autoTable(doc, {
        startY: y,
        head: [['Test', 'Valeur', 'p-value']],
        body: testTable,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ---------- CONCLUSION ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Conclusion', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 8;

      let interpretation = results.chi2Interpretation;
      if (typeof results.rr === 'number') {
        interpretation += ` Le risque relatif est ${results.rr}, indiquant un ${results.rrInterpretation.toLowerCase()}.`;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 8;

      // ---------- PIED DE PAGE ----------
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Calculateur 2x2 – Fidèle à OpenEpi', 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });

      doc.save(`Rapport_2x2_${results.a}_${results.b}_${results.c}_${results.d}.pdf`);
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Tableau 2×2</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Analyse de tableau 2×2</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Calculez l'odds ratio, le risque relatif et le chi-carré.</p>
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
                            value={a}
                            onChange={(e) => setA(e.target.value)}
                            className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="a"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={b}
                            onChange={(e) => setB(e.target.value)}
                            className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="b"
                          />
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
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
                            min="0"
                            step="1"
                            value={d}
                            onChange={(e) => setD(e.target.value)}
                            className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="d"
                          />
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                          {totals.totalUnexposed || '-'}
                        </td>
                      </tr>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Total</td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {totals.totalDiseased || '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {totals.totalUndiseased || '-'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                          {totals.totalAll || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte Incidences */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        Number(results.rr) > 1
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Incidences
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div
                            className={`text-3xl font-bold tracking-tight mb-2 ${
                              Number(results.rr) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.incExposedPct}
                          </div>
                          <span className="text-xs">Exposés</span>
                        </div>
                        <div>
                          <div
                            className={`text-3xl font-bold tracking-tight mb-2 ${
                              Number(results.rr) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.incUnexposedPct}
                          </div>
                          <span className="text-xs">Non-exposés</span>
                        </div>
                        <div>
                          <div
                            className={`text-3xl font-bold tracking-tight mb-2 ${
                              Number(results.rr) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.incTotalPct}
                          </div>
                          <span className="text-xs">Totale</span>
                        </div>
                      </div>
                    </div>

                    {/* Mesures d'association */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        Number(results.rr) > 1
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Mesures d'association
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div
                            className={`text-4xl font-bold tracking-tight mb-2 ${
                              Number(results.or) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.or}
                          </div>
                          <span className="text-xs">Odds Ratio (OR)</span>
                          <p className="text-xs mt-1">{results.orLower} – {results.orUpper} (95% CI)</p>
                        </div>
                        <div>
                          <div
                            className={`text-4xl font-bold tracking-tight mb-2 ${
                              Number(results.rr) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.rr}
                          </div>
                          <span className="text-xs">Risque Relatif (RR)</span>
                          <p className="text-xs mt-1">{results.rrLower} – {results.rrUpper} (95% CI)</p>
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
                        {showStatsDetail ? 'Masquer' : 'Afficher'} les détails statistiques complets
                      </button>

                      {showStatsDetail && (
                        <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                          {!jStatReady && (
                            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                              jStat non disponible – les calculs exacts sont approximés.
                            </div>
                          )}
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold">Méthode</th>
                                <th className="px-3 py-2 text-center font-semibold">Valeur</th>
                                <th className="px-3 py-2 text-center font-semibold">p-value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              <tr>
                                <td className="px-3 py-2 font-medium">Chi² non corrigé</td>
                                <td className="px-3 py-2 text-center font-mono">{results.chi2unc}</td>
                                <td className="px-3 py-2 text-center font-mono">{results.punc}</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Chi² Mantel-Haenszel</td>
                                <td className="px-3 py-2 text-center font-mono">{results.chi2mh}</td>
                                <td className="px-3 py-2 text-center font-mono">{results.pmh}</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Chi² corrigé (Yates)</td>
                                <td className="px-3 py-2 text-center font-mono">{results.chi2yates}</td>
                                <td className="px-3 py-2 text-center font-mono">{results.pyates}</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Fisher exact 1-queue</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">{results.fisherOne}</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Fisher exact 2-queues</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">{results.fisherTwo}</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className="text-sm text-slate-400 mt-3 italic">
                            * Les calculs sont fidèles à OpenEpi, avec approximations Taylor pour les IC.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Test et Interprétation */}
                    <div
                      className={`p-6 rounded-2xl ${
                        Number(results.punc) < 0.05
                          ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/10'
                          : 'bg-slate-100 border-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> Test et Conclusion
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {results.chi2Interpretation}
                        <br />
                        p-value (Chi² non corrigé) = {results.punc}
                        <br />
                        {Number(results.punc) < 0.05 ? (
                          <span className="text-orange-600 font-bold mt-2 block">
                            Association significative (p {'<'} 0.05).
                          </span>
                        ) : (
                          <span className="text-slate-500 mt-2 block">
                            Pas d'association significative.
                          </span>
                        )}
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
                    Analyse un tableau 2x2 pour mesures d'association et tests d'indépendance, fidèle à OpenEpi.
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
                    OR et RR avec IC Taylor, Chi² variés, Fisher exact. Utilisez pour études cas-témoins ou cohortes.
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