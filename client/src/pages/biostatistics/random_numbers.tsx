import { useState } from 'react';
import { Blocks, ChevronRight, Calculator, Presentation, Copy, FileDown, HelpCircle, RotateCcw, X, Info } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Random Number Generator
 * 
 * This component mimics the "Random Numbers" tool from OpenEpi.
 * It generates random integers within a user-defined range, with an option
 * for unique numbers (sampling without replacement). The generated numbers
 * can be copied to the clipboard or exported as a PDF report.
 * 
 * The randomness relies on JavaScript's Math.random(), which is considered
 * sufficient for most non-cryptographic purposes in modern browsers.
 */

export default function RandomNumberGenerator() {
  // State for input fields
  const [min, setMin] = useState<string>('');        // Minimum value (inclusive)
  const [max, setMax] = useState<string>('');        // Maximum value (inclusive)
  const [count, setCount] = useState<string>('');    // Number of values to generate
  const [unique, setUnique] = useState<boolean>(false); // If true, numbers are drawn without replacement
  const [results, setResults] = useState<number[]>([]); // Array of generated numbers
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false); // Controls help modal visibility

  /**
   * Generates random numbers based on current input parameters.
   * Validates inputs, shows error toasts if constraints are violated,
   * and updates the results state.
   */
  const generateNumbers = () => {
    // Parse inputs with fallback defaults
    const minVal = parseInt(min) || 1;
    const maxVal = parseInt(max) || 15;
    const countVal = parseInt(count) || 10;

    // Basic validation: min <= max
    if (minVal > maxVal) {
      toast.error('Le minimum doit être inférieur ou égal au maximum');
      return;
    }

    // When unique is requested, ensure the pool size is sufficient
    if (unique && countVal > (maxVal - minVal + 1)) {
      toast.error('Le nombre demandé dépasse la plage disponible pour des nombres uniques');
      return;
    }

    const numbers: number[] = [];

    if (unique) {
      // Create a pool of all possible integers in the range
      const pool = Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i);
      // Randomly pick without replacement
      for (let i = 0; i < countVal; i++) {
        const index = Math.floor(Math.random() * pool.length);
        // splice removes the chosen element and returns it
        numbers.push(pool.splice(index, 1)[0]);
      }
    } else {
      // Simple random generation with replacement
      for (let i = 0; i < countVal; i++) {
        numbers.push(Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal);
      }
    }

    setResults(numbers);
  };

  /**
   * Resets all input fields and clears the results.
   * Shows a confirmation toast.
   */
  const clear = () => {
    setMin('');
    setMax('');
    setCount('');
    setUnique(false);
    setResults([]);
    toast.info('Champs réinitialisés');
  };

  /**
   * Loads a predefined example configuration and immediately generates numbers.
   */
  const loadExample = () => {
    setMin('1');
    setMax('15');
    setCount('10');
    setUnique(false);
    // Generate numbers after state updates (use setTimeout to ensure state is applied)
    // Alternatively, call generateNumbers directly; it will use the new values because
    // the state updates are batched and the function reads the updated state.
    generateNumbers();
    toast.success('Exemple chargé');
  };

  /**
   * Copies the generated numbers to the clipboard as a newline-separated list.
   */
  const copyResults = async () => {
    if (results.length === 0) return;
    const text = results.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Nombres copiés');
    } catch {
      toast.error('Échec de la copie');
    }
  };

  /**
   * Exports the current results to a PDF report.
   * Uses jsPDF and autoTable to create a formatted document.
   */
  const exportPDF = () => {
    if (results.length === 0) {
      toast.error('Veuillez générer des nombres d\'abord');
      return;
    }

    try {
      const doc = new jsPDF();

      // Colour palette (matching Tailwind slate)
      const colorPrimary = [59, 130, 246]; // blue-500
      const colorSlate = {
        50: [248, 250, 252],
        100: [241, 245, 249],
        200: [226, 232, 240],
        300: [203, 213, 225],
        500: [100, 116, 139],
        700: [51, 65, 85],
        900: [15, 23, 42],
      };

      // Helper for consistent rounded rectangles
      const roundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
        doc.roundedRect(x, y, w, h, r, r, style);
      };

      // ----- Header -----
      doc.setFillColor(...colorSlate[50]);
      roundedRect(0, 0, 210, 40, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text("Rapport Générateur de Nombres Aléatoires", 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 20, 32);
      doc.text('Générateur Random – OpenEpi', 190, 32, { align: 'right' });

      // ----- Input parameters section -----
      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text('Paramètres', 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`Minimum : ${min}`, 25, y); y += 6;
      doc.text(`Maximum : ${max}`, 25, y); y += 6;
      doc.text(`Nombre de valeurs : ${count}`, 25, y); y += 6;
      doc.text(`Uniques : ${unique ? 'Oui' : 'Non'}`, 25, y); y += 12;

      // ----- Generated numbers table -----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Nombres générés', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = results.map(num => [num.toString()]);

      autoTable(doc, {
        startY: y,
        head: [['Nombres aléatoires']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: colorPrimary as [number, number, number],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 170, halign: 'center' }
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // ----- Notes section -----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Notes', 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const notes = "Les nombres sont générés par la fonction JavaScript Math.random(). Bien que ce soient de pseudo-nombres aléatoires, la fonction Math.random dans les navigateurs courants a été testée par de nombreuses personnes et il a été trouvé qu’elle génère des nombres 'aléatoires' de grande qualité. Pour plus d’informations, recherchez sur Internet 'Nombres aléatoires de qualité' et les sujets relatifs.";
      const splitNotes = doc.splitTextToSize(notes, 170);
      doc.text(splitNotes, 20, y);

      // ----- Footer -----
      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text('Générateur Random – Fidèle à OpenEpi', 20, footerY + 5);
      doc.text(`Page 1 / 1`, 190, footerY + 5, { align: 'right' });

      doc.save('Rapport_Nombres_Aleatoires.pdf');
      toast.success('Rapport PDF exporté avec succès');
    } catch (error) {
      console.error('Erreur PDF :', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Breadcrumb navigation */}
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">Générateur de Nombres Aléatoires</span></li>
          </ol>
        </nav>

        {/* Header with title and help button */}
        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Générateur de Nombres Aléatoires</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Génère des nombres aléatoires comme dans OpenEpi Random.</p>
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
          {/* Left column – input form */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> Paramètres
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Minimum
                  </label>
                  <input
                    type="number"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Maximum
                  </label>
                  <input
                    type="number"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    Nombre de valeurs
                  </label>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="10"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={unique}
                    onChange={(e) => setUnique(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nombres uniques (sans remplacement)
                  </label>
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
          </div>

          {/* Right column – results display */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> Résultats
                </h2>
                {results.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title="Copier les nombres"
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
                {results.length === 0 ? (
                  // Placeholder when no results
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">Saisissez les données pour l'analyse</p>
                    <div className="text-4xl font-bold mt-2">
                      0.00
                    </div>
                  </div>
                ) : (
                  // Results area
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Summary card */}
                    <div className="p-8 rounded-3xl text-center border bg-slate-50/50 border-slate-100 dark:bg-slate-700/50 dark:border-slate-600">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Nombres aléatoires générés
                      </p>
                      <div className="text-5xl font-bold tracking-tight mb-2 text-indigo-600">
                        {results.length}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        De {min} à {max}
                      </span>
                    </div>

                    {/* Grid of generated numbers */}
                    <div className="grid grid-cols-5 gap-4">
                      {results.map((num, index) => (
                        <div key={index} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg text-center font-mono">
                          {num}
                        </div>
                      ))}
                    </div>

                    {/* Notes panel (same as in PDF) */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> Notes
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                        Imprimez les nombres depuis le menu Fichier du navigateur ou copiez et collez-les dans des traitements de textes, Excel et autres programmes.

                        Les nombres sont générés par la fonction JavaScript Math.random(). Bien que ce soient de pseudo-nombres aléatoires, la fonction Math.random dans les navigateurs courants a été testée par de nombreuses personnes et il a été trouvé qu’elle génère des nombres 'aléatoires' de grande qualité. Pour plus d’informations, recherchez sur Internet 'Nombres aléatoires de qualité' et les sujets relatifs.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide Rapide</h3>
                <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6 text-slate-600 dark:text-slate-300">
                <section>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      1
                    </div>
                    Principes
                  </h4>
                  <p className="text-sm leading-relaxed">
                    Ce générateur produit des nombres entiers aléatoires dans un intervalle défini par l'utilisateur.
                    L'option "Nombres uniques" permet un tirage sans remplacement, utile pour des échantillons sans répétition.
                  </p>
                </section>

                <section>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      2
                    </div>
                    Paramètres
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Minimum / Maximum</strong> : bornes inclusives de l'intervalle.</li>
                    <li><strong>Nombre de valeurs</strong> : combien de nombres générer.</li>
                    <li><strong>Nombres uniques</strong> : chaque nombre apparaît au plus une fois (nécessite que le nombre demandé soit ≤ la taille de l'intervalle).</li>
                  </ul>
                </section>

                <section>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      3
                    </div>
                    Méthodes aléatoires
                  </h4>
                  <p className="text-sm leading-relaxed">
                    La génération utilise <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Math.random()</code> de JavaScript,
                    qui produit une valeur pseudo-aléatoire uniforme entre 0 (inclus) et 1 (exclu). 
                    Pour les entiers, on applique la formule standard : 
                    <br />
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Math.floor(Math.random() * (max - min + 1)) + min</code>.
                  </p>
                </section>

                <section>
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
                      ''
                    </div>
                    Références
                  </h4>
                  
                  <p className="text-sm leading-relaxed">
                    Cet outil s'inspire du module "Random Numbers" du logiciel épidémiologique OpenEpi.
                    Pour plus d'informations sur la génération de nombres aléatoires en JavaScript, consultez la 
                    <a href="https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Math/random" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">documentation</a>.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}