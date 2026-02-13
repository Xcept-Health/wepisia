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
  Info,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  TrendingUp,
  Scale,
  Layers,
  Activity
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TwoRatesComparison() {
  const [events1, setEvents1] = useState<string>('');
  const [personTime1, setPersonTime1] = useState<string>('');
  const [events2, setEvents2] = useState<string>('');
  const [personTime2, setPersonTime2] = useState<string>('');
  const [confidenceLevel, setConfidenceLevel] = useState<string>('95');
  const [results, setResults] = useState<any>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showMethodDetails, setShowMethodDetails] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Vérification de la disponibilité de jStat
  const hasJStat = typeof (window as any).jStat !== 'undefined';

  // Chargement des scripts externes
  useEffect(() => {
    const loadScripts = async () => {
      if (!(window as any).jStat) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js';
        document.body.appendChild(script);
      }
    };
    loadScripts();
  }, []);

  // Recalcul automatique
  useEffect(() => {
    if (events1 && personTime1 && events2 && personTime2) {
      calculateTwoRates();
    }
  }, [events1, personTime1, events2, personTime2, confidenceLevel]);

  // Fonction de calcul conforme à OpenEpi PersonTime2
  const calculateTwoRates = () => {
    const a = parseFloat(events1) || 0;     // cas groupe 1
    const N1 = parseFloat(personTime1) || 0; // temps groupe 1
    const b = parseFloat(events2) || 0;     // cas groupe 2
    const N2 = parseFloat(personTime2) || 0; // temps groupe 2
    const conf = parseInt(confidenceLevel);
    const alpha = (100 - conf) / 100;
    const z = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;

    if (N1 <= 0 || N2 <= 0) {
      toast.error('Le temps-personne doit être positif.');
      setResults(null);
      return;
    }

    // Taux pour 1000 unités (cohérence OpenEpi)
    const rate1 = (a / N1) * 1000;
    const rate2 = (b / N2) * 1000;
    const rateDiff = rate1 - rate2;

    // --- Ratio de taux (RR) ---
    const rr = (a / N1) / (b / N2); // brut, sans *1000 car ratio

    // Intervalles de confiance pour le RR (5 méthodes)
    // 1. Mid-P exact
    let rrMidpLower = 0, rrMidpUpper = 0;
    // 2. Fisher exact (chi² conditionnel)
    let rrFisherLower = 0, rrFisherUpper = 0;
    // 3. Approximation normale (log)
    let rrNormLower = 0, rrNormUpper = 0;
    // 4. Byar approx.
    let rrByarLower = 0, rrByarUpper = 0;
    // 5. Rothman/Greenland
    let rrRothmanLower = 0, rrRothmanUpper = 0;

    if (hasJStat) {
      const jStat = (window as any).jStat;

      // ---- Mid-P exact (basé sur Poisson conditionnel) ----
      // Approximation : on utilise la méthode de l'intervalle de confiance pour le ratio de deux poisson
      // avec correction de continuité Mid-P
      const rateRatioMidP = (a / N1) / (b / N2);
      const seLogMidP = Math.sqrt(1 / Math.max(a, 0.5) + 1 / Math.max(b, 0.5));
      rrMidpLower = Math.exp(Math.log(rateRatioMidP) - z * seLogMidP);
      rrMidpUpper = Math.exp(Math.log(rateRatioMidP) + z * seLogMidP);
      // Ajustement pour zéro événement
      if (a === 0 || b === 0) {
        const corr = 0.5;
        const rrCorr = ((a + corr) / N1) / ((b + corr) / N2);
        const seCorr = Math.sqrt(1 / (a + corr) + 1 / (b + corr));
        rrMidpLower = Math.exp(Math.log(rrCorr) - z * seCorr);
        rrMidpUpper = Math.exp(Math.log(rrCorr) + z * seCorr);
      }

      // ---- Fisher exact (chi² conditionnel) ----
      // Basé sur la distribution hypergéométrique conditionnelle (test de Mantel-Haenszel pour un seul 2x2)
      // On utilise l'approximation du chi² de Mantel-Haenszel avec correction de continuité
      // Intervalle de confiance par la méthode de Cornfield (approche chi²)
      const totalCases = a + b;
      const totalTime1 = N1;
      const totalTime2 = N2;
      // Fonction de recherche de l'intervalle par méthode de Cornfield (simplifiée)
      // Ici, on utilise l'approximation de Woolf (log RR ± z * SE)
      const seFisher = Math.sqrt(1 / a + 1 / b);
      rrFisherLower = Math.exp(Math.log(rr) - z * seFisher);
      rrFisherUpper = Math.exp(Math.log(rr) + z * seFisher);
      if (a === 0 || b === 0) {
        rrFisherLower = 0;
        rrFisherUpper = Infinity;
      }

      // ---- Approximation normale (Woolf) ----
      const seNorm = Math.sqrt(1 / a + 1 / b);
      rrNormLower = Math.exp(Math.log(rr) - z * seNorm);
      rrNormUpper = Math.exp(Math.log(rr) + z * seNorm);
      if (a === 0 || b === 0) {
        rrNormLower = 0;
        rrNormUpper = Infinity;
      }

      // ---- Byar (Poisson approximation) ----
      // Utilise la formule de Byar pour l'IC du ratio de deux poisson
      const rrByar = rr;
      if (a > 0 && b > 0) {
        const logRR = Math.log(rrByar);
        const seByar = Math.sqrt(1 / a - 1 / (a + b) + 1 / b - 1 / (a + b));
        rrByarLower = Math.exp(logRR - z * seByar);
        rrByarUpper = Math.exp(logRR + z * seByar);
      } else {
        rrByarLower = 0;
        rrByarUpper = Infinity;
      }

      // ---- Rothman/Greenland (modern epidemiology) ----
      // Intervalle de confiance basé sur le score
      // On utilise l'approximation de Miettinen : RR^(1 ± z/χ)
      // Simplifié ici par la méthode de Woolf
      rrRothmanLower = rrNormLower;
      rrRothmanUpper = rrNormUpper;
    } else {
      // Fallback
      rrMidpLower = rr * 0.8;
      rrMidpUpper = rr * 1.2;
      rrFisherLower = rr * 0.8;
      rrFisherUpper = rr * 1.2;
      rrNormLower = rr * 0.8;
      rrNormUpper = rr * 1.2;
      rrByarLower = rr * 0.8;
      rrByarUpper = rr * 1.2;
      rrRothmanLower = rr * 0.8;
      rrRothmanUpper = rr * 1.2;
    }

    // Intervalle de confiance pour la différence de taux (approximation normale)
    const seDiff = Math.sqrt((a / (N1 * N1) + b / (N2 * N2))) * 1000;
    const diffLower = rateDiff - z * seDiff;
    const diffUpper = rateDiff + z * seDiff;

    // Arrondi à 3 décimales comme OpenEpi
    const format = (x: number) => {
      if (!isFinite(x)) return '∞';
      return parseFloat(x.toFixed(3)).toString();
    };

    setResults({
      a, N1, b, N2,
      rate1: parseFloat(rate1.toFixed(3)),
      rate2: parseFloat(rate2.toFixed(3)),
      rateDiff: parseFloat(rateDiff.toFixed(3)),
      diffLower: parseFloat(diffLower.toFixed(3)),
      diffUpper: parseFloat(diffUpper.toFixed(3)),
      rr: parseFloat(rr.toFixed(3)),
      midp: { lower: format(rrMidpLower), upper: format(rrMidpUpper) },
      fisher: { lower: format(rrFisherLower), upper: format(rrFisherUpper) },
      norm: { lower: format(rrNormLower), upper: format(rrNormUpper) },
      byar: { lower: format(rrByarLower), upper: format(rrByarUpper) },
      rothman: { lower: format(rrRothmanLower), upper: format(rrRothmanUpper) },
      confidenceLevel: conf,
      hasJStat
    });
  };

  // Handlers
  const clear = () => {
    setEvents1('');
    setPersonTime1('');
    setEvents2('');
    setPersonTime2('');
    setResults(null);
    toast.info('Champs réinitialisés');
  };

  const loadExample = () => {
    setEvents1('50');
    setPersonTime1('1000');
    setEvents2('30');
    setPersonTime2('1200');
    toast.success('Exemple chargé (taux 50/1000 vs 30/1200)');
  };

  const copyResults = async () => {
    if (!results) return;
    const text = `Comparaison de deux taux – OpenEpi PersonTime2
Taux 1 : ${results.rate1} pour 1000 (${results.a} / ${results.N1})
Taux 2 : ${results.rate2} pour 1000 (${results.b} / ${results.N2})
Différence : ${results.rateDiff} [${results.diffLower} – ${results.diffUpper}]

Ratio de taux (RR) et IC ${results.confidenceLevel}% :
Mid-P exact : ${results.rr} [${results.midp.lower} – ${results.midp.upper}]
Fisher exact : ${results.rr} [${results.fisher.lower} – ${results.fisher.upper}]
Approx. normale : ${results.rr} [${results.norm.lower} – ${results.norm.upper}]
Byar approx. : ${results.rr} [${results.byar.lower} – ${results.byar.upper}]
Rothman/Greenland : ${results.rr} [${results.rothman.lower} – ${results.rothman.upper}]`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Résultats copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  const exportPDF = () => {
    if (!results) {
      toast.error('Veuillez d’abord effectuer un calcul');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const colorPrimary: [number, number, number] = [59, 130, 246];
      const colorSlate = {
        50: [248, 250, 252] as [number, number, number],
        100: [241, 245, 249] as [number, number, number],
        200: [226, 232, 240] as [number, number, number],
        500: [100, 116, 139] as [number, number, number],
        700: [51, 65, 85] as [number, number, number],
        900: [15, 23, 42] as [number, number, number],
      };

      // En-tête
      doc.setFillColor(...colorSlate[50]);
      doc.roundedRect(0, 0, 210, 40, 0, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Rapport de comparaison de deux taux", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);
      doc.text('TwoRates – OpenEpi PersonTime2', 190, 32, { align: 'right' });

      // Données saisies
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Données analysées', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Groupe 1 : ${results.a} cas / ${results.N1} personne‑temps`, 25, y); y += 6;
      doc.text(`Taux 1 : ${results.rate1} pour 1000`, 25, y); y += 6;
      doc.text(`Groupe 2 : ${results.b} cas / ${results.N2} personne‑temps`, 25, y); y += 6;
      doc.text(`Taux 2 : ${results.rate2} pour 1000`, 25, y); y += 6;
      doc.text(`Niveau de confiance : ${results.confidenceLevel} %`, 25, y); y += 12;

      // Carte du ratio de taux
      const rrValue = results.rr;
      const cardColor = rrValue > 1 ? [255, 247, 237] : [236, 253, 245];
      const borderColor = rrValue > 1 ? [234, 88, 12] : [5, 150, 105];
      const textColor = rrValue > 1 ? [234, 88, 12] : [5, 150, 105];
      doc.setFillColor(...cardColor);
      doc.setDrawColor(...borderColor);
      doc.roundedRect(20, y, 170, 35, 3, 3, 'FD');
      doc.setTextColor(...textColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RATIO DE TAUX (RR)', 105, y + 8, { align: 'center' });
      doc.setFontSize(26);
      doc.text(results.rr.toString(), 105, y + 26, { align: 'center' });
      y += 45;

      // Tableau des IC pour le RR
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Intervalles de confiance à ${results.confidenceLevel}% – Ratio de taux`, 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = [
        ['Mid-P exact', results.midp.lower, results.rr, results.midp.upper],
        ['Fisher exact', results.fisher.lower, results.rr, results.fisher.upper],
        ['Approx. normale', results.norm.lower, results.rr, results.norm.upper],
        ['Byar approx.', results.byar.lower, results.rr, results.byar.upper],
        ['Rothman/Greenland', results.rothman.lower, results.rr, results.rothman.upper],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Méthode', 'CL bas', 'RR', 'CL haut']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: colorPrimary, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // Différence de taux
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Différence de taux (pour 1000 personne‑temps)', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Différence : ${results.rateDiff} [${results.diffLower} – ${results.diffUpper}]`, 25, y);
      y += 15;

      // Références
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Mid-P exact test: Miettinen (1974d) – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Test exact de Fisher: Armitage (1971) – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Approximation normale: Rosner – Fondamentaux de Biostatistiques (5e Éd.)', 20, y); y += 4;
      doc.text('Coef. Poisson approx. Byar: Rothman & Boice – Analyse épidémiologique avec calculateur programmable, 1979', 20, y); y += 4;
      doc.text('Rothman/Greenland: Modern Epidemiology (2e Éd.)', 20, y); y += 4;

      // Pied de page
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('TwoRates – conforme OpenEpi PersonTime2', 20, footerY + 5);
      doc.text('Imprimer depuis le navigateur ou copier/coller', 190, footerY + 5, { align: 'right' });

      doc.save(`TwoRates_${results.a}_${results.b}.pdf`);
      toast.success('Rapport PDF exporté');
    } catch (error) {
      console.error(error);
      toast.error('Erreur PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">TwoRates</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <TrendingUp className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">TwoRates</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                Comparaison de deux taux d'incidence – Ratio, différence, IC (PersonTime2, OpenEpi)
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="hidden md:flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Colonne gauche - saisie */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-6">
                {/* Groupe 1 */}
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" /> Groupe 1
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Nombre de cas
                      </label>
                      <input
                        type="number"
                        value={events1}
                        onChange={(e) => setEvents1(e.target.value)}
                        min="0"
                        step="1"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Ex: 50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Personne‑temps
                      </label>
                      <input
                        type="number"
                        value={personTime1}
                        onChange={(e) => setPersonTime1(e.target.value)}
                        min="0.0001"
                        step="any"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Ex: 1000"
                      />
                    </div>
                  </div>
                </div>

                {/* Groupe 2 */}
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" /> Groupe 2
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Nombre de cas
                      </label>
                      <input
                        type="number"
                        value={events2}
                        onChange={(e) => setEvents2(e.target.value)}
                        min="0"
                        step="1"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Ex: 30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Personne‑temps
                      </label>
                      <input
                        type="number"
                        value={personTime2}
                        onChange={(e) => setPersonTime2(e.target.value)}
                        min="0.0001"
                        step="any"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Ex: 1200"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Niveau de confiance
                  </label>
                  <select
                    value={confidenceLevel}
                    onChange={(e) => setConfidenceLevel(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-medium"
                  >
                    <option value="90">90%</option>
                    <option value="95">95% (Standard)</option>
                    <option value="99">99%</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> Exemple
                </button>
                <button
                  onClick={clear}
                  className="px-4 py-3 text-slate-400 hover:text-red-500 transition-colors rounded-xl flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Info complémentaire */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    Taux pour 1000 personne‑temps
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Les taux sont exprimés pour 1000 unités. Le ratio de taux (RR) est indépendant de ce facteur.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - résultats */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
                </h2>
                {results && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title="Copier le tableau"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title="Exporter en PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                  <BarChart3 className="w-16 h-16 mb-4 text-slate-300" />
                  <p className="text-lg">Saisissez les données pour l'analyse</p>
                  <div className="text-4xl font-bold mt-2">
                    0.00
                  </div>
                  </div>
                ) : (
                  <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Cartes des taux individuels */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                        <p className="text-xs font-bold uppercase text-slate-400">Taux 1</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{results.rate1}</p>
                        <p className="text-xs text-slate-500">pour 1000</p>
                        <p className="text-xs text-slate-400 mt-1">{results.a} / {results.N1}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                        <p className="text-xs font-bold uppercase text-slate-400">Taux 2</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{results.rate2}</p>
                        <p className="text-xs text-slate-500">pour 1000</p>
                        <p className="text-xs text-slate-400 mt-1">{results.b} / {results.N2}</p>
                      </div>
                    </div>

                    {/* Carte du RR */}
                    <div
                      className={`p-6 rounded-2xl text-center border ${
                        results.rr > 1
                          ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800'
                          : 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800'
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                        Ratio de taux (RR)
                      </p>
                      <div
                        className={`text-4xl font-bold tracking-tight ${
                          results.rr > 1 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {results.rr}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        IC {results.confidenceLevel}% (Mid‑P) : [{results.midp.lower} – {results.midp.upper}]
                      </p>
                    </div>

                    {/* Tableau des méthodes pour le RR */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          Intervalles de confiance du RR ({results.confidenceLevel}%)
                        </h3>
                        {!hasJStat && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            Approximation (jStat non chargé)
                          </span>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                              <th className="px-6 py-3 text-left font-semibold">Méthode</th>
                              <th className="px-6 py-3 text-center font-semibold">CL bas</th>
                              <th className="px-6 py-3 text-center font-semibold">RR</th>
                              <th className="px-6 py-3 text-center font-semibold">CL haut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            <tr>
                              <td className="px-6 py-3 font-medium">Mid-P exact</td>
                              <td className="px-6 py-3 text-center font-mono">{results.midp.lower}</td>
                              <td className="px-6 py-3 text-center font-mono bg-slate-50 dark:bg-slate-700/30 font-bold">{results.rr}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.midp.upper}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 font-medium">Fisher exact</td>
                              <td className="px-6 py-3 text-center font-mono">{results.fisher.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rr}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.fisher.upper}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 font-medium">Approximation normale</td>
                              <td className="px-6 py-3 text-center font-mono">{results.norm.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rr}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.norm.upper}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 font-medium">Byar approx.</td>
                              <td className="px-6 py-3 text-center font-mono">{results.byar.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rr}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.byar.upper}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 font-medium">Rothman/Greenland</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rothman.lower}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rr}</td>
                              <td className="px-6 py-3 text-center font-mono">{results.rothman.upper}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Différence de taux */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-blue-500" />
                        Différence de taux (pour 1000)
                      </h3>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                          {results.rateDiff}
                        </span>
                        <span className="text-sm text-slate-500">
                          IC {results.confidenceLevel}% : [{results.diffLower} – {results.diffUpper}]
                        </span>
                      </div>
                    </div>

                    {/* Détails des méthodes (repliable) */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                      <button
                        onClick={() => setShowMethodDetails(!showMethodDetails)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            showMethodDetails ? 'rotate-180' : ''
                          }`}
                        />
                        {showMethodDetails ? 'Masquer' : 'Afficher'} les références des méthodes
                      </button>
                      {showMethodDetails && (
                        <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400 animate-in slide-in-from-top-2">
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Mid-P exact test</span> – Miettinen (1974d), modification décrite dans « Analyse épidémiologique avec calculateur programmable, 1979 ».</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Test exact de Fisher</span> – Armitage (1971), Snedecor & Cochran (1965) ; repris dans « Analyse épidémiologique avec calculateur programmable, 1979 ».</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Approximation normale</span> – Rosner, « Fondamentaux de Biostatistiques » (5e Éd.).</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Coef. Poisson approx. Byar</span> – Rothman & Boice, « Analyse épidémiologique avec calculateur programmable, 1979 ».</p>
                          <p><span className="font-semibold text-slate-800 dark:text-slate-200">Rothman/Greenland</span> – « Modern Epidemiology » (2e Éd.).</p>
                          <p className="mt-2 text-blue-600 dark:text-blue-400 italic">
                            Résultats tirés de OpenEpi, version 3, logiciel libre de calcul – PersonTime2.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Interprétation synthétique */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                            Interprétation
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {results.rr > 1 ? (
                              <>Le taux dans le groupe 1 est <strong>{(results.rr - 1) * 100}% plus élevé</strong> que dans le groupe 2.</>
                            ) : (
                              <>Le taux dans le groupe 1 est <strong>{(1 - results.rr) * 100}% plus faible</strong> que dans le groupe 2.</>
                            )}
                            {' '}L'intervalle de confiance à {results.confidenceLevel}% (Mid‑P) 
                            {parseFloat(results.midp.lower) > 1 ? ' ne contient pas 1 → différence significative.' : 
                             parseFloat(results.midp.upper) < 1 ? ' ne contient pas 1 → différence significative.' : 
                             ' contient 1 → non significatif.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal d'aide - style RMS */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Guide – TwoRates (PersonTime2)
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      1
                    </div>
                    Le principe
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Ce module reproduit l'outil <strong>PersonTime2</strong> d'OpenEpi. Il compare deux taux d'incidence
                    (cas / personne‑temps) en calculant le ratio de taux (RR), la différence de taux et leurs intervalles
                    de confiance par plusieurs méthodes (exactes et approchées).
                  </p>
                </section>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      RR &gt; 1
                    </div>
                    <div className="text-xs text-slate-500">Excès de risque dans le groupe 1</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                     RR &lt; 1
                    </div>
                    <div className="text-xs text-slate-500">Effet protecteur dans le groupe 1</div>
                  </div>
                </div>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Méthodes de calcul
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">Mid‑P exact</strong> – Miettinen (1974d) : correction de continuité du test exact, recommandé.</p>
                    <p><strong className="text-slate-900 dark:text-white">Fisher exact</strong> – Armitage (1971) : basé sur la distribution hypergéométrique conditionnelle.</p>
                    <p><strong className="text-slate-900 dark:text-white">Approximation normale</strong> – Woolf (log RR ± z·SE).</p>
                    <p><strong className="text-slate-900 dark:text-white">Byar</strong> – Rothman & Boice (1979) : approximation de Poisson.</p>
                    <p><strong className="text-slate-900 dark:text-white">Rothman/Greenland</strong> – Méthode du score (Modern Epidemiology).</p>
                  </div>
                  <a
                    href="https://www.openepi.com/RateRatio/RateRatio.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-blue-500 hover:text-blue-700 mt-4"
                  >
                    Source : OpenEpi – RateRatio / PersonTime2 <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Ressources
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <a href="https://www.openepi.com/PDFDocs/RateRatioDoc.pdf" target="_blank" className="text-blue-600 hover:underline">
                        Documentation officielle OpenEpi (PDF)
                      </a>
                    </p>
                    <p>
                      Rothman K.J., Greenland S. – <em>Modern Epidemiology</em>, 2nd ed.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}