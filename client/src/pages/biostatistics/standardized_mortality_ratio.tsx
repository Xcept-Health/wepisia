import { useState, useEffect, useRef } from 'react';
import { Blocks, ChevronRight, Calculator, BarChart3, Copy, FileDown, HelpCircle, X } from 'lucide-react';
import { Link } from 'wouter';

export default function StdMortalityRatio() {
  const [observed, setObserved] = useState<string>('');
  const [expected, setExpected] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [calculatedSmr, setCalculatedSmr] = useState<string>('-');
  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Mise à jour automatique du RMS affiché
  useEffect(() => {
    const obs = parseFloat(observed) || 0;
    const exp = parseFloat(expected) || 0;
    if (exp > 0) {
      setCalculatedSmr((obs / exp).toFixed(4));
    } else {
      setCalculatedSmr('-');
    }
  }, [observed, expected]);

  // Calcul des résultats
  const calculate = () => {
    const obs = parseFloat(observed);
    const exp = parseFloat(expected);
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;

    if (isNaN(obs) || isNaN(exp) || obs < 0 || exp <= 0) {
      setResults(null);
      return;
    }

    const smr = obs / exp;

    let lowerCI: number, upperCI: number;
    if (obs === 0) {
      lowerCI = 0;
      upperCI = (window as any).jStat.chisquare.inv(1 - alpha, 2) / (2 * exp);
    } else {
      lowerCI = (window as any).jStat.chisquare.inv(alpha / 2, 2 * obs) / (2 * exp);
      upperCI = (window as any).jStat.chisquare.inv(1 - alpha / 2, 2 * (obs + 1)) / (2 * exp);
    }

    setResults({ observed: obs, expected: exp, smr, lowerCI, upperCI, confidenceLevel: conf });
  };

  // Calcul automatique à chaque changement valide
  useEffect(() => {
    calculate();
  }, [observed, expected, confidenceLevel]);

  // Animation d'apparition des résultats
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  // Effacer
  const clear = () => {
    setObserved('');
    setExpected('');
    setConfidenceLevel('95');
    setResults(null);
  };

  // Exemple
  const loadExample = () => {
    setObserved('120');
    setExpected('100');
    setConfidenceLevel('95');
  };

  // Copier les résultats
  const copyResults = async () => {
    if (!results || !resultsRef.current) return;
    try {
      await navigator.clipboard.writeText(resultsRef.current.innerText);
    } catch (err) {
      alert('Échec de la copie');
    }
  };

  // Export PDF
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
    doc.setFont('helvetica', 'bold');
    doc.text('Résultats du Ratio de Mortalité Standardisé', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Analyse statistique des données de mortalité', 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Données de l\'échantillon', 20, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Décès observés (O) : ${results.observed}`, 20, 65);
    doc.text(`Décès attendus (E) : ${results.expected.toFixed(4)}`, 20, 73);
    doc.text(`Ratio de Mortalité Standardisé (RMS) : ${results.smr.toFixed(4)}`, 20, 81);
    doc.text(`Niveau de confiance : ${results.confidenceLevel}%`, 20, 89);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Calcul détaillé', 20, 105);
    doc.setFontSize(12);
    doc.text(`RMS = O / E = ${results.observed} / ${results.expected.toFixed(4)}`, 20, 115);
    doc.text(`RMS = ${results.smr.toFixed(4)}`, 20, 123);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Intervalles de confiance', 20, 145);

    (doc as any).autoTable({
      startY: 150,
      head: [['Méthode', 'IC Inférieur', 'IC Supérieur', 'IC Inférieur (×100)', 'IC Supérieur (×100)']],
      body: [[
        'Méthode Byar (approximation exacte)',
        results.lowerCI.toFixed(4),
        results.upperCI.toFixed(4),
        (results.lowerCI * 100).toFixed(2) + '%',
        (results.upperCI * 100).toFixed(2) + '%'
      ]],
      theme: 'striped',
      headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold', fontSize: 11 },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    const finalY = (doc as any).autoTable.previous.finalY + 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Interprétation des résultats', 20, finalY);

    let interpretation = '';
    if (results.smr > 1) {
      interpretation = `Le RMS de ${results.smr.toFixed(2)} indique que la mortalité observée est ${(results.smr * 100 - 100).toFixed(0)}% plus élevée que celle attendue.`;
    } else if (results.smr < 1) {
      interpretation = `Le RMS de ${results.smr.toFixed(2)} indique que la mortalité observée est ${(100 - results.smr * 100).toFixed(0)}% plus faible que celle attendue.`;
    } else {
      interpretation = 'Le RMS de 1.00 indique que la mortalité observée est égale à celle attendue.';
    }

    if (results.lowerCI > 1) {
      interpretation += ` L'intervalle de confiance se situe entièrement au-dessus de 1, ce qui suggère une mortalité significativement plus élevée (p < 0.05).`;
    } else if (results.upperCI < 1) {
      interpretation += ` L'intervalle de confiance se situe entièrement en dessous de 1, ce qui suggère une mortalité significativement plus faible (p < 0.05).`;
    } else {
      interpretation += ` L'intervalle de confiance inclut 1, ce qui indique que la différence observée n'est pas statistiquement significative au niveau ${results.confidenceLevel}%.`;
    }

    const splitText = doc.splitTextToSize(interpretation, 170);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(splitText, 20, finalY + 10);

    doc.save('resultats_rms_detaille.pdf');
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Ratio de Mortalité Standardisé</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Blocks className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ratio de Mortalité Standardisé (RMS)
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez le RMS et son intervalle de confiance
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="observed-deaths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Décès observés
                        </label>
                        <input
                          type="number"
                          id="observed-deaths"
                          min="0"
                          step="1"
                          value={observed}
                          onChange={(e) => setObserved(e.target.value)}
                          className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label htmlFor="expected-deaths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Décès attendus
                        </label>
                        <input
                          type="number"
                          id="expected-deaths"
                          min="0"
                          step="any"
                          value={expected}
                          onChange={(e) => setExpected(e.target.value)}
                          className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="0"
                        />
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

                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">RMS calculé :</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{calculatedSmr}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={calculate}
                      disabled={!results}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
                    >
                      <Calculator className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      Calculer
                    </button>
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
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Résumé</h3>
                          <p className="text-blue-800 dark:text-blue-200">
                            RMS = <strong>{results.smr.toFixed(4)}</strong> ({results.observed} décès observés / {results.expected.toFixed(4)} attendus)
                          </p>
                        </div>

                        <dl className="space-y-4">
                          <dt className="font-semibold text-gray-900 dark:text-white">
                            Intervalle de Confiance à {results.confidenceLevel}% (méthode Byar)
                          </dt>
                          <dd className="text-lg font-bold text-gray-700 dark:text-gray-300">
                            [{results.lowerCI.toFixed(4)}, {results.upperCI.toFixed(4)}]
                          </dd>
                        </dl>

                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Interprétation</h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {results.smr > 1
                              ? 'Le RMS est supérieur à 1 : mortalité observée plus élevée que attendue.'
                              : results.smr < 1
                              ? 'Le RMS est inférieur à 1 : mortalité observée plus faible que attendue.'
                              : 'Le RMS est égal à 1 : mortalité observée conforme à celle attendue.'}
                            {' '}
                            {results.lowerCI <= 1 && results.upperCI >= 1
                              ? "L'intervalle de confiance inclut 1 → différence non statistiquement significative."
                              : results.lowerCI > 1
                              ? "L'intervalle est entièrement > 1 → mortalité significativement plus élevée."
                              : "L'intervalle est entièrement < 1 → mortalité significativement plus faible."}
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

          {/* Bouton flottant d'aide */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          >
            <HelpCircle className="w-7 h-7" strokeWidth={1.5} />
          </button>

          {/* Modal d'aide  */}
          {showHelpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 overflow-y-auto">
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 my-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-slate-700/50 rounded-t-2xl">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aide &amp; Ressources</h3>
                  <button onClick={() => setShowHelpModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    <X className="w-7 h-7" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="p-6 space-y-10 text-gray-700 dark:text-gray-300">
                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <HelpCircle className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Comment utiliser cet outil
                    </h4>
                    <ul className="space-y-3 text-base bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Saisissez le nombre de décès observés dans la population étudiée.
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Entrez le nombre de décès attendus basé sur une population de référence.
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Sélectionnez le niveau de confiance souhaité.
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        Le RMS et son intervalle de confiance s'affichent automatiquement dès que les données sont valides.
                      </li>
                    </ul>
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">RMS</span>
                        </div>
                        <h5 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Ratio de Mortalité Standardisé</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                        Le RMS compare la mortalité observée à la mortalité attendue, ajustée pour des facteurs comme l'âge. Un RMS &gt; 1 indique une mortalité plus élevée, un RMS &lt; 1 une mortalité plus faible.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-6 shadow-md border border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">IC</span>
                        </div>
                        <h5 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">Intervalle de Confiance</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-indigo-800 dark:text-indigo-200">
                        L&apos;intervalle de confiance estime la précision du RMS. Si l&apos;IC inclut 1, la différence observée n&apos;est pas statistiquement significative.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <BarChart3 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Références et ressources pédagogiques
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Références scientifiques</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/SMR/SMR.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenEpi - Calculateur de SMR</a></li>
                          <li>• <a href="https://www.openepi.com/PDFDocs/SMRDoc.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Documentation OpenEpi sur le SMR</a></li>
                          <li>• <a href="https://ibis.doh.nm.gov/resource/SMR_ISR.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Explication détaillée du SMR (New Mexico DoH)</a></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Vidéos explicatives</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.youtube.com/watch?v=NOLarkMfnMs" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">What Is Standardized Mortality Rate?</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=DOEstU62D4w" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Direct and Indirect Standardization</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=lmOB97Arto0" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">La standardisation des taux (français)</a></li>
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