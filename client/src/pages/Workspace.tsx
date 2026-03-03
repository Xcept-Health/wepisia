import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
import { 
  Play, Loader2, Terminal, Image as ImageIcon, 
  AlertCircle, FileCode2, Code2, Download,
  X, ChevronLeft, ChevronRight, Maximize2, Layers,
  Package, DownloadCloud, Pause, Film, RotateCcw,
  Plus, FolderOpen, Save, HelpCircle, CornerDownRight,
  ArrowRight
} from 'lucide-react';

// ----- Types -----
interface RFile {
  id: string;
  name: string;
  code: string;
  language: 'r';
  saved?: boolean;
}

const STORAGE_KEY = 'webr_editor_state';

// ----- Helper to format R output -----
const formatROutput = (output: any): string => {
  if (output === null || output === undefined) return '';
  if (typeof output === 'object' && output.values) {
    if (output.names && Array.isArray(output.values) && output.values.every(v => typeof v === 'object')) {
      const rows = output.values;
      if (rows.length === 0) return '';
      const headers = Object.keys(rows[0] || {});
      if (headers.length === 0) return output.values.map(String).join('\n');
      const colWidths = headers.map(h => Math.max(h.length, ...rows.map(r => String(r[h] || '').length)));
      const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join('  ');
      const separator = colWidths.map(w => '-'.repeat(w)).join('--');
      const body = rows.map(r => headers.map((h, i) => String(r[h] || '').padEnd(colWidths[i])).join('  ')).join('\n');
      return [headerLine, separator, body].join('\n');
    }
    return output.values.join(' ');
  }
  if (typeof output === 'number' || typeof output === 'string' || typeof output === 'boolean') return String(output);
  if (Array.isArray(output)) return output.map(item => formatROutput(item)).join('\n');
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
};

