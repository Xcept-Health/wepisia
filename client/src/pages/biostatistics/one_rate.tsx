import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Calculator, BarChart3, Copy, FileDown, HelpCircle, X, Trash2 } from 'lucide-react';
import { Link } from 'wouter';

export default function OneRate() {
  const [events, setEvents] = useState<string>('');
  const [personTime, setPersonTime] = useState<string>('');
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

  // Calculate rate
  const calculateRate = () => {
    const ev = parseFloat(events) || 0;
    const pt = parseFloat(personTime) || 0;
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;

    setShowError(false);

    if (ev < 0 || pt <= 0 || isNaN(ev) || isNaN(pt)) {
      setErrorMessage('Veuillez entrer des valeurs valides (événements ≥ 0, temps-personne > 0).');
      setShowError(true);
      setResults(null);
      return;
    }

    const ratePerUnit = ev / pt;
    const rate = ratePerUnit * 1000;

    const calcResults: any[] = [];

    // 1. Exact (Garwood) / Fisher Exact
    let exactLower, exactUpper;
    if (ev === 0) {
      exactLower = 0;
      exactUpper = (window as any).jStat.chisquare.inv(1 - alpha, 2) / (2 * pt) * 1000;
    } else {
      exactLower = (window as any).jStat.chisquare.inv(alpha / 2, 2 * ev) / (2 * pt) * 1000;
      exactUpper = (window as any).jStat.chisquare.inv(1 - alpha / 2, 2 * (ev + 1)) / (2 * pt) * 1000;
    }
    calcResults.push({ method: 'Exact (Garwood)', rate: rate.toFixed(3), lower: exactLower.toFixed(3), upper: exactUpper.toFixed(3) });

    // 2. Mid-P Exact (using bisection approximation for fidelity)
    const poissonCdf = (k: number, lambda: number) => (window as any).jStat.poisson.cdf(Math.floor(k), lambda);
    const poissonPdf = (k: number, lambda: number) => (window as any).jStat.poisson.pdf(Math.floor(k), lambda);

    const findMidPLower = (k: number, alph: number, time: number, scale = 1000) => {
      if (k === 0) return 0;
      let low = 0, high = k * 2;
      for (let i = 0; i < 100; i++) {
        let mid = (low + high) / 2;
        let cum = poissonCdf(k - 1, mid) + 0.5 * poissonPdf(k, mid);
        if (cum < alph / 2) high = mid;
        else low = mid;
      }
      return ((low + high) / 2) / time * scale;
    };

    const findMidPUpper = (k: number, alph: number, time: number, scale = 1000) => {
      let low = 0, high = (k + 10) * 2;
      for (let i = 0; i < 100; i++) {
        let mid = (low + high) / 2;
        let cum = poissonCdf(k, mid) - 0.5 * poissonPdf(k, mid);
        if (cum < 1 - alph / 2) low = mid;
        else high = mid;
      }
      return ((low + high) / 2) / time * scale;
    };

    const midpLower = findMidPLower(ev, alpha, pt);
    const midpUpper = findMidPUpper(ev, alpha, pt);
    calcResults.push({ method: 'Mid-P Exact', rate: rate.toFixed(3), lower: midpLower.toFixed(3), upper: midpUpper.toFixed(3) });

    // 3. Normal Approximation
    const se = Math.sqrt(ev) / pt * 1000;
    const z = (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1);
    const normalLower = Math.max(0, rate - z * se);
    const normalUpper = rate + z * se;
    calcResults.push({ method: 'Normal Approximation', rate: rate.toFixed(3), lower: normalLower.toFixed(3), upper: normalUpper.toFixed(3) });

    // 4. Byar Approximation
    let byarLower, byarUpper;
    if (ev === 0) {
      byarLower = 0;
      byarUpper = exactUpper;
    } else {
      const termLower = 1 - 1 / (9 * ev) - z / (3 * Math.sqrt(ev));
      byarLower = ev * Math.pow(termLower, 3) / pt * 1000;
      const termUpper = 1 - 1 / (9 * (ev + 1)) + z / (3 * Math.sqrt(ev + 1));
      byarUpper = (ev + 1) * Math.pow(termUpper, 3) / pt * 1000;
    }
    byarLower = Math.max(0, byarLower);
    calcResults.push({ method: 'Byar Approx.', rate: rate.toFixed(3), lower: byarLower.toFixed(3), upper: byarUpper.toFixed(3) });

    // 5. Rothman/Greenland
    let rgLower, rgUpper;
    if (ev === 0) {
      rgLower = 0;
      rgUpper = exactUpper;
    } else {
      const logRate = Math.log(ratePerUnit);
      const seLog = Math.sqrt(1 / ev);
      rgLower = Math.exp(logRate - z * seLog) * 1000;
      rgUpper = Math.exp(logRate + z * seLog) * 1000;
    }
    calcResults.push({ method: 'Rothman/Greenland', rate: rate.toFixed(3), lower: rgLower.toFixed(3), upper: rgUpper.toFixed(3) });

    setResults({ events: ev, personTime: pt, rate, confidenceLevel: conf, results: calcResults });

    setInterpretationText(
      `Le taux observé est de ${rate.toFixed(3)} événements par 1000 unités de temps-personne. ` +
      `À ${conf}% de confiance, l'intervalle varie selon la méthode (voir tableau). ` +
      `${ev === 0 ? 'Avec zéro événement, préférez les méthodes exactes.' : 'Pour de petits nombres, les méthodes exactes sont plus fiables.'}`
    );
  };

  // Auto calculate on valid changes
  useEffect(() => {
    if (events && personTime) {
      calculateRate();
    }
  }, [events, personTime, confidenceLevel]);

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clear = () => {
    setEvents('');
    setPersonTime('');
    setConfidenceLevel('95');
    setResults(null);
    setShowError(false);
  };

  const loadExample = () => {
    setEvents('45');
    setPersonTime('1000');
    calculateRate();
  };

  const copyResults = async () => {
    if (!results) return;
    let text = `Taux : ${results.rate.toFixed(3)} par 1000 unités\n\n`;
    results.results.forEach((r: any) => {
      text += `${r.method}: ${r.rate} [${r.lower} - ${r.upper}]\n`;
    });
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
    doc.text('Analyse d\'un Taux', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Intervalle de confiance - PersonTime', 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Données saisies', 20, 55);
    doc.setFontSize(12);
    doc.text(`Événements : ${results.events}`, 20, 65);
    doc.text(`Temps-personne : ${results.personTime}`, 20, 73);
    doc.text(`Niveau de confiance : ${results.confidenceLevel}%`, 20, 81);

    const tableData = results.results.map((r: any) => [r.method, r.rate, r.lower, r.upper]);
    (doc as any).autoTable({
      startY: 95,
      head: [['Méthode', 'Taux', 'Limite Inf.', 'Limite Sup.']],
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
    doc.text('StatTool - Analyse d\'un Taux', 105, pageHeight - 20, { align: 'center' });
    doc.text('Page 1/1', 190, pageHeight - 20, { align: 'right' });

    doc.save('analyse_taux_detaille.pdf');
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
                <span className="text-gray-900 dark:text-gray-100 font-medium">Analyse d'un Taux</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-percent text-white">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="M9 9h.01" />
                <path d="M15 15h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analyse d'un Taux
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez le taux et son intervalle de confiance
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
                      <label htmlFor="events" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre d'événements (numérateur)
                      </label>
                      <input
                        type="number"
                        id="events"
                        min="0"
                        step="1"
                        value={events}
                        onChange={(e) => setEvents(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="person-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Temps-personne (dénominateur)
                      </label>
                      <input
                        type="number"
                        id="person-time"
                        min="0.0001"
                        step="any"
                        value={personTime}
                        onChange={(e) => setPersonTime(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="0"
                      />
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
                      onClick={calculateRate}
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
                      <li>Saisissez le nombre d'événements (ex. cas de maladie) observés.</li>
                      <li>Entrez le temps-personne total (ex. années-personnes).</li>
                      <li>Sélectionnez le niveau de confiance.</li>
                      <li>Les résultats s'affichent automatiquement.</li>
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
                            Taux et Intervalles de Confiance
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Taux par 1000 unités de temps-personne
                          </p>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Méthode</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Taux</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Limite Inférieure</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Limite Supérieure</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {results.results.map((r: any, index: number) => (
                                  <tr key={index}>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.method}</td>
                                    <td className="px-4 py-3 text-center text-sm font-medium">{r.rate}</td>
                                    <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">{r.lower}</td>
                                    <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">{r.upper}</td>
                                  </tr>
                                ))}
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
                      Le module PersonTime1 de OpenEpi est utilisé pour analyser les données basées sur la durée d’exposition, les personnes exposées, et un comptage de l’événement mesuré. Cette méthode d’analyse est fréquemment utilisée dans les études de cohortes et les essais cliniques. Personne-temps est fréquemment exprimé en personne-an, bien que personne-heures, jours ou mois fonctionnent aussi bien. Les résultats comprennent le taux par unités de 1000 personne-temps et les limites de confiance en utilisant plusieurs méthodes.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      Méthodes d'intervalle de confiance
                    </h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>Mid-P exact test</strong> : en utilisant la modification de Miettinen (1974d).</p>
                      <p><strong>Fisher exact</strong> : basé sur Armitage (1971).</p>
                      <p><strong>Normal approximation</strong> : pour la distribution de Poisson (Rosner).</p>
                      <p><strong>Byar approx. Poisson</strong> : comme décrit par Rothman et Boice (1979).</p>
                      <p><strong>Rothman/Greenland</strong> : comme décrit dans Modern Epidemiology (2ème Éd.).</p>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 shadow-md border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold">Taux</span>
                        </div>
                        <h5 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Taux</h5>
                      </div>
                      <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                        Le taux mesure la fréquence d'un événement dans une population sur une période donnée, calculé comme le nombre d'événements divisé par le temps-personne total.
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
                        L'intervalle de confiance estime la précision du taux. Basé sur la distribution de Poisson, il indique la plage probable du vrai taux dans la population.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 flex items-center text-blue-700 dark:text-blue-400">
                      <BarChart3 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Ressources & Tutoriels
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Outil original</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/PersonTime/PersonTime.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenEpi - PersonTime1 Calculator</a></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Vidéos explicatives</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.youtube.com/watch?v=2X5WvN8oH2s" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Incidence Rate & Confidence Interval (English)</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=2rJz3s1L1LM" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Taux d'incidence et IC en épidémiologie (Français)</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=4TGB8tK4ZfI" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Person-time explained</a></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Références & Documentation</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/PDFDocs/PersonTime1Doc.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Documentation OpenEpi PersonTime</a></li>
                          <li>• Rothman KJ, Greenland S. <em>Modern Epidemiology</em> (2nd ed.)</li>
                          <li>• Rosner B. <em>Fundamentals of Biostatistics</em></li>
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