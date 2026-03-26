import { useState, useEffect, useRef } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, X, Info, RotateCcw, ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import jStat from 'jstat';

/**
 * Two-by-Two Contingency Table Analysis
 *
 * This component computes odds ratios, relative risks, confidence intervals,
 * chi-square tests, and Fisher's exact test for 2x2 tables, exactly as in
 * reference tools like OpenEpi. All calculations rely on jStat for exact
 * distributions (chi-square, combinations).
 */

interface ConfidenceInterval {
  lower: number;
  upper: number;
}

interface CalculationResults {
  a: number;
  b: number;
  c: number;
  d: number;
  totalExposed: number;
  totalUnexposed: number;
  totalDiseased: number;
  totalUndiseased: number;
  total: number;
  incidenceExposed: number;
  incidenceUnexposed: number;
  incidenceTotal: number;
  incidenceExposedPct: string;
  incidenceUnexposedPct: string;
  incidenceTotalPct: string;
  oddsRatio: number | null;
  oddsRatioCI: ConfidenceInterval | null;
  relativeRisk: number | null;
  relativeRiskCI: ConfidenceInterval | null;
  chi2Uncorrected: number;
  chi2UncorrectedP: number;
  chi2MantelHaenszel: number;
  chi2MantelHaenszelP: number;
  chi2Yates: number;
  chi2YatesP: number;
  fisherOneTail: number | null;
  fisherTwoTail: number | null;
  midPOneTail: number | null;
  midPTwoTail: number | null;
  riskExposedCI: ConfidenceInterval | null;
  riskUnexposedCI: ConfidenceInterval | null;
  riskTotalCI: ConfidenceInterval | null;
  riskDifference: number | null;
  riskDifferenceCI: ConfidenceInterval | null;
  attrFracExp: number | null;
  attrFracExpCI: ConfidenceInterval | null;
  attrFracPop: number | null;
  attrFracPopCI: ConfidenceInterval | null;
  attrFracExpOR: number | null;
  attrFracExpORCI: ConfidenceInterval | null;
  attrFracPopOR: number | null;
  attrFracPopORCI: ConfidenceInterval | null;
}

