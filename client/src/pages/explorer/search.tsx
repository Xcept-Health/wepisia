/*
 * Xplorer — Redesigned (Responsive)
 * Soft Scientific Elegance · Full-featured PubMed explorer
 * Desktop & Mobile optimized · All features functional
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
  AlertTriangle, Clock, CheckCircle2, HelpCircle, Info,
  ChevronDown
} from 'lucide-react';

/* ═══════════════════════════════════════════
   GLOBAL CSS (avec media queries responsives)
═══════════════════════════════════════════ */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

  .xp, .xp * { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }
  .xp-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace !important; }

  .xp {
    --bg:        #F4F6FB;
    --surface:   #FFFFFF;
    --surface2:  #F8FAFC;
    --border:    #E2E8F2;
    --border2:   #EDF1F8;
    --primary:   #4C6EF5;
    --primary-h: #3B5CE4;
    --primary-s: rgba(76,110,245,.08);
    --primary-r: rgba(76,110,245,.15);
    --text:      #1A2540;
    --text2:     #4A5878;
    --muted:     #8899B4;
    --success:   #0D9488;
    --warn:      #D97706;
    --danger:    #DC2626;
    --radius:    14px;
    --radius-sm: 9px;
    --radius-lg: 20px;
    --radius-xl: 28px;
    --shadow-xs: 0 1px 2px rgba(26,37,64,.04);
    --shadow-sm: 0 2px 8px rgba(26,37,64,.06), 0 1px 2px rgba(26,37,64,.04);
    --shadow-md: 0 8px 24px rgba(26,37,64,.08), 0 2px 4px rgba(26,37,64,.04);
    --shadow-lg: 0 20px 48px rgba(26,37,64,.12), 0 4px 8px rgba(26,37,64,.05);
    --shadow-xl: 0 32px 64px rgba(26,37,64,.16), 0 8px 16px rgba(26,37,64,.06);
  }
  .xp.dark {
    --bg:        #0C1525;
    --surface:   #14213A;
    --surface2:  #1A2D4A;
    --border:    #1F3355;
    --border2:   #243A60;
    --primary:   #6B8EFF;
    --primary-h: #7F9EFF;
    --primary-s: rgba(107,142,255,.1);
    --primary-r: rgba(107,142,255,.18);
    --text:      #E8EFF8;
    --text2:     #8FA8CC;
    --muted:     #4E6A8C;
    --success:   #2DD4BF;
    --warn:      #FBB;
    --danger:    #F87171;
    --shadow-xs: 0 1px 2px rgba(0,0,0,.2);
    --shadow-sm: 0 2px 8px rgba(0,0,0,.25);
    --shadow-md: 0 8px 24px rgba(0,0,0,.3);
    --shadow-lg: 0 20px 48px rgba(0,0,0,.4);
    --shadow-xl: 0 32px 64px rgba(0,0,0,.5);
  }

  /* Responsive : ajustement des variables d'espacement */
  @media (max-width: 768px) {
    .xp {
      --radius: 12px;
      --radius-sm: 7px;
      --radius-lg: 18px;
      --radius-xl: 24px;
    }
  }

  /* Animations */
  @keyframes xp-up    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes xp-in    { from { opacity:0; transform:scale(.97);       } to { opacity:1; transform:scale(1);     } }
  @keyframes xp-right { from { transform:translateX(100%); }            to { transform:translateX(0); }           }
  @keyframes xp-sheet { from { transform:translateY(100%); }            to { transform:translateY(0); }           }
  @keyframes xp-toast { from { opacity:0; transform:translateY(6px) scale(.96); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes xp-pulse { 0%,100% { opacity:.35; } 50% { opacity:.65; } }
  @keyframes xp-spin  { to { transform:rotate(360deg); } }

  .xp-anim-up    { animation: xp-up    .22s cubic-bezier(.22,1,.36,1) both; }
  .xp-anim-in    { animation: xp-in    .2s  cubic-bezier(.22,1,.36,1) both; }
  .xp-anim-right { animation: xp-right .3s  cubic-bezier(.22,1,.36,1); }
  .xp-anim-sheet { animation: xp-sheet .3s  cubic-bezier(.22,1,.36,1); }
  .xp-anim-toast { animation: xp-toast .28s cubic-bezier(.22,1,.36,1); }
  .xp-skeleton   { animation: xp-pulse 1.8s ease-in-out infinite; }

  /* Scrollbar */
  .xp-scroll::-webkit-scrollbar { width: 3px; }
  .xp-scroll::-webkit-scrollbar-track { background: transparent; }
  .xp-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  /* Shared base styles */
  .xp-surface {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
  }
  .xp-btn-ghost {
    background: transparent; border: none; cursor: pointer;
    color: var(--muted); border-radius: var(--radius-sm); transition: all .15s;
    display: flex; align-items: center; justify-content: center;
  }
  .xp-btn-ghost:hover { background: var(--surface2); color: var(--text); }
  .xp-tag {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 99px;
  }

  /* Input reset */
  .xp input, .xp textarea, .xp select {
    font-family: inherit; background: none; border: none; outline: none;
    color: var(--text); width: 100%;
  }
  .xp input::placeholder, .xp textarea::placeholder { color: var(--muted); }
  .xp textarea { resize: none; }
  .xp select { appearance: none; cursor: pointer; }

  /* Mark highlight */
  .xp mark {
    background: rgba(251,191,36,.22); color: inherit;
    border-radius: 3px; padding: 0 2px;
  }

  /* EBM level accent line */
  .xp-card-accent { border-left: 3px solid transparent; }

  /* Responsive helpers : certains éléments passent en colonne */
  @media (max-width: 640px) {
    .xp-stack-sm {
      flex-direction: column;
      align-items: stretch !important;
    }
    .xp-hide-text-sm {
      display: inline-block;
      width: 0;
      overflow: hidden;
      text-indent: -9999px;
    }
  }
`;

/* ═══════════════════════════════════════════
   TOAST (self-contained, no provider)
═══════════════════════════════════════════ */
interface ToastItem { id: number; msg: string; type: 'success' | 'error' | 'info' }
interface ToastHandle { success(m: string): void; error(m: string): void; info(m: string): void }

function useToastState(): [ToastItem[], ToastHandle] {
  const [list, setList] = useState<ToastItem[]>([]);
  const add = useCallback((msg: string, type: ToastItem['type']) => {
    const id = Date.now() + Math.random();
    setList(p => [...p.slice(-2), { id, msg, type }]);
    setTimeout(() => setList(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  const api = useMemo<ToastHandle>(() => ({
    success: m => add(m, 'success'),
    error:   m => add(m, 'error'),
    info:    m => add(m, 'info'),
  }), [add]);
  return [list, api];
}

function ToastContainer({ list }: { list: ToastItem[] }) {
  const icons = { success: '✓', error: '✕', info: '•' };
  const colors = { success: '#0D9488', error: '#DC2626', info: '#4C6EF5' };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {list.map(t => (
        <div key={t.id} className="xp-anim-toast"
          style={{
            background: colors[t.type], color: '#fff',
            padding: '10px 16px', borderRadius: 14, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,.18)',
            pointerEvents: 'auto', maxWidth: 280,
          }}>
          <span style={{ fontSize: 15 }}>{icons[t.type]}</span> {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   THEME
═══════════════════════════════════════════ */
interface ThemeCtx { dark: boolean; toggle: () => void }
const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    try { const s = localStorage.getItem('ep_theme'); if (s) return s === 'dark'; } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const toggle = useCallback(() => setDark(p => {
    const next = !p;
    try { localStorage.setItem('ep_theme', next ? 'dark' : 'light'); } catch {}
    return next;
  }), []);
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div className={dark ? 'dark' : ''} style={{ minHeight: '100vh' }}>{children}</div>
    </ThemeContext.Provider>
  );
}
export function useTheme() { return useContext(ThemeContext); }

/* ═══════════════════════════════════════════
   CONSTANTS & TYPES
═══════════════════════════════════════════ */
const RET_MAX = 10;
const MAX_BM  = 200;
const BASE    = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

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
  | { type: 'START'; q: string } | { type: 'OK'; r: Article[]; t: number }
  | { type: 'ERR'; m: string }   | { type: 'PAGE'; p: number } | { type: 'RESET' };

interface UIState {
  view: 'search' | 'bookmarks'; showFilters: boolean; panel: Article | null;
  showStats: boolean; showHist: boolean; showMesh: boolean;
  meshStatus: 'idle' | 'loading' | 'done' | 'error'; meshInput: string; meshResult: string;
}
type UA =
  | { type: 'VIEW'; v: 'search' | 'bookmarks' } | { type: 'PANEL'; a: Article | null }
  | { type: 'FILTERS' } | { type: 'STATS' }     | { type: 'HIST' }
  | { type: 'MESH_OPEN' } | { type: 'MESH_CLOSE' }
  | { type: 'MESH_INPUT'; v: string }
  | { type: 'MESH_LOADING' } | { type: 'MESH_OK'; result: string } | { type: 'MESH_ERR' };

/* ═══════════════════════════════════════════
   EBM
═══════════════════════════════════════════ */
const EBM_MAP: Record<string, { label: string; lvl: number }> = {
  'meta-analysis':               { label: 'Méta-analyse', lvl: 5 },
  'systematic review':           { label: 'Revue syst.',  lvl: 5 },
  'randomized controlled trial': { label: 'ECR',          lvl: 4 },
  'clinical trial':              { label: 'Essai clin.',  lvl: 3 },
  'review':                      { label: 'Revue',        lvl: 2 },
  'cohort study':                { label: 'Cohorte',      lvl: 2 },
  'case reports':                { label: 'Cas clin.',    lvl: 1 },
};
const EBM_C: Record<number, { text: string; bg: string; border: string }> = {
  5: { text: '#059669', bg: 'rgba(5,150,105,.1)',   border: 'rgba(5,150,105,.2)'   },
  4: { text: '#2563EB', bg: 'rgba(37,99,235,.1)',   border: 'rgba(37,99,235,.2)'   },
  3: { text: '#7C3AED', bg: 'rgba(124,58,237,.1)',  border: 'rgba(124,58,237,.2)'  },
  2: { text: '#D97706', bg: 'rgba(217,119,6,.1)',   border: 'rgba(217,119,6,.2)'   },
  1: { text: '#64748B', bg: 'rgba(100,116,139,.1)', border: 'rgba(100,116,139,.2)' },
};
const getEBM = (t: string[] = []) => {
  for (const p of t.map(x => x.toLowerCase()))
    for (const [k, v] of Object.entries(EBM_MAP))
      if (p.includes(k)) return v;
  return null;
};

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
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
  throw new Error('retry exhausted');
}
async function apiFetch(ep: string, params: Record<string, any> = {}, signal?: AbortSignal): Promise<any> {
  const url = new URL(`${BASE}/${ep}`);
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') url.searchParams.set(k, String(v)); });
  const res = await fetch(url.toString(), signal ? { signal } : {});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return params.retmode === 'xml' ? res.text() : res.json();
}
function parseArticle(rm: any, id: string): Article {
  return {
    pmid: id,
    title: rm[id]?.title || '',
    authors: (rm[id]?.authors || []).map((a: any) => a.name),
    journal: rm[id]?.fulljournalname || rm[id]?.source || '',
    pubdate: rm[id]?.pubdate || '',
    doi: rm[id]?.elocationid?.startsWith('doi:') ? rm[id].elocationid.slice(4) : '',
    pubtype: rm[id]?.pubtype || [],
  };
}
function Hl({ text, q }: { text: string; q: string }) {
  if (!q.trim()) return <>{text}</>;
  const words = q.trim().split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return <>{text.split(re).map((p, i) => re.test(p) ? <mark key={i}>{p}</mark> : p)}</>;
}
const readMins = (t: string) => { const m = Math.ceil(t.trim().split(/\s+/).length / 200); return m <= 1 ? '< 1 min' : `${m} min`; };

/* ═══════════════════════════════════════════
   MESH GENERATOR
═══════════════════════════════════════════ */
async function buildMeshQuery(input: string): Promise<string> {
  const r1 = await retry(() => apiFetch('esearch.fcgi', { db: 'pubmed', term: input, retmax: 0, retmode: 'json' }));
  const qt: string = r1.esearchresult?.querytranslation || '';
  const r2 = await retry(() => apiFetch('esearch.fcgi', { db: 'mesh',   term: input, retmax: 6, retmode: 'json' }));
  const ids: string[] = r2.esearchresult?.idlist || [];
  let terms: string[] = [];
  if (ids.length) {
    const r3 = await retry(() => apiFetch('esummary.fcgi', { db: 'mesh', id: ids.slice(0, 5).join(','), retmode: 'json' }));
    const res = r3.result || {};
    terms = ids.filter(id => res[id]).map(id => res[id].ds_meshterms?.[0] || '').filter(Boolean);
  }
  const acronyms = (input.match(/\b[A-Z]{2,5}\b/g) || []).slice(0, 3);
  const g1 = [`"${input.slice(0, 80).replace(/"/g, '').trim()}"`, ...acronyms].join(' OR ');
  const g2 = terms.length ? terms.slice(0, 4).map(t => `"${t}"[Mesh]`).join(' OR ') : qt || g1;
  return [
    `// Requête PubMed pour : ${input.slice(0, 80)}`,
    `// ${terms.length} terme(s) MeSH officiel(s) trouvé(s)`,
    `// Collez dans PubMed > Advanced Search`,
    '', `(${g1})`, 'AND', `(${g2})`,
  ].join('\n');
}

