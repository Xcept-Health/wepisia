import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
import { 
  Play, Loader2, Terminal, Image as ImageIcon, 
  AlertCircle, FileCode2, Code2, Download,
  X, ChevronLeft, ChevronRight, Maximize2, Layers,
  Package, DownloadCloud, Pause, Film
} from 'lucide-react';

export default function UltraRStudio() {
  const [webR, setWebR] = useState(null);
  const [code, setCode] = useState(`# --- Moving Epidemic Curve ---
par(mar=c(2, 2, 2, 1), bg=NA)
x <- seq(-5, 10, length.out = 200)

for (i in 1:40) {
  # The mean moves from 0 to 5
  mu <- i / 8
  y <- dnorm(x, mean = mu, sd = 1.5)
  
  # Base plot
  plot(x, y, type="n", ylim=c(0, 0.3), axes=FALSE, ann=FALSE)
  
  # Soft Blue Area (Tailwind blue-500 with alpha)
  polygon(c(x, rev(x)), c(y, rep(0, 200)), col="#3b82f622", border=NA)
  
  # Stronger blue line
  lines(x, y, col="#3b82f6", lwd=3)
  
  # Minimalist markers
  axis(1, at=c(-5, 0, 5, 10), col="#cbd5e1", col.axis="#94a3b8", cex.axis=0.7)
  title(main="Projected Trend Analysis", adj=0, col.main="#1e293b", cex.main=0.8)
  
  Sys.sleep(0.04)
}
`);

  const [output, setOutput] = useState('');
  const [plotUrls, setPlotUrls] = useState([]);
  const [status, setStatus] = useState('Chargement');
  const [errorMsg, setErrorMsg] = useState('');
  const [installPkg, setInstallPkg] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState('');
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef(null);

  // UI State
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedImgIndex, setSelectedImgIndex] = useState(null);

  const textareaRef = useRef(null);

  // Clean R code
  const cleanRCode = (rawCode) => {
    return rawCode
      .replace(/\r\n?/g, '\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\u00A0/g, ' ')
      .normalize('NFC')
      .trim();
  };

  useEffect(() => {
    const initR = async () => {
      try {
        const instance = new WebR();
        await instance.init();
        setWebR(instance);
        setStatus('Actif');
      } catch (err) {
        setStatus('error');
        setErrorMsg("Erreur d'initialisation WebR : " + err.message);
      }
    };
    initR();
  }, []);

  // Animation loop
  useEffect(() => {
    if (isPlaying && plotUrls.length > 0) {
      const animate = () => {
        setCurrentFrame((prev) => {
          const next = (prev + 1) % plotUrls.length;
          return next;
        });
      };
      animationRef.current = setInterval(animate, 150); // 150ms par frame
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [isPlaying, plotUrls.length]);

  // Reset current frame when plotUrls change
  useEffect(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
  }, [plotUrls]);

  const execute = async () => {
    if (!webR || status !== 'Actif') return;
    setStatus('execution');
    setPlotUrls([]);
    setErrorMsg('');
    setInstallLog('');
    if (window.innerWidth < 1024) setActiveTab('console');
  
    try {
      const cleanedCode = cleanRCode(code);
  
      const shelter = await new webR.Shelter();
      let capture;
      try {
        capture = await shelter.captureR(cleanedCode, {
          captureGraphics: { width: 800, height: 600, res: 120 }
        });
      } catch (captureErr) {
        throw new Error(`Erreur lors de l'exécution : ${captureErr.message}`);
      }
  
      let outputLines = '';
      try {
        outputLines = capture.output
          .map((msg) => (typeof msg.data === 'string' ? msg.data : String(msg.data)))
          .join('\n');
      } catch (outputErr) {
        outputLines = '[Erreur lors de la lecture de la sortie]';
      }
  
      let returnedDisplay = '';
      const hasImages = capture.images && capture.images.length > 0;
      
      try {
        const jsValue = await capture.result.toJs();
        if (jsValue !== null && jsValue !== undefined) {
          if (hasImages) {
            returnedDisplay = `[${capture.images.length} image(s) générée(s)]`;
          } else {
            if (jsValue && typeof jsValue === 'object' && 'values' in jsValue && Array.isArray(jsValue.values)) {
              returnedDisplay = jsValue.values.join('  ');
            } else {
              returnedDisplay = JSON.stringify(jsValue, null, 2);
            }
          }
        }
      } catch (resultErr) {
        returnedDisplay = hasImages ? `[${capture.images.length} image(s) générée(s)]` : '';
      }
  
      setOutput(outputLines + (returnedDisplay ? `\n\nRésultat :\n${returnedDisplay}` : '') || '> Exécution terminée.');
  
      const urls = [];
      for (const imgBitmap of capture.images) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgBitmap.width;
          canvas.height = imgBitmap.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(imgBitmap, 0, 0);
            urls.push(canvas.toDataURL('image/png'));
          } else {
            console.warn('Impossible d’obtenir le contexte 2D du canvas');
          }
        } catch (imgErr) {
          console.error('Erreur lors de la conversion d’une image :', imgErr);
        }
      }
      setPlotUrls(urls);
  
      await shelter.purge();
      setStatus('Actif');
    } catch (err) {
      console.error('Erreur complète:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Erreur inconnue');
    }
  };

  const installPackage = async () => {
    if (!webR || status !== 'Actif' || !installPkg.trim()) return;
    setInstalling(true);
    setErrorMsg('');
    setInstallLog(`Installation de ${installPkg}...`);
    if (window.innerWidth < 1024) setActiveTab('console');

    try {
      const shelter = await new webR.Shelter();
      const capture = await shelter.captureR(`webr::install("${installPkg}")`, {
        captureGraphics: false,
      });
      
      const outputLines = capture.output
        .map((msg) => (typeof msg.data === 'string' ? msg.data : String(msg.data)))
        .join('\n');
      
      setInstallLog(outputLines || `Installation de ${installPkg} terminée.`);

      const check = await webR.evalR(`require("${installPkg}", quietly = TRUE)`);
      const checkResult = await check.toJs();
      if (checkResult) {
        setOutput(`Package ${installPkg} installé avec succès.`);
      } else {
        setOutput(`L'installation de ${installPkg} a été effectuée mais le package ne se charge pas. Vérifiez les logs ci-dessus.`);
      }
      
      await shelter.purge();
    } catch (err) {
      setErrorMsg(`Erreur lors de l'installation de ${installPkg} : ${err.message}`);
    } finally {
      setInstalling(false);
      setInstallPkg('');
    }
  };

  const downloadImage = (url, index) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `r-plot-${index + 1}.png`;
    link.click();
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans overflow-hidden flex-col lg:flex-row">
      
      {/* Sidebar */}
      <nav className="order-last lg:order-first w-full lg:w-16 h-16 lg:h-full bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-r border-slate-200 dark:border-slate-800 flex lg:flex-col items-center justify-around lg:justify-start lg:pt-6 z-20">
        <div className="hidden lg:flex p-2 mb-8 bg-indigo-600 rounded-xl">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <button 
          onClick={() => setActiveTab('editor')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'editor' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-400'}`}
        >
          <FileCode2 size={24} />
        </button>
        <button 
          onClick={() => setActiveTab('console')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'console' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-400'}`}
        >
          <Terminal size={24} />
        </button>
        <button className="p-3 text-slate-400 lg:mt-auto lg:mb-6"><Layers size={24} /></button>
      </nav>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Header */}
        <header className="h-16 px-4 lg:px-8 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
             <div className="lg:hidden p-1.5 bg-indigo-600 rounded-lg mr-2">
                <Code2 className="w-5 h-5 text-white" />
             </div>
             <h1 className="font-bold tracking-tight text-sm lg:text-base">WorkSpace</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Package install */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1">
              <Package size={14} className="text-slate-500" />
              <input
                type="text"
                value={installPkg}
                onChange={(e) => setInstallPkg(e.target.value)}
                placeholder="Nom du package"
                className="w-28 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300"
                onKeyDown={(e) => e.key === 'Enter' && installPackage()}
              />
              <button
                onClick={installPackage}
                disabled={installing || !installPkg.trim() || status !== 'Actif'}
                className="text-indigo-600 hover:text-indigo-800 disabled:opacity-30"
                title="Installer le package"
              >
                {installing ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${status === 'Actif' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              {status}
            </div>
            <button
              onClick={execute}
              disabled={status !== 'Actif'}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              {status === 'execution' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              <span className="hidden sm:inline">Lancer</span>
            </button>
          </div>
        </header>

        {/* Content Grid */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Editor Area */}
          <section className={`flex-1 flex flex-col bg-white dark:bg-slate-950 transition-all ${activeTab !== 'editor' && 'hidden lg:flex'}`}>
            <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase">
              <span>R</span>
              <span>R Engine 4.3</span>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 p-6 bg-transparent resize-none outline-none font-mono text-[14px] leading-relaxed text-slate-700 dark:text-slate-300 custom-scrollbar"
            />
          </section>

          {/* Output Area */}
          <section className={`flex-1 flex flex-col bg-slate-50 dark:bg-[#020617] border-l border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar ${activeTab !== 'console' && 'hidden lg:flex'}`}>
            <div className="p-4 lg:p-8 space-y-8">
              
              {/* Console Output */}
              <div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Terminal size={14} /> Console
                </h3>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
                  {errorMsg ? (
                    <div className="text-red-500 font-mono text-sm flex gap-3">
                      <AlertCircle size={18} className="shrink-0" />
                      <pre className="whitespace-pre-wrap">{errorMsg}</pre>
                    </div>
                  ) : (
                    <pre className="font-mono text-[13px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {output || '> En attente de calcul...'}
                    </pre>
                  )}
                </div>
              </div>

              {/* Logs d'installation */}
              {installLog && (
                <div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Package size={14} /> Logs d'installation
                  </h3>
                  <div className="bg-slate-900/10 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                    <pre className="font-mono text-[12px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-60 overflow-auto">
                      {installLog}
                    </pre>
                  </div>
                </div>
              )}

              {/* Plot Gallery / Animation */}
              {plotUrls.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon size={14} /> Visualisations ({plotUrls.length})
                    </h3>
                    {plotUrls.length > 1 && (
                      <div className="flex gap-2">
                        <button
                          onClick={togglePlay}
                          className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
                          title={isPlaying ? "Pause" : "Lecture"}
                        >
                          {isPlaying ? <Pause size={16} className="text-indigo-600" /> : <Film size={16} className="text-indigo-600" />}
                        </button>
                        <span className="text-xs text-slate-500">
                          {currentFrame + 1}/{plotUrls.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mode animation : une seule image à la fois avec contrôle */}
                  {isPlaying ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                      <img src={plotUrls[currentFrame]} alt={`Frame ${currentFrame+1}`} className="w-full h-auto rounded-xl" />
                      <div className="flex justify-center gap-4 mt-4">
                        <button
                          onClick={() => setCurrentFrame((prev) => (prev - 1 + plotUrls.length) % plotUrls.length)}
                          className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setCurrentFrame((prev) => (prev + 1) % plotUrls.length)}
                          className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Grille d'images */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {plotUrls.map((url, i) => (
                        <div key={i} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm transition-all hover:shadow-xl hover:border-indigo-500/30 overflow-hidden">
                          <img src={url} alt="R Plot" className="w-full h-auto rounded-xl" />
                          <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                             <button 
                              onClick={() => setSelectedImgIndex(i)}
                              className="p-3 bg-white text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform"
                             >
                              <Maximize2 size={20} />
                             </button>
                             <button 
                              onClick={() => downloadImage(url, i)}
                              className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                             >
                              <Download size={20} />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Lightbox Modal (amélioré pour afficher la frame courante si en animation) */}
      {selectedImgIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
          <header className="flex justify-between items-center p-6 text-white">
            <span className="font-mono text-sm">Plot {selectedImgIndex + 1} / {plotUrls.length}</span>
            <div className="flex gap-4">
              <button onClick={() => downloadImage(plotUrls[selectedImgIndex], selectedImgIndex)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Download size={24} />
              </button>
              <button onClick={() => setSelectedImgIndex(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-4 relative">
            {selectedImgIndex > 0 && (
              <button 
                onClick={() => setSelectedImgIndex(selectedImgIndex - 1)}
                className="absolute left-4 lg:left-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-md transition-all"
              >
                <ChevronLeft size={32} />
              </button>
            )}
            
            <img 
              src={plotUrls[selectedImgIndex]} 
              alt="Expanded plot" 
              className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300" 
            />

            {selectedImgIndex < plotUrls.length - 1 && (
              <button 
                onClick={() => setSelectedImgIndex(selectedImgIndex + 1)}
                className="absolute right-4 lg:right-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-md transition-all"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
        textarea { caret-color: #6366f1; }
        @media (max-width: 1024px) {
          textarea { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
}