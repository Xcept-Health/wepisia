import { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Dice5,
  Copy,
  Download,
  RefreshCw,
  Trash2,
  HelpCircle,
  BarChart3,
  X,
  ChevronRight,
  Settings,
  ListOrdered,
  Users,
  Hash,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Info,
  Calculator
} from 'lucide-react';
import { Link } from 'wouter';

type GenerationType = 'integers' | 'decimals' | 'sequence' | 'sampling';

interface GeneratedNumbers {
  type: GenerationType;
  values: (number | string)[];
  min?: number;
  max?: number;
  decimalPlaces?: number;
  count: number;
  seed?: number;
  timestamp: Date;
}

interface Statistics {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  sum: number;
}

export default function RandomNumberGenerator() {
  const [generationType, setGenerationType] = useState<GenerationType>('integers');
  const [minValue, setMinValue] = useState<number>(1);
  const [maxValue, setMaxValue] = useState<number>(100);
  const [minDecimal, setMinDecimal] = useState<number>(0);
  const [maxDecimal, setMaxDecimal] = useState<number>(1);
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  const [sequenceItems, setSequenceItems] = useState<string>('');
  const [populationSize, setPopulationSize] = useState<number>(1000);
  const [sampleSize, setSampleSize] = useState<number>(100);
  const [count, setCount] = useState<number>(10);
  const [seed, setSeed] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [generatedNumbers, setGeneratedNumbers] = useState<GeneratedNumbers | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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

  // Seedable random number generator
  class SeededRandom {
    private seed: number;

    constructor(seed?: number) {
      this.seed = seed || Date.now();
    }

    next(): number {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    }

    nextInt(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min: number, max: number): number {
      return this.next() * (max - min) + min;
    }

    shuffle<T>(array: T[]): T[] {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    sample<T>(array: T[], size: number): T[] {
      const shuffled = this.shuffle(array);
      return shuffled.slice(0, size);
    }
  }

  // Validate inputs
  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate count
    if (count < 1 || count > 10000) {
      newErrors.count = 'Le nombre de valeurs doit être entre 1 et 10 000';
    }

    // Validate based on generation type
    if (generationType === 'integers') {
      if (minValue >= maxValue) {
        newErrors.minValue = 'La valeur minimale doit être inférieure à la valeur maximale';
      }
      if (minValue < -1000000 || maxValue > 1000000) {
        newErrors.range = 'Les valeurs doivent être entre -1,000,000 et 1,000,000';
      }
    } else if (generationType === 'decimals') {
      if (minDecimal >= maxDecimal) {
        newErrors.minDecimal = 'La valeur minimale doit être inférieure à la valeur maximale';
      }
      if (decimalPlaces < 1 || decimalPlaces > 10) {
        newErrors.decimalPlaces = 'Le nombre de décimales doit être entre 1 et 10';
      }
    } else if (generationType === 'sequence') {
      const items = sequenceItems.split('\n').filter(item => item.trim() !== '');
      if (items.length < 2) {
        newErrors.sequenceItems = 'Veuillez entrer au moins 2 éléments';
      }
    } else if (generationType === 'sampling') {
      if (sampleSize > populationSize) {
        newErrors.sampleSize = 'La taille de l\'échantillon ne peut pas dépasser la taille de la population';
      }
      if (populationSize < 1) {
        newErrors.populationSize = 'La taille de la population doit être au moins 1';
      }
      if (sampleSize < 1) {
        newErrors.sampleSize = 'La taille de l\'échantillon doit être au moins 1';
      }
    }

    // Validate seed if provided
    if (seed && !/^-?\d+$/.test(seed)) {
      newErrors.seed = 'La graine doit être un nombre entier';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate random numbers
  const generateNumbers = () => {
    if (!validateInputs()) return;

    setLoading(true);

    setTimeout(() => {
      try {
        const seedValue = seed ? parseInt(seed) : undefined;
        const random = new SeededRandom(seedValue);
        let values: (number | string)[] = [];
        let generatedData: GeneratedNumbers;

        switch (generationType) {
          case 'integers':
            values = Array.from({ length: count }, () => 
              random.nextInt(minValue, maxValue)
            );
            generatedData = {
              type: 'integers',
              values,
              min: minValue,
              max: maxValue,
              count,
              seed: seedValue,
              timestamp: new Date()
            };
            break;

          case 'decimals':
            values = Array.from({ length: count }, () => {
              const value = random.nextFloat(minDecimal, maxDecimal);
              return Number(value.toFixed(decimalPlaces));
            });
            generatedData = {
              type: 'decimals',
              values,
              min: minDecimal,
              max: maxDecimal,
              decimalPlaces,
              count,
              seed: seedValue,
              timestamp: new Date()
            };
            break;

          case 'sequence':
            const items = sequenceItems.split('\n').filter(item => item.trim() !== '');
            const shuffled = random.shuffle(items);
            values = shuffled.slice(0, Math.min(count, shuffled.length));
            generatedData = {
              type: 'sequence',
              values,
              count: values.length,
              seed: seedValue,
              timestamp: new Date()
            };
            break;

          case 'sampling':
            const population = Array.from({ length: populationSize }, (_, i) => i + 1);
            const sample = random.sample(population, sampleSize);
            values = sample;
            generatedData = {
              type: 'sampling',
              values,
              count: sampleSize,
              seed: seedValue,
              timestamp: new Date()
            };
            break;
        }

        setGeneratedNumbers(generatedData!);
        calculateStatistics(values);
        
        // Scroll to results
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (error) {
        console.error('Erreur lors de la génération:', error);
        setErrors({ general: 'Une erreur est survenue lors de la génération' });
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Calculate statistics
  const calculateStatistics = (values: (number | string)[]) => {
    // Filter numeric values for statistics
    const numericValues = values.filter(v => typeof v === 'number') as number[];
    
    if (numericValues.length === 0) {
      setStatistics(null);
      return;
    }

    const sorted = [...numericValues].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;
    
    // Variance and standard deviation
    const variance = sorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sorted.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];

    setStatistics({
      count: sorted.length,
      min: Math.min(...sorted),
      max: Math.max(...sorted),
      mean,
      median,
      standardDeviation,
      variance,
      sum
    });
  };

  // Copy results to clipboard
  const copyResults = async () => {
    if (!generatedNumbers) return;

    const text = `Générateur de Nombres Aléatoires\n` +
                 `==============================\n` +
                 `Type : ${getTypeLabel(generatedNumbers.type)}\n` +
                 `Date : ${generatedNumbers.timestamp.toLocaleString('fr-FR')}\n` +
                 `Nombre de valeurs : ${generatedNumbers.count}\n` +
                 `Seed : ${generatedNumbers.seed || 'Aléatoire'}\n\n` +
                 `Valeurs générées :\n` +
                 generatedNumbers.values.join(', ');

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  // Export to PDF
  const exportPDF = async () => {
    if (!generatedNumbers) {
      alert('Veuillez d\'abord générer des nombres');
      return;
    }

    setExportLoading(true);

    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      
      const primaryColor = [59, 130, 246];
      const secondaryColor = [99, 102, 241];
      
      // Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Générateur de Nombres Aléatoires', 105, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.text('StatTool - Résultats de Génération', 105, 30, { align: 'center' });
      
      // Information
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('Informations de Génération', 20, 55);
      
      (doc as any).autoTable({
        startY: 60,
        body: [
          ['Type de génération', getTypeLabel(generatedNumbers.type)],
          ['Date et heure', generatedNumbers.timestamp.toLocaleString('fr-FR')],
          ['Nombre de valeurs', generatedNumbers.count.toString()],
          ['Seed utilisée', generatedNumbers.seed?.toString() || 'Aléatoire'],
          ...(generatedNumbers.min !== undefined ? [['Valeur minimale', generatedNumbers.min.toString()]] : []),
          ...(generatedNumbers.max !== undefined ? [['Valeur maximale', generatedNumbers.max.toString()]] : []),
          ...(generatedNumbers.decimalPlaces !== undefined ? [['Décimales', generatedNumbers.decimalPlaces.toString()]] : [])
        ],
        theme: 'grid',
        margin: { left: 20, right: 20 },
        styles: {
          fontSize: 11,
          cellPadding: 6
        }
      });
      
      // Generated values
      const valuesY = (doc as any).autoTable.previous.finalY + 15;
      doc.setFontSize(14);
      doc.text('Valeurs Générées', 20, valuesY);
      
      // Format values for display
      const formattedValues = generatedNumbers.values.map(v => 
        typeof v === 'number' ? v.toLocaleString('fr-FR') : v
      );
      
      // Split values into chunks for better display
      const chunkSize = 8;
      const valueChunks = [];
      for (let i = 0; i < formattedValues.length; i += chunkSize) {
        valueChunks.push(formattedValues.slice(i, i + chunkSize));
      }
      
      let currentY = valuesY + 10;
      valueChunks.forEach((chunk, index) => {
        doc.setFontSize(10);
        doc.text(chunk.join(', '), 20, currentY);
        currentY += 8;
      });
      
      // Statistics if available
      if (statistics) {
        const statsY = currentY + 15;
        doc.setFontSize(14);
        doc.text('Statistiques', 20, statsY);
        
        (doc as any).autoTable({
          startY: statsY + 5,
          body: [
            ['Nombre de valeurs', statistics.count.toString()],
            ['Minimum', statistics.min.toFixed(2)],
            ['Maximum', statistics.max.toFixed(2)],
            ['Moyenne', statistics.mean.toFixed(2)],
            ['Médiane', statistics.median.toFixed(2)],
            ['Écart-type', statistics.standardDeviation.toFixed(2)],
            ['Variance', statistics.variance.toFixed(2)],
            ['Somme', statistics.sum.toFixed(2)]
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
      doc.text('StatTool - Générateur de Nombres Aléatoires', 105, pageHeight - 20, { align: 'center' });
      doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });
      
      doc.save(`nombres_aleatoires_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  // Clear form and results
  const clearForm = () => {
    setGeneratedNumbers(null);
    setStatistics(null);
    setErrors({});
    setSequenceItems('');
    setSeed('');
  };

  // Load example
  const loadExample = () => {
    setGenerationType('integers');
    setMinValue(1);
    setMaxValue(100);
    setCount(20);
    setSeed('12345');
  };

  // Get type label
  const getTypeLabel = (type: GenerationType): string => {
    switch (type) {
      case 'integers': return 'Nombres entiers';
      case 'decimals': return 'Nombres décimaux';
      case 'sequence': return 'Séquence aléatoire';
      case 'sampling': return 'Échantillonnage';
      default: return type;
    }
  };

  // Animation effect for results
  useEffect(() => {
    if (generatedNumbers && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [generatedNumbers]);

  return (
    <>
      <style jsx>{`
        #results-container {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #results-container.fade-in {
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Générateur de Nombres Aléatoires</span>
              </li>
            </ol>
          </nav>
          
          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Dice5 className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Générateur de Nombres Aléatoires
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Générez des nombres ou séquences aléatoires pour l'échantillonnage ou la randomisation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Configuration Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Configuration
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="generation-type" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Type de génération
                      </label>
                      <select
                        id="generation-type"
                        value={generationType}
                        onChange={(e) => setGenerationType(e.target.value as GenerationType)}
                        className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="integers">Nombres entiers</option>
                        <option value="decimals">Nombres décimaux</option>
                        <option value="sequence">Séquence aléatoire</option>
                        <option value="sampling">Échantillonnage</option>
                      </select>
                    </div>

                    {/* Integer options */}
                    {generationType === 'integers' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="min-value" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Valeur minimale
                            </label>
                            <input
                              type="number"
                              id="min-value"
                              value={minValue}
                              onChange={(e) => setMinValue(parseInt(e.target.value))}
                              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            {errors.minValue && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.minValue}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="max-value" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Valeur maximale
                            </label>
                            <input
                              type="number"
                              id="max-value"
                              value={maxValue}
                              onChange={(e) => setMaxValue(parseInt(e.target.value))}
                              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            {errors.maxValue && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.maxValue}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Decimal options */}
                    {generationType === 'decimals' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="min-decimal" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Valeur minimale
                            </label>
                            <input
                              type="number"
                              id="min-decimal"
                              value={minDecimal}
                              onChange={(e) => setMinDecimal(parseFloat(e.target.value))}
                              step="0.01"
                              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            {errors.minDecimal && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.minDecimal}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="max-decimal" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Valeur maximale
                            </label>
                            <input
                              type="number"
                              id="max-decimal"
                              value={maxDecimal}
                              onChange={(e) => setMaxDecimal(parseFloat(e.target.value))}
                              step="0.01"
                              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            {errors.maxDecimal && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.maxDecimal}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label htmlFor="decimal-places" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Nombre de décimales
                          </label>
                          <select
                            id="decimal-places"
                            value={decimalPlaces}
                            onChange={(e) => setDecimalPlaces(parseInt(e.target.value))}
                            className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                          </select>
                          {errors.decimalPlaces && (
                            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.decimalPlaces}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sequence options */}
                    {generationType === 'sequence' && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="sequence-items" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Éléments à mélanger (un par ligne)
                          </label>
                          <textarea
                            id="sequence-items"
                            value={sequenceItems}
                            onChange={(e) => setSequenceItems(e.target.value)}
                            className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            rows={6}
                            placeholder="Entrez les éléments à mélanger, un par ligne"
                          />
                          {errors.sequenceItems && (
                            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.sequenceItems}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sampling options */}
                    {generationType === 'sampling' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="population-size" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Taille de la population
                            </label>
                            <input
                              type="number"
                              id="population-size"
                              value={populationSize}
                              onChange={(e) => setPopulationSize(parseInt(e.target.value))}
                              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              min="1"
                            />
                            {errors.populationSize && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.populationSize}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="sample-size" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Taille de l'échantillon
                            </label>
                            <input
                              type="number"
                              id="sample-size"
                              value={sampleSize}
                              onChange={(e) => setSampleSize(parseInt(e.target.value))}
                              className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              min="1"
                            />
                            {errors.sampleSize && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.sampleSize}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="count" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Nombre de valeurs à générer
                      </label>
                      <input
                        type="number"
                        id="count"
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value))}
                        className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        min="1"
                        max="10000"
                      />
                      {errors.count && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.count}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="seed" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Graine (seed) - optionnel
                      </label>
                      <input
                        type="text"
                        id="seed"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        className="mt-1 w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Laissez vide pour une génération vraiment aléatoire"
                      />
                      {errors.seed && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.seed}</p>
                      )}
                    </div>

                    {errors.general && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-red-600 dark:text-red-400 text-sm">{errors.general}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={generateNumbers}
                        disabled={loading}
                        className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        {loading ? 'Génération en cours...' : 'Générer'}
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
                      <li>• Choisissez un type de génération (entiers, décimaux, séquence ou échantillonnage).</li>
                      <li>• Configurez les paramètres spécifiques (par exemple, min/max pour entiers, éléments pour séquence).</li>
                      <li>• Spécifiez le nombre de valeurs à générer (1 à 10 000).</li>
                      <li>• Utilisez une graine (optionnel) pour des résultats reproductibles.</li>
                      <li>• Cliquez sur Générer ou utilisez Exemple pour tester.</li>
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
                      <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
                      Résultats
                    </div>
                    {generatedNumbers && (
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
                  <div id="results-container" ref={resultsRef}>
                    {generatedNumbers ? (
                      <div className="space-y-6">
                        {/* Generation info */}
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                            Informations de génération
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Type :</span>
                              <span className="ml-2 font-medium text-blue-900 dark:text-blue-100">
                                {getTypeLabel(generatedNumbers.type)}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Nombre de valeurs :</span>
                              <span className="ml-2 font-medium text-blue-900 dark:text-blue-100">
                                {generatedNumbers.count}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Seed :</span>
                              <span className="ml-2 font-medium text-blue-900 dark:text-blue-100">
                                {generatedNumbers.seed || 'Aléatoire'}
                              </span>
                            </div>
                            {generatedNumbers.min !== undefined && (
                              <div>
                                <span className="text-blue-700 dark:text-blue-300">Min :</span>
                                <span className="ml-2 font-medium text-blue-900 dark:text-blue-100">
                                  {generatedNumbers.min}
                                </span>
                              </div>
                            )}
                            {generatedNumbers.max !== undefined && (
                              <div>
                                <span className="text-blue-700 dark:text-blue-300">Max :</span>
                                <span className="ml-2 font-medium text-blue-900 dark:text-blue-100">
                                  {generatedNumbers.max}
                                </span>
                              </div>
                            )}
                            {generatedNumbers.decimalPlaces !== undefined && (
                              <div>
                                <span className="text-blue-700 dark:text-blue-300">Décimales :</span>
                                <span className="ml-2 font-medium text-blue-900 dark:text-blue-100">
                                  {generatedNumbers.decimalPlaces}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-4">
                            Généré le {generatedNumbers.timestamp.toLocaleString('fr-FR')}
                          </p>
                        </div>

                        {/* Generated numbers */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Valeurs générées
                            <span className="text-blue-600 dark:text-blue-400 text-sm font-normal ml-2">
                              ({generatedNumbers.count} valeurs)
                            </span>
                          </h3>
                          <div className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4 relative">
                            <textarea
                              value={generatedNumbers.values.join(', ')}
                              readOnly
                              className="w-full h-64 bg-transparent text-gray-900 dark:text-gray-100 text-sm font-mono resize-none outline-none"
                            />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Les valeurs sont séparées par des virgules
                          </p>
                        </div>

                        {/* Statistics */}
                        {statistics && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                              <Calculator className="w-5 h-5 mr-2 text-green-600" />
                              Statistiques
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
                                <div className="text-sm text-green-700 dark:text-green-300">Moyenne</div>
                                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                                  {statistics.mean.toFixed(2)}
                                </div>
                              </div>
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                                <div className="text-sm text-blue-700 dark:text-blue-300">Min / Max</div>
                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                  {statistics.min.toFixed(2)} / {statistics.max.toFixed(2)}
                                </div>
                              </div>
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                                <div className="text-sm text-purple-700 dark:text-purple-300">Écart-type</div>
                                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                  {statistics.standardDeviation.toFixed(2)}
                                </div>
                              </div>
                              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
                                <div className="text-sm text-orange-700 dark:text-orange-300">Somme</div>
                                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                  {statistics.sum.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Médiane :</span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {statistics.median.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Variance :</span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {statistics.variance.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Étendue :</span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {(statistics.max - statistics.min).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Dice5 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          Aucun résultat à afficher. Veuillez configurer et générer des nombres aléatoires.
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                          Utilisez le bouton "Exemple" pour tester rapidement
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                      Choisissez entre 4 types de génération dans le menu déroulant
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>Entiers :</strong> Saisissez les valeurs minimale et maximale
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>Décimaux :</strong> Saisissez la plage et le nombre de décimales
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>Séquence :</strong> Entrez les éléments à mélanger (un par ligne)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <strong>Échantillonnage :</strong> Définissez la taille de population et d'échantillon
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-green-700 dark:text-green-400">
                    <FileText className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Applications pratiques
                  </h4>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 space-y-4">
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">Recherche clinique</h5>
                      <p className="text-sm">Randomisation des groupes de traitement et contrôle</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">Études statistiques</h5>
                      <p className="text-sm">Sélection aléatoire d'échantillons représentatifs</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">Jeux et tirages</h5>
                      <p className="text-sm">Génération de nombres pour jeux de hasard équitables</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-green-800 dark:text-green-300">Tests de logiciel</h5>
                      <p className="text-sm">Génération de données de test aléatoires</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-purple-700 dark:text-purple-400">
                    <AlertCircle className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Conseils avancés
                  </h4>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>Graine (seed) :</strong> Utilisez une graine pour reproduire exactement les mêmes résultats</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>Représentativité :</strong> Pour l'échantillonnage, assurez-vous que la taille est suffisante</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>Export :</strong> Utilisez le bouton PDF pour sauvegarder les résultats avec métadonnées</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span><strong>Statistiques :</strong> Les mesures statistiques sont calculées automatiquement pour les valeurs numériques</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-orange-700 dark:text-orange-400">
                    <Dice5 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Algorithme de génération
                  </h4>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Générateur congruentiel linéaire (LCG) :</strong> Algorithme simple mais efficace pour la génération pseudo-aléatoire</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Période :</strong> La période du générateur est de 2^32, suffisante pour la plupart des applications</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Distribution uniforme :</strong> Toutes les valeurs dans la plage ont la même probabilité d'être générées</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span><strong>Reproductibilité :</strong> Avec la même graine, la même séquence de nombres est générée</span>
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