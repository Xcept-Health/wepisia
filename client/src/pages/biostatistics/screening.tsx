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
  const [rows, setRows] = useState<LevelRow[]>([
    { id: '1', level: 'Niveau 1', cases: '', nonCases: '' },
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

    // --- Level‑specific likelihood ratios (method of Katz) ---
    const levelLRs: LevelLR[] = levels.map((l) => {
      const cases = l.cases;
      const nonCases = l.nonCases;
      let lr = 0, lrLower = 0, lrUpper = 0;
      if (totalCases > 0 && totalNonCases > 0 && nonCases > 0) {
        lr = (cases / nonCases) / (totalCases / totalNonCases);
        const se = Math.sqrt(1 / cases + 1 / nonCases - 1 / totalCases - 1 / totalNonCases);
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

    // --- Prepare ROC points (from most pathological to least) ---
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

    // --- AUC via trapezoidal rule ---
    let auc = 0;
    for (let i = 1; i < rocPoints.length; i++) {
      const prev = rocPoints[i - 1];
      const curr = rocPoints[i];
      auc += (curr.fpr - prev.fpr) * (curr.tpr + prev.tpr) / 2;
    }

    // --- AUC confidence interval (Hanley‑McNeil) ---
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

    // --- Cutoff‑specific calculations ---
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
        lrPos = sens / (1 - spec); // equivalent to (tp/(tp+fn)) / (fp/(fp+tn))
        const seLRPos = Math.sqrt(1 / tp - 1 / (tp + fn) + 1 / fp - 1 / (fp + tn));
        const lnLRPos = Math.log(lrPos);
        lrPosLower = Math.exp(lnLRPos - 1.96 * seLRPos);
        lrPosUpper = Math.exp(lnLRPos + 1.96 * seLRPos);
      }

      // LR- and its CI (Katz method)
      let lrNeg = 0, lrNegLower = 0, lrNegUpper = 0;
      if (fn > 0 && tn > 0) {
        lrNeg = (1 - sens) / spec; // equivalent to (fn/(tp+fn)) / (tn/(tn+fp))
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
        ? -prev * Math.log(prev) - (1 - prev) * Math.log(1 - prev)
        : 0;
      const hPostPos = ppv > 0 && ppv < 1
        ? -ppv * Math.log(ppv) - (1 - ppv) * Math.log(1 - ppv)
        : 0;
      const hPostNeg = npv > 0 && npv < 1
        ? -npv * Math.log(npv) - (1 - npv) * Math.log(1 - npv)
        : 0;
      const entropyPos = hPre > 0 ? 100 * (hPre - hPostPos) / hPre : 0;
      const entropyNeg = hPre > 0 ? 100 * (hPre - hPostNeg) / hPre : 0;

      // Bias index
      const bias = (tp + fp - fn - tn) / total;

      cutoffs.push({
        cutoff: `entre ${levels[cutoff].level} et ${levels[cutoff + 1].level}`,
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
      { id: newId, level: `Niveau ${rows.length + 1}`, cases: '', nonCases: '' },
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
    setRows([{ id: '1', level: 'Niveau 1', cases: '', nonCases: '' }]);
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setRows([
      { id: '1', level: 'Niveau 1', cases: '1', nonCases: '2' },
      { id: '2', level: 'Niveau 2', cases: '2', nonCases: '3' },
      { id: '3', level: 'Niveau 3', cases: '4', nonCases: '5' },
      { id: '4', level: 'Niveau 4', cases: '7', nonCases: '8' },
      { id: '5', level: 'Niveau 5', cases: '9', nonCases: '10' },
    ]);
    toast.success('Exemple chargé');
  };

  const copyResults = async () => {
    if (!results) return;

    let text = `Résultats Screening Test\n\n`;
    results.cutoffs.forEach((c) => {
      text += `Point de coupure ${c.cutoff}\n`;
      text += `Sensibilité: ${c.sensitivity.toFixed(2)}% (${c.sensitivityLower.toFixed(2)} - ${c.sensitivityUpper.toFixed(2)})\n`;
      text += `Spécificité: ${c.specificity.toFixed(2)}% (${c.specificityLower.toFixed(2)} - ${c.specificityUpper.toFixed(2)})\n`;
      text += `Valeur prédictive positive: ${c.ppv.toFixed(2)}% (${c.ppvLower.toFixed(2)} - ${c.ppvUpper.toFixed(2)})\n`;
      text += `Valeur prédictive négative: ${c.npv.toFixed(2)}% (${c.npvLower.toFixed(2)} - ${c.npvUpper.toFixed(2)})\n`;
      text += `Exactitude du diagnostic: ${c.accuracy.toFixed(2)}% (${c.accuracyLower.toFixed(2)} - ${c.accuracyUpper.toFixed(2)})\n`;
      text += `Rapport de vraisemblance du test positif: ${c.lrPositive.toFixed(4)} (${c.lrPositiveLower.toFixed(4)} - ${c.lrPositiveUpper.toFixed(4)})\n`;
      text += `Rapport de vraisemblance du test négatif: ${c.lrNegative.toFixed(4)} (${c.lrNegativeLower.toFixed(4)} - ${c.lrNegativeUpper.toFixed(4)})\n`;
      text += `Diagnostic du rapport de cotes: ${c.oddsRatio.toFixed(4)} (${c.oddsRatioLower.toFixed(4)} - ${c.oddsRatioUpper.toFixed(4)})\n`;
      text += `Coefficient kappa de Cohen: ${c.kappa.toFixed(4)} (${c.kappaLower.toFixed(4)} - ${c.kappaUpper.toFixed(4)})\n`;
      text += `Réduction d’entropie après un test positif: ${c.entropyPositive.toFixed(2)}%\n`;
      text += `Réduction d’entropie après un test négatif: ${c.entropyNegative.toFixed(2)}%\n`;
      text += `Index Biais: ${c.biasIndex.toFixed(4)}\n\n`;
    });

    text += `Rapports de vraisemblance de niveau spécifique\n`;
    results.levelLRs.forEach((l) => {
      text += `${l.level}: ${l.lr.toFixed(4)} (${l.lrLower.toFixed(4)} - ${l.lrUpper.toFixed(4)})\n`;
    });

    text += `\nAire sous la courbe ROC: ${results.auc.toFixed(7)} (${results.aucLower.toFixed(7)} - ${results.aucUpper.toFixed(7)})\n`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error('Veuillez d\'abord effectuer un calcul');
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
      doc.text("Rapport d'Analyse Screening Test", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Screening Test – OpenEpi', 190, 32, { align: 'right' });

      // Input data
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 5;

      const tableData = rows.map(r => [r.level, parseInt(r.cases) || 0, parseInt(r.nonCases) || 0]);
      const totals = tableData.reduce((acc, [, c, nc]) => [acc[0] + c, acc[1] + nc], [0, 0]);
      tableData.push(['Total', totals[0], totals[1], totals[0] + totals[1]]);

      autoTable(doc, {
        startY: y,
        head: [['Niveau', 'Cas', 'Non-cas', 'Total']],
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
      doc.text('Résultats par point de coupure', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      results.cutoffs.forEach((c, index) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(10);
        doc.text(`Point de coupure ${c.cutoff}`, 20, y);
        y += 8;

        const cutoffTable = [
          ['Paramètre', 'Estimation', 'IC 95%', 'Méthode'],
          ['Sensibilité', `${c.sensitivity.toFixed(2)}%`, `${c.sensitivityLower.toFixed(2)} - ${c.sensitivityUpper.toFixed(2)}`, 'Score de Wilson'],
          ['Spécificité', `${c.specificity.toFixed(2)}%`, `${c.specificityLower.toFixed(2)} - ${c.specificityUpper.toFixed(2)}`, 'Score de Wilson'],
          ['VPP', `${c.ppv.toFixed(2)}%`, `${c.ppvLower.toFixed(2)} - ${c.ppvUpper.toFixed(2)}`, 'Score de Wilson'],
          ['VPN', `${c.npv.toFixed(2)}%`, `${c.npvLower.toFixed(2)} - ${c.npvUpper.toFixed(2)}`, 'Score de Wilson'],
          ['Exactitude', `${c.accuracy.toFixed(2)}%`, `${c.accuracyLower.toFixed(2)} - ${c.accuracyUpper.toFixed(2)}`, 'Score de Wilson'],
          ['LR+', c.lrPositive.toFixed(4), `${c.lrPositiveLower.toFixed(4)} - ${c.lrPositiveUpper.toFixed(4)}`, 'Katz'],
          ['LR-', c.lrNegative.toFixed(4), `${c.lrNegativeLower.toFixed(4)} - ${c.lrNegativeUpper.toFixed(4)}`, 'Katz'],
          ['OR', c.oddsRatio.toFixed(4), `${c.oddsRatioLower.toFixed(4)} - ${c.oddsRatioUpper.toFixed(4)}`, 'Log'],
          ['Kappa', c.kappa.toFixed(4), `${c.kappaLower.toFixed(4)} - ${c.kappaUpper.toFixed(4)}`, 'Normal'],
          ['Entropie +', c.entropyPositive.toFixed(2) + '%', '', 'Shannon'],
          ['Entropie -', c.entropyNegative.toFixed(2) + '%', '', 'Shannon'],
          ['Biais', c.biasIndex.toFixed(4), '', 'Définition']
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
      doc.text('Rapports de vraisemblance par niveau', 20, y);
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
        head: [['Niveau', 'Ratio', 'IC 95%']],
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
      doc.text('Courbe ROC', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Aire sous la courbe ROC = ${results.auc.toFixed(7)} (${results.aucLower.toFixed(7)} - ${results.aucUpper.toFixed(7)})`, 20, y);
      y += 10;

      // Simple textual approximation of ROC curve (no space for complex drawing)
      doc.text('Courbe caractéristique (ROC) – approximation textuelle', 20, y);
      y += 5;
      doc.text('0.0   0.2   0.4   0.6   0.8   1.0  TPR', 20, y);
      y += 5;
      doc.text('0.0   0.2   0.4   0.6   0.8   1.0  FPR', 20, y);
      y += 5;
      doc.text('TPR = taux vrais positifs, FPR = taux faux positifs', 20, y);

      // Footer
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Screening Test – conforme OpenEpi', 20, footerY + 5);
      doc.text(`Page ${doc.getNumberOfPages()} / ${doc.getNumberOfPages()}`, 190, footerY + 5, { align: 'right' });

      doc.save('Rapport_Screening_Test.pdf');
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
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
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Screening Test</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Screening Test</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Analyse des performances d'un test de dépistage à plusieurs niveaux.
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
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Niveau
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Cas
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Non-cas
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Action
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
                              placeholder="Niveau"
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
                  <Plus className="w-5 h-5" /> Ajouter un niveau
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
              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10 overflow-y-auto">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
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
                            Analyse de Performance ROC
                          </h3>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Compromis Sensibilité vs Spécificité
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                          <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">AUC: {results.auc.toFixed(2)}</span>
                        </div>
                      </div>

                      <div
                        className="relative flex justify-center cursor-pointer group"
                        onClick={() => setIsRocModalOpen(true)}
                      >
                        {/* Zoom indicator on hover */}
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
                            TAUX DE FAUX POSITIFS (1 - SPÉCIFICITÉ)
                          </text>
                          <text 
                            x={margin.left - 35} 
                            y={margin.top + plotHeight / 2} 
                            className="fill-slate-400 dark:fill-slate-500 text-[11px] font-medium"
                            textAnchor="middle" 
                            transform={`rotate(-90, ${margin.left - 35}, ${margin.top + plotHeight / 2})`}
                          >
                            TAUX DE VRAIS POSITIFS (SENSIBILITÉ)
                          </text>
                        </svg>
                      </div>

                      {/* Legend */}
                      <div className="flex justify-center gap-8 mt-10 border-t border-slate-50 dark:border-slate-800 pt-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 bg-blue-500 rounded-full"></div>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Modèle Actuel</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600"></div>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Hasard</span>
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
                        Aire sous la courbe ROC (AUC)
                      </p>
                      <div
                        className={`text-4xl font-bold tracking-tight mb-2 ${
                          results.auc > 0.7 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {results.auc.toFixed(4)}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        IC 95% : [{results.aucLower.toFixed(4)} – {results.aucUpper.toFixed(4)}]
                      </span>
                    </div>

                    {/* Cutoff results */}
                    {results.cutoffs.map((c, index) => (
                      <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-md font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                          Point de coupure {c.cutoff}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs">Sensibilité</p>
                            <p className="font-mono font-medium">
                              {c.sensitivity.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.sensitivityLower.toFixed(2)}–{c.sensitivityUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Spécificité</p>
                            <p className="font-mono font-medium">
                              {c.specificity.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.specificityLower.toFixed(2)}–{c.specificityUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">VPP</p>
                            <p className="font-mono font-medium">
                              {c.ppv.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.ppvLower.toFixed(2)}–{c.ppvUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">VPN</p>
                            <p className="font-mono font-medium">
                              {c.npv.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.npvLower.toFixed(2)}–{c.npvUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Exactitude</p>
                            <p className="font-mono font-medium">
                              {c.accuracy.toFixed(2)}% <span className="text-slate-400 text-[10px]">({c.accuracyLower.toFixed(2)}–{c.accuracyUpper.toFixed(2)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">LR+</p>
                            <p className="font-mono font-medium">
                              {c.lrPositive.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.lrPositiveLower.toFixed(4)}–{c.lrPositiveUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">LR-</p>
                            <p className="font-mono font-medium">
                              {c.lrNegative.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.lrNegativeLower.toFixed(4)}–{c.lrNegativeUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Odds Ratio</p>
                            <p className="font-mono font-medium">
                              {c.oddsRatio.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.oddsRatioLower.toFixed(4)}–{c.oddsRatioUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Kappa</p>
                            <p className="font-mono font-medium">
                              {c.kappa.toFixed(4)} <span className="text-slate-400 text-[10px]">({c.kappaLower.toFixed(4)}–{c.kappaUpper.toFixed(4)})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Entropie +</p>
                            <p className="font-mono font-medium">
                              {c.entropyPositive.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Entropie -</p>
                            <p className="font-mono font-medium">
                              {c.entropyNegative.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Biais</p>
                            <p className="font-mono font-medium">
                              {c.biasIndex.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Level‑specific likelihood ratios */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-md font-semibold text-slate-900 dark:text-white mb-4">Rapports de vraisemblance par niveau</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-4 py-2 text-left">Niveau</th>
                              <th className="px-4 py-2 text-center">LR</th>
                              <th className="px-4 py-2 text-center">IC 95%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {results.levelLRs.map((l, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 font-medium">{l.level}</td>
                                <td className="px-4 py-2 text-center font-mono">{l.lr.toFixed(4)}</td>
                                <td className="px-4 py-2 text-center font-mono">
                                  [{l.lrLower.toFixed(4)} – {l.lrUpper.toFixed(4)}]
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
              {/* Close button */}
              <button
                onClick={() => setIsRocModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title and AUC */}
              <div className="flex justify-between items-start mb-6 pr-12">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Analyse de Performance ROC
                  </h3>
                  <p className="text-sm text-slate-500">Compromis Sensibilité vs Spécificité</p>
                </div>
                <div >
                  <span className="text-blue-600 dark:text-blue-400 font-bold">AUC: {results.auc.toFixed(2)}</span>
                </div>
              </div>

              {/* SVG with viewBox for scalability */}
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
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium "
                  textAnchor="middle"
                >
                  TAUX DE FAUX POSITIFS (1 - SPÉCIFICITÉ)
                </text>
                <text
                  x={margin.left - 35}
                  y={margin.top + plotHeight / 2}
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-medium"
                  textAnchor="middle"
                  transform={`rotate(-90, ${margin.left - 35}, ${margin.top + plotHeight / 2})`}
                >
                  TAUX DE VRAIS POSITIFS (SENSIBILITÉ)
                </text>
              </svg>

              {/* Legend */}
              <div className="flex justify-center gap-8 mt-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-500 rounded-full" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    Modèle Actuel
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                    Hasard
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
                  Guide : Screening Test
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
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      1
                    </div>
                    Principe du test de dépistage
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Ce module reproduit fidèlement l’outil <strong>« Screening Test » d’OpenEpi</strong>. 
                    Il évalue les performances d’un test diagnostique ou de dépistage à plusieurs niveaux 
                    (ordinal ou continu). Pour chaque seuil de coupure, il calcule :
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-slate-600 dark:text-slate-300">
                    <li>Sensibilité, Spécificité, Valeurs prédictives</li>
                    <li>Rapports de vraisemblance (LR+, LR–)</li>
                    <li>Odds ratio diagnostique</li>
                    <li>Coefficient Kappa de Cohen</li>
                    <li>Réduction d’entropie (information gagnée)</li>
                    <li>Index de biais</li>
                  </ul>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Il fournit également les rapports de vraisemblance spécifiques à chaque niveau 
                    et l’aire sous la courbe ROC (AUC) avec son intervalle de confiance.
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      AUC &gt; 0,70
                    </div>
                    <div className="text-xs text-slate-500">Test performant – discrimination acceptable à excellente</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      AUC &lt; 0,60
                    </div>
                    <div className="text-xs text-slate-500">Test peu informatif – proche du hasard</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Intervalles de confiance (IC 95 %)
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-3">
                    Tous les intervalles sont calculés selon des méthodes reconnues, identiques à OpenEpi.
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    <li>
                      <strong className="text-slate-900 dark:text-white">Wilson score</strong> – 
                      Proportions (sensibilité, spécificité, VPP, VPN, exactitude)
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Katz (log)</strong> – 
                      Rapports de vraisemblance (LR+, LR–)
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Hanley & McNeil (1982)</strong> – 
                      Aire sous la courbe ROC (AUC)
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Approximation normale</strong> – 
                      Coefficient kappa de Cohen
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Méthodes de calcul
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      <strong className="text-slate-900 dark:text-white">Courbe ROC & AUC</strong> – 
                      Les points sont générés en cumulant les effectifs des niveaux du plus pathologique 
                      au moins pathologique. L’AUC est calculée par la méthode des trapèzes.
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Rapports de vraisemblance par niveau</strong> – 
                      LR = (casᵢ / non‑casᵢ) / (total cas / total non‑cas). IC basé sur l’erreur‑type de log(LR) avec la formule de Katz.
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Diagnostic odds ratio (DOR)</strong> – 
                      (TP·TN)/(FP·FN). IC par transformation logarithmique.
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Kappa de Cohen</strong> – 
                      Mesure de l’accord au‑delà du hasard. IC = κ ± 1,96·SE(κ).
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Réduction d’entropie</strong> – 
                      Pourcentage de réduction de l’incertitude (entropie de Shannon) après un test positif ou négatif.
                    </p>
                    <p>
                      <strong className="text-slate-900 dark:text-white">Index de biais</strong> – 
                      (TP + FP – FN – TN) / N. Reflète le déséquilibre global de classification.
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      4
                    </div>
                    Exemple concret
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-sm">
                    <p className="mb-2">
                      Supposons un test de glycémie pour diagnostiquer le diabète. On classe les patients en cinq niveaux de glycémie (1 = normale, 5 = très élevée). Les données saisies pourraient être :
                    </p>
                    <pre className="bg-white dark:bg-slate-900 p-2 rounded text-xs overflow-x-auto">
                      {`Niveau    Cas (diabétiques)   Non-cas
                      1               1                 2
                      2               2                 3
                      3               4                 5
                      4               7                 8
                      5               9                10`}
                    </pre>
                    <p className="mt-2">
                      L’analyse produit une courbe ROC, une AUC de 0,5326 (IC 95% : 0,3728 – 0,6925), et pour chaque seuil les sensibilités, spécificités, etc. On peut ainsi choisir le meilleur compromis.
                    </p>
                  </div>
                </section>

                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-bold">Ordre des niveaux</span> – Les niveaux doivent être saisis 
                  du <strong>moins pathologique</strong> (première ligne) au <strong>plus pathologique</strong> 
                  (dernière ligne). C’est essentiel pour une courbe ROC correcte.
                </div>

                <a
                  href="https://www.openepi.com/DiagnosticTest/DiagnosticTest.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                >
                  Source officielle : OpenEpi – Screening Test
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