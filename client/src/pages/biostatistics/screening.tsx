import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  FileDown,
  HelpCircle,
  X,
} from 'lucide-react';

interface ScreeningResults {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  sensitivity: string;
  specificity: string;
  vpp: string;
  vpn: string;
  interpretation: string;
}

const ScreeningTest: React.FC = () => {
  const [tp, setTp] = useState<number>(0);
  const [fp, setFp] = useState<number>(0);
  const [fn, setFn] = useState<number>(0);
  const [tn, setTn] = useState<number>(0);
  const [prevalence, setPrevalence] = useState<string>('');
  const [results, setResults] = useState<ScreeningResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-calculate on any data change
  useEffect(() => {
    if (tp > 0 || fp > 0 || fn > 0 || tn > 0) {
      calculateResults();
    } else {
      setResults(null);
    }
  }, [tp, fp, fn, tn, prevalence]);

  // Trigger animation when results change
  useEffect(() => {
    if (results && resultsRef.current) {
      const children = resultsRef.current.querySelectorAll(':scope > div');
      children.forEach((child, index) => {
        (child as HTMLElement).classList.remove('fade-in');
        setTimeout(() => {
          (child as HTMLElement).classList.add('fade-in');
        }, index * 150);
      });
    }
  }, [results]);

  const calculateResults = () => {
    const diseased = tp + fn;
    const healthy = fp + tn;
    const total = diseased + healthy;

    if (total === 0) {
      setResults(null);
      return;
    }

    const sensitivity = diseased > 0 ? (tp / diseased) * 100 : 0;
    const specificity = healthy > 0 ? (tn / healthy) * 100 : 0;

    const samplePrev = total > 0 ? (diseased / total) * 100 : 0;

    let vpp = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
    let vpn = fn + tn > 0 ? (tn / (fn + tn)) * 100 : 0;

    const externalPrev = parseFloat(prevalence);
    let usedPrev = samplePrev;

    if (!isNaN(externalPrev) && externalPrev >= 0 && externalPrev <= 100) {
      const prev = externalPrev / 100;
      if (sensitivity > 0 && specificity < 100) {
        vpp =
          ((sensitivity / 100) * prev) /
          ((sensitivity / 100) * prev +
            (1 - specificity / 100) * (1 - prev)) *
          100;
      }
      if (specificity > 0 && sensitivity < 100) {
        vpn =
          ((specificity / 100) * (1 - prev)) /
          ((specificity / 100) * (1 - prev) +
            (1 - sensitivity / 100) * prev) *
          100;
      }
      usedPrev = externalPrev;
    }

    let interp = `Sensibilité : ${sensitivity.toFixed(1)}% → ${sensitivity >= 90 ? 'Excellent' : sensitivity >= 70 ? 'Bon' : 'À améliorer'} pour détecter les malades.\n`;
    interp += `Spécificité : ${specificity.toFixed(1)}% → ${specificity >= 90 ? 'Excellent' : specificity >= 70 ? 'Bon' : 'À améliorer'} pour exclure la maladie.\n`;
    interp += `VPP : ${vpp.toFixed(1)}% (prévalence utilisée : ${usedPrev.toFixed(2)}%) → Probabilité d'être malade si test positif.\n`;
    interp += `VPN : ${vpn.toFixed(1)}% → Probabilité d'être sain si test négatif.`;

    setResults({
      tp,
      fp,
      fn,
      tn,
      sensitivity: sensitivity.toFixed(2),
      specificity: specificity.toFixed(2),
      vpp: vpp.toFixed(2),
      vpn: vpn.toFixed(2),
      interpretation: interp,
    });
  };

  const clear = () => {
    setTp(0);
    setFp(0);
    setFn(0);
    setTn(0);
    setPrevalence('');
    setResults(null);
  };

  const loadExample = () => {
    setTp(80);
    setFp(20);
    setFn(10);
    setTn(90);
    setPrevalence('');
  };

  const copyResults = async () => {
    if (!results) return;
    try {
      const text = `Sensibilité: ${results.sensitivity}%\nSpécificité: ${results.specificity}%\nVPP: ${results.vpp}%\nVPN: ${results.vpn}%`;
      await navigator.clipboard.writeText(text);
      const copyBtn = document.getElementById('copy-btn-screening');
      if (copyBtn) {
        const original = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        setTimeout(() => {
          copyBtn.innerHTML = original;
        }, 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const exportPDF = async () => {
    if (!results) return;

    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      const primaryColor = [59, 130, 246];
      const secondaryColor = [99, 102, 241];

      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Analyse Test de Dépistage', 105, 22, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Sensibilité, Spécificité, VPP et VPN', 105, 30, {
        align: 'center',
      });

      // Contingency table
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Tableau de contingence', 20, 55);

      const diseased = results.tp + results.fn;
      const healthy = results.fp + results.tn;
      const total = diseased + healthy;

      const tableData: (string | number)[][] = [
        ['Maladie Présente', results.tp, results.fn, diseased],
        ['Maladie Absente', results.fp, results.tn, healthy],
        ['Total', results.tp + results.fp, results.fn + results.tn, total],
      ];

      (doc as any).autoTable({
        startY: 60,
        head: [['', 'Test Positif', 'Test Négatif', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: secondaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Results
      const resultsY = (doc as any).autoTable.previous.finalY + 20;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Résultats statistiques', 20, resultsY);

      const resultTable: (string | number)[][] = [
        ['Sensibilité', `${results.sensitivity} %`],
        ['Spécificité', `${results.specificity} %`],
        ['Valeur Prédictive Positive (VPP)', `${results.vpp} %`],
        ['Valeur Prédictive Négative (VPN)', `${results.vpn} %`],
      ];

      (doc as any).autoTable({
        startY: resultsY + 10,
        head: [['Indicateur', 'Valeur']],
        body: resultTable,
        theme: 'plain',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      doc.save('resultats_test_depistage_detaille.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <>
      <style>{`
        #results-container-screening > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #results-container-screening > div.fade-in {
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
                <a
                  href="/"
                  className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                >
                  Accueil
                </a>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  Test de Dépistage
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Test de Dépistage (Numération)
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calcul de la sensibilité, spécificité, valeurs prédictives
                positive et négative
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Tableau de contingence Test vs Maladie
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Saisissez les résultats de votre test de dépistage
                  </p>
                </div>
                <div className="p-6">
                  {/* Data Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-600 mb-6">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Maladie \ Test
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Test Positif
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Test Négatif
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Maladie Présente
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={tp}
                              onChange={(e) =>
                                setTp(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="TP"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={fn}
                              onChange={(e) =>
                                setFn(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="FN"
                            />
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            {tp + fn}
                          </td>
                        </tr>
                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            Maladie Absente
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={fp}
                              onChange={(e) =>
                                setFp(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="FP"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={tn}
                              onChange={(e) =>
                                setTn(parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1.5 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="TN"
                            />
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            {fp + tn}
                          </td>
                        </tr>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Total
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {tp + fp}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {fn + tn}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                            {tp + fp + fn + tn}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Prevalence Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prévalence de la maladie (optionnel)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={prevalence}
                      onChange={(e) => setPrevalence(e.target.value)}
                      placeholder="Prévalence dans la population (%)"
                      className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Si différente de l'échantillon, les VPP et VPN seront
                      ajustées
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={clear}
                      className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-105 transition-all duration-200"
                    >
                      <X className="w-4 h-4 mr-2" strokeWidth={1.5} />
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
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" strokeWidth={1.5} />
                    Résultats
                  </h2>
                  {results && (
                    <div className="flex gap-4">
                      <button
                        id="copy-btn-screening"
                        onClick={copyResults}
                        className="p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        aria-label="Copier les résultats"
                      >
                        <Copy className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={exportPDF}
                        className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        aria-label="Exporter en PDF"
                      >
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div id="results-container-screening">
                    {results ? (
                      <div ref={resultsRef} className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            Sensibilité
                          </span>
                          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                            {results.sensitivity}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
                          <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                            Spécificité
                          </span>
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            {results.specificity}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
                          <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                            Valeur Prédictive Positive (VPP)
                          </span>
                          <span className="text-sm font-bold text-green-700 dark:text-green-300">
                            {results.vpp}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-700">
                          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Valeur Prédictive Négative (VPN)
                          </span>
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                            {results.vpn}%
                          </span>
                        </div>

                        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-600/50 rounded-lg">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Interprétation
                          </h3>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
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
                          Les performances du test apparaîtront automatiquement
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Sensibilité
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Capacité du test à détecter la maladie quand elle est
                    présente.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Spécificité
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Capacité du test à exclure la maladie quand elle est
                    absente.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    VPP
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Probabilité d'être malade si le test est positif.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    VPN
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Probabilité d'être sain si le test est négatif.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Help Button */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          aria-label="Aide et ressources"
        >
          <HelpCircle className="w-7 h-7" strokeWidth={1.5} />
        </button>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 overflow-y-auto">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 my-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Aide &amp; Ressources
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-7 h-7" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-6 space-y-6 text-gray-700 dark:text-gray-300">
                <section>
                  <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                    <HelpCircle className="w-6 h-6 mr-3" strokeWidth={1.5} />
                    Comment utiliser cet outil
                  </h4>
                  <ul className="space-y-3 text-base bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      TP : Vrais positifs (test + et maladie +)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      FP : Faux positifs (test + mais maladie -)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      FN : Faux négatifs (test - mais maladie +)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      TN : Vrais négatifs (test - et maladie -)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les résultats se calculent automatiquement
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Import BarChart3 icon
import { BarChart3 } from 'lucide-react';

export default ScreeningTest;
