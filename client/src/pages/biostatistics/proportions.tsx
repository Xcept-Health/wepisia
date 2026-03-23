import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

/**
 * Proportion Calculator (Binomial Confidence Intervals)
 *
 * This component computes a proportion and its confidence intervals using multiple methods,
 * exactly as in reference tools like OpenEpi. All calculations rely on jStat for exact
 * distributions (beta, binomial) and provide robust fallbacks.
 */

interface ConfidenceInterval {
  lower: number;
  upper: number;
}

interface CalculationResults {
  numerator: number;
  denominator: number;
  multiplier: number;
  population: number | null;
  compareTo: number;           // value to compare against (scaled)
  proportion: number;           // raw proportion (0-1)
  confidenceLevel: number;
  standardError: number;        // with finite population correction if applicable
  wilsonCI: ConfidenceInterval;
  exactCI: ConfidenceInterval;  // Clopper‑Pearson (beta)
  midPCI: ConfidenceInterval;   // Mid‑P exact
  normalCI: ConfidenceInterval; // Wald
  agrestiCoullCI: ConfidenceInterval;
  fleissCI: ConfidenceInterval; // Fleiss quadratic (score with continuity correction)
  npq: number;                  // n * p * q, used to assess normal approximation
  zValue: number;               // test statistic for comparison
  pValue: number;               // two‑sided p‑value for comparison
  fpc: number;                  // finite population correction factor
}

export default function Proportion() {
  // Input states
  const [numerator, setNumerator] = useState<string>('');
  const [denominator, setDenominator] = useState<string>('');
  const [multiplier, setMultiplier] = useState<string>('100');
  const [population, setPopulation] = useState<string>('');
  const [compareTo, setCompareTo] = useState<string>('50.0');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');

  // Derived / results
  const [calculatedProportion, setCalculatedProportion] = useState<string>('-');
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // jStat is available via ES import – we rely on it for exact computations.
  const hasJStat = true; // jStat is imported, so it's available

  // Preview proportion (simple division) as soon as inputs change
  useEffect(() => {
    const num = parseFloat(numerator) || 0;
    const den = parseFloat(denominator) || 0;
    if (den > 0 && num <= den) {
      setCalculatedProportion((num / den).toFixed(4));
    } else {
      setCalculatedProportion('-');
    }
  }, [numerator, denominator]);

  // Helper: z‑score for given confidence level (two‑tailed)
  const getZValue = (conf: number): number => {
    return conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;
  };

  // ---------- Mid‑P exact interval (requires binomial PDF and CDF) ----------
  // Because jStat does not provide a direct Mid‑P function, we implement a binary search.
  // The Mid‑P interval is defined by solving:
  //   P(X < x | p) + 0.5 * P(X = x | p) = α/2   for lower bound
  //   P(X ≤ x | p) - 0.5 * P(X = x | p) = 1 - α/2 for upper bound
  const binomialPdf = (k: number, n: number, p: number): number => {
    return hasJStat ? jStat.binomial.pdf(k, n, p) : 0;
  };

  const binomialCdf = (k: number, n: number, p: number): number => {
    if (!hasJStat) return 0;
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      sum += jStat.binomial.pdf(i, n, p);
    }
    return sum;
  };


const findMidPUpper = (x: number, n: number, alpha: number): number => {
  if (x === n) return 1;

  let low = 0;
  let high = 1;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    
    // Mid-P formula for upper bound: P(X <= x-1) + 0.5 * P(X = x)
    const midPValue = binomialCdf(x - 1, n, mid) + 0.5 * binomialPdf(x, n, mid);

    // As p increases, the probability of observing x or less decreases.
    // If midPValue is too small, p is too high.
    if (midPValue < alpha / 2) {
      high = mid; // Search in the lower half
    } else {
      low = mid;  // Search in the upper half
    }
  }

  return (low + high) / 2;
};