export default function TwoByTwo() {
  const { t } = useTranslation();

  // Input states
  const [a, setA] = useState<string>('');
  const [b, setB] = useState<string>('');
  const [c, setC] = useState<string>('');
  const [d, setD] = useState<string>('');

  const [results, setResults] = useState<CalculationResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // jStat is available via ES import – we rely on it for exact computations.
  const hasJStat = true; // jStat is imported

  // Helper to format p‑values
  const formatPValue = (p: number | null | undefined): string => {
    if (p === null || p === undefined || isNaN(p)) return t('common.na', 'N/A');
    if (p <= 0) return '< 0.0000001';
    if (p >= 0.001) return p.toFixed(4);
    const mag = Math.floor(Math.log10(p));
    return p.toFixed(Math.min(-mag + 3, 10));
  };

  const formatPct = (v: number, decimals = 2): string =>
    (v * 100).toFixed(decimals) + '%';

  // Custom hypergeometric PDF using jStat.combination
  const hypergeometricPdf = (k: number, n: number, K: number, N: number): number => {
    if (k < Math.max(0, n + K - N) || k > Math.min(n, K)) return 0;
    const comb1 = jStat.combination(K, k);
    const comb2 = jStat.combination(N - K, n - k);
    const comb3 = jStat.combination(N, n);
    return (comb1 * comb2) / comb3;
  };

  // Validate inputs (all must be non‑negative integers)
  const validateInputs = (): boolean => {
    const aVal = parseInt(a);
    const bVal = parseInt(b);
    const cVal = parseInt(c);
    const dVal = parseInt(d);
    return (
      !isNaN(aVal) && !isNaN(bVal) && !isNaN(cVal) && !isNaN(dVal) &&
      aVal >= 0 && bVal >= 0 && cVal >= 0 && dVal >= 0
    );
  };

  // Compute totals for display
  const totals = {
    totalExposed: (parseInt(a) || 0) + (parseInt(b) || 0),
    totalUnexposed: (parseInt(c) || 0) + (parseInt(d) || 0),
    totalDiseased: (parseInt(a) || 0) + (parseInt(c) || 0),
    totalUndiseased: (parseInt(b) || 0) + (parseInt(d) || 0),
    totalAll: (parseInt(a) || 0) + (parseInt(b) || 0) + (parseInt(c) || 0) + (parseInt(d) || 0),
  };

  // Core calculation
  const calculate = () => {
    if (!validateInputs()) {
      setResults(null);
      return;
    }

    const aVal = parseInt(a);
    const bVal = parseInt(b);
    const cVal = parseInt(c);
    const dVal = parseInt(d);
    const n = aVal + bVal + cVal + dVal;

    if (n === 0) {
      setResults(null);
      return;
    }

    const r1 = aVal + bVal; // total exposed
    const r2 = cVal + dVal; // total unexposed
    const c1 = aVal + cVal; // total diseased
    const c2 = bVal + dVal; // total non‑diseased

    // Incidences (as percentages)
    const incExposed = r1 > 0 ? aVal / r1 : 0;
    const incUnexposed = r2 > 0 ? cVal / r2 : 0;
    const incTotal = n > 0 ? c1 / n : 0;

    // Odds Ratio and 95% CI (Taylor series / Woolf)
    let oddsRatio: number | null = null;
    let oddsRatioCI: ConfidenceInterval | null = null;
    if (bVal > 0 && cVal > 0) {
      oddsRatio = (aVal * dVal) / (bVal * cVal);
      const lnOR = Math.log(oddsRatio);
      const seOR = Math.sqrt(1 / aVal + 1 / bVal + 1 / cVal + 1 / dVal);
      const z = 1.96; // 95% confidence
      oddsRatioCI = {
        lower: Math.exp(lnOR - z * seOR),
        upper: Math.exp(lnOR + z * seOR),
      };
    }

    // Relative Risk and 95% CI (Taylor series)
    let relativeRisk: number | null = null;
    let relativeRiskCI: ConfidenceInterval | null = null;
    if (incUnexposed > 0) {
      relativeRisk = incExposed / incUnexposed;
      if (Number.isFinite(relativeRisk) && relativeRisk > 0) {
        const lnRR = Math.log(relativeRisk);
        const seRR = Math.sqrt(bVal / (aVal * r1) + dVal / (cVal * r2));
        const z = 1.96;
        relativeRiskCI = {
          lower: Math.exp(lnRR - z * seRR),
          upper: Math.exp(lnRR + z * seRR),
        };
      }
    }

    // Chi‑square tests
    const adbc = aVal * dVal - bVal * cVal;
    const absadbc = Math.abs(adbc);
    const denom = r1 * r2 * c1 * c2;

    let chi2Uncorrected = 0,
      chi2MantelHaenszel = 0,
      chi2Yates = 0;

    if (denom > 0) {
      chi2Uncorrected = (adbc ** 2 * n) / denom;
      chi2MantelHaenszel = (adbc ** 2 * (n - 1)) / denom; // Mantel‑Haenszel (N-1)
      chi2Yates = ((absadbc - 0.5 * n) ** 2 * n) / denom;
      if (chi2Yates < 0) chi2Yates = 0;
    }

    // p‑values from chi‑square distribution (1 d.f.)
    const chi2UncorrectedP = hasJStat ? 1 - jStat.chisquare.cdf(chi2Uncorrected, 1) : NaN;
    const chi2MantelHaenszelP = hasJStat ? 1 - jStat.chisquare.cdf(chi2MantelHaenszel, 1) : NaN;
    const chi2YatesP = hasJStat ? 1 - jStat.chisquare.cdf(chi2Yates, 1) : NaN;

    // Fisher's exact test using hypergeometric distribution
    let fisherOneTail: number | null = null;
    let fisherTwoTail: number | null = null;
    if (hasJStat && n > 0) {
      const minA = Math.max(0, r1 + c1 - n);
      const maxA = Math.min(r1, c1);
      const expected = (r1 * c1) / n;
      const observedProb = hypergeometricPdf(aVal, r1, c1, n);

      let oneTail = 0;
      let twoTail = 0;

      for (let k = minA; k <= maxA; k++) {
        const p = hypergeometricPdf(k, r1, c1, n);
        if (p <= observedProb + Number.EPSILON) twoTail += p;
        if (aVal >= expected) {
          if (k >= aVal) oneTail += p;
        } else {
          if (k <= aVal) oneTail += p;
        }
      }

      fisherOneTail = oneTail;
      fisherTwoTail = twoTail;
    }

    // Mid-P exact
    let midPOneTail: number | null = null;
    let midPTwoTail: number | null = null;
    if (fisherOneTail !== null && fisherTwoTail !== null) {
      const obsP = hypergeometricPdf(aVal, r1, c1, n);
      midPOneTail = Math.max(0, fisherOneTail - 0.5 * obsP);
      midPTwoTail = Math.max(0, fisherTwoTail - obsP);
    }

    // CI for individual risks (Taylor)
    const propCI = (prop: number, total: number): ConfidenceInterval => {
      const se = Math.sqrt(prop * (1 - prop) / total);
      return {
        lower: Math.max(0, prop - 1.96 * se),
        upper: Math.min(1, prop + 1.96 * se),
      };
    };
    const riskExposedCI = r1 > 0 ? propCI(incExposed, r1) : null;
    const riskUnexposedCI = r2 > 0 ? propCI(incUnexposed, r2) : null;
    const riskTotalCI = propCI(incTotal, n);

    // Risk difference (Taylor)
    let riskDifference: number | null = null;
    let riskDifferenceCI: ConfidenceInterval | null = null;
    if (r1 > 0 && r2 > 0) {
      riskDifference = incExposed - incUnexposed;
      const seRD = Math.sqrt(
        incExposed * (1 - incExposed) / r1 +
        incUnexposed * (1 - incUnexposed) / r2
      );
      riskDifferenceCI = {
        lower: riskDifference - 1.96 * seRD,
        upper: riskDifference + 1.96 * seRD,
      };
    }

    // Etiological fractions based on risk
    let attrFracExp: number | null = null;
    let attrFracExpCI: ConfidenceInterval | null = null;
    let attrFracPop: number | null = null;
    let attrFracPopCI: ConfidenceInterval | null = null;

    if (relativeRisk !== null && relativeRisk > 0 && relativeRiskCI !== null) {
      // FEe = (RR-1)/RR
      attrFracExp = (relativeRisk - 1) / relativeRisk;
      attrFracExpCI = {
        lower: (relativeRiskCI.lower - 1) / relativeRiskCI.lower,
        upper: (relativeRiskCI.upper - 1) / relativeRiskCI.upper,
      };

      // FEp = pe*(RR-1)/(pe*(RR-1)+1) — Levin's method
      const pe = r1 / n;
      const numFEp = pe * (relativeRisk - 1);
      if (numFEp + 1 > 0) {
        attrFracPop = numFEp / (numFEp + 1);
        const fePopFromRR = (rr: number) => {
          const num = pe * (rr - 1);
          return Math.max(0, num / (num + 1));
        };
        attrFracPopCI = {
          lower: fePopFromRR(relativeRiskCI.lower),
          upper: fePopFromRR(relativeRiskCI.upper),
        };
      }
    }

    // Etiological fractions based on OR
    let attrFracExpOR: number | null = null;
    let attrFracExpORCI: ConfidenceInterval | null = null;
    let attrFracPopOR: number | null = null;
    let attrFracPopORCI: ConfidenceInterval | null = null;

    if (oddsRatio !== null && oddsRatio > 0 && oddsRatioCI !== null) {
      // FEe|OR = (OR-1)/OR
      attrFracExpOR = (oddsRatio - 1) / oddsRatio;
      attrFracExpORCI = {
        lower: (oddsRatioCI.lower - 1) / oddsRatioCI.lower,
        upper: (oddsRatioCI.upper - 1) / oddsRatioCI.upper,
      };

      // FEp|OR = (a/c1) * (OR-1)/OR
      const pc = c1 > 0 ? aVal / c1 : 0;
      attrFracPopOR = pc * attrFracExpOR;
      attrFracPopORCI = {
        lower: pc * attrFracExpORCI.lower,
        upper: pc * attrFracExpORCI.upper,
      };
    }

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
      incidenceExposed: incExposed,
      incidenceUnexposed: incUnexposed,
      incidenceTotal: incTotal,
      incidenceExposedPct: (incExposed * 100).toFixed(1) + '%',
      incidenceUnexposedPct: (incUnexposed * 100).toFixed(1) + '%',
      incidenceTotalPct: (incTotal * 100).toFixed(1) + '%',
      oddsRatio,
      oddsRatioCI,
      relativeRisk,
      relativeRiskCI,
      chi2Uncorrected,
      chi2UncorrectedP,
      chi2MantelHaenszel,
      chi2MantelHaenszelP,
      chi2Yates,
      chi2YatesP,
      fisherOneTail,
      fisherTwoTail,
      midPOneTail,
      midPTwoTail,
      riskExposedCI,
      riskUnexposedCI,
      riskTotalCI,
      riskDifference,
      riskDifferenceCI,
      attrFracExp,
      attrFracExpCI,
      attrFracPop,
      attrFracPopCI,
      attrFracExpOR,
      attrFracExpORCI,
      attrFracPopOR,
      attrFracPopORCI,
    });
  };

  // Re‑run calculation whenever any input changes
  useEffect(() => {
    calculate();
  }, [a, b, c, d]);

  // UI Handlers
  const clearForm = () => {
    setA('');
    setB('');
    setC('');
    setD('');
    setResults(null);
    toast.info(t('twoByTwo.clearMessage', 'Fields cleared'));
  };

  const loadExample = () => {
    setA('60');
    setB('40');
    setC('30');
    setD('70');
    toast.success(t('twoByTwo.exampleLoaded', 'Example loaded'));
  };

  const copyResults = async () => {
    if (!results) return;

    const orText = results.oddsRatio ? results.oddsRatio.toFixed(3) : t('common.na', 'N/A');
    const orCI = results.oddsRatioCI
      ? `${results.oddsRatioCI.lower.toFixed(3)}–${results.oddsRatioCI.upper.toFixed(3)}`
      : t('common.na', 'N/A');
    const rrText = results.relativeRisk ? results.relativeRisk.toFixed(3) : t('common.na', 'N/A');
    const rrCI = results.relativeRiskCI
      ? `${results.relativeRiskCI.lower.toFixed(3)}–${results.relativeRiskCI.upper.toFixed(3)}`
      : t('common.na', 'N/A');

    const text = `${t('twoByTwo.copyPrefix')}
${t('twoByTwo.tableTitle')}:
${t('twoByTwo.exposedDiseased')}: ${results.a}
${t('twoByTwo.exposedNonDiseased')}: ${results.b}
${t('twoByTwo.unexposedDiseased')}: ${results.c}
${t('twoByTwo.unexposedNonDiseased')}: ${results.d}

${t('twoByTwo.incidences')}:
  ${t('twoByTwo.exposed')}: ${results.incidenceExposedPct}
  ${t('twoByTwo.unexposed')}: ${results.incidenceUnexposedPct}
  ${t('twoByTwo.total')}: ${results.incidenceTotalPct}

${t('twoByTwo.oddsRatio')}: ${orText} (95% CI: ${orCI})
${t('twoByTwo.relativeRisk')}: ${rrText} (95% CI: ${rrCI})

${t('twoByTwo.chiSquareTests')}:
  ${t('twoByTwo.uncorrected')}: χ² = ${results.chi2Uncorrected.toFixed(3)}, p = ${formatPValue(results.chi2UncorrectedP)}
  ${t('twoByTwo.mantelHaenszel')}: χ² = ${results.chi2MantelHaenszel.toFixed(3)}, p = ${results.chi2MantelHaenszelP.toFixed(8)}
  ${t('twoByTwo.yates')}: χ² = ${results.chi2Yates.toFixed(3)}, p = ${results.chi2YatesP.toFixed(8)}

${t('twoByTwo.fisherExact')}:
  1‑${t('twoByTwo.tail')}: p = ${results.fisherOneTail?.toFixed(8) ?? t('common.na', 'N/A')}
  2‑${t('twoByTwo.tails')}: p = ${results.fisherTwoTail?.toFixed(8) ?? t('common.na', 'N/A')}`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('twoByTwo.copySuccess', 'Results copied'));
    } catch {
      toast.error(t('twoByTwo.copyError', 'Copy failed'));
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

      const colorPrimary =
        (results.relativeRisk ?? 1) > 1
          ? { bg: [255, 247, 237] as [number, number, number], border: [234, 88, 12] as [number, number, number], text: [234, 88, 12] as [number, number, number] }
          : { bg: [236, 253, 245] as [number, number, number], border: [5, 150, 105] as [number, number, number], text: [5, 150, 105] as [number, number, number] };
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
      doc.text(t('twoByTwo.reportTitle'), 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`${t('twoByTwo.reportGenerated')} ${new Date().toLocaleDateString('fr-FR')} ${t('twoByTwo.at')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text(t('twoByTwo.reportSubtitle'), 190, 32, { align: 'right' });

      // Input data table
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('twoByTwo.analysedData'), 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;

      // 2x2 table
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);

      doc.text(t('twoByTwo.exposure'), 25, y);
      doc.text(t('twoByTwo.diseased'), 75, y, { align: 'center' });
      doc.text(t('twoByTwo.nonDiseased'), 115, y, { align: 'center' });
      doc.text(t('twoByTwo.total'), 160, y, { align: 'center' });
      y += 6;

      doc.text(t('twoByTwo.exposed'), 25, y);
      doc.text(results.a.toString(), 75, y, { align: 'center' });
      doc.text(results.b.toString(), 115, y, { align: 'center' });
      doc.text(results.totalExposed.toString(), 160, y, { align: 'center' });
      y += 6;

      doc.text(t('twoByTwo.unexposed'), 25, y);
      doc.text(results.c.toString(), 75, y, { align: 'center' });
      doc.text(results.d.toString(), 115, y, { align: 'center' });
      doc.text(results.totalUnexposed.toString(), 160, y, { align: 'center' });
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text(t('twoByTwo.total'), 25, y);
      doc.text(results.totalDiseased.toString(), 75, y, { align: 'center' });
      doc.text(results.totalUndiseased.toString(), 115, y, { align: 'center' });
      doc.text(results.total.toString(), 160, y, { align: 'center' });
      y += 12;

      // Incidence card
      doc.setFillColor(...colorPrimary.bg);
      doc.setDrawColor(...colorPrimary.border);
      roundedRect(20, y, 170, 35, 5, 'FD');
      doc.setTextColor(...colorPrimary.text);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(t('twoByTwo.incidences'), 105, y + 8, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`${t('twoByTwo.exposed')}: ${results.incidenceExposedPct}`, 35, y + 20);
      doc.text(`${t('twoByTwo.unexposed')}: ${results.incidenceUnexposedPct}`, 105, y + 20, { align: 'center' });
      doc.text(`${t('twoByTwo.total')}: ${results.incidenceTotalPct}`, 175, y + 20, { align: 'center' });
      y += 45;

      // Measures of association
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('twoByTwo.measuresTitle'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      const orValue = results.oddsRatio ? results.oddsRatio.toFixed(3) : t('common.na', 'N/A');
      const orCI = results.oddsRatioCI
        ? `${results.oddsRatioCI.lower.toFixed(3)} – ${results.oddsRatioCI.upper.toFixed(3)}`
        : t('common.na', 'N/A');
      const rrValue = results.relativeRisk ? results.relativeRisk.toFixed(3) : t('common.na', 'N/A');
      const rrCI = results.relativeRiskCI
        ? `${results.relativeRiskCI.lower.toFixed(3)} – ${results.relativeRiskCI.upper.toFixed(3)}`
        : t('common.na', 'N/A');

      const measuresBody = [
        [t('twoByTwo.oddsRatio'), orValue, orCI],
        [t('twoByTwo.relativeRisk'), rrValue, rrCI],
      ];

      autoTable(doc, {
        startY: y,
        head: [[t('twoByTwo.measure'), t('twoByTwo.value'), t('twoByTwo.ci95')]],
        body: measuresBody,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100],
          textColor: colorSlate[900],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 60, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Statistical tests
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('twoByTwo.statTestsTitle'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      const testsBody = [
        [t('twoByTwo.uncorrected'), results.chi2Uncorrected.toFixed(3), results.chi2UncorrectedP.toFixed(8)],
        [t('twoByTwo.mantelHaenszel'), results.chi2MantelHaenszel.toFixed(3), results.chi2MantelHaenszelP.toFixed(8)],
        [t('twoByTwo.yates'), results.chi2Yates.toFixed(3), results.chi2YatesP.toFixed(8)],
        [t('twoByTwo.fisherOneTail'), '—', results.fisherOneTail?.toFixed(8) ?? t('common.na', 'N/A')],
        [t('twoByTwo.fisherTwoTail'), '—', results.fisherTwoTail?.toFixed(8) ?? t('common.na', 'N/A')],
      ];

      autoTable(doc, {
        startY: y,
        head: [[t('twoByTwo.test'), t('twoByTwo.statistic'), t('twoByTwo.pValue')]],
        body: testsBody,
        theme: 'striped',
        headStyles: {
          fillColor: colorSlate[100],
          textColor: colorSlate[900],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Interpretation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('twoByTwo.interpretation'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      let interpretation = '';
      const pValue = results.chi2UncorrectedP;
      if (pValue < 0.05) {
        interpretation = t('twoByTwo.significantAssociation');
      } else {
        interpretation = t('twoByTwo.nonSignificantAssociation');
      }

      if (results.relativeRisk) {
        if (results.relativeRisk > 1) {
          interpretation += ' ' + t('twoByTwo.increasedRisk');
        } else if (results.relativeRisk < 1) {
          interpretation += ' ' + t('twoByTwo.protectiveEffect');
        } else {
          interpretation += ' ' + t('twoByTwo.noAssociation');
        }
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
      doc.text(t('twoByTwo.reportFooter'), 20, footerY + 5);
      doc.text('Page 1 / 1', 190, footerY + 5, { align: 'right' });
      doc.text(`${t('twoByTwo.method')}: ${hasJStat ? 'jStat (exact)' : 'Approximation'}`, 20, footerY + 10);

      doc.save(`Rapport_2x2_${results.a}_${results.b}_${results.c}_${results.d}.pdf`);
      toast.success(t('twoByTwo.exportSuccess', 'PDF exported successfully'));
    } catch (error) {
      console.error('PDF error:', error);
      toast.error(t('twoByTwo.exportError', 'Failed to generate PDF'));
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li>
              <Link href="/" className="hover:text-blue-500 transition-colors">
                {t('common.home')}
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3" />
            </li>
            <li>
              <span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">
                {t('twoByTwo.title')}
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
                {t('twoByTwo.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {t('twoByTwo.description')}
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
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> {t('twoByTwo.parameters')}
              </h2>
              <div className="space-y-5">
                <div className="w-full max-w-2xl mx-auto">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-800">
                          <th className="py-4 px-4 font-medium text-gray-400 dark:text-slate-500">{t('twoByTwo.exposure')}</th>
                          <th className="py-4 px-4 font-medium text-center text-gray-500 dark:text-slate-400">{t('twoByTwo.diseased')}</th>
                          <th className="py-4 px-4 font-medium text-center text-gray-500 dark:text-slate-400">{t('twoByTwo.nonDiseased')}</th>
                          <th className="py-4 px-4 font-medium text-right text-gray-400 dark:text-slate-500">{t('twoByTwo.total')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                        <tr className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-5 px-4 font-medium text-gray-700 dark:text-slate-300">{t('twoByTwo.exposed')}</td>
                          <td className="py-5 px-4 text-center">
                            <input
                              type="number"
                              value={a}
                              onChange={(e) => setA(e.target.value)}
                              className="w-16 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-5 px-4 text-center">
                            <input
                              type="number"
                              value={b}
                              onChange={(e) => setB(e.target.value)}
                              className="w-16 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-5 px-4 text-right font-semibold text-gray-400 tabular-nums">
                            {totals.totalExposed || '0'}
                          </td>
                        </tr>
                        <tr className="group transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-5 px-4 font-medium text-gray-700 dark:text-slate-300">{t('twoByTwo.unexposed')}</td>
                          <td className="py-5 px-4 text-center">
                            <input
                              type="number"
                              value={c}
                              onChange={(e) => setC(e.target.value)}
                              className="w-16 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-5 px-4 text-center">
                            <input
                              type="number"
                              value={d}
                              onChange={(e) => setD(e.target.value)}
                              className="w-16 bg-transparent border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-slate-700 focus:border-blue-500 focus:outline-none text-center transition-all tabular-nums"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-5 px-4 text-right font-semibold text-gray-400 tabular-nums">
                            {totals.totalUnexposed || '0'}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-100 dark:border-slate-800">
                          <td className="py-5 px-4 font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">{t('twoByTwo.total')}</td>
                          <td className="py-5 px-4 text-center text-gray-900 dark:text-white tabular-nums">
                            {totals.totalDiseased || '0'}
                          </td>
                          <td className="py-5 px-4 text-center text-gray-900 dark:text-white tabular-nums">
                            {totals.totalUndiseased || '0'}
                          </td>
                          <td className="py-5 px-4 text-right font-bold dark:text-blue-400 tabular-nums">
                            {totals.totalAll || '0'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('twoByTwo.example')}
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
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> {t('twoByTwo.resultsTitle')}
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('twoByTwo.copyTooltip')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('twoByTwo.exportTooltip')}
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
                    <p className="text-lg">{t('twoByTwo.enterData')}</p>
                    <div className="text-4xl font-bold mt-2">0.00</div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Incidence card */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        (results.relativeRisk ?? 1) > 1
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {t('twoByTwo.incidences')}
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div
                            className={`text-3xl font-bold tracking-tight mb-2 ${
                              (results.relativeRisk ?? 1) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.incidenceExposedPct}
                          </div>
                          <span className="text-xs">{t('twoByTwo.exposed')}</span>
                        </div>
                        <div>
                          <div
                            className={`text-3xl font-bold tracking-tight mb-2 ${
                              (results.relativeRisk ?? 1) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.incidenceUnexposedPct}
                          </div>
                          <span className="text-xs">{t('twoByTwo.unexposed')}</span>
                        </div>
                        <div>
                          <div
                            className={`text-3xl font-bold tracking-tight mb-2 ${
                              (results.relativeRisk ?? 1) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.incidenceTotalPct}
                          </div>
                          <span className="text-xs">{t('twoByTwo.total')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Measures of association card */}
                    <div
                      className={`p-8 rounded-3xl text-center border ${
                        (results.relativeRisk ?? 1) > 1
                          ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/30'
                          : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {t('twoByTwo.measuresTitle')}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div
                            className={`text-4xl font-bold tracking-tight mb-2 ${
                              (results.oddsRatio ?? 1) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.oddsRatio ? results.oddsRatio.toFixed(3) : t('common.na', 'N/A')}
                          </div>
                          <span className="text-xs">{t('twoByTwo.oddsRatio')}</span>
                          <p className="text-xs mt-1">
                            {results.oddsRatioCI
                              ? `${results.oddsRatioCI.lower.toFixed(3)} – ${results.oddsRatioCI.upper.toFixed(3)}`
                              : t('common.na', 'N/A')}
                          </p>
                        </div>
                        <div>
                          <div
                            className={`text-4xl font-bold tracking-tight mb-2 ${
                              (results.relativeRisk ?? 1) > 1 ? 'text-orange-600' : 'text-emerald-600'
                            }`}
                          >
                            {results.relativeRisk ? results.relativeRisk.toFixed(3) : t('common.na', 'N/A')}
                          </div>
                          <span className="text-xs">{t('twoByTwo.relativeRisk')}</span>
                          <p className="text-xs mt-1">
                            {results.relativeRiskCI
                              ? `${results.relativeRiskCI.lower.toFixed(3)} – ${results.relativeRiskCI.upper.toFixed(3)}`
                              : t('common.na', 'N/A')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statistical tests table */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="mt-4 overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">{t('twoByTwo.method')}</th>
                              <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.value')}</th>
                              <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.pValue')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('twoByTwo.uncorrected')}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {results.chi2Uncorrected.toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPValue(results.chi2UncorrectedP)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('twoByTwo.mantelHaenszel')}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {results.chi2MantelHaenszel.toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPValue(results.chi2MantelHaenszelP)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('twoByTwo.yates')}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {results.chi2Yates.toFixed(3)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPValue(results.chi2YatesP)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('twoByTwo.fisherOneTail')}</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPValue(results.fisherOneTail)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('twoByTwo.fisherTwoTail')}</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPValue(results.fisherTwoTail)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('twoByTwo.midPOneTail')}</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPValue(results.midPOneTail)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-medium">{t('twoByTwo.midPTwoTail')}</td>
                              <td className="px-3 py-2 text-center font-mono">—</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {formatPValue(results.midPTwoTail)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-sm text-slate-400 mt-3 italic">
                          * {t('twoByTwo.ciNote')}
                        </p>
                      </div>
                    </div>

                    {/* Risk‑based estimates */}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold tracking-widest text-slate-400 mb-3">
                        {t('twoByTwo.riskBasedTitle')}
                        <span className="ml-2 text-slate-300 font-normal normal-case">({t('twoByTwo.notValidCaseControl')})</span>
                      </p>
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">{t('twoByTwo.type')}</th>
                            <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.value')}</th>
                            <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.lowerCI')}</th>
                            <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.upperCI')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {[
                            { label: t('twoByTwo.riskExposed'), value: formatPct(results.incidenceExposed), ci: results.riskExposedCI },
                            { label: t('twoByTwo.riskUnexposed'), value: formatPct(results.incidenceUnexposed), ci: results.riskUnexposedCI },
                            { label: t('twoByTwo.riskTotal'), value: formatPct(results.incidenceTotal), ci: results.riskTotalCI },
                            { label: t('twoByTwo.relativeRisk'), value: results.relativeRisk?.toFixed(3) ?? t('common.na', 'N/A'), ci: results.relativeRiskCI, isRatio: true },
                            { label: t('twoByTwo.riskDifference'), value: results.riskDifference !== null ? formatPct(results.riskDifference) : t('common.na', 'N/A'), ci: results.riskDifferenceCI, isPct: true },
                            { label: t('twoByTwo.attrFracPop'), value: results.attrFracPop !== null ? formatPct(results.attrFracPop) : t('common.na', 'N/A'), ci: results.attrFracPopCI, isPct: true },
                            { label: t('twoByTwo.attrFracExp'), value: results.attrFracExp !== null ? formatPct(results.attrFracExp) : t('common.na', 'N/A'), ci: results.attrFracExpCI, isPct: true },
                          ].map(({ label, value, ci, isRatio, isPct }) => (
                            <tr key={label}>
                              <td className="px-3 py-2 font-medium">{label}</td>
                              <td className="px-3 py-2 text-center font-mono">{value}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {ci
                                  ? isRatio
                                    ? ci.lower.toFixed(3)
                                    : isPct
                                    ? formatPct(ci.lower)
                                    : formatPct(ci.lower)
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {ci
                                  ? isRatio
                                    ? ci.upper.toFixed(3)
                                    : isPct
                                    ? formatPct(ci.upper)
                                    : formatPct(ci.upper)
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* OR‑based estimates */}
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold tracking-widest text-slate-400 mb-3">
                        {t('twoByTwo.orBasedTitle')}
                      </p>
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">{t('twoByTwo.type')}</th>
                            <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.value')}</th>
                            <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.lowerCI')}</th>
                            <th className="px-3 py-2 text-center font-semibold">{t('twoByTwo.upperCI')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {[
                            { label: t('twoByTwo.oddsRatio'), value: results.oddsRatio?.toFixed(3) ?? t('common.na', 'N/A'), ci: results.oddsRatioCI, isRatio: true },
                            { label: t('twoByTwo.attrFracPopOR'), value: results.attrFracPopOR !== null ? formatPct(results.attrFracPopOR) : t('common.na', 'N/A'), ci: results.attrFracPopORCI, isPct: true },
                            { label: t('twoByTwo.attrFracExpOR'), value: results.attrFracExpOR !== null ? formatPct(results.attrFracExpOR) : t('common.na', 'N/A'), ci: results.attrFracExpORCI, isPct: true },
                          ].map(({ label, value, ci, isRatio, isPct }) => (
                            <tr key={label}>
                              <td className="px-3 py-2 font-medium">{label}</td>
                              <td className="px-3 py-2 text-center font-mono">{value}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {ci ? (isRatio ? ci.lower.toFixed(3) : formatPct(ci.lower)) : '—'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {ci ? (isRatio ? ci.upper.toFixed(3) : formatPct(ci.upper)) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-xs text-slate-400 mt-2 italic">
                        * {t('twoByTwo.orNote')}
                      </p>
                    </div>

                    {/* Interpretation block */}
                    <div
                      className={`p-6 rounded-2xl ${
                        results.chi2UncorrectedP < 0.05
                          ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/10'
                          : 'bg-slate-100 border-slate-400 dark:bg-slate-800'
                      }`}
                    >
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> {t('twoByTwo.interpretation')}
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {results.chi2UncorrectedP < 0.05
                          ? t('twoByTwo.significantAssociation')
                          : t('twoByTwo.nonSignificantAssociation')}
                        {results.relativeRisk &&
                          (results.relativeRisk > 1
                            ? ' ' + t('twoByTwo.increasedRisk')
                            : results.relativeRisk < 1
                            ? ' ' + t('twoByTwo.protectiveEffect')
                            : ' ' + t('twoByTwo.noAssociation'))}
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('twoByTwo.helpTitle')}</h3>
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
                    {t('twoByTwo.principleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('twoByTwo.principleText')}
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">2</div>
                    {t('twoByTwo.methodsTitle')}
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">{t('twoByTwo.orTitle')}</strong> – {t('twoByTwo.orDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('twoByTwo.rrTitle')}</strong> – {t('twoByTwo.rrDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('twoByTwo.chi2UncorrectedTitle')}</strong> – {t('twoByTwo.chi2UncorrectedDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('twoByTwo.mantelHaenszelTitle')}</strong> – {t('twoByTwo.mantelHaenszelDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('twoByTwo.yatesTitle')}</strong> – {t('twoByTwo.yatesDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('twoByTwo.fisherTitle')}</strong> – {t('twoByTwo.fisherDesc')}</p>
                  </div>
                  <a
                    href="https://www.openepi.com/TwobyTwo/TwobyTwo.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    {t('twoByTwo.source')} <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">3</div>
                    {t('twoByTwo.interpretationTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    {t('twoByTwo.interpretationText')}
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