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
import jStat from 'jstat';

interface ConfidenceInterval {
  lower: number;
  upper: number;
}

interface CalculationResults {
  numerator: number;
  denominator: number;
  multiplier: number;
  population: number | null;
  compareTo: number;
  proportion: number;
  confidenceLevel: number;
  standardError: number;
  wilsonCI: ConfidenceInterval;
  exactCI: ConfidenceInterval;
  midPCI: ConfidenceInterval;
  normalCI: ConfidenceInterval;
  agrestiCoullCI: ConfidenceInterval;
  fleissCI: ConfidenceInterval;
  npq: number;
  zValue: number;
  pValue: number;
  fpc: number;
}

export default function Proportion() {
  const [numerator, setNumerator] = useState<string>('');
  const [denominator, setDenominator] = useState<string>('');
  const [multiplier, setMultiplier] = useState<string>('100');
  const [population, setPopulation] = useState<string>('');
  const [compareTo, setCompareTo] = useState<string>('50.0');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [calculatedProportion, setCalculatedProportion] = useState<string>('-');
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showStatsDetail, setShowStatsDetail] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Vérification de la disponibilité de jStat
  const hasJStat = typeof (window as any).jStat !== 'undefined';

  // Preview Proportion
  useEffect(() => {
    const num = parseFloat(numerator) || 0;
    const den = parseFloat(denominator) || 0;
    if (den > 0 && num <= den) {
      setCalculatedProportion((num / den).toFixed(4));
    } else {
      setCalculatedProportion('-');
    }
  }, [numerator, denominator]);

  const getZValue = (conf: number): number => {
    const alpha = (100 - conf) / 100;
    return conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;
  };

  // Fonction pour binomial PDF using jStat
  const binomPdf = (k: number, n: number, p: number): number => {
    if (hasJStat) {
      return (window as any).jStat.binomial.pdf(k, n, p);
    }
    return 0; // Fallback
  };

  // Binomial CDF approx by sum
  const binomCdf = (k: number, n: number, p: number): number => {
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      sum += binomPdf(i, n, p);
    }
    return sum;
  };

  // Inversion for Mid-P lower CI using binary search
  const findMidPLower = (x: number, n: number, alpha: number): number => {
    let low = 0;
    let high = 1;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (low + high) / 2;
      const cdf = binomCdf(x - 1, n, mid) + 0.5 * binomPdf(x, n, mid);
      if (cdf < alpha / 2) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  };

  // For upper
  const findMidPUpper = (x: number, n: number, alpha: number): number => {
    let low = 0;
    let high = 1;
    for (let iter = 0; iter < 100; iter++) {
      const mid = (low + high) / 2;
      const cdf = binomCdf(x, n, mid) - 0.5 * binomPdf(x, n, mid);
      if (cdf > 1 - alpha / 2) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  };

  // Calcul complet
  const calculate = () => {
    const num = parseFloat(numerator);
    const den = parseFloat(denominator);
    const mult = parseFloat(multiplier) || 1;
    const pop = parseFloat(population) || null;
    const comp = parseFloat(compareTo) || 50.0;
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;
    const z = getZValue(conf);

    if (isNaN(num) || isNaN(den) || num < 0 || den <= 0 || num > den) {
      setResults(null);
      return;
    }

    const proportion = num / den;
    let fpc = 1;
    if (pop && pop > den) {
      fpc = Math.sqrt((pop - den) / (pop - 1));
    }
    let standardError = Math.sqrt((proportion * (1 - proportion)) / den) * fpc;

    // Wilson CI
    const z2 = z * z;
    const center = (proportion + z2 / (2 * den)) / (1 + z2 / den);
    const margin = z * Math.sqrt((proportion * (1 - proportion) + z2 / (4 * den)) / den) / (1 + z2 / den) * fpc;
    const wilsonCI = {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin)
    };

    // Exact CI (Clopper-Pearson)
    let exactLower = 0, exactUpper = 1;
    if (hasJStat) {
      if (num === 0) {
        exactLower = 0;
        exactUpper = 1 - Math.pow(alpha / 2, 1 / den);
      } else if (num === den) {
        exactLower = Math.pow(alpha / 2, 1 / den);
        exactUpper = 1;
      } else {
        exactLower = (window as any).jStat.beta.inv(alpha / 2, num, den - num + 1);
        exactUpper = (window as any).jStat.beta.inv(1 - alpha / 2, num + 1, den - num);
      }
    } else {
      exactLower = wilsonCI.lower;
      exactUpper = wilsonCI.upper;
    }
    // No fpc for exact

    // Mid-P Exact CI
    let midPLower = 0, midPUpper = 1;
    if (hasJStat && num > 0 && num < den) {
      midPLower = findMidPLower(num, den, alpha);
      midPUpper = findMidPUpper(num, den, alpha);
    } else {
      midPLower = exactLower;
      midPUpper = exactUpper;
    }

    // Normal CI (Wald)
    const normalLower = Math.max(0, proportion - z * standardError);
    const normalUpper = Math.min(1, proportion + z * standardError);

    // Agresti-Coull CI
    const nTilde = den + z2;
    const numTilde = num + z2 / 2;
    const pTilde = numTilde / nTilde;
    let seTilde = Math.sqrt(pTilde * (1 - pTilde) / nTilde);
    if (fpc < 1) seTilde *= fpc; // Apply fpc
    const acLower = Math.max(0, pTilde - z * seTilde);
    const acUpper = Math.min(1, pTilde + z * seTilde);

    // Fleiss Quadratic CI (CC Score)
    const fleissLowerNum = 2 * num + z2 - 1 - z * Math.sqrt(z2 - 2 - 1/den + 4 * num * (den - num + 1)/den);
    const fleissUpperNum = 2 * num + z2 + 1 + z * Math.sqrt(z2 + 2 - 1/den + 4 * num * (den - num - 1)/den);
    const fleissDenom = 2 * (den + z2);
    let fleissLower = fleissLowerNum / fleissDenom;
    let fleissUpper = fleissUpperNum / fleissDenom;
    if (isNaN(fleissLower) || fleissLower < 0) fleissLower = 0;
    if (isNaN(fleissUpper) || fleissUpper > 1) fleissUpper = 1;
    // No fpc for score methods typically, but approximate

    const npq = den * proportion * (1 - proportion);

    // Test vs compareTo / multi (since compareTo in scaled units)
    const p0 = comp / mult;
    const zValue = (proportion - p0) / Math.sqrt(p0 * (1 - p0) / den * fpc ** 2);
    const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(zValue), 0, 1));

    setResults({
      numerator: num,
      denominator: den,
      multiplier: mult,
      population: pop,
      compareTo: comp,
      proportion,
      confidenceLevel: conf,
      standardError,
      wilsonCI,
      exactCI: { lower: exactLower, upper: exactUpper },
      midPCI: { lower: midPLower, upper: midPUpper },
      normalCI: { lower: normalLower, upper: normalUpper },
      agrestiCoullCI: { lower: acLower, upper: acUpper },
      fleissCI: { lower: fleissLower, upper: fleissUpper },
      npq,
      zValue,
      pValue,
      fpc,
    });
  };

  useEffect(() => {
    calculate();
  }, [numerator, denominator, multiplier, population, compareTo, confidenceLevel]);

  // Handlers
  const clear = () => {
    setNumerator('');
    setDenominator('');
    setMultiplier('100');
    setPopulation('');
    setCompareTo('50.0');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setNumerator('10');
    setDenominator('11');
    setMultiplier('100');
    setPopulation('1000000');
    setCompareTo('50.0');
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;
    try {
      const mult = results.multiplier;
      const text = `Analyse Proportion : ${(results.proportion * mult).toFixed(4)} [IC${results.confidenceLevel}% Wilson: ${(results.wilsonCI.lower * mult).toFixed(3)}–${(results.wilsonCI.upper * mult).toFixed(3)}]`;
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) return;
  
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
  
      const mult = results.multiplier;
      // Couleurs
      const colorPrimary = (results.proportion * mult) > 50
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
      doc.text("Rapport d'Analyse Proportion", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Calculateur Proportion – OpenEpi Style', 190, 32, { align: 'right' });
  
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
      doc.text(`Numérateur : ${results.numerator}`, 25, y); y += 6;
      doc.text(`Dénominateur : ${results.denominator}`, 25, y); y += 6;
      doc.text(`Multiplier : ${results.multiplier}`, 25, y); y += 6;
      doc.text(`Taille population : ${results.population ? results.population : 'Infini'}`, 25, y); y += 6;
      doc.text(`Comparer à : ${results.compareTo}`, 25, y); y += 6;
      doc.text(`Niveau de confiance : ${results.confidenceLevel} %`, 25, y); y += 6;
      doc.text(`Méthode exacte : ${hasJStat ? 'Disponible' : 'Approximation'}`, 25, y); y += 12;
  
      // ---------- CARTE PROPORTION ----------
      const cardX = 20, cardY = y, cardW = 170, cardH = 35;
      doc.setFillColor(...colorPrimary.bg);
      doc.setDrawColor(...colorPrimary.border);
      roundedRect(cardX, cardY, cardW, cardH, 5, 'FD');
      doc.setTextColor(...colorPrimary.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PROPORTION ESTIMÉE', cardX + cardW / 2, cardY + 11, { align: 'center' });
      doc.setFontSize(28);
      doc.text((results.proportion * mult).toFixed(4), cardX + cardW / 2, cardY + 28, { align: 'center' });
      y += cardH + 10;
  
  
      // ---------- TABLEAU STATISTIQUE ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Détail des méthodes statistiques', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;
  
      const tableBody = [
        ['Proportion en pourcentage', (results.proportion * mult).toFixed(4), '—', '—'],
        ['Mid-P Exact', '—', `[${(results.midPCI.lower * mult).toFixed(2)} – ${(results.midPCI.upper * mult).toFixed(2)}]`, '—'],
        ['Méthode exacte de Fisher (Clopper-Pearson)', '—', `[${(results.exactCI.lower * mult).toFixed(2)} – ${(results.exactCI.upper * mult).toFixed(2)}]`, '—'],
        ['Test de Wald (approx. normale)', '—', `[${(results.normalCI.lower * mult).toFixed(2)} – ${(results.normalCI.upper * mult).toFixed(2)}]`, '—'],
        ['Test de Wald modifié (Agresti-Coull)', '—', `[${(results.agrestiCoullCI.lower * mult).toFixed(2)} – ${(results.agrestiCoullCI.upper * mult).toFixed(2)}]`, '—'],
        ['Résultat (Wilson)*', '—', `[${(results.wilsonCI.lower * mult).toFixed(2)} – ${(results.wilsonCI.upper * mult).toFixed(2)}]`, '—'],
        ['Correction (quadratique de Fleiss)', '—', `[${(results.fleissCI.lower * mult).toFixed(2)} – ${(results.fleissCI.upper * mult).toFixed(2)}]`, '—'],
      ];
  
      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'Proportion', `IC ${results.confidenceLevel}%`, 'p-value']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100] as [number, number, number],
          textColor: colorSlate[900] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 55, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });
  
      y = (doc as any).lastAutoTable.finalY + 10;
  
      // Avertissement
      if (results.npq < 5) {
        doc.setTextColor(...colorRed);
        doc.text('Le npq de ' + results.npq.toFixed(4) + ' est <5. La méthode de Wald n’est pas recommandée.', 20, y);
        y += 10;
      }
  
      // Test
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Test à un échantillon pour proportion binomiale, méthode de la Loi normale', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`La proportion ${(results.proportion * mult).toFixed(4)} diffère-t-elle de ${results.compareTo} ?`, 20, y);
      y += 6;
      doc.text(`z-value = ${results.zValue.toFixed(3)}`, 20, y);
      y += 6;
      doc.text(`Two-sided p-value = ${results.pValue.toFixed(6)}`, 20, y);
      y += 12;
  
      // ---------- CONCLUSION ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Conclusion', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 8;
  
      let interpretation = '';
      const scaledP = results.proportion * mult;
      const scaledComp = results.compareTo;
      if (scaledP > scaledComp) {
        interpretation = `La proportion est ${((scaledP - scaledComp)).toFixed(1)} supérieure à ${scaledComp}. `;
      } else {
        interpretation = `La proportion est ${((scaledComp - scaledP)).toFixed(1)} inférieure à ${scaledComp}. `;
      }
      const scaledLower = results.wilsonCI.lower * mult;
      const scaledUpper = results.wilsonCI.upper * mult;
      if (scaledLower > scaledComp) {
        interpretation += 'Significativement supérieure.';
      } else if (scaledUpper < scaledComp) {
        interpretation += 'Significativement inférieure.';
      } else {
        interpretation += "L'écart n'est pas statistiquement significatif.";
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
      doc.text('Calculateur Proportion – Fidèle à OpenEpi', 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });
      doc.text(`Méthode : ${hasJStat ? 'Exact (jStat)' : 'Approximation'}`, 20, footerY + 10);
  
      doc.save(`Rapport_Proportion_${results.numerator}_${results.denominator}.pdf`);
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // Calcul des bornes pour la visualisation de l'IC (scaled)
  const getIntervalPosition = () => {
    if (!results) return { left: 0, width: 0 };
    const mult = results.multiplier;
    const minVal = Math.min(0, results.wilsonCI.lower * mult * 0.8);
    const maxVal = Math.max(mult, results.wilsonCI.upper * mult * 1.2);
    const range = maxVal - minVal;
    const left = ((results.wilsonCI.lower * mult - minVal) / range) * 100;
    const right = ((results.wilsonCI.upper * mult - minVal) / range) * 100;
    return { left, width: right - left };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Calculateur Proportion</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Calculateur Proportion</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Intervalles de confiance pour proportion binomiale.</p>
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
      {/* Groupe 1: Numérateur et Dénominateur côte à côte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
            Numérateur
          </label>
          <input
            type="number"
            value={numerator}
            onChange={(e) => setNumerator(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
            placeholder="Ex: 10"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
            Dénominateur
          </label>
          <input
            type="number"
            value={denominator}
            onChange={(e) => setDenominator(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
            placeholder="Ex: 11"
          />
        </div>
      </div>

      {/* Groupe 2: Multiplier et Population côte à côte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
            Multiplier (ex. 100 pour %)
          </label>
          <input
            type="number"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
            placeholder="100"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
            Taille de la population
          </label>
          <input
            type="number"
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
            placeholder="Ex: 1000000"
          />
        </div>
      </div>

      {/* Groupe 3: Comparer à et Niveau de confiance côte à côte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
            Comparer à (% ou unité)
          </label>
          <input
            type="number"
            value={compareTo}
            onChange={(e) => setCompareTo(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
            placeholder="50.0"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
            Niveau de confiance
          </label>
          <select
            value={confidenceLevel}
            onChange={(e) => setConfidenceLevel(e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
          >
            <option value="90">90%</option>
            <option value="95">95% (Standard)</option>
            <option value="99">99%</option>
          </select>
        </div>
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
        onClick={clear}
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
                    <div className="text-4xl font-bold mt-2">
                      {calculatedProportion === '-' ? '0.00' : calculatedProportion}
                    </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte Proportion */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        (results.proportion * results.multiplier) > results.compareTo
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Proportion Estimée
                      </p>
                      <div
                        className={`text-5xl font-bold tracking-tight mb-2 ${
                          (results.proportion * results.multiplier) > results.compareTo ? 'text-orange-600' : 'text-emerald-600'
                        }`}
                      >
                        {(results.proportion * results.multiplier).toFixed(4)}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        {results.numerator} / {results.denominator}
                      </span>
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
                          {!hasJStat && (
                            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                              ⚠️ Librairie jStat non détectée – les intervalles exacts sont remplacés par des approximations. Pour des calculs précis, incluez jStat dans votre projet.
                            </div>
                          )}
                          {results.npq < 5 && (
                            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                              Le npq de {results.npq.toFixed(4)} est {'<'} 5. La méthode de Wald n’est pas recommandée.
                            </div>
                          )}
                          <table className="w-full text-xs sm:text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold">Méthode</th>
                                <th className="px-3 py-2 text-center font-semibold">Proportion</th>
                                <th className="px-3 py-2 text-center font-semibold">CL bas</th>
                                <th className="px-3 py-2 text-center font-semibold">CL haut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              <tr>
                                <td className="px-3 py-2 font-medium">Proportion en pourcentage</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.proportion * results.multiplier).toFixed(4)}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Mid-P Exact</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.midPCI.lower * results.multiplier).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.midPCI.upper * results.multiplier).toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Méthode exacte de Fisher (Clopper-Pearson)</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.exactCI.lower * results.multiplier).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.exactCI.upper * results.multiplier).toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Test de Wald (approx. normale)</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.normalCI.lower * results.multiplier).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.normalCI.upper * results.multiplier).toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Test de Wald modifié (Agresti-Coull)</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.agrestiCoullCI.lower * results.multiplier).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.agrestiCoullCI.upper * results.multiplier).toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Résultat (Wilson)*</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.wilsonCI.lower * results.multiplier).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.wilsonCI.upper * results.multiplier).toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium">Correction (quadratique de Fleiss)</td>
                                <td className="px-3 py-2 text-center font-mono">—</td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.fleissCI.lower * results.multiplier).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {(results.fleissCI.upper * results.multiplier).toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <p className="text-sm text-slate-400 mt-3 italic">
                            * Regarder en premier les éléments : sélection d’éléments de l’éditeur à examiner en premier.
                          </p>
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
                        <Info className="w-4 h-4 text-blue-500" /> Test et Conclusion
                      </h3>
                      <p className="text-sm leading-relaxed">
                        La proportion {(results.proportion * results.multiplier).toFixed(4)} diffère-t-elle de {results.compareTo} ?
                        <br />
                        z-value = {results.zValue.toFixed(3)}
                        <br />
                        Two-sided p-value = {results.pValue.toFixed(6)}
                        <br />
                        {results.pValue < 0.05 ? (
                          <span className="text-orange-600 font-bold mt-2 block">
                            Différence significative (p {'<'} 0.05).
                          </span>
                        ) : (
                          <span className="text-slate-500 mt-2 block">
                            Pas de différence significative.
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

        {/* Modal d'aide  */}
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
                    Le calculateur fournit des intervalles de confiance pour une proportion binomiale, fidèle à OpenEpi.
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
                    Wilson recommandé, Exact conservatrice, Mid-P moins conservatrice, Wald simple mais à éviter si npq {'<'}5, etc.
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