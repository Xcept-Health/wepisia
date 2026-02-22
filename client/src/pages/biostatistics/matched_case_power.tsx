import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Calculator,
  Trash2,
  HelpCircle,
  Presentation,
  Copy,
  Download,
  X,
  ChevronRight,
  Home,
  Edit,
  Zap,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileText
} from 'lucide-react';
import { Link } from 'wouter';

interface PowerResults {
  power: number;
  p0: number;
  p1: number;
  or: number;
  alpha: number;
  nCases: number;
  nControls: number;
  ratio: number;
  minDetectableOR: number;
  delta: number;
  interpretation: string;
}

interface SampleSizeResults {
  p0: number;
  p1: number;
  or: number;
  alpha: number;
  targetPower: number;
  ratio: number;
  nCases: number;
  nControls: number;
  nTotal: number;
  actualPower: number;
  continuity: boolean;
}

type CalculationMode = 'power' | 'sample-size';

export default function PowerCaseControl() {
  const [mode, setMode] = useState<CalculationMode>('power');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Power calculation state
  const [powerP0, setPowerP0] = useState<string>('');
  const [powerOR, setPowerOR] = useState<string>('');
  const [powerAlpha, setPowerAlpha] = useState<string>('0.05');
  const [powerNCases, setPowerNCases] = useState<string>('');
  const [powerNControls, setPowerNControls] = useState<string>('');
  const [powerRatio, setPowerRatio] = useState<string>('');
  
  // Sample size calculation state
  const [ssP0, setSsP0] = useState<string>('');
  const [ssOR, setSsOR] = useState<string>('');
  const [ssAlpha, setSsAlpha] = useState<string>('0.05');
  const [ssPower, setSsPower] = useState<string>('0.80');
  const [ssRatio, setSsRatio] = useState<string>('2');
  const [ssContinuity, setSsContinuity] = useState<string>('yes');
  
  // Results state
  const [powerResults, setPowerResults] = useState<PowerResults | null>(null);
  const [sampleSizeResults, setSampleSizeResults] = useState<SampleSizeResults | null>(null);
  
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load external scripts
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jspdf) {
        const jspdfScript = document.createElement('script');
        jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.body.appendChild(jspdfScript);

        const autotableScript = document.createElement('script');
        autotableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js';
        document.body.appendChild(autotableScript);
      }
    };
    loadScripts();
  }, []);

  // Update ratio when sample sizes change
  useEffect(() => {
    const nCases = parseInt(powerNCases) || 0;
    const nControls = parseInt(powerNControls) || 0;
    
    if (nCases > 0) {
      const ratio = (nControls / nCases).toFixed(1);
      setPowerRatio(ratio);
    } else {
      setPowerRatio('');
    }
  }, [powerNCases, powerNControls]);

  // Validate inputs
  const validateInputs = (): boolean => {
    if (mode === 'power') {
      const p0 = parseFloat(powerP0);
      const or = parseFloat(powerOR);
      const nCases = parseInt(powerNCases);
      const nControls = parseInt(powerNControls);

      return !isNaN(p0) && !isNaN(or) && !isNaN(nCases) && !isNaN(nControls) &&
             p0 >= 0 && p0 <= 1 && or > 0 && nCases > 0 && nControls > 0;
    } else {
      const p0 = parseFloat(ssP0);
      const or = parseFloat(ssOR);

      return !isNaN(p0) && !isNaN(or) && p0 >= 0 && p0 <= 1 && or > 0;
    }
  };

  // Statistical helper functions
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
    const erf = (x: number): number => {
      const a1 =  0.254829592;
      const a2 = -0.284496736;
      const a3 =  1.421413741;
      const a4 = -1.453152027;
      const a5 =  1.061405429;
      const p  =  0.3275911;

      const sign = x < 0 ? -1 : 1;
      const absX = Math.abs(x);

      const t = 1.0 / (1.0 + p * absX);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

      return sign * y;
    };

    return 0.5 * (1 + erf(z / Math.sqrt(2)));
  };

  // Calculate power
  const calculatePower = () => {
    const p0 = parseFloat(powerP0);
    const or = parseFloat(powerOR);
    const alpha = parseFloat(powerAlpha);
    const nCases = parseInt(powerNCases);
    const nControls = parseInt(powerNControls);

    // Calculate p1 from OR and p0
    const p1 = (or * p0) / (1 - p0 + or * p0);
    
    // Calculate pooled proportion
    const ratio = nControls / nCases;
    const pPooled = (p1 + ratio * p0) / (1 + ratio);
    
    // Calculate standard errors
    const se0 = Math.sqrt(pPooled * (1 - pPooled) * (1/nCases + 1/nControls));
    const se1 = Math.sqrt(p1 * (1 - p1) / nCases + p0 * (1 - p0) / nControls);
    
    // Calculate z-statistics
    const zAlpha = getZValue(alpha / 2);
    const delta = p1 - p0;
    const zBeta = (Math.abs(delta) - zAlpha * se0) / se1;
    
    // Calculate power
    const power = normalCDF(zBeta);
    
    // Calculate minimum detectable OR
    const minDetectableOR = calculateMinDetectableOR(p0, alpha, 0.8, nCases, nControls);
    
    // Determine interpretation
    const interpretation = power >= 0.8 ? 'Excellente' : 
                         power >= 0.7 ? 'Acceptable' : 
                         power >= 0.6 ? 'Faible' : 'Très faible';

    setPowerResults({
      power,
      p0,
      p1,
      or,
      alpha,
      nCases,
      nControls,
      ratio,
      minDetectableOR,
      delta,
      interpretation
    });
  };

  const calculateMinDetectableOR = (p0: number, alpha: number, targetPower: number, nCases: number, nControls: number): number => {
    // Binary search for minimum detectable OR
    let orLow = 1.01;
    let orHigh = 10;
    const tolerance = 0.001;
    
    for (let i = 0; i < 100; i++) {
      const orMid = (orLow + orHigh) / 2;
      const calculatedPower = calculateActualPower(p0, orMid, alpha, nCases, nControls);
      
      if (Math.abs(calculatedPower - targetPower) < tolerance) {
        return orMid;
      }
      
      if (calculatedPower < targetPower) {
        orLow = orMid;
      } else {
        orHigh = orMid;
      }
    }
    
    return (orLow + orHigh) / 2;
  };

  const calculateActualPower = (p0: number, or: number, alpha: number, nCases: number, nControls: number): number => {
    const p1 = (or * p0) / (1 - p0 + or * p0);
    const ratio = nControls / nCases;
    const pPooled = (p1 + ratio * p0) / (1 + ratio);
    
    const se0 = Math.sqrt(pPooled * (1 - pPooled) * (1/nCases + 1/nControls));
    const se1 = Math.sqrt(p1 * (1 - p1) / nCases + p0 * (1 - p0) / nControls);
    
    const zAlpha = getZValue(alpha / 2);
    const delta = p1 - p0;
    const zBeta = (Math.abs(delta) - zAlpha * se0) / se1;
    
    return normalCDF(zBeta);
  };

  // Calculate sample size
  const calculateSampleSize = () => {
    const p0 = parseFloat(ssP0);
    const or = parseFloat(ssOR);
    const alpha = parseFloat(ssAlpha);
    const targetPower = parseFloat(ssPower);
    const ratio = parseFloat(ssRatio);
    const continuity = ssContinuity === 'yes';

    // Calculate p1 from OR and p0
    const p1 = (or * p0) / (1 - p0 + or * p0);
    
    // Calculate pooled proportion
    const pPooled = (p1 + ratio * p0) / (1 + ratio);
    
    // Calculate z-values
    const zAlpha = getZValue(alpha / 2);
    const zBeta = getZValue(1 - targetPower);
    
    // Calculate sample size for cases
    const delta = Math.abs(p1 - p0);
    const numerator = Math.pow(zAlpha * Math.sqrt(pPooled * (1 - pPooled) * (1 + 1/ratio)) + 
                              zBeta * Math.sqrt(p1 * (1 - p1) + p0 * (1 - p0) / ratio), 2);
    
    let nCases = numerator / (delta * delta);
    
    // Apply continuity correction if requested
    if (continuity) {
      nCases = nCases * (1 + Math.sqrt(1 + 2 * (1 + ratio) / (nCases * ratio * delta)));
    }
    
    nCases = Math.ceil(nCases);
    const nControls = Math.ceil(nCases * ratio);
    const nTotal = nCases + nControls;
    
    // Calculate actual power with calculated sample size
    const actualPower = calculateActualPower(p0, or, alpha, nCases, nControls);
    
    setSampleSizeResults({
      p0,
      p1,
      or,
      alpha,
      targetPower,
      ratio,
      nCases,
      nControls,
      nTotal,
      actualPower,
      continuity
    });
  };

  // Calculate results based on mode
  const calculate = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      if (mode === 'power') {
        calculatePower();
      } else {
        calculateSampleSize();
      }
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate when inputs change
  useEffect(() => {
    if (validateInputs()) {
      calculate();
    } else {
      setPowerResults(null);
      setSampleSizeResults(null);
    }
  }, [mode, powerP0, powerOR, powerAlpha, powerNCases, powerNControls, ssP0, ssOR, ssAlpha, ssPower, ssRatio, ssContinuity]);

  // Animation effect for results
  useEffect(() => {
    if ((powerResults || sampleSizeResults) && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [powerResults, sampleSizeResults]);

  // Clear form
  const clearForm = () => {
    if (mode === 'power') {
      setPowerP0('');
      setPowerOR('');
      setPowerAlpha('0.05');
      setPowerNCases('');
      setPowerNControls('');
    } else {
      setSsP0('');
      setSsOR('');
      setSsAlpha('0.05');
      setSsPower('0.80');
      setSsRatio('2');
      setSsContinuity('yes');
    }
    setPowerResults(null);
    setSampleSizeResults(null);
  };

  // Load example data
  const loadExample = () => {
    if (mode === 'power') {
      setPowerP0('0.20');
      setPowerOR('2.0');
      setPowerAlpha('0.05');
      setPowerNCases('100');
      setPowerNControls('200');
    } else {
      setSsP0('0.20');
      setSsOR('2.0');
      setSsAlpha('0.05');
      setSsPower('0.80');
      setSsRatio('2');
      setSsContinuity('yes');
    }
  };

  // Copy results
  const copyResults = async () => {
    let text = '';
    
    if (mode === 'power' && powerResults) {
      text = `Résultats de l'Analyse de Puissance - Étude Cas-Témoins\n` +
             `========================================================\n` +
             `Puissance statistique : ${(powerResults.power * 100).toFixed(1)}%\n` +
             `Proportion d'exposition chez les témoins (p₀) : ${(powerResults.p0 * 100).toFixed(1)}%\n` +
             `Proportion d'exposition chez les cas (p₁) : ${(powerResults.p1 * 100).toFixed(1)}%\n` +
             `Odds Ratio cible : ${powerResults.or.toFixed(2)}\n` +
             `Niveau de signification (α) : ${(powerResults.alpha * 100).toFixed(0)}%\n` +
             `Nombre de cas : ${powerResults.nCases}\n` +
             `Nombre de témoins : ${powerResults.nControls}\n` +
             `Ratio témoins/cas : ${powerResults.ratio.toFixed(1)}:1\n` +
             `OR minimal détectable (80% puissance) : ${powerResults.minDetectableOR.toFixed(2)}\n` +
             `Interprétation : Puissance ${powerResults.interpretation.toLowerCase()}`;
    } else if (mode === 'sample-size' && sampleSizeResults) {
      text = `Résultats du Calcul de Taille d'Échantillon - Étude Cas-Témoins\n` +
             `==============================================================\n` +
             `Taille d'échantillon requise : ${sampleSizeResults.nTotal} sujets\n` +
             `• Cas : ${sampleSizeResults.nCases}\n` +
             `• Témoins : ${sampleSizeResults.nControls}\n` +
             `Ratio témoins/cas : ${sampleSizeResults.ratio}:1\n\n` +
             `Paramètres de l'étude :\n` +
             `p₀ (témoins) : ${(sampleSizeResults.p0 * 100).toFixed(1)}%\n` +
             `p₁ (cas) : ${(sampleSizeResults.p1 * 100).toFixed(1)}%\n` +
             `Odds Ratio cible : ${sampleSizeResults.or.toFixed(2)}\n` +
             `Niveau de signification (α) : ${(sampleSizeResults.alpha * 100).toFixed(0)}%\n` +
             `Puissance souhaitée : ${(sampleSizeResults.targetPower * 100).toFixed(0)}%\n` +
             `Puissance obtenue : ${(sampleSizeResults.actualPower * 100).toFixed(1)}%\n` +
             `Correction de continuité : ${sampleSizeResults.continuity ? 'Appliquée' : 'Non appliquée'}`;
    }
    
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Erreur lors de la copie:', err);
      }
    }
  };

  // Export to PDF
  const exportPDF = async () => {
    if ((mode === 'power' && !powerResults) || (mode === 'sample-size' && !sampleSizeResults)) {
      alert('Veuillez d\'abord effectuer un calcul');
      return;
    }

    setExportLoading(true);
    
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      
      const primaryColor = [59, 130, 246];
      const secondaryColor = [99, 102, 241];
      const accentColor = [16, 185, 129];
      
      // Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text(mode === 'power' ? 'Analyse de Puissance - Cas-Témoins' : 'Taille d\'Échantillon - Cas-Témoins', 105, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.text('StatTool - Calculateur Épidémiologique', 105, 30, { align: 'center' });
      
      if (mode === 'power' && powerResults) {
        // Power calculation results
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text('Résultats Principaux', 20, 55);
        
        (doc as any).autoTable({
          startY: 60,
          body: [
            ['Puissance statistique', `${(powerResults.power * 100).toFixed(1)}%`],
            ['Interprétation', `Puissance ${powerResults.interpretation.toLowerCase()}`],
            ['Odds Ratio cible', powerResults.or.toFixed(2)],
            ['Niveau de signification (α)', `${(powerResults.alpha * 100).toFixed(0)}%`],
            ['OR minimal détectable (80% puissance)', powerResults.minDetectableOR.toFixed(2)]
          ],
          theme: 'grid',
          margin: { left: 20, right: 20 },
          styles: {
            fontSize: 11,
            cellPadding: 6
          }
        });
        
        const paramY = (doc as any).autoTable.previous.finalY + 20;
        doc.setFontSize(16);
        doc.text('Paramètres de l\'étude', 20, paramY);
        
        (doc as any).autoTable({
          startY: paramY + 10,
          body: [
            ['Proportion d\'exposition chez les témoins (p₀)', `${(powerResults.p0 * 100).toFixed(1)}%`],
            ['Proportion d\'exposition chez les cas (p₁)', `${(powerResults.p1 * 100).toFixed(1)}%`],
            ['Différence de proportions', `${(powerResults.delta * 100).toFixed(1)}%`],
            ['Nombre de cas', powerResults.nCases.toString()],
            ['Nombre de témoins', powerResults.nControls.toString()],
            ['Ratio témoins/cas', powerResults.ratio.toFixed(1)]
          ],
          theme: 'striped',
          margin: { left: 20, right: 20 },
          styles: {
            fontSize: 11,
            cellPadding: 5
          }
        });
      } else if (mode === 'sample-size' && sampleSizeResults) {
        // Sample size results
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text('Taille d\'échantillon requise', 20, 55);
        
        (doc as any).autoTable({
          startY: 60,
          body: [
            ['Total de sujets', sampleSizeResults.nTotal.toString()],
            ['Nombre de cas', sampleSizeResults.nCases.toString()],
            ['Nombre de témoins', sampleSizeResults.nControls.toString()],
            ['Ratio témoins/cas', sampleSizeResults.ratio.toFixed(1)],
            ['Puissance souhaitée', `${(sampleSizeResults.targetPower * 100).toFixed(0)}%`],
            ['Puissance obtenue', `${(sampleSizeResults.actualPower * 100).toFixed(1)}%`]
          ],
          theme: 'grid',
          margin: { left: 20, right: 20 },
          styles: {
            fontSize: 11,
            cellPadding: 6
          }
        });
        
        const paramY = (doc as any).autoTable.previous.finalY + 20;
        doc.setFontSize(16);
        doc.text('Paramètres de l\'étude', 20, paramY);
        
        (doc as any).autoTable({
          startY: paramY + 10,
          body: [
            ['Proportion d\'exposition chez les témoins (p₀)', `${(sampleSizeResults.p0 * 100).toFixed(1)}%`],
            ['Proportion d\'exposition chez les cas (p₁)', `${(sampleSizeResults.p1 * 100).toFixed(1)}%`],
            ['Odds Ratio cible', sampleSizeResults.or.toFixed(2)],
            ['Niveau de signification (α)', `${(sampleSizeResults.alpha * 100).toFixed(0)}%`],
            ['Correction de continuité', sampleSizeResults.continuity ? 'Appliquée' : 'Non appliquée']
          ],
          theme: 'striped',
          margin: { left: 20, right: 20 },
          styles: {
            fontSize: 11,
            cellPadding: 5
          }
        });
      }
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
      doc.text('StatTool - Analyse de Puissance Cas-Témoins', 105, pageHeight - 20, { align: 'center' });
      doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });
      
      doc.save(`${mode === 'power' ? 'puissance_cas_temoins' : 'taille_echantillon_cas_temoins'}.pdf`);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        #power-cc-results {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #power-cc-results.fade-in {
          opacity: 1;
          transform: translateY(0);
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Puissance - Cas-témoins</span>
              </li>
            </ol>
          </nav>
          
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Puissance - Étude cas-témoins
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calcul de la puissance statistique et de la taille d'échantillon pour études cas-témoins non appariées
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Edit className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Type de calcul
                  </h2>
                </div>
                
                <div className="p-6">
                  {/* Calculation type tabs */}
                  <div className="flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1 mb-6">
                    <button
                      onClick={() => setMode('power')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                        mode === 'power'
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Calculer la puissance
                    </button>
                    <button
                      onClick={() => setMode('sample-size')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                        mode === 'sample-size'
                          ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Calculer la taille d'échantillon
                    </button>
                  </div>

                  {/* Power calculation form */}
                  {mode === 'power' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Study parameters */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4">Paramètres de l'étude</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="power-p0" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Proportion d'exposition chez les témoins (p₀)
                              </label>
                              <input
                                type="number"
                                id="power-p0"
                                min="0"
                                max="1"
                                step="0.01"
                                value={powerP0}
                                onChange={(e) => setPowerP0(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 0.20"
                              />
                            </div>
                            <div>
                              <label htmlFor="power-or" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Odds Ratio à détecter (OR)
                              </label>
                              <input
                                type="number"
                                id="power-or"
                                min="0.01"
                                step="0.01"
                                value={powerOR}
                                onChange={(e) => setPowerOR(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 2.0"
                              />
                            </div>
                            <div>
                              <label htmlFor="power-alpha" className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Niveau de signification (α)
                              </label>
                              <select
                                id="power-alpha"
                                value={powerAlpha}
                                onChange={(e) => setPowerAlpha(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="0.01">0.01 (1%)</option>
                                <option value="0.05">0.05 (5%)</option>
                                <option value="0.10">0.10 (10%)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Sample sizes */}
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-4">Tailles d'échantillon</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="power-n-cases" className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                Nombre de cas
                              </label>
                              <input
                                type="number"
                                id="power-n-cases"
                                min="1"
                                step="1"
                                value={powerNCases}
                                onChange={(e) => setPowerNCases(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 100"
                              />
                            </div>
                            <div>
                              <label htmlFor="power-n-controls" className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                Nombre de témoins
                              </label>
                              <input
                                type="number"
                                id="power-n-controls"
                                min="1"
                                step="1"
                                value={powerNControls}
                                onChange={(e) => setPowerNControls(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 200"
                              />
                            </div>
                            <div>
                              <label htmlFor="power-ratio" className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                Ratio témoins/cas
                              </label>
                              <input
                                type="number"
                                id="power-ratio"
                                value={powerRatio}
                                readOnly
                                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Calculé automatiquement"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Sample size calculation form */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Study parameters */}
                        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-4">Paramètres de l'étude</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="ss-p0" className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                Proportion d'exposition chez les témoins (p₀)
                              </label>
                              <input
                                type="number"
                                id="ss-p0"
                                min="0"
                                max="1"
                                step="0.01"
                                value={ssP0}
                                onChange={(e) => setSsP0(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 0.20"
                              />
                            </div>
                            <div>
                              <label htmlFor="ss-or" className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                Odds Ratio à détecter (OR)
                              </label>
                              <input
                                type="number"
                                id="ss-or"
                                min="0.01"
                                step="0.01"
                                value={ssOR}
                                onChange={(e) => setSsOR(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Ex: 2.0"
                              />
                            </div>
                            <div>
                              <label htmlFor="ss-alpha" className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                Niveau de signification (α)
                              </label>
                              <select
                                id="ss-alpha"
                                value={ssAlpha}
                                onChange={(e) => setSsAlpha(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="0.01">0.01 (1%)</option>
                                <option value="0.05">0.05 (5%)</option>
                                <option value="0.10">0.10 (10%)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Desired power */}
                        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                          <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-4">Puissance souhaitée</h3>
                          <div className="space-y-3">
                            <div>
                              <label htmlFor="ss-power" className="block text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                Puissance (1-β)
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
                              <label htmlFor="ss-ratio" className="block text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                Ratio témoins/cas
                              </label>
                              <select
                                id="ss-ratio"
                                value={ssRatio}
                                onChange={(e) => setSsRatio(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="1">1:1 (1 témoin par cas)</option>
                                <option value="2">2:1 (2 témoins par cas)</option>
                                <option value="3">3:1 (3 témoins par cas)</option>
                                <option value="4">4:1 (4 témoins par cas)</option>
                                <option value="5">5:1 (5 témoins par cas)</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="ss-continuity" className="block text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                Correction de continuité
                              </label>
                              <select
                                id="ss-continuity"
                                value={ssContinuity}
                                onChange={(e) => setSsContinuity(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="yes">Oui (recommandé)</option>
                                <option value="no">Non</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={calculate}
                      disabled={!validateInputs() || loading}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Calculator className="w-4 h-4 mr-2" />
                      )}
                      {loading ? 'Calcul en cours...' : 'Calculer'}
                    </button>
                    <button
                      onClick={clearForm}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Effacer
                    </button>
                    <button
                      onClick={loadExample}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Exemple
                    </button>
                  </div>
                </div>
              </div>

              {/* Help card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Comment utiliser cet outil
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• <strong>Puissance :</strong> Probabilité de détecter un effet s'il existe vraiment</li>
                      <li>• <strong>p₀ :</strong> Proportion d'exposition attendue chez les témoins</li>
                      <li>• <strong>OR :</strong> Odds ratio minimal que vous voulez détecter</li>
                      <li>• <strong>Ratio témoins/cas :</strong> Plus de témoins augmente la puissance</li>
                      <li>• <strong>Puissance recommandée :</strong> 80% minimum, 90% idéal</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <Presentation className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
                      Résultats
                    </div>
                    {(powerResults || sampleSizeResults) && (
                      <div className="flex gap-2">
                        <button
                          onClick={copyResults}
                          className="p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Copier les résultats"
                        >
                          {copySuccess ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={exportPDF}
                          disabled={exportLoading}
                          className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          title="Exporter en PDF"
                        >
                          {exportLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    )}
                  </h2>
                </div>
                
                <div className="p-6">
                  <div id="power-cc-results" ref={resultsRef}>
                    {mode === 'power' ? (
                      powerResults ? (
                        <div className="space-y-6">
                          {/* Main summary */}
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Puissance statistique</h3>
                            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                              {(powerResults.power * 100).toFixed(1)}%
                            </div>
                            <p className="text-blue-800 dark:text-blue-200 text-sm">
                              Probabilité de détecter un OR de {powerResults.or.toFixed(2)} avec α = {(powerResults.alpha * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                              Puissance {powerResults.interpretation.toLowerCase()} pour cette configuration
                            </p>
                          </div>

                          {/* Study parameters */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">Paramètres d'exposition</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-xs text-blue-700 dark:text-blue-300">p₀ (témoins) :</span>
                                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{(powerResults.p0 * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-blue-700 dark:text-blue-300">p₁ (cas) :</span>
                                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{(powerResults.p1 * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-blue-700 dark:text-blue-300">Différence :</span>
                                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{(powerResults.delta * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
                              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-3">Tailles d'échantillon</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-xs text-green-700 dark:text-green-300">Cas :</span>
                                  <span className="text-sm font-medium text-green-900 dark:text-green-100">{powerResults.nCases}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-green-700 dark:text-green-300">Témoins :</span>
                                  <span className="text-sm font-medium text-green-900 dark:text-green-100">{powerResults.nControls}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-xs text-green-700 dark:text-green-300">Ratio :</span>
                                  <span className="text-sm font-medium text-green-900 dark:text-green-100">{powerResults.ratio.toFixed(1)}:1</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Results table */}
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
                                    {(powerResults.power * 100).toFixed(1)}%
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      powerResults.power >= 0.8 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                        : powerResults.power >= 0.7
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    }`}>
                                      {powerResults.interpretation}
                                    </span>
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Odds Ratio cible
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {powerResults.or.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {powerResults.or > 2 ? 'Effet important' : powerResults.or > 1.5 ? 'Effet modéré' : 'Effet faible'}
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    OR minimal détectable (80% puissance)
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {powerResults.minDetectableOR.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    Avec cette taille d'échantillon
                                  </td>
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Niveau de signification
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    {(powerResults.alpha * 100).toFixed(0)}%
                                  </td>
                                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                    Risque d'erreur de type I
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Recommendations */}
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Recommandations</h4>
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                              {powerResults.power >= 0.8 ? 
                                <p>Excellente puissance ! Votre étude a {(powerResults.power * 100).toFixed(0)}% de chances de détecter l'OR de {powerResults.or.toFixed(2)} s'il existe.</p> :
                                powerResults.power >= 0.7 ?
                                <p> Puissance acceptable mais pourrait être améliorée. Considérez augmenter la taille d'échantillon pour atteindre 80%.</p> :
                                <p>❌ Puissance insuffisante ({(powerResults.power * 100).toFixed(0)}%). Augmentez significativement la taille d'échantillon ou reconsidérez l'OR à détecter.</p>
                              }
                              <p className="mt-2">• Pour 80% de puissance, vous pourriez détecter un OR minimal de {powerResults.minDetectableOR.toFixed(2)}</p>
                              <p>• Un ratio témoins/cas plus élevé améliorerait la puissance</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                            <Zap className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-lg">Saisissez vos paramètres pour voir les résultats</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">La puissance ou la taille d'échantillon apparaîtra automatiquement</p>
                        </div>
                      )
                    ) : sampleSizeResults ? (
                      <div className="space-y-6">
                        {/* Main summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Taille d'échantillon requise</h3>
                          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                            {sampleSizeResults.nTotal} sujets
                          </div>
                          <p className="text-blue-800 dark:text-blue-200 text-sm">
                            {sampleSizeResults.nCases} cas + {sampleSizeResults.nControls} témoins (ratio {sampleSizeResults.ratio}:1)
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            Pour {(sampleSizeResults.targetPower * 100).toFixed(0)}% de puissance avec α = {(sampleSizeResults.alpha * 100).toFixed(0)}%
                          </p>
                        </div>

                        {/* Sample distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Cas</h4>
                            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                              {sampleSizeResults.nCases}
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Exposition attendue : {(sampleSizeResults.p1 * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
                            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Témoins</h4>
                            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                              {sampleSizeResults.nControls}
                            </div>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Exposition attendue : {(sampleSizeResults.p0 * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Total</h4>
                            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                              {sampleSizeResults.nTotal}
                            </div>
                            <p className="text-xs text-purple-700 dark:text-purple-300">
                              Ratio {sampleSizeResults.ratio}:1
                            </p>
                          </div>
                        </div>

                        {/* Results table */}
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
                                  {(sampleSizeResults.targetPower * 100).toFixed(0)}%
                                </td>
                                <td className="px-6 py-4 text-center text-sm font-semibold text-green-900 dark:text-green-100">
                                  {(sampleSizeResults.actualPower * 100).toFixed(1)}%
                                </td>
                              </tr>
                              <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Odds Ratio à détecter
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {sampleSizeResults.or.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {sampleSizeResults.or.toFixed(2)}
                                </td>
                              </tr>
                              <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Niveau de signification
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {(sampleSizeResults.alpha * 100).toFixed(0)}%
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {(sampleSizeResults.alpha * 100).toFixed(0)}%
                                </td>
                              </tr>
                              <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Correction de continuité
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {sampleSizeResults.continuity ? 'Appliquée' : 'Non appliquée'}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {sampleSizeResults.continuity ? 'Appliquée' : 'Non appliquée'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Practical considerations */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Considérations pratiques</h4>
                          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                            <p>• <strong>Taille finale recommandée :</strong> {Math.ceil(sampleSizeResults.nTotal * 1.1)} sujets (avec 10% de marge pour les perdus de vue)</p>
                            <p>• <strong>Recrutement :</strong> {Math.ceil(sampleSizeResults.nCases * 1.1)} cas et {Math.ceil(sampleSizeResults.nControls * 1.1)} témoins</p>
                            <p>• <strong>Ratio optimal :</strong> Le ratio {sampleSizeResults.ratio}:1 offre un bon équilibre coût/puissance</p>
                            {sampleSizeResults.actualPower > sampleSizeResults.targetPower && 
                              <p>• <strong>Puissance obtenue :</strong> {(sampleSizeResults.actualPower * 100).toFixed(1)}% (supérieure à l'objectif grâce à l'arrondi)</p>
                            }
                          </div>
                        </div>

                        {/* Interpretation */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                          <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Interprétation</h4>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Pour détecter un odds ratio de {sampleSizeResults.or.toFixed(2)} avec {(sampleSizeResults.targetPower * 100).toFixed(0)}% de puissance et un niveau de signification de {(sampleSizeResults.alpha * 100).toFixed(0)}%, 
                            vous devez recruter <strong>{sampleSizeResults.nCases} cas et {sampleSizeResults.nControls} témoins</strong> (total : {sampleSizeResults.nTotal} sujets).
                            Cette configuration suppose une prévalence d'exposition de {(sampleSizeResults.p0 * 100).toFixed(1)}% chez les témoins et de {(sampleSizeResults.p1 * 100).toFixed(1)}% chez les cas.
                            {sampleSizeResults.continuity ? ' La correction de continuité a été appliquée pour améliorer la précision.' : ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Saisissez vos paramètres pour voir les résultats</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">La taille d'échantillon apparaîtra automatiquement</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Information cards */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Statistical power */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Puissance statistique</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Probabilité de détecter un odds ratio donné s'il existe vraiment dans la population.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Formule :</strong> 1 - β (erreur de type II)</p>
                <p><strong>Recommandé :</strong> ≥ 80%</p>
              </div>
            </div>

            {/* Sample size */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Taille d'échantillon</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Nombre de cas et de témoins nécessaires pour atteindre la puissance souhaitée.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Facteurs :</strong> OR, p₀, α, puissance</p>
                <p><strong>Ratio :</strong> Plus de témoins = plus de puissance</p>
              </div>
            </div>

            {/* Detectable Odds Ratio */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Odds Ratio détectable</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Plus l'OR est proche de 1, plus il faut d'échantillons pour le détecter.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>OR = 1 :</strong> Pas d'association</p>
                <p><strong>OR sup 2 :</strong> Plus facile à détecter</p>
              </div>
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
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/50 my-8 w-full max-w-3xl">
              <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aide complète & Ressources</h3>
                <button 
                  onClick={() => setShowHelpModal(false)} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-7 h-7" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[70vh]">
                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                    <Info className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Comment utiliser cet outil
                  </h4>
                  <ul className="space-y-3 text-base bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Choisissez entre le calcul de puissance ou de taille d'échantillon
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>Pour la puissance :</strong> Saisissez p₀, l'OR cible, et les tailles d'échantillon
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>Pour la taille d'échantillon :</strong> Saisissez p₀, l'OR cible, et la puissance souhaitée
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les résultats se calculent et s'affichent automatiquement
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Utilisez les boutons pour exporter ou copier les résultats
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-green-700 dark:text-green-400">
                    <FileText className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Définitions clés
                  </h4>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 space-y-4">
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">p₀ (Proportion chez les témoins)</h5>
                      <p className="text-sm">Proportion d'exposition attendue dans le groupe témoin (sans la maladie).</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">Odds Ratio (OR)</h5>
                      <p className="text-sm">Mesure de l'association entre l'exposition et la maladie. OR = (a×d)/(b×c).</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">Puissance statistique (1-β)</h5>
                      <p className="text-sm">Probabilité de détecter un effet s'il existe réellement. Cible recommandée : 80-90%.</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">Niveau de signification (α)</h5>
                      <p className="text-sm">Risque de conclure à tort à une association (erreur de type I). Standard : 5%.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-purple-700 dark:text-purple-400">
                    <AlertCircle className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Conseils pratiques
                  </h4>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>Pour augmenter la puissance :</strong> Augmentez la taille d'échantillon ou le ratio témoins/cas</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>OR difficile à détecter :</strong> Les OR proches de 1 (1.2-1.5) nécessitent des échantillons très grands</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>Ratio optimal :</strong> 2-4 témoins par cas offre généralement le meilleur rapport coût/efficacité</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>Planification :</strong> Ajoutez 10-20% de sujets supplémentaires pour compenser les perdus de vue</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Pièges à éviter
                  </h4>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Sous-puissance :</strong> Risque de ne pas détecter un effet réel (erreur de type II)</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Sur-estimation de p₀ :</strong> Conduit à une sous-estimation de la taille d'échantillon requise</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Oubli de la correction de continuité :</strong> Peut sous-estimer légèrement la taille d'échantillon</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Multiples comparaisons :</strong> Si vous testez plusieurs expositions, ajustez α avec Bonferroni</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}