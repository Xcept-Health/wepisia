import { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  Calculator, 
  Presentation, 
  Copy, 
  FileDown, 
  HelpCircle, 
  X, 
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Users,
  Activity,
  Beaker,
  TestTube,
  Zap,
  Target,
  GitCompare
} from 'lucide-react';
import { Link } from 'wouter';

// Types pour les données et résultats
interface MeanDiffData {
  mean1: number;
  sd1: number;
  n1: number;
  mean2: number;
  sd2: number;
  n2: number;
}

interface RawData {
  data1: number[];
  data2: number[];
}

interface TestResults {
  meanDifference: number;
  confidenceLevel: number;
  ciLower: number;
  ciUpper: number;
  leveneTest: {
    fStat: number;
    pValue: number;
    equalVariances: boolean;
  };
  tTest: {
    tStat: number;
    df: number;
    pValue: number;
    se: number;
    testType: 'Student' | 'Welch';
    recommended: boolean;
  };
  mannWhitneyTest: {
    uStat: number;
    zStat: number;
    pValue: number;
    recommended: boolean;
  };
  cohensD: number;
  effectSize: string;
  interpretation: string;
}

interface GroupStats {
  mean: number;
  sd: number;
  n: number;
  min?: number;
  max?: number;
  se?: number;
}