export default function UltraRStudio() {
  // ----- State -----
  const [webR, setWebR] = useState<any>(null);
  const [files, setFiles] = useState<RFile[]>([
    { id: '1', name: 'script1.R', code: `# --- Moving Epidemic Curve ---
par(mar=c(2, 2, 2, 1), bg=NA)
x <- seq(-5, 10, length.out = 200)

for (i in 1:40) {
  mu <- i / 8
  y <- dnorm(x, mean = mu, sd = 1.5)
  
  plot(x, y, type="n", ylim=c(0, 0.3), axes=FALSE, ann=FALSE)
  polygon(c(x, rev(x)), c(y, rep(0, 200)), col="#3b82f622", border=NA)
  lines(x, y, col="#3b82f6", lwd=3)
  axis(1, at=c(-5, 0, 5, 10), col="#cbd5e1", col.axis="#94a3b8", cex.axis=0.7)
  title(main="Projected Trend Analysis", adj=0, col.main="#1e293b", cex.main=0.8)
  
  Sys.sleep(0.04)
}`, language: 'r', saved: true }
  ]);
  const [activeFileId, setActiveFileId] = useState('1');
  const [output, setOutput] = useState('');
  const [plotUrls, setPlotUrls] = useState<string[]>([]);
  const [status, setStatus] = useState('Chargement');
  const [errorMsg, setErrorMsg] = useState('');
  const [installPkg, setInstallPkg] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState('');
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<any>(null);

  // UI State
  const [activeTab, setActiveTab] = useState('editor');
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);

  // ----- Persistence -----
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setFiles(state.files);
        setActiveFileId(state.activeFileId);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ files, activeFileId }));
  }, [files, activeFileId]);

  // ----- WebR Initialization -----
  useEffect(() => {
    const initR = async () => {
      try {
        const instance = new WebR();
        await instance.init();
        setWebR(instance);
        setStatus('Actif');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg("Erreur d'initialisation WebR : " + err.message);
      }
    };
    initR();
  }, []);

  // ----- Animation loop -----
  useEffect(() => {
    if (isPlaying && plotUrls.length > 0) {
      animationRef.current = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % plotUrls.length);
      }, 150);
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    return () => { if (animationRef.current) clearInterval(animationRef.current); };
  }, [isPlaying, plotUrls.length]);

  useEffect(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
  }, [plotUrls]);

  // ----- Code execution (full script) -----
  const execute = async () => {
    if (status === 'error') resetError();
    if (!webR || (status !== 'Actif' && status !== 'error')) return;
    
    const activeFile = files.find(f => f.id === activeFileId);
    if (!activeFile) return;

    setStatus('execution');
    setPlotUrls([]);
    setErrorMsg('');
    setInstallLog('');
    if (window.innerWidth < 1024) setActiveTab('console');
  
    try {
      const cleanedCode = activeFile.code.replace(/\r\n?/g, '\n').trim();
  
      const shelter = await new webR.Shelter();
      let capture;
      try {
        capture = await shelter.captureR(cleanedCode, {
          captureGraphics: { width: 800, height: 600, res: 120 }
        });
      } catch (captureErr: any) {
        throw new Error(`Erreur lors de l'exécution : ${captureErr.message}`);
      }
  
      let outputLines = '';
      try {
        outputLines = capture.output
          .map((msg: any) => (typeof msg.data === 'string' ? msg.data : String(msg.data)))
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
            returnedDisplay = formatROutput(jsValue);
          }
        }
      } catch (resultErr) {
        returnedDisplay = hasImages ? `[${capture.images.length} image(s) générée(s)]` : '';
      }
  
      setOutput(outputLines + (returnedDisplay ? `\n\nRésultat :\n${returnedDisplay}` : '') || '> Exécution terminée.');
  
      const urls: string[] = [];
      for (const imgBitmap of capture.images) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgBitmap.width;
          canvas.height = imgBitmap.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(imgBitmap, 0, 0);
            urls.push(canvas.toDataURL('image/png'));
          }
        } catch (imgErr) {}
      }
      setPlotUrls(urls);
  
      await shelter.purge();
      setStatus('Actif');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Erreur inconnue');
    }
  };

  // ----- Execute current line (simple textarea selection) -----
  const executeCurrentLine = async () => {
    if (!textareaRef.current || !webR || status !== 'Actif') return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    let lineText = '';
    if (start === end) {
      // cursor on a line: get whole line
      const lines = textarea.value.split('\n');
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (start >= charCount && start <= charCount + line.length) {
          lineText = line;
          break;
        }
        charCount += line.length + 1;
      }
    } else {
      // selection: use selected text
      lineText = textarea.value.substring(start, end);
    }
    if (!lineText.trim() || lineText.trim().startsWith('#')) return;

    setStatus('execution');
    setPlotUrls([]);
    setErrorMsg('');
    setInstallLog('');

    try {
      const shelter = await new webR.Shelter();
      const capture = await shelter.captureR(lineText, {
        captureGraphics: { width: 800, height: 600, res: 120 }
      });
      const outputLines = capture.output.map((msg: any) => String(msg.data)).join('\n');
      let returnedDisplay = '';
      try {
        const jsValue = await capture.result.toJs();
        if (jsValue !== null && jsValue !== undefined) {
          returnedDisplay = formatROutput(jsValue);
        }
      } catch (e) {}
      setOutput(outputLines + (returnedDisplay ? `\n📤 ${returnedDisplay}` : '') || '✅ Ligne exécutée.');
      await shelter.purge();
      setStatus('Actif');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(`Erreur ligne : ${err.message}`);
    }
  };

  // ----- Interactive console input -----
  const handleConsoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webR || status !== 'Actif' || !consoleInput.trim()) return;
    const cmd = consoleInput.trim();
    setConsoleHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setConsoleInput('');
    setOutput(prev => prev + `\n> ${cmd}`);

    try {
      const shelter = await new webR.Shelter();
      const capture = await shelter.captureR(cmd, {
        captureGraphics: { width: 800, height: 600, res: 120 }
      });
      const outputLines = capture.output.map((msg: any) => String(msg.data)).join('\n');
      let returnedDisplay = '';
      try {
        const jsValue = await capture.result.toJs();
        if (jsValue !== null && jsValue !== undefined) {
          returnedDisplay = formatROutput(jsValue);
        }
      } catch (e) {}
      setOutput(prev => prev + '\n' + outputLines + (returnedDisplay ? `\n${returnedDisplay}` : ''));
      await shelter.purge();
    } catch (err: any) {
      setOutput(prev => prev + `\nErreur : ${err.message}`);
    }
  };

  // ----- File management -----
  const addNewFile = () => {
    const newId = Date.now().toString();
    const newFile: RFile = {
      id: newId,
      name: `script${files.length + 1}.R`,
      code: '# Nouveau script R\n',
      language: 'r',
      saved: true
    };
    setFiles([...files, newFile]);
    setActiveFileId(newId);
  };

  const openFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.R,.r,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const newId = Date.now().toString();
        const newFile: RFile = {
          id: newId,
          name: file.name,
          code: content,
          language: 'r',
          saved: true
        };
        setFiles([...files, newFile]);
        setActiveFileId(newId);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const saveFile = () => {
    const active = files.find(f => f.id === activeFileId);
    if (!active) return;
    const blob = new Blob([active.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = active.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const closeFile = (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce fichier ?")) return;

    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    
    if (activeFileId === id) {
      if (newFiles.length > 0) {
        setActiveFileId(newFiles[0].id);
      } else {
        addNewFile(); // crée un fichier par défaut
      }
    }
  };

  const updateCode = (value: string) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code: value, saved: false } : f));
  };

  // ----- Keyboard shortcuts -----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        execute();
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        executeCurrentLine();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [execute, executeCurrentLine, saveFile]);

  // ----- Reset error -----
  const resetError = () => {
    setStatus('Actif');
    setErrorMsg('');
  };

  // ----- Package install -----
  const installPackage = async () => {
    if (status === 'error') resetError();
    if (!webR || status !== 'Actif' || !installPkg.trim()) return;
    setInstalling(true);
    setErrorMsg('');
    setInstallLog(`Installation de ${installPkg}...`);
    if (window.innerWidth < 1024) setActiveTab('console');

    try {
      const shelter = await new webR.Shelter();
      const capture = await shelter.captureR(`webr::install("${installPkg}")`, { captureGraphics: false });
      const outputLines = capture.output.map((msg: any) => String(msg.data)).join('\n');
      setInstallLog(outputLines || `Installation de ${installPkg} terminée.`);
      const check = await webR.evalR(`require("${installPkg}", quietly = TRUE)`);
      const checkResult = await check.toJs();
      if (checkResult) {
        setOutput(`✅ Package ${installPkg} installé.`);
      } else {
        setOutput(`⚠️ Installation terminée mais chargement impossible.`);
      }
      await shelter.purge();
    } catch (err: any) {
      setErrorMsg(`Erreur installation ${installPkg} : ${err.message}`);
    } finally {
      setInstalling(false);
      setInstallPkg('');
    }
  };

  // ----- Download image -----
  const downloadImage = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `plot-${index+1}.png`;
    link.click();
  };

  // ----- Toggle animation -----
  const togglePlay = () => setIsPlaying(!isPlaying);

  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar - Main navigation */}
      <nav className="w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 space-y-4">
        <div className="p-2 bg-indigo-600 rounded-xl">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <button 
          onClick={() => setActiveTab('editor')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'editor' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-400'}`}
          title="Éditeur"
        >
          <FileCode2 size={24} />
        </button>
        <button 
          onClick={() => setActiveTab('console')}
          className={`p-3 rounded-xl transition-all ${activeTab === 'console' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-400'}`}
          title="Console"
        >
          <Terminal size={24} />
        </button>
        <button 
          onClick={() => setShowFileExplorer(!showFileExplorer)}
          className={`p-3 rounded-xl transition-all ${showFileExplorer ? 'text-indigo-600' : 'text-slate-400'}`}
          title="Explorateur de fichiers"
        >
          <Layers size={24} />
        </button>
        <button 
          onClick={() => setShowHelpModal(true)}
          className="p-3 text-slate-400 hover:text-indigo-600 transition-colors"
          title="Aide"
        >
          <HelpCircle size={24} />
        </button>
      </nav>

      {/* File Explorer Panel (simplifié, liste plate) */}
      {showFileExplorer && (
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-500">Explorateur</h3>
            <button onClick={addNewFile} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 text-sm">
            {files.map(file => (
              <div key={file.id} 
                   className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
                     activeFileId === file.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : ''
                   }`}
                   onClick={() => setActiveFileId(file.id)}>
                <FileCode2 size={14} />
                <span className="flex-1 truncate">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
                  className="text-slate-400 hover:text-red-500"
                  title="Supprimer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header with tabs and controls */}
        <header className="h-14 px-4 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto">
            {files.map(file => (
              <div key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-sm border-b-2 cursor-pointer ${
                  activeFileId === file.id 
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                }`}
              >
                <FileCode2 size={14} />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
                  className="ml-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 p-0.5"
                  title="Supprimer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button onClick={addNewFile} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Nouveau fichier">
              <Plus size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={openFile} className="p-2 text-slate-400 hover:text-indigo-600" title="Ouvrir un fichier">
              <FolderOpen size={18} />
            </button>
            <button onClick={saveFile} className="p-2 text-slate-400 hover:text-indigo-600" title="Sauvegarder (Ctrl+S)">
              <Save size={18} />
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
            <button
              onClick={executeCurrentLine}
              disabled={status !== 'Actif'}
              className="p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
              title="Exécuter la ligne (Ctrl+Enter)"
            >
              <CornerDownRight size={18} />
            </button>
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1">
              <Package size={14} className="text-slate-500" />
              <input
                type="text"
                value={installPkg}
                onChange={(e) => setInstallPkg(e.target.value)}
                placeholder="Package"
                className="w-20 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300"
                onKeyDown={(e) => e.key === 'Enter' && installPackage()}
              />
              <button
                onClick={installPackage}
                disabled={installing || !installPkg.trim() || status !== 'Actif'}
                className="text-indigo-600 hover:text-indigo-800 disabled:opacity-30"
              >
                {installing ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase">
              <div className={`w-2 h-2 rounded-full ${
                status === 'Actif' ? 'bg-emerald-500' : 
                status === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'
              }`} />
              {status}
            </div>
            <button
              onClick={execute}
              disabled={status === 'execution' || installing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              {status === 'execution' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              <span className="hidden sm:inline">Lancer</span>
            </button>
          </div>
        </header>

        {/* Main content: editor and console */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Editor (simple textarea) */}
          <section className={`flex-1 flex flex-col bg-white dark:bg-slate-950 transition-all ${activeTab !== 'editor' && 'hidden lg:flex'}`}>
            <div className="px-4 py-1 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
              <span>{activeFile?.name || 'script.R'}</span>
              <span>R 4.3</span>
            </div>
            <textarea
              ref={textareaRef}
              value={activeFile?.code || ''}
              onChange={(e) => updateCode(e.target.value)}
              spellCheck={false}
              className="flex-1 p-4 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300 custom-scrollbar"
            />
          </section>

          {/* Console & Output */}
          <section className={`flex-1 flex flex-col bg-slate-50 dark:bg-[#020617] border-l border-slate-200 dark:border-slate-800 overflow-hidden ${activeTab !== 'console' && 'hidden lg:flex'}`}>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                <Terminal size={14} /> Console
              </h3>
              {errorMsg && (
                <button onClick={resetError} className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                  <RotateCcw size={12} /> Réinitialiser
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 flex gap-3">
                  <AlertCircle size={18} className="shrink-0" />
                  <pre className="whitespace-pre-wrap font-mono text-xs">{errorMsg}</pre>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {output || '> En attente de commande...'}
                </pre>
              </div>

              {installLog && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                    <Package size={12} /> Logs d'installation
                  </h4>
                  <pre className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-40 overflow-auto">
                    {installLog}
                  </pre>
                </div>
              )}

              {/* Plot Gallery */}
              {plotUrls.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <ImageIcon size={12} /> Visualisations ({plotUrls.length})
                    </h4>
                    {plotUrls.length > 1 && (
                      <div className="flex gap-2">
                        <button onClick={togglePlay} className="p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                          {isPlaying ? <Pause size={14} className="text-indigo-600" /> : <Film size={14} className="text-indigo-600" />}
                        </button>
                        <span className="text-xs text-slate-500">{currentFrame+1}/{plotUrls.length}</span>
                      </div>
                    )}
                  </div>
                  {isPlaying ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                      <img src={plotUrls[currentFrame]} alt="frame" className="w-full h-auto rounded" />
                      <div className="flex justify-center gap-4 mt-2">
                        <button onClick={() => setCurrentFrame(p => (p-1+plotUrls.length)%plotUrls.length)} className="p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                          <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => setCurrentFrame(p => (p+1)%plotUrls.length)} className="p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {plotUrls.map((url, i) => (
                        <div key={i} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
                          <img src={url} alt="plot" className="w-full h-auto rounded" />
                          <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <button onClick={() => setSelectedImgIndex(i)} className="p-1.5 bg-white rounded-full shadow">
                              <Maximize2 size={14} />
                            </button>
                            <button onClick={() => downloadImage(url, i)} className="p-1.5 bg-indigo-600 text-white rounded-full shadow">
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interactive console input */}
            <form onSubmit={handleConsoleSubmit} className="border-t border-slate-200 dark:border-slate-800 p-2 flex items-center gap-2 bg-white dark:bg-slate-900">
              <span className="text-indigo-600 text-sm font-mono">{'>'}</span>
              <input
                ref={consoleInputRef}
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (consoleHistory.length > 0 && historyIndex < consoleHistory.length-1) {
                      const newIndex = historyIndex + 1;
                      setHistoryIndex(newIndex);
                      setConsoleInput(consoleHistory[consoleHistory.length-1-newIndex]);
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (historyIndex > 0) {
                      const newIndex = historyIndex - 1;
                      setHistoryIndex(newIndex);
                      setConsoleInput(consoleHistory[consoleHistory.length-1-newIndex]);
                    } else if (historyIndex === 0) {
                      setHistoryIndex(-1);
                      setConsoleInput('');
                    }
                  }
                }}
                placeholder="Commande R"
                className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-300"
              />
              <button type="submit" disabled={status !== 'Actif'} className="text-indigo-600 disabled:opacity-30">
                <Play size={16} fill="currentColor" />
              </button>
            </form>
          </section>
        </main>
      </div>

      {/* Lightbox Modal */}
      {selectedImgIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
          <header className="flex justify-between items-center p-6 text-white">
            <span className="font-mono text-sm">Plot {selectedImgIndex+1} / {plotUrls.length}</span>
            <div className="flex gap-4">
              <button onClick={() => downloadImage(plotUrls[selectedImgIndex], selectedImgIndex)} className="p-2 hover:bg-white/10 rounded-full">
                <Download size={24} />
              </button>
              <button onClick={() => setSelectedImgIndex(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {selectedImgIndex > 0 && (
              <button onClick={() => setSelectedImgIndex(selectedImgIndex-1)} className="absolute left-4 lg:left-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full">
                <ChevronLeft size={32} />
              </button>
            )}
            <img src={plotUrls[selectedImgIndex]} alt="Full plot" className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg" />
            {selectedImgIndex < plotUrls.length-1 && (
              <button onClick={() => setSelectedImgIndex(selectedImgIndex+1)} className="absolute right-4 lg:right-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full">
                <ChevronRight size={32} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHelpModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide de l'éditeur R</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* Section 1 : Vue d'ensemble */}
              <section>
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  Environnement de travail
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                  Ce studio intègre un moteur R complet via WebAssembly, directement dans votre navigateur.
                  Vous pouvez écrire, exécuter et visualiser vos scripts R sans aucune installation.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <li><strong className="text-slate-900 dark:text-white">Multi-fichiers</strong> : créez, ouvrez, sauvegardez et gérez plusieurs scripts.</li>
                  <li><strong className="text-slate-900 dark:text-white">Console interactive</strong> : tapez des commandes R en direct avec historique.</li>
                  <li><strong className="text-slate-900 dark:text-white">Graphiques</strong> : visualisez et animez vos sorties graphiques.</li>
                </ul>
              </section>

              {/* Section 2 : Gestion des fichiers */}
              <section>
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  Fichiers et projets
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1"><Plus size={14} /> Nouveau</div>
                    <div className="text-slate-500 text-xs">Crée un script vierge.</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1"><FolderOpen size={14} /> Ouvrir</div>
                    <div className="text-slate-500 text-xs">Charge un fichier .R depuis votre ordinateur.</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1"><Save size={14} /> Sauvegarder</div>
                    <div className="text-slate-500 text-xs">Télécharge le script courant.</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1"><X size={14} /> Supprimer</div>
                    <div className="text-slate-500 text-xs">Ferme l'onglet (confirmation demandée).</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Les fichiers sont automatiquement sauvegardés dans votre navigateur (localStorage).</p>
              </section>

              {/* Section 3 : Exécution du code */}
              <section>
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  Exécution du code
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded"><Play size={16} className="text-indigo-600" /></div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Bouton "Lancer"</span>
                      <p className="text-slate-600 dark:text-slate-300">Exécute tout le script actif. (Raccourci : <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">Ctrl+Shift+Enter</kbd>)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded"><CornerDownRight size={16} className="text-indigo-600" /></div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Exécuter la ligne</span>
                      <p className="text-slate-600 dark:text-slate-300">Exécute la ligne où se trouve le curseur, ou la sélection. (Raccourci : <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">Ctrl+Enter</kbd>)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded"><Terminal size={16} className="text-indigo-600" /></div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Console interactive</span>
                      <p className="text-slate-600 dark:text-slate-300">Tapez des commandes directement dans la zone de saisie en bas de la console. Utilisez les flèches ↑↓ pour naviguer dans l'historique.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4 : Packages */}
              <section>
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  Installation de packages
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                  Utilisez le champ <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">Package</span> dans l'en-tête pour installer des packages depuis le dépôt webR (ex: <code>dplyr, ggplot2, KernSmooth</code>).
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Vous pouvez aussi utiliser <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">webr::install("nom")</code> directement dans votre script.
                </p>
              </section>

              {/* Section 5 : Graphiques et animation */}
              <section>
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold">
                    5
                  </div>
                  Graphiques et animation
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tous les graphiques générés par R sont automatiquement capturés et affichés dans la console. Si plusieurs images sont produites (par exemple dans une boucle), vous pouvez :
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <li>Basculer entre le mode grille (toutes les images) et le mode animation (lecture automatique) avec le bouton <Film size={14} className="inline" />.</li>
                  <li>Naviguer manuellement avec les flèches.</li>
                  <li>Télécharger une image individuelle ou l'agrandir en cliquant sur l'icône <Maximize2 size={14} className="inline" />.</li>
                </ul>
              </section>

              {/* Section 6 : Raccourcis clavier */}
              <section>
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold">
                    6
                  </div>
                  Raccourcis clavier
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">Ctrl+Enter</kbd> <span className="text-slate-600 dark:text-slate-300">Exécuter la ligne</span></div>
                  <div><kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">Ctrl+Shift+Enter</kbd> <span className="text-slate-600 dark:text-slate-300">Exécuter tout</span></div>
                  <div><kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">Ctrl+S</kbd> <span className="text-slate-600 dark:text-slate-300">Sauvegarder</span></div>
                </div>
              </section>

              {/* Section 7 : Dépannage */}
              <section>
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold">
                    7
                  </div>
                  Dépannage
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  En cas d'erreur, un bouton <strong>Réinitialiser</strong> apparaît à côté du titre "Console". Il remet l'état à "Actif" sans perdre votre code.
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  Tous vos scripts sont sauvegardés automatiquement dans le navigateur (localStorage). Vous pouvez fermer l'onglet et rouvrir la page : vos fichiers seront restaurés.
                </p>
              </section>

            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>
    </div>
  );
}