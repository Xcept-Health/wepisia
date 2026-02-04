import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Calculator, BarChart3, Copy, FileDown, HelpCircle, X, Trash2 } from 'lucide-react';
import { Link } from 'wouter';

export default function MedianPercentileCI() {
  const [sampleSize, setSampleSize] = useState<string>('');
  const [percentile, setPercentile] = useState<string>('50');
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

  // Calculate Median/Percentile CI
  const calculateMedianCI = () => {
    const n = parseInt(sampleSize) || 0;
    const perc = parseFloat(percentile) || 50;
    const conf = parseFloat(confidenceLevel);
    const alpha = 1 - conf / 100;

    setShowError(false);

    if (n < 2 || perc < 0 || perc > 100) {
      setResults(null);
      return;
    }

    // Calculs basés sur l'approximation normale des rangs
    const p = perc / 100;
    const z = (window as any).jStat.normal.inv(1 - alpha / 2, 0, 1);
    
    // Rang attendu du percentile
    const expectedRank = n * p;
    
    // Erreur standard du rang
    const se = Math.sqrt(n * p * (1 - p));
    
    // Limites de confiance pour les rangs
    const lowerRank = Math.max(1, Math.floor(expectedRank - z * se));
    const upperRank = Math.min(n, Math.ceil(expectedRank + z * se));
    
    // Pour l'affichage, on montre les percentiles correspondants
    const lowerPercentile = (lowerRank / n) * 100;
    const upperPercentile = (upperRank / n) * 100;

    setResults({ 
      n, 
      percentile: perc, 
      conf, 
      p,
      expectedRank,
      se,
      z,
      lowerRank, 
      upperRank,
      lowerPercentile,
      upperPercentile
    });

    setInterpretationText(
      `À <strong>${conf}%</strong> de confiance, le <strong>${formatNumber(perc)}ème percentile</strong> ` +
      `de la population correspond à des rangs entre <strong>${lowerRank}</strong> et <strong>${upperRank}</strong> ` +
      `dans un échantillon trié de taille ${n}.<br><br>` +
      `<em>Note : Triez vos données par ordre croissant et trouvez les valeurs aux positions ${lowerRank} et ${upperRank} ` +
      `pour obtenir l'intervalle de confiance sur la valeur du percentile.</em>`
    );
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === Infinity) return '∞';
    if (isNaN(num) || !isFinite(num)) return '-';
    return Number(num).toFixed(decimals);
  };

  // Auto calculate on valid changes
  useEffect(() => {
    calculateMedianCI();
  }, [sampleSize, percentile, confidenceLevel]);

  // Animation
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.classList.remove('fade-in');
      void resultsRef.current.offsetWidth;
      resultsRef.current.classList.add('fade-in');
    }
  }, [results]);

  const clear = () => {
    setSampleSize('');
    setPercentile('50');
    setConfidenceLevel('95');
    setResults(null);
    setShowError(false);
  };

  const loadExample = () => {
    setSampleSize('100');
    setPercentile('50');
    calculateMedianCI();
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Intervalle de Confiance pour le Percentile\n` +
                 `==========================================\n` +
                 `Taille échantillon: ${results.n}\n` +
                 `Percentile: ${results.percentile}%\n` +
                 `Niveau de confiance: ${results.conf}%\n` +
                 `\nRésultats:\n` +
                 `Rang attendu: ${formatNumber(results.expectedRank, 2)}\n` +
                 `Limite inférieure: rang ${results.lowerRank} (${formatNumber(results.lowerPercentile)}%)\n` +
                 `Limite supérieure: rang ${results.upperRank} (${formatNumber(results.upperPercentile)}%)\n` +
                 `\nInterprétation:\n` +
                 `À ${results.conf}% de confiance, le ${results.percentile}ème percentile correspond aux rangs ${results.lowerRank} à ${results.upperRank}.`;
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
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = [59, 130, 246];

    // En-tête
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Intervalle de Confiance pour la Médiane/Percentiles', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Généré le: ${dateStr}`, pageWidth - 20, 28, { align: 'right' });
    
    let yPosition = 45;
    
    // Section: Données d'entrée
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Données d\'entrée', 20, yPosition);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    yPosition += 10;
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [['Paramètre', 'Valeur']],
      body: [
        ['Taille échantillon (n)', results.n],
        ['Percentile', `${results.percentile}%`],
        ['Niveau de confiance', `${results.conf}%`],
        ['Proportion (p/100)', formatNumber(results.p, 4)],
        ['Valeur critique Z', formatNumber(results.z, 4)]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Section: Résultats
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Résultats - Intervalles de confiance pour les rangs', 20, yPosition);
    
    yPosition += 10;
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [['Description', 'Percentile', 'Rang estimé']],
      body: [
        ['Percentile attendu', `${formatNumber(results.percentile)}%`, formatNumber(results.expectedRank, 2)],
        ['Limite inférieure', `${formatNumber(results.lowerPercentile)}%`, results.lowerRank],
        ['Limite supérieure', `${formatNumber(results.upperPercentile)}%`, results.upperRank]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor, 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 10
      },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Section: Statistiques
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Statistiques calculées', 20, yPosition);
    
    yPosition += 10;
    
    (doc as any).autoTable({
      startY: yPosition,
      body: [
        ['Erreur standard du rang', formatNumber(results.se, 4)],
        ['Largeur de l\'intervalle (rangs)', results.upperRank - results.lowerRank],
        ['Largeur de l\'intervalle (percentiles)', formatNumber(results.upperPercentile - results.lowerPercentile, 2) + '%']
      ],
      theme: 'grid',
      margin: { left: 20, right: 20 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'right' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Section: Interprétation
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Interprétation', 20, yPosition);
    
    yPosition += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const interpretation = `À ${results.conf}% de confiance, le ${results.percentile}ème percentile de la population correspond à des rangs entre ${results.lowerRank} et ${results.upperRank} dans un échantillon trié de taille ${results.n}.\n\n` +
                           `Pour obtenir l'intervalle de confiance sur la valeur du percentile :\n` +
                           `1. Triez vos ${results.n} observations par ordre croissant\n` +
                           `2. Trouvez la valeur à la position ${results.lowerRank} (limite inférieure)\n` +
                           `3. Trouvez la valeur à la position ${results.upperRank} (limite supérieure)\n` +
                           `4. L'intervalle [valeur à ${results.lowerRank}, valeur à ${results.upperRank}] est votre intervalle de confiance à ${results.conf}%`;
    
    const lines = doc.splitTextToSize(interpretation, pageWidth - 40);
    doc.text(lines, 20, yPosition);
    
    // Pied de page
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('Généré par BioStatistics Tools - https://biostatistics.example.com', pageWidth / 2, 285, { align: 'center' });
    
    // Numéro de page
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, 290, { align: 'right' });
    }
    
    doc.save(`IC_Percentile_${results.percentile}_n${results.n}_${results.conf}pc.pdf`);
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
                <Link href="/biostatistics/continuous" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  Variables continues
                </Link>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">Intervalle de Confiance pour la Médiane / Percentiles</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-between-horizontal-start text-white">
                <rect width="13" height="7" x="8" y="3" rx="1" />
                <path d="m2 9 3 3-3 3" />
                <rect width="13" height="7" x="8" y="14" rx="1" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Intervalle de Confiance pour la Médiane / Percentiles
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calculez l'intervalle de confiance pour la médiane ou un percentile donné d'un échantillon en utilisant l'approximation normale des rangs.
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
                  <div className="space-y-4">
                    {showError && (
                      <div className="text-red-600 dark:text-red-400 text-sm mb-4" role="alert">
                        {errorMessage}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sample-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taille de l'échantillon (n)</label>
                        <input
                          type="number"
                          id="sample-size"
                          min="2"
                          step="1"
                          value={sampleSize}
                          onChange={(e) => setSampleSize(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label htmlFor="percentile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Percentile (p)</label>
                        <div className="relative">
                          <input
                            type="number"
                            id="percentile"
                            min="0"
                            max="100"
                            value={percentile}
                            onChange={(e) => setPercentile(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            step="1"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400">%</span>
                          </div>
                        </div>
                        <div className="mt-1 flex space-x-2">
                          <button type="button" onClick={() => setPercentile('25')} className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">Q1 (25%)</button>
                          <button type="button" onClick={() => setPercentile('50')} className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">Médiane (50%)</button>
                          <button type="button" onClick={() => setPercentile('75')} className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded">Q3 (75%)</button>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label htmlFor="confidence-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niveau de confiance (%)</label>
                        <select
                          id="confidence-level"
                          value={confidenceLevel}
                          onChange={(e) => setConfidenceLevel(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="90">90%</option>
                          <option value="95">95%</option>
                          <option value="99">99%</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-6">
                      <button
                        onClick={calculateMedianCI}
                        className="flex-1 min-w-0 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"w
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
                      <li>Entrez la taille de votre échantillon (n ≥ 2).</li>
                      <li>Spécifiez le percentile (0-100). Cliquez sur les boutons pour Q1, Médiane ou Q3.</li>
                      <li>Sélectionnez le niveau de confiance désiré.</li>
                      <li>Les résultats s'actualisent automatiquement après calcul.</li>
                      <li>Utilisez Exemple pour tester avec des valeurs prédéfinies.</li>
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
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Taille échantillon (n)</span>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{results.n}</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Percentile (p)</span>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.percentile)}%</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Niveau de confiance</span>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{results.conf}%</p>
                          </div>
                          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Proportion (p/100)</span>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatNumber(results.p, 4)}</p>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Intervalle de Confiance pour le Rang</h3>
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg">
                              <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Description</th>
                                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Valeur</th>
                                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">Rang estimé</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                <tr>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">Percentile attendu</td>
                                  <td className="px-6 py-4 text-center text-sm text-blue-600 dark:text-blue-400">{formatNumber(results.percentile)}%</td>
                                  <td className="px-6 py-4 text-center text-sm text-blue-600 dark:text-blue-400">{formatNumber(results.expectedRank, 2)}</td>
                                </tr>
                                <tr>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">Limite inférieure du rang</td>
                                  <td className="px-6 py-4 text-center text-sm text-green-600 dark:text-green-400">{formatNumber(results.lowerPercentile)}%</td>
                                  <td className="px-6 py-4 text-center text-sm text-green-600 dark:text-green-400">{results.lowerRank}</td>
                                </tr>
                                <tr>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">Limite supérieure du rang</td>
                                  <td className="px-6 py-4 text-center text-sm text-red-600 dark:text-red-400">{formatNumber(results.upperPercentile)}%</td>
                                  <td className="px-6 py-4 text-center text-sm text-red-600 dark:text-red-400">{results.upperRank}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Interprétation
                          </h3>
                          <p className="text-sm text-blue-800 dark:text-blue-200" dangerouslySetInnerHTML={{ __html: interpretationText }} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">Entrez vos données pour voir les résultats</p>
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
                    <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">À propos de cet outil</h4>
                    <p className="text-sm leading-relaxed">
                      Ce module calcule les intervalles de confiance pour la médiane ou un percentile d'un échantillon en utilisant l'approximation normale des rangs. En entrant la taille de l'échantillon et le percentile désiré, l'outil estime les rangs correspondant aux limites de confiance inférieure et supérieure. L'utilisateur peut changer le niveau de confiance et le percentile selon ses besoins.
                    </p>
                    <p className="text-sm leading-relaxed mt-3">
                      <strong>Auteurs :</strong><br />
                      Minn M. Soe et Kevin M. Sullivan (Université d'Emory), Andrew G. Dean (EpiInformatics.com), et Roger A. Mir.
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">
                      <BarChart3 className="w-6 h-6 mr-3" strokeWidth={1.5} />
                      Ressources & Tutoriels
                    </h4>
                    <div className="space-y-5">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Outil original OpenEpi</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/Median/Median.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenEpi - Confidence Interval of a Median/Percentile</a></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Vidéos explicatives</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.youtube.com/watch?v=hlM7zdf1iOM" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Intervalle de confiance pour la médiane (Français)</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=tFWsu0gps7A" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Confidence Interval for Median (English)</a></li>
                          <li>• <a href="https://www.youtube.com/watch?v=4t9e3cX3L0U" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Percentiles and Confidence Intervals</a></li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5">
                        <h5 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Documentation</h5>
                        <ul className="space-y-2 text-sm">
                          <li>• <a href="https://www.openepi.com/PDFDocs/MedianDoc.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Documentation OpenEpi Median CI</a></li>
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