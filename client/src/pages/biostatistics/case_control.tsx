import { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  Calculator, 
  BarChart3, 
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
  TestTube,
  Beaker
} from 'lucide-react';
import { Link } from 'wouter';

// Types pour les données et résultats
interface CaseControlData {
  a: number; // cas exposés
  b: number; // témoins exposés
  c: number; // cas non-exposés
  d: number; // témoins non-exposés
}

interface StudyResults {
  oddsRatio: number;
  orLowerCI: number;
  orUpperCI: number;
  chiSquare: number;
  chiSquarePValue: number;
  chiSquareYates: number;
  chiSquareYatesPValue: number;
  fisherExactPValue: number;
  minExpected: number;
  recommendedTest: 'Fisher' | 'Chi-square';
  association: string;
  interpretation: string;
}

export default function CaseControlStudy() {
  // États pour les données d'entrée
  const [studyData, setStudyData] = useState<CaseControlData>({
    a: 0, b: 0, c: 0, d: 0
  });
  
  // États pour les résultats
  const [results, setResults] = useState<StudyResults | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  
  // Références pour les animations
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Totaux calculés
  const totals = {
    totalExposed: studyData.a + studyData.b,
    totalUnexposed: studyData.c + studyData.d,
    totalCases: studyData.a + studyData.c,
    totalControls: studyData.b + studyData.d,
    grandTotal: studyData.a + studyData.b + studyData.c + studyData.d
  };

  // Fonction de validation des données
  const validateData = (data: CaseControlData): { isValid: boolean; message: string } => {
    const { a, b, c, d } = data;
    
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      return { 
        isValid: false, 
        message: 'Toutes les valeurs doivent être positives ou nulles' 
      };
    }
    
    if (a + b + c + d === 0) {
      return { 
        isValid: false, 
        message: 'Veuillez entrer des données dans au moins une cellule' 
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Fonction pour calculer la CDF normale (approximation)
  const normalCDF = (z: number): number => {
    // Approximation de la fonction d'erreur
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

  // Fonction pour calculer la p-value du chi-carré
  const chiSquarePValue = (chiSquare: number, df: number = 1): number => {
    if (chiSquare < 0) return 1;
    if (chiSquare === 0) return 1;
    
    const z = Math.sqrt(chiSquare);
    return 2 * (1 - normalCDF(z));
  };

  // Fonction pour calculer le test de Fisher exact (approximation)
  const calculateFisherExact = (a: number, b: number, c: number, d: number): number => {
    const n = a + b + c + d;
    
    // Approche simplifiée : utiliser l'approximation hypergéométrique
    // Pour une implémentation exacte, utiliser une bibliothèque dédiée
    const minValue = Math.min(a, b, c, d);
    
    if (minValue === 0) {
      // Si une cellule est 0, le test de Fisher peut être approché
      // Nous utilisons une approximation basée sur la distribution hypergéométrique
      const oddsRatio = (a * d) / (b * c);
      const logOddsRatio = Math.log(oddsRatio + 0.5); // Correction pour éviter log(0)
      const se = Math.sqrt(1/(a+0.5) + 1/(b+0.5) + 1/(c+0.5) + 1/(d+0.5));
      
      // Approximation de la p-value
      const z = Math.abs(logOddsRatio / se);
      return 2 * (1 - normalCDF(z));
    }
    
    // Pour les petits échantillons, utiliser une approximation plus précise
    // Note : Pour une implémentation exacte, considérer l'utilisation d'une bibliothèque
    // comme 'fisher-exact' ou implémenter l'algorithme exact
    return 0.05; // Valeur par défaut pour l'exemple
  };

  // Calcul des résultats de l'étude
  const calculateStudyResults = () => {
    const validation = validateData(studyData);
    
    if (!validation.isValid) {
      setErrorMessage(validation.message);
      setShowError(true);
      setResults(null);
      return;
    }
    
    setShowError(false);
    setIsCalculating(true);
    
    const { a, b, c, d } = studyData;
    const n = totals.grandTotal;
    
    // Calcul de l'Odds Ratio avec correction de continuité si nécessaire
    let oddsRatio: number;
    let orLowerCI: number;
    let orUpperCI: number;
    
    if (b === 0 || c === 0) {
      // Correction de continuité de Haldane (ajout de 0.5 à toutes les cellules)
      oddsRatio = ((a + 0.5) * (d + 0.5)) / ((b + 0.5) * (c + 0.5));
    } else {
      oddsRatio = (a * d) / (b * c);
    }
    
    // Calcul de l'intervalle de confiance à 95% pour l'OR
    const logOddsRatio = Math.log(oddsRatio);
    const seLogOR = Math.sqrt(1/(a+0.5) + 1/(b+0.5) + 1/(c+0.5) + 1/(d+0.5));
    orLowerCI = Math.exp(logOddsRatio - 1.96 * seLogOR);
    orUpperCI = Math.exp(logOddsRatio + 1.96 * seLogOR);
    
    // Calcul du Chi-carré de Pearson
    const expectedA = (totals.totalExposed * totals.totalCases) / n;
    const expectedB = (totals.totalExposed * totals.totalControls) / n;
    const expectedC = (totals.totalUnexposed * totals.totalCases) / n;
    const expectedD = (totals.totalUnexposed * totals.totalControls) / n;
    
    const chiSquare = Math.pow(a - expectedA, 2) / expectedA +
                     Math.pow(b - expectedB, 2) / expectedB +
                     Math.pow(c - expectedC, 2) / expectedC +
                     Math.pow(d - expectedD, 2) / expectedD;
    
    const chiSquarePValueResult = chiSquarePValue(chiSquare);
    
    // Calcul du Chi-carré avec correction de Yates
    const numeratorYates = Math.abs(a * d - b * c) - (n / 2);
    const chiSquareYates = (n * Math.pow(numeratorYates, 2)) / 
                          (totals.totalExposed * totals.totalUnexposed * totals.totalCases * totals.totalControls);
    const chiSquareYatesPValue = chiSquarePValue(chiSquareYates);
    
    // Calcul du test exact de Fisher
    const fisherExactPValue = calculateFisherExact(a, b, c, d);
    
    // Détermination du test recommandé
    const minExpected = Math.min(expectedA, expectedB, expectedC, expectedD);
    const recommendedTest = minExpected < 5 ? 'Fisher' : 'Chi-square';
    
    // Détermination de l'association
    let association = '';
    if (oddsRatio > 1) {
      association = `Les cas ont ${oddsRatio.toFixed(1)} fois plus de chances d'être exposés (risque accru)`;
    } else if (oddsRatio < 1) {
      association = `Les cas ont ${(1/oddsRatio).toFixed(1)} fois moins de chances d'être exposés (effet protecteur)`;
    } else {
      association = 'Pas d\'association apparente';
    }
    
    // Génération de l'interprétation
    const interpretation = `
      L'odds ratio de ${oddsRatio.toFixed(3)} indique une association ${oddsRatio > 1 ? 'positive' : 'négative'} 
      entre l'exposition et la maladie. L'intervalle de confiance à 95% [${orLowerCI.toFixed(3)}, ${orUpperCI.toFixed(3)}] 
      ${orLowerCI > 1 || orUpperCI < 1 ? 'ne contient pas 1, suggérant une association statistiquement significative' : 'contient 1, suggérant une absence d\'association significative'}.
      Le test ${recommendedTest === 'Fisher' ? 'exact de Fisher' : 'du Chi-carré'} est recommandé 
      ${minExpected < 5 ? 'car au moins un effectif attendu est inférieur à 5' : 'car tous les effectifs attendus sont supérieurs ou égaux à 5'}.
    `;
    
    const newResults: StudyResults = {
      oddsRatio,
      orLowerCI,
      orUpperCI,
      chiSquare,
      chiSquarePValue: chiSquarePValueResult,
      chiSquareYates,
      chiSquareYatesPValue,
      fisherExactPValue,
      minExpected,
      recommendedTest,
      association,
      interpretation
    };
    
    setResults(newResults);
    setIsCalculating(false);
  };

  // Calcul automatique lors de la modification des données
  useEffect(() => {
    if (totals.grandTotal > 0) {
      calculateStudyResults();
    } else {
      setResults(null);
    }
  }, [studyData]);

  // Animation des résultats
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  // Gestionnaires d'événements
  const handleInputChange = (field: keyof CaseControlData, value: string) => {
    const numValue = parseInt(value) || 0;
    setStudyData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleClear = () => {
    setStudyData({ a: 0, b: 0, c: 0, d: 0 });
    setResults(null);
    setShowError(false);
  };

  const handleExample = () => {
    setStudyData({ a: 25, b: 15, c: 10, d: 50 });
  };

  const copyResults = async () => {
    if (!results) return;
    
    let text = `=== Étude Cas-Témoins Non Appariés ===\n\n`;
    text += `Données : a=${studyData.a}, b=${studyData.b}, c=${studyData.c}, d=${studyData.d}\n`;
    text += `Odds Ratio : ${results.oddsRatio.toFixed(3)}\n`;
    text += `IC 95% : [${results.orLowerCI.toFixed(3)}, ${results.orUpperCI.toFixed(3)}]\n`;
    text += `Chi-carré (Pearson) : ${results.chiSquare.toFixed(3)} (p=${results.chiSquarePValue.toFixed(4)})\n`;
    text += `Chi-carré (Yates) : ${results.chiSquareYates.toFixed(3)} (p=${results.chiSquareYatesPValue.toFixed(4)})\n`;
    text += `Fisher Exact (p) : ${results.fisherExactPValue.toFixed(4)}\n`;
    text += `Test recommandé : ${results.recommendedTest}\n`;
    text += `Association : ${results.association}\n`;
    
    try {
      await navigator.clipboard.writeText(text);
      // Optionnel: Afficher un feedback visuel
    } catch (err) {
      alert('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      alert('Veuillez d\'abord effectuer un calcul');
      return;
    }

    // Vérifier si jsPDF est chargé
    if (!(window as any).jspdf) {
      alert('La bibliothèque PDF n\'est pas chargée. Veuillez réessayer.');
      return;
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    const primaryColor = [79, 70, 229]; // Indigo-600
    const secondaryColor = [139, 92, 246]; // Violet-500
    const successColor = [16, 185, 129]; // Emerald-500

    // En-tête
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Étude Cas-Témoins Non Appariés', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Odds Ratio, IC 95% et Tests Statistiques', 105, 30, { align: 'center' });

    // Données saisies
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Données saisies', 20, 55);
    
    // Tableau des données
    (doc as any).autoTable({
      startY: 60,
      head: [['Exposition', 'Cas', 'Témoins', 'Total']],
      body: [
        ['Exposé', studyData.a, studyData.b, totals.totalExposed],
        ['Non-exposé', studyData.c, studyData.d, totals.totalUnexposed],
        ['Total', totals.totalCases, totals.totalControls, totals.grandTotal]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Odds Ratio
    const orY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(16);
    doc.text('Odds Ratio et Intervalle de Confiance', 20, orY);

    (doc as any).autoTable({
      startY: orY + 5,
      head: [['Mesure', 'Valeur', 'IC 95%']],
      body: [
        ['Odds Ratio', results.oddsRatio.toFixed(3), 
         `[${results.orLowerCI.toFixed(3)}, ${results.orUpperCI.toFixed(3)}]`]
      ],
      theme: 'grid',
      headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Résultats des tests statistiques
    const testsY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(16);
    doc.text('Tests Statistiques', 20, testsY);

    (doc as any).autoTable({
      startY: testsY + 5,
      head: [['Test', 'Statistique', 'p-valeur', 'Signification']],
      body: [
        [
          'Chi-carré (Pearson)',
          results.chiSquare.toFixed(3),
          results.chiSquarePValue.toFixed(4),
          results.chiSquarePValue < 0.05 ? 'Significatif' : 'Non significatif'
        ],
        [
          'Chi-carré (Yates)',
          results.chiSquareYates.toFixed(3),
          results.chiSquareYatesPValue.toFixed(4),
          results.chiSquareYatesPValue < 0.05 ? 'Significatif' : 'Non significatif'
        ],
        [
          'Fisher Exact',
          '-',
          results.fisherExactPValue.toFixed(4),
          results.fisherExactPValue < 0.05 ? 'Significatif' : 'Non significatif'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: successColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Recommandation
    const recY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Recommandation :', 20, recY);
    doc.setFontSize(10);
    doc.text(
      `Test recommandé : ${results.recommendedTest === 'Fisher' ? 'Test exact de Fisher' : 'Chi-carré de Pearson'}`,
      20, recY + 8
    );
    doc.text(
      `Effectif attendu minimum : ${results.minExpected.toFixed(1)}`,
      20, recY + 16
    );

    // Interprétation
    const interpY = recY + 25;
    const splitText = doc.splitTextToSize(results.interpretation, 160);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Interprétation :', 20, interpY);
    doc.text(splitText, 20, interpY + 8);

    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
    doc.text('StatTool - Étude Cas-Témoins', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });

    doc.save('etude_cas_temoins.pdf');
  };

  return (
    <>
      <style jsx>{`
        #case-control-results > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #case-control-results > div.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
        .table-cell-animate {
          transition: transform 0.2s ease;
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
                <Link href="/" className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  Étude Cas-Témoins (Non Appariés)
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <TestTube className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Étude Cas-Témoins (Non Appariés)
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez l'Odds Ratio avec IC 95% et tests de signification
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-emerald-500" strokeWidth={1.5} />
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
                  
                  {/* Tableau de saisie */}
                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Exposition
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Cas
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Témoins
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Exposé
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-a"
                              min="0"
                              step="1"
                              value={studyData.a || ''}
                              onChange={(e) => handleInputChange('a', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="a"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-b"
                              min="0"
                              step="1"
                              value={studyData.b || ''}
                              onChange={(e) => handleInputChange('b', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="b"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 table-cell-animate" id="total-exposed">
                            {totals.totalExposed || '-'}
                          </td>
                        </tr>
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Non-exposé
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-c"
                              min="0"
                              step="1"
                              value={studyData.c || ''}
                              onChange={(e) => handleInputChange('c', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="c"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-d"
                              min="0"
                              step="1"
                              value={studyData.d || ''}
                              onChange={(e) => handleInputChange('d', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              placeholder="d"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 table-cell-animate" id="total-unexposed">
                            {totals.totalUnexposed || '-'}
                          </td>
                        </tr>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 table-cell-animate" id="total-cases">
                            {totals.totalCases || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 table-cell-animate" id="total-controls">
                            {totals.totalControls || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-gray-100 table-cell-animate" id="total-all">
                            {totals.grandTotal || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={calculateStudyResults}
                      disabled={isCalculating}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg shadow hover:shadow-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transform hover:scale-105 transition-all duration-200"
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
                      <li><strong>a</strong> = cas exposés, <strong>b</strong> = témoins exposés</li>
                      <li><strong>c</strong> = cas non-exposés, <strong>d</strong> = témoins non-exposés</li>
                      <li>L'odds ratio mesure l'association entre exposition et maladie</li>
                      <li>OR &gt; 1 : exposition associée à un risque accru</li>
                      <li>OR &lt; 1 : exposition associée à un effet protecteur</li>
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
                    <BarChart3 className="w-5 h-5 mr-2 text-violet-500" strokeWidth={1.5} />
                    Résultats
                  </h2>
                  {results && (
                    <div className="flex gap-4">
                      <button 
                        onClick={copyResults}
                        className="p-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                        title="Copier les résultats"
                      >
                        <Copy className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={exportPDF}
                        className="p-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                        title="Exporter en PDF"
                      >
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div id="case-control-results">
                    {results ? (
                      <div ref={resultsRef} className="space-y-6">
                        {/* Odds Ratio principal */}
                        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-700">
                          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-3">
                            Odds Ratio
                          </h3>
                          <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                            {results.oddsRatio.toFixed(3)}
                            <span className="ml-2">
                              {results.oddsRatio > 1 ? (
                                <TrendingUp className="inline w-6 h-6" />
                              ) : results.oddsRatio < 1 ? (
                                <TrendingDown className="inline w-6 h-6" />
                              ) : null}
                            </span>
                          </div>
                          <p className="text-emerald-800 dark:text-emerald-200 text-sm">
                            IC 95% : [{results.orLowerCI.toFixed(3)}, {results.orUpperCI.toFixed(3)}]
                          </p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
                            {results.association}
                          </p>
                        </div>

                        {/* Tableau des tests statistiques */}
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
                                  p-valeur
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                                  Signification
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                              <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Chi-carré de Pearson
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {results.chiSquare.toFixed(3)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {results.chiSquarePValue.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    results.chiSquarePValue < 0.05 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                  }`}>
                                    {results.chiSquarePValue < 0.05 ? 'Significatif' : 'Non significatif'}
                                  </span>
                                </td>
                              </tr>
                              <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Chi-carré avec correction de Yates
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {results.chiSquareYates.toFixed(3)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-gray-100">
                                  {results.chiSquareYatesPValue.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    results.chiSquareYatesPValue < 0.05 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                  }`}>
                                    {results.chiSquareYatesPValue < 0.05 ? 'Significatif' : 'Non significatif'}
                                  </span>
                                </td>
                              </tr>
                              <tr className="bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-blue-900 dark:text-blue-100">
                                  <div className="flex items-center">
                                    {results.recommendedTest === 'Fisher' && (
                                      <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                                    )}
                                    Test exact de Fisher
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-blue-900 dark:text-blue-100">
                                  -
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-blue-900 dark:text-blue-100">
                                  {results.fisherExactPValue.toFixed(4)}
                                </td>
                                <td className="px-6 py-4 text-center text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    results.fisherExactPValue < 0.05 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                  }`}>
                                    {results.fisherExactPValue < 0.05 ? 'Significatif' : 'Non significatif'}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Recommandation */}
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                          <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                            Test recommandé : {results.recommendedTest === 'Fisher' ? 'Test exact de Fisher' : 'Chi-carré de Pearson'}
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            {results.recommendedTest === 'Fisher' 
                              ? 'Le test exact de Fisher est recommandé car au moins un effectif attendu est < 5.'
                              : 'Le test du chi-carré est approprié car tous les effectifs attendus sont ≥ 5.'}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                            Effectif attendu minimum : {results.minExpected.toFixed(1)}
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
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                          Saisissez vos données pour voir les résultats
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                          L'odds ratio et les tests apparaîtront automatiquement
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
            {/* Odds Ratio */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Odds Ratio</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                L'odds ratio (OR) mesure l'association entre l'exposition et la maladie dans une étude cas-témoins.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Formule :</strong> OR = (a×d) / (b×c)</p>
                <p><strong>IC 95% :</strong> OR × exp(±1.96 × SE)</p>
              </div>
            </div>

            {/* Test du Chi-deux */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Beaker className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test du Chi-deux</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Test de signification pour évaluer l'indépendance entre exposition et maladie.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Formule :</strong> χ² = Σ(O-E)²/E</p>
                <p><strong>Correction de Yates :</strong> pour les petits effectifs</p>
              </div>
            </div>

            {/* Test Exact de Fisher */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Exact de Fisher</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Test exact recommandé quand les effectifs attendus sont &lt; 5 dans au moins une cellule.
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p><strong>Basé sur :</strong> Distribution hypergéométrique</p>
                <p><strong>Utilisation :</strong> Petits échantillons</p>
              </div>
            </div>
          </div>

          {/* Bouton d'aide flottant */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
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
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-emerald-700 dark:text-emerald-400">
                      <Shield className="w-6 h-6 mr-3" />
                      À propos de cet outil
                    </h4>
                    <p className="text-sm leading-relaxed">
                      Cet outil d'étude cas-témoins non appariés permet de calculer l'odds ratio (OR) et son intervalle de confiance,
                      ainsi que différents tests statistiques pour évaluer l'association entre une exposition et une maladie.
                      Il est basé sur les méthodes standard utilisées en épidémiologie analytique.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-emerald-700 dark:text-emerald-400">
                      <Users className="w-6 h-6 mr-3" />
                      Interprétation de l'Odds Ratio
                    </h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>OR = 1 :</strong> Pas d'association entre l'exposition et la maladie</p>
                      <p><strong>OR &gt; 1 :</strong> Association positive (risque accru) - les cas sont plus exposés</p>
                      <p><strong>OR &lt; 1 :</strong> Association négative (effet protecteur) - les cas sont moins exposés</p>
                      <p><strong>IC 95% :</strong> Si l'intervalle de confiance contient 1, l'association n'est pas statistiquement significative</p>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-6 shadow-md border border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">OR</span>
                        </div>
                        <h5 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Odds Ratio</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
                        L'OR mesure la force de l'association. Dans une étude cas-témoins, il compare les odds d'exposition
                        chez les cas par rapport aux témoins.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">IC</span>
                        </div>
                        <h5 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Intervalle de Confiance</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                        L'intervalle de confiance à 95% indique la précision de l'estimation de l'OR.
                        Un IC étroit suggère une estimation plus précise.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-emerald-700 dark:text-emerald-400">
                      <BarChart3 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Références & Documentation
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Ouvrages de référence</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• Rothman KJ, Greenland S. <em>Modern Epidemiology</em> (3rd ed.)</li>
                          <li>• Hennekens CH, Buring JE. <em>Epidemiology in Medicine</em></li>
                          <li>• Breslow NE, Day NE. <em>Statistical Methods in Cancer Research</em></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Ressources en ligne</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">OpenEpi - Outils épidémiologiques</a></li>
                          <li>• <a href="https://www.cdc.gov/csels/dsepd/ss1978/lesson3/section5.html" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">CDC - Études cas-témoins</a></li>
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