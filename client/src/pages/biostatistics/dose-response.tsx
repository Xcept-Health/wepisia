import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  FileDown,
  HelpCircle,
  X,
} from 'lucide-react';

interface DoseRow {
  id: string;
  exposure: string;
  cases: number;
  controls: number;
}

interface DoseResults {
  chiSquare: string;
  pValue: string;
  trend: string;
}

const DoseResponse: React.FC = () => {
  const [rows, setRows] = useState<DoseRow[]>([
    { id: '1', exposure: 'Niveau 0', cases: 0, controls: 0 },
  ]);
  const [results, setResults] = useState<DoseResults | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-calculate on any data change
  useEffect(() => {
    const hasData = rows.some((r) => r.cases > 0 || r.controls > 0);
    if (hasData) {
      calculateDoseResponse();
    } else {
      setResults(null);
    }
  }, [rows]);

  // Trigger animation when results change
  useEffect(() => {
    if (results && resultsRef.current) {
      const child = resultsRef.current.querySelector(':scope > div');
      if (child) {
        (child as HTMLElement).classList.remove('fade-in');
        void (child as HTMLElement).offsetWidth;
        (child as HTMLElement).classList.add('fade-in');
      }
    }
  }, [results]);

  const calculateDoseResponse = () => {
    const validRows = rows.filter((r) => r.cases > 0 || r.controls > 0);
    if (validRows.length < 2) {
      setResults(null);
      return;
    }

    // Calculate linear trend test
    let sumCases = 0;
    let sumControls = 0;
    let sumScore = 0;
    let sumScoreCases = 0;
    let sumScoreSquared = 0;

    validRows.forEach((row, index) => {
      const score = index;
      const total = row.cases + row.controls;

      sumCases += row.cases;
      sumControls += row.controls;
      sumScore += score * total;
      sumScoreCases += score * row.cases;
      sumScoreSquared += score * score * total;
    });

    const totalN = sumCases + sumControls;
    const expectedScoreCases =
      (sumCases / totalN) * sumScore;
    const variance =
      (sumCases * sumControls * (sumScoreSquared - (sumScore * sumScore) / totalN)) /
      (totalN * totalN * (totalN - 1));

    const chiSquare =
      variance > 0
        ? Math.pow(sumScoreCases - expectedScoreCases, 2) / variance
        : 0;

    const pValue = calculatePValue(chiSquare, 1);
    const trend =
      pValue < 0.05
        ? 'Tendance significative'
        : 'Aucune tendance significative';

    setResults({
      chiSquare: chiSquare.toFixed(3),
      pValue: pValue.toFixed(4),
      trend,
    });
  };

  const calculatePValue = (chiSquare: number, df: number): number => {
    if (typeof (window as any).jStat !== 'undefined') {
      return 1 - (window as any).jStat.chisquare.cdf(chiSquare, df);
    }
    return Math.exp(-chiSquare / 2);
  };

  const addRow = () => {
    const newId = (Math.max(...rows.map((r) => parseInt(r.id))) + 1).toString();
    setRows([
      ...rows,
      {
        id: newId,
        exposure: `Niveau ${rows.length}`,
        cases: 0,
        controls: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (
    id: string,
    field: keyof DoseRow,
    value: string | number
  ) => {
    setRows(
      rows.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      )
    );
  };

  const clear = () => {
    setRows([{ id: '1', exposure: 'Niveau 0', cases: 0, controls: 0 }]);
    setResults(null);
  };

  const loadExample = () => {
    setRows([
      { id: '1', exposure: 'Niveau 0', cases: 5, controls: 95 },
      { id: '2', exposure: 'Niveau 1', cases: 15, controls: 85 },
      { id: '3', exposure: 'Niveau 2', cases: 30, controls: 70 },
      { id: '4', exposure: 'Niveau 3', cases: 50, controls: 50 },
    ]);
  };

  const copyResults = async () => {
    if (!results || !resultsRef.current) return;
    try {
      const text = resultsRef.current.innerText;
      await navigator.clipboard.writeText(text);
      const copyBtn = document.getElementById('copy-btn-dose');
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
      doc.text('Analyse de la Réponse à la Dose', 105, 22, {
        align: 'center',
      });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Test de tendance linéaire', 105, 30, { align: 'center' });

      // Data table
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Données d\'exposition', 20, 55);

      const tableData: (string | number)[][] = rows.map((r) => [
        r.exposure,
        r.cases,
        r.controls,
        r.cases + r.controls,
      ]);

      (doc as any).autoTable({
        startY: 60,
        head: [['Niveau d\'Exposition', 'Cas', 'Témoins', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: secondaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 11, cellPadding: 5 },
      });

      // Results
      const resultsY = (doc as any).autoTable.previous.finalY + 20;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Résultats du test de tendance', 20, resultsY);

      const resultTable: (string | number)[][] = [
        ['Chi-carré de tendance', results.chiSquare],
        ['Valeur p', results.pValue],
        ['Interprétation', results.trend],
      ];

      (doc as any).autoTable({
        startY: resultsY + 10,
        head: [['Paramètre', 'Valeur']],
        body: resultTable,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      doc.save('resultats_dose_response.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <>
      <style>{`
        #results-container-dose > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #results-container-dose > div.fade-in {
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
                  Réponse à la Dose
                </span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analyse de la Réponse à la Dose
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Test de tendance linéaire pour différents niveaux d'exposition
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-500" strokeWidth={1.5} />
                    Saisie des Données
                  </h2>
                </div>
                <div className="p-6">
                  {/* Data Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-600 mb-6">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Niveau d'Exposition
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Cas
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Témoins
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Total
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={row.exposure}
                                onChange={(e) =>
                                  updateRow(row.id, 'exposure', e.target.value)
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={row.cases}
                                onChange={(e) =>
                                  updateRow(
                                    row.id,
                                    'cases',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-16 px-2 py-1 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={row.controls}
                                onChange={(e) =>
                                  updateRow(
                                    row.id,
                                    'controls',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-16 px-2 py-1 text-center text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                              {row.cases + row.controls}
                            </td>
                            <td className="px-4 py-3 text-center">
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

                  {/* Add Row Button */}
                  <button
                    onClick={addRow}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-105 transition-all duration-200 mb-6"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Ajouter un Niveau d'Exposition
                  </button>

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
                        id="copy-btn-dose"
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
                  <div id="results-container-dose">
                    {results ? (
                      <div ref={resultsRef} className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                            Test de Tendance Linéaire
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-blue-200 dark:border-blue-700">
                              <dt className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Chi-carré de tendance
                              </dt>
                              <dd className="font-bold text-blue-700 dark:text-blue-300">
                                {results.chiSquare}
                              </dd>
                            </div>
                            <div className="flex justify-between py-2 border-b border-blue-200 dark:border-blue-700">
                              <dt className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Valeur p
                              </dt>
                              <dd className="font-bold text-blue-700 dark:text-blue-300">
                                {results.pValue}
                              </dd>
                            </div>
                            <div className="flex justify-between py-2">
                              <dt className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Interprétation
                              </dt>
                              <dd className="font-bold text-blue-700 dark:text-blue-300">
                                {results.trend}
                              </dd>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
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
                      Entrez les niveaux d'exposition (ex: Faible, Moyen, Élevé)
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Saisissez le nombre de cas et témoins pour chaque niveau
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Utilisez le bouton + pour ajouter d'autres niveaux
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      Les résultats se calculent automatiquement
                    </li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">
                    Interprétation
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Le test de tendance linéaire évalue s'il existe une relation
                    linéaire entre le niveau d'exposition et le risque de maladie.
                    Une p-value &lt; 0.05 indique une tendance significative.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Import BarChart3 icon (if not already imported)
import { BarChart3 } from 'lucide-react';

export default DoseResponse;
