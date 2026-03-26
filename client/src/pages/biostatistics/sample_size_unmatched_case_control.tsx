import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  Calculator,
  Presentation,
  Copy,
  FileDown,
  HelpCircle,
  X,
  Trash2,
  Info,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  Layers,
  Hash,
  Gauge,
  Target,
  Users,
  Percent,
  Sigma,
  Shield
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SampleSizeUnmatchedCaseControl() {
  // Paramètres
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [power, setPower] = useState<string>('80');
  const [ratio, setRatio] = useState<string>('1');
  const [p2, setP2] = useState<string>('40'); // proportion exposée chez témoins
  const [p1, setP1] = useState<string>('21.88'); // proportion exposée chez cas
  const [or, setOr] = useState<string>('0.42'); // odds ratio (calculé automatiquement)

  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showMethodDetails, setShowMethodDetails] = useState<boolean>(false);
  const [isJStatReady, setIsJStatReady] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Chargement des scripts externes
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        script.onload = () => setIsJStatReady(true);
        document.body.appendChild(script);
      } else {
        setIsJStatReady(true);
      }
    };
    loadScripts();
  }, []);

  // Formatage des nombres
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === Infinity || num === -Infinity) return '∞';
    if (isNaN(num) || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  // Calcul de l'odds ratio à partir des proportions
  const calculateOddsRatio = useCallback((p1Val: number, p2Val: number) => {
    if (p1Val === 0 || p2Val === 0) return 0;
    const odds1 = p1Val / (100 - p1Val);
    const odds2 = p2Val / (100 - p2Val);
    return (odds1 / odds2);
  }, []);

  // Mise à jour automatique de l'OR quand p1 ou p2 change
  useEffect(() => {
    const p1Val = parseFloat(p1) || 0;
    const p2Val = parseFloat(p2) || 0;
    if (p1Val > 0 && p1Val < 100 && p2Val > 0 && p2Val < 100) {
      const orValue = calculateOddsRatio(p1Val, p2Val);
      setOr(formatNumber(orValue, 2));
    }
  }, [p1, p2, calculateOddsRatio]);

  // Mise à jour automatique de p1 quand OR change (si l'utilisateur modifie l'OR)
  const handleOrChange = (orValue: string) => {
    setOr(orValue);
    const p2Val = parseFloat(p2) || 40;
    const orNum = parseFloat(orValue);
    if (!isNaN(orNum) && orNum > 0 && p2Val > 0 && p2Val < 100) {
      // p1 = (OR * p2/(100-p2)) / (1 + OR * p2/(100-p2)) * 100
      const odds2 = p2Val / (100 - p2Val);
      const odds1 = orNum * odds2;
      const p1Val = (odds1 / (1 + odds1)) * 100;
      setP1(formatNumber(p1Val, 2));
    }
  };

  // Calcul principal – taille d'échantillon pour étude cas-témoins non appariée
  const calculateSampleSize = useCallback(() => {
    const conf = parseInt(confidenceLevel);
    const alpha = 1 - conf / 100;
    const pow = parseFloat(power) / 100;
    const beta = 1 - pow;
    const k = parseFloat(ratio) || 1; // ratio témoins / cas
    const p2_val = parseFloat(p2) / 100; // proportion exposée chez témoins
    const p1_val = parseFloat(p1) / 100; // proportion exposée chez cas

    // Validations
    if (isNaN(p1_val) || p1_val <= 0 || p1_val >= 1 ||
        isNaN(p2_val) || p2_val <= 0 || p2_val >= 1 ||
        isNaN(k) || k <= 0 ||
        isNaN(alpha) || alpha <= 0 || alpha >= 1 ||
        isNaN(beta) || beta <= 0 || beta >= 1) {
      setResults(null);
      return;
    }

    const q1 = 1 - p1_val;
    const q2 = 1 - p2_val;
    const diff = p1_val - p2_val;

    // Valeurs critiques Z
    let z_alpha = 0, z_beta = 0;
    if (isJStatReady && (window as any).jStat?.normal?.inv) {
      z_alpha = (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1);
      z_beta = (window as any).jStat.normal.inv(pow, 0, 1); // quantile pour puissance
    } else {
      // Fallback pour les niveaux standards
      z_alpha = conf === 80 ? 1.282 : conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;
      z_beta = pow === 0.8 ? 0.842 : pow === 0.9 ? 1.282 : 0.842; // approximatif
    }

    // --- Méthode de Kelsey ---
    // n_cas = ( (z_alpha + z_beta)^2 * (p1_val*q1_val + p2_val*q2_val/k) ) / (diff^2)
    const kelsey_n1 = Math.pow(z_alpha + z_beta, 2) * (p1_val * q1 + (p2_val * q2) / k) / Math.pow(diff, 2);
    const kelsey_n1_ceil = Math.ceil(kelsey_n1);
    const kelsey_n2 = Math.ceil(kelsey_n1 * k);

    // --- Méthode de Fleiss (sans correction de continuité) ---
    const p_bar = (p1_val + k * p2_val) / (1 + k);
    const q_bar = 1 - p_bar;
    const fleiss_n1 = Math.pow(
      z_alpha * Math.sqrt((1 + 1 / k) * p_bar * q_bar) +
      z_beta * Math.sqrt(p1_val * q1 / k + p2_val * q2),
      2
    ) / Math.pow(diff, 2);
    const fleiss_n1_ceil = Math.ceil(fleiss_n1);
    const fleiss_n2 = Math.ceil(fleiss_n1 * k);

    // --- Méthode de Fleiss avec correction de continuité ---
    // n_cc = n / 4 * (1 + sqrt(1 + 2*(k+1)/(n * k * diff^2)))^2
    let fleiss_cc_n1 = fleiss_n1;
    if (fleiss_n1 > 0) {
      const correction = 1 + Math.sqrt(1 + 2 * (k + 1) / (fleiss_n1 * k * Math.pow(diff, 2)));
      fleiss_cc_n1 = fleiss_n1 / 4 * Math.pow(correction, 2);
    }
    const fleiss_cc_n1_ceil = Math.ceil(fleiss_cc_n1);
    const fleiss_cc_n2 = Math.ceil(fleiss_cc_n1 * k);

    const oddsRatio = calculateOddsRatio(p1_val * 100, p2_val * 100);

    setResults({
      conf,
      power: pow * 100,
      ratio: k,
      p2: p2_val * 100,
      p1: p1_val * 100,
      or: oddsRatio,
      z_alpha,
      z_beta,
      kelsey: { n1: kelsey_n1_ceil, n2: kelsey_n2, total: kelsey_n1_ceil + kelsey_n2 },
      fleiss: { n1: fleiss_n1_ceil, n2: fleiss_n2, total: fleiss_n1_ceil + fleiss_n2 },
      fleiss_cc: { n1: fleiss_cc_n1_ceil, n2: fleiss_cc_n2, total: fleiss_cc_n1_ceil + fleiss_cc_n2 },
      isJStatReady
    });
  }, [confidenceLevel, power, ratio, p1, p2, isJStatReady, calculateOddsRatio]);

  // Recalcul automatique
  useEffect(() => {
    calculateSampleSize();
  }, [calculateSampleSize]);

  // Handlers
  const clear = () => {
    setConfidenceLevel('95');
    setPower('80');
    setRatio('1');
    setP2('40');
    setP1('21.88');
    setOr('0.42');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setConfidenceLevel('95');
    setPower('80');
    setRatio('1');
    setP2('40');
    setP1('21.88');
    setOr('0.42');
    toast.success('Exemple chargé (données OpenEpi)');
  };

  const copyResults = async () => {
    if (!results) return;

    let text = `Taille d’échantillon pour étude cas-témoins non appariés – OpenEpi SSCC\n`;
    text += `Niveau de confiance bilatéral : ${results.conf}%\n`;
    text += `Puissance : ${results.power}%\n`;
    text += `Rapport des témoins sur les cas : ${results.ratio}\n`;
    text += `Proportion de témoins exposés : ${formatNumber(results.p2)}%\n`;
    text += `Proportion de cas exposés : ${formatNumber(results.p1)}%\n`;
    text += `Rapport de cotes (OR) : ${formatNumber(results.or, 2)}\n\n`;
    text += `Méthode\tCas\tTémoins\tTotal\n`;
    text += `Kelsey\t${results.kelsey.n1}\t${results.kelsey.n2}\t${results.kelsey.total}\n`;
    text += `Fleiss\t${results.fleiss.n1}\t${results.fleiss.n2}\t${results.fleiss.total}\n`;
    text += `Fleiss avec CC\t${results.fleiss_cc.n1}\t${results.fleiss_cc.n2}\t${results.fleiss_cc.total}\n`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error('Veuillez d’abord effectuer un calcul');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const colorPrimary: [number, number, number] = [59, 130, 246];
      const colorSlate = {
        50: [248, 250, 252] as [number, number, number],
        100: [241, 245, 249] as [number, number, number],
        200: [226, 232, 240] as [number, number, number],
        500: [100, 116, 139] as [number, number, number],
        700: [51, 65, 85] as [number, number, number],
        900: [15, 23, 42] as [number, number, number],
      };

      // En-tête
      doc.setFillColor(...colorSlate[50]);
      doc.roundedRect(0, 0, 210, 40, 0, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Taille d'échantillon – Étude cas-témoins non appariés", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('SampleSizeCaseControl – OpenEpi', 190, 32, { align: 'right' });

      let y = 55;

      // Données saisies
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Paramètres', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Niveau de confiance : ${results.conf}%`, 25, y); y += 6;
      doc.text(`Puissance : ${results.power}%`, 25, y); y += 6;
      doc.text(`Rapport des témoins sur les cas : ${results.ratio}`, 25, y); y += 6;
      doc.text(`Proportion de témoins exposés : ${formatNumber(results.p2)}%`, 25, y); y += 6;
      doc.text(`Proportion de cas exposés : ${formatNumber(results.p1)}%`, 25, y); y += 6;
      doc.text(`Rapport de cotes (OR) : ${formatNumber(results.or, 2)}`, 25, y); y += 12;

      // Carte de l'odds ratio
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(20, y, 170, 35, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RAPPORT DE COTES À DÉTECTER (OR)', 105, y + 8, { align: 'center' });
      doc.setFontSize(22);
      doc.text(formatNumber(results.or, 2), 105, y + 24, { align: 'center' });
      y += 45;

      // Tableau des résultats
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("Taille d'échantillon selon la méthode", 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = [
        ['Kelsey et al.', results.kelsey.n1.toString(), results.kelsey.n2.toString(), results.kelsey.total.toString()],
        ['Fleiss', results.fleiss.n1.toString(), results.fleiss.n2.toString(), results.fleiss.total.toString()],
        ['Fleiss avec CC', results.fleiss_cc.n1.toString(), results.fleiss_cc.n2.toString(), results.fleiss_cc.total.toString()],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'Cas', 'Témoins', 'Total']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 3, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] }
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // Interprétation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Interprétation', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);

      let interpretation = `Pour détecter un odds ratio de ${formatNumber(results.or, 2)} `;
      interpretation += `avec une proportion d'exposition chez les témoins de ${formatNumber(results.p2)}%, `;
      interpretation += `un niveau de confiance de ${results.conf}% et une puissance de ${results.power}%, `;
      interpretation += `les tailles d'échantillon recommandées sont présentées ci-dessus. `;
      interpretation += `La méthode de Kelsey est traditionnelle, Fleiss est plus précise, et la version avec correction de continuité est plus conservatrice.`;

      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;

      // Références
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Kelsey et al., Methods in Observational Epidemiology, 2nd Ed., Table 12-15', 20, y); y += 4;
      doc.text('Fleiss, Statistical Methods for Rates and Proportions, formulas 3.18 & 3.19', 20, y); y += 4;
      doc.text('CC = Correction de continuité. Les résultats sont arrondis à l’entier le plus proche.', 20, y); y += 4;
      doc.text('Conforme à OpenEpi – Module SSCC.', 20, y); y += 4;

      // Pied de page
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('SampleSizeCaseControl – conforme OpenEpi', 20, footerY + 5);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`SampleSizeCaseControl_OR${formatNumber(results.or, 2)}.pdf`);
      toast.success('Rapport PDF exporté');
    } catch (error) {
      console.error(error);
      toast.error('Erreur PDF');
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
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">SampleSizeCaseControl</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Shield className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Étude cas-témoins non appariés
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Taille d'échantillon – Méthodes Kelsey, Fleiss, Fleiss avec correction de continuité (OpenEpi SSCC)
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
          {/* Colonne gauche - saisie */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Niveau de confiance bilatéral
                  </label>
                  <select
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="80">80%</option>
                    <option value="90">90%</option>
                    <option value="95">95% (Standard)</option>
                    <option value="99">99%</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Puissance (% de chances de détection)
                  </label>
                  <select
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="80">80% (Standard)</option>
                    <option value="85">85%</option>
                    <option value="90">90%</option>
                    <option value="95">95%</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Rapport des témoins sur les cas
                  </label>
                  <input
                    type="number"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    min="0.1"
                    step="0.1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Proportion de témoins exposés (%)
                  </label>
                  <input
                    type="number"
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                    min="0.1"
                    max="99.9"
                    step="0.1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Proportion de cas exposés (%)
                  </label>
                  <input
                    type="number"
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                    min="0.1"
                    max="99.9"
                    step="0.1"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="Ex: 21.88"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Rapport de cotes (OR)
                  </label>
                  <input
                    type="number"
                    value={or}
                    onChange={(e) => handleOrChange(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                  />
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

            {/* Info complémentaire */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Méthodes de calcul
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <strong>Kelsey</strong> : formule basée sur la différence de proportions.<br />
                    <strong>Fleiss</strong> : utilise la proportion commune sous H0.<br />
                    <strong>Fleiss avec CC</strong> : ajoute une correction de continuité pour plus de conservatisme.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - résultats */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title="Copier les résultats"
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
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Carte de l'odds ratio */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        Rapport de cotes minimum à détecter
                      </p>
                      <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {formatNumber(results.or, 2)}
                      </div>
                      <p className="text-xs text-slate-500">
                        IC {results.conf}% • Puissance {results.power}% • Ratio témoins/cas = {results.ratio}
                      </p>
                    </div>

                    {/* Tableau des résultats */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Taille d'échantillon
                        </h3>
                        {!results.isJStatReady && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            Approximation (jStat non chargé)
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left">Méthode</th>
                              <th className="px-4 py-3 text-center">Cas</th>
                              <th className="px-4 py-3 text-center">Témoins</th>
                              <th className="px-4 py-3 text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr>
                              <td className="px-4 py-3 font-medium">Kelsey et al.</td>
                              <td className="px-4 py-3 text-center font-mono">{results.kelsey.n1}</td>
                              <td className="px-4 py-3 text-center font-mono">{results.kelsey.n2}</td>
                              <td className="px-4 py-3 text-center font-mono font-bold">{results.kelsey.total}</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium">Fleiss</td>
                              <td className="px-4 py-3 text-center font-mono">{results.fleiss.n1}</td>
                              <td className="px-4 py-3 text-center font-mono">{results.fleiss.n2}</td>
                              <td className="px-4 py-3 text-center font-mono font-bold">{results.fleiss.total}</td>
                            </tr>
                            <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                              <td className="px-4 py-3 font-medium">Fleiss avec CC</td>
                              <td className="px-4 py-3 text-center font-mono">{results.fleiss_cc.n1}</td>
                              <td className="px-4 py-3 text-center font-mono">{results.fleiss_cc.n2}</td>
                              <td className="px-4 py-3 text-center font-mono font-bold">{results.fleiss_cc.total}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Détails des méthodes (repliable) */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <button
                        onClick={() => setShowMethodDetails(!showMethodDetails)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            showMethodDetails ? 'rotate-180' : ''
                          }`}
                        />
                        {showMethodDetails ? 'Masquer' : 'Afficher'} les références
                      </button>
                      {showMethodDetails && (
                        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400 animate-in slide-in-from-top-2">
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Kelsey et al.</span> – Methods in Observational Epidemiology, 2nd Edition, Table 12-15.</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Fleiss</span> – Statistical Methods for Rates and Proportions, formulas 3.18 & 3.19.</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">CC</span> = Correction de continuité. Les résultats sont arrondis à l'entier le plus proche.</p>
                          <p className="mt-2 text-blue-600 dark:text-blue-400 italic">
                            Résultats tirés de OpenEpi, version 3, logiciel libre de calcul – SSCC.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interprétation */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                            Recommandation
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            La méthode de Fleiss avec correction de continuité est souvent recommandée car elle est plus conservatrice.
                            Pour cet exemple, la taille totale d'échantillon varie de {results.fleiss.total} à {results.fleiss_cc.total}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal d'aide - style RMS */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Guide – Taille d'échantillon cas-témoins non appariés
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
                    Le principe
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Ce module reproduit l'outil <strong>SSCC</strong> d'OpenEpi. Il calcule la taille d'échantillon nécessaire pour une étude cas-témoins non appariée, en fonction du niveau de confiance, de la puissance, du ratio témoins/cas, de la proportion d'exposition chez les témoins et de la proportion d'exposition chez les cas (ou du rapport de cotes à détecter).
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-500" /> Kelsey
                    </div>
                    <div className="text-xs text-slate-500">Basée sur la différence de proportions.</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <Sigma className="w-4 h-4 text-emerald-500" /> Fleiss
                    </div>
                    <div className="text-xs text-slate-500">Utilise la proportion commune sous H0.</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Méthodes de calcul
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">Kelsey</strong> – n_cas = (Zα+Zβ)²·[p1q1 + p2q2/k] / (p1-p2)².</p>
                    <p><strong className="text-slate-900 dark:text-white">Fleiss</strong> – n_cas = [Zα√((1+1/k)p̄q̄) + Zβ√(p1q1/k + p2q2)]² / (p1-p2)².</p>
                    <p><strong className="text-slate-900 dark:text-white">Fleiss avec CC</strong> – n_cc = n/4 · (1 + √(1 + 2(k+1)/(n·k·(p1-p2)²)))².</p>
                  </div>
                  <a
                    href="https://www.openepi.com/SampleSize/SSCC.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source : OpenEpi – SSCC <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Ressources
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <a href="https://www.openepi.com/PDFDocs/SampleSizeDoc.pdf" target="_blank" className="text-blue-600 hover:underline">
                        Documentation officielle OpenEpi (PDF)
                      </a>
                    </p>
                    <p>
                      Fleiss J.L. – <em>Statistical Methods for Rates and Proportions</em>, 3rd ed.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}