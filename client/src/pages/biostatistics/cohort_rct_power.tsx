import { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, Calculator, BarChart3, Copy, FileDown, 
  HelpCircle, X, Trash2, Users, Info,
  CheckCircle, Zap, TrendingUp
} from 'lucide-react';
import { Link } from 'wouter';

interface PowerResult {
  p1: number;
  p2: number;
  rr: number;
  alpha: number;
  n1: number;
  n2: number;
  power: number;
  minDetectableRR: number;
  riskDifference: number;
  nnt: number;
  powerInterpretation: string;
}

interface SampleSizeResult {
  p1: number;
  p2: number;
  rr: number;
  alpha: number;
  power: number;
  ratio: number;
  n1: number;
  n2: number;
  nTotal: number;
  actualPower: number;
  riskDifference: number;
  nnt: number;
}

type CalculationMode = 'power' | 'sample-size';

export default function CohortRCT() {
  // State for calculation mode
  const [mode, setMode] = useState<CalculationMode>('power');
  
  // State for power calculation inputs
  const [powerP1, setPowerP1] = useState<string>('');
  const [powerP2, setPowerP2] = useState<string>('');
  const [powerAlpha, setPowerAlpha] = useState<string>('0.05');
  const [powerN1, setPowerN1] = useState<string>('');
  const [powerN2, setPowerN2] = useState<string>('');
  
  // State for sample size calculation inputs
  const [ssP1, setSsP1] = useState<string>('');
  const [ssP2, setSsP2] = useState<string>('');
  const [ssAlpha, setSsAlpha] = useState<string>('0.05');
  const [ssPower, setSsPower] = useState<string>('0.80');
  const [ssRatio, setSsRatio] = useState<string>('1');
  
  // Calculated values
  const [powerRR, setPowerRR] = useState<number | null>(null);
  const [ssRR, setSsRR] = useState<number | null>(null);
  
  // Results
  const [powerResults, setPowerResults] = useState<PowerResult | null>(null);
  const [sampleSizeResults, setSampleSizeResults] = useState<SampleSizeResult | null>(null);
  
  // UI states
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate RR automatically when p1 or p2 changes
  useEffect(() => {
    if (mode === 'power') {
      const p1 = parseFloat(powerP1);
      const p2 = parseFloat(powerP2);
      if (!isNaN(p1) && !isNaN(p2) && p2 > 0) {
        setPowerRR(p1 / p2);
      } else {
        setPowerRR(null);
      }
    } else {
      const p1 = parseFloat(ssP1);
      const p2 = parseFloat(ssP2);
      if (!isNaN(p1) && !isNaN(p2) && p2 > 0) {
        setSsRR(p1 / p2);
      } else {
        setSsRR(null);
      }
    }
  }, [powerP1, powerP2, ssP1, ssP2, mode]);

  // Validate inputs and calculate automatically
  useEffect(() => {
    if (mode === 'power') {
      const isValid = validatePowerInputs();
      if (isValid) {
        calculatePower();
      } else {
        setPowerResults(null);
      }
    } else {
      const isValid = validateSampleSizeInputs();
      if (isValid) {
        calculateSampleSize();
      } else {
        setSampleSizeResults(null);
      }
    }
  }, [mode, powerP1, powerP2, powerAlpha, powerN1, powerN2, ssP1, ssP2, ssAlpha, ssPower, ssRatio]);

  // Animation for results
  useEffect(() => {
    if (resultsRef.current && (powerResults || sampleSizeResults)) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [powerResults, sampleSizeResults]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Statistical functions
  const getZValue = (p: number): number => {
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

  const normalCDF = (z: number): number => {
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
  };

  const erf = (x: number): number => {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  };

  const validatePowerInputs = (): boolean => {
    const p1 = parseFloat(powerP1);
    const p2 = parseFloat(powerP2);
    const n1 = parseInt(powerN1);
    const n2 = parseInt(powerN2);

    return !isNaN(p1) && !isNaN(p2) && !isNaN(n1) && !isNaN(n2) &&
           p1 >= 0 && p1 <= 1 && p2 >= 0 && p2 <= 1 && p2 > 0 &&
           n1 > 0 && n2 > 0;
  };

  const validateSampleSizeInputs = (): boolean => {
    const p1 = parseFloat(ssP1);
    const p2 = parseFloat(ssP2);

    return !isNaN(p1) && !isNaN(p2) && p1 >= 0 && p1 <= 1 && 
           p2 >= 0 && p2 <= 1 && p2 > 0;
  };

  const calculatePower = () => {
    if (!validatePowerInputs()) return;

    const p1 = parseFloat(powerP1);
    const p2 = parseFloat(powerP2);
    const alpha = parseFloat(powerAlpha);
    const n1 = parseInt(powerN1);
    const n2 = parseInt(powerN2);

    const rr = p1 / p2;
    
    // Calculate pooled proportion
    const pPooled = (n1 * p1 + n2 * p2) / (n1 + n2);
    
    // Calculate standard errors
    const se0 = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));
    const se1 = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
    
    // Calculate z-statistics
    const zAlpha = getZValue(alpha / 2);
    const delta = p1 - p2;
    const zBeta = (Math.abs(delta) - zAlpha * se0) / se1;
    
    // Calculate power
    const power = normalCDF(zBeta);
    
    // Calculate minimum detectable RR
    const minDetectableRR = calculateMinDetectableRR(p2, alpha, 0.8, n1, n2);
    
    // Calculate risk difference and NNT
    const riskDifference = p1 - p2;
    const nnt = Math.abs(1 / riskDifference);
    
    // Power interpretation
    let powerInterpretation = '';
    if (power >= 0.8) powerInterpretation = 'Excellente';
    else if (power >= 0.7) powerInterpretation = 'Acceptable';
    else if (power >= 0.6) powerInterpretation = 'Faible';
    else powerInterpretation = 'Très faible';

    setPowerResults({
      p1, p2, rr, alpha, n1, n2, power, minDetectableRR, riskDifference, nnt, powerInterpretation
    });
    setShowError(false);
  };

  const calculateSampleSize = () => {
    if (!validateSampleSizeInputs()) return;

    const p1 = parseFloat(ssP1);
    const p2 = parseFloat(ssP2);
    const alpha = parseFloat(ssAlpha);
    const power = parseFloat(ssPower);
    const ratio = parseFloat(ssRatio);

    const rr = p1 / p2;
    
    // Calculate z-values
    const zAlpha = getZValue(alpha / 2);
    const zBeta = getZValue(1 - power);
    
    // Calculate pooled proportion for sample size calculation
    const pPooled = (p1 + ratio * p2) / (1 + ratio);
    
    // Calculate sample size for group 1 (exposed/treated)
    const delta = Math.abs(p1 - p2);
    const numerator = Math.pow(zAlpha * Math.sqrt(pPooled * (1 - pPooled) * (1 + 1/ratio)) + 
                              zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2) / ratio), 2);
    
    let n1 = numerator / (delta * delta);
    n1 = Math.ceil(n1);
    
    const n2 = Math.ceil(n1 * ratio);
    const nTotal = n1 + n2;
    
    // Calculate actual power with calculated sample size
    const actualPower = calculateActualPower(p1, p2, alpha, n1, n2);
    
    // Calculate risk difference and NNT
    const riskDifference = p1 - p2;
    const nnt = Math.abs(1 / riskDifference);
    
    setSampleSizeResults({
      p1, p2, rr, alpha, power, ratio, n1, n2, nTotal, actualPower, riskDifference, nnt
    });
    setShowError(false);
  };

  const calculateMinDetectableRR = (p2: number, alpha: number, power: number, n1: number, n2: number): number => {
    // Binary search for minimum detectable RR
    let rrLow = 1.01;
    let rrHigh = 10;
    let tolerance = 0.001;
    
    for (let i = 0; i < 100; i++) {
      const rrMid = (rrLow + rrHigh) / 2;
      const p1 = p2 * rrMid;
      
      if (p1 > 1) {
        rrHigh = rrMid;
        continue;
      }
      
      const calculatedPower = calculateActualPower(p1, p2, alpha, n1, n2);
      
      if (Math.abs(calculatedPower - power) < tolerance) {
        return rrMid;
      }
      
      if (calculatedPower < power) {
        rrLow = rrMid;
      } else {
        rrHigh = rrMid;
      }
    }
    
    return (rrLow + rrHigh) / 2;
  };

  const calculateActualPower = (p1: number, p2: number, alpha: number, n1: number, n2: number): number => {
    const pPooled = (n1 * p1 + n2 * p2) / (n1 + n2);
    
    const se0 = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));
    const se1 = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
    
    const zAlpha = getZValue(alpha / 2);
    const delta = p1 - p2;
    const zBeta = (Math.abs(delta) - zAlpha * se0) / se1;
    
    return normalCDF(zBeta);
  };

  const clearInputs = () => {
    if (mode === 'power') {
      setPowerP1('');
      setPowerP2('');
      setPowerN1('');
      setPowerN2('');
      setPowerAlpha('0.05');
      setPowerResults(null);
    } else {
      setSsP1('');
      setSsP2('');
      setSsAlpha('0.05');
      setSsPower('0.80');
      setSsRatio('1');
      setSampleSizeResults(null);
    }
    setShowError(false);
  };

  const loadExample = () => {
    if (mode === 'power') {
      setPowerP1('0.15');
      setPowerP2('0.10');
      setPowerN1('200');
      setPowerN2('200');
    } else {
      setSsP1('0.15');
      setSsP2('0.10');
    }
  };

  const copyResults = async () => {
    let text = '';
    
    if (mode === 'power' && powerResults) {
      const { p1, p2, rr, power, n1, n2, riskDifference, nnt } = powerResults;
      text = `Puissance - Étude de cohorte/RCT\n\n`;
      text += `Incidence groupe exposé/traité (p₁): ${(p1 * 100).toFixed(1)}%\n`;
      text += `Incidence groupe contrôle (p₂): ${(p2 * 100).toFixed(1)}%\n`;
      text += `Risque Relatif (RR): ${rr.toFixed(2)}\n`;
      text += `Taille groupe exposé (n₁): ${n1}\n`;
      text += `Taille groupe contrôle (n₂): ${n2}\n`;
      text += `Puissance statistique: ${(power * 100).toFixed(1)}%\n`;
      text += `Différence de risque: ${(riskDifference * 100).toFixed(1)}%\n`;
      text += `NNT/NNH: ${isFinite(nnt) ? Math.round(nnt) : '∞'}\n`;
    } else if (mode === 'sample-size' && sampleSizeResults) {
      const { p1, p2, rr, n1, n2, nTotal, power, actualPower } = sampleSizeResults;
      text = `Taille d'échantillon - Étude de cohorte/RCT\n\n`;
      text += `Incidence groupe exposé/traité (p₁): ${(p1 * 100).toFixed(1)}%\n`;
      text += `Incidence groupe contrôle (p₂): ${(p2 * 100).toFixed(1)}%\n`;
      text += `Risque Relatif (RR): ${rr.toFixed(2)}\n`;
      text += `Puissance souhaitée: ${(power * 100).toFixed(0)}%\n`;
      text += `Taille groupe exposé (n₁): ${n1}\n`;
      text += `Taille groupe contrôle (n₂): ${n2}\n`;
      text += `Total sujets: ${nTotal}\n`;
      text += `Puissance obtenue: ${(actualPower * 100).toFixed(1)}%\n`;
    } else {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      alert('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if ((mode === 'power' && !powerResults) || (mode === 'sample-size' && !sampleSizeResults)) {
      alert('Veuillez d\'abord effectuer un calcul');
      return;
    }

    // Load jspdf dynamically
    const loadPDF = async () => {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();

      const primaryColor = [59, 130, 246];
      const secondaryColor = [99, 102, 241];

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Puissance - Étude de cohorte/RCT', 105, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.text(mode === 'power' ? 'Calcul de la puissance statistique' : 'Calcul de la taille d\'échantillon', 105, 30, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text('Paramètres de l\'étude', 20, 55);
      doc.setFontSize(12);

      if (mode === 'power' && powerResults) {
        const { p1, p2, rr, alpha, n1, n2 } = powerResults;
        doc.text(`Incidence groupe exposé/traité (p₁): ${(p1 * 100).toFixed(1)}%`, 20, 65);
        doc.text(`Incidence groupe contrôle (p₂): ${(p2 * 100).toFixed(1)}%`, 20, 73);
        doc.text(`Risque Relatif (RR): ${rr.toFixed(2)}`, 20, 81);
        doc.text(`Niveau de signification (α): ${(alpha * 100).toFixed(0)}%`, 20, 89);
        doc.text(`Taille groupe exposé (n₁): ${n1}`, 20, 97);
        doc.text(`Taille groupe contrôle (n₂): ${n2}`, 20, 105);
      } else if (mode === 'sample-size' && sampleSizeResults) {
        const { p1, p2, rr, alpha, power, ratio } = sampleSizeResults;
        doc.text(`Incidence groupe exposé/traité (p₁): ${(p1 * 100).toFixed(1)}%`, 20, 65);
        doc.text(`Incidence groupe contrôle (p₂): ${(p2 * 100).toFixed(1)}%`, 20, 73);
        doc.text(`Risque Relatif (RR): ${rr.toFixed(2)}`, 20, 81);
        doc.text(`Niveau de signification (α): ${(alpha * 100).toFixed(0)}%`, 20, 89);
        doc.text(`Puissance souhaitée: ${(power * 100).toFixed(0)}%`, 20, 97);
        doc.text(`Ratio contrôle/exposé: ${ratio}:1`, 20, 105);
      }

      // Results table
      const startY = mode === 'power' ? 115 : 115;
      
      if (mode === 'power' && powerResults) {
        const { power, minDetectableRR, riskDifference, nnt, powerInterpretation } = powerResults;
        const tableData = [
          ['Puissance statistique', `${(power * 100).toFixed(1)}%`, powerInterpretation],
          ['RR minimal détectable (80% puissance)', `${minDetectableRR.toFixed(2)}`, 'Avec cette taille d\'échantillon'],
          ['Différence de risque', `${(riskDifference * 100).toFixed(1)}%`, 'Différence absolue d\'incidence'],
          ['NNT/NNH', isFinite(nnt) ? Math.round(nnt).toString() : '∞', riskDifference > 0 ? 'Nombre à traiter pour nuire' : 'Nombre à traiter pour bénéfice']
        ];

        (doc as any).autoTable({
          startY,
          head: [['Paramètre', 'Valeur', 'Interprétation']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
          margin: { left: 20, right: 20 },
          styles: { fontSize: 10, cellPadding: 4 }
        });
      } else if (mode === 'sample-size' && sampleSizeResults) {
        const { n1, n2, nTotal, actualPower, ratio } = sampleSizeResults;
        const tableData = [
          ['Groupe exposé/traité (n₁)', n1.toString(), `Incidence: ${(sampleSizeResults.p1 * 100).toFixed(1)}%`],
          ['Groupe contrôle (n₂)', n2.toString(), `Incidence: ${(sampleSizeResults.p2 * 100).toFixed(1)}%`],
          ['Total sujets', nTotal.toString(), `Ratio: ${(n2/n1).toFixed(1)}:1`],
          ['Puissance obtenue', `${(actualPower * 100).toFixed(1)}%`, 'Puissance réelle avec cet échantillon']
        ];

        (doc as any).autoTable({
          startY,
          head: [['Paramètre', 'Valeur', 'Détails']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
          margin: { left: 20, right: 20 },
          styles: { fontSize: 10, cellPadding: 4 }
        });
      }

      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
      doc.text('StatTool - Puissance des études de cohorte/RCT', 105, pageHeight - 20, { align: 'center' });
      doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });

      doc.save(`puissance_cohorte_${mode}_${new Date().getTime()}.pdf`);
    };

    loadPDF();
  };

  const currentResults = mode === 'power' ? powerResults : sampleSizeResults;

  return (
    <>
      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .tab-active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .tab-inactive {
          color: #6b7280;
        }
        
        @media (prefers-color-scheme: dark) {
          .tab-active {
            background: #475569;
            color: #60a5fa;
          }
          .tab-inactive {
            color: #9ca3af;
          }
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Puissance - Étude de cohorte/RCT</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Puissance - Étude de cohorte / RCT
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calcul de la puissance statistique et de la taille d'échantillon pour études de cohorte et essais cliniques
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
                    Type de calcul
                  </h2>
                </div>
                
                <div className="p-6">
                  {/* Tabs */}
                  <div className="flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1 mb-6">
                    <button
                      onClick={() => setMode('power')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${mode === 'power' ? 'tab-active' : 'tab-inactive'}`}
                    >
                      Calculer la puissance
                    </button>
                    <button
                      onClick={() => setMode('sample-size')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${mode === 'sample-size' ? 'tab-active' : 'tab-inactive'}`}
                    >
                      Calculer la taille d'échantillon
                    </button>
                  </div>

                  {/* Power Calculation Content */}
                  {mode === 'power' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Incidence Parameters */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4">Incidences attendues</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="power-p1" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Incidence groupe exposé/traité (p₁)
                              </label>
                              <input
                                type="number"
                                id="power-p1"
                                min="0"
                                max="1"
                                step="0.001"
                                value={powerP1}
                                onChange={(e) => setPowerP1(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 0.15"
                              />
                            </div>
                            <div>
                              <label htmlFor="power-p2" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Incidence groupe non-exposé/contrôle (p₂)
                              </label>
                              <input
                                type="number"
                                id="power-p2"
                                min="0"
                                max="1"
                                step="0.001"
                                value={powerP2}
                                onChange={(e) => setPowerP2(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 0.10"
                              />
                            </div>
                            <div>
                              <label htmlFor="power-rr" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Risque Relatif calculé (RR)
                              </label>
                              <input
                                type="number"
                                id="power-rr"
                                readOnly
                                value={powerRR?.toFixed(3) || ''}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-gray-50 dark:bg-slate-600 text-gray-900 dark:text-gray-100 transition-colors"
                                placeholder="Calculé automatiquement"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Statistical Parameters */}
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-4">Paramètres statistiques</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="power-alpha" className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                Niveau de signification (α)
                              </label>
                              <select
                                id="power-alpha"
                                value={powerAlpha}
                                onChange={(e) => setPowerAlpha(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="0.01">0.01 (1%)</option>
                                <option value="0.05">0.05 (5%)</option>
                                <option value="0.10">0.10 (10%)</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="power-n1" className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                Taille groupe exposé/traité (n₁)
                              </label>
                              <input
                                type="number"
                                id="power-n1"
                                min="1"
                                step="1"
                                value={powerN1}
                                onChange={(e) => setPowerN1(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 100"
                              />
                            </div>
                            <div>
                              <label htmlFor="power-n2" className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                Taille groupe non-exposé/contrôle (n₂)
                              </label>
                              <input
                                type="number"
                                id="power-n2"
                                min="1"
                                step="1"
                                value={powerN2}
                                onChange={(e) => setPowerN2(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 100"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Sample Size Calculation Content */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Incidence Parameters */}
                        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-4">Incidences attendues</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="ss-p1" className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                Incidence groupe exposé/traité (p₁)
                              </label>
                              <input
                                type="number"
                                id="ss-p1"
                                min="0"
                                max="1"
                                step="0.001"
                                value={ssP1}
                                onChange={(e) => setSsP1(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 0.15"
                              />
                            </div>
                            <div>
                              <label htmlFor="ss-p2" className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                Incidence groupe non-exposé/contrôle (p₂)
                              </label>
                              <input
                                type="number"
                                id="ss-p2"
                                min="0"
                                max="1"
                                step="0.001"
                                value={ssP2}
                                onChange={(e) => setSsP2(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 0.10"
                              />
                            </div>
                            <div>
                              <label htmlFor="ss-rr" className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                Risque Relatif calculé (RR)
                              </label>
                              <input
                                type="number"
                                id="ss-rr"
                                readOnly
                                value={ssRR?.toFixed(3) || ''}
                                className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-gray-50 dark:bg-slate-600 text-gray-900 dark:text-gray-100 transition-colors"
                                placeholder="Calculé automatiquement"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Power Parameters */}
                        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                          <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-4">Paramètres de puissance</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="ss-power" className="block text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                Puissance souhaitée (1-β)
                              </label>
                              <select
                                id="ss-power"
                                value={ssPower}
                                onChange={(e) => setSsPower(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="0.70">0.70 (70%)</option>
                                <option value="0.80">0.80 (80%)</option>
                                <option value="0.90">0.90 (90%)</option>
                                <option value="0.95">0.95 (95%)</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="ss-alpha" className="block text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                Niveau de signification (α)
                              </label>
                              <select
                                id="ss-alpha"
                                value={ssAlpha}
                                onChange={(e) => setSsAlpha(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="0.01">0.01 (1%)</option>
                                <option value="0.05">0.05 (5%)</option>
                                <option value="0.10">0.10 (10%)</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="ss-ratio" className="block text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                Ratio n₂/n₁ (contrôle/exposé)
                              </label>
                              <select
                                id="ss-ratio"
                                value={ssRatio}
                                onChange={(e) => setSsRatio(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="1">1:1 (groupes égaux)</option>
                                <option value="2">2:1 (2 contrôles par exposé)</option>
                                <option value="3">3:1 (3 contrôles par exposé)</option>
                                <option value="0.5">1:2 (2 exposés par contrôle)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={() => {
                        if (mode === 'power') calculatePower();
                        else calculateSampleSize();
                      }}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                    >
                      <Calculator className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Calculer
                    </button>
                    <button
                      onClick={clearInputs}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Effacer
                    </button>
                    <button
                      onClick={loadExample}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Exemple
                    </button>
                  </div>
                </div>
              </div>

              {/* Contextual Help */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Comment utiliser cet outil
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• <strong>p₁ :</strong> Incidence attendue dans le groupe exposé/traité</li>
                      <li>• <strong>p₂ :</strong> Incidence attendue dans le groupe non-exposé/contrôle</li>
                      <li>• <strong>RR :</strong> Risque relatif = p₁/p₂ (calculé automatiquement)</li>
                      <li>• <strong>Puissance :</strong> Probabilité de détecter la différence si elle existe</li>
                      <li>• <strong>Groupes égaux :</strong> Généralement optimal pour la puissance</li>
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
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
                    Résultats
                  </h2>
                  {currentResults && (
                    <div className="flex gap-4">
                      <button
                        onClick={copyResults}
                        className="relative p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        {copied ? (
                          <CheckCircle className="w-5 h-5" strokeWidth={1.5} />
                        ) : (
                          <Copy className="w-5 h-5" strokeWidth={1.5} />
                        )}
                        {copied && (
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            Copié!
                          </span>
                        )}
                      </button>
                      <button
                        onClick={exportPDF}
                        className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div id="results-container" ref={resultsRef}>
                    {currentResults ? (
                      mode === 'power' ? (
                        // Power Results Display
                        <div className="space-y-6">
                          {/* Power Summary */}
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Puissance statistique</h3>
                            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                              {((powerResults?.power || 0) * 100).toFixed(1)}%
                            </div>
                            <p className="text-blue-800 dark:text-blue-200 text-sm">
                              Probabilité de détecter un RR de {(powerResults?.rr || 0).toFixed(2)} avec α = {((powerResults?.alpha || 0) * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                              Puissance {powerResults?.powerInterpretation.toLowerCase()} pour cette configuration
                            </p>
                          </div>

                          {/* Key Metrics Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Groupe exposé/traité</h4>
                              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {((powerResults?.p1 || 0) * 100).toFixed(1)}%
                              </div>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                Incidence attendue (n={powerResults?.n1})
                              </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
                              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Groupe contrôle</h4>
                              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {((powerResults?.p2 || 0) * 100).toFixed(1)}%
                              </div>
                              <p className="text-xs text-green-700 dark:text-green-300">
                                Incidence attendue (n={powerResults?.n2})
                              </p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Risque Relatif</h4>
                              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                {(powerResults?.rr || 0).toFixed(2)}
                              </div>
                              <p className="text-xs text-purple-700 dark:text-purple-300">
                                p₁/p₂ = {(powerResults?.p1 || 0).toFixed(3)}/{(powerResults?.p2 || 0).toFixed(3)}
                              </p>
                            </div>
                          </div>

                          {/* Results Table */}
                          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                            <table className="min-w-full">
                              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                                <tr>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Paramètre
                                  </th>
                                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Valeur
                                  </th>
                                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Interprétation
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                                <tr className="bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-green-900 dark:text-green-100">
                                    <div className="flex items-center">
                                      <Zap className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" strokeWidth={1.5} />
                                      Puissance statistique
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-900 dark:text-green-100">
                                    {((powerResults?.power || 0) * 100).toFixed(1)}%
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      (powerResults?.power || 0) >= 0.8 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                      (powerResults?.power || 0) >= 0.7 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    }`}>
                                      {powerResults?.powerInterpretation}
                                    </span>
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Risque Relatif cible
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(powerResults?.rr || 0).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(powerResults?.rr || 0) > 2 ? 'Effet important' : (powerResults?.rr || 0) > 1.5 ? 'Effet modéré' : (powerResults?.rr || 0) < 0.5 ? 'Effet protecteur important' : (powerResults?.rr || 0) < 0.67 ? 'Effet protecteur modéré' : 'Effet faible'}
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    RR minimal détectable (80% puissance)
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(powerResults?.minDetectableRR || 0).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    Avec cette taille d'échantillon
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Différence de risque
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {((powerResults?.riskDifference || 0) * 100).toFixed(1)}%
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    Différence absolue d'incidence
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    NNT/NNH
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {isFinite(powerResults?.nnt || 0) ? Math.round(powerResults?.nnt || 0) : '∞'}
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(powerResults?.riskDifference || 0) > 0 ? 'Nombre à traiter pour nuire' : 'Nombre à traiter pour bénéfice'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Recommendations */}
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Recommandations</h4>
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                              {(powerResults?.power || 0) >= 0.8 ? 
                                `<p> Excellente puissance ! Votre étude a ${((powerResults?.power || 0) * 100).toFixed(0)}% de chances de détecter le RR de ${(powerResults?.rr || 0).toFixed(2)} s'il existe.</p>` :
                                (powerResults?.power || 0) >= 0.7 ?
                                `<p>⚠️ Puissance acceptable mais pourrait être améliorée. Considérez augmenter la taille d'échantillon pour atteindre 80%.</p>` :
                                `<p>❌ Puissance insuffisante (${((powerResults?.power || 0) * 100).toFixed(0)}%). Augmentez significativement la taille d'échantillon ou reconsidérez le RR à détecter.</p>`
                              }
                              <p className="mt-2">• Pour 80% de puissance, vous pourriez détecter un RR minimal de {(powerResults?.minDetectableRR || 0).toFixed(2)}</p>
                              <p>• Groupes de tailles égales optimisent généralement la puissance</p>
                              {isFinite(powerResults?.nnt || 0) && (powerResults?.nnt || 0) < 1000 ? 
                                `<p>• Il faut ${(powerResults?.riskDifference || 0) > 0 ? 'traiter' : 'exposer'} ${Math.round(powerResults?.nnt || 0)} personnes pour ${(powerResults?.riskDifference || 0) > 0 ? 'causer' : 'prévenir'} un événement supplémentaire</p>` : ''
                              }
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Sample Size Results Display
                        <div className="space-y-6">
                          {/* Sample Size Summary */}
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Taille d'échantillon requise</h3>
                            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                              {sampleSizeResults?.nTotal} sujets
                            </div>
                            <p className="text-blue-800 dark:text-blue-200 text-sm">
                              {sampleSizeResults?.n1} exposés/traités + {sampleSizeResults?.n2} non-exposés/contrôles (ratio {sampleSizeResults?.ratio}:1)
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                              Pour {((sampleSizeResults?.power || 0) * 100).toFixed(0)}% de puissance avec α = {((sampleSizeResults?.alpha || 0) * 100).toFixed(0)}%
                            </p>
                          </div>

                          {/* Sample Distribution Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Groupe exposé/traité</h4>
                              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {sampleSizeResults?.n1}
                              </div>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                Incidence attendue : {((sampleSizeResults?.p1 || 0) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
                              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Groupe contrôle</h4>
                              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {sampleSizeResults?.n2}
                              </div>
                              <p className="text-xs text-green-700 dark:text-green-300">
                                Incidence attendue : {((sampleSizeResults?.p2 || 0) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Total</h4>
                              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                {sampleSizeResults?.nTotal}
                              </div>
                              <p className="text-xs text-purple-700 dark:text-purple-300">
                                RR cible : {(sampleSizeResults?.rr || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Results Table */}
                          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                            <table className="min-w-full">
                              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                                <tr>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Paramètre
                                  </th>
                                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Valeur cible
                                  </th>
                                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    Valeur obtenue
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                                <tr className="bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-green-900 dark:text-green-100">
                                    <div className="flex items-center">
                                      <Zap className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" strokeWidth={1.5} />
                                      Puissance statistique
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-900 dark:text-green-100">
                                    {((sampleSizeResults?.power || 0) * 100).toFixed(0)}%
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-900 dark:text-green-100">
                                    {((sampleSizeResults?.actualPower || 0) * 100).toFixed(1)}%
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Risque Relatif à détecter
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(sampleSizeResults?.rr || 0).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(sampleSizeResults?.rr || 0).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Niveau de signification
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {((sampleSizeResults?.alpha || 0) * 100).toFixed(0)}%
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {((sampleSizeResults?.alpha || 0) * 100).toFixed(0)}%
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Ratio contrôle/exposé
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {sampleSizeResults?.ratio}:1
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(sampleSizeResults?.n2 && sampleSizeResults?.n1) ? (sampleSizeResults.n2 / sampleSizeResults.n1).toFixed(1) : '0'}:1
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Practical Considerations */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Considérations pratiques</h4>
                            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                              <p>• <strong>Taille finale recommandée :</strong> {Math.ceil((sampleSizeResults?.nTotal || 0) * 1.1)} sujets (avec 10% de marge pour les perdus de vue)</p>
                              <p>• <strong>Recrutement :</strong> {Math.ceil((sampleSizeResults?.n1 || 0) * 1.1)} exposés/traités et {Math.ceil((sampleSizeResults?.n2 || 0) * 1.1)} contrôles</p>
                              <p>• <strong>Différence de risque :</strong> {((sampleSizeResults?.riskDifference || 0) * 100).toFixed(1)}% ({(sampleSizeResults?.riskDifference || 0) > 0 ? 'augmentation' : 'diminution'} absolue)</p>
                              {isFinite(sampleSizeResults?.nnt || 0) && (sampleSizeResults?.nnt || 0) < 1000 ? 
                                <p>• <strong>NNT/NNH :</strong> {Math.round(sampleSizeResults?.nnt || 0)} (nombre à {(sampleSizeResults?.riskDifference || 0) > 0 ? 'traiter pour nuire' : 'traiter pour bénéfice'})</p> : 
                                null
                              }
                              {(sampleSizeResults?.actualPower || 0) > (sampleSizeResults?.power || 0) ? 
                                <p>• <strong>Puissance obtenue :</strong> {((sampleSizeResults?.actualPower || 0) * 100).toFixed(1)}% (supérieure à l'objectif grâce à l'arrondi)</p> : 
                                null
                              }
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      // Empty State
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Saisissez vos paramètres pour voir les résultats</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">La puissance ou la taille d'échantillon apparaîtra automatiquement</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Relative Risk Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risque Relatif</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Rapport des incidences entre le groupe exposé et le groupe non-exposé.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                <p><strong>Formule :</strong> RR = p₁/p₂</p>
                <p><strong>RR = 1 :</strong> Pas d'effet</p>
                <p><strong>RR &gt; 1 :</strong> Risque accru</p>
              </div>
            </div>

            {/* Statistical Power Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Puissance statistique</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Probabilité de détecter un risque relatif donné s'il existe vraiment.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                <p><strong>Formule :</strong> 1 - β (erreur de type II)</p>
                <p><strong>Recommandé :</strong> ≥ 80%</p>
              </div>
            </div>

            {/* Sample Size Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Taille d'échantillon</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Nombre de sujets par groupe nécessaire pour atteindre la puissance souhaitée.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                <p><strong>Facteurs :</strong> RR, incidences, α, puissance</p>
                <p><strong>Groupes égaux :</strong> Généralement optimal</p>
              </div>
            </div>
          </div>

          {/* Floating Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          >
            <HelpCircle className="w-7 h-7" strokeWidth={1.5} />
          </button>

          {/* Help Modal */}
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
                      À propos de cet outil
                    </h4>
                    <p className="text-sm leading-relaxed">
                      Cet outil calcule la puissance statistique ou la taille d'échantillon nécessaire pour les études de cohorte et les essais cliniques randomisés (RCT). 
                      Il utilise des méthodes statistiques standard pour estimer la probabilité de détecter une différence significative entre deux groupes.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      Méthodes de calcul
                    </h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>Test bilatéral :</strong> Utilisé pour détecter une différence dans les deux sens</p>
                      <p><strong>Approximation normale :</strong> Pour le calcul des intervalles de confiance</p>
                      <p><strong>Pooled proportion :</strong> Pour l'estimation de la variance combinée</p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <BarChart3 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Ressources & Tutoriels
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Références statistiques</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• Rosner B. <em>Fundamentals of Biostatistics</em></li>
                          <li>• Hulley SB. <em>Designing Clinical Research</em></li>
                          <li>• Rothman KJ, Greenland S. <em>Modern Epidemiology</em></li>
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