/* ═══════════════════════════════════════════
   REDUCERS
═══════════════════════════════════════════ */
function sR(s: SearchState, a: SA): SearchState {
  switch (a.type) {
    case 'START': return { ...s, loading: true,  error: null, searched: true, lastQuery: a.q };
    case 'OK':    return { ...s, loading: false, results: a.r, total: a.t };
    case 'ERR':   return { ...s, loading: false, error: a.m, results: [] };
    case 'PAGE':  return { ...s, page: a.p };
    case 'RESET': return { ...s, results: [], total: 0, searched: false, page: 1, lastQuery: '', error: null };
    default:      return s;
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

/* ═══════════════════════════════════════════
   DESIGN TOKENS — CSS vars helpers
═══════════════════════════════════════════ */
const v = (name: string) => `var(--${name})`;
const s = {
  surface:   { background: v('surface'),   border: `1px solid ${v('border2')}` },
  surface2:  { background: v('surface2'),  border: `1px solid ${v('border')}` },
  btnPrimary: {
    background: v('primary'), color: '#fff', border: 'none',
    borderRadius: v('radius-sm'), cursor: 'pointer', fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'all .15s',
  } as React.CSSProperties,
  card: {
    background: v('surface'), border: `1px solid ${v('border2')}`,
    borderRadius: v('radius'), boxShadow: v('shadow-sm'),
    transition: 'box-shadow .18s, border-color .18s, transform .18s',
    cursor: 'pointer',
  } as React.CSSProperties,
};

/* ═══════════════════════════════════════════
   ICON BUTTON
═══════════════════════════════════════════ */
function IBtn({
  icon: Icon, onClick, active = false, activeColor, title, size = 16,
}: {
  icon: React.ElementType; onClick?: () => void; active?: boolean;
  activeColor?: string; title?: string; size?: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: active ? (activeColor ? activeColor + '15' : v('primary-s')) : hover ? v('surface2') : 'transparent',
        border: 'none', cursor: 'pointer', borderRadius: v('radius-sm'),
        padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? (activeColor || v('primary')) : hover ? v('text') : v('muted'),
        transition: 'all .15s',
      }}>
      <Icon size={size} strokeWidth={2} />
    </button>
  );
}

/* ═══════════════════════════════════════════
   EBM BADGE
═══════════════════════════════════════════ */
function EBMBadge({ lvl, label }: { lvl: number; label: string }) {
  const c = EBM_C[lvl];
  return (
    <span style={{
      ...c, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const,
      padding: '3px 8px', borderRadius: 99, border: `1px solid ${c.border}`,
    }}>{label}</span>
  );
}

