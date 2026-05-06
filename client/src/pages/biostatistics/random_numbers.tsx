import { useState } from 'react';
import {
  Blocks, ChevronRight, Calculator, Presentation,
  Copy, FileDown, HelpCircle, RotateCcw, X, Info,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RandomNumberGenerator() {
  const { t, i18n } = useTranslation();

  const [min, setMin] = useState<string>('');
  const [max, setMax] = useState<string>('');
  const [count, setCount] = useState<string>('');
  const [unique, setUnique] = useState<boolean>(false);
  const [results, setResults] = useState<number[]>([]);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const generateNumbers = () => {
    const minVal = parseInt(min) || 1;
    const maxVal = parseInt(max) || 15;
    const countVal = parseInt(count) || 10;

    if (minVal > maxVal) {
      toast.error(t('randomNumberGenerator.errorMinMax'));
      return;
    }

    if (unique && countVal > (maxVal - minVal + 1)) {
      toast.error(t('randomNumberGenerator.errorUniqueRange'));
      return;
    }

    const numbers: number[] = [];

    if (unique) {
      const pool = Array.from({ length: maxVal - minVal + 1 }, (_, i) => minVal + i);
      for (let i = 0; i < countVal; i++) {
        const index = Math.floor(Math.random() * pool.length);
        numbers.push(pool.splice(index, 1)[0]);
      }
    } else {
      for (let i = 0; i < countVal; i++) {
        numbers.push(Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal);
      }
    }

    setResults(numbers);
  };

  const clear = () => {
    setMin('');
    setMax('');
    setCount('');
    setUnique(false);
    setResults([]);
    toast.info(t('randomNumberGenerator.clearMessage'));
  };

  const loadExample = () => {
    setMin('1');
    setMax('15');
    setCount('10');
    setUnique(false);
    generateNumbers();
    toast.success(t('randomNumberGenerator.exampleLoaded'));
  };

  const copyResults = async () => {
    if (results.length === 0) return;
    const text = results.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('randomNumberGenerator.copySuccess'));
    } catch {
      toast.error(t('randomNumberGenerator.copyError'));
    }
  };

  const exportPDF = () => {
    if (results.length === 0) {
      toast.error(t('randomNumberGenerator.exportNoResults'));
      return;
    }

    try {
      const doc = new jsPDF();

      const colorPrimary = [59, 130, 246];
      const colorSlate = {
        50: [248, 250, 252],
        100: [241, 245, 249],
        200: [226, 232, 240],
        300: [203, 213, 225],
        500: [100, 116, 139],
        700: [51, 65, 85],
        900: [15, 23, 42],
      };

      const roundedRect = (x: number, y: number, w: number, h: number, r: number, style: 'F' | 'S' | 'FD' = 'F') => {
        doc.roundedRect(x, y, w, h, r, r, style);
      };

      // Header
      doc.setFillColor(...colorSlate[50]);
      roundedRect(0, 0, 210, 40, 0, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('randomNumberGenerator.reportTitle'), 20, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[500]);
      const dateStr = new Date().toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = new Date().toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
      doc.text(t('randomNumberGenerator.reportGenerated', { date: dateStr, time: timeStr }), 20, 32);
      doc.text(t('randomNumberGenerator.reportSubtitle'), 190, 32, { align: 'right' });

      let y = 55;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colorSlate[900]);
      doc.text(t('randomNumberGenerator.parametersTitle'), 20, y);
      y += 3;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colorSlate[700]);
      doc.text(`${t('randomNumberGenerator.minLabel')} : ${min}`, 25, y); y += 6;
      doc.text(`${t('randomNumberGenerator.maxLabel')} : ${max}`, 25, y); y += 6;
      doc.text(`${t('randomNumberGenerator.countLabel')} : ${count}`, 25, y); y += 6;
      doc.text(`${t('randomNumberGenerator.uniqueLabel')} : ${unique ? t('common.yes') : t('common.no')}`, 25, y); y += 12;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('randomNumberGenerator.resultsTitle'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 5;

      const tableBody = results.map(num => [num.toString()]);

      autoTable(doc, {
        startY: y,
        head: [[t('randomNumberGenerator.tableHeader')]],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: colorPrimary as [number, number, number],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: { 0: { cellWidth: 170, halign: 'center' } },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: colorSlate[200] as [number, number, number], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: colorSlate[50] as [number, number, number] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(t('randomNumberGenerator.notesTitle'), 20, y);
      y += 3;
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const notes = t('randomNumberGenerator.notesText');
      const splitNotes = doc.splitTextToSize(notes, 170);
      doc.text(splitNotes, 20, y);

      const footerY = 280;
      doc.setDrawColor(...colorSlate[200]);
      doc.line(20, footerY, 190, footerY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...colorSlate[500]);
      doc.text(t('randomNumberGenerator.footerLeft'), 20, footerY + 5);
      doc.text(t('randomNumberGenerator.footerRight'), 190, footerY + 5, { align: 'right' });

      doc.save(t('randomNumberGenerator.pdfFileName'));
      toast.success(t('randomNumberGenerator.exportSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('randomNumberGenerator.exportError'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">{t('common.home')}</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 px-2 py-1 rounded-md">{t('randomNumberGenerator.title')}</span></li>
          </ol>
        </nav>

        <div className="module-header flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Blocks className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('randomNumberGenerator.title')}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t('randomNumberGenerator.subtitle')}</p>
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
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8 self-start">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-6 lg:p-8 border border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center mb-6">
                <Calculator className="w-5 h-5 mr-3 text-blue-500" /> {t('randomNumberGenerator.parametersTitle')}
              </h2>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('randomNumberGenerator.minLabel')}</label>
                  <input
                    type="number"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('randomNumberGenerator.maxLabel')}</label>
                  <input
                    type="number"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-medium"
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">{t('randomNumberGenerator.countLabel')}</label>
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
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('randomNumberGenerator.uniqueLabel')}</label>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={loadExample}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" /> {t('randomNumberGenerator.btnExample')}
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

          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-6 lg:p-8 flex items-center justify-between border-b border-slate-50 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                  <Presentation className="w-5 h-5 mr-3 text-indigo-500" /> {t('randomNumberGenerator.resultsTitle')}
                </h2>
                {results.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={copyResults}
                      className="p-2.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 transition-colors"
                      title={t('randomNumberGenerator.btnCopy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportPDF}
                      className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 rounded-xl hover:bg-blue-100 transition-colors"
                      title={t('randomNumberGenerator.btnExport')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 lg:p-8 flex-1 bg-slate-50/30 dark:bg-slate-900/10">
                {results.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                    <Presentation className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg">{t('randomNumberGenerator.enterData')}</p>
                    <div className="text-4xl font-bold mt-2">0</div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 rounded-3xl text-center border bg-slate-50/50 border-slate-100 dark:bg-slate-700/50 dark:border-slate-600">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {t('randomNumberGenerator.generatedCount')}
                      </p>
                      <div className="text-5xl font-bold tracking-tight mb-2 text-indigo-600">
                        {results.length}
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full text-xs font-semibold shadow-sm border border-slate-100 dark:border-slate-700">
                        {t('randomNumberGenerator.rangeInfo', { min, max })}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                      {results.map((num, index) => (
                        <div key={index} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg text-center font-mono">
                          {num}
                        </div>
                      ))}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-500" /> {t('randomNumberGenerator.notesTitle')}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                        {t('randomNumberGenerator.notesText')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHelpModal(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('randomNumberGenerator.helpTitle')}</h3>
                <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 space-y-6 text-slate-600 dark:text-slate-300">
                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">1</div>
                    {t('randomNumberGenerator.helpPrincipleTitle')}
                  </h4>
                  <p className="text-sm leading-relaxed">{t('randomNumberGenerator.helpPrinciple')}</p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">2</div>
                    {t('randomNumberGenerator.helpParametersTitle')}
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>{t('randomNumberGenerator.minLabel')}</strong> / <strong>{t('randomNumberGenerator.maxLabel')}</strong> : {t('randomNumberGenerator.helpRange')}</li>
                    <li><strong>{t('randomNumberGenerator.countLabel')}</strong> : {t('randomNumberGenerator.helpCount')}</li>
                    <li><strong>{t('randomNumberGenerator.uniqueLabel')}</strong> : {t('randomNumberGenerator.helpUnique')}</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">3</div>
                    {t('randomNumberGenerator.helpMethodTitle')}
                  </h4>
                  <p className="text-sm leading-relaxed">
                    {t('randomNumberGenerator.helpMethod')}
                    <br />
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Math.floor(Math.random() * (max - min + 1)) + min</code>.
                  </p>
                </section>

                <section>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">4</div>
                    {t('randomNumberGenerator.helpReferenceTitle')}
                  </h4>
                  <p className="text-sm leading-relaxed">
                    {t('randomNumberGenerator.helpReference')}
                    <a href="https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Math/random" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">{t('randomNumberGenerator.helpLink')}</a>
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