const findMidPLower = (x: number, n: number, alpha: number): number => {
  if (x === 0) return 0;

  let low = 0;
  let high = 1;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    
    // Mid-P formula for lower bound: P(X > x) + 0.5 * P(X = x)
    // Equivalent to: 1 - [P(X <= x) - 0.5 * P(X = x)]
    const midPValue = (1 - binomialCdf(x, n, mid)) + 0.5 * binomialPdf(x, n, mid);

    // As p increases, the probability of observing x or more increases.
    // If midPValue is too small, p is too low.
    if (midPValue < alpha / 2) {
      low = mid;  // Search in the upper half
    } else {
      high = mid; // Search in the lower half
    }
  }

  return (low + high) / 2;
};

  // ---------- Core calculation ----------
  const calculate = () => {
    const num = parseFloat(numerator);
    const den = parseFloat(denominator);
    const mult = parseFloat(multiplier) || 1;
    const pop = parseFloat(population) || null;
    const comp = parseFloat(compareTo) || 50.0;
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;
    const z = getZValue(conf);

    // Input validation
    if (isNaN(num) || isNaN(den) || num < 0 || den <= 0 || num > den) {
      setResults(null);
      return;
    }

    const proportion = num / den;

    // Finite population correction (FPC)
    let fpc = 1;
    if (pop && pop > den) {
      fpc = Math.sqrt((pop - den) / (pop - 1));
    }

    // Standard error (without FPC yet)
    let standardError = Math.sqrt((proportion * (1 - proportion)) / den) * fpc;

    // ---------- Wilson score interval ----------
    const z2 = z * z;
    const center = (proportion + z2 / (2 * den)) / (1 + z2 / den);
    const margin = (z * Math.sqrt((proportion * (1 - proportion) + z2 / (4 * den)) / den)) / (1 + z2 / den) * fpc;
    const wilsonCI = {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin),
    };

    // ---------- Exact (Clopper‑Pearson) interval using beta distribution ----------
    let exactLower = 0,
      exactUpper = 1;
    if (hasJStat) {
      if (num === 0) {
        exactLower = 0;
        exactUpper = 1 - Math.pow(alpha / 2, 1 / den);
      } else if (num === den) {
        exactLower = Math.pow(alpha / 2, 1 / den);
        exactUpper = 1;
      } else {
        exactLower = jStat.beta.inv(alpha / 2, num, den - num + 1);
        exactUpper = jStat.beta.inv(1 - alpha / 2, num + 1, den - num);
      }
    } else {
      // Fallback: use Wilson
      exactLower = wilsonCI.lower;
      exactUpper = wilsonCI.upper;
    }

    // ---------- Mid‑P exact interval ----------
    let midPLower = 0,
      midPUpper = 1;
    if (hasJStat && num > 0 && num < den) {
      midPLower = findMidPLower(num, den, alpha);
      midPUpper = findMidPUpper(num, den, alpha);
    } else {
      midPLower = exactLower;
      midPUpper = exactUpper;
    }

    // ---------- Wald (normal approximation) interval ----------
    const normalLower = Math.max(0, proportion - z * standardError);
    const normalUpper = Math.min(1, proportion + z * standardError);

    // ---------- Agresti‑Coull interval ----------
    const nTilde = den + z2;
    const numTilde = num + z2 / 2;
    const pTilde = numTilde / nTilde;
    let seTilde = Math.sqrt((pTilde * (1 - pTilde)) / nTilde);
    if (fpc < 1) seTilde *= fpc; // apply FPC if finite population
    const acLower = Math.max(0, pTilde - z * seTilde);
    const acUpper = Math.min(1, pTilde + z * seTilde);

    // ---------- Fleiss quadratic (score with continuity correction) ----------
    // Formula from Fleiss et al. (2003) – Statistical Methods for Rates and Proportions
    let fleissLower = 0,
      fleissUpper = 1;
    if (hasJStat) {
      const z2 = z * z;
      // Lower bound
      const termLower = z * Math.sqrt(z2 - 2 - 1 / den + (4 * num * (den - num + 1)) / den);
      fleissLower = (2 * num + z2 - 1 - termLower) / (2 * (den + z2));
      // Upper bound
      const termUpper = z * Math.sqrt(z2 + 2 - 1 / den + (4 * (num + 1) * (den - num - 1)) / den);
      fleissUpper = (2 * num + z2 + 1 + termUpper) / (2 * (den + z2));
      // Clamp to [0,1]
      fleissLower = Math.max(0, Math.min(1, fleissLower));
      fleissUpper = Math.max(0, Math.min(1, fleissUpper));
    } else {
      fleissLower = wilsonCI.lower;
      fleissUpper = wilsonCI.upper;
    }

    // npq = n * p * q (used to warn when normal approximation is questionable)
    const npq = den * proportion * (1 - proportion);

    // ---------- One‑sample z‑test against a reference value (comp) ----------
    // The reference value is on the scaled scale, so we convert back to raw proportion.
    const p0 = comp / mult;
    const zValue = (proportion - p0) / Math.sqrt((p0 * (1 - p0)) / den) * fpc; // apply FPC to standard error
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

  // Re‑run calculation whenever any input changes
  useEffect(() => {
    calculate();
  }, [numerator, denominator, multiplier, population, compareTo, confidenceLevel]);

  // ---------- UI Handlers ----------
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
      const scaledProp = results.proportion * mult;
      const scaledComp = results.compareTo;
      const colorPrimary =
        scaledProp > scaledComp
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
      const colorRed = [239, 68, 68] as [number, number, number];

      // Helper for rounded rectangles
      const roundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
        doc.roundedRect(x, y, w, h, r, r, style);
      };

      // ---------- Header ----------
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
      doc.text('Calculateur Proportion – Épidémiologie', 190, 32, { align: 'right' });

      // ---------- Input data ----------
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
      doc.text(`Numérateur : ${results.numerator}`, 25, y);
      y += 6;
      doc.text(`Dénominateur : ${results.denominator}`, 25, y);
      y += 6;
      doc.text(`Multiplicateur : ${results.multiplier}`, 25, y);
      y += 6;
      doc.text(`Taille population : ${results.population ? results.population : 'Infinie'}`, 25, y);
      y += 6;
      doc.text(`Comparer à : ${results.compareTo}`, 25, y);
      y += 6;
      doc.text(`Niveau de confiance : ${results.confidenceLevel} %`, 25, y);
      y += 6;
      doc.text(`Méthode exacte : ${hasJStat ? 'β (Clopper‑Pearson)' : 'Approximation'}`, 25, y);
      y += 12;

      // ---------- Proportion card ----------
      const cardX = 20,
        cardY = y,
        cardW = 170,
        cardH = 35;
      doc.setFillColor(...colorPrimary.bg);
      doc.setDrawColor(...colorPrimary.border);
      roundedRect(cardX, cardY, cardW, cardH, 5, 'FD');
      doc.setTextColor(...colorPrimary.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PROPORTION ESTIMÉE', cardX + cardW / 2, cardY + 11, { align: 'center' });
      doc.setFontSize(28);
      doc.text(scaledProp.toFixed(4), cardX + cardW / 2, cardY + 28, { align: 'center' });
      y += cardH + 10;

      // ---------- Confidence interval visualisation (Wilson) ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(`Intervalle de confiance à ${results.confidenceLevel}% (Wilson)`, 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 10;

      // Simple axis from 0 to max scaled (max of multiplier or 100)
      const axisX = 30,
        axisY = y,
        axisWidth = 150;
      const maxScale = Math.max(mult, 100); // ensure axis shows full range
      const minScale = 0;

      doc.setDrawColor(...colorSlate[300]);
      doc.setLineWidth(0.5);
      doc.line(axisX, axisY, axisX + axisWidth, axisY);

      for (let i = 0; i <= 10; i++) {
        const val = (i / 10) * maxScale;
        const x = axisX + (i / 10) * axisWidth;
        doc.setDrawColor(...(i % 5 === 0 ? colorSlate[500] : colorSlate[300]));
        doc.line(x, axisY - 2, x, axisY + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...colorSlate[500]);
        doc.text(val.toFixed(0), x, axisY + 5, { align: 'center' });
      }

      // Mark the comparison value
      const compX = axisX + (scaledComp / maxScale) * axisWidth;
      doc.setDrawColor(...colorRed);
      doc.setLineWidth(0.8);
      doc.line(compX, axisY - 4, compX, axisY + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colorRed);
      doc.text(`H₀ = ${scaledComp}`, compX, axisY - 6, { align: 'center' });

      // Draw confidence interval bar (Wilson)
      const leftVal = Math.max(minScale, Math.min(maxScale, results.wilsonCI.lower * mult));
      const rightVal = Math.max(minScale, Math.min(maxScale, results.wilsonCI.upper * mult));
      const barStartX = axisX + (leftVal / maxScale) * axisWidth;
      const barEndX = axisX + (rightVal / maxScale) * axisWidth;
      const barWidth = barEndX - barStartX;
      const barY = axisY - 3.5;
      const barHeight = 2.5;

      if (barWidth > 0) {
        doc.setFillColor(59, 130, 246);
        doc.setDrawColor(29, 78, 216);
        doc.roundedRect(barStartX, barY, barWidth, barHeight, 1, 1, 'FD');
        doc.setFillColor(29, 78, 216);
        doc.circle(barStartX, barY + barHeight / 2, 0.6, 'F');
        doc.circle(barEndX, barY + barHeight / 2, 0.6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(29, 78, 216);
        doc.text(leftVal.toFixed(1), barStartX, barY - 4, { align: 'center' });
        doc.text(rightVal.toFixed(1), barEndX, barY - 4, { align: 'center' });
      }

      y = axisY + 20;

      // ---------- Statistical table ----------
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Détail des méthodes statistiques', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = [
        ['Proportion en pourcentage', scaledProp.toFixed(4), '—', '—'],
        ['Mid‑P exact', '—', `${(results.midPCI.lower * mult).toFixed(2)} – ${(results.midPCI.upper * mult).toFixed(2)}`, '—'],
        ['Exact (Clopper‑Pearson)', '—', `${(results.exactCI.lower * mult).toFixed(2)} – ${(results.exactCI.upper * mult).toFixed(2)}`, '—'],
        ['Wald (approx. normale)', '—', `${(results.normalCI.lower * mult).toFixed(2)} – ${(results.normalCI.upper * mult).toFixed(2)}`, '—'],
        ['Agresti‑Coull', '—', `${(results.agrestiCoullCI.lower * mult).toFixed(2)} – ${(results.agrestiCoullCI.upper * mult).toFixed(2)}`, '—'],
        ['Wilson (recommandé)', '—', `${(results.wilsonCI.lower * mult).toFixed(2)} – ${(results.wilsonCI.upper * mult).toFixed(2)}`, '—'],
        ['Fleiss quadratique', '—', `${(results.fleissCI.lower * mult).toFixed(2)} – ${(results.fleissCI.upper * mult).toFixed(2)}`, '—'],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'Proportion', `IC ${results.confidenceLevel}%`, 'p‑value']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100],
          textColor: colorSlate[900],
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
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Warning if npq < 5
      if (results.npq < 5) {
        doc.setTextColor(...colorRed);
        doc.text(`npq = ${results.npq.toFixed(4)} < 5 – la méthode de Wald n'est pas recommandée.`, 20, y);
        y += 8;
      }

      // Hypothesis test
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Test à un échantillon (comparaison à une valeur de référence)', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`La proportion ${scaledProp.toFixed(4)} diffère-t-elle de ${scaledComp} ?`, 20, y);
      y += 6;
      doc.text(`z = ${results.zValue.toFixed(3)}`, 20, y);
      y += 6;
      doc.text(`p‑value bilatérale = ${results.pValue.toFixed(6)}`, 20, y);
      y += 12;

      // Interpretation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Interprétation', 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 8;

      let interpretation = '';
      if (scaledProp > scaledComp) {
        interpretation = `La proportion est supérieure de ${(scaledProp - scaledComp).toFixed(1)} à ${scaledComp}. `;
      } else {
        interpretation = `La proportion est inférieure de ${(scaledComp - scaledProp).toFixed(1)} à ${scaledComp}. `;
      }
      if (results.wilsonCI.lower * mult > scaledComp) {
        interpretation += 'Significativement supérieure (IC > valeur de référence).';
      } else if (results.wilsonCI.upper * mult < scaledComp) {
        interpretation += 'Significativement inférieure (IC < valeur de référence).';
      } else {
        interpretation += "L'écart n'est pas statistiquement significatif (l'IC contient la valeur de référence).";
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 8;

      // Footer
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Calculateur Proportion – Outil statistique pour épidémiologie', 20, footerY + 5);
      doc.text('Page 1 / 1', 190, footerY + 5, { align: 'right' });
      doc.text(`Méthode : ${hasJStat ? 'jStat (exact)' : 'Approximation'}`, 20, footerY + 10);

      doc.save(`Rapport_Proportion_${results.numerator}_${results.denominator}.pdf`);
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // Helper for the visual interval in the UI (scaled)
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

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li>
              <Link href="/" className="hover:text-blue-500 transition-colors">
                Accueil
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3" />
            </li>
            <li>
              <span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                Calculateur Proportion
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Calculateur Proportion
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Intervalles de confiance pour proportion binomiale.
              </p>
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
                {/* Numerator and Denominator  */}
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

                {/* Multiplier and Population */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                      Multiplicateur (ex. 100 pour %)
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
                      Taille population (optionnel)
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

                {/* Compare to and Confidence level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                      Comparer à
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
                      {calculatedProportion === '-' ? '0.00' : calculatedProportion}
                    </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Proportion card */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        results.proportion * results.multiplier > results.compareTo
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Proportion Estimée
                      </p>
                      <div
                        className={`text-5xl font-bold tracking-tight mb-2 ${
                          results.proportion * results.multiplier > results.compareTo
                            ? 'text-orange-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {(results.proportion * results.multiplier).toFixed(4)}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        {results.numerator} / {results.denominator}
                      </span>
                    </div>

                    {/* Confidence interval visualisation (UI version) */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-sm font-semibold text-slate-500">
                          Intervalle de Confiance ({results.confidenceLevel}%) – Wilson
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-full text-blue-700 dark:text-blue-300 font-bold shadow-sm border border-blue-200 dark:border-blue-800">
                            {hasJStat ? 'Méthodes exactes' : 'Approximation'}
                          </span>
                        </div>
                      </div>

                      {/* Visual scale */}
                      <div className="relative h-24 mb-2">
                        <div className="absolute w-full h-2 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-full top-8 shadow-inner"></div>

                        {[...Array(11)].map((_, i) => {
                          const value = (i / 10) * results.multiplier;
                          const left = (i / 10) * 100;
                          return (
                            <div
                              key={i}
                              className="absolute flex flex-col items-center"
                              style={{ left: `${left}%`, top: '4px' }}
                            >
                              <div
                                className={`h-2 w-0.5 ${
                                  i % 5 === 0 ? 'bg-slate-500 dark:bg-slate-400' : 'bg-slate-300 dark:bg-slate-600'
                                } rounded-full`}
                              ></div>
                              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-1 -translate-x-1/2">
                                {value.toFixed(0)}
                              </span>
                            </div>
                          );
                        })}

                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center"
                          style={{ left: `${(results.compareTo / results.multiplier / 2) * 100}%` }}
                        >
                          <div className="h-4 w-0.5 bg-red-400 dark:bg-red-500 rounded-full shadow-sm"></div>
                          <span className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-1">
                            H₀ = {results.compareTo}
                          </span>
                        </div>

                        {(() => {
                          const pos = getIntervalPosition();
                          return (
                            <>
                              <div
                                className="absolute h-3 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 top-7 transition-all duration-300"
                                style={{
                                  left: `${pos.left}%`,
                                  width: `${pos.width}%`,
                                  transform: 'translateY(-50%)',
                                }}
                              >
                                <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                              </div>

                              <div
                                className="absolute top-7 w-0.5 h-5 bg-blue-700 dark:bg-blue-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md"
                                style={{ left: `${pos.left}%` }}
                              >
                                <div className="absolute -left-1 top-1/2 w-2 h-2 bg-blue-700 dark:bg-blue-400 rounded-full"></div>
                              </div>
                              <div
                                className="absolute top-7 w-0.5 h-5 bg-blue-700 dark:bg-blue-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md"
                                style={{ left: `${pos.left + pos.width}%` }}
                              >
                                <div className="absolute -right-1 top-1/2 w-2 h-2 bg-blue-700 dark:bg-blue-400 rounded-full"></div>
                              </div>

                              <div
                                className="absolute -top-6 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm"
                                style={{ left: `${pos.left}%`, transform: 'translateX(-50%)' }}
                              >
                                {(results.wilsonCI.lower * results.multiplier).toFixed(1)}
                              </div>
                              <div
                                className="absolute -top-6 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm"
                                style={{ left: `${pos.left + pos.width}%`, transform: 'translateX(50%)' }}
                              >
                                {(results.wilsonCI.upper * results.multiplier).toFixed(1)}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex justify-between items-end pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex gap-6">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Borne inf.</p>
                            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {(results.wilsonCI.lower * results.multiplier).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-slate-400">IC {results.confidenceLevel}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Borne sup.</p>
                            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {(results.wilsonCI.upper * results.multiplier).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-slate-400">IC {results.confidenceLevel}%</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Largeur</p>
                          <p className="text-lg font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {((results.wilsonCI.upper - results.wilsonCI.lower) * results.multiplier).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statistical table */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                        {!hasJStat && (
                          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                            Librairie jStat non détectée – les intervalles exacts sont remplacés par des approximations.
                          </div>
                        )}
                        {results.npq < 5 && (
                          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                            npq = {results.npq.toFixed(4)} &lt; 5 – la méthode de Wald (normale) n'est pas recommandée.
                          </div>
                        )}
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Méthode</th>
                              <th className="px-3 py-2 text-center font-semibold">Proportion</th>
                              <th className="px-3 py-2 text-center font-semibold">IC {results.confidenceLevel}%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr>
                              <td className="px-3 py-2 font-medium">Proportion en pourcentage</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {(results.proportion * results.multiplier).toFixed(4)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Mid‑P exact</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {(results.midPCI.lower * results.multiplier).toFixed(2)} –{' '}
                                {(results.midPCI.upper * results.multiplier).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Exact (Clopper‑Pearson)</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {(results.exactCI.lower * results.multiplier).toFixed(2)} –{' '}
                                {(results.exactCI.upper * results.multiplier).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Wald (approx. normale)</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {(results.normalCI.lower * results.multiplier).toFixed(2)} –{' '}
                                {(results.normalCI.upper * results.multiplier).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Agresti‑Coull</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {(results.agrestiCoullCI.lower * results.multiplier).toFixed(2)} –{' '}
                                {(results.agrestiCoullCI.upper * results.multiplier).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Wilson*</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {(results.wilsonCI.lower * results.multiplier).toFixed(2)} –{' '}
                                {(results.wilsonCI.upper * results.multiplier).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">Fleiss quadratique</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {(results.fleissCI.lower * results.multiplier).toFixed(2)} –{' '}
                                {(results.fleissCI.upper * results.multiplier).toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-sm text-slate-400 mt-3 italic">
                          * Wilson est généralement recommandé pour les proportions.
                        </p>
                      </div>
                    </div>

                    {/* Hypothesis test and interpretation */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> Test et Interprétation
                      </h3>
                      <p className="text-sm leading-relaxed">
                        La proportion {(results.proportion * results.multiplier).toFixed(4)} diffère-t-elle de {results.compareTo} ?
                        <br />
                        z = {results.zValue.toFixed(3)} – p‑value bilatérale = {results.pValue.toFixed(6)}
                        <br />
                        {results.pValue < 0.05 ? (
                          <span className="text-orange-600 font-bold mt-2 block">
                            Différence statistiquement significative (p &lt; 0.05).
                          </span>
                        ) : (
                          <span className="text-slate-500 mt-2 block">
                            Pas de différence significative (p ≥ 0.05).
                          </span>
                        )}
                      </p>
                      <p className="text-sm mt-3">
                        {results.wilsonCI.lower * results.multiplier > results.compareTo
                          ? "L'intervalle de confiance est entièrement supérieur à la valeur de référence."
                          : results.wilsonCI.upper * results.multiplier < results.compareTo
                          ? "L'intervalle de confiance est entièrement inférieur à la valeur de référence."
                          : "L'intervalle de confiance contient la valeur de référence."}
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide Rapide – Proportion</h3>
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
                    Ce calculateur estime une proportion à partir d'un échantillon binomial et fournit plusieurs intervalles de confiance, ainsi qu'un test de comparaison à une valeur de référence. Il reproduit les méthodes d'OpenEpi.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Méthodes de calcul
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      <strong className="text-slate-900 dark:text-white">Mid‑P exact</strong> – Intervalle basé sur la distribution binomiale avec correction de continuité (moins conservateur que Clopper‑Pearson).
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Exact (Clopper‑Pearson)</strong> – Intervalle de confiance exact basé sur la distribution bêta. Garantit une couverture d'au moins (1‑α).
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Wald (approx. normale)</strong> – Intervalle classique p ± z·SE. À éviter lorsque npq &lt; 5.
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Agresti‑Coull</strong> – Amélioration de Wald en ajoutant deux succès et deux échecs.
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Wilson</strong> – Intervalle de score, recommandé pour la plupart des situations (excellent compromis).
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Fleiss quadratique</strong> – Approximation par score avec correction de continuité, souvent utilisée pour les grands échantillons.
                    </p>
                  </div>
                  <a
                    href="https://www.openepi.com/Proportion/Proportion.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source: OpenEpi <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Correction pour population finie
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Si vous fournissez une taille de population, l'erreur standard est multipliée par le facteur de correction √((N‑n)/(N‑1)). Cela réduit la largeur de l'intervalle.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      4
                    </div>
                    Test de comparaison
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Le test z compare la proportion observée à une valeur de référence. La p‑value bilatérale indique si la différence est statistiquement significative.
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