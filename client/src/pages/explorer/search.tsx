import React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Download,
  Bookmark,
  BookmarkCheck,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Quote,
  Loader2,
  BarChart3,
  ArrowRight,
  Copy,
  ChevronRight as SearchButtonIcon
} from 'lucide-react';
import { toast } from 'sonner';

// --- CONSTANTES ---
const RET_MAX = 10;
const MAX_BOOKMARKS = 200;
const API_RETRY_COUNT = 3;

// --- TYPES ---
interface PubMedArticle {
  uid: string;
  title: string;
  authors: string[];
  journal: string;
  pubdate: string;
  doi: string;
  pmid: string;
  abstract?: string;
}

interface SearchResponse {
  esearchresult: {
    count: number;
    idlist: string[];
  };
}

// --- CACHE ABSTRACTS ---
const abstractCache = new Map<string, string>();

// --- RETRY WRAPPER ---
const apiCallWithRetry = async <T>(fn: () => Promise<T>, retries = API_RETRY_COUNT): Promise<T> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error('Max retries reached');
};

// --- GRAPHIQUE DE TENDANCE (MEMOÏSÉ) ---
const TrendChart = React.memo(({ data }: { data: PubMedArticle[] }) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    const years = data.map(d => parseInt(d.pubdate.substring(0, 4))).filter(y => !isNaN(y));
    if (years.length === 0) return [];

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const counts: Record<number, number> = {};
    for (let y = minYear; y <= maxYear; y++) counts[y] = 0;
    years.forEach(y => counts[y] = (counts[y] || 0) + 1);

    return Object.entries(counts).map(([year, count]) => ({ year: parseInt(year), count }));
  }, [data]);

  if (chartData.length < 2) return null;

  const maxCount = Math.max(...chartData.map(d => d.count));
  const height = 60;
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * 100;
    const y = height - (d.count / maxCount) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div role="region" aria-label="Graphique de distribution temporelle" className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm mb-6 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          Distribution temporelle
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
          {chartData[0].year} – {chartData[chartData.length - 1].year}
        </span>
      </div>
      <div className="relative h-[60px] w-full overflow-hidden">
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M0,${height} ${points} V${height} Z`} fill="url(#gradient)" />
          <path d={`M${points}`} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
});

// --- FILTER PANEL (RÉUTILISABLE) ---
const FilterPanel = React.memo(({
  filterYearFrom,
  setFilterYearFrom,
  filterYearTo,
  setFilterYearTo,
  filterArticleType,
  setFilterArticleType,
  sortBy,
  setSortBy
}: {
  filterYearFrom: string;
  setFilterYearFrom: (val: string) => void;
  filterYearTo: string;
  setFilterYearTo: (val: string) => void;
  filterArticleType: string;
  setFilterArticleType: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
}) => (
  <div className="p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-slate-700 shadow-xl animate-in slide-in-from-top-2">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Période</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="2000"
            value={filterYearFrom}
            onChange={e => setFilterYearFrom(e.target.value)}
            className="w-full rounded-xl border-slate-200 bg-slate-50 py-2 px-3 text-sm"
          />
          <span className="text-slate-300">à</span>
          <input
            type="number"
            placeholder="2025"
            value={filterYearTo}
            onChange={e => setFilterYearTo(e.target.value)}
            className="w-full rounded-xl border-slate-200 bg-slate-50 py-2 px-3 text-sm "
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
        <select
          value={filterArticleType}
          onChange={e => setFilterArticleType(e.target.value)}
          className="w-full rounded-xl border-slate-200 bg-slate-50 py-2 px-3 text-sm "
        >
          <option value="">Tous</option>
          <option value="review">Revue</option>
          <option value="clinical trial">Essai Clinique</option>
          <option value="meta-analysis">Méta-analyse</option>
          <option value="randomized controlled trial">Essai randomisé</option>
          <option value="case reports">Cas clinique</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trier par</label>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="w-full rounded-xl border-slate-200 bg-slate-50 py-2 px-3 text-sm "
        >
          <option value="relevance">Pertinence</option>
          <option value="pubdate">Date (Récent)</option>
        </select>
      </div>
    </div>
  </div>
));

// --- COMPOSANT PRINCIPAL ---
export default function Explorer() {
  // --- États ---
  const [view, setView] = useState<'search' | 'bookmarks'>('search');
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<PubMedArticle[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>('relevance');

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterYearFrom, setFilterYearFrom] = useState<string>('');
  const [filterYearTo, setFilterYearTo] = useState<string>('');
  const [filterArticleType, setFilterArticleType] = useState<string>('');

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem('pubmed_bookmarks');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.slice(0, MAX_BOOKMARKS);
  });
  const [savedArticles, setSavedArticles] = useState<PubMedArticle[]>([]);

  const [selectedArticle, setSelectedArticle] = useState<PubMedArticle | null>(null);
  const [fullAbstract, setFullAbstract] = useState<string | null>(null);
  const [abstractLoading, setAbstractLoading] = useState<boolean>(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- Persistance des favoris ---
  useEffect(() => {
    localStorage.setItem('pubmed_bookmarks', JSON.stringify(bookmarks));
    if (view === 'bookmarks' && bookmarks.length > 0) {
      loadBookmarksDetails();
    }
  }, [bookmarks, view]);

  // --- Chargement de l'abstract complet ---
  const fetchFullAbstract = useCallback(async (pmid: string) => {
    if (abstractCache.has(pmid)) return abstractCache.get(pmid)!;

    const fetchFn = async () => {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { responseType: 'text' });
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, 'text/xml');
      const abstractTexts = doc.querySelectorAll('AbstractText');
      let abstract = '';
      abstractTexts.forEach((text) => {
        const label = text.getAttribute('Label');
        abstract += (label ? `${label}: ` : '') + (text.textContent || '') + '\n\n';
      });
      abstract = abstract.trim() || 'Résumé non disponible.';
      abstractCache.set(pmid, abstract);
      return abstract;
    };

    return apiCallWithRetry(fetchFn);
  }, []);

  useEffect(() => {
    if (selectedArticle) {
      setFullAbstract(null);
      setAbstractLoading(true);
      fetchFullAbstract(selectedArticle.pmid)
        .then(ab => setFullAbstract(ab))
        .catch(() => setFullAbstract('Erreur lors du chargement du résumé.'))
        .finally(() => setAbstractLoading(false));
    }
  }, [selectedArticle, fetchFullAbstract]);

  // --- Appels API PubMed ---
  const fetchPubmedIds = useCallback(async () => {
    if (!query.trim()) return [];
    setLoading(true);
    setError(null);
    setHasSearched(true);

    const fetchFn = async () => {
      let filterQuery = query;
      if (filterYearFrom || filterYearTo) {
        filterQuery += ` AND (${filterYearFrom || '1900'}[PDAT] : ${filterYearTo || new Date().getFullYear()}[PDAT])`;
      }
      if (filterArticleType) {
        filterQuery += ` AND ${filterArticleType}[PTYP]`;
      }

      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(filterQuery)}&retmax=${RET_MAX}&retstart=${(page - 1) * RET_MAX}&sort=${sortBy}&retmode=json`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
      const response = await axios.get<SearchResponse>(proxyUrl);
      const idList = response.data.esearchresult?.idlist || [];
      setTotalCount(parseInt(response.data.esearchresult?.count || '0'));
      return idList;
    };

    try {
      return await apiCallWithRetry(fetchFn);
    } catch (err) {
      console.error(err);
      setError("Erreur de connexion à PubMed.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [query, page, sortBy, filterYearFrom, filterYearTo, filterArticleType]);

  const fetchArticleDetails = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return [];
    const batches = [];
    for (let i = 0; i < ids.length; i += 200) {
      batches.push(ids.slice(i, i + 200));
    }

    const articles = [];
    for (const batch of batches) {
      const fetchFn = async () => {
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${batch.join(',')}&retmode=json`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(summaryUrl)}`;
        const response = await axios.get(proxyUrl);
        const resultMap = response.data.result;
        const validIds = batch.filter(id => resultMap[id]);

        return validIds.map(id => {
          const item = resultMap[id];
          return {
            uid: id,
            title: item.title || 'Titre non disponible',
            authors: item.authors ? item.authors.map((a: any) => a.name) : [],
            journal: item.fulljournalname || item.source || 'Journal inconnu',
            pubdate: item.pubdate || '',
            doi: item.elocationid?.startsWith('doi:') ? item.elocationid.substring(4) : '',
            pmid: id,
            abstract: undefined,
          };
        });
      };

      articles.push(...await apiCallWithRetry(fetchFn));
    }
    return articles;
  }, []);

  const performSearch = useCallback(async () => {
    if (!query) return;
    const ids = await fetchPubmedIds();
    if (ids.length > 0) {
      const articles = await fetchArticleDetails(ids);
      setResults(articles);
      setSelectedArticle(null);
    } else {
      setResults([]);
    }
  }, [fetchPubmedIds, fetchArticleDetails, query]);

  const loadBookmarksDetails = async () => {
    if (bookmarks.length === 0) {
      setSavedArticles([]);
      return;
    }
    setLoading(true);
    const articles = await fetchArticleDetails(bookmarks);
    setSavedArticles(articles);
    setLoading(false);
  };

  // --- Debounce sur la recherche ---
  useEffect(() => {
    if (view === 'bookmarks') return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length > 2) {
      searchTimeout.current = setTimeout(() => {
        setPage(1);
        performSearch();
      }, 600);
    }
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, filterYearFrom, filterYearTo, filterArticleType, sortBy, view, performSearch]);

  // --- Rechargement lors du changement de page ---
  useEffect(() => {
    if (view === 'search' && hasSearched) {
      performSearch();
    }
  }, [page, performSearch, view, hasSearched]);

  // --- Actions sur les favoris ---
  const toggleBookmark = (pmid: string) => {
    setBookmarks(prev => {
      const isSaved = prev.includes(pmid);
      if (!isSaved && prev.length >= MAX_BOOKMARKS) {
        toast.error('Limite de favoris atteinte.');
        return prev;
      }
      toast.success(isSaved ? 'Retiré des favoris' : 'Ajouté aux favoris');
      return isSaved ? prev.filter(id => id !== pmid) : [...prev, pmid];
    });
  };

  // --- Export RIS ---
  const exportRIS = (articlesToExport: PubMedArticle[]) => {
    if (articlesToExport.length === 0) return;
    let ris = '';
    articlesToExport.forEach(art => {
      ris += `TY  - JOUR\n`;
      ris += `TI  - ${art.title}\n`;
      art.authors.forEach(a => ris += `AU  - ${a}\n`);
      ris += `JO  - ${art.journal}\n`;
      ris += `PY  - ${art.pubdate.substring(0, 4)}\n`;
      if (art.doi) ris += `DO  - ${art.doi}\n`;
      ris += `PMID- ${art.pmid}\n`;
      ris += `ER  - \n\n`;
    });
    const blob = new Blob([ris], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pubmed_export_${new Date().toISOString().slice(0, 10)}.ris`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${articlesToExport.length} référence(s) exportée(s)`);
  };

  // --- Copie de citation ---
  const copyCitation = (article: PubMedArticle) => {
    const authors = article.authors.slice(0, 3).join(', ') + (article.authors.length > 3 ? ' et al.' : '');
    const citation = `${authors} (${article.pubdate.substring(0, 4)}). ${article.title}. ${article.journal}. PMID: ${article.pmid}.`;
    navigator.clipboard.writeText(citation);
    toast.success('Citation copiée !');
  };

  // --- Carte d'un article ---
  const ArticleCard = React.memo(({ article, isSelected = false, onClick }: { article: PubMedArticle; isSelected?: boolean; onClick: () => void }) => {
    const isBookmarked = bookmarks.includes(article.pmid);
    return (
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        onClick={onClick}
        className={`group cursor-pointer bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all duration-300 ${
          isSelected
            ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md scale-[1.01]'
            : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm'
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
              {article.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="truncate max-w-[200px]">{article.authors[0] || 'Auteur inconnu'}{article.authors.length > 1 ? ' et al.' : ''}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="italic truncate max-w-[150px]">{article.journal}</span>
              <span className="ml-auto font-mono text-slate-400">{article.pubdate.substring(0, 4)}</span>
            </div>
          </div>
          <button
            aria-label={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={(e) => { e.stopPropagation(); toggleBookmark(article.pmid); }}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
              isBookmarked
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {isBookmarked ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );
  });

  // --- Condition d'affichage du mode centré ---
  const showCentered = view === 'search' && !hasSearched;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 overflow-x-hidden">
      {/* ========== MODE CENTRÉ (ACCUEIL) ========== */}
      {showCentered ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <div className="w-full max-w-3xl mx-auto text-center animate-in fade-in zoom-in duration-700">
            <div className="mb-8">
              <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Epi <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Explorer</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-4 text-xl max-w-2xl mx-auto">
                Recherchez directement sur PubMed
              </p>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1.5 rounded-full opacity-30 group-hover:opacity-50 blur-xl transition duration-700"></div>
              <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-full border border-slate-200/80 dark:border-slate-700/80 p-2">
                <Search className="ml-5 w-7 h-7 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  placeholder="Mots-clés, maladies, auteurs, DOI..."
                  className="w-full bg-transparent border-none text-slate-800 dark:text-white placeholder:text-slate-400 text-xl py-5 px-4"
             
                />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3.5 rounded-full transition-all ${showFilters ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                  aria-label="Filtres"
                >
                  <Filter className="w-6 h-6" />
                </button>
                <button
                  onClick={performSearch}
                  className="ml-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white p-4 rounded-full transition-transform active:scale-90 shadow-xl shadow-indigo-500/30"
                  aria-label="Rechercher"
                >
                  <SearchButtonIcon className="w-7 h-7" />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-8">
                <FilterPanel
                  filterYearFrom={filterYearFrom}
                  setFilterYearFrom={setFilterYearFrom}
                  filterYearTo={filterYearTo}
                  setFilterYearTo={setFilterYearTo}
                  filterArticleType={filterArticleType}
                  setFilterArticleType={setFilterArticleType}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                />
              </div>
            )}

            <div className="mt-12 text-sm text-slate-400">
              <button
                onClick={() => setView('bookmarks')}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1 mx-auto"
              >
                <Bookmark className="w-4 h-4" />
                Mes favoris {bookmarks.length > 0 && `(${bookmarks.length})`}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========== MODE COMPACT (EN-TÊTE STICKY) ========== */
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 h-auto py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
             
                <span className="font-bold text-lg text-slate-900 dark:text-white hidden sm:block">
                  Epi <span className="text-indigo-600 font-normal">Explorer</span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setView('search')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    view === 'search'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Recherche
                </button>
                <button
                  onClick={() => setView('bookmarks')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    view === 'bookmarks'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden sm:inline"></span>
                  {bookmarks.length > 0 && (
                    <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{bookmarks.length}</span>
                  )}
                </button>
              </div>
            </div>

            <div className="relative group">
              <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-100 dark:border-slate-700 p-1.5">
                <Search className="ml-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  placeholder="Rechercher dans PubMed..."
                  className="w-full bg-transparent border-none text-slate-800 dark:text-white placeholder:text-slate-400 text-sm py-2 px-2"
                />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-1.5 rounded-full transition-colors ${showFilters ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                  aria-label="Filtres"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button
                  onClick={performSearch}
                  className="ml-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full transition-transform active:scale-95 shadow-md shadow-indigo-200"
                  aria-label="Rechercher"
                >
                  <SearchButtonIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-2">
                <FilterPanel
                  filterYearFrom={filterYearFrom}
                  setFilterYearFrom={setFilterYearFrom}
                  filterYearTo={filterYearTo}
                  setFilterYearTo={setFilterYearTo}
                  filterArticleType={filterArticleType}
                  setFilterArticleType={setFilterArticleType}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== CONTENU PRINCIPAL (RÉSULTATS / FAVORIS) ========== */}
      {(hasSearched || view === 'bookmarks') && (
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-start gap-6 relative">
          {/* Colonne des résultats / favoris */}
          <div className={`flex-1 transition-all duration-500 ${
            selectedArticle
              ? 'w-full md:w-1/2 lg:w-3/5 opacity-50 md:opacity-100 md:pointer-events-auto pointer-events-none md:pointer-events-auto'
              : 'w-full'
          }`}>
            {/* MODE RECHERCHE */}
            {view === 'search' && (
              <>
                {results.length > 0 && <TrendChart data={results} />}

                {hasSearched && (
                  <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {totalCount} résultat{totalCount > 1 ? 's' : ''}
                    </span>
                    {results.length > 0 && (
                      <button
                        aria-label="Exporter la page actuelle au format RIS"
                        onClick={() => exportRIS(results)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" /> Exporter la page
                      </button>
                    )}
                  </div>
                )}

                <div role="list" aria-label="Liste des articles" className="space-y-4">
                  {results.map(article => (
                    <ArticleCard
                      key={article.pmid}
                      article={article}
                      isSelected={selectedArticle?.pmid === article.pmid}
                      onClick={() => setSelectedArticle(article)}
                    />
                  ))}
                </div>

                {loading && (
                  <div role="status" aria-label="Chargement en cours" className="space-y-4 mt-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 animate-pulse">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div role="alert" className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-center border border-red-100 dark:border-red-800">
                    {error}
                  </div>
                )}

                {hasSearched && !loading && results.length === 0 && (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun résultat</h3>
                    <p className="text-slate-500">Essayez d'élargir vos termes de recherche.</p>
                  </div>
                )}

                {results.length > 0 && totalCount > RET_MAX && (
                  <div role="navigation" aria-label="Pagination" className="flex justify-center items-center gap-4 mt-10 pb-6">
                    <button
                      aria-label="Page précédente"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Page {page} sur {Math.ceil(totalCount / RET_MAX)}
                    </span>
                    <button
                      aria-label="Page suivante"
                      onClick={() => setPage(p => p + 1)}
                      className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* MODE FAVORIS (implémentation complète) */}
            {view === 'bookmarks' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <BookmarkCheck className="w-6 h-6" />
                    Articles sauvegardés ({bookmarks.length})
                  </h2>
                  {savedArticles.length > 0 && (
                    <button
                      aria-label="Exporter tous les favoris au format RIS"
                      onClick={() => exportRIS(savedArticles)}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Exporter tout
                    </button>
                  )}
                </div>

                {bookmarks.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">Vous n'avez aucun article favori.</p>
                    <button
                      onClick={() => setView('search')}
                      className="mt-4 text-indigo-600 font-medium hover:underline"
                    >
                      Retourner à la recherche
                    </button>
                  </div>
                ) : loading ? (
                  <div role="status" aria-label="Chargement des favoris" className="flex justify-center py-20">
                    <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
                  </div>
                ) : (
                  <div role="list" aria-label="Liste des articles favoris" className="space-y-4">
                    {savedArticles.map(article => (
                      <ArticleCard
                        key={article.pmid}
                        article={article}
                        isSelected={selectedArticle?.pmid === article.pmid}
                        onClick={() => setSelectedArticle(article)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PANEL LATÉRAL (DÉTAIL DE L'ARTICLE) */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Détails de l'article"
            className={`fixed inset-y-0 right-0 w-full md:w-[480px] lg:w-[600px] bg-white dark:bg-[#0F172A] shadow-2xl z-40 transform transition-transform duration-500 ease-out border-l border-slate-200 dark:border-slate-700 flex flex-col ${
              selectedArticle ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {selectedArticle && (
              <>
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Aperçu détaillé
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={bookmarks.includes(selectedArticle.pmid) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      onClick={() => toggleBookmark(selectedArticle.pmid)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                      {bookmarks.includes(selectedArticle.pmid) ? (
                        <BookmarkCheck className="w-5 h-5" />
                      ) : (
                        <Bookmark className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    <button
                      aria-label="Fermer le panneau de détails"
                      onClick={() => setSelectedArticle(null)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold mb-4">
                    {selectedArticle.pubdate}
                  </span>

                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                    {selectedArticle.title}
                  </h2>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {selectedArticle.authors.slice(0, 5).map((auth, i) => (
                      <span
                        key={i}
                        className="text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-700"
                      >
                        {auth}
                      </span>
                    ))}
                    {selectedArticle.authors.length > 5 && (
                      <span className="text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                        + {selectedArticle.authors.length - 5}
                      </span>
                    )}
                  </div>

                  <div role="region" aria-label="Résumé de l'article" className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 mb-8 relative group">
                    <Quote className="absolute top-4 left-4 w-8 h-8 text-indigo-200 dark:text-indigo-900/50 opacity-50" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 relative z-10">Résumé</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm md:text-base relative z-10">
                      {abstractLoading ? 'Chargement du résumé...' : fullAbstract || 'Le résumé n\'est pas disponible dans l\'aperçu rapide. Cliquez sur le bouton ci-dessous pour consulter l\'article complet sur PubMed.'}
                    </p>
                  </div>

                  <div role="region" aria-label="Informations supplémentaires" className="grid grid-cols-2 gap-4 text-sm mb-8">
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="block text-slate-400 text-xs mb-1">Journal</span>
                      <span className="font-medium text-slate-900 dark:text-slate-200">{selectedArticle.journal}</span>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="block text-slate-400 text-xs mb-1">PMID</span>
                      <span className="font-mono text-slate-900 dark:text-slate-200">{selectedArticle.pmid}</span>
                    </div>
                    {selectedArticle.doi && (
                      <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="block text-slate-400 text-xs mb-1">DOI</span>
                        <span className="font-mono text-slate-900 dark:text-slate-200 break-all">{selectedArticle.doi}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      aria-label="Copier la citation"
                      onClick={() => copyCitation(selectedArticle)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Citer
                    </button>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${selectedArticle.pmid}/`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Lire l'article complet sur PubMed"
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                      Lire sur PubMed
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Overlay mobile pour le panneau latéral */}
          {selectedArticle && (
            <div
              className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-[2px] z-30 transition-opacity md:hidden"
              onClick={() => setSelectedArticle(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}