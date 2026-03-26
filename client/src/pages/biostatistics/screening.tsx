import { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  Trash2,
  Info,
  Presentation,
  Copy,
  X,
  HelpCircle,
  ChevronRight,
  Blocks,
  RotateCcw,
  Plus,
  FileDown,
  ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Screening Test Analysis Component
 *
 * This component replicates OpenEpi's "Screening Test" tool.
 * It evaluates the performance of a diagnostic or screening test with multiple ordinal levels.
 *
 * For each cutoff between levels, it computes:
 *   - Sensitivity, Specificity, Predictive Values, Likelihood Ratios,
 *     Odds Ratio, Kappa, Entropy Reduction, Bias Index.
 * It also provides level‑specific likelihood ratios and the Area Under the ROC Curve (AUC).
 *
 * All confidence intervals follow standard methods (Wilson, Katz, Hanley–McNeil, etc.)
 * and match those used in OpenEpi.
 */

interface LevelRow {
  id: string;
  level: string;
  cases: string;
  nonCases: string;
}

interface CutoffResult {
  cutoff: string;
  sensitivity: number;
  sensitivityLower: number;
  sensitivityUpper: number;
  specificity: number;
  specificityLower: number;
  specificityUpper: number;
  ppv: number;
  ppvLower: number;
  ppvUpper: number;
  npv: number;
  npvLower: number;
  npvUpper: number;
  accuracy: number;
  accuracyLower: number;
  accuracyUpper: number;
  lrPositive: number;
  lrPositiveLower: number;
  lrPositiveUpper: number;
  lrNegative: number;
  lrNegativeLower: number;
  lrNegativeUpper: number;
  oddsRatio: number;
  oddsRatioLower: number;
  oddsRatioUpper: number;
  kappa: number;
  kappaLower: number;
  kappaUpper: number;
  entropyPositive: number;
  entropyNegative: number;
  biasIndex: number;
}

interface LevelLR {
  level: string;
  lr: number;
  lrLower: number;
  lrUpper: number;
}

interface ScreeningResults {
  cutoffs: CutoffResult[];
  levelLRs: LevelLR[];
  auc: number;
  aucLower: number;
  aucUpper: number;
  rocPoints: { fpr: number; tpr: number }[]; // for ROC curve
}

export default function ScreeningTest() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<LevelRow[]>([
    { id: '1', level: t('screening.levelPlaceholder', 'Niveau 1'), cases: '', nonCases: '' },
  ]);
  const [results, setResults] = useState<ScreeningResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isRocModalOpen, setIsRocModalOpen] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isRocModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isRocModalOpen]);

  // Recalculate whenever input data changes
  useEffect(() => {
    calculateResults();
  }, [rows]);

  // Wilson score interval for a proportion (standard formula)
  const wilsonCI = (x: number, n: number, z: number = 1.96) => {
    if (n === 0) return { lower: 0, upper: 0 };
    const p = x / n;
    const z2 = z * z;
    const A = 2 * x + z2;
    const B = z * Math.sqrt(z2 + 4 * x * (1 - p));
    const C = 2 * (n + z2);
    return {
      lower: Math.max(0, (A - B) / C),
      upper: Math.min(1, (A + B) / C)
    };
  };

  // Main calculation routine
  const calculateResults = () => {
    const validRows = rows.filter(
      (r) => (parseInt(r.cases) || 0) >= 0 && (parseInt(r.nonCases) || 0) >= 0
    );
    if (validRows.length < 2) {
      setResults(null);
      return;
    }

    const levels = validRows.map((r) => ({
      level: r.level,
      cases: parseInt(r.cases) || 0,
      nonCases: parseInt(r.nonCases) || 0,
    }));

    const totalCases = levels.reduce((sum, l) => sum + l.cases, 0);
    const totalNonCases = levels.reduce((sum, l) => sum + l.nonCases, 0);
    const total = totalCases + totalNonCases;

    if (total === 0) {
      setResults(null);
      return;
    }

    // Level‑specific likelihood ratios (method of Katz)
    const levelLRs: LevelLR[] = levels.map((l) => {
      const cases = l.cases;
      const nonCases = l.nonCases;
      let lr = 0, lrLower = 0, lrUpper = 0;
      if (totalCases > 0 && totalNonCases > 0 && cases > 0 && nonCases > 0) {
        lr = (cases / nonCases) / (totalCases / totalNonCases);
        const se = Math.sqrt(
          (1 - cases / totalCases) / cases +
          (1 - nonCases / totalNonCases) / nonCases
        );
        const lnLR = Math.log(lr);
        lrLower = Math.exp(lnLR - 1.96 * se);
        lrUpper = Math.exp(lnLR + 1.96 * se);
      }
      return {
        level: l.level,
        lr: isFinite(lr) ? lr : 0,
        lrLower: isFinite(lrLower) ? lrLower : 0,
        lrUpper: isFinite(lrUpper) ? lrUpper : 0,
      };
    });

    // Prepare ROC points (from most pathological to least)
    let rocPoints: { fpr: number; tpr: number }[] = [{ fpr: 0, tpr: 0 }];
    let cumCasesPositive = 0;
    let cumNonCasesPositive = 0;

    // Traverse from most pathological (last level) to least (first)
    for (let i = levels.length - 1; i >= 0; i--) {
      cumCasesPositive += levels[i].cases;
      cumNonCasesPositive += levels[i].nonCases;
      rocPoints.push({
        fpr: cumNonCasesPositive / totalNonCases,
        tpr: cumCasesPositive / totalCases,
      });
    }
    // Sort by fpr ascending (just in case)
    rocPoints.sort((a, b) => a.fpr - b.fpr);

    // AUC via trapezoidal rule
    let auc = 0;
    for (let i = 1; i < rocPoints.length; i++) {
      const prev = rocPoints[i - 1];
      const curr = rocPoints[i];
      auc += (curr.fpr - prev.fpr) * (curr.tpr + prev.tpr) / 2;
    }

    // AUC confidence interval (Hanley‑McNeil)
    const Q1 = auc / (2 - auc);
    const Q2 = 2 * auc * auc / (1 + auc);
    const seAuc = Math.sqrt(
      (auc * (1 - auc) +
        (totalCases - 1) * (Q1 - auc * auc) +
        (totalNonCases - 1) * (Q2 - auc * auc)) /
        (totalCases * totalNonCases)
    );
    const aucLower = Math.max(0, auc - 1.96 * seAuc);
    const aucUpper = Math.min(1, auc + 1.96 * seAuc);

    // Cutoff‑specific calculations
    const cutoffs: CutoffResult[] = [];
    let cumCasesNegative = 0;
    let cumNonCasesNegative = 0;

    for (let cutoff = 0; cutoff < levels.length - 1; cutoff++) {
      cumCasesNegative += levels[cutoff].cases;
      cumNonCasesNegative += levels[cutoff].nonCases;

      const tp = totalCases - cumCasesNegative;
      const fn = cumCasesNegative;
      const fp = totalNonCases - cumNonCasesNegative;
      const tn = cumNonCasesNegative;

      const sens = tp / (tp + fn);
      const spec = tn / (tn + fp);
      const acc = (tp + tn) / total;
      const ppv = tp / (tp + fp);
      const npv = tn / (tn + fn);

      // Wilson confidence intervals
      const sensCI = wilsonCI(tp, tp + fn);
      const specCI = wilsonCI(tn, tn + fp);
      const ppvCI = wilsonCI(tp, tp + fp);
      const npvCI = wilsonCI(tn, tn + fn);
      const accCI = wilsonCI(tp + tn, total);

      // LR+ and its CI (Katz method)
      let lrPos = 0, lrPosLower = 0, lrPosUpper = 0;
      if (tp > 0 && fp > 0) {
        lrPos = sens / (1 - spec);
        const seLRPos = Math.sqrt((1-sens)/(sens*(tp+fn)) + spec/((1-spec)*(fp+tn)));
        const lnLRPos = Math.log(lrPos);
        lrPosLower = Math.exp(lnLRPos - 1.96 * seLRPos);
        lrPosUpper = Math.exp(lnLRPos + 1.96 * seLRPos);
      }

      // LR- and its CI (Katz method)
      let lrNeg = 0, lrNegLower = 0, lrNegUpper = 0;
      if (fn > 0 && tn > 0) {
        lrNeg = (1 - sens) / spec;
        const seLRNeg = Math.sqrt(1 / fn - 1 / (tp + fn) + 1 / tn - 1 / (tn + fp));
        const lnLRNeg = Math.log(lrNeg);
        lrNegLower = Math.exp(lnLRNeg - 1.96 * seLRNeg);
        lrNegUpper = Math.exp(lnLRNeg + 1.96 * seLRNeg);
      }

      // Odds ratio (DOR)
      let odds = 0, oddsLower = 0, oddsUpper = 0;
      if (tp * tn > 0 && fp * fn > 0) {
        odds = (tp * tn) / (fp * fn);
        const lnOdds = Math.log(odds);
        const seOdds = Math.sqrt(1 / tp + 1 / tn + 1 / fp + 1 / fn);
        oddsLower = Math.exp(lnOdds - 1.96 * seOdds);
        oddsUpper = Math.exp(lnOdds + 1.96 * seOdds);
      }

      // Cohen's Kappa
      const observedAcc = acc;
      const expectedAcc = ((tp + fp) / total) * ((tp + fn) / total) +
                         ((fn + tn) / total) * ((fp + tn) / total);
      const kappa = (observedAcc - expectedAcc) / (1 - expectedAcc);
      const seKappa = Math.sqrt((observedAcc * (1 - observedAcc)) / (total * (1 - expectedAcc) ** 2));
      const kappaLower = kappa - 1.96 * seKappa;
      const kappaUpper = kappa + 1.96 * seKappa;

      // Entropy reduction (Shannon, natural log)
      const prev = totalCases / total;
      const hPre = prev > 0 && prev < 1
        ? -prev * Math.log2(prev) - (1 - prev) * Math.log2(1 - prev)
        : 0;
      const hPostPos = ppv > 0 && ppv < 1
        ? -ppv * Math.log2(ppv) - (1 - ppv) * Math.log2(1 - ppv)
        : 0;
      const entropyPos = hPre > 0 ? 100 * (hPre - hPostPos) / hPre : 0;
      const pDiseaseGivenNeg = fn / (fn + tn);
      const hPostNeg = pDiseaseGivenNeg > 0 && pDiseaseGivenNeg < 1
        ? -pDiseaseGivenNeg * Math.log2(pDiseaseGivenNeg) - (1 - pDiseaseGivenNeg) * Math.log2(1 - pDiseaseGivenNeg)
        : 0;
      const entropyNeg = hPre > 0 ? 100 * (hPre - hPostNeg) / hPre : 0;

      // Bias index
      const bias = (tp + fp) / total - (tp + fn) / total;

      cutoffs.push({
        cutoff: t('screening.cutoffBetween', {
          level1: levels[cutoff].level,
          level2: levels[cutoff + 1].level
        }),
        sensitivity: sens * 100,
        sensitivityLower: sensCI.lower * 100,
        sensitivityUpper: sensCI.upper * 100,
        specificity: spec * 100,
        specificityLower: specCI.lower * 100,
        specificityUpper: specCI.upper * 100,
        ppv: ppv * 100,
        ppvLower: ppvCI.lower * 100,
        ppvUpper: ppvCI.upper * 100,
        npv: npv * 100,
        npvLower: npvCI.lower * 100,
        npvUpper: npvCI.upper * 100,
        accuracy: acc * 100,
        accuracyLower: accCI.lower * 100,
        accuracyUpper: accCI.upper * 100,
        lrPositive: lrPos,
        lrPositiveLower: isFinite(lrPosLower) ? lrPosLower : 0,
        lrPositiveUpper: isFinite(lrPosUpper) ? lrPosUpper : 0,
        lrNegative: lrNeg,
        lrNegativeLower: isFinite(lrNegLower) ? lrNegLower : 0,
        lrNegativeUpper: isFinite(lrNegUpper) ? lrNegUpper : 0,
        oddsRatio: odds,
        oddsRatioLower: oddsLower,
        oddsRatioUpper: oddsUpper,
        kappa,
        kappaLower,
        kappaUpper,
        entropyPositive: entropyPos,
        entropyNegative: entropyNeg,
        biasIndex: bias,
      });
    }

    setResults({
      cutoffs,
      levelLRs,
      auc,
      aucLower,
      aucUpper,
      rocPoints,
    });
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([
      ...rows,
      { id: newId, level: `${t('screening.levelPlaceholder')} ${rows.length + 1}`, cases: '', nonCases: '' },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: 'level' | 'cases' | 'nonCases', value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const clearForm = () => {
    setRows([{ id: '1', level: t('screening.levelPlaceholder') + ' 1', cases: '', nonCases: '' }]);
    setResults(null);
    toast.info(t('screening.clearMessage'));
  };

  const loadExample = () => {
    setRows([
      { id: '1', level: 'Niveau 1', cases: '1', nonCases: '2' },
      { id: '2', level: 'Niveau 2', cases: '3', nonCases: '4' },
      { id: '3', level: 'Niveau 3', cases: '5', nonCases: '6' },
      { id: '4', level: 'Niveau 4', cases: '7', nonCases: '8' },
      { id: '5', level: 'Niveau 5', cases: '9', nonCases: '10' },
    ]);
    toast.success(t('screening.exampleLoaded'));
  };

  const copyResults = async () => {
    if (!results) return;

    let text = `${t('screening.copyPrefix')}\n\n`;
    results.cutoffs.forEach((c) => {
      text += `${t('screening.cutoff')} ${c.cutoff}\n`;
      text += `${t('screening.sensitivity')}: ${c.sensitivity.toFixed(2)}% (${c.sensitivityLower.toFixed(2)} - ${c.sensitivityUpper.toFixed(2)})\n`;
      text += `${t('screening.specificity')}: ${c.specificity.toFixed(2)}% (${c.specificityLower.toFixed(2)} - ${c.specificityUpper.toFixed(2)})\n`;
      text += `${t('screening.ppv')}: ${c.ppv.toFixed(2)}% (${c.ppvLower.toFixed(2)} - ${c.ppvUpper.toFixed(2)})\n`;
      text += `${t('screening.npv')}: ${c.npv.toFixed(2)}% (${c.npvLower.toFixed(2)} - ${c.npvUpper.toFixed(2)})\n`;
      text += `${t('screening.accuracy')}: ${c.accuracy.toFixed(2)}% (${c.accuracyLower.toFixed(2)} - ${c.accuracyUpper.toFixed(2)})\n`;
      text += `${t('screening.lrPositive')}: ${c.lrPositive.toFixed(4)} (${c.lrPositiveLower.toFixed(4)} - ${c.lrPositiveUpper.toFixed(4)})\n`;
      text += `${t('screening.lrNegative')}: ${c.lrNegative.toFixed(4)} (${c.lrNegativeLower.toFixed(4)} - ${c.lrNegativeUpper.toFixed(4)})\n`;
      text += `${t('screening.oddsRatio')}: ${c.oddsRatio.toFixed(4)} (${c.oddsRatioLower.toFixed(4)} - ${c.oddsRatioUpper.toFixed(4)})\n`;
      text += `${t('screening.kappa')}: ${c.kappa.toFixed(4)} (${c.kappaLower.toFixed(4)} - ${c.kappaUpper.toFixed(4)})\n`;
      text += `${t('screening.entropyPositive')}: ${c.entropyPositive.toFixed(2)}%\n`;
      text += `${t('screening.entropyNegative')}: ${c.entropyNegative.toFixed(2)}%\n`;
      text += `${t('screening.biasIndex')}: ${c.biasIndex.toFixed(4)}\n\n`;
    });

    text += `${t('screening.levelLRsTitle')}\n`;
    results.levelLRs.forEach((l) => {
      text += `${l.level}: ${l.lr.toFixed(4)} (${l.lrLower.toFixed(4)} - ${l.lrUpper.toFixed(4)})\n`;
    });

    text += `\n${t('screening.auc')}: ${results.auc.toFixed(7)} (${results.aucLower.toFixed(7)} - ${results.aucUpper.toFixed(7)})\n`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('screening.copySuccess'));
    } catch {
      toast.error(t('screening.copyError'));
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error(t('screening.exportNoData'));
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const colorPrimary: [number, number, number] = [59, 130, 246];
      const colorSlate = {
        50: [248, 250, 252] as [number, number, number],
        100: [241, 245, 249] as [number, number, number],
        200: [226, 232, 240] as [number, number, number],
        300: [203, 213, 225] as [number, number, number],
        500: [100, 116, 139] as [number, number, number],
        700: [51, 65, 85] as [number, number, number],
        900: [15, 23, 42] as [number, number, number],
      };

      // Header
      doc.setFillColor(...colorSlate[50]);
      doc.roundedRect(0, 0, 210, 40, 0, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('screening.reportTitle'), 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`${t('screening.reportGenerated')} ${new Date().toLocaleDateString('fr-FR')} ${t('screening.at')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text(t('screening.reportSubtitle'), 190, 32, { align: 'right' });

      // Input data
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('screening.analysedData'), 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 5;

      const tableData = rows.map(r => [r.level, parseInt(r.cases) || 0, parseInt(r.nonCases) || 0]);
      const totals = tableData.reduce((acc, [, c, nc]) => [acc[0] + c, acc[1] + nc], [0, 0]);
      tableData.push([t('screening.total'), totals[0], totals[1], totals[0] + totals[1]]);

      autoTable(doc, {
        startY: y,
        head: [[t('screening.level'), t('screening.cases'), t('screening.nonCases'), t('screening.total')]],
        body: tableData.map(r => r.map(v => v.toString())),
        theme: 'grid',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Cutoff results
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('screening.cutoffResults'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      results.cutoffs.forEach((c, index) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.text(`${t('screening.cutoff')} ${c.cutoff}`, 20, y);
        y += 8;

        const cutoffTable = [
          [t('screening.parameter'), t('screening.estimate'), t('screening.ci95'), t('screening.method')],
          [t('screening.sensitivity'), `${c.sensitivity.toFixed(2)}%`, `${c.sensitivityLower.toFixed(2)} - ${c.sensitivityUpper.toFixed(2)}`, t('screening.wilsonScore')],
          [t('screening.specificity'), `${c.specificity.toFixed(2)}%`, `${c.specificityLower.toFixed(2)} - ${c.specificityUpper.toFixed(2)}`, t('screening.wilsonScore')],
          [t('screening.ppv'), `${c.ppv.toFixed(2)}%`, `${c.ppvLower.toFixed(2)} - ${c.ppvUpper.toFixed(2)}`, t('screening.wilsonScore')],
          [t('screening.npv'), `${c.npv.toFixed(2)}%`, `${c.npvLower.toFixed(2)} - ${c.npvUpper.toFixed(2)}`, t('screening.wilsonScore')],
          [t('screening.accuracy'), `${c.accuracy.toFixed(2)}%`, `${c.accuracyLower.toFixed(2)} - ${c.accuracyUpper.toFixed(2)}`, t('screening.wilsonScore')],
          [t('screening.lrPositive'), c.lrPositive.toFixed(4), `${c.lrPositiveLower.toFixed(4)} - ${c.lrPositiveUpper.toFixed(4)}`, t('screening.katz')],
          [t('screening.lrNegative'), c.lrNegative.toFixed(4), `${c.lrNegativeLower.toFixed(4)} - ${c.lrNegativeUpper.toFixed(4)}`, t('screening.katz')],
          [t('screening.oddsRatio'), c.oddsRatio.toFixed(4), `${c.oddsRatioLower.toFixed(4)} - ${c.oddsRatioUpper.toFixed(4)}`, t('screening.logMethod')],
          [t('screening.kappa'), c.kappa.toFixed(4), `${c.kappaLower.toFixed(4)} - ${c.kappaUpper.toFixed(4)}`, t('screening.normalApprox')],
          [t('screening.entropyPositive'), c.entropyPositive.toFixed(2) + '%', '', t('screening.shannon')],
          [t('screening.entropyNegative'), c.entropyNegative.toFixed(2) + '%', '', t('screening.shannon')],
          [t('screening.biasIndex'), c.biasIndex.toFixed(4), '', t('screening.definition')]
        ];

        autoTable(doc, {
          startY: y,
          head: [cutoffTable[0]],
          body: cutoffTable.slice(1),
          theme: 'striped',
          headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 40, halign: 'center' },
            3: { cellWidth: 35 }
          },
          margin: { left: 20, right: 20 },
          styles: { fontSize: 8, cellPadding: 2 },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      });

      // Level‑specific LRs
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('screening.levelLRsTitle'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const levelTable = results.levelLRs.map(l => [
        l.level,
        l.lr.toFixed(4),
        `${l.lrLower.toFixed(4)} - ${l.lrUpper.toFixed(4)}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [[t('screening.level'), t('screening.lr'), t('screening.ci95')]],
        body: levelTable,
        theme: 'grid',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 80, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ROC and AUC
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('screening.rocCurve'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${t('screening.auc')} = ${results.auc.toFixed(7)} (${results.aucLower.toFixed(7)} - ${results.aucUpper.toFixed(7)})`, 20, y);
      y += 10;

      // Simple textual approximation of ROC curve (no space for complex drawing)
      doc.text(t('screening.rocTextApprox'), 20, y);
      y += 5;
      doc.text('0.0   0.2   0.4   0.6   0.8   1.0  TPR', 20, y);
      y += 5;
      doc.text('0.0   0.2   0.4   0.6   0.8   1.0  FPR', 20, y);
      y += 5;
      doc.text(t('screening.rocLabel'), 20, y);

      // Footer
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text(t('screening.reportFooter'), 20, footerY + 5);
      doc.text(`Page ${doc.getNumberOfPages()} / ${doc.getNumberOfPages()}`, 190, footerY + 5, { align: 'right' });

      doc.save('Rapport_Screening_Test.pdf');
      toast.success(t('screening.exportSuccess'));
    } catch (error) {
      console.error('PDF error:', error);
      toast.error(t('screening.exportError'));
    }
  };

  // SVG dimensions for ROC curve
  const svgWidth = 300;
  const svgHeight = 300;
  const margin = { top: 20, right: 20, bottom: 30, left: 30 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const pointToSVG = (fpr: number, tpr: number) => ({
    x: margin.left + fpr * plotWidth,
    y: margin.top + (1 - tpr) * plotHeight,
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">{t('common.home')}</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">{t('screening.title')}</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('screening.title')}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t('screening.description')}</p>
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
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> {t('screening.parameters')}
              </h2>
              <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {t('screening.level')}
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {t('screening.cases')}
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {t('screening.nonCases')}
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {t('screening.action')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                      {rows.map((row) => (
                        <tr key={row.id} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={row.level}
                              onChange={(e) => updateRow(row.id, 'level', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder={t('screening.levelPlaceholder')}
                            />
                           </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.cases}
                              onChange={(e) => updateRow(row.id, 'cases', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="0"
                            />
                           </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.nonCases}
                              onChange={(e) => updateRow(row.id, 'nonCases', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              placeholder="0"
                            />
                           </td>
                          <td className="px-6 py-4 text-center">
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
                  className="w-full px-5 py-4 bg-blue-600 text-white rounded-2xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> {t('screening.addLevel')}
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('screening.example')}
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
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> {t('screening.resultsTitle')}
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('screening.copyTooltip')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('screening.exportTooltip')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10 overflow-y-auto">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">{t('screening.enterData')}</p>
                    <div className="text-4xl font-bold mt-2">
                      0.00
                    </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* ROC Curve SVG - Clickable */}
                    <div className="bg-white dark:bg-slate-900">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                            {t('screening.rocPerformance')}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            {t('screening.rocSubtitle')}
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">{t('screening.auc')}: {results.auc.toFixed(2)}</span>
                        </div>
                      </div>

                      <div
                        className="relative flex justify-center cursor-pointer group"
                        onClick={() => setIsRocModalOpen(true)}
                      >
                        <div className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                          </svg>
                        </div>

                        <svg width={svgWidth} height={svgHeight} className="overflow-visible">
                          <defs>
                            <linearGradient id="rocGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>

                          {/* Light grid lines */}
                          {[0.25, 0.5, 0.75, 1].map((tick) => (
                            <g key={tick}>
                              <line
                                x1={margin.left}
                                y1={pointToSVG(0, tick).y}
                                x2={margin.left + plotWidth}
                                y2={pointToSVG(0, tick).y}
                                stroke="currentColor"
                                className="text-slate-100 dark:text-slate-800"
                                strokeWidth={1}
                              />
                              <line
                                x1={pointToSVG(tick, 0).x}
                                y1={margin.top}
                                x2={pointToSVG(tick, 0).x}
                                y2={margin.top + plotHeight}
                                stroke="currentColor"
                                className="text-slate-100 dark:text-slate-800"
                                strokeWidth={1}
                              />
                            </g>
                          ))}

                          {/* Chance line */}
                          <line
                            x1={margin.left}
                            y1={margin.top + plotHeight}
                            x2={margin.left + plotWidth}
                            y2={margin.top}
                            stroke="currentColor"
                            className="text-slate-300 dark:text-slate-700"
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                          />

                          {/* Area under the curve */}
                          <path
                            d={`
                              M ${pointToSVG(0, 0).x} ${pointToSVG(0, 0).y}
                              ${results.rocPoints.map(p => `L ${pointToSVG(p.fpr, p.tpr).x} ${pointToSVG(p.fpr, p.tpr).y}`).join(' ')}
                              L ${pointToSVG(1, 0).x} ${pointToSVG(1, 0).y}
                              Z
                            `}
                            fill="url(#rocGradient)"
                          />

                          {/* Main ROC curve */}
                          <path
                            d={results.rocPoints
                              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${pointToSVG(p.fpr, p.tpr).x} ${pointToSVG(p.fpr, p.tpr).y}`)
                              .join(' ')}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Cutoff points */}
                          {results.rocPoints.map((p, i) => (
                            <circle
                              key={i}
                              cx={pointToSVG(p.fpr, p.tpr).x}
                              cy={pointToSVG(p.fpr, p.tpr).y}
                              r={4}
                              className="fill-white stroke-blue-600 dark:fill-slate-900"
                              strokeWidth={2}
                            />
                          ))}

                          {/* Axis labels */}
                          <text
                            x={margin.left + plotWidth / 2}
                            y={margin.top + plotHeight + 35}
                            className="fill-slate-400 dark:fill-slate-500 text-[11px] font-medium"
                            textAnchor="middle"
                          >
                            {t('screening.rocFprLabel')}
                          </text>
                          <text
                            x={margin.left - 35}
                            y={margin.top + plotHeight / 2}
                            className="fill-slate-400 dark:fill-slate-500 text-[11px] font-medium"
                            textAnchor="middle"
                            transform={`rotate(-90, ${margin.left - 35}, ${margin.top + plotHeight / 2})`}
                          >
                            {t('screening.rocTprLabel')}
                          </text>
                        </svg>
                      </div>

                      {/* Legend */}
                      <div className="flex justify-center gap-8 mt-10 border-t border-slate-50 dark:border-slate-800 pt-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 bg-blue-500 rounded-full" />
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{t('screening.currentModel')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{t('screening.chance')}</span>
                        </div>
                      </div>
                    </div>

                    {/* AUC card */}
                    <div
                      className={`p-6 rounded-3xl text-center border ${
                        results.auc > 0.7
                          ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30'
                          : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {t('screening.aucTitle')}
                      </p>
                      <div
                        className={`text-4xl font-bold tracking-tight mb-2 ${
                          results.auc > 0.7 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {results.auc.toFixed(4)}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        {t('screening.ci95')}: [{results.aucLower.toFixed(4)} – {results.aucUpper.toFixed(4)}]
                      </span>
                    </div>

                    {/* Cutoff results */}
                    {results.cutoffs.map((c, index) => (
                      <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-md font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                          {t('screening.cutoff')} {c.cutoff}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.sensitivity')}</p>
                            <p className="font-mono font-medium">
                              {c.sensitivity.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.sensitivityLower.toFixed(2)}–{c.sensitivityUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.specificity')}</p>
                            <p className="font-mono font-medium">
                              {c.specificity.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.specificityLower.toFixed(2)}–{c.specificityUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.ppv')}</p>
                            <p className="font-mono font-medium">
                              {c.ppv.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.ppvLower.toFixed(2)}–{c.ppvUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.npv')}</p>
                            <p className="font-mono font-medium">
                              {c.npv.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.npvLower.toFixed(2)}–{c.npvUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.accuracy')}</p>
                            <p className="font-mono font-medium">
                              {c.accuracy.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.accuracyLower.toFixed(2)}–{c.accuracyUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.lrPositive')}</p>
                            <p className="font-mono font-medium">
                              {c.lrPositive.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.lrPositiveLower.toFixed(4)}–{c.lrPositiveUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.lrNegative')}</p>
                            <p className="font-mono font-medium">
                              {c.lrNegative.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.lrNegativeLower.toFixed(4)}–{c.lrNegativeUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.oddsRatio')}</p>
                            <p className="font-mono font-medium">
                              {c.oddsRatio.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.oddsRatioLower.toFixed(4)}–{c.oddsRatioUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.kappa')}</p>
                            <p className="font-mono font-medium">
                              {c.kappa.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.kappaLower.toFixed(4)}–{c.kappaUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.entropyPositive')}</p>
                            <p className="font-mono font-medium">
                              {c.entropyPositive.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.entropyNegative')}</p>
                            <p className="font-mono font-medium">
                              {c.entropyNegative.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">{t('screening.biasIndex')}</p>
                            <p className="font-mono font-medium">
                              {c.biasIndex.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Level‑specific likelihood ratios */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-md font-semibold text-slate-900 dark:text-white mb-4">{t('screening.levelLRsTitle')}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-4 py-2 text-left">{t('screening.level')}</th>
                              <th className="px-4 py-2 text-center">{t('screening.lr')}</th>
                              <th className="px-4 py-2 text-center">{t('screening.ci95')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {results.levelLRs.map((l, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 font-medium">{l.level}</td>
                                <td className="px-4 py-2 text-center font-mono">
                                  {l.lr.toFixed(4)}
                                  {l.lr > 0 && rows[idx] && parseInt(rows[idx].cases) < 5 && (
                                    <span className="text-[10px] text-amber-500 ml-1">*</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-center font-mono">
                                  [{l.lrLower.toFixed(4)} – {l.lrUpper.toFixed(4)}]
                                  {rows[idx] && parseInt(rows[idx].cases) < 5 && (
                                    <span className="text-[10px] text-amber-500 ml-1">{t('screening.ciApprox')}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ROC Modal */}
        {isRocModalOpen && results && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsRocModalOpen(false)}
          >
            <div
              className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsRocModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-between items-start mb-6 pr-12">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {t('screening.rocPerformance')}
                  </h3>
                  <p className="text-sm text-slate-500">{t('screening.rocSubtitle')}</p>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{t('screening.auc')}: {results.auc.toFixed(2)}</span>
                </div>
              </div>

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto"
                style={{ maxHeight: '65vh' }}
              >
                <defs>
                  <linearGradient id="rocGradientModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map((tick) => (
                  <g key={tick}>
                    <line
                      x1={margin.left}
                      y1={pointToSVG(0, tick).y}
                      x2={margin.left + plotWidth}
                      y2={pointToSVG(0, tick).y}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth={1}
                    />
                    <line
                      x1={pointToSVG(tick, 0).x}
                      y1={margin.top}
                      x2={pointToSVG(tick, 0).x}
                      y2={margin.top + plotHeight}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth={1}
                    />
                  </g>
                ))}

                {/* Chance line */}
                <line
                  x1={margin.left}
                  y1={margin.top + plotHeight}
                  x2={margin.left + plotWidth}
                  y2={margin.top}
                  stroke="currentColor"
                  className="text-slate-300 dark:text-slate-700"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />

                {/* Area under the curve */}
                <path
                  d={`
                    M ${pointToSVG(0, 0).x} ${pointToSVG(0, 0).y}
                    ${results.rocPoints.map(p => `L ${pointToSVG(p.fpr, p.tpr).x} ${pointToSVG(p.fpr, p.tpr).y}`).join(' ')}
                    L ${pointToSVG(1, 0).x} ${pointToSVG(1, 0).y}
                    Z
                  `}
                  fill="url(#rocGradientModal)"
                />

                {/* Main ROC curve */}
                <path
                  d={results.rocPoints
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${pointToSVG(p.fpr, p.tpr).x} ${pointToSVG(p.fpr, p.tpr).y}`)
                    .join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Cutoff points */}
                {results.rocPoints.map((p, i) => (
                  <circle
                    key={i}
                    cx={pointToSVG(p.fpr, p.tpr).x}
                    cy={pointToSVG(p.fpr, p.tpr).y}
                    r={4}
                    className="fill-white stroke-blue-600 dark:fill-slate-900"
                    strokeWidth={2}
                  />
                ))}

                {/* Axis labels */}
                <text
                  x={margin.left + plotWidth / 2}
                  y={margin.top + plotHeight + 35}
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium"
                  textAnchor="middle"
                >
                  {t('screening.rocFprLabel')}
                </text>
                <text
                  x={margin.left - 35}
                  y={margin.top + plotHeight / 2}
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium"
                  textAnchor="middle"
                  transform={`rotate(-90, ${margin.left - 35}, ${margin.top + plotHeight / 2})`}
                >
                  {t('screening.rocTprLabel')}
                </text>
              </svg>

              {/* Legend */}
              <div className="flex justify-center gap-8 mt-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    {t('screening.currentModel')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                    {t('screening.chance')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('screening.helpTitle')}
                </h3>
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
                    {t('screening.helpPrincipleTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    {t('screening.helpPrincipleText')}
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-slate-600 dark:text-slate-300">
                    <li>{t('screening.helpSensitivity')}</li>
                    <li>{t('screening.helpSpecificity')}</li>
                    <li>{t('screening.helpPredictiveValues')}</li>
                    <li>{t('screening.helpLikelihoodRatios')}</li>
                    <li>{t('screening.helpDiagnosticOdds')}</li>
                    <li>{t('screening.helpKappa')}</li>
                    <li>{t('screening.helpEntropy')}</li>
                    <li>{t('screening.helpBias')}</li>
                  </ul>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      {t('screening.helpAucHigh')}
                    </div>
                    <div className="text-xs text-slate-500">{t('screening.helpAucHighDesc')}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      {t('screening.helpAucLow')}
                    </div>
                    <div className="text-xs text-slate-500">{t('screening.helpAucLowDesc')}</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">2</div>
                    {t('screening.helpConfidenceTitle')}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-3">
                    {t('screening.helpConfidenceText')}
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    <li>
                      <strong className="text-slate-900 dark:text-white">{t('screening.helpWilson')}</strong> – 
                      {t('screening.helpWilsonDesc')}
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">{t('screening.helpKatz')}</strong> – 
                      {t('screening.helpKatzDesc')}
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">{t('screening.helpHanley')}</strong> – 
                      {t('screening.helpHanleyDesc')}
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">{t('screening.helpNormal')}</strong> – 
                      {t('screening.helpNormalDesc')}
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">3</div>
                    {t('screening.helpMethodsTitle')}
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">{t('screening.helpRoc')}</strong> – {t('screening.helpRocDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('screening.helpLevelLR')}</strong> – {t('screening.helpLevelLRDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('screening.helpDor')}</strong> – {t('screening.helpDorDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('screening.helpKappaMethod')}</strong> – {t('screening.helpKappaMethodDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('screening.helpEntropyMethod')}</strong> – {t('screening.helpEntropyMethodDesc')}</p>
                    <p><strong className="text-slate-900 dark:text-white">{t('screening.helpBiasMethod')}</strong> – {t('screening.helpBiasMethodDesc')}</p>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">4</div>
                    {t('screening.helpExampleTitle')}
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm">
                    <p className="mb-2">{t('screening.helpExampleText')}</p>
                    <pre className="bg-white dark:bg-slate-900 p-2 rounded text-xs overflow-x-auto">
                      {t('screening.helpExampleTable')}
                    </pre>
                    <p className="mt-2">{t('screening.helpExampleInterpretation')}</p>
                  </div>
                </section>

                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-bold">{t('screening.helpOrderNote')}</span> {t('screening.helpOrderNoteText')}
                </div>

                <a
                  href="https://www.openepi.com/DiagnosticTest/DiagnosticTest.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                >
                  {t('screening.helpSourceLink')}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}