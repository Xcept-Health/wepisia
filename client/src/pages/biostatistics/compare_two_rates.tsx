import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Calculator, BarChart3, Copy, FileDown, HelpCircle, X, Trash2 } from 'lucide-react';
import { Link } from 'wouter';

export default function TwoRatesComparison() {
  const [events1, setEvents1] = useState<string>('');
  const [personTime1, setPersonTime1] = useState<string>('');
  const [events2, setEvents2] = useState<string>('');
  const [personTime2, setPersonTime2] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [results, setResults] = useState<any>(null);
  const [interpretationText, setInterpretationText] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load external scripts
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const jstatScript = document.createElement('script');
        jstatScript.src = 'https://cdn.jsdelivr.net/npm/jstat@1.9.4/dist/jstat.min.js';
        document.body.appendChild(jstatScript);
      }
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

  // Calculate two rates
  const calculateTwoRates = () => {
    const e1 = parseFloat(events1) || 0;
    const pt1 = parseFloat(personTime1) || 0;
    const e2 = parseFloat(events2) || 0;
    const pt2 = parseFloat(personTime2) || 0;
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;
    const z = (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1);

    setShowError(false);

    if (pt1 <= 0 || pt2 <= 0) {
      setErrorMessage('Le temps-personne doit être positif.');
      setShowError(true);
      setResults(null);
      return;
    }

    const rate1 = (e1 / pt1) * 1000;
    const rate2 = (e2 / pt2) * 1000;

    // Ratio de taux avec correction de continuité
    let rr = rate1 / rate2;
    let logRR = Math.log(rr);
    let seLogRR = Math.sqrt(1 / Math.max(e1, 0.5) + 1 / Math.max(e2, 0.5));
    if (e1 === 0 || e2 === 0) {
      const corr = 0.5;
      rr = ((e1 + corr) / pt1) / ((e2 + corr) / pt2) * 1000;
      logRR = Math.log(rr);
      seLogRR = Math.sqrt(1 / (e1 + corr) + 1 / (e2 + corr));
    }
    const lowerRR = Math.exp(logRR - z * seLogRR);
    const upperRR = Math.exp(logRR + z * seLogRR);

    // Différence de taux
    const diff = rate1 - rate2;
    const seDiff = Math.sqrt(e1 / Math.pow(pt1, 2) + e2 / Math.pow(pt2, 2)) * 1000;
    const lowerDiff = diff - z * seDiff;
    const upperDiff = diff + z * seDiff;

    setResults({ rate1, rate2, rr, lowerRR, upperRR, diff, lowerDiff, upperDiff, conf });

    let interp = '';
    if (lowerRR > 1) interp += `Le groupe 1 a un taux significativement plus élevé (RR = ${rr.toFixed(3)}, IC ${conf}% : [${lowerRR.toFixed(3)} – ${upperRR.toFixed(3)}]). `;
    else if (upperRR < 1) interp += `Le groupe 1 a un taux significativement plus faible (RR = ${rr.toFixed(3)}, IC ${conf}% : [${lowerRR.toFixed(3)} – ${upperRR.toFixed(3)}]). `;
    else interp += `Pas de différence significative pour le ratio de taux (IC inclut 1). `;

    if (lowerDiff > 0) interp += `Différence significative positive (${diff.toFixed(3)}).`;
    else if (upperDiff < 0) interp += `Différence significative négative (${diff.toFixed(3)}).`;
    else interp += `Pas de différence significative pour la différence de taux (IC inclut 0).`;

    setInterpretationText(interp);
  };

  // Auto calculate on valid changes
  useEffect(() => {
    if (events1 && personTime1 && events2 && personTime2) {
      calculateTwoRates();
    }
  }, [events1, personTime1, events2, personTime2, confidenceLevel]);

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clear = () => {
    setEvents1('');
    setPersonTime1('');
    setEvents2('');
    setPersonTime2('');
    setConfidenceLevel('95');
    setResults(null);
    setShowError(false);
  };

  const loadExample = () => {
    setEvents1('50');
    setPersonTime1('1000');
    setEvents2('30');
    setPersonTime2('1200');
    calculateTwoRates();
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Taux 1 : ${results.rate1.toFixed(3)}\nTaux 2 : ${results.rate2.toFixed(3)}\nRatio de Taux : ${results.rr.toFixed(3)} [${results.lowerRR.toFixed(3)} – ${results.upperRR.toFixed(3)}]\nDifférence : ${results.diff.toFixed(3)} [${results.lowerDiff.toFixed(3)} – ${results.upperDiff.toFixed(3)}]`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      alert('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      alert('Veuillez d\'abord effectuer un calcul');
      return;
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    const primaryColor = [59, 130, 246];
    const secondaryColor = [99, 102, 241];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Comparaison de Deux Taux', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Ratio et Différence avec IC', 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Données saisies', 20, 55);
    doc.setFontSize(12);
    doc.text(`Taux 1 : ${results.rate1.toFixed(3)} par 1000`, 20, 65);
    doc.text(`Taux 2 : ${results.rate2.toFixed(3)} par 1000`, 20, 73);

    const tableData = [
      ['Taux 1', results.rate1.toFixed(3), '-', '-'],
      ['Taux 2', results.rate2.toFixed(3), '-', '-'],
      ['Ratio de Taux (RR)', results.rr.toFixed(3), results.lowerRR.toFixed(3), results.upperRR.toFixed(3)],
      ['Différence de Taux', results.diff.toFixed(3), results.lowerDiff.toFixed(3), results.upperDiff.toFixed(3)]
    ];

    (doc as any).autoTable({
      startY: 90,
      head: [['Métrique', 'Valeur', 'Limite Inf.', 'Limite Sup.']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    const interpY = (doc as any).autoTable.previous.finalY + 15;
    const splitText = doc.splitTextToSize(interpretationText, 160);
    const interpHeight = 20 + splitText.length * 8;
    doc.setFillColor(240, 250, 255);
    doc.rect(20, interpY, 170, interpHeight, 'F');
    doc.setDrawColor(...primaryColor);
    doc.rect(20, interpY, 170, interpHeight);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text('Interprétation', 25, interpY + 8);
    doc.text(splitText, 25, interpY + 16);

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), 20, pageHeight - 20);
    doc.text('StatTool - Comparaison de Taux', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });

    doc.save('comparaison_deux_taux.pdf');
  };

  return (
    <>
      <style jsx>{`
        #results-container > div {
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
          opacity: 0;
          transform: translateY(20px);
        }
        #results-container > div.fade-in {
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Comparaison de Deux Taux</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-percent text-white">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="m15 9-6 6" />
                <path d="M9 9h.01" />
                <path d="M15 15h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Comparaison de Deux Taux
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez le ratio de taux, la différence de taux et leurs intervalles de confiance
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
                  <div className="space-y-6">
                    {showError && (
                      <div className="text-red-600 dark:text-red-400 text-sm mb-4" role="alert">
                        {errorMessage}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Taux 1 (ex. groupe exposé)</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label htmlFor="events1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre d'événements
                          </label>
                          <input
                            type="number"
                            id="events1"
                            min="0"
                            step="1"
                            value={events1}
                            onChange={(e) => setEvents1(e.target.value)}
                            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label htmlFor="person-time1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Temps-personne
                          </label>
                          <input
                            type="number"
                            id="person-time1"
                            min="0.0001"
                            step="any"
                            value={personTime1}
                            onChange={(e) => setPersonTime1(e.target.value)}
                            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Taux 2 (ex. groupe non exposé)</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label htmlFor="events2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nombre d'événements
                          </label>
                          <input
                            type="number"
                            id="events2"
                            min="0"
                            step="1"
                            value={events2}
                            onChange={(e) => setEvents2(e.target.value)}
                            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label htmlFor="person-time2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Temps-personne
                          </label>
                          <input
                            type="number"
                            id="person-time2"
                            min="0.0001"
                            step="any"
                            value={personTime2}
                            onChange={(e) => setPersonTime2(e.target.value)}
                            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="confidence-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Niveau de confiance
                      </label>
                      <select
                        id="confidence-level"
                        value={confidenceLevel}
                        onChange={(e) => setConfidenceLevel(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="90">90%</option>
                        <option value="95">95%</option>
                        <option value="99">99%</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={calculateTwoRates}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                    >
                      <Calculator className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Calculer
                    </button>
                    <button
                      onClick={clear}
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
                    <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Comment utiliser cet outil
                    </h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                      <li>Saisissez les événements et temps-personne pour chaque groupe.</li>
                      <li>Les résultats s'actualisent automatiquement.</li>
                      <li>Utilisez Exemple pour tester.</li>
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
                  {results && (
                    <div className="flex gap-4">
                      <button onClick={copyResults} className="p-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <Copy className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      <button onClick={exportPDF} className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                        <FileDown className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div id="results-container">
                    {results ? (
                      <div ref={resultsRef} className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Comparaison des Taux
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Taux par 1000 unités de temps-personne
                          </p>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Métrique</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Valeur</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Limite Inférieure</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Limite Supérieure</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Taux 1</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{results.rate1.toFixed(3)}</td>
                                  <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">-</td>
                                  <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Taux 2</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{results.rate2.toFixed(3)}</td>
                                  <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">-</td>
                                  <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">-</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Ratio de Taux (RR)</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{results.rr.toFixed(3)}</td>
                                  <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">{results.lowerRR.toFixed(3)}</td>
                                  <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">{results.upperRR.toFixed(3)}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Différence de Taux</td>
                                  <td className="px-4 py-3 text-center text-sm font-medium">{results.diff.toFixed(3)}</td>
                                  <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">{results.lowerDiff.toFixed(3)}</td>
                                  <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">{results.upperDiff.toFixed(3)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
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
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Saisissez vos données pour voir les résultats</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Les calculs apparaîtront automatiquement</p>
                      </div>
                    )}
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
                      Ce module compare les taux de cas de personnes exposées et non exposées, en utilisant le personne-temps d’exposition ou non comme dénominateur. Le temps peut être entré comme personne-heures, -jours, -ans, etc., en utilisant les mêmes unités pour les personnes exposées et non exposées.
                    </p>
                    <p className="text-sm leading-relaxed mt-3">
                      Les tests exacts de Fisher et midP sont compris dans les résultats. Plus d’une strate peut être entrée pour calculer les statistiques brutes et ajustées.
                    </p>
                    <p className="text-sm leading-relaxed mt-3">
                      <strong>Auteurs :</strong><br />
                      Kevin M. Sullivan (Université d’Emory), Andrew G. Dean (EpiInformatics.com), basés sur le code de John C. Pezzullo. Statistiques de vraisemblance exactes et maximum adaptées d’un programme en Pascal de David Martin. Andrew G. Dean et Roger Mir.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <BarChart3 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Ressources & Tutoriels
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Outil original OpenEpi</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/RateRatio/RateRatio.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenEpi - Rate Ratio Calculator</a></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Vidéos explicatives</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.youtube.com/watch?v=4KoJ3zDSfAM" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Rate Ratio & Confidence Interval (English)</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=Jy3OYg9Y8Ak" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Ratio de risques et différence de risques (Français)</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=2X5WvN8oH2s" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Incidence Rate Ratio Explained</a></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Documentation & Références</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/PDFDocs/RateRatioDoc.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Documentation OpenEpi RateRatio</a></li>
                          <li>• Rothman KJ, Greenland S. <em>Modern Epidemiology</em></li>
                          <li>• Jewell NP. <em>Statistics for Epidemiology</em></li>
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