export default function MeanDifferencePower() {
  // États pour les données
  const [inputMode, setInputMode] = useState<'summary' | 'raw'>('summary');
  const [summaryData, setSummaryData] = useState<MeanDiffData>({
    mean1: 0, sd1: 0, n1: 0, mean2: 0, sd2: 0, n2: 0
  });
  const [rawData, setRawData] = useState<RawData>({
    data1: [],
    data2: []
  });
  const [rawInput1, setRawInput1] = useState<string>('');
  const [rawInput2, setRawInput2] = useState<string>('');
  
  // Options
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [equalVariances, setEqualVariances] = useState<string>('auto');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  
  // Résultats
  const [results, setResults] = useState<TestResults | null>(null);
  const [groupStats, setGroupStats] = useState<{
    group1: GroupStats;
    group2: GroupStats;
  } | null>(null);
  
  // Références
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fonction pour parser les données brutes
  const parseRawData = (text: string): number[] => {
    if (!text.trim()) return [];
    
    const values = text.split(/[,;\s\n]+/)
      .map(val => val.trim())
      .filter(val => val !== '')
      .map(val => parseFloat(val))
      .filter(val => !isNaN(val));
    
    return values;
  };

  // Calculer les statistiques descriptives à partir des données brutes
  const calculateDescriptiveStats = (data: number[]): GroupStats => {
    if (data.length === 0) {
      return { mean: 0, sd: 0, n: 0, min: 0, max: 0, se: 0 };
    }
    
    const n = data.length;
    const mean = data.reduce((sum, val) => sum + val, 0) / n;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const se = sd / Math.sqrt(n);
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    return { mean, sd, n, min, max, se };
  };

  // Validation des données
  const validateData = (): { isValid: boolean; message: string } => {
    if (inputMode === 'summary') {
      const { mean1, sd1, n1, mean2, sd2, n2 } = summaryData;
      
      if (sd1 < 0 || sd2 < 0) {
        return { isValid: false, message: 'Les écarts-types doivent être positifs ou nuls' };
      }
      
      if (n1 < 2 || n2 < 2) {
        return { isValid: false, message: 'Les effectifs doivent être au moins de 2 par groupe' };
      }
      
      if (isNaN(mean1) || isNaN(mean2) || isNaN(sd1) || isNaN(sd2) || isNaN(n1) || isNaN(n2)) {
        return { isValid: false, message: 'Tous les champs doivent être remplis' };
      }
      
      return { isValid: true, message: '' };
    } else {
      const stats1 = calculateDescriptiveStats(rawData.data1);
      const stats2 = calculateDescriptiveStats(rawData.data2);
      
      if (stats1.n < 2 || stats2.n < 2) {
        return { isValid: false, message: 'Au moins 2 observations sont nécessaires par groupe' };
      }
      
      return { isValid: true, message: '' };
    }
  };

  // Fonction pour calculer la CDF normale
  const normalCDF = (z: number): number => {
    const erf = (x: number): number => {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;

      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x);

      const t = 1.0 / (1.0 + p * x);
      const y = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
      
      return sign * (1 - y * Math.exp(-x * x));
    };

    return 0.5 * (1 + erf(z / Math.sqrt(2)));
  };

  // Fonction pour obtenir la valeur Z critique
  const getCriticalZ = (alpha: number): number => {
    const p = 1 - alpha;
    if (p <= 0 || p >= 1) return NaN;
    
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;

    let x = p;
    if (p > 0.5) x = 1 - p;

    const t = Math.sqrt(-2 * Math.log(x));
    const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);

    return p > 0.5 ? z : -z;
  };

  // Fonction pour obtenir la valeur T critique (approximation)
  const getCriticalT = (df: number, alpha: number): number => {
    if (df >= 30) {
      return getCriticalZ(alpha);
    }
    
    const zValue = getCriticalZ(alpha);
    return zValue * (1 + (zValue * zValue + 1) / (4 * df));
  };

  // Test de Levene (simplifié)
  const calculateLeveneTest = (stats1: GroupStats, stats2: GroupStats) => {
    const fStat = Math.max(stats1.sd * stats1.sd, stats2.sd * stats2.sd) / 
                 Math.min(stats1.sd * stats1.sd, stats2.sd * stats2.sd);
    
    const pValue = fStat > 4 ? 0.01 : (fStat > 2 ? 0.05 : (fStat > 1.5 ? 0.1 : 0.5));
    const equalVariancesResult = pValue > 0.05;
    
    return { fStat, pValue, equalVariances: equalVariancesResult };
  };

  // Test t (Student ou Welch)
  const calculateTTest = (
    stats1: GroupStats, 
    stats2: GroupStats, 
    equalVariances: boolean, 
    confLevel: number
  ) => {
    const alpha = (100 - confLevel) / 100;
    const alphaHalf = alpha / 2;
    
    let se, df, tStat, tCritical;
    
    if (equalVariances) {
      // Student's t-test (pooled variance)
      const pooledVariance = ((stats1.n - 1) * stats1.sd * stats1.sd + 
                             (stats2.n - 1) * stats2.sd * stats2.sd) / 
                            (stats1.n + stats2.n - 2);
      se = Math.sqrt(pooledVariance * (1/stats1.n + 1/stats2.n));
      df = stats1.n + stats2.n - 2;
      tCritical = getCriticalT(df, alphaHalf);
    } else {
      // Welch's t-test (unequal variances)
      const var1 = stats1.sd * stats1.sd;
      const var2 = stats2.sd * stats2.sd;
      se = Math.sqrt(var1/stats1.n + var2/stats2.n);
      
      const numerator = Math.pow(var1/stats1.n + var2/stats2.n, 2);
      const denominator = Math.pow(var1/stats1.n, 2)/(stats1.n - 1) + 
                         Math.pow(var2/stats2.n, 2)/(stats2.n - 1);
      df = numerator / denominator;
      tCritical = getCriticalT(df, alphaHalf);
    }
    
    const meanDiff = stats1.mean - stats2.mean;
    tStat = meanDiff / se;
    const pValue = 2 * (1 - normalCDF(Math.abs(tStat)));
    
    const marginError = tCritical * se;
    const ciLower = meanDiff - marginError;
    const ciUpper = meanDiff + marginError;
    
    return {
      tStat,
      df,
      pValue,
      se,
      ciLower,
      ciUpper,
      testType: equalVariances ? 'Student' : 'Welch' as const,
      recommended: true
    };
  };

  // Test de Mann-Whitney (approximation)
  const calculateMannWhitney = (stats1: GroupStats, stats2: GroupStats) => {
    const n1 = stats1.n;
    const n2 = stats2.n;
    const meanU = (n1 * n2) / 2;
    const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    
    const pooledSD = Math.sqrt(((stats1.n - 1) * stats1.sd * stats1.sd + 
                               (stats2.n - 1) * stats2.sd * stats2.sd) / 
                              (stats1.n + stats2.n - 2));
    
    const zScore = (stats1.mean - stats2.mean) / (pooledSD * Math.sqrt(1/n1 + 1/n2));
    const uStat = meanU + zScore * sdU;
    const zStat = (uStat - meanU) / sdU;
    const pValue = 2 * (1 - normalCDF(Math.abs(zStat)));
    
    return {
      uStat,
      zStat,
      pValue,
      recommended: false
    };
  };

  // d de Cohen
  const calculateCohensD = (stats1: GroupStats, stats2: GroupStats): number => {
    const pooledSD = Math.sqrt(((stats1.n - 1) * stats1.sd * stats1.sd + 
                               (stats2.n - 1) * stats2.sd * stats2.sd) / 
                              (stats1.n + stats2.n - 2));
    
    return (stats1.mean - stats2.mean) / pooledSD;
  };

  // Interprétation de la taille d'effet
  const getEffectSizeInterpretation = (d: number): string => {
    const absD = Math.abs(d);
    if (absD < 0.2) return 'Très petit';
    if (absD < 0.5) return 'Petit';
    if (absD < 0.8) return 'Moyen';
    if (absD < 1.2) return 'Grand';
    return 'Très grand';
  };

  // Calcul principal
  const calculateResults = () => {
    const validation = validateData();
    
    if (!validation.isValid) {
      setErrorMessage(validation.message);
      setShowError(true);
      setResults(null);
      return;
    }
    
    setShowError(false);
    setIsCalculating(true);
    
    // Obtenir les statistiques descriptives
    let stats1: GroupStats, stats2: GroupStats;
    
    if (inputMode === 'summary') {
      stats1 = {
        mean: summaryData.mean1,
        sd: summaryData.sd1,
        n: summaryData.n1
      };
      stats2 = {
        mean: summaryData.mean2,
        sd: summaryData.sd2,
        n: summaryData.n2
      };
    } else {
      stats1 = calculateDescriptiveStats(rawData.data1);
      stats2 = calculateDescriptiveStats(rawData.data2);
    }
    
    setGroupStats({ group1: stats1, group2: stats2 });
    
    const confLevel = parseInt(confidenceLevel);
    const meanDifference = stats1.mean - stats2.mean;
    
    // Test de Levene
    const leveneTest = calculateLeveneTest(stats1, stats2);
    
    // Déterminer l'égalité des variances
    let variancesEqual = leveneTest.equalVariances;
    if (equalVariances === 'yes') variancesEqual = true;
    if (equalVariances === 'no') variancesEqual = false;
    
    // Test t
    const tTest = calculateTTest(stats1, stats2, variancesEqual, confLevel);
    
    // Test de Mann-Whitney
    const mannWhitneyTest = calculateMannWhitney(stats1, stats2);
    
    // d de Cohen
    const cohensD = calculateCohensD(stats1, stats2);
    const effectSize = getEffectSizeInterpretation(cohensD);
    
    // Génération de l'interprétation
    const interpretation = `
      La différence de moyennes entre le groupe 1 (${stats1.mean.toFixed(2)} ± ${stats1.sd.toFixed(2)}) 
      et le groupe 2 (${stats2.mean.toFixed(2)} ± ${stats2.sd.toFixed(2)}) est de ${meanDifference.toFixed(3)} unités.
      L'intervalle de confiance à ${confLevel}% [${tTest.ciLower.toFixed(3)}, ${tTest.ciUpper.toFixed(3)}] 
      ${tTest.ciLower > 0 || tTest.ciUpper < 0 ? 
        'ne contient pas 0, suggérant une différence statistiquement significative.' : 
        'contient 0, suggérant une absence de différence significative.'}
      La taille d'effet (d = ${cohensD.toFixed(3)}) indique un effet ${effectSize.toLowerCase()}.
      ${variancesEqual ? 
        'Le test t de Student a été utilisé car les variances sont égales.' : 
        'Le test t de Welch a été utilisé car les variances sont inégales.'}
    `;
    
    const newResults: TestResults = {
      meanDifference,
      confidenceLevel: confLevel,
      ciLower: tTest.ciLower,
      ciUpper: tTest.ciUpper,
      leveneTest,
      tTest,
      mannWhitneyTest,
      cohensD,
      effectSize,
      interpretation
    };
    
    setResults(newResults);
    setIsCalculating(false);
  };

  // Effet pour calculer automatiquement
  useEffect(() => {
    if (inputMode === 'summary') {
      const { mean1, sd1, n1, mean2, sd2, n2 } = summaryData;
      if (mean1 !== 0 || mean2 !== 0) {
        calculateResults();
      }
    } else {
      if (rawData.data1.length > 1 && rawData.data2.length > 1) {
        calculateResults();
      }
    }
  }, [summaryData, rawData, inputMode, confidenceLevel, equalVariances]);

  // Mise à jour des données brutes
  useEffect(() => {
    const data1 = parseRawData(rawInput1);
    const data2 = parseRawData(rawInput2);
    setRawData({ data1, data2 });
  }, [rawInput1, rawInput2]);

  // Gestionnaires d'événements
  const handleSummaryChange = (field: keyof MeanDiffData, value: string) => {
    const numValue = field.includes('n') ? parseInt(value) || 0 : parseFloat(value) || 0;
    setSummaryData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleClear = () => {
    if (inputMode === 'summary') {
      setSummaryData({ mean1: 0, sd1: 0, n1: 0, mean2: 0, sd2: 0, n2: 0 });
    } else {
      setRawInput1('');
      setRawInput2('');
      setRawData({ data1: [], data2: [] });
    }
    setResults(null);
    setShowError(false);
  };

  const handleExample = () => {
    setInputMode('summary');
    setSummaryData({
      mean1: 25.4,
      sd1: 4.2,
      n1: 30,
      mean2: 22.1,
      sd2: 3.8,
      n2: 25
    });
    setConfidenceLevel('95');
    setEqualVariances('auto');
  };

  const copyResults = async () => {
    if (!results || !groupStats) return;
    
    let text = `=== Différence de Moyennes ===\n\n`;
    text += `Groupe 1: M = ${groupStats.group1.mean.toFixed(2)}, SD = ${groupStats.group1.sd.toFixed(2)}, n = ${groupStats.group1.n}\n`;
    text += `Groupe 2: M = ${groupStats.group2.mean.toFixed(2)}, SD = ${groupStats.group2.sd.toFixed(2)}, n = ${groupStats.group2.n}\n`;
    text += `Différence: ${results.meanDifference.toFixed(3)}\n`;
    text += `IC ${results.confidenceLevel}%: [${results.ciLower.toFixed(3)}, ${results.ciUpper.toFixed(3)}]\n`;
    text += `Test t (${results.tTest.testType}): t = ${results.tTest.tStat.toFixed(3)}, df = ${Math.round(results.tTest.df)}, p = ${results.tTest.pValue.toFixed(4)}\n`;
    text += `Mann-Whitney: U = ${results.mannWhitneyTest.uStat.toFixed(1)}, Z = ${results.mannWhitneyTest.zStat.toFixed(3)}, p = ${results.mannWhitneyTest.pValue.toFixed(4)}\n`;
    text += `d de Cohen: ${results.cohensD.toFixed(3)} (effet ${results.effectSize})\n`;
    
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      alert('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results || !groupStats) {
      alert('Veuillez d\'abord effectuer un calcul');
      return;
    }

    if (!(window as any).jspdf) {
      alert('La bibliothèque PDF n\'est pas chargée');
      return;
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    const primaryColor = [79, 70, 229]; // Indigo-600
    const secondaryColor = [139, 92, 246]; // Violet-500

    // En-tête
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Différence de Moyennes', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Comparaison de deux moyennes avec tests statistiques', 105, 30, { align: 'center' });

    // Données descriptives
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Statistiques Descriptives', 20, 55);

    (doc as any).autoTable({
      startY: 60,
      head: [['Groupe', 'Moyenne', 'Écart-type', 'Effectif (n)']],
      body: [
        ['Groupe 1', groupStats.group1.mean.toFixed(2), groupStats.group1.sd.toFixed(2), groupStats.group1.n],
        ['Groupe 2', groupStats.group2.mean.toFixed(2), groupStats.group2.sd.toFixed(2), groupStats.group2.n]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Différence de moyennes
    const diffY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(16);
    doc.text('Différence de Moyennes et Intervalle de Confiance', 20, diffY);

    (doc as any).autoTable({
      startY: diffY + 5,
      head: [['Mesure', 'Valeur', `IC ${results.confidenceLevel}%`]],
      body: [
        ['Différence', results.meanDifference.toFixed(3), 
         `[${results.ciLower.toFixed(3)}, ${results.ciUpper.toFixed(3)}]`]
      ],
      theme: 'grid',
      headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Tests statistiques
    const testsY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(16);
    doc.text('Tests Statistiques', 20, testsY);

    (doc as any).autoTable({
      startY: testsY + 5,
      head: [['Test', 'Statistique', 'ddl/p-valeur', 'Signification']],
      body: [
        [
          `Test de Levene`,
          `F = ${results.leveneTest.fStat.toFixed(3)}`,
          `p = ${results.leveneTest.pValue.toFixed(4)}`,
          results.leveneTest.equalVariances ? 'Variances égales' : 'Variances inégales'
        ],
        [
          `Test t de ${results.tTest.testType}`,
          `t = ${results.tTest.tStat.toFixed(3)}`,
          `ddl = ${Math.round(results.tTest.df)}, p = ${results.tTest.pValue.toFixed(4)}`,
          results.tTest.pValue < 0.05 ? 'Significatif' : 'Non significatif'
        ],
        [
          'Mann-Whitney',
          `U = ${results.mannWhitneyTest.uStat.toFixed(1)}, Z = ${results.mannWhitneyTest.zStat.toFixed(3)}`,
          `p = ${results.mannWhitneyTest.pValue.toFixed(4)}`,
          results.mannWhitneyTest.pValue < 0.05 ? 'Significatif' : 'Non significatif'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' }, // Blue-500
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Taille d'effet
    const effectY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Taille d'effet (d de Cohen): ${results.cohensD.toFixed(3)} (effet ${results.effectSize})`, 20, effectY);

    // Interprétation
    const interpY = effectY + 10;
    const splitText = doc.splitTextToSize(results.interpretation, 160);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Interprétation:', 20, interpY);
    doc.text(splitText, 20, interpY + 8);

    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
    doc.text('StatTool - Différence de Moyennes', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });

    doc.save('difference_moyennes.pdf');
  };

  return (
    <>
      <style jsx>{`
        #mean-diff-results > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #mean-diff-results > div.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .pulse-animation {
          animation: pulse 1s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          {/* Breadcrumb */}
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link href="/" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  Différence de moyennes
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <GitCompare className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Différence de moyennes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Comparaison de deux moyennes avec test t et alternatives non paramétriques
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Saisie des données
                  </h2>
                </div>
                <div className="p-6">
                  {showError && (
                    <div className="text-red-600 dark:text-red-400 text-sm mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800" role="alert">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      {errorMessage}
                    </div>
                  )}
                  
                  {/* Onglets */}
                  <div className="flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1 mb-6">
                    <button
                      onClick={() => setInputMode('summary')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                        inputMode === 'summary'
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Données résumées
                    </button>
                    <button
                      onClick={() => setInputMode('raw')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                        inputMode === 'raw'
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Données brutes
                    </button>
                  </div>

                  {/* Contenu des onglets */}
                  {inputMode === 'summary' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Groupe 1 */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                            <Target className="w-4 h-4 mr-2" />
                            Groupe 1
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="mean1" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Moyenne
                              </label>
                              <input
                                type="number"
                                id="mean1"
                                step="any"
                                value={summaryData.mean1 || ''}
                                onChange={(e) => handleSummaryChange('mean1', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 25.5"
                              />
                            </div>
                            <div>
                              <label htmlFor="sd1" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Écart-type
                              </label>
                              <input
                                type="number"
                                id="sd1"
                                min="0"
                                step="any"
                                value={summaryData.sd1 || ''}
                                onChange={(e) => handleSummaryChange('sd1', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 4.2"
                              />
                            </div>
                            <div>
                              <label htmlFor="n1" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Effectif (n)
                              </label>
                              <input
                                type="number"
                                id="n1"
                                min="2"
                                step="1"
                                value={summaryData.n1 || ''}
                                onChange={(e) => handleSummaryChange('n1', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 30"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Groupe 2 */}
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                          <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-4 flex items-center">
                            <Zap className="w-4 h-4 mr-2" />
                            Groupe 2
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="mean2" className="block text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                                Moyenne
                              </label>
                              <input
                                type="number"
                                id="mean2"
                                step="any"
                                value={summaryData.mean2 || ''}
                                onChange={(e) => handleSummaryChange('mean2', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 22.1"
                              />
                            </div>
                            <div>
                              <label htmlFor="sd2" className="block text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                                Écart-type
                              </label>
                              <input
                                type="number"
                                id="sd2"
                                min="0"
                                step="any"
                                value={summaryData.sd2 || ''}
                                onChange={(e) => handleSummaryChange('sd2', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 3.8"
                              />
                            </div>
                            <div>
                              <label htmlFor="n2" className="block text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                                Effectif (n)
                              </label>
                              <input
                                type="number"
                                id="n2"
                                min="2"
                                step="1"
                                value={summaryData.n2 || ''}
                                onChange={(e) => handleSummaryChange('n2', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 25"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="data1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Données du Groupe 1
                          </label>
                          <textarea
                            id="data1"
                            rows={8}
                            value={rawInput1}
                            onChange={(e) => setRawInput1(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Entrez les valeurs séparées par des virgules ou des retours à la ligne&#10;Ex: 25.1, 26.3, 24.8, 27.2"
                          />
                        </div>
                        <div>
                          <label htmlFor="data2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Données du Groupe 2
                          </label>
                          <textarea
                            id="data2"
                            rows={8}
                            value={rawInput2}
                            onChange={(e) => setRawInput2(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Entrez les valeurs séparées par des virgules ou des retours à la ligne&#10;Ex: 22.5, 21.8, 23.1, 20.9"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Options du test
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="confidence-level" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Niveau de confiance
                        </label>
                        <select
                          id="confidence-level"
                          value={confidenceLevel}
                          onChange={(e) => setConfidenceLevel(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="90">90%</option>
                          <option value="95">95%</option>
                          <option value="99">99%</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="equal-variances" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Variances égales
                        </label>
                        <select
                          id="equal-variances"
                          value={equalVariances}
                          onChange={(e) => setEqualVariances(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="auto">Automatique (test de Levene)</option>
                          <option value="yes">Oui (test t de Student)</option>
                          <option value="no">Non (test t de Welch)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={calculateResults}
                      disabled={isCalculating}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Calculator className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      {isCalculating ? 'Calcul...' : 'Calculer'}
                    </button>
                    <button
                      onClick={handleClear}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Effacer
                    </button>
                    <button
                      onClick={handleExample}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Exemple
                    </button>
                  </div>
                </div>
              </div>

              {/* Aide contextuelle */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Comment utiliser cet outil
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                      <li><strong>Données résumées :</strong> Utilisez si vous avez les moyennes, écarts-types et effectifs</li>
                      <li><strong>Données brutes :</strong> Entrez les valeurs individuelles pour chaque groupe</li>
                      <li>Le test de Levene détermine automatiquement l'égalité des variances</li>
                      <li>Le test de Mann-Whitney est proposé si les conditions du test t ne sont pas remplies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Presentation className="w-5 h-5 mr-2 text-violet-500" strokeWidth={1.5} />
                    Résultats
                  </h2>
                  {results && (
                    <div className="flex gap-4">
                      <button 
                        onClick={copyResults}
                        className="p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title="Copier les résultats"
                      >
                        <Copy className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={exportPDF}
                        className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        title="Exporter en PDF"
                      >
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div id="mean-diff-results">
                    {results && groupStats ? (
                      <div ref={resultsRef} className="space-y-6">
                        {/* Résumé principal */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                            Différence de moyennes
                          </h3>
                          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                            {results.meanDifference.toFixed(3)}
                            <span className="ml-2">
                              {results.meanDifference > 0 ? (
                                <TrendingUp className="inline w-6 h-6" />
                              ) : results.meanDifference < 0 ? (
                                <TrendingDown className="inline w-6 h-6" />
                              ) : null}
                            </span>
                          </div>
                          <p className="text-blue-800 dark:text-blue-200 text-sm">
                            IC {results.confidenceLevel}% : [{results.ciLower.toFixed(3)}, {results.ciUpper.toFixed(3)}]
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            Test t de {results.tTest.testType} ({results.leveneTest.equalVariances ? 'variances égales' : 'variances inégales'})
                          </p>
                        </div>

                        {/* Statistiques descriptives */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                              <Target className="w-4 h-4 mr-2" />
                              Groupe 1
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs text-blue-700 dark:text-blue-300">Moyenne :</span>
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{groupStats.group1.mean.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-blue-700 dark:text-blue-300">Écart-type :</span>
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{groupStats.group1.sd.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-blue-700 dark:text-blue-300">Effectif :</span>
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{groupStats.group1.n}</span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                            <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center">
                              <Zap className="w-4 h-4 mr-2" />
                              Groupe 2
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-xs text-indigo-700 dark:text-indigo-300">Moyenne :</span>
                                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{groupStats.group2.mean.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-indigo-700 dark:text-indigo-300">Écart-type :</span>
                                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{groupStats.group2.sd.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-indigo-700 dark:text-indigo-300">Effectif :</span>
                                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{groupStats.group2.n}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tests statistiques */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                          <table className="min-w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                              <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  Test statistique
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  Statistique
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  ddl / p-valeur
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  Signification
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                              <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Test de Levene (égalité des variances)
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  F = {results.leveneTest.fStat.toFixed(3)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  p = {results.leveneTest.pValue.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    results.leveneTest.equalVariances 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  }`}>
                                    {results.leveneTest.equalVariances ? 'Variances égales' : 'Variances inégales'}
                                  </span>
                                </td>
                              </tr>
                              <tr className="bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center">
                                  <Activity className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                                  Test t de {results.tTest.testType}
                                </td>
                                <td className="px-6 py-4 text-center text-sm font-semibold text-blue-900 dark:text-blue-100">
                                  t = {results.tTest.tStat.toFixed(3)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-blue-900 dark:text-blue-100">
                                  ddl = {Math.round(results.tTest.df)}<br/>p = {results.tTest.pValue.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    results.tTest.pValue < 0.05 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                  }`}>
                                    {results.tTest.pValue < 0.05 ? 'Significatif' : 'Non significatif'}
                                  </span>
                                </td>
                              </tr>
                              <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Test de Mann-Whitney (non paramétrique)
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  U = {results.mannWhitneyTest.uStat.toFixed(1)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  Z = {results.mannWhitneyTest.zStat.toFixed(3)}<br/>p = {results.mannWhitneyTest.pValue.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    results.mannWhitneyTest.pValue < 0.05 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                  }`}>
                                    {results.mannWhitneyTest.pValue < 0.05 ? 'Significatif' : 'Non significatif'}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Taille d'effet */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
                          <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                            Taille d'effet (d de Cohen)
                          </h4>
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                              {results.cohensD.toFixed(3)}
                            </div>
                            <div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                Math.abs(results.cohensD) < 0.2 ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                                Math.abs(results.cohensD) < 0.5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                Math.abs(results.cohensD) < 0.8 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                Effet {results.effectSize.toLowerCase()}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-2">
                            Mesure standardisée de la différence entre les deux groupes
                          </p>
                        </div>

                        {/* Interprétation */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                          <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                            Interprétation
                          </h4>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            {results.interpretation}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Presentation className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          Saisissez vos données pour voir les résultats
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                          Les tests statistiques apparaîtront automatiquement
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section d'informations */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Test t de Student */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test t de Student</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Test paramétrique pour comparer deux moyennes. Suppose une distribution normale et des variances égales.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Conditions :</strong> Normalité, variances égales</p>
                <p><strong>Formule :</strong> t = (x̄₁ - x̄₂) / SE</p>
              </div>
            </div>

            {/* Test t de Welch */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Beaker className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test t de Welch</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Version du test t qui ne suppose pas l'égalité des variances. Plus robuste quand les variances diffèrent.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Conditions :</strong> Normalité, variances inégales</p>
                <p><strong>Avantage :</strong> Plus robuste</p>
              </div>
            </div>

            {/* Test de Mann-Whitney */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test de Mann-Whitney</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Test non paramétrique basé sur les rangs. Alternative au test t quand les conditions de normalité ne sont pas remplies.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Conditions :</strong> Aucune distribution spécifique</p>
                <p><strong>Basé sur :</strong> Rangs des observations</p>
              </div>
            </div>
          </div>

          {/* Bouton d'aide flottant */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          >
            <HelpCircle className="w-7 h-7" strokeWidth={1.5} />
          </button>

          {/* Modal d'aide */}
          {showHelpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 overflow-y-auto">
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 my-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aide complète & Ressources</h3>
                  <button onClick={() => setShowHelpModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <X className="w-7 h-7" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300">
                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <Shield className="w-6 h-6 mr-3" />
                      À propos de cet outil
                    </h4>
                    <p className="text-sm leading-relaxed">
                      Cet outil permet de comparer deux moyennes en utilisant des tests statistiques appropriés.
                      Il propose deux modes de saisie (données résumées ou brutes) et calcule automatiquement
                      les tests t de Student, t de Welch, et de Mann-Whitney selon les conditions des données.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <Users className="w-6 h-6 mr-3" />
                      Choix du test approprié
                    </h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>Test t de Student :</strong> Utilisé quand les variances sont égales et les données suivent une distribution normale</p>
                      <p><strong>Test t de Welch :</strong> Utilisé quand les variances sont inégales (plus robuste)</p>
                      <p><strong>Test de Mann-Whitney :</strong> Alternative non paramétrique quand les conditions de normalité ne sont pas remplies</p>
                      <p><strong>Test de Levene :</strong> Permet de tester l'égalité des variances entre les groupes</p>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">t</span>
                        </div>
                        <h5 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Test t</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                        Le test t compare les moyennes de deux groupes indépendants.
                        Il suppose que les données suivent une distribution normale.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-6 shadow-md border border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">d</span>
                        </div>
                        <h5 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">d de Cohen</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-indigo-800 dark:text-indigo-200">
                        Mesure standardisée de la taille d'effet. Permet de quantifier l'importance pratique
                        de la différence observée entre les groupes.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <Presentation className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Références & Documentation
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Ouvrages de référence</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• Field A. <em>Discovering Statistics Using R</em></li>
                          <li>• Wilcox RR. <em>Introduction to Robust Estimation and Hypothesis Testing</em></li>
                          <li>• Cohen J. <em>Statistical Power Analysis for the Behavioral Sciences</em></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Ressources en ligne</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.statsdirect.com/help/parametric_methods/paired_t.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">StatsDirect - Tests t</a></li>
                          <li>• <a href="https://www.graphpad.com/guides/prism/latest/statistics/interpreting_results_mann-whitney.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GraphPad - Test de Mann-Whitney</a></li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}