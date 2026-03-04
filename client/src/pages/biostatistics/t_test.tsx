import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight,
  Calculator,
  Presentation,
  Copy,
  FileDown,
  HelpCircle,
  X,
  Info,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  Layers,
  Sigma,
  Divide,
  TrendingUp
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Two-Sample Independent T-Test Calculator
 * 
 * This component replicates OpenEpi's Two Sample T-Test module.
 * It compares the means of two independent groups given their sample sizes,
 * means, and standard deviations. Two versions of the t-test are provided:
 * - Student's t-test (assuming equal variances)
 * - Welch's t-test (not assuming equal variances)
 * 
 * Additionally, an F-test for equality of variances (Hartley's F-max) is performed
 * to help choose the appropriate test.
 * 
 * All p-values and critical values are obtained from the jStat library when available;
 * otherwise, reasonable fallbacks are used. The results are displayed in a clean
 * interface and can be exported as a PDF report.
 */

export default function TwoSampleTTest() {
  // ----- State declarations -----
  // Group 1
  const [n1, setN1] = useState<string>('');           // Sample size group 1
  const [mean1, setMean1] = useState<string>('');     // Mean group 1
  const [sd1, setSd1] = useState<string>('');         // Standard deviation group 1
  // Group 2
  const [n2, setN2] = useState<string>('');           // Sample size group 2
  const [mean2, setMean2] = useState<string>('');     // Mean group 2
  const [sd2, setSd2] = useState<string>('');         // Standard deviation group 2
  // Confidence level
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');

  const [results, setResults] = useState<any>(null);               // Computed results object
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false); // Help modal visibility
  const [showMethodDetails, setShowMethodDetails] = useState<boolean>(false); // Toggle methodological notes
  const [isJStatReady, setIsJStatReady] = useState<boolean>(false); // Flag for jStat availability
  const resultsRef = useRef<HTMLDivElement>(null);                  // Reference to results container

  // ----- Dynamic loading of jStat -----
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        script.onload = () => {
          setIsJStatReady(true);
        };
        document.body.appendChild(script);
      } else {
        setIsJStatReady(true);
      }
    };
    loadScripts();
  }, []); // Runs once on mount

  // ----- Formatting helper (consistent with OpenEpi's output style) -----
  const formatNumber = (num: number, decimals: number = 4): string => {
    if (num === Infinity || num === -Infinity) return '∞';
    if (isNaN(num) || !isFinite(num)) return '-';
    return num.toFixed(decimals);
  };

  // ----- Core calculation function (matches OpenEpi Two Sample T-Test) -----
  const calculateTTest = useCallback(() => {
    const a_n = parseFloat(n1) || 0;
    const a_mean = parseFloat(mean1) || 0;
    const a_sd = parseFloat(sd1) || 0;
    const b_n = parseFloat(n2) || 0;
    const b_mean = parseFloat(mean2) || 0;
    const b_sd = parseFloat(sd2) || 0;
    const conf = parseInt(confidenceLevel);
    const alpha = 1 - conf / 100;

    // Input validation
    if (a_n < 2 || b_n < 2 || a_sd <= 0 || b_sd <= 0) {
      setResults(null);
      return;
    }

    // Standard errors of the means
    const se1 = a_sd / Math.sqrt(a_n);
    const se2 = b_sd / Math.sqrt(b_n);

    // Difference in means
    const meanDiff = a_mean - b_mean;

    // ----- Student's t-test (equal variances assumed) -----
    const pooledVar = ((a_n - 1) * a_sd * a_sd + (b_n - 1) * b_sd * b_sd) / (a_n + b_n - 2);
    const sePooled = Math.sqrt(pooledVar * (1 / a_n + 1 / b_n));
    const tEqual = meanDiff / sePooled;
    const dfEqual = a_n + b_n - 2;

    let pEqual = 0;
    let tCritEqual = 0;
    if (isJStatReady && (window as any).jStat?.studentt?.cdf) {
      pEqual = 2 * (1 - (window as any).jStat.studentt.cdf(Math.abs(tEqual), dfEqual));
      tCritEqual = (window as any).jStat.studentt.inv(1 - alpha / 2, dfEqual);
    } else {
      pEqual = 0.05; // fallback
      tCritEqual = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;
    }

    const meEqual = tCritEqual * sePooled;
    const ciEqualLower = meanDiff - meEqual;
    const ciEqualUpper = meanDiff + meEqual;

    // ----- Welch's t-test (unequal variances) -----
    const seWelch = Math.sqrt(se1 * se1 + se2 * se2);
    const tUnequal = meanDiff / seWelch;
    // Satterthwaite degrees of freedom
    const numerator = Math.pow(se1 * se1 + se2 * se2, 2);
    const denominator = Math.pow(se1 * se1, 2) / (a_n - 1) + Math.pow(se2 * se2, 2) / (b_n - 1);
    const dfUnequal = numerator / denominator;

    let pUnequal = 0;
    let tCritUnequal = 0;
    if (isJStatReady && (window as any).jStat?.studentt?.cdf) {
      pUnequal = 2 * (1 - (window as any).jStat.studentt.cdf(Math.abs(tUnequal), dfUnequal));
      tCritUnequal = (window as any).jStat.studentt.inv(1 - alpha / 2, dfUnequal);
    } else {
      pUnequal = 0.05;
      tCritUnequal = tCritEqual;
    }

    const meUnequal = tCritUnequal * seWelch;
    const ciUnequalLower = meanDiff - meUnequal;
    const ciUnequalUpper = meanDiff + meUnequal;

    // ----- F-test for equality of variances (Hartley's F-max) -----
    let fValue = 0, dfNum = 0, dfDen = 0, pF = 0;
    if (a_sd > b_sd) {
      fValue = (a_sd * a_sd) / (b_sd * b_sd);
      dfNum = a_n - 1;
      dfDen = b_n - 1;
    } else {
      fValue = (b_sd * b_sd) / (a_sd * a_sd);
      dfNum = b_n - 1;
      dfDen = a_n - 1;
    }

    if (isJStatReady && (window as any).jStat?.fft?.cdf) {
      const pF_one = (window as any).jStat.fft.cdf(fValue, dfNum, dfDen);
      pF = 2 * Math.min(pF_one, 1 - pF_one);
    } else {
      pF = 0.05;
    }

    // ----- Assemble results object -----
    setResults({
      // Input data
      n1: a_n, mean1: a_mean, sd1: a_sd, se1,
      n2: b_n, mean2: b_mean, sd2: b_sd, se2,
      meanDiff,
      conf,
      // Equal variance results
      tEqual, dfEqual, pEqual, ciEqualLower, ciEqualUpper,
      // Unequal variance results
      tUnequal, dfUnequal, pUnequal, ciUnequalLower, ciUnequalUpper,
      // F-test results
      fValue, dfNum, dfDen, pF,
      isJStatReady
    });
  }, [n1, mean1, sd1, n2, mean2, sd2, confidenceLevel, isJStatReady]);

  // ----- Automatic recalculation whenever inputs change -----
  useEffect(() => {
    calculateTTest();
  }, [calculateTTest]);

  // ----- UI handlers -----

  // Reset all input fields
  const clear = () => {
    setN1('');
    setMean1('');
    setSd1('');
    setN2('');
    setMean2('');
    setSd2('');
    setConfidenceLevel('95');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  // Load an example dataset (from OpenEpi typical demo)
  const loadExample = () => {
    setN1('7');
    setMean1('11.57');
    setSd1('8.81');
    setN2('18');
    setMean2('7.44');
    setSd2('3.698');
    toast.success('Exemple chargé');
  };

  // Copy results to clipboard as formatted text
  const copyResults = async () => {
    if (!results) return;
    const text = `Test t de deux échantillons indépendants
Groupe 1 : n=${results.n1}, moyenne=${formatNumber(results.mean1)}, écart-type=${formatNumber(results.sd1)}
Groupe 2 : n=${results.n2}, moyenne=${formatNumber(results.mean2)}, écart-type=${formatNumber(results.sd2)}
Différence des moyennes : ${formatNumber(results.meanDiff)}

Variance égale :
  t = ${formatNumber(results.tEqual)}, ddl = ${results.dfEqual}, p = ${formatNumber(results.pEqual)}
  IC ${results.conf}% : [${formatNumber(results.ciEqualLower)} – ${formatNumber(results.ciEqualUpper)}]

Variance inégale (Welch) :
  t = ${formatNumber(results.tUnequal)}, ddl = ${formatNumber(results.dfUnequal, 2)}, p = ${formatNumber(results.pUnequal)}
  IC ${results.conf}% : [${formatNumber(results.ciUnequalLower)} – ${formatNumber(results.ciUnequalUpper)}]

Test d’égalité des variances (F de Hartley) :
  F = ${formatNumber(results.fValue)}, ddl = ${results.dfNum}, ${results.dfDen}, p = ${formatNumber(results.pF)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  // Export a comprehensive PDF report
  const exportPDF = () => {
    if (!results) {
      toast.error('Veuillez d’abord effectuer un calcul');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Colour definitions (Tailwind slate palette)
      const colorPrimary: [number, number, number] = [59, 130, 246]; // blue-500
      const colorSlate = {
        50: [248, 250, 252] as [number, number, number],
        100: [241, 245, 249] as [number, number, number],
        200: [226, 232, 240] as [number, number, number],
        500: [100, 116, 139] as [number, number, number],
        700: [51, 65, 85] as [number, number, number],
        900: [15, 23, 42] as [number, number, number],
      };

      // ----- Header -----
      doc.setFillColor(...colorSlate[50]);
      doc.roundedRect(0, 0, 210, 40, 0, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Rapport du test t de deux échantillons", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('TwoSampleTTest', 190, 32, { align: 'right' });

      // ----- Input data summary -----
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Groupe 1 : n = ${results.n1}, moyenne = ${formatNumber(results.mean1)}, écart-type = ${formatNumber(results.sd1)}`, 25, y); y += 6;
      doc.text(`Groupe 2 : n = ${results.n2}, moyenne = ${formatNumber(results.mean2)}, écart-type = ${formatNumber(results.sd2)}`, 25, y); y += 6;
      doc.text(`Niveau de confiance : ${results.conf}%`, 25, y); y += 12;

      // ----- Mean difference card -----
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(20, y, 170, 35, 3, 3, 'FD');
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DIFFÉRENCE DES MOYENNES', 105, y + 8, { align: 'center' });
      doc.setFontSize(22);
      doc.text(formatNumber(results.meanDiff), 105, y + 24, { align: 'center' });
      y += 45;

      // ----- Main t-test results table -----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Résultats du test t – IC ${results.conf}%`, 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const tTestBody = [
        ['Variance égale', formatNumber(results.tEqual), results.dfEqual.toString(), formatNumber(results.pEqual), formatNumber(results.meanDiff), formatNumber(results.ciEqualLower), formatNumber(results.ciEqualUpper)],
        ['Variance inégale', formatNumber(results.tUnequal), formatNumber(results.dfUnequal, 2), formatNumber(results.pUnequal), formatNumber(results.meanDiff), formatNumber(results.ciUnequalLower), formatNumber(results.ciUnequalUpper)],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'Statistique t', 'ddl', 'valeur-p', 'Différence', 'Limite inf.', 'Limite sup.']],
        body: tTestBody,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // ----- F-test for equality of variances -----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("Test d'égalité des variances (F de Hartley)", 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const fTestBody = [
        [formatNumber(results.fValue), `${results.dfNum}, ${results.dfDen}`, formatNumber(results.pF)],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Statistique F', 'ddl (num., dénom.)', 'valeur-p']],
        body: fTestBody,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 40, halign: 'center' },
          1: { cellWidth: 50, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 3, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // ----- Interpretation -----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Interprétation', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);

      let interpretation = `À ${results.conf}% de confiance, la différence des moyennes est de ${formatNumber(results.meanDiff)}.\n`;
      interpretation += `• Test de Student (variances égales) : t = ${formatNumber(results.tEqual)}, ddl = ${results.dfEqual}, p = ${formatNumber(results.pEqual)}. ${results.pEqual < 0.05 ? 'Différence significative.' : 'Non significatif.'}\n`;
      interpretation += `• Test de Welch (variances inégales) : t = ${formatNumber(results.tUnequal)}, ddl = ${formatNumber(results.dfUnequal, 2)}, p = ${formatNumber(results.pUnequal)}. ${results.pUnequal < 0.05 ? 'Différence significative.' : 'Non significatif.'}\n`;
      interpretation += `• Test d’égalité des variances : F = ${formatNumber(results.fValue)}, ddl = ${results.dfNum}, ${results.dfDen}, p = ${formatNumber(results.pF)}. ${results.pF < 0.05 ? 'Les variances sont significativement différentes.' : 'Les variances sont homogènes.'}`;

      const splitText = doc.splitTextToSize(interpretation, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;

      // ----- References -----
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Test t de Student (égalité des variances) et test t de Welch (Satterthwaite).', 20, y); y += 4;
      doc.text("Test d'égalité des variances : F de Hartley (ratio des variances).", 20, y); y += 4;

      // ----- Footer -----
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`TwoSampleTTest_n1_${results.n1}_n2_${results.n2}.pdf`);
      toast.success('Rapport PDF exporté');
    } catch (error) {
      console.error(error);
      toast.error('Erreur PDF');
    }
  };

  // ----- Render (JSX) -----
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb navigation */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">TwoSampleTTest</span></li>
          </ol>
        </nav>

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Divide className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Test t de deux échantillons indépendants
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Comparaison de deux moyennes – Test t de Student, test de Welch, test d’égalité des variances
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
          {/* Left column – input form */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-6">
                {/* Group 1 inputs */}
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Groupe 1
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Taille (n₁)</label>
                      <input
                        type="number"
                        value={n1}
                        onChange={(e) => setN1(e.target.value)}
                        min="2"
                        step="1"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="7"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Moyenne</label>
                      <input
                        type="number"
                        value={mean1}
                        onChange={(e) => setMean1(e.target.value)}
                        step="any"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="11.57"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Écart-type</label>
                      <input
                        type="number"
                        value={sd1}
                        onChange={(e) => setSd1(e.target.value)}
                        min="0"
                        step="any"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="8.81"
                      />
                    </div>
                  </div>
                </div>

                {/* Group 2 inputs */}
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" /> Groupe 2
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Taille (n₂)</label>
                      <input
                        type="number"
                        value={n2}
                        onChange={(e) => setN2(e.target.value)}
                        min="2"
                        step="1"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="18"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Moyenne</label>
                      <input
                        type="number"
                        value={mean2}
                        onChange={(e) => setMean2(e.target.value)}
                        step="any"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="7.44"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Écart-type</label>
                      <input
                        type="number"
                        value={sd2}
                        onChange={(e) => setSd2(e.target.value)}
                        min="0"
                        step="any"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="3.698"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Intervalle de confiance bilatéral
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

          {/* Right column – results display */}
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
                  // Placeholder when no results
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                    <div className="text-4xl font-bold mt-2">
                      0.00
                    </div>
                  </div>
                ) : (
                  // Results area
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Mean difference card */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        Différence des moyennes (groupe 1 – groupe 2)
                      </p>
                      <div className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        {formatNumber(results.meanDiff)}
                      </div>
                      <p className="text-xs text-slate-500">
                        IC {results.conf}% (var. égale) : [{formatNumber(results.ciEqualLower)} – {formatNumber(results.ciEqualUpper)}]
                      </p>
                    </div>

                    {/* Descriptive statistics cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Groupe 1</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">n</span>
                            <span className="font-mono font-medium">{results.n1}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Moyenne</span>
                            <span className="font-mono font-medium">{formatNumber(results.mean1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Écart-type</span>
                            <span className="font-mono font-medium">{formatNumber(results.sd1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Erreur-type</span>
                            <span className="font-mono font-medium">{formatNumber(results.se1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Groupe 2</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">n</span>
                            <span className="font-mono font-medium">{results.n2}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Moyenne</span>
                            <span className="font-mono font-medium">{formatNumber(results.mean2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Écart-type</span>
                            <span className="font-mono font-medium">{formatNumber(results.sd2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Erreur-type</span>
                            <span className="font-mono font-medium">{formatNumber(results.se2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* T-test results table */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Test t – IC {results.conf}%
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
                              <th className="px-4 py-3 text-center">Statistique t</th>
                              <th className="px-4 py-3 text-center">ddl</th>
                              <th className="px-4 py-3 text-center">valeur-p</th>
                              <th className="px-4 py-3 text-center">Différence</th>
                              <th className="px-4 py-3 text-center">Limite inf.</th>
                              <th className="px-4 py-3 text-center">Limite sup.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr>
                              <td className="px-4 py-3 font-medium">Variance égale</td>
                              <td className="px-4 py-3 text-center font-mono">{formatNumber(results.tEqual)}</td>
                              <td className="px-4 py-3 text-center font-mono">{results.dfEqual}</td>
                              <td className="px-4 py-3 text-center font-mono">{formatNumber(results.pEqual)}</td>
                              <td className="px-4 py-3 text-center font-mono">{formatNumber(results.meanDiff)}</td>
                              <td className="px-4 py-3 text-center font-mono text-green-600 dark:text-green-400">{formatNumber(results.ciEqualLower)}</td>
                              <td className="px-4 py-3 text-center font-mono text-red-600 dark:text-red-400">{formatNumber(results.ciEqualUpper)}</td>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-700/20">
                              <td className="px-4 py-3 font-medium">Variance inégale</td>
                              <td className="px-4 py-3 text-center font-mono">{formatNumber(results.tUnequal)}</td>
                              <td className="px-4 py-3 text-center font-mono">{formatNumber(results.dfUnequal, 2)}</td>
                              <td className="px-4 py-3 text-center font-mono">{formatNumber(results.pUnequal)}</td>
                              <td className="px-4 py-3 text-center font-mono">{formatNumber(results.meanDiff)}</td>
                              <td className="px-4 py-3 text-center font-mono text-green-600 dark:text-green-400">{formatNumber(results.ciUnequalLower)}</td>
                              <td className="px-4 py-3 text-center font-mono text-red-600 dark:text-red-400">{formatNumber(results.ciUnequalUpper)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* F-test for equality of variances */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Sigma className="w-4 h-4 text-blue-500" />
                        Test d'égalité des variances (F de Hartley)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">Statistique F</p>
                          <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.fValue)}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">ddl (num., dénom.)</p>
                          <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">{results.dfNum}, {results.dfDen}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">valeur-p</p>
                          <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.pF)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
                        {results.pF < 0.05
                          ? '→ Les variances sont significativement différentes (p < 0.05). Privilégiez le test de Welch.'
                          : '→ Les variances ne sont pas significativement différentes (p >= 0.05). Le test de Student est approprié.'}
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Guide – TwoSampleTTest (Test t indépendant)
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
                    Ce module reproduit l’outil <strong>Two Sample T-Test</strong> d’OpenEpi. Il compare les moyennes de deux groupes indépendants à partir de leurs tailles, moyennes et écarts-types. Deux versions du test t sont fournies : avec ou sans hypothèse d’égalité des variances. Le test d’égalité des variances (F de Hartley) permet de choisir la méthode appropriée.
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      Student
                    </div>
                    <div className="text-xs text-slate-500">Var. égales, ddl = n₁+n₂‑2</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      Welch
                    </div>
                    <div className="text-xs text-slate-500">Var. inégales, ddl de Satterthwaite</div>
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
                    <p><strong className="text-slate-900 dark:text-white">Variance égale</strong> – variance commune pondérée, intervalle de confiance basé sur la distribution t avec n₁+n₂‑2 ddl.</p>
                    <p><strong className="text-slate-900 dark:text-white">Variance inégale (Welch)</strong> – erreur-type de Welch, ddl de Satterthwaite, intervalle de confiance correspondant.</p>
                    <p><strong className="text-slate-900 dark:text-white">Test F (Hartley)</strong> – F = s₁²/s₂² (le plus grand au numérateur). p-value bilatérale.</p>
                  </div>
                  <a
                    href="https://www.openepi.com/TwosampleTTest/TwosampleTTest.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source : OpenEpi – Two Sample T-Test <ArrowRight className="w-3 h-3 ml-1" />
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
                      <a href="https://www.openepi.com/PDFDocs/TwoSampleTTestDoc.pdf" target="_blank" className="text-blue-600 hover:underline">
                        Documentation officielle OpenEpi (PDF)
                      </a>
                    </p>
                    <p>
                      Armitage P., Berry G., Matthews J.N.S. – <em>Statistical Methods in Medical Research</em>.
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