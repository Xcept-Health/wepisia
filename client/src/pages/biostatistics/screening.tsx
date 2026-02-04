import { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  Trash2,
  Info,
  BarChart3,
  Copy,
  Download,
  X,
  CheckCircle,
  PieChart,
  Shield,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Home,
  FileText,
  Table2,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
  Users,
  Target
} from 'lucide-react';

interface ScreeningTestData {
  tp: string;
  fp: string;
  fn: string;
  tn: string;
}

interface ScreeningTestResults {
  sensitivity: number;
  specificity: number;
  vpp: number;
  vpn: number;
  interpretation: string;
  calculated: boolean;
  usedPrev: number;
}

export default function ScreeningTest() {
  const [tableData, setTableData] = useState<ScreeningTestData>({
    tp: '',
    fp: '',
    fn: '',
    tn: ''
  });
  const [prevalence, setPrevalence] = useState('');
  const [results, setResults] = useState<ScreeningTestResults | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Calculer les totaux
  const tp = parseInt(tableData.tp) || 0;
  const fp = parseInt(tableData.fp) || 0;
  const fn = parseInt(tableData.fn) || 0;
  const tn = parseInt(tableData.tn) || 0;

  const diseased = tp + fn;
  const healthy = fp + tn;
  const total = diseased + healthy;

  const calculateResults = () => {
    const samplePrev = total > 0 ? (diseased / total) * 100 : 0;
    const sensitivity = diseased > 0 ? (tp / diseased) * 100 : 0;
    const specificity = healthy > 0 ? (tn / healthy) * 100 : 0;

    let vpp = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
    let vpn = (fn + tn) > 0 ? (tn / (fn + tn)) * 100 : 0;

    const externalPrev = parseFloat(prevalence);
    let usedPrev = samplePrev;
    
    if (!isNaN(externalPrev) && externalPrev >= 0 && externalPrev <= 100) {
      const prev = externalPrev / 100;
      if (sensitivity > 0 && specificity < 100) {
        vpp = (sensitivity / 100 * prev) / (sensitivity / 100 * prev + (1 - specificity / 100) * (1 - prev)) * 100;
      }
      if (specificity > 0 && sensitivity < 100) {
        vpn = (specificity / 100 * (1 - prev)) / (specificity / 100 * (1 - prev) + (1 - sensitivity / 100) * prev) * 100;
      }
      usedPrev = externalPrev;
    }

    const interpretation = `Sensibilité : ${sensitivity.toFixed(1)}% → ${
      sensitivity >= 90 ? 'Excellent' : sensitivity >= 70 ? 'Bon' : 'À améliorer'
    } pour détecter les malades.\n
Spécificité : ${specificity.toFixed(1)}% → ${
      specificity >= 90 ? 'Excellent' : specificity >= 70 ? 'Bon' : 'À améliorer'
    } pour exclure la maladie.\n
VPP : ${vpp.toFixed(1)}% (prévalence utilisée : ${usedPrev.toFixed(2)}%) → Probabilité d'être malade si test positif.\n
VPN : ${vpn.toFixed(1)}% → Probabilité d'être sain si test négatif.`;

    setResults({
      sensitivity,
      specificity,
      vpp,
      vpn,
      interpretation,
      calculated: true,
      usedPrev
    });

    // Animation d'entrée
    setTimeout(() => {
      if (resultsRef.current) {
        const children = resultsRef.current.children;
        Array.from(children).forEach((el, index) => {
          setTimeout(() => {
            el.classList.add('opacity-100', 'translate-y-0');
            el.classList.remove('opacity-0', 'translate-y-5');
          }, index * 150);
        });
      }
    }, 100);
  };

  const clearData = () => {
    setTableData({ tp: '', fp: '', fn: '', tn: '' });
    setPrevalence('');
    setResults(null);
  };

  const loadExample = () => {
    setTableData({ tp: '80', fp: '20', fn: '10', tn: '90' });
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Sensibilité: ${results.sensitivity.toFixed(2)}%\nSpécificité: ${results.specificity.toFixed(2)}%\nVPP: ${results.vpp.toFixed(2)}%\nVPN: ${results.vpn.toFixed(2)}%`;
    try {
      await navigator.clipboard.writeText(text);
      // Feedback visuel temporaire
      const btn = document.getElementById('copy-btn');
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        setTimeout(() => {
          btn.innerHTML = original;
        }, 2000);
      }
    } catch (err) {
      console.error('Échec de la copie:', err);
    }
  };

  const exportToPDF = () => {
    if (!results) return;

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const primaryColor = [59, 130, 246];
    const secondaryColor = [99, 102, 241];
    const accentColor = [16, 185, 129];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('ScreeningTest - Analyse Diagnostic', 105, 22, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Sensibilité, Spécificité, VPP et VPN', 105, 30, { align: 'center' });

    // Configuration
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Tableau de contingence 2×2', 20, 55);
    doc.setFontSize(12);
    doc.text(`Prévalence utilisée : ${results.usedPrev.toFixed(2)}%`, 20, 65);
    doc.text(`Effectif total : ${total}`, 20, 73);

    // Tableau des données
    const tableData = [
      ['', 'Test Positif', 'Test Négatif', 'Total'],
      ['Maladie Présente', tp.toString(), fn.toString(), diseased.toString()],
      ['Maladie Absente', fp.toString(), tn.toString(), healthy.toString()],
      ['Total', (tp + fp).toString(), (fn + tn).toString(), total.toString()]
    ];

    (doc as any).autoTable({
      startY: 90,
      head: [tableData[0]],
      body: tableData.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: secondaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 10,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 20, right: 20 },
      styles: {
        cellPadding: 6,
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      }
    });

    // Résultats statistiques
    const statsY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.text('Indicateurs de Performance', 20, statsY);

    const statsTable = [
      ['Sensibilité', `${results.sensitivity.toFixed(2)} %`, 'TP / (TP + FN)'],
      ['Spécificité', `${results.specificity.toFixed(2)} %`, 'TN / (TN + FP)'],
      ['Valeur Prédictive Positive', `${results.vpp.toFixed(2)} %`, 'TP / (TP + FP)'],
      ['Valeur Prédictive Négative', `${results.vpn.toFixed(2)} %`, 'TN / (TN + FN)']
    ];

    (doc as any).autoTable({
      startY: statsY + 10,
      head: [['Indicateur', 'Valeur', 'Formule']],
      body: statsTable,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center', fillColor: [240, 250, 255] },
        2: { fontStyle: 'italic', fontSize: 9 }
      },
      margin: { left: 20, right: 20 },
      styles: {
        cellPadding: 5
      }
    });

    // Interprétation
    const interpY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFillColor(240, 250, 255);
    doc.roundedRect(20, interpY, 170, 40, 3, 3, 'F');
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, interpY, 170, 40, 3, 3);
    
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('Interprétation Clinique', 25, interpY + 8);
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const interpLines = doc.splitTextToSize(results.interpretation, 160);
    doc.text(interpLines, 25, interpY + 16);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    const footerY = pageHeight - 15;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, footerY - 5, 190, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("ScreeningTest v1.0 - Outil d'analyse diagnostique", 105, footerY, { align: 'center' });
    
    doc.setFontSize(7);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, footerY);
    doc.text('Page 1/1', 190, footerY, { align: 'right' });

    doc.save(`ScreeningTest_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Charger les scripts externes
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

  // Calcul automatique quand les données changent
  useEffect(() => {
    if (tp || fp || fn || tn) {
      calculateResults();
    }
  }, [tableData, prevalence]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header avec Breadcrumb */}
        <div className="mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <a href="/" className="flex items-center text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  <Home className="w-4 h-4 mr-1" />
                  Accueil
                </a>
              </li>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
              <li>
                <span className="text-gray-900 dark:text-gray-100 font-medium">ScreeningTest</span>
              </li>
            </ol>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                ScreeningTest - Analyse Diagnostique
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Calcul des performances diagnostiques : Sensibilité, Spécificité, VPP et VPN
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Panel d'entrée */}
          <div className="space-y-6">
            {/* Carte d'entrée */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Table2 className="w-5 h-5 mr-2 text-blue-500" />
                  Tableau de contingence 2×2
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Saisissez les résultats de votre test de dépistage (TP, FP, FN, TN)
                </p>
              </div>
              
              <div className="p-6">
                {/* Tableau */}
                <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 shadow-inner">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                      <tr>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300 border-r dark:border-slate-600">
                          Maladie \ Test
                        </th>
                        <th className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300 border-r dark:border-slate-600">
                          Test Positif
                        </th>
                        <th className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300 border-r dark:border-slate-600">
                          Test Négatif
                        </th>
                        <th className="p-4 text-center font-semibold text-gray-700 dark:text-gray-300">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      <tr className="bg-white dark:bg-slate-800">
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-100 border-r dark:border-slate-700">
                          Maladie Présente
                        </td>
                        <td className="p-4 border-r dark:border-slate-700">
                          <input
                            type="number"
                            className="w-full px-3 py-2 text-center border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={tableData.tp}
                            onChange={(e) => setTableData({...tableData, tp: e.target.value})}
                            placeholder="TP"
                            min="0"
                          />
                        </td>
                        <td className="p-4 border-r dark:border-slate-700">
                          <input
                            type="number"
                            className="w-full px-3 py-2 text-center border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={tableData.fn}
                            onChange={(e) => setTableData({...tableData, fn: e.target.value})}
                            placeholder="FN"
                            min="0"
                          />
                        </td>
                        <td className="p-4 text-center font-semibold text-blue-600 dark:text-blue-400">
                          {diseased}
                        </td>
                      </tr>
                      <tr className="bg-white dark:bg-slate-800">
                        <td className="p-4 font-medium text-gray-900 dark:text-gray-100 border-r dark:border-slate-700">
                          Maladie Absente
                        </td>
                        <td className="p-4 border-r dark:border-slate-700">
                          <input
                            type="number"
                            className="w-full px-3 py-2 text-center border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={tableData.fp}
                            onChange={(e) => setTableData({...tableData, fp: e.target.value})}
                            placeholder="FP"
                            min="0"
                          />
                        </td>
                        <td className="p-4 border-r dark:border-slate-700">
                          <input
                            type="number"
                            className="w-full px-3 py-2 text-center border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={tableData.tn}
                            onChange={(e) => setTableData({...tableData, tn: e.target.value})}
                            placeholder="TN"
                            min="0"
                          />
                        </td>
                        <td className="p-4 text-center font-semibold text-blue-600 dark:text-blue-400">
                          {healthy}
                        </td>
                      </tr>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                        <td className="p-4 font-semibold text-gray-900 dark:text-gray-100 border-r dark:border-slate-600">
                          Total
                        </td>
                        <td className="p-4 text-center font-semibold text-gray-900 dark:text-gray-100 border-r dark:border-slate-600">
                          {tp + fp}
                        </td>
                        <td className="p-4 text-center font-semibold text-gray-900 dark:text-gray-100 border-r dark:border-slate-600">
                          {fn + tn}
                        </td>
                        <td className="p-4 text-center font-bold text-lg text-gray-900 dark:text-gray-100">
                          {total}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Prévalence */}
                <div className="mb-8">
                  <label htmlFor="prevalence" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <span className="flex items-center">
                      <Info className="w-4 h-4 mr-2" />
                      Prévalence de la maladie (optionnel)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="prevalence"
                      min="0"
                      max="100"
                      step="0.1"
                      value={prevalence}
                      onChange={(e) => setPrevalence(e.target.value)}
                      placeholder="Prévalence dans la population (%)"
                      className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                    <span className="absolute left-3 top-3 text-gray-400 dark:text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                    Si différente de l'échantillon, les VPP et VPN seront ajustées automatiquement
                  </p>
                </div>

                {/* Boutons d'action */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={calculateResults}
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-[1.02] transition-all duration-200"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculer
                  </button>
                  <button
                    onClick={clearData}
                    className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl shadow hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transform hover:scale-[1.02] transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Effacer
                  </button>
                  <button
                    onClick={loadExample}
                    className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl shadow hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transform hover:scale-[1.02] transition-all duration-200"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Exemple
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel des résultats */}
          <div className="space-y-6">
            {/* Carte des résultats */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-purple-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Résultats du ScreeningTest
                    </h2>
                  </div>
                  {results && (
                    <div className="flex gap-2">
                      <button
                        id="copy-btn"
                        onClick={copyResults}
                        className="p-2.5 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 hover:scale-105"
                        title="Copier les résultats"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="p-2.5 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-md"
                        title="Exporter en PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {results ? (
                  <div ref={resultsRef} className="space-y-6">
                    {/* Indicateurs principaux */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700 transition-all duration-500 opacity-0 translate-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              Sensibilité
                            </h3>
                            <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                              TP / (TP + FN)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {results.sensitivity.toFixed(1)}%
                            </div>
                            <div className={`text-xs font-medium mt-1 ${
                              results.sensitivity >= 90 ? 'text-green-600' : 
                              results.sensitivity >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {results.sensitivity >= 90 ? 'Excellent' : 
                               results.sensitivity >= 70 ? 'Bon' : 'À améliorer'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700 transition-all duration-500 opacity-0 translate-y-5 delay-150">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                              Spécificité
                            </h3>
                            <p className="text-xs text-purple-700/80 dark:text-purple-300/80">
                              TN / (TN + FP)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {results.specificity.toFixed(1)}%
                            </div>
                            <div className={`text-xs font-medium mt-1 ${
                              results.specificity >= 90 ? 'text-green-600' : 
                              results.specificity >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {results.specificity >= 90 ? 'Excellent' : 
                               results.specificity >= 70 ? 'Bon' : 'À améliorer'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-700 transition-all duration-500 opacity-0 translate-y-5 delay-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                              VPP
                            </h3>
                            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                              TP / (TP + FP)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                              {results.vpp.toFixed(1)}%
                            </div>
                            <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                              Prévalence: {results.usedPrev.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl p-5 border border-cyan-200 dark:border-cyan-700 transition-all duration-500 opacity-0 translate-y-5 delay-450">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-cyan-900 dark:text-cyan-100 mb-1">
                              VPN
                            </h3>
                            <p className="text-xs text-cyan-700/80 dark:text-cyan-300/80">
                              TN / (TN + FN)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                              {results.vpn.toFixed(1)}%
                            </div>
                            <div className="text-xs text-cyan-600/80 dark:text-cyan-400/80 mt-1">
                              Sécurité du test négatif
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interprétation */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-600/50 rounded-xl p-5 border border-gray-200/50 dark:border-slate-600/50 transition-all duration-700 opacity-0 translate-y-5 delay-600">
                      <div className="flex items-center mb-3">
                        <BarChart3 className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Interprétation Clinique
                        </h3>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {results.interpretation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center shadow-lg">
                      <PieChart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                      En attente de données
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Saisissez les valeurs TP, FP, FN, TN pour voir les résultats
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cartes d'information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <Shield className="w-5 h-5 mr-2 text-blue-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Sensibilité
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Capacité du test à identifier correctement les personnes malades.
                </p>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <code>Se = TP / (TP + FN)</code>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <AlertCircle className="w-5 h-5 mr-2 text-purple-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Spécificité
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Capacité du test à identifier correctement les personnes non malades.
                </p>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <code>Sp = TN / (TN + FP)</code>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    VPP
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Probabilité qu'une personne avec un test positif soit réellement malade.
                </p>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <code>VPP = TP / (TP + FP)</code>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-gray-200/50 dark:border-slate-700/50 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-3">
                  <CheckCircle className="w-5 h-5 mr-2 text-cyan-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    VPN
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Probabilité qu'une personne avec un test négatif soit réellement non malade.
                </p>
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                  <code>VPN = TN / (TN + FN)</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton d'aide flottant */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-3xl active:scale-105 group"
      >
        <HelpCircle className="w-7 h-7" />
        <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Aide & Documentation
        </span>
      </button>

      {/* Modale d'aide */}
      {showHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/50 my-8 w-full max-w-4xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <HelpCircle className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Guide d'utilisation - ScreeningTest
                </h3>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-8 text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[60vh]">
              <section>
                <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Comment utiliser ScreeningTest
                </h4>
                <div className="space-y-3 text-sm bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">1</span>
                    </div>
                    <div>
                      <strong>Vrais Positifs (TP)</strong> : Personnes malades avec test positif
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">2</span>
                    </div>
                    <div>
                      <strong>Faux Positifs (FP)</strong> : Personnes non malades avec test positif
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">3</span>
                    </div>
                    <div>
                      <strong>Faux Négatifs (FN)</strong> : Personnes malades avec test négatif
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mr-3">
                      <span className="font-bold text-blue-700 dark:text-blue-400">4</span>
                    </div>
                    <div>
                      <strong>Vrais Négatifs (TN)</strong> : Personnes non malades avec test négatif
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Interprétation des indicateurs
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/10 rounded-xl p-4 border border-blue-200 dark:border-blue-700/30">
                    <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      Sensibilité
                    </h5>
                    <p className="text-sm">
                      <strong>Idéal : &gt;90%</strong> pour les tests de dépistage<br/>
                      Détecte les malades, minimise les faux négatifs
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 rounded-xl p-4 border border-purple-200 dark:border-purple-700/30">
                    <h5 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">
                      Spécificité
                    </h5>
                    <p className="text-sm">
                      <strong>Idéal : &gt;90%</strong> pour les tests de confirmation<br/>
                      Exclut les non-malades, minimise les faux positifs
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/10 dark:to-emerald-800/10 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700/30">
                    <h5 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                      VPP (Valeur Prédictive Positive)
                    </h5>
                    <p className="text-sm">
                      <strong>Dépend de la prévalence</strong><br/>
                      Augmente quand la prévalence augmente
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/10 dark:to-cyan-800/10 rounded-xl p-4 border border-cyan-200 dark:border-cyan-700/30">
                    <h5 className="font-semibold text-cyan-800 dark:text-cyan-300 mb-2">
                      VPN (Valeur Prédictive Négative)
                    </h5>
                    <p className="text-sm">
                      <strong>Dépend de la prévalence</strong><br/>
                      Augmente quand la prévalence diminue
                    </p>
                  </div>
                </div>
              </section>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-700/50 p-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}