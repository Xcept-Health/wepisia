/*
 * EpiExplorer
*/

import React, {
  createContext, useContext, useState, useEffect, useRef,
  useCallback, useReducer, useMemo
} from 'react';
import {
  Search, Download, Bookmark, BookmarkCheck, Filter, X,
  ChevronLeft, ChevronRight, BookOpen, Loader2, ArrowRight,
  Copy, Sparkles, BarChart3, History, ExternalLink,
  RefreshCcw, ArrowUpRight, GitCompare, PenLine, Sun, Moon,
  AlertTriangle, Clock, CheckCircle2, HelpCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

/*  THEME CONTEXT  */
interface ThemeCtx { dark: boolean; toggle: () => void }
const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    try {
      const s = localStorage.getItem('ep_theme');
      if (s) return s === 'dark';
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const toggle = useCallback(() => setDark(p => {
    const next = !p;
    try { localStorage.setItem('ep_theme', next ? 'dark' : 'light'); } catch {}
    return next;
  }), []);
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div className={dark ? 'dark' : ''} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
export function useTheme() { return useContext(ThemeContext); }

/*  CONSTANTES  */
const RET_MAX = 10;
const MAX_BM  = 200;
const BASE    = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/*  TYPES  */
interface Article {
  pmid: string; title: string; authors: string[];
  journal: string; pubdate: string; doi: string; pubtype: string[];
}
interface FilterState { yearFrom: string; yearTo: string; type: string; sort: string }
interface SearchState {
  results: Article[]; total: number; loading: boolean;
  error: string | null; page: number; searched: boolean; lastQuery: string;
}
type SA =
  | { type: 'START'; q: string }
  | { type: 'OK'; r: Article[]; t: number }
  | { type: 'ERR'; m: string }
  | { type: 'PAGE'; p: number }
  | { type: 'RESET' };

interface UIState {
  view: 'search' | 'bookmarks'; showFilters: boolean; panel: Article | null;
  showStats: boolean; showHist: boolean; showMesh: boolean;
  meshStatus: 'idle' | 'loading' | 'done' | 'error'; meshInput: string; meshResult: string;
}
type UA =
  | { type: 'VIEW'; v: 'search' | 'bookmarks' }
  | { type: 'PANEL'; a: Article | null }
  | { type: 'FILTERS' } | { type: 'STATS' } | { type: 'HIST' }
  | { type: 'MESH_OPEN' } | { type: 'MESH_CLOSE' }
  | { type: 'MESH_INPUT'; v: string }
  | { type: 'MESH_LOADING' } | { type: 'MESH_OK'; result: string } | { type: 'MESH_ERR' };

/*  EBM  */
const EBM_MAP: Record<string, { label: string; lvl: number }> = {
  'meta-analysis':               { label: 'Méta-analyse', lvl: 5 },
  'systematic review':           { label: 'Revue syst.',  lvl: 5 },
  'randomized controlled trial': { label: 'ECR',          lvl: 4 },
  'clinical trial':              { label: 'Essai clin.',  lvl: 3 },
  'review':                      { label: 'Revue',        lvl: 2 },
  'cohort study':                { label: 'Cohorte',      lvl: 2 },
  'case reports':                { label: 'Cas clin.',    lvl: 1 },
};
const EBM_COLORS: Record<number, { text: string; bg: string }> = {
  5: { text: '#10b981', bg: 'rgba(16,185,129,.12)' },
  4: { text: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
  3: { text: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  2: { text: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  1: { text: '#94a3b8', bg: 'rgba(148,163,184,.10)' },
};
const getEBM = (t: string[] = []) => {
  for (const p of t.map(x => x.toLowerCase()))
    for (const [k, v] of Object.entries(EBM_MAP))
      if (p.includes(k)) return v;
  return null;
};

/*  UTILS  */
const safeLS = {
  get: (k: string, fb: any) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const absCache = {
  get: (id: string) => { try { return sessionStorage.getItem('a_' + id); } catch { return null; } },
  set: (id: string, v: string) => { try { sessionStorage.setItem('a_' + id, v); } catch {} },
};
async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  for (let i = 1; i <= n; i++) {
    try { return await fn(); }
    catch (e) { if (i === n) throw e; await new Promise(r => setTimeout(r, 400 * i)); }
  }
  throw new Error('max');
}
function Hl({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const words = q.trim().split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return <>{text.split(re).map((p, i) => re.test(p) ? <mark key={i} className="bg-amber-200/60 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 rounded-sm px-px">{p}</mark> : p)}</>;
}
const readMins = (t: string) => { const m = Math.ceil(t.trim().split(/\s+/).length / 200); return m <= 1 ? '< 1 min' : `${m} min`; };

/*  MESH GRATUIT (PubMed E-utilities)  */
async function buildMeshQuery(userInput: string): Promise<string> {
  // Step 1 : querytranslation PubMed
  const r1 = await retry(() => axios.get(`${BASE}/esearch.fcgi`, {
    params: { db: 'pubmed', term: userInput, retmax: 0, retmode: 'json' },
  }));
  const qt: string = r1.data.esearchresult?.querytranslation || '';

  // Step 2 : recherche dans la base MeSH
  const r2 = await retry(() => axios.get(`${BASE}/esearch.fcgi`, {
    params: { db: 'mesh', term: userInput, retmax: 6, retmode: 'json' },
  }));
  const meshIds: string[] = r2.data.esearchresult?.idlist || [];

  // Step 3 : official name MeSH
  let meshTerms: string[] = [];
  if (meshIds.length > 0) {
    const r3 = await retry(() => axios.get(`${BASE}/esummary.fcgi`, {
      params: { db: 'mesh', id: meshIds.slice(0, 5).join(','), retmode: 'json' },
    }));
    const res = r3.data.result || {};
    meshTerms = meshIds
      .filter(id => res[id])
      .map(id => res[id].ds_meshterms?.[0] || '')
      .filter(Boolean);
  }

  // Construction
  const acronyms = (userInput.match(/\b[A-Z]{2,5}\b/g) || []).slice(0, 3);
  const mainPhrase = `"${userInput.slice(0, 80).replace(/"/g, '').trim()}"`;
  const group1 = [mainPhrase, ...acronyms].join(' OR ');
  const group2 = meshTerms.length > 0
    ? meshTerms.slice(0, 4).map(t => `"${t}"[Mesh]`).join(' OR ')
    : qt || mainPhrase;

  return [
    `// Requête PubMed pour : ${userInput.slice(0, 80)}`,
    `// ${meshTerms.length} terme(s) MeSH officiel(s) trouvé(s)`,
    `// Collez dans PubMed > Advanced Search`,
    '',
    `(${group1})`,
    `AND`,
    `(${group2})`,
  ].join('\n');
}

/*  REDUCERS  */
function sR(s: SearchState, a: SA): SearchState {
  switch (a.type) {
    case 'START':  return { ...s, loading: true, error: null, searched: true, lastQuery: a.q };
    case 'OK':     return { ...s, loading: false, results: a.r, total: a.t };
    case 'ERR':    return { ...s, loading: false, error: a.m, results: [] };
    case 'PAGE':   return { ...s, page: a.p };
    case 'RESET':  return { ...s, results: [], total: 0, searched: false, page: 1, lastQuery: '', error: null };
    default:       return s;
  }
}
function uR(s: UIState, a: UA): UIState {
  switch (a.type) {
    case 'VIEW':         return { ...s, view: a.v, panel: null };
    case 'PANEL':        return { ...s, panel: a.a };
    case 'FILTERS':      return { ...s, showFilters: !s.showFilters };
    case 'STATS':        return { ...s, showStats: !s.showStats };
    case 'HIST':         return { ...s, showHist: !s.showHist };
    case 'MESH_OPEN':    return { ...s, showMesh: true };
    case 'MESH_CLOSE':   return { ...s, showMesh: false };
    case 'MESH_INPUT':   return { ...s, meshInput: a.v };
    case 'MESH_LOADING': return { ...s, meshStatus: 'loading' };
    case 'MESH_OK':      return { ...s, meshStatus: 'done', meshResult: a.result };
    case 'MESH_ERR':     return { ...s, meshStatus: 'error' };
    default:             return s;
  }
}

/* SEARCH BAR */
interface SearchBarProps {
  large?: boolean;
  loading: boolean;
  showFilters: boolean;
  showHist: boolean;
  hist: string[];
  onSearch: (q: string) => void;
  onToggleFilters: () => void;
  onClear: () => void;
  onHistSelect: (h: string) => void;
  onHistClear: () => void;
  onHist: () => void;
}

const SearchBar = React.memo(({
  large = false, loading, showFilters, showHist, hist,
  onSearch, onToggleFilters, onClear, onHistSelect, onHistClear, onHist,
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const submit = () => {
    const val = inputRef.current?.value.trim() ?? '';
    if (val) onSearch(val);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    onClear();
  };

  return (
    <div className="relative">
      <div className={[
        'flex items-center bg-background border border-input rounded-xl gap-1.5 transition-all',
        'hover:border-primary/40 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/20',
        large ? 'p-2 shadow-sm' : 'p-1.5',
      ].join(' ')}>

        <Search className={`shrink-0 ml-1.5 text-muted-foreground/40 ${large ? 'w-5 h-5' : 'w-4 h-4'}`} />
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          onFocus={() => hist.length && onHist()}
          onBlur={() => setTimeout(onHist, 200)}
          placeholder={large
            ? 'Mots-clés, maladies, auteurs, DOI… · Entrée pour lancer la recherche'
            : 'Rechercher… · Entrée pour lancer'
          }
          className={[
            'flex-1 bg-transparent border-none outline-none',
            'text-foreground placeholder:text-muted-foreground/35',
            large ? 'text-base py-2 px-2' : 'text-sm py-1.5 px-1.5',
          ].join(' ')}
          aria-label="Recherche PubMed"
          autoComplete="off"
          spellCheck={false}
        />

        <button
          onClick={clear}
          className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-foreground hover:bg-secondary transition-all"
          title="Effacer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleFilters}
          className={`p-2 rounded-lg transition-all ${showFilters ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40 hover:bg-secondary hover:text-foreground'}`}
          title="Filtres"
        >
          <Filter className="w-4 h-4" />
        </button>

        <button
          onClick={submit}
          disabled={loading}
          className={[
            'flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg font-semibold',
            'transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
            large ? 'px-5 py-2.5 text-sm' : 'px-3.5 py-2 text-xs',
          ].join(' ')}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Search className="w-3.5 h-3.5" />
          }
          <span className={large ? '' : 'hidden sm:inline'}>Rechercher</span>
        </button>
      </div>

      {/* History dropdown */}
      {showHist && hist.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-20">
          {hist.map((h, i) => (
            <button
              key={i}
              onMouseDown={e => {
                e.preventDefault();
                if (inputRef.current) inputRef.current.value = h;
                onHistSelect(h);
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
            >
              <History className="w-3.5 h-3.5 shrink-0" /> {h}
            </button>
          ))}
          <button
            onMouseDown={e => { e.preventDefault(); onHistClear(); }}
            className="w-full px-4 py-2 text-xs text-muted-foreground/50 hover:text-muted-foreground border-t border-border text-left transition-colors hover:bg-secondary"
          >
            Effacer l'historique
          </button>
        </div>
      )}
    </div>
  );
});

/*  STATS PANEL  */
const StatsPanel = React.memo(({ data }: { data: Article[] }) => {
  const years = useMemo(() => {
    const m: Record<number, number> = {};
    data.forEach(d => { const y = parseInt(d.pubdate); if (!isNaN(y) && y > 1900) m[y] = (m[y] || 0) + 1; });
    return Object.entries(m).sort((a, b) => +a[0] - +b[0]);
  }, [data]);
  const types = useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach(d => { const e = getEBM(d.pubtype); m[e ? e.label : 'Autre'] = (m[e ? e.label : 'Autre'] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [data]);
  const maxY = Math.max(...years.map(([, c]) => c), 1);
  if (!data.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-primary" /> Stats · {data.length} articles
      </h3>
      <p className="text-xs text-muted-foreground mb-2">Distribution temporelle</p>
      <div className="flex items-end gap-0.5 h-10 mb-1">
        {years.map(([y, c]) => (
          <div key={y} title={`${y}: ${c}`} className="flex-1 rounded-t-sm"
            style={{ height: Math.max(3, c / maxY * 40), background: `rgba(59,130,246,${0.2 + 0.8 * (c / maxY)})` }} />
        ))}
      </div>
      <div className="flex justify-between mb-4">
        {[years[0]?.[0], years[years.length - 1]?.[0]].map((y, i) => (
          <span key={i} className="text-[10px] font-mono text-muted-foreground/40">{y}</span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-2">Types d'études</p>
      {types.map(([label, count]) => (
        <div key={label} className="flex items-center gap-2 mb-1.5">
          <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{label}</span>
          <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${count / data.length * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/40 w-4 text-right">{count}</span>
        </div>
      ))}
    </div>
  );
});

/*  MESH MODAL  */
const MeshModal = React.memo(({
  input, onInputChange, status, result, onGenerate, onApply, onClose,
}: {
  input: string; onInputChange: (v: string) => void;
  status: UIState['meshStatus']; result: string;
  onGenerate: () => void; onApply: (q: string) => void; onClose: () => void;
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setTimeout(() => taRef.current?.focus(), 80); }, []);
  const queryOnly = result.split('\n').filter(l => !l.startsWith('//')).join('\n').trim();

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">

        {/* Header sticky */}
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Icône tile */}
            <div className="w-11 h-11 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Générateur MeSH</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">PubMed E-utilities · 100 % gratuit · Aucune API payante</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-6 flex-1">

          {/* Step 1  */}
          <section>
            <h3 className="font-semibold text-primary dark:text-primary mb-3 flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                1
              </div>
              Entrez un titre ou un sujet médical
            </h3>
            <textarea
              ref={taRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onGenerate(); } }}
              placeholder={`Exemples :\n• Epi-Bowman Keratectomy: Clinical Evaluation of a New Method…\n• Diabète de type 2 et risque cardiovasculaire\n• mRNA vaccine efficacy COVID-19\n\nCtrl + Entrée pour générer`}
              rows={5}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-mono leading-relaxed resize-none"
            />
          </section>
          <button
            onClick={onGenerate}
            disabled={!input.trim() || status === 'loading'}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {status === 'loading'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Interrogation PubMed MeSH…</>
              : <><Sparkles className="w-4 h-4" /> Générer la requête MeSH · Ctrl+Entrée</>
            }
          </button>
          {status === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Erreur PubMed. Vérifiez votre connexion et réessayez.</span>
            </div>
          )}

          {/* Step 2 */}
          {status === 'done' && result && (
            <section className="space-y-4">
              <h3 className="font-semibold text-primary dark:text-primary mb-3 flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                  2
                </div>
                Requête PubMed générée
              </h3>

              {/* Result Bloc */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Prête à utiliser
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(queryOnly); toast.success('Requête copiée !'); }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copier
                  </button>
                </div>
                <pre className="px-4 py-4 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-48 overflow-y-auto">
                  {result}
                </pre>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { onApply(queryOnly); onClose(); toast.success('Requête appliquée !'); }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" /> Appliquer
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(queryOnly); toast.success('Copié pour PubMed !'); }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Copier pour PubMed
                </button>
              </div>

              {/* Colors Explanation */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Synonymes libres', desc: 'Termes entre guillemets avec OR', color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300' },
                  { label: 'Termes MeSH', desc: 'Termes officiels PubMed avec [Mesh]', color: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                ].map(c => (
                  <div key={c.label} className={`p-3 rounded-xl border text-xs ${c.color}`}>
                    <div className="font-bold mb-0.5">{c.label}</div>
                    <div className="opacity-70">{c.desc}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <p className="text-xs text-slate-400 italic">
            Utilise PubMed esearch + base MeSH · Données traitées localement · Aucune donnée patient envoyée
          </p>
        </div>
      </div>
    </div>
  );
});

/*  ARTICLE CARD  */
const ArticleCard = React.memo(({
  art, selected, onClick, onBookmark, bookmarked, searchQuery,
  compareSet, onCompare, onAuthorSearch, notes, onNote,
}: {
  art: Article; selected: boolean; onClick: () => void;
  onBookmark: (id: string) => void; bookmarked: boolean; searchQuery: string;
  compareSet: Set<string>; onCompare: (id: string) => void;
  onAuthorSearch: (a: string) => void;
  notes: Record<string, string>; onNote: (id: string, v: string) => void;
}) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteVal, setNoteVal] = useState(notes[art.pmid] || '');
  const ebm = getEBM(art.pubtype);
  const ebmC = ebm ? EBM_COLORS[ebm.lvl] : null;

  return (
    <div
      className={`group bg-card border rounded-xl cursor-pointer transition-all duration-150 hover:border-primary/30 hover:shadow-sm ${selected ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}
      style={{ borderLeft: `3px solid ${ebmC ? ebmC.text : 'transparent'}` }}
      onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug mb-2 line-clamp-2 transition-colors ${selected ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
              <Hl text={art.title} q={searchQuery} />
            </p>
            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 mb-2">
              {art.authors.slice(0, 3).map((a, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); onAuthorSearch(a); }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  {a}{i < Math.min(2, art.authors.length - 1) ? ',' : ''}
                </button>
              ))}
              {art.authors.length > 3 && <span className="text-xs text-muted-foreground/40">+{art.authors.length - 3}</span>}
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs text-muted-foreground/60 italic truncate max-w-[160px]">{art.journal}</span>
              <span className="text-xs font-mono text-muted-foreground/40 ml-auto">{art.pubdate.slice(0, 4)}</span>
              {ebm && ebmC && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: ebmC.bg, color: ebmC.text }}>{ebm.label}</span>
              )}
              {notes[art.pmid] && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 uppercase">note</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {[
              { Icon: bookmarked ? BookmarkCheck : Bookmark, fn: () => onBookmark(art.pmid), on: bookmarked, cls: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
              { Icon: PenLine, fn: () => setNoteOpen(p => !p), on: noteOpen, cls: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
              { Icon: GitCompare, fn: () => onCompare(art.pmid), on: compareSet.has(art.pmid), cls: 'text-primary bg-primary/10' },
            ].map(({ Icon, fn, on, cls }, i) => (
              <button key={i} onClick={fn}
                className={`p-1.5 rounded-lg transition-all ${on ? cls : 'text-muted-foreground/30 hover:text-foreground hover:bg-secondary'}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
        {noteOpen && (
          <div className="mt-3 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
            <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)}
              placeholder="Vos annotations…" rows={2}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => { onNote(art.pmid, noteVal); setNoteOpen(false); toast.success('Note sauvegardée'); }}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-medium">Sauvegarder</button>
              <button onClick={() => setNoteOpen(false)}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium">Annuler</button>
              {notes[art.pmid] && (
                <button onClick={() => { onNote(art.pmid, ''); setNoteVal(''); setNoteOpen(false); toast.success('Supprimée'); }}
                  className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg text-xs font-medium ml-auto">Supprimer</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/*  COMPARE BAR  */
const CompareBar = React.memo(({ ids, arts, onClear }: { ids: Set<string>; arts: Article[]; onClear: () => void }) => {
  if (ids.size < 2) return null;
  const sel = arts.filter(a => ids.has(a.pmid));
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-4 shadow-2xl max-w-xl w-[90%]">
      <GitCompare className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">Comparer {ids.size} articles</p>
        <div className="flex gap-2 flex-wrap">
          {sel.map(a => <span key={a.pmid} className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">PMID {a.pmid}</span>)}
        </div>
      </div>
      <button onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/?linkname=pubmed_pubmed&from_uid=${[...ids].join(',')}`, '_blank', 'noreferrer')}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0">
        Voir <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
      <button onClick={onClear} className="text-muted-foreground/40 hover:text-foreground transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
});

/*  FILTER PANEL  */
const FilterPanel = React.memo(({ F, setF }: { F: FilterState; setF: React.Dispatch<React.SetStateAction<FilterState>> }) => (

  <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 mt-2">
    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
      <Filter className="w-3.5 h-3.5 text-primary" /> Filtres de recherche
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[{ k: 'yearFrom', ph: '2000', label: 'Année début' }, { k: 'yearTo', ph: '2025', label: 'Année fin' }].map(({ k, ph, label }) => (
        <div key={k} className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">{label}</label>
          <input
            type="number" placeholder={ph} value={F[k as keyof FilterState]}
            onChange={e => setF(p => ({ ...p, [k]: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
          />
        </div>
      ))}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Type d'étude</label>
        <select
          value={F.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-sm font-medium"
        >
          <option value="">Tous types</option>
          <option value="meta-analysis">Méta-analyse</option>
          <option value="systematic review">Revue systématique</option>
          <option value="randomized controlled trial">ECR</option>
          <option value="clinical trial">Essai clinique</option>
          <option value="review">Revue narrative</option>
          <option value="case reports">Cas clinique</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Trier par</label>
        <select
          value={F.sort} onChange={e => setF(p => ({ ...p, sort: e.target.value }))}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-sm font-medium"
        >
          <option value="relevance">Pertinence</option>
          <option value="pubdate">Date (récent)</option>
        </select>
      </div>
    </div>
    {/* Légende niveaux EBM — colorée car informatif */}
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Niveaux de preuve EBM</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(EBM_COLORS).reverse().map(([lvl, c]) => {
          const entry = Object.values(EBM_MAP).find(e => e.lvl === +lvl);
          return entry ? (
            <span key={lvl}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
              style={{ background: c.bg, color: c.text }}>
              {entry.label}
            </span>
          ) : null;
        })}
      </div>
    </div>
  </div>
));

/*  HELP MODAL */
const HelpModal = React.memo(({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl">

      {/* Header sticky*/}
      <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center z-10">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guide Epi Explorer</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 md:p-8 space-y-8">

        {/* Section 1  */}
        <section>
          <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">1</div>
            Recherche PubMed
          </h4>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Tapez des mots-clés, un auteur, un DOI ou une requête booléenne dans la barre de recherche et appuyez sur <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono">Entrée</kbd> pour lancer. La recherche n'est <strong>jamais automatique</strong> — vous contrôlez quand elle part.
          </p>
        </section>

        {/* Search help grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Auteur[AU]',       desc: 'Filtrer par auteur : Smith J[AU]' },
            { label: 'DOI direct',       desc: 'Collez un DOI pour accéder directement' },
            { label: 'Booléen AND/OR',   desc: 'diabetes AND hypertension' },
            { label: 'MeSH[Mesh]',       desc: 'Hypertension[Mesh] AND review[PTYP]' },
          ].map(c => (
            <div key={c.label} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white text-sm mb-1 font-mono">{c.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{c.desc}</div>
            </div>
          ))}
        </div>

        {/* Section 2 */}
        <section>
          <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">2</div>
            Niveaux de preuve EBM
          </h4>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
            Chaque article affiche automatiquement son niveau dans la pyramide des preuves, déduit du type de publication PubMed.
          </p>
          <div className="space-y-2.5">
            {(Object.entries(EBM_COLORS) as [string, { text: string; bg: string }][])
              .reverse()
              .map(([lvl, c]) => {
                const descs: Record<string, string> = {
                  '5': 'Méta-analyse / Revue systématique — plus haut niveau de preuve',
                  '4': 'Essai randomisé contrôlé (ECR) — gold standard expérimental',
                  '3': 'Essai clinique non randomisé',
                  '2': 'Étude de cohorte ou revue narrative',
                  '1': 'Cas clinique — niveau de preuve le plus faible',
                };
                return (
                  <div key={lvl} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0"
                      style={{ background: c.bg, color: c.text }}>
                      Niv. {lvl}/5
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">{descs[lvl]}</span>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">3</div>
            Fonctionnalités clés
          </h4>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {[
              { icon: Sparkles,    label: 'Générateur MeSH',     desc: 'Transforme une phrase libre en requête PubMed optimisée avec termes [Mesh] et opérateurs booléens. 100% gratuit via PubMed E-utilities.' },
              { icon: Bookmark,    label: 'Favoris',              desc: 'Sauvegardez jusqu\'à 200 articles. Persistance locale (localStorage), exportables en .ris pour Zotero ou EndNote.' },
              { icon: PenLine,     label: 'Notes personnelles',   desc: 'Annotez chaque article. Les notes sont sauvegardées localement et visibles en badge sur les cartes.' },
              { icon: GitCompare,  label: 'Comparaison',          desc: 'Sélectionnez 2 à 3 articles pour les comparer directement sur PubMed.' },
              { icon: Download,    label: 'Export .ris',          desc: 'Exportez les résultats ou vos favoris au format RIS compatible avec tous les gestionnaires de références.' },
              { icon: BarChart3,   label: 'Statistiques',         desc: 'Visualisez la distribution temporelle et les types d\'études des résultats de votre recherche.' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white font-semibold">{label}</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">4</div>
            Raccourcis clavier
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: '/', desc: 'Focus la barre de recherche' },
              { key: 'Entrée', desc: 'Lancer la recherche' },
              { key: 'Échap', desc: 'Fermer le panneau article ou cette aide' },
              { key: 'Ctrl+Entrée', desc: 'Générer les termes MeSH (dans le modal)' },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <kbd className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  {key}
                </kbd>
                <span className="text-xs text-slate-500 dark:text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Lien source */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-semibold text-primary hover:opacity-80 transition-opacity gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Base de données PubMed — NLM/NIH
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  </div>
));

/* COMPOSANT PRINCIPAL */
export default function EpiExplorer() {
  const { dark, toggle: toggleTheme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const [SR, dS] = useReducer(sR, {
    results: [], total: 0, loading: false, error: null,
    page: 1, searched: false, lastQuery: '',
  });
  const [F, setF] = useState<FilterState>({ yearFrom: '', yearTo: '', type: '', sort: 'relevance' });
  const [U, dU] = useReducer(uR, {
    view: 'search', showFilters: false, panel: null,
    showStats: false, showHist: false,
    showMesh: false, meshStatus: 'idle', meshInput: '', meshResult: '',
  });

  const [bookmarks, setBookmarks] = useState<string[]>(() => safeLS.get('ep_bm', []).slice(0, MAX_BM));
  const [savedArts, setSavedArts] = useState<Article[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>(() => safeLS.get('ep_notes', {}));
  const [hist, setHist] = useState<string[]>(() => safeLS.get('ep_hist', []));
  const [abstract, setAbstract] = useState<string | null>(null);
  const [absLoading, setAbsLoading] = useState(false);
  const [related, setRelated] = useState<Article[]>([]);
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());

  const abortRef = useRef<AbortController | null>(null);
  const panelCloseRef = useRef<HTMLButtonElement>(null);
  const searchBarRef = useRef<{ setValue: (v: string) => void } | null>(null);

  useEffect(() => safeLS.set('ep_bm', bookmarks), [bookmarks]);
  useEffect(() => safeLS.set('ep_notes', notes), [notes]);
  useEffect(() => safeLS.set('ep_hist', hist), [hist]);
  useEffect(() => { if (U.view === 'bookmarks') loadBookmarks(); }, [U.view]);

  // ESC to close panel
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHelp) { setShowHelp(false); return; }
        if (U.showMesh) dU({ type: 'MESH_CLOSE' });
        else if (U.panel) dU({ type: 'PANEL', a: null });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [U.panel, U.showMesh, showHelp]);

  useEffect(() => { if (U.panel) setTimeout(() => panelCloseRef.current?.focus(), 60); }, [U.panel?.pmid]);

  // Abstract + related
  useEffect(() => {
    if (!U.panel) return;
    const pmid = U.panel.pmid;
    setRelated([]);
    const cached = absCache.get(pmid);
    if (cached) { setAbstract(cached); return; }
    setAbstract(null); setAbsLoading(true);
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await axios.get(`${BASE}/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`, { responseType: 'text', signal: ctrl.signal });
        const doc = new DOMParser().parseFromString(r.data, 'text/xml');
        let txt = '';
        doc.querySelectorAll('AbstractText').forEach(el => { const l = el.getAttribute('Label'); txt += (l ? `${l}: ` : '') + el.textContent + '\n\n'; });
        txt = txt.trim() || 'Résumé non disponible.';
        absCache.set(pmid, txt); setAbstract(txt);
      } catch (e: any) { if (!axios.isCancel(e)) setAbstract('Erreur de chargement.'); }
      finally { setAbsLoading(false); }
    })();
    (async () => {
      try {
        const r = await axios.get(`${BASE}/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&cmd=neighbor_score&retmode=json`, { signal: ctrl.signal });
        const ids = (r.data?.linksets?.[0]?.linksetdbs?.[0]?.links || []).slice(0, 4).map(String);
        if (!ids.length) return;
        const s = await axios.get(`${BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`, { signal: ctrl.signal });
        const rm = s.data.result;
        setRelated(ids.filter(id => rm[id]).map(id => ({ pmid: id, uid: id, title: rm[id].title || '', authors: (rm[id].authors || []).map((a: any) => a.name), journal: rm[id].fulljournalname || '', pubdate: rm[id].pubdate || '', doi: '', pubtype: rm[id].pubtype || [] })));
      } catch {}
    })();
    return () => ctrl.abort();
  }, [U.panel?.pmid]);

  const buildQ = useCallback((q: string) => {
    let fq = q;
    if (F.yearFrom || F.yearTo) fq += ` AND (${F.yearFrom || '1900'}[PDAT]:${F.yearTo || new Date().getFullYear()}[PDAT])`;
    if (F.type) fq += ` AND ${F.type}[PTYP]`;
    return fq;
  }, [F]);

  const doSearch = useCallback(async (q: string, page: number) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const sig = abortRef.current.signal;
    dS({ type: 'START', q });
    setHist(p => [q, ...p.filter(x => x !== q)].slice(0, 8));
    try {
      const { data } = await retry(() => axios.get(`${BASE}/esearch.fcgi`, {
        params: { db: 'pubmed', term: buildQ(q), retmax: RET_MAX, retstart: (page - 1) * RET_MAX, sort: F.sort, retmode: 'json' },
        signal: sig,
      }));
      const ids: string[] = data.esearchresult?.idlist || [];
      const tot = parseInt(data.esearchresult?.count || '0');
      if (!ids.length) { dS({ type: 'OK', r: [], t: tot }); return; }
      const { data: sum } = await retry(() => axios.get(`${BASE}/esummary.fcgi`, {
        params: { db: 'pubmed', id: ids.join(','), retmode: 'json' }, signal: sig,
      }));
      const rm = sum.result;
      dS({ type: 'OK', t: tot, r: ids.filter(id => rm[id]).map(id => ({ pmid: id, uid: id, title: rm[id].title || '', authors: (rm[id].authors || []).map((a: any) => a.name), journal: rm[id].fulljournalname || rm[id].source || '', pubdate: rm[id].pubdate || '', doi: rm[id].elocationid?.startsWith('doi:') ? rm[id].elocationid.slice(4) : '', pubtype: rm[id].pubtype || [] })) });
    } catch (e: any) {
      if (!axios.isCancel(e) && e.code !== 'ERR_CANCELED') dS({ type: 'ERR', m: 'Connexion PubMed impossible.' });
    }
  }, [buildQ, F.sort]);

  /* Pagination */
  const prevPage = useRef(1);
  useEffect(() => {
    if (SR.searched && SR.page !== prevPage.current) {
      prevPage.current = SR.page;
      doSearch(SR.lastQuery, SR.page);
    }
  }, [SR.page]);

  const loadBookmarks = async () => {
    if (!bookmarks.length) { setSavedArts([]); return; }
    try {
      const { data } = await retry(() => axios.get(`${BASE}/esummary.fcgi`, { params: { db: 'pubmed', id: bookmarks.join(','), retmode: 'json' } }));
      const rm = data.result;
      setSavedArts(bookmarks.filter(id => rm[id]).map(id => ({ pmid: id, uid: id, title: rm[id].title || '', authors: (rm[id].authors || []).map((a: any) => a.name), journal: rm[id].fulljournalname || '', pubdate: rm[id].pubdate || '', doi: '', pubtype: rm[id].pubtype || [] })));
    } catch {}
  };

  const toggleBm = useCallback((pmid: string) => {
    setBookmarks(p => {
      if (p.includes(pmid)) { toast.success('Retiré'); return p.filter(id => id !== pmid); }
      if (p.length >= MAX_BM) { toast.error('Limite atteinte'); return p; }
      toast.success('Ajouté aux favoris'); return [...p, pmid];
    });
  }, []);

  const saveNote = useCallback((pmid: string, val: string) => {
    setNotes(p => { const n = { ...p }; if (val.trim()) n[pmid] = val; else delete n[pmid]; return n; });
  }, []);

  const handleGenerateMesh = useCallback(async () => {
    if (!U.meshInput.trim()) return;
    dU({ type: 'MESH_LOADING' });
    try { dU({ type: 'MESH_OK', result: await buildMeshQuery(U.meshInput) }); }
    catch { dU({ type: 'MESH_ERR' }); toast.error('Erreur PubMed.'); }
  }, [U.meshInput]);

  const exportRIS = useCallback((arts: Article[]) => {
    if (!arts.length) return;
    const ris = arts.map(a => `TY  - JOUR\nTI  - ${a.title}\n${a.authors.map(au => `AU  - ${au}`).join('\n')}\nJO  - ${a.journal}\nPY  - ${a.pubdate.slice(0, 4)}\n${a.doi ? `DO  - ${a.doi}\n` : ''}PMID- ${a.pmid}\nER  - `).join('\n\n');
    const url = URL.createObjectURL(new Blob([ris], { type: 'text/plain' }));
    const el = document.createElement('a'); el.href = url; el.download = `wepise_${new Date().toISOString().slice(0, 10)}.ris`; el.click(); URL.revokeObjectURL(url);
    toast.success(`${arts.length} référence(s) exportée(s)`);
  }, []);

  const copyCitation = useCallback((a: Article) => {
    const au = a.authors.slice(0, 3).join(', ') + (a.authors.length > 3 ? ' et al.' : '');
    navigator.clipboard.writeText(`${au} (${a.pubdate.slice(0, 4)}). ${a.title}. ${a.journal}. PMID: ${a.pmid}.`);
    toast.success('Citation copiée !');
  }, []);

  /* Search by author */
  const onAuthorSearch = useCallback((author: string) => {
    const q = `${author}[AU]`;
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Recherche PubMed"]');
    if (input) input.value = q;
    dU({ type: 'VIEW', v: 'search' });
    doSearch(q, 1);
  }, [doSearch]);
  const applyMeshQuery = useCallback((q: string) => {
    const singleLine = q.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Recherche PubMed"]');
    if (input) input.value = singleLine;
    doSearch(singleLine, 1);
  }, [doSearch]);

  const toggleCompare = useCallback((pmid: string) => {
    setCompareSet(p => { const n = new Set(p); if (n.has(pmid)) n.delete(pmid); else if (n.size < 3) n.add(pmid); else toast.info('Max 3 articles.'); return n; });
  }, []);

  /* SearchBar Callbacks */
  const handleSearch = useCallback((q: string) => doSearch(q, 1), [doSearch]);
  const handleToggleFilters = useCallback(() => dU({ type: 'FILTERS' }), []);
  const handleClear = useCallback(() => dS({ type: 'RESET' }), []);
  const handleHistSelect = useCallback((h: string) => { doSearch(h, 1); dU({ type: 'HIST' }); }, [doSearch]);
  const handleHistClear = useCallback(() => { setHist([]); dU({ type: 'HIST' }); }, []);
  const handleHist = useCallback(() => dU({ type: 'HIST' }), []);

  const displayArts = U.view === 'search' ? SR.results : savedArts;
  const totalPages = Math.ceil(SR.total / RET_MAX);
  const isLanding = U.view === 'search' && !SR.searched;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* MeSH Modal */}
      {U.showMesh && (
        <MeshModal
          input={U.meshInput} onInputChange={v => dU({ type: 'MESH_INPUT', v })}
          status={U.meshStatus} result={U.meshResult}
          onGenerate={handleGenerateMesh}
          onApply={applyMeshQuery}
          onClose={() => dU({ type: 'MESH_CLOSE' })}
        />
      )}

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/*  LANDING  */}
      {isLanding && (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex justify-end gap-2 mb-6">
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Aide"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mb-10">
              <div className="text-xs font-bold text-primary uppercase tracking-[.2em] mb-4">Wepise · Epi Explorer</div>
              <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-3 tracking-tight">
                Explore<span className="text-primary">.</span>
              </h1>
              <p className="text-muted-foreground text-base">
                +35 millions d'articles · Appuyez sur <kbd className="px-1.5 py-0.5 text-xs bg-secondary border border-border rounded font-mono">Entrée</kbd> pour lancer la recherche
              </p>
            </div>

            {/* SearchBar */}
            <SearchBar
              large loading={SR.loading} showFilters={U.showFilters}
              showHist={U.showHist} hist={hist}
              onSearch={handleSearch} onToggleFilters={handleToggleFilters}
              onClear={handleClear} onHistSelect={handleHistSelect}
              onHistClear={handleHistClear} onHist={handleHist}
            />

            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <button onClick={() => dU({ type: 'MESH_OPEN' })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-all">
                <Sparkles className="w-4 h-4" /> Générer une requête MeSH (gratuit)
              </button>
            </div>

            {U.showFilters && <FilterPanel F={F} setF={setF} />}

            <div className="mt-12 flex justify-center gap-6">
              <button onClick={() => dU({ type: 'VIEW', v: 'bookmarks' })}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <Bookmark className="w-4 h-4" /> Favoris {bookmarks.length > 0 && `(${bookmarks.length})`}
              </button>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground/40 font-mono self-center">/ focus · Esc ferme</span>
            </div>
          </div>
        </div>
      )}

      {/*  HEADER  */}
      {!isLanding && (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-2">
            <div className="flex items-center gap-3">
              <button onClick={() => dS({ type: 'RESET' })}
                className="text-lg font-bold text-foreground hover:text-primary transition-colors shrink-0">
                Epi<span className="text-primary">.</span>
              </button>

              <div className="flex-1">
                {/* SearchBar */}
                <SearchBar
                  loading={SR.loading} showFilters={U.showFilters}
                  showHist={U.showHist} hist={hist}
                  onSearch={handleSearch} onToggleFilters={handleToggleFilters}
                  onClear={handleClear} onHistSelect={handleHistSelect}
                  onHistClear={handleHistClear} onHist={handleHist}
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {(['search', 'bookmarks'] as const).map(v => (
                  <button key={v} onClick={() => dU({ type: 'VIEW', v })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${U.view === v ? (v === 'search' ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white') : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    {v === 'search' ? 'Recherche' : (
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Favoris</span>
                        {bookmarks.length > 0 && <span className="bg-current/20 px-1.5 rounded-full text-[10px]">{bookmarks.length}</span>}
                      </span>
                    )}
                  </button>
                ))}
                <button onClick={() => dU({ type: 'MESH_OPEN' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">MeSH</span>
                </button>
                <button onClick={() => dU({ type: 'STATS' })}
                  className={`p-2 rounded-lg border transition-colors ${U.showStats ? 'bg-secondary border-border text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button onClick={toggleTheme}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowHelp(true)}
                  className="hidden md:flex p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Aide"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            {U.showFilters && <FilterPanel F={F} setF={setF} />}
            {SR.searched && SR.total > 0 && (
              <p className="text-xs text-muted-foreground/40 font-mono">
                {SR.total.toLocaleString('fr-FR')} résultats · « {SR.lastQuery} »
              </p>
            )}
          </div>
        </header>
      )}

      {/*  MAIN  */}
      {(SR.searched || U.view === 'bookmarks') && (
        <main className="max-w-6xl mx-auto px-4 py-6 flex gap-6 items-start pb-28">
          <div className="flex-1 min-w-0">
            {U.showStats && SR.results.length > 0 && <StatsPanel data={SR.results} />}

            <div className="flex items-center justify-between mb-3">
              {U.view === 'search' && SR.searched && (
                <span className="text-sm font-semibold text-muted-foreground">
                  {SR.total.toLocaleString('fr-FR')} résultat{SR.total > 1 ? 's' : ''}
                </span>
              )}
              {U.view === 'bookmarks' && (
                <h2 className="text-base font-bold text-foreground">
                  Favoris <span className="text-muted-foreground font-normal text-sm">({bookmarks.length})</span>
                </h2>
              )}
              {displayArts.length > 0 && (
                <button onClick={() => exportRIS(displayArts)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity font-medium">
                  <Download className="w-3.5 h-3.5" /> Exporter .ris
                </button>
              )}
            </div>

            {SR.loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-3" />
                    <div className="h-3 bg-secondary/60 rounded w-2/5" />
                  </div>
                ))}
              </div>
            ) : SR.error ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {SR.error}
                <button onClick={() => doSearch(SR.lastQuery, SR.page)} className="ml-auto"><RefreshCcw className="w-4 h-4" /></button>
              </div>
            ) : displayArts.length === 0 ? (
              <div className="text-center py-20">
                {U.view === 'bookmarks' ? <Bookmark className="w-10 h-10 text-border mx-auto mb-3" /> : <Search className="w-10 h-10 text-border mx-auto mb-3" />}
                <p className="text-muted-foreground text-sm">{U.view === 'bookmarks' ? 'Aucun favori.' : 'Aucun résultat.'}</p>
                {U.view === 'bookmarks' && <button onClick={() => dU({ type: 'VIEW', v: 'search' })} className="mt-3 text-primary text-sm hover:opacity-80">Explorer →</button>}
              </div>
            ) : (
              <div className="space-y-2">
                {displayArts.map((a, i) => (
                  <div key={a.pmid} style={{ animationDelay: `${i * 25}ms` }} className="animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both">
                    <ArticleCard
                      art={a} selected={U.panel?.pmid === a.pmid}
                      onClick={() => dU({ type: 'PANEL', a })}
                      onBookmark={toggleBm} bookmarked={bookmarks.includes(a.pmid)}
                      searchQuery={SR.lastQuery} compareSet={compareSet} onCompare={toggleCompare}
                      onAuthorSearch={onAuthorSearch} notes={notes} onNote={saveNote}
                    />
                  </div>
                ))}
              </div>
            )}

            {SR.results.length > 0 && SR.total > RET_MAX && (
              <div className="flex justify-center items-center gap-3 mt-8">
                <button onClick={() => dS({ type: 'PAGE', p: Math.max(1, SR.page - 1) })} disabled={SR.page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 font-medium">
                  <ChevronLeft className="w-4 h-4" /> Préc.
                </button>
                <span className="text-sm text-muted-foreground font-mono">{SR.page} / {totalPages}</span>
                <button onClick={() => dS({ type: 'PAGE', p: Math.min(totalPages, SR.page + 1) })} disabled={SR.page >= totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 font-medium">
                  Suiv. <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/*  SIDE PANEL  */}
          <aside
            role="dialog"
            aria-modal="true"
            className={`fixed inset-y-0 right-0 w-full md:w-[520px] bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 z-40 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] shadow-2xl ${U.panel ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {U.panel && (() => {
              const art = U.panel;
              const ebm = getEBM(art.pubtype);
              const ebmC = ebm ? EBM_COLORS[ebm.lvl] : null;
              const isBm = bookmarks.includes(art.pmid);
              return (
                <>
                  {/* sticky Header */}
                  <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Aperçu de l'article</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">PMID {art.pmid}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => toggleBm(art.pmid)}
                        className={`p-2 rounded-xl transition-all ${isBm ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'}`}
                        title={isBm ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        {isBm ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                      <button
                        ref={panelCloseRef}
                        onClick={() => dU({ type: 'PANEL', a: null })}
                        aria-label="Fermer"
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6 md:p-8 space-y-6">

                      {/* KPI row */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { label: 'Publication', value: art.pubdate.slice(0, 4), mono: true, neutral: true },
                          { label: 'Niveau EBM', value: ebm ? `Niv. ${ebm.lvl}/5` : '—', color: ebmC },
                          { label: 'Type', value: ebm ? ebm.label : 'Non classé', color: ebmC },
                        ].map(({ label, value, mono, neutral, color }) => (
                          <div
                            key={label}
                            className="rounded-2xl p-3 text-center border"
                            style={color
                              ? { background: color.bg, borderColor: color.text + '33' }
                              : undefined
                            }
                            {...(!color ? { className: 'rounded-2xl p-3 text-center border bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700' } : {})}
                          >
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={color ? { color: color.text } : { color: 'var(--color-muted-foreground)' }}>
                              {label}
                            </p>
                            <p className={`text-sm font-bold leading-tight ${mono ? 'font-mono' : ''}`}
                              style={color ? { color: color.text } : { color: 'var(--color-foreground)' }}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                        {art.title}
                      </h2>

                      {/* Authors */}
                      <div className="flex flex-wrap gap-1.5">
                        {art.authors.slice(0, 8).map((a, i) => (
                          <button
                            key={i}
                            onClick={() => onAuthorSearch(a)}
                            title={`Rechercher ${a}`}
                            className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                          >
                            {a}
                          </button>
                        ))}
                        {art.authors.length > 8 && (
                          <span className="text-xs text-slate-400 self-center">+{art.authors.length - 8}</span>
                        )}
                      </div>

                      {/* Abstract */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Résumé</span>
                          <div className="flex items-center gap-3">
                            {abstract && abstract !== 'Résumé non disponible.' && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {readMins(abstract)}
                              </span>
                            )}
                            {abstract && (
                              <button
                                onClick={() => { navigator.clipboard.writeText(abstract!); toast.success('Abstract copié !'); }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="px-5 py-4">
                          {absLoading ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" /> Chargement du résumé…
                            </div>
                          ) : (
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                              {abstract || "Consultez l'article complet sur PubMed."}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { l: 'Journal', v: art.journal },
                          { l: 'PMID', v: art.pmid, mono: true },
                          ...(art.doi ? [{ l: 'DOI', v: art.doi, mono: true }] : []),
                        ].map(({ l, v, mono }) => (
                          <div key={l} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{l}</p>
                            <p className={`text-xs text-slate-700 dark:text-slate-200 break-all leading-relaxed ${mono ? 'font-mono' : 'font-semibold'}`}>
                              {v}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Note */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2 ml-1">
                          <PenLine className="w-3.5 h-3.5 text-violet-500" /> Ma note
                        </label>
                        <textarea
                          defaultValue={notes[art.pmid] || ''}
                          onChange={e => saveNote(art.pmid, e.target.value)}
                          placeholder="Vos annotations personnelles sur cet article…"
                          rows={3}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                        />
                      </div>

                      {/* Similar Articles*/}
                      {related.length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 ml-1">
                            <ArrowRight className="w-3.5 h-3.5 text-primary" /> Articles similaires
                          </h3>
                          <div className="space-y-2">
                            {related.map(r => {
                              const rEbm = getEBM(r.pubtype);
                              const rC = rEbm ? EBM_COLORS[rEbm.lvl] : null;
                              return (
                                <button
                                  key={r.pmid}
                                  onClick={() => dU({ type: 'PANEL', a: r })}
                                  className="w-full text-left bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
                                >
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 mb-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {r.title}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400">{r.pubdate.slice(0, 4)}</span>
                                    {rEbm && rC && (
                                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                                        style={{ background: rC.bg, color: rC.text }}>
                                        {rEbm.label}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 md:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => copyCitation(art)}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
                    >
                      <Copy className="w-4 h-4" /> Citer
                    </button>
                    <button
                      onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`, '_blank', 'noreferrer')}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-2xl hover:opacity-90 transition-opacity shadow-sm"
                    >
                      PubMed <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </>
              );
            })()}
          </aside>

          {U.panel && <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[1px] z-30 md:hidden" onClick={() => dU({ type: 'PANEL', a: null })} />}
        </main>
      )}

      <CompareBar ids={compareSet} arts={[...SR.results, ...savedArts]} onClear={() => setCompareSet(new Set())} />
    </div>
  );
}