/* ═══════════════════════════════════════════
   SEARCH BAR (responsif)
═══════════════════════════════════════════ */
interface SBProps {
  large?: boolean; loading: boolean; showFilters: boolean; showHist: boolean; hist: string[];
  onSearch(q: string): void; onToggleFilters(): void; onClear(): void;
  onHistSelect(h: string): void; onHistClear(): void; onHist(): void;
}
const SearchBar = React.memo(({
  large = false, loading, showFilters, showHist, hist,
  onSearch, onToggleFilters, onClear, onHistSelect, onHistClear, onHist,
}: SBProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const submit = () => { const v = inputRef.current?.value.trim() ?? ''; if (v) onSearch(v); };
  const clear  = () => { if (inputRef.current) inputRef.current.value = ''; onClear(); };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: v('surface'), border: `1.5px solid ${focused ? v('primary') : v('border')}`,
        borderRadius: large ? 18 : 13, padding: large ? '10px 10px 10px 16px' : '7px 7px 7px 12px',
        boxShadow: focused ? `0 0 0 3px ${v('primary-s')}` : v('shadow-xs'),
        transition: 'all .2s',
      }}>
        <Search size={large ? 18 : 15} strokeWidth={2.2} style={{ color: v('primary'), flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          onFocus={() => { setFocused(true); if (hist.length) onHist(); }}
          onBlur={() => { setFocused(false); setTimeout(onHist, 200); }}
          placeholder={large ? 'Mots-clés, auteurs, DOI, requête booléenne… · Entrée pour lancer' : (isMobile ? 'Rechercher…' : 'Rechercher…')}
          style={{
            flex: 1, fontSize: large ? 15 : 13, fontWeight: 500,
            background: 'none', border: 'none', outline: 'none', color: v('text'),
          }}
          aria-label="Recherche PubMed"
          autoComplete="off" spellCheck={false}
        />
        <button onClick={clear} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 5,
          color: v('muted'), borderRadius: 8, display: 'flex', alignItems: 'center',
          transition: 'color .15s',
        }} title="Effacer">
          <X size={13} strokeWidth={2.5} />
        </button>
        <button onClick={onToggleFilters} style={{
          background: showFilters ? v('primary-s') : 'none',
          border: 'none', cursor: 'pointer', padding: '6px 8px',
          color: showFilters ? v('primary') : v('muted'), borderRadius: 9,
          display: 'flex', alignItems: 'center', transition: 'all .15s',
        }} title="Filtres">
          <Filter size={14} strokeWidth={2.2} />
        </button>
        <button
          onClick={submit} disabled={loading}
          style={{
            ...s.btnPrimary,
            borderRadius: large ? 12 : 9,
            padding: large ? '9px 20px' : '7px 14px',
            fontSize: large ? 14 : 12, opacity: loading ? .55 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            // Sur mobile, on masque le texte du bouton
            ...(isMobile ? { width: 32, padding: '7px', justifyContent: 'center' } : {}),
          }}>
          {loading
            ? <Loader2 size={13} style={{ animation: 'xp-spin 1s linear infinite' }} />
            : <Search size={13} strokeWidth={2.5} />
          }
          {!isMobile && <span style={{ display: large ? 'inline' : 'none' }}>Rechercher</span>}
        </button>
      </div>

      {/* History dropdown */}
      {showHist && hist.length > 0 && (
        <div className="xp-anim-in" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: v('surface'), border: `1px solid ${v('border')}`,
          borderRadius: v('radius'), boxShadow: v('shadow-md'), overflow: 'hidden', zIndex: 20,
        }}>
          {hist.map((h, i) => (
            <button key={i}
              onMouseDown={e => { e.preventDefault(); if (inputRef.current) inputRef.current.value = h; onHistSelect(h); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: v('text2'), textAlign: 'left' as const,
                transition: 'background .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = v('surface2'))}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <History size={13} strokeWidth={2} style={{ color: v('muted'), flexShrink: 0 }} /> {h}
            </button>
          ))}
          <button
            onMouseDown={e => { e.preventDefault(); onHistClear(); }}
            style={{
              display: 'block', width: '100%', padding: '8px 16px',
              background: 'none', border: 'none', borderTop: `1px solid ${v('border2')}`,
              cursor: 'pointer', fontSize: 11, color: v('muted'), textAlign: 'left' as const,
              transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = v('surface2'))}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >Effacer l'historique</button>
        </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════
   FILTER PANEL (responsif)
═══════════════════════════════════════════ */
const FilterPanel = React.memo(({ F, setF }: { F: FilterState; setF: React.Dispatch<React.SetStateAction<FilterState>> }) => {
  const inputStyle: React.CSSProperties = {
    background: v('surface2'), border: `1px solid ${v('border')}`,
    borderRadius: 10, padding: '9px 13px', fontSize: 13, fontWeight: 500,
    color: v('text'), width: '100%',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const,
    color: v('muted'), marginBottom: 6, display: 'block',
  };
  return (
    <div className="xp-anim-in" style={{
      background: v('surface'), border: `1px solid ${v('border')}`,
      borderRadius: v('radius-lg'), padding: '20px 20px 16px',
      boxShadow: v('shadow-sm'), marginTop: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Filter size={13} strokeWidth={2.5} style={{ color: v('primary') }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: v('muted') }}>Filtres de recherche</span>
      </div>
      {/* Sur mobile, les champs passent en colonne */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 14,
      }}>
        {[{ k: 'yearFrom', ph: '2000', label: 'Année début' }, { k: 'yearTo', ph: '2025', label: 'Année fin' }].map(({ k, ph, label }) => (
          <div key={k}>
            <span style={labelStyle}>{label}</span>
            <input type="number" placeholder={ph} value={F[k as keyof FilterState]}
              onChange={e => setF(p => ({ ...p, [k]: e.target.value }))}
              style={inputStyle} />
          </div>
        ))}
        <div>
          <span style={labelStyle}>Type d'étude</span>
          <div style={{ position: 'relative' }}>
            <select value={F.type} onChange={e => setF(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
              <option value="">Tous types</option>
              <option value="meta-analysis">Méta-analyse</option>
              <option value="systematic review">Revue systématique</option>
              <option value="randomized controlled trial">ECR</option>
              <option value="clinical trial">Essai clinique</option>
              <option value="review">Revue narrative</option>
              <option value="case reports">Cas clinique</option>
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: v('muted'), pointerEvents: 'none' }} />
          </div>
        </div>
        <div>
          <span style={labelStyle}>Trier par</span>
          <div style={{ position: 'relative' }}>
            <select value={F.sort} onChange={e => setF(p => ({ ...p, sort: e.target.value }))} style={inputStyle}>
              <option value="relevance">Pertinence</option>
              <option value="pubdate">Date (récent)</option>
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: v('muted'), pointerEvents: 'none' }} />
          </div>
        </div>
      </div>
      {/* EBM legend */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${v('border2')}` }}>
        <span style={{ ...labelStyle, marginBottom: 8 }}>Niveaux de preuve EBM</span>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
          {([5, 4, 3, 2, 1] as const).map(lvl => {
            const entry = Object.values(EBM_MAP).find(e => e.lvl === lvl);
            const c = EBM_C[lvl];
            return entry ? (
              <span key={lvl} style={{ ...c, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, padding: '3px 9px', borderRadius: 99, border: `1px solid ${c.border}` }}>
                {entry.label}
              </span>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════
   STATS PANEL (responsif)
═══════════════════════════════════════════ */
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
    <div className="xp-anim-in" style={{
      ...s.surface, padding: '16px 18px', marginBottom: 16, borderRadius: v('radius-lg'),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
        <BarChart3 size={13} strokeWidth={2.5} style={{ color: v('primary') }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: v('muted') }}>
          Stats · {data.length} articles
        </span>
      </div>
      <span style={{ fontSize: 11, color: v('muted'), fontWeight: 600, marginBottom: 8, display: 'block' }}>Distribution temporelle</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 44, marginBottom: 4 }}>
        {years.map(([y, c]) => (
          <div key={y} title={`${y}: ${c}`} style={{
            flex: 1, borderRadius: '3px 3px 0 0',
            minHeight: 3, height: Math.max(3, c / maxY * 44),
            background: `rgba(76,110,245,${0.2 + 0.8 * (c / maxY)})`,
            transition: 'height .3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        {[years[0]?.[0], years[years.length - 1]?.[0]].map((y, i) => (
          <span key={i} className="xp-mono" style={{ fontSize: 10, color: v('muted') }}>{y}</span>
        ))}
      </div>
      <span style={{ fontSize: 11, color: v('muted'), fontWeight: 600, marginBottom: 8, display: 'block' }}>Types d'études</span>
      {types.map(([label, count]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: v('text2'), width: 96, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{label}</span>
          <div style={{ flex: 1, height: 4, background: v('border'), borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: v('primary'), borderRadius: 99, width: `${count / data.length * 100}%`, transition: 'width .4s' }} />
          </div>
          <span className="xp-mono" style={{ fontSize: 10, color: v('muted'), width: 16, textAlign: 'right' as const }}>{count}</span>
        </div>
      ))}
    </div>
  );
});

/* ═══════════════════════════════════════════
   ARTICLE CARD (responsif)
═══════════════════════════════════════════ */
const ArticleCard = React.memo(({
  art, selected, onClick, onBookmark, bookmarked, searchQuery,
  compareSet, onCompare, onAuthorSearch, notes, onNote, delay = 0,
}: {
  art: Article; selected: boolean; onClick(): void;
  onBookmark(id: string): void; bookmarked: boolean; searchQuery: string;
  compareSet: Set<string>; onCompare(id: string): void;
  onAuthorSearch(a: string): void;
  notes: Record<string, string>; onNote(id: string, v: string): void;
  delay?: number;
}) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteVal, setNoteVal] = useState(notes[art.pmid] || '');
  const [hovered, setHovered] = useState(false);
  const ebm = getEBM(art.pubtype);
  const c = ebm ? EBM_C[ebm.lvl] : null;

  return (
    <div className="xp-anim-up" style={{ animationDelay: `${delay}ms` }}>
      <div
        role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onClick()}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...s.card,
          borderLeft: `3px solid ${c ? c.text : 'transparent'}`,
          borderColor: selected ? v('primary') : hovered ? v('primary') + '44' : v('border2'),
          boxShadow: hovered || selected ? v('shadow-md') : v('shadow-xs'),
          transform: hovered && !selected ? 'translateY(-1px)' : 'none',
          outline: selected ? `2px solid ${v('primary')}22` : 'none',
        }}>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 600, lineHeight: 1.45, marginBottom: 8,
                color: selected ? v('primary') : v('text'),
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
              }}>
                <Hl text={art.title} q={searchQuery} />
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 8 }}>
                {art.authors.slice(0, 4).map((a, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); onAuthorSearch(a); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 11, color: v('text2'), fontWeight: 500, transition: 'color .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = v('primary'))}
                    onMouseLeave={e => (e.currentTarget.style.color = v('text2'))}>
                    {a}{i < Math.min(3, art.authors.length - 1) ? ',' : ''}
                  </button>
                ))}
                {art.authors.length > 4 && <span style={{ fontSize: 11, color: v('muted') }}>+{art.authors.length - 4}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8 }}>
                <span style={{ fontSize: 11, color: v('muted'), fontStyle: 'italic', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{art.journal}</span>
                <span className="xp-mono" style={{ fontSize: 10, color: v('muted'), marginLeft: 'auto' }}>{art.pubdate.slice(0, 4)}</span>
                {ebm && c && <EBMBadge lvl={ebm.lvl} label={ebm.label} />}
                {notes[art.pmid] && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' as const, padding: '2px 7px', borderRadius: 99, background: 'rgba(217,119,6,.1)', color: '#D97706', border: '1px solid rgba(217,119,6,.2)' }}>note</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <IBtn icon={bookmarked ? BookmarkCheck : Bookmark} onClick={() => onBookmark(art.pmid)} active={bookmarked} activeColor="#D97706" title={bookmarked ? 'Retirer' : 'Ajouter aux favoris'} />
              <IBtn icon={PenLine} onClick={() => setNoteOpen(p => !p)} active={noteOpen} activeColor="#7C3AED" title="Annoter" />
              <IBtn icon={GitCompare} onClick={() => onCompare(art.pmid)} active={compareSet.has(art.pmid)} title="Comparer" />
            </div>
          </div>
          {noteOpen && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${v('border2')}` }} onClick={e => e.stopPropagation()}>
              <textarea value={noteVal} onChange={e => setNoteVal(e.target.value)}
                placeholder="Vos annotations…" rows={2}
                style={{ background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: 9, padding: '8px 12px', fontSize: 12, color: v('text'), width: '100%', resize: 'none', transition: 'border .15s' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' as const }}>
                <button onClick={() => { onNote(art.pmid, noteVal); setNoteOpen(false); }}
                  style={{ ...s.btnPrimary, padding: '6px 14px', fontSize: 12, borderRadius: 8 }}>Sauvegarder</button>
                <button onClick={() => setNoteOpen(false)}
                  style={{ background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: v('text2'), cursor: 'pointer' }}>Annuler</button>
                {notes[art.pmid] && (
                  <button onClick={() => { onNote(art.pmid, ''); setNoteVal(''); setNoteOpen(false); }}
                    style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.15)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#DC2626', cursor: 'pointer', marginLeft: 'auto' }}>Supprimer</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════
   COMPARE BAR (responsif)
═══════════════════════════════════════════ */
const CompareBar = React.memo(({ ids, arts, onClear }: { ids: Set<string>; arts: Article[]; onClear(): void }) => {
  if (ids.size < 2) return null;
  const sel = arts.filter(a => ids.has(a.pmid));
  return (
    <div className="xp-anim-up" style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 50, background: v('surface'), border: `1px solid ${v('border')}`,
      borderRadius: v('radius-xl'), padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: v('shadow-xl'), maxWidth: 480, width: '92%',
    }}>
      <GitCompare size={15} strokeWidth={2} style={{ color: v('primary'), flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: v('muted'), marginBottom: 5 }}>Comparer {ids.size} articles</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {sel.map(a => (
            <span key={a.pmid} className="xp-mono" style={{ fontSize: 10, background: v('primary-s'), color: v('primary'), padding: '2px 8px', borderRadius: 6 }}>
              PMID {a.pmid}
            </span>
          ))}
        </div>
      </div>
      <button onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/?linkname=pubmed_pubmed&from_uid=${[...ids].join(',')}`, '_blank', 'noreferrer')}
        style={{ ...s.btnPrimary, padding: '8px 14px', fontSize: 12, borderRadius: 10, flexShrink: 0 }}>
        Voir <ArrowUpRight size={13} />
      </button>
      <IBtn icon={X} onClick={onClear} size={14} />
    </div>
  );
});

/* ═══════════════════════════════════════════
   MESH MODAL (responsif)
═══════════════════════════════════════════ */
const MeshModal = React.memo(({
  input, onInputChange, status, result, onGenerate, onApply, onClose,
}: {
  input: string; onInputChange(v: string): void;
  status: UIState['meshStatus']; result: string;
  onGenerate(): void; onApply(q: string): void; onClose(): void;
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setTimeout(() => taRef.current?.focus(), 80); }, []);
  const queryOnly = result.split('\n').filter(l => !l.startsWith('//')).join('\n').trim();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(4px)' }} />
      <div className="xp-anim-in" style={{
        position: 'relative', background: v('surface'),
        width: '100%', maxWidth: 600, maxHeight: '88vh',
        borderRadius: v('radius-xl'), boxShadow: v('shadow-xl'),
        display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
        border: `1px solid ${v('border')}`,
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${v('border2')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: v('surface'),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: v('primary-s'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} strokeWidth={2} style={{ color: v('primary') }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: v('text') }}>Générateur MeSH</div>
              <div style={{ fontSize: 11, color: v('muted'), marginTop: 2 }}>Via PubMed E-utilities · Expérimental</div>
            </div>
          </div>
          <IBtn icon={X} onClick={onClose} />
        </div>

        {/* Body */}
        <div className="xp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 24px', display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, background: v('primary-s'), color: v('primary'), fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: v('text') }}>Entrez un titre ou sujet médical</span>
            </div>
            <textarea
              ref={taRef} value={input} onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onGenerate(); } }}
              placeholder={'Exemples :\n• Diabète de type 2 et risque cardiovasculaire\n• mRNA vaccine efficacy COVID-19\n\nCtrl+Entrée pour générer'}
              rows={5}
              style={{
                width: '100%', background: v('surface2'), border: `1px solid ${v('border')}`,
                borderRadius: v('radius'), padding: '12px 15px', fontSize: 13,
                color: v('text'), resize: 'none', lineHeight: 1.6, transition: 'border .15s',
              }}
              className="xp-mono"
              onFocus={e => e.target.style.border = `1px solid ${v('primary')}`}
              onBlur={e => e.target.style.border = `1px solid ${v('border')}`}
            />
          </div>
          <button onClick={onGenerate} disabled={!input.trim() || status === 'loading'}
            style={{
              ...s.btnPrimary, padding: '12px 20px', borderRadius: v('radius'),
              fontSize: 13, opacity: (!input.trim() || status === 'loading') ? .5 : 1,
              cursor: (!input.trim() || status === 'loading') ? 'not-allowed' : 'pointer',
            }}>
            {status === 'loading'
              ? <><Loader2 size={15} style={{ animation: 'xp-spin 1s linear infinite' }} /> Interrogation PubMed MeSH…</>
              : <><Sparkles size={15} /> Générer la requête MeSH · Ctrl+Entrée</>
            }
          </button>
          {status === 'error' && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
              background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.15)',
              borderRadius: v('radius'), color: '#DC2626', fontSize: 13,
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              Erreur PubMed. Vérifiez votre connexion et réessayez.
            </div>
          )}
          {status === 'done' && result && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 99, background: v('primary-s'), color: v('primary'), fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: v('text') }}>Requête PubMed générée</span>
              </div>
              <div style={{ background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: v('radius'), overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: `1px solid ${v('border2')}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} strokeWidth={2.5} style={{ color: '#059669' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: v('muted') }}>Prête à utiliser</span>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(queryOnly); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: v('muted'), padding: '4px 8px', borderRadius: 7, transition: 'all .12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = v('border'); e.currentTarget.style.color = v('text'); }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = v('muted'); }}>
                    <Copy size={12} /> Copier
                  </button>
                </div>
                <pre className="xp-mono xp-scroll" style={{ padding: '14px 15px', fontSize: 12, color: v('text2'), whiteSpace: 'pre-wrap' as const, lineHeight: 1.7, overflowX: 'auto', maxHeight: 180, overflowY: 'auto', margin: 0 }}>
                  {result}
                </pre>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => { onApply(queryOnly); onClose(); }}
                  style={{ ...s.btnPrimary, padding: '11px 16px', fontSize: 13, borderRadius: v('radius') }}>
                  <ArrowRight size={14} /> Appliquer
                </button>
                <button onClick={() => navigator.clipboard.writeText(queryOnly)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: v('radius'),
                    padding: '11px 16px', fontSize: 13, fontWeight: 600, color: v('text2'), cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = v('border')}
                  onMouseLeave={e => e.currentTarget.style.background = v('surface2')}>
                  <ExternalLink size={14} /> Copier pour PubMed
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  { label: 'Synonymes libres', desc: 'Termes entre guillemets avec OR', color: 'rgba(37,99,235,.08)', border: 'rgba(37,99,235,.2)', text: '#1D4ED8' },
                  { label: 'Termes MeSH', desc: 'Termes officiels PubMed [Mesh]', color: 'rgba(5,150,105,.08)', border: 'rgba(5,150,105,.2)', text: '#047857' },
                ].map(c => (
                  <div key={c.label} style={{ background: c.color, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c.text, marginBottom: 3 }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: c.text, opacity: .7 }}>{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '10px 24px', borderTop: `1px solid ${v('border2')}`, background: v('surface2') }}>
          <p style={{ fontSize: 11, color: v('muted'), fontStyle: 'italic' }}>Utilise PubMed esearch + base MeSH · Données traitées localement · NB: expérimental</p>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════
   HELP MODAL (responsif)
═══════════════════════════════════════════ */
const HelpModal = React.memo(({ onClose }: { onClose(): void }) => {
  const step = (n: number, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ width: 22, height: 22, borderRadius: 99, background: v('primary-s'), color: v('primary'), fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: v('text') }}>{label}</span>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(4px)' }} />
      <div className="xp-anim-in" style={{
        position: 'relative', background: v('surface'), width: '100%', maxWidth: 600,
        maxHeight: '88vh', borderRadius: v('radius-xl'), boxShadow: v('shadow-xl'),
        display: 'flex', flexDirection: 'column' as const, border: `1px solid ${v('border')}`,
      }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${v('border2')}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: v('text') }}>Guide Xplorer</span>
          <IBtn icon={X} onClick={onClose} />
        </div>
        <div className="xp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column' as const, gap: 26 }}>
          {/* Search */}
          <section>
            {step(1, 'Recherche PubMed')}
            <p style={{ fontSize: 13, lineHeight: 1.6, color: v('text2'), marginBottom: 12 }}>
              Tapez des mots-clés, un auteur, un DOI ou une requête booléenne. Appuyez sur{' '}
              <kbd style={{ padding: '2px 7px', background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: 5, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: v('text') }}>Entrée</kbd> pour lancer.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { label: 'Auteur[AU]',     desc: 'Smith J[AU]' },
                { label: 'DOI direct',     desc: 'Collez un DOI' },
                { label: 'Booléen',        desc: 'diabetes AND hypertension' },
                { label: 'MeSH[Mesh]',     desc: 'Hypertension[Mesh]' },
              ].map(c => (
                <div key={c.label} style={{ background: v('surface2'), border: `1px solid ${v('border2')}`, borderRadius: 10, padding: '10px 12px' }}>
                  <div className="xp-mono" style={{ fontSize: 12, fontWeight: 600, color: v('text'), marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: v('muted') }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </section>
          {/* EBM */}
          <section>
            {step(2, 'Niveaux de preuve EBM')}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {([5, 4, 3, 2, 1] as const).map(lvl => {
                const descs: Record<number, string> = {
                  5: 'Méta-analyse / Revue systématique — plus haut niveau de preuve',
                  4: 'Essai randomisé contrôlé (ECR) — gold standard expérimental',
                  3: 'Essai clinique non randomisé',
                  2: 'Étude de cohorte ou revue narrative',
                  1: 'Cas clinique — niveau de preuve le plus faible',
                };
                const c = EBM_C[lvl];
                return (
                  <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: v('surface2'), border: `1px solid ${v('border2')}`, borderRadius: 10 }}>
                    <span style={{ ...c, fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, padding: '3px 9px', borderRadius: 99, border: `1px solid ${c.border}`, flexShrink: 0 }}>Niv. {lvl}/5</span>
                    <span style={{ fontSize: 12, color: v('text2') }}>{descs[lvl]}</span>
                  </div>
                );
              })}
            </div>
          </section>
          {/* Features */}
          <section>
            {step(3, 'Fonctionnalités')}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
              {[
                { icon: Sparkles,   label: 'Générateur MeSH',   desc: 'Transforme une phrase libre en requête PubMed optimisée via E-utilities.' },
                { icon: Bookmark,   label: 'Favoris',            desc: 'Sauvegardez jusqu\'à 200 articles (localStorage), exportables .ris.' },
                { icon: PenLine,    label: 'Notes',              desc: 'Annotez chaque article, visible en badge sur les cartes.' },
                { icon: GitCompare, label: 'Comparaison',        desc: 'Sélectionnez 2–3 articles pour les comparer sur PubMed.' },
                { icon: Download,   label: 'Export .ris',        desc: 'Format compatible Zotero, Mendeley, EndNote.' },
                { icon: BarChart3,  label: 'Statistiques',       desc: 'Distribution temporelle et types d\'études de vos résultats.' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: v('primary-s'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} strokeWidth={2} style={{ color: v('primary') }} />
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: v('text') }}>{label}</span>
                    <p style={{ fontSize: 12, color: v('muted'), marginTop: 2, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {/* Shortcuts */}
          <section>
            {step(4, 'Raccourcis clavier')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { key: '/', desc: 'Focus recherche' },
                { key: 'Entrée', desc: 'Lancer la recherche' },
                { key: 'Échap', desc: 'Fermer panneau / aide' },
                { key: 'Ctrl+Entrée', desc: 'Générer MeSH (modal)' },
              ].map(({ key, desc }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: v('surface2'), border: `1px solid ${v('border2')}`, borderRadius: 10, padding: '9px 12px' }}>
                  <kbd className="xp-mono" style={{ padding: '3px 8px', background: v('surface'), border: `1px solid ${v('border')}`, borderRadius: 6, fontSize: 11, fontWeight: 600, color: v('text'), flexShrink: 0 }}>{key}</kbd>
                  <span style={{ fontSize: 11, color: v('muted') }}>{desc}</span>
                </div>
              ))}
            </div>
          </section>
          <div style={{ borderTop: `1px solid ${v('border2')}`, paddingTop: 14 }}>
            <a href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: v('primary'), textDecoration: 'none', opacity: .9 }}>
              <Info size={13} /> Base de données PubMed — NLM/NIH <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════
   ARTICLE PANEL (slide-in, déjà responsive)
═══════════════════════════════════════════ */
function ArticlePanel({
  art, bookmarks, notes, onBookmark, onNote, onAuthorSearch, onClose, toast,
}: {
  art: Article; bookmarks: string[]; notes: Record<string, string>;
  onBookmark(id: string): void; onNote(id: string, v: string): void;
  onAuthorSearch(a: string): void; onClose(): void; toast: ToastHandle;
}) {
  const [abstract, setAbstract] = useState<string | null>(null);
  const [absLoading, setAbsLoading] = useState(false);
  const [related, setRelated] = useState<Article[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isBm = bookmarks.includes(art.pmid);
  const ebm = getEBM(art.pubtype);
  const c = ebm ? EBM_C[ebm.lvl] : null;

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 60);
    setRelated([]);
    const cached = absCache.get(art.pmid);
    if (cached) { setAbstract(cached); return; }
    setAbstract(null); setAbsLoading(true);
    const ctrl = new AbortController();
    (async () => {
      try {
        const xml = await apiFetch(`efetch.fcgi`, { db: 'pubmed', id: art.pmid, retmode: 'xml' }, ctrl.signal);
        const doc = new DOMParser().parseFromString(xml as string, 'text/xml');
        let txt = '';
        doc.querySelectorAll('AbstractText').forEach(el => { const l = el.getAttribute('Label'); txt += (l ? `${l}: ` : '') + el.textContent + '\n\n'; });
        txt = txt.trim() || 'Résumé non disponible.';
        absCache.set(art.pmid, txt); setAbstract(txt);
      } catch (e: any) { if (e.name !== 'AbortError') setAbstract('Erreur de chargement.'); }
      finally { setAbsLoading(false); }
    })();
    (async () => {
      try {
        const r = await apiFetch(`elink.fcgi`, { dbfrom: 'pubmed', db: 'pubmed', id: art.pmid, cmd: 'neighbor_score', retmode: 'json' }, ctrl.signal);
        const ids = ((r?.linksets?.[0]?.linksetdbs?.[0]?.links) || []).slice(0, 4).map(String);
        if (!ids.length) return;
        const s2 = await apiFetch(`esummary.fcgi`, { db: 'pubmed', id: ids.join(','), retmode: 'json' }, ctrl.signal);
        const rm = s2.result;
        setRelated(ids.filter((id: string) => rm[id]).map((id: string) => parseArticle(rm, id)));
      } catch {}
    })();
    return () => ctrl.abort();
  }, [art.pmid]);

  const copyCitation = () => {
    const au = art.authors.slice(0, 3).join(', ') + (art.authors.length > 3 ? ' et al.' : '');
    navigator.clipboard.writeText(`${au} (${art.pubdate.slice(0, 4)}). ${art.title}. ${art.journal}. PMID: ${art.pmid}.`);
    toast.success('Citation copiée !');
  };

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed', inset: '0 0 0 0', zIndex: 200,
    background: v('surface'),
    display: 'flex', flexDirection: 'column',
    animation: 'xp-sheet .3s cubic-bezier(.22,1,.36,1)',
  } : {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, zIndex: 100,
    background: v('surface'), borderLeft: `1px solid ${v('border')}`,
    display: 'flex', flexDirection: 'column',
    boxShadow: '-20px 0 48px rgba(0,0,0,.08)',
    animation: 'xp-right .3s cubic-bezier(.22,1,.36,1)',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99, background: isMobile ? 'rgba(0,0,0,.4)' : 'transparent', backdropFilter: isMobile ? 'blur(2px)' : 'none' }} />
      <div style={panelStyle}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${v('border2')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: v('surface'), flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: v('primary-s'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={15} style={{ color: v('primary') }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: v('text') }}>Aperçu de l'article</div>
              <div className="xp-mono" style={{ fontSize: 10, color: v('muted'), marginTop: 1 }}>PMID {art.pmid}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IBtn icon={isBm ? BookmarkCheck : Bookmark} onClick={() => onBookmark(art.pmid)} active={isBm} activeColor="#D97706" title={isBm ? 'Retirer' : 'Ajouter aux favoris'} />
            <button ref={closeRef} onClick={onClose} aria-label="Fermer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 9, color: v('muted'), display: 'flex', alignItems: 'center', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = v('surface2'); e.currentTarget.style.color = v('text'); }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = v('muted'); }}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="xp-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            {[
              { label: 'Publication', value: art.pubdate.slice(0, 4), mono: true, style: {} },
              { label: 'Niveau EBM', value: ebm ? `Niv. ${ebm.lvl}/5` : '—', style: c ? { background: c.bg, border: `1px solid ${c.border}` } : {} },
              { label: 'Type', value: ebm ? ebm.label : 'Non classé', style: c ? { background: c.bg, border: `1px solid ${c.border}` } : {} },
            ].map(({ label, value, mono, style: st }) => (
              <div key={label} style={{
                background: v('surface2'), border: `1px solid ${v('border2')}`,
                borderRadius: 11, padding: '10px 8px', textAlign: 'center' as const,
                ...st,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: c && st && Object.keys(st).length ? c.text : v('muted'), marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c && st && Object.keys(st).length ? c.text : v('text'), fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 17, fontWeight: 800, color: v('text'), lineHeight: 1.4, marginBottom: 14 }}>{art.title}</h2>

          {/* Authors */}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 18 }}>
            {art.authors.slice(0, 8).map((a, i) => (
              <button key={i} onClick={() => onAuthorSearch(a)} title={`Rechercher ${a}`}
                style={{
                  background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: 99,
                  padding: '5px 12px', fontSize: 12, color: v('text2'), fontWeight: 500, cursor: 'pointer',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = v('primary-s'); e.currentTarget.style.color = v('primary'); e.currentTarget.style.borderColor = v('primary') + '44'; }}
                onMouseLeave={e => { e.currentTarget.style.background = v('surface2'); e.currentTarget.style.color = v('text2'); e.currentTarget.style.borderColor = v('border'); }}>
                {a}
              </button>
            ))}
            {art.authors.length > 8 && <span style={{ fontSize: 12, color: v('muted'), alignSelf: 'center' }}>+{art.authors.length - 8}</span>}
          </div>

          {/* Abstract */}
          <div style={{ background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: v('radius-lg'), overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: `1px solid ${v('border2')}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: v('muted') }}>Résumé</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {abstract && abstract !== 'Résumé non disponible.' && (
                  <span style={{ fontSize: 11, color: v('muted'), display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {readMins(abstract)}
                  </span>
                )}
                {abstract && (
                  <button onClick={() => { navigator.clipboard.writeText(abstract!); toast.success('Abstract copié !'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 7, color: v('muted'), display: 'flex', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = v('border'); e.currentTarget.style.color = v('text'); }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = v('muted'); }}>
                    <Copy size={13} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              {absLoading
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: v('muted'), fontSize: 13 }}>
                    <Loader2 size={14} style={{ animation: 'xp-spin 1s linear infinite' }} /> Chargement du résumé…
                  </div>
                : <p style={{ fontSize: 13, lineHeight: 1.7, color: v('text2'), whiteSpace: 'pre-line' as const, margin: 0 }}>
                    {abstract || "Consultez l'article complet sur PubMed."}
                  </p>
              }
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
            {[
              { l: 'Journal', v2: art.journal },
              { l: 'PMID', v2: art.pmid, mono: true },
              ...(art.doi ? [{ l: 'DOI', v2: art.doi, mono: true }] : []),
            ].map(({ l, v2, mono }) => (
              <div key={l} style={{ background: v('surface2'), border: `1px solid ${v('border2')}`, borderRadius: 11, padding: '11px 13px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: v('muted'), marginBottom: 5 }}>{l}</div>
                <div style={{ fontSize: 12, color: v('text'), wordBreak: 'break-all' as const, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', fontWeight: mono ? 500 : 600 }}>{v2}</div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <PenLine size={13} strokeWidth={2.5} style={{ color: '#7C3AED' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: v('muted') }}>Ma note</span>
            </div>
            <textarea
              defaultValue={notes[art.pmid] || ''}
              onChange={e => onNote(art.pmid, e.target.value)}
              placeholder="Vos annotations personnelles sur cet article…" rows={3}
              style={{ background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: 11, padding: '11px 13px', fontSize: 13, color: v('text'), width: '100%', resize: 'none', transition: 'border .15s', lineHeight: 1.6 }}
              onFocus={e => e.target.style.border = `1px solid ${v('primary')}`}
              onBlur={e => e.target.style.border = `1px solid ${v('border')}`}
            />
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <ArrowRight size={13} style={{ color: v('primary') }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: v('muted') }}>Articles similaires</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                {related.map(r => {
                  const rEbm = getEBM(r.pubtype);
                  const rC = rEbm ? EBM_C[rEbm.lvl] : null;
                  return (
                    <button key={r.pmid} onClick={() => { setAbstract(null); setRelated([]); /* re-render with new art */ }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left' as const,
                        background: v('surface2'), border: `1px solid ${v('border2')}`,
                        borderRadius: v('radius'), padding: '12px 14px', cursor: 'pointer', transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = v('shadow-sm'); e.currentTarget.style.borderColor = v('primary') + '44'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = v('border2'); }}>
                      <p style={{ fontSize: 12, color: v('text2'), lineHeight: 1.45, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{r.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="xp-mono" style={{ fontSize: 10, color: v('muted') }}>{r.pubdate.slice(0, 4)}</span>
                        {rEbm && rC && <EBMBadge lvl={rEbm.lvl} label={rEbm.label} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${v('border2')}`,
          background: v('surface'), display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0,
        }}>
          <button onClick={copyCitation}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: v('surface2'), border: `1px solid ${v('border')}`,
              borderRadius: v('radius'), padding: '11px 14px', fontSize: 13, fontWeight: 600,
              color: v('text2'), cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = v('border')}
            onMouseLeave={e => e.currentTarget.style.background = v('surface2')}>
            <Copy size={14} /> Citer
          </button>
          <button onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`, '_blank', 'noreferrer')}
            style={{ ...s.btnPrimary, padding: '11px 14px', borderRadius: v('radius'), fontSize: 13 }}>
            PubMed <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   SKELETON
═══════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div style={{ ...s.card, padding: '16px', cursor: 'default' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="xp-skeleton" style={{ height: 14, background: v('border'), borderRadius: 6, width: '80%', marginBottom: 8 }} />
          <div className="xp-skeleton" style={{ height: 12, background: v('border'), borderRadius: 6, width: '55%', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <div className="xp-skeleton" style={{ height: 10, background: v('border'), borderRadius: 99, width: 120 }} />
            <div className="xp-skeleton" style={{ height: 10, background: v('border'), borderRadius: 99, width: 40 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, flexShrink: 0 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="xp-skeleton" style={{ width: 28, height: 28, borderRadius: 7, background: v('border') }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT (avec gestion responsive du header)
═══════════════════════════════════════════ */
export default function EpiExplorer() {
  const { dark, toggle: toggleTheme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);
  const [toastList, toast] = useToastState();

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

  const [bookmarks, setBookmarks]   = useState<string[]>(() => safeLS.get('ep_bm', []).slice(0, MAX_BM));
  const [savedArts, setSavedArts]   = useState<Article[]>([]);
  const [notes, setNotes]           = useState<Record<string, string>>(() => safeLS.get('ep_notes', {}));
  const [hist, setHist]             = useState<string[]>(() => safeLS.get('ep_hist', []));
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => safeLS.set('ep_bm',    bookmarks), [bookmarks]);
  useEffect(() => safeLS.set('ep_notes', notes),     [notes]);
  useEffect(() => safeLS.set('ep_hist',  hist),      [hist]);
  useEffect(() => { if (U.view === 'bookmarks') loadBookmarks(); }, [U.view]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHelp) { setShowHelp(false); return; }
        if (U.showMesh) { dU({ type: 'MESH_CLOSE' }); return; }
        if (U.panel) dU({ type: 'PANEL', a: null });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [U.panel, U.showMesh, showHelp]);

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
      const d1 = await retry(() => apiFetch('esearch.fcgi', {
        db: 'pubmed', term: buildQ(q), retmax: RET_MAX, retstart: (page - 1) * RET_MAX, sort: F.sort, retmode: 'json',
      }, sig));
      const ids: string[] = d1.esearchresult?.idlist || [];
      const tot = parseInt(d1.esearchresult?.count || '0');
      if (!ids.length) { dS({ type: 'OK', r: [], t: tot }); return; }
      const d2 = await retry(() => apiFetch('esummary.fcgi', { db: 'pubmed', id: ids.join(','), retmode: 'json' }, sig));
      const rm = d2.result;
      dS({ type: 'OK', t: tot, r: ids.filter(id => rm[id]).map(id => parseArticle(rm, id)) });
    } catch (e: any) {
      if (e.name !== 'AbortError' && e.code !== 'ERR_CANCELED') dS({ type: 'ERR', m: 'Connexion PubMed impossible.' });
    }
  }, [buildQ, F.sort]);

  const prevPage = useRef(1);
  useEffect(() => {
    if (SR.searched && SR.page !== prevPage.current) { prevPage.current = SR.page; doSearch(SR.lastQuery, SR.page); }
  }, [SR.page]);

  const loadBookmarks = async () => {
    if (!bookmarks.length) { setSavedArts([]); return; }
    try {
      const d = await retry(() => apiFetch('esummary.fcgi', { db: 'pubmed', id: bookmarks.join(','), retmode: 'json' }));
      const rm = d.result;
      setSavedArts(bookmarks.filter(id => rm[id]).map(id => parseArticle(rm, id)));
    } catch {}
  };

  const toggleBm = useCallback((pmid: string) => {
    setBookmarks(p => {
      if (p.includes(pmid)) { toast.success('Retiré des favoris'); return p.filter(id => id !== pmid); }
      if (p.length >= MAX_BM) { toast.error('Limite atteinte (200)'); return p; }
      toast.success('Ajouté aux favoris'); return [...p, pmid];
    });
  }, [toast]);

  const saveNote = useCallback((pmid: string, val: string) => {
    setNotes(p => { const n = { ...p }; if (val.trim()) n[pmid] = val; else delete n[pmid]; return n; });
    if (val.trim()) toast.success('Note sauvegardée');
    else toast.success('Note supprimée');
  }, [toast]);

  const handleGenerateMesh = useCallback(async () => {
    if (!U.meshInput.trim()) return;
    dU({ type: 'MESH_LOADING' });
    try { dU({ type: 'MESH_OK', result: await buildMeshQuery(U.meshInput) }); }
    catch { dU({ type: 'MESH_ERR' }); toast.error('Erreur PubMed.'); }
  }, [U.meshInput, toast]);

  const exportRIS = useCallback((arts: Article[]) => {
    if (!arts.length) return;
    const ris = arts.map(a =>
      `TY  - JOUR\nTI  - ${a.title}\n${a.authors.map(au => `AU  - ${au}`).join('\n')}\nJO  - ${a.journal}\nPY  - ${a.pubdate.slice(0, 4)}\n${a.doi ? `DO  - ${a.doi}\n` : ''}PMID- ${a.pmid}\nER  - `
    ).join('\n\n');
    const url = URL.createObjectURL(new Blob([ris], { type: 'text/plain' }));
    const el = document.createElement('a'); el.href = url; el.download = `xplorer_${new Date().toISOString().slice(0, 10)}.ris`; el.click(); URL.revokeObjectURL(url);
    toast.success(`${arts.length} référence(s) exportée(s)`);
  }, [toast]);

  const onAuthorSearch = useCallback((author: string) => {
    const q = `${author}[AU]`;
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Recherche PubMed"]');
    if (input) input.value = q;
    dU({ type: 'VIEW', v: 'search' });
    doSearch(q, 1);
  }, [doSearch]);

  const applyMeshQuery = useCallback((q: string) => {
    const single = q.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Recherche PubMed"]');
    if (input) input.value = single;
    doSearch(single, 1);
  }, [doSearch]);

  const toggleCompare = useCallback((pmid: string) => {
    setCompareSet(p => {
      const n = new Set(p);
      if (n.has(pmid)) n.delete(pmid);
      else if (n.size < 3) n.add(pmid);
      else toast.info('Maximum 3 articles.');
      return n;
    });
  }, [toast]);

  const handleSearch      = useCallback((q: string) => doSearch(q, 1), [doSearch]);
  const handleTogFilters  = useCallback(() => dU({ type: 'FILTERS' }), []);
  const handleClear       = useCallback(() => dS({ type: 'RESET' }), []);
  const handleHistSelect  = useCallback((h: string) => { doSearch(h, 1); dU({ type: 'HIST' }); }, [doSearch]);
  const handleHistClear   = useCallback(() => { setHist([]); dU({ type: 'HIST' }); }, []);
  const handleHist        = useCallback(() => dU({ type: 'HIST' }), []);

  const displayArts = U.view === 'search' ? SR.results : savedArts;
  const totalPages  = Math.ceil(SR.total / RET_MAX);
  const isLanding   = U.view === 'search' && !SR.searched;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div className={`xp${dark ? ' dark' : ''}`} style={{ minHeight: '100vh', background: v('bg'), color: v('text') }}>

        {/* ── MODALS ─────────────────────────── */}
        {U.showMesh && (
          <MeshModal
            input={U.meshInput} onInputChange={val => dU({ type: 'MESH_INPUT', v: val })}
            status={U.meshStatus} result={U.meshResult}
            onGenerate={handleGenerateMesh}
            onApply={q => { applyMeshQuery(q); toast.success('Requête appliquée !'); }}
            onClose={() => dU({ type: 'MESH_CLOSE' })}
          />
        )}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

        {/* ── LANDING ────────────────────────── */}
        {isLanding && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '32px 16px' }}>
            <div style={{ width: '100%', maxWidth: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 8 }}>
                <IBtn icon={Moon} onClick={toggleTheme} title={dark ? 'Mode clair' : 'Mode sombre'} />
                <IBtn icon={HelpCircle} onClick={() => setShowHelp(true)} title="Aide" />
              </div>
              <div className="xp-anim-up" style={{ textAlign: 'center' as const, marginBottom: 36 }}>
                <h1 style={{
                  fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 900, letterSpacing: '-2px',
                  color: v('text'), marginBottom: 12, lineHeight: 1,
                }}>
                  Xplore<span style={{ color: v('primary') }}>.</span>
                </h1>
                <p style={{ fontSize: 15, color: v('muted'), fontWeight: 500 }}>
                  Explorateur PubMed · Appuyez sur{' '}
                  <kbd style={{ padding: '2px 7px', background: v('surface'), border: `1px solid ${v('border')}`, borderRadius: 5, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: v('text') }}>Entrée</kbd>
                  {' '}pour lancer la recherche
                </p>
              </div>
              <div className="xp-anim-up" style={{ animationDelay: '60ms' }}>
                <SearchBar
                  large loading={SR.loading} showFilters={U.showFilters}
                  showHist={U.showHist} hist={hist}
                  onSearch={handleSearch} onToggleFilters={handleTogFilters}
                  onClear={handleClear} onHistSelect={handleHistSelect}
                  onHistClear={handleHistClear} onHist={handleHist}
                />
              </div>
              <div className="xp-anim-up" style={{ animationDelay: '100ms', display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' as const }}>
                <button onClick={() => dU({ type: 'MESH_OPEN' })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
                    borderRadius: 11, background: v('primary-s'), border: `1px solid ${v('primary')}33`,
                    color: v('primary'), fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = v('primary-r')}
                  onMouseLeave={e => e.currentTarget.style.background = v('primary-s')}>
                  <Sparkles size={14} /> Générer une requête MeSH
                  <span style={{ fontSize: 10, background: v('primary') + '22', color: v('primary'), padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>Exp.</span>
                </button>
              </div>
              {U.showFilters && <div style={{ marginTop: 12 }}><FilterPanel F={F} setF={setF} /></div>}
              <div className="xp-anim-up" style={{ animationDelay: '140ms', display: 'flex', justifyContent: 'center', gap: 20, marginTop: 40, alignItems: 'center' }}>
                <button onClick={() => dU({ type: 'VIEW', v: 'bookmarks' })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: v('muted'), fontWeight: 500, transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = v('primary')}
                  onMouseLeave={e => e.currentTarget.style.color = v('muted')}>
                  <Bookmark size={14} /> Favoris {bookmarks.length > 0 && `(${bookmarks.length})`}
                </button>
                <span style={{ color: v('border'), fontSize: 18 }}>·</span>
                <span className="xp-mono" style={{ fontSize: 11, color: v('muted') }}>/ focus · Échap ferme</span>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER (responsif : empilement sur mobile) ─────────────────────────── */}
        {!isLanding && (
          <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: dark ? 'rgba(12,21,37,.92)' : 'rgba(244,246,251,.92)',
            backdropFilter: 'blur(16px)', borderBottom: `1px solid ${v('border2')}`,
          }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 16px', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: 8,
              }}>
                <button onClick={() => dS({ type: 'RESET' })}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, fontWeight: 900, color: v('text'),
                    letterSpacing: '-1px', flexShrink: 0, transition: 'color .15s',
                    textAlign: 'left', width: isMobile ? 'auto' : 'auto',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = v('primary')}
                  onMouseLeave={e => e.currentTarget.style.color = v('text')}>
                  Xplore<span style={{ color: v('primary') }}>.</span>
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SearchBar
                    loading={SR.loading} showFilters={U.showFilters}
                    showHist={U.showHist} hist={hist}
                    onSearch={handleSearch} onToggleFilters={handleTogFilters}
                    onClear={handleClear} onHistSelect={handleHistSelect}
                    onHistClear={handleHistClear} onHist={handleHist}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap' as const }}>
                  {/* View toggle */}
                  <div style={{ display: 'flex', gap: 3, background: v('surface2'), border: `1px solid ${v('border')}`, borderRadius: 10, padding: 3 }}>
                    {(['search', 'bookmarks'] as const).map(view => (
                      <button key={view} onClick={() => dU({ type: 'VIEW', v: view })}
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: U.view === view ? v('primary') : 'transparent',
                          color: U.view === view ? '#fff' : v('text2'),
                          transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                        {view === 'search' ? 'Recherche' : (
                          <>
                            <Bookmark size={12} />
                            <span style={{ display: 'none' }}>Favoris</span>
                            {bookmarks.length > 0 && (
                              <span style={{ background: U.view === 'bookmarks' ? 'rgba(255,255,255,.25)' : v('primary-s'), color: U.view === 'bookmarks' ? '#fff' : v('primary'), fontSize: 10, padding: '1px 5px', borderRadius: 5, fontWeight: 700 }}>{bookmarks.length}</span>
                            )}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => dU({ type: 'MESH_OPEN' })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                      background: v('primary-s'), border: `1px solid ${v('primary')}33`,
                      borderRadius: 9, color: v('primary'), fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = v('primary-r')}
                    onMouseLeave={e => e.currentTarget.style.background = v('primary-s')}>
                    <Sparkles size={13} /> MeSH
                  </button>
                  <IBtn icon={BarChart3} onClick={() => dU({ type: 'STATS' })} active={U.showStats} title="Statistiques" />
                  <IBtn icon={dark ? Sun : Moon} onClick={toggleTheme} title={dark ? 'Mode clair' : 'Mode sombre'} />
                  <IBtn icon={HelpCircle} onClick={() => setShowHelp(true)} title="Aide" />
                </div>
              </div>
              {U.showFilters && <FilterPanel F={F} setF={setF} />}
              {SR.searched && SR.total > 0 && (
                <div className="xp-mono" style={{ fontSize: 11, color: v('muted') }}>
                  {SR.total.toLocaleString('fr-FR')} résultats · « {SR.lastQuery} »
                </div>
              )}
            </div>
          </header>
        )}

        {/* ── MAIN ───────────────────────────── */}
        {(SR.searched || U.view === 'bookmarks') && (
          <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 80px' }}>
            {U.showStats && SR.results.length > 0 && <StatsPanel data={SR.results} />}

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap' as const, gap: 8 }}>
              {U.view === 'search' && SR.searched ? (
                <span style={{ fontSize: 13, fontWeight: 700, color: v('text2') }}>
                  {SR.total.toLocaleString('fr-FR')} résultat{SR.total > 1 ? 's' : ''}
                </span>
              ) : (
                <h2 style={{ fontSize: 15, fontWeight: 800, color: v('text'), margin: 0 }}>
                  Favoris <span style={{ fontWeight: 500, fontSize: 13, color: v('muted') }}>({bookmarks.length})</span>
                </h2>
              )}
              {displayArts.length > 0 && (
                <button onClick={() => exportRIS(displayArts)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, color: v('primary'), transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Download size={14} /> Exporter .ris
                </button>
              )}
            </div>

            {/* Content */}
            {SR.loading ? (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : SR.error ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.15)',
                borderRadius: v('radius'), color: '#DC2626', fontSize: 13,
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {SR.error}
                <button onClick={() => doSearch(SR.lastQuery, SR.page)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'flex' }}>
                  <RefreshCcw size={15} />
                </button>
              </div>
            ) : displayArts.length === 0 ? (
              <div style={{ textAlign: 'center' as const, padding: '60px 0' }}>
                {U.view === 'bookmarks'
                  ? <Bookmark size={40} style={{ color: v('border'), margin: '0 auto 12px' }} />
                  : <Search size={40} style={{ color: v('border'), margin: '0 auto 12px' }} />
                }
                <p style={{ color: v('muted'), fontSize: 14 }}>{U.view === 'bookmarks' ? 'Aucun favori enregistré.' : 'Aucun résultat trouvé.'}</p>
                {U.view === 'bookmarks' && (
                  <button onClick={() => dU({ type: 'VIEW', v: 'search' })}
                    style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: v('primary'), fontSize: 13, fontWeight: 600 }}>
                    Explorer PubMed →
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {displayArts.map((a, i) => (
                  <ArticleCard key={a.pmid}
                    art={a} selected={U.panel?.pmid === a.pmid}
                    onClick={() => dU({ type: 'PANEL', a })}
                    onBookmark={toggleBm} bookmarked={bookmarks.includes(a.pmid)}
                    searchQuery={SR.lastQuery} compareSet={compareSet} onCompare={toggleCompare}
                    onAuthorSearch={onAuthorSearch} notes={notes} onNote={saveNote}
                    delay={i * 20}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {SR.results.length > 0 && SR.total > RET_MAX && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 28 }}>
                <button
                  onClick={() => dS({ type: 'PAGE', p: Math.max(1, SR.page - 1) })}
                  disabled={SR.page === 1}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    background: v('surface'), border: `1px solid ${v('border')}`,
                    borderRadius: 10, cursor: SR.page === 1 ? 'not-allowed' : 'pointer',
                    color: v('text2'), opacity: SR.page === 1 ? .4 : 1, transition: 'all .15s',
                  }}>
                  <ChevronLeft size={15} /> Préc.
                </button>
                <span className="xp-mono" style={{ fontSize: 12, color: v('muted'), padding: '0 4px' }}>
                  {SR.page} / {totalPages}
                </span>
                <button
                  onClick={() => dS({ type: 'PAGE', p: Math.min(totalPages, SR.page + 1) })}
                  disabled={SR.page >= totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    background: v('surface'), border: `1px solid ${v('border')}`,
                    borderRadius: 10, cursor: SR.page >= totalPages ? 'not-allowed' : 'pointer',
                    color: v('text2'), opacity: SR.page >= totalPages ? .4 : 1, transition: 'all .15s',
                  }}>
                  Suiv. <ChevronRight size={15} />
                </button>
              </div>
            )}
          </main>
        )}

        {/* ── ARTICLE PANEL ──────────────────── */}
        {U.panel && (
          <ArticlePanel
            art={U.panel}
            bookmarks={bookmarks} notes={notes}
            onBookmark={toggleBm} onNote={saveNote}
            onAuthorSearch={onAuthorSearch}
            onClose={() => dU({ type: 'PANEL', a: null })}
            toast={toast}
          />
        )}

        {/* ── COMPARE BAR ────────────────────── */}
        <CompareBar ids={compareSet} arts={[...SR.results, ...savedArts]} onClear={() => setCompareSet(new Set())} />

        {/* ── TOASTS ─────────────────────────── */}
        <ToastContainer list={toastList} />
      </div>
    </>
  );
}