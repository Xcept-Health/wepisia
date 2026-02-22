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
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Users
} from 'lucide-react';
import { Link } from 'wouter';

// Types pour les données et résultats
interface ClinicalTrialData {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface TrialResults {
  riskTreatment: number;
  riskControl: number;
  overallRisk: number;
  relativeRisk: number;
  arr: number;
  nnt: number | string;
  chiSquare: number;
  pValue: number;
  chiSquareValidity: string;
  expectedA: number;
  expectedB: number;
  expectedC: number;
  expectedD: number;
}

interface MethodResult {
  method: string;
  rate: string;
  lower: string;
  upper: string;
}

export default function ClinicalTrial() {
  // États pour les données d'entrée
  const [trialData, setTrialData] = useState<ClinicalTrialData>({
    a: 0, b: 0, c: 0, d: 0
  });
  
  // États pour les résultats
  const [results, setResults] = useState<TrialResults | null>(null);
  const [interpretationText, setInterpretationText] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  
  // Références pour les animations
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Totaux calculés
  const totals = {
    treatmentTotal: trialData.a + trialData.b,
    controlTotal: trialData.c + trialData.d,
    eventTotal: trialData.a + trialData.c,
    noEventTotal: trialData.b + trialData.d,
    grandTotal: trialData.a + trialData.b + trialData.c + trialData.d
  };

  // Fonction de validation des données
  const validateData = (data: ClinicalTrialData): { isValid: boolean; message: string } => {
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

  // Calcul des résultats de l'essai clinique
  const calculateTrialResults = () => {
    const validation = validateData(trialData);
    
    if (!validation.isValid) {
      setErrorMessage(validation.message);
      setShowError(true);
      setResults(null);
      return;
    }
    
    setShowError(false);
    
    const { a, b, c, d } = trialData;
    const total = totals.grandTotal;
    
    // Calcul du Chi-carré
    const expectedA = ((a + b) * (a + c)) / total;
    const expectedB = ((a + b) * (b + d)) / total;
    const expectedC = ((c + d) * (a + c)) / total;
    const expectedD = ((c + d) * (b + d)) / total;
    
    const chiSquare = ((a - expectedA) ** 2 / expectedA) +
                     ((b - expectedB) ** 2 / expectedB) +
                     ((c - expectedC) ** 2 / expectedC) +
                     ((d - expectedD) ** 2 / expectedD);
    
    // Calcul du p-value (approximation)
    const pValue = Math.exp(-chiSquare / 2);
    
    // Validation Chi-carré
    const allExpectedValid = [expectedA, expectedB, expectedC, expectedD]
      .every(val => val >= 5);
    const chiSquareValidity = allExpectedValid 
      ? "" 
      : "Avertissement : Certaines valeurs attendues sont < 5. Le test du Chi-carré peut ne pas être valide.";
    
    // Calcul des risques
    const riskTreatment = a / (a + b) * 100;
    const riskControl = c / (c + d) * 100;
    const overallRisk = (a + c) / total * 100;
    
    // Calcul RR
    const relativeRisk = riskControl > 0 ? riskTreatment / riskControl : 0;
    
    // Calcul ARR
    const arr = riskControl - riskTreatment;
    
    // Calcul NNT
    const nnt = arr > 0 ? (1 / (arr / 100)) : '∞';
    
    const newResults: TrialResults = {
      riskTreatment,
      riskControl,
      overallRisk,
      relativeRisk,
      arr,
      nnt,
      chiSquare,
      pValue,
      chiSquareValidity,
      expectedA,
      expectedB,
      expectedC,
      expectedD
    };
    
    setResults(newResults);
    
    // Génération du texte d'interprétation
    setInterpretationText(
      `Le risque relatif (RR = ${relativeRisk.toFixed(2)}) indique que le traitement ${relativeRisk < 1 ? 'réduit' : 'augmente'} le risque de l'événement de ${Math.abs((1 - relativeRisk) * 100).toFixed(2)}% par rapport au contrôle. ` +
      `La réduction absolue du risque (ARR = ${arr.toFixed(2)}%) suggère une ${arr > 0 ? 'réduction' : 'augmentation'} du taux d'événements. ` +
      `Le nombre de sujets à traiter (NNT = ${typeof nnt === 'string' ? nnt : nnt.toFixed(2)}) indique le nombre de patients à traiter pour prévenir un événement. ` +
      `${chiSquareValidity ? ` ${chiSquareValidity}` : ''}`
    );
  };

  // Calcul automatique lors de la modification des données
  useEffect(() => {
    if (totals.grandTotal > 0) {
      calculateTrialResults();
    } else {
      setResults(null);
    }
  }, [trialData]);

  // Animation des résultats
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  // Gestionnaires d'événements
  const handleInputChange = (field: keyof ClinicalTrialData, value: string) => {
    const numValue = parseInt(value) || 0;
    setTrialData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleClear = () => {
    setTrialData({ a: 0, b: 0, c: 0, d: 0 });
    setResults(null);
    setShowError(false);
  };

  const handleExample = () => {
    setTrialData({ a: 20, b: 80, c: 35, d: 65 });
  };

  const copyResults = async () => {
    if (!results) return;
    
    let text = `=== Analyse d'Essai Clinique 2×2 ===\n\n`;
    text += `Données : a=${trialData.a}, b=${trialData.b}, c=${trialData.c}, d=${trialData.d}\n`;
    text += `Risque Traitement : ${results.riskTreatment.toFixed(2)}%\n`;
    text += `Risque Contrôle : ${results.riskControl.toFixed(2)}%\n`;
    text += `Risque Global : ${results.overallRisk.toFixed(2)}%\n`;
    text += `Risque Relatif (RR) : ${results.relativeRisk.toFixed(2)}\n`;
    text += `Réduction Absolue du Risque (ARR) : ${results.arr.toFixed(2)}%\n`;
    text += `Nombre de Sujets à Traiter (NNT) : ${typeof results.nnt === 'string' ? results.nnt : results.nnt.toFixed(2)}\n`;
    text += `Chi-carré : ${results.chiSquare.toFixed(2)} (p-value: ${results.pValue.toFixed(4)})\n`;
    
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

    // En-tête
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Analyse d\'Essai Clinique 2×2', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Risque Relatif, ARR, NNT et Chi-carré', 105, 30, { align: 'center' });

    // Données saisies
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Données saisies', 20, 55);
    
    // Tableau des données
    (doc as any).autoTable({
      startY: 60,
      head: [['Groupe', 'Événement', 'Non-Événement', 'Total']],
      body: [
        ['Traitement', trialData.a, trialData.b, totals.treatmentTotal],
        ['Contrôle', trialData.c, trialData.d, totals.controlTotal],
        ['Total', totals.eventTotal, totals.noEventTotal, totals.grandTotal]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Métriques statistiques
    const metricsY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(16);
    doc.text('Métriques Statistiques', 20, metricsY);

    (doc as any).autoTable({
      startY: metricsY + 5,
      head: [['Test', 'Valeur', 'p-value (2 queues)']],
      body: [
        ['Chi-carré', results.chiSquare.toFixed(2), results.pValue.toFixed(4)]
      ],
      theme: 'grid',
      headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    if (results.chiSquareValidity) {
      doc.setFontSize(8);
      doc.setTextColor(255, 0, 0);
      doc.text(results.chiSquareValidity, 20, (doc as any).autoTable.previous.finalY + 5);
    }

    // Métriques d'essai clinique
    const clinicalY = (doc as any).autoTable.previous.finalY + 10;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Métriques d\'Essai Clinique', 20, clinicalY);

    (doc as any).autoTable({
      startY: clinicalY + 5,
      head: [['Métrique', 'Valeur', 'Confidence Limits (95%)']],
      body: [
        ['Risque Traitement', `${results.riskTreatment.toFixed(2)}%`, '-'],
        ['Risque Contrôle', `${results.riskControl.toFixed(2)}%`, '-'],
        ['Risque Global', `${results.overallRisk.toFixed(2)}%`, '-'],
        ['Risque Relatif (RR)', results.relativeRisk.toFixed(2), '-'],
        ['ARR', `${results.arr.toFixed(2)}%`, '-'],
        ['NNT', typeof results.nnt === 'string' ? results.nnt : results.nnt.toFixed(2), '-']
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' }, // Blue-500
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    // Interprétation
    const interpY = (doc as any).autoTable.previous.finalY + 10;
    const splitText = doc.splitTextToSize(interpretationText, 160);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Interprétation', 20, interpY);
    doc.text(splitText, 20, interpY + 8);

    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
    doc.text('StatTool - Analyse d\'Essai Clinique', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });

    doc.save('analyse_essai_clinique.pdf');
  };

  // Formatage des nombres
  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  return (
    <>
      <style jsx>{`
        #clinical-trial-results > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #clinical-trial-results > div.fade-in {
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
                <Link href="/" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  Analyse d'Essai Clinique 2×2
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-check text-white">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="m9 14 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analyse d'Essai Clinique 2×2
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez le Risque Relatif, la Réduction Absolue du Risque, NNT et le Chi-carré
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
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
                            Groupe
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Événement
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Non-Événement
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Traitement
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-a"
                              min="0"
                              step="1"
                              value={trialData.a || ''}
                              onChange={(e) => handleInputChange('a', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              placeholder="a"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-b"
                              min="0"
                              step="1"
                              value={trialData.b || ''}
                              onChange={(e) => handleInputChange('b', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              placeholder="b"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 table-cell-animate" id="total-treatment">
                            {totals.treatmentTotal || '-'}
                          </td>
                        </tr>
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Contrôle
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-c"
                              min="0"
                              step="1"
                              value={trialData.c || ''}
                              onChange={(e) => handleInputChange('c', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              placeholder="c"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              id="cell-d"
                              min="0"
                              step="1"
                              value={trialData.d || ''}
                              onChange={(e) => handleInputChange('d', e.target.value)}
                              className="w-20 px-3 py-2 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                              placeholder="d"
                            />
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 table-cell-animate" id="total-control">
                            {totals.controlTotal || '-'}
                          </td>
                        </tr>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 table-cell-animate" id="total-event">
                            {totals.eventTotal || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 table-cell-animate" id="total-no-event">
                            {totals.noEventTotal || '-'}
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
                      onClick={calculateTrialResults}
                      className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 transform hover:scale-105 transition-all duration-200"
                    >
                      <Calculator className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Calculer
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
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg shadow hover:shadow-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transform hover:scale-105 transition-all duration-200"
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
                      <li>Entrez les effectifs dans chaque cellule du tableau</li>
                      <li><strong>a</strong> = événements dans le groupe traitement</li>
                      <li><strong>b</strong> = non-événements dans le groupe traitement</li>
                      <li><strong>c</strong> = événements dans le groupe contrôle</li>
                      <li><strong>d</strong> = non-événements dans le groupe contrôle</li>
                      <li>Les calculs se mettent à jour automatiquement</li>
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
                        className="p-2 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Copier les résultats"
                      >
                        <Copy className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={exportPDF}
                        className="p-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        title="Exporter en PDF"
                      >
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div id="clinical-trial-results">
                    {results ? (
                      <div ref={resultsRef} className="space-y-6">
                        {/* Mesures statistiques */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Mesures Statistiques
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 dark:border-slate-600 rounded-lg">
                              <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Test</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Valeur</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">p-value (2 queues)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Chi-carré</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{formatNumber(results.chiSquare)}</td>
                                  <td className="px-4 py-3 text-center text-sm">{results.pValue < 0.0001 ? '<0.0001' : formatNumber(results.pValue, 4)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          {results.chiSquareValidity && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              {results.chiSquareValidity}
                            </p>
                          )}
                        </div>

                        {/* Métriques d'essai clinique */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                            Métriques d'Essai Clinique
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 dark:border-slate-600 rounded-lg">
                              <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Métrique</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Valeur</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Limites de Confiance (95%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Risque Traitement</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{formatNumber(results.riskTreatment)}%</td>
                                  <td className="px-4 py-3 text-center text-sm">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Risque Contrôle</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{formatNumber(results.riskControl)}%</td>
                                  <td className="px-4 py-3 text-center text-sm">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Risque Global</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{formatNumber(results.overallRisk)}%</td>
                                  <td className="px-4 py-3 text-center text-sm">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Risque Relatif (RR)</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">
                                    <span className={`inline-flex items-center ${results.relativeRisk < 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                      {formatNumber(results.relativeRisk)}
                                      {results.relativeRisk < 1 ? (
                                        <TrendingDown className="w-4 h-4 ml-1" />
                                      ) : (
                                        <TrendingUp className="w-4 h-4 ml-1" />
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Réduction Absolue du Risque (ARR)</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">
                                    <span className={results.arr > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                      {formatNumber(results.arr)}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Nombre de Sujets à Traiter (NNT)</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {typeof results.nnt === 'string' ? results.nnt : formatNumber(results.nnt)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm">-</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Résumé */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Interprétation
                          </h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {interpretationText}
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
                          Les calculs apparaîtront automatiquement
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section d'information */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">RR</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Risque Relatif
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Compare le risque d'un événement dans le groupe traitement au groupe contrôle. 
                RR = [a/(a+b)] / [c/(c+d)]. RR {'>'} 1 indique un risque accru, RR {'<'} 1 suggère un effet protecteur.
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">ARR</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Réduction Absolue du Risque
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Mesure la différence absolue des taux d'événements entre les groupes traitement et contrôle. 
                ARR = [c/(c+d)] - [a/(a+b)]. Une ARR positive indique une réduction du risque.
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">NNT</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Nombre de Sujets à Traiter
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Indique le nombre de patients à traiter pour prévenir un événement supplémentaire. 
                NNT = 1 / ARR. Des valeurs de NNT plus basses suggèrent un traitement plus efficace.
              </p>
            </div>
          </div>

          {/* Bouton d'aide flottant */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
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
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-indigo-700 dark:text-indigo-400">
                      <Shield className="w-6 h-6 mr-3" />
                      À propos de cet outil
                    </h4>
                    <p className="text-sm leading-relaxed">
                      Cet outil d'analyse d'essai clinique 2×2 permet de calculer les mesures épidémiologiques essentielles 
                      pour évaluer l'efficacité d'un traitement. Il est basé sur les méthodes standard utilisées dans 
                      les études cliniques et épidémiologiques.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-indigo-700 dark:text-indigo-400">
                      <Users className="w-6 h-6 mr-3" />
                      Calculs disponibles
                    </h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>Risque Relatif (RR)</strong> : Mesure de l'effet relatif du traitement.</p>
                      <p><strong>Réduction Absolue du Risque (ARR)</strong> : Différence absolue des taux d'événements.</p>
                      <p><strong>Nombre de Sujets à Traiter (NNT)</strong> : Nombre de patients à traiter pour prévenir un événement.</p>
                      <p><strong>Test du Chi-carré</strong> : Test statistique pour l'indépendance entre traitement et événement.</p>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-6 shadow-md border border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">RR</span>
                        </div>
                        <h5 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">Risque Relatif</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-indigo-800 dark:text-indigo-200">
                        Le RR compare la probabilité d'un événement dans le groupe traitement par rapport au groupe contrôle.
                        Un RR {'<'} 1 indique que le traitement réduit le risque.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 rounded-xl p-6 shadow-md border border-pink-200 dark:border-pink-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">NNT</span>
                        </div>
                        <h5 className="text-lg font-semibold text-pink-900 dark:text-pink-100">Nombre de Sujets à Traiter</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-pink-800 dark:text-pink-200">
                        Le NNT est un indicateur cliniquement significatif qui aide à comprendre l'impact pratique d'un traitement.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-indigo-700 dark:text-indigo-400">
                      <Presentation className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Références & Documentation
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Ouvrages de référence</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• Rothman KJ, Greenland S. <em>Modern Epidemiology</em> (3rd ed.)</li>
                          <li>• Altman DG. <em>Practical Statistics for Medical Research</em></li>
                          <li>• Kirkwood BR, Sterne JAC. <em>Essential Medical Statistics</em></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Ressources en ligne</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">OpenEpi - Outils épidémiologiques</a></li>
                          <li>• <a href="https://www.cdc.gov/csels/dsepd/ss1978/lesson3/section5.html" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">CDC - Mesures d'association</a></li>
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