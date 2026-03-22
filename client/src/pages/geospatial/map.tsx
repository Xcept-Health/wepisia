/**
 * GeospatialVisualization 
 */
import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  MapContainer, TileLayer, CircleMarker,
  Tooltip, Popup, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { HexColorPicker } from 'react-colorful';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { useTheme } from '@/contexts/ThemeContext';

import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button }     from '@/components/ui/button';
import { Badge }      from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress }   from '@/components/ui/progress';
import { Slider }     from '@/components/ui/slider';
import { Switch }     from '@/components/ui/switch';
import { Label }      from '@/components/ui/label';
import { Separator }  from '@/components/ui/separator';

import {
  ChevronRight, Database, BrainCircuit, Settings2,
  Upload, Globe, Eye, EyeOff, Trash2, Layers, X,
  Download, Map as MapIcon, Sun, Moon,
  CheckCircle2, AlertCircle, Info, Clock, Sparkles,
  Zap, FlaskConical, Activity,
} from 'lucide-react';

//  Types 

interface DataRow { [key: string]: string | number; }

interface Dataset {
  id: string; name: string; color: string;
  data: DataRow[]; visible: boolean;
  clustering?: boolean; heatmap?: boolean;
  pointRadius?: number; pointOpacity?: number;
}

interface DiseaseExample {
  id: string; name: string; description: string; color: string;
  source: { organization: string; year: number; study: string; credibility: 'high' | 'medium' | 'low' };
  countries: { name: string; lat: number; lng: number; cases: number; incidenceRate: number; population: number; region: string }[];
}

interface AIResults {
  summary: string; insights: string[]; recommendations: string[];
  alerts: string[]; riskLevel: 'low' | 'medium' | 'high';
}

interface HeatmapConfig {
  radius: number; blur: number; max: number;
  minOpacity: number; gradient: Record<number, string>; visible: boolean;
}

interface ClusteringConfig {
  showCoverageOnHover: boolean; zoomToBoundsOnClick: boolean;
  spiderfyOnMaxZoom: boolean; maxClusterRadius: number;
  disableClusteringAtZoom: number; animate: boolean;
  clusterColor: string; clusterTextColor: string;
}

interface Toast {
  id: string; message: string; type: 'success' | 'error' | 'warning' | 'info';
}

//  Constants 

const DISEASE_EXAMPLES: DiseaseExample[] = [
  {
    id: 'ebola-2014', name: 'Épidémie Ebola 2014–2016',
    description: "Crise sanitaire majeure en Afrique de l'Ouest — 28 000 cas, 11 000 décès.",
    color: '#ef4444',
    source: { organization: 'OMS', year: 2016, study: 'Rapport final flambée Ebola', credibility: 'high' },
    countries: [
      { name: 'Guinée',       lat: 9.9456, lng: -9.6966,  cases: 3814,  incidenceRate: 28.2,  population: 12414000,  region: "Afrique de l'Ouest" },
      { name: 'Sierra Leone', lat: 8.4606, lng: -11.7799, cases: 14124, incidenceRate: 195.3, population: 7791000,   region: "Afrique de l'Ouest" },
      { name: 'Liberia',      lat: 6.4281, lng: -9.4295,  cases: 10675, incidenceRate: 232.7, population: 4854000,   region: "Afrique de l'Ouest" },
      { name: 'Nigeria',      lat: 9.082,  lng: 8.6753,   cases: 20,    incidenceRate: 0.1,   population: 195875000, region: "Afrique de l'Ouest" },
      { name: 'Mali',         lat: 17.57,  lng: -3.99,    cases: 8,     incidenceRate: 0.04,  population: 20251000,  region: "Afrique de l'Ouest" },
    ],
  },
  {
    id: 'covid-global', name: 'COVID-19 — Foyers initiaux',
    description: 'Distribution géographique des grands foyers confirmés — données Johns Hopkins.',
    color: '#3b82f6',
    source: { organization: 'Johns Hopkins University', year: 2023, study: 'COVID-19 Data Repository', credibility: 'high' },
    countries: [
      { name: 'États-Unis', lat: 37.09,  lng: -95.71,  cases: 103436829, incidenceRate: 31156, population: 331900000,  region: 'Amérique du Nord' },
      { name: 'Inde',       lat: 20.59,  lng: 78.96,   cases: 44994454,  incidenceRate: 3260,  population: 1380000000, region: 'Asie du Sud' },
      { name: 'Brésil',     lat: -14.23, lng: -51.92,  cases: 37711693,  incidenceRate: 17693, population: 213000000,  region: 'Amérique du Sud' },
      { name: 'France',     lat: 46.60,  lng: 1.88,    cases: 38997490,  incidenceRate: 57600, population: 67000000,   region: 'Europe' },
      { name: 'Allemagne',  lat: 51.16,  lng: 10.45,   cases: 37986082,  incidenceRate: 45300, population: 83200000,   region: 'Europe' },
      { name: 'Italie',     lat: 41.87,  lng: 12.56,   cases: 25933617,  incidenceRate: 42800, population: 60360000,   region: 'Europe' },
      { name: 'Chine',      lat: 35.86,  lng: 104.19,  cases: 99283493,  incidenceRate: 6984,  population: 1440000000, region: "Asie de l'Est" },
    ],
  },
  {
    id: 'meningitis', name: 'Méningite — Ceinture sub-saharienne',
    description: 'Flambées saisonnières dans la ceinture méningitique (Burkina Faso, Niger, Mali).',
    color: '#d97706',
    source: { organization: 'OMS / CEREMUJER', year: 2022, study: 'Surveillance méningite Afrique sub-saharienne', credibility: 'high' },
    countries: [
      { name: 'Burkina Faso', lat: 12.36, lng: -1.53,  cases: 8127, incidenceRate: 38.2, population: 21511000,  region: 'Ceinture méningitique' },
      { name: 'Niger',        lat: 17.60, lng: 8.08,   cases: 6543, incidenceRate: 27.1, population: 24206000,  region: 'Ceinture méningitique' },
      { name: 'Mali',         lat: 17.57, lng: -3.99,  cases: 4821, incidenceRate: 23.8, population: 20251000,  region: 'Ceinture méningitique' },
      { name: 'Nigeria',      lat: 9.08,  lng: 8.67,   cases: 9234, incidenceRate: 44.7, population: 206139000, region: 'Ceinture méningitique' },
      { name: 'Tchad',        lat: 15.45, lng: 18.73,  cases: 3412, incidenceRate: 20.8, population: 16425000,  region: 'Ceinture méningitique' },
      { name: 'Éthiopie',     lat: 9.14,  lng: 40.48,  cases: 2890, incidenceRate: 2.5,  population: 114964000, region: 'Ceinture méningitique' },
    ],
  },
  {
    id: 'cholera-2024', name: 'Choléra — Flambées 2022–2024',
    description: 'Résurgence mondiale — OMS signale 43 pays touchés simultanément.',
    color: '#0d9488',
    source: { organization: 'OMS', year: 2024, study: 'Rapport mondial choléra 2024', credibility: 'high' },
    countries: [
      { name: 'Haïti',         lat: 18.97,  lng: -72.28, cases: 104000,  incidenceRate: 914,  population: 11402000,  region: 'Caraïbes' },
      { name: 'Soudan du Sud', lat: 6.87,   lng: 31.30,  cases: 48000,   incidenceRate: 428,  population: 11194000,  region: "Afrique de l'Est" },
      { name: 'Éthiopie',      lat: 9.14,   lng: 40.48,  cases: 75000,   incidenceRate: 65,   population: 114964000, region: "Afrique de l'Est" },
      { name: 'Nigeria',       lat: 9.08,   lng: 8.67,   cases: 121000,  incidenceRate: 587,  population: 206139000, region: "Afrique de l'Ouest" },
      { name: 'Yémen',         lat: 15.55,  lng: 48.51,  cases: 310000,  incidenceRate: 1040, population: 29825000,  region: 'Proche-Orient' },
      { name: 'Bangladesh',    lat: 23.68,  lng: 90.35,  cases: 89000,   incidenceRate: 54,   population: 166303000, region: 'Asie du Sud' },
    ],
  },
];

function randomColor(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

//  HeatmapLayer 

const HeatmapLayer: React.FC<{
  points: [number, number, number][];
  radius?: number; blur?: number; max?: number; minOpacity?: number;
  gradient?: Record<number, string>;
}> = ({ points, radius = 25, blur = 15, max = 1, minOpacity = 0.2, gradient }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !points.length) return;
    const heat = (L as any).heatLayer(points, {
      radius, blur, maxZoom: map.getMaxZoom() || 18, max, minOpacity, gradient,
    });
    heat.addTo(map);
    return () => { map.removeLayer(heat); };
  }, [map, points, radius, blur, max, minOpacity, gradient]);
  return null;
};

//  ToastStack 

const ToastStack: React.FC<{ toasts: Toast[]; dismiss: (id: string) => void }> = ({ toasts, dismiss }) => (
  <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div key={t.id}
          initial={{ opacity: 0, x: 60, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.9 }}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl text-sm font-medium max-w-xs
            ${t.type === 'success' ? 'bg-emerald-500 text-white' :
              t.type === 'error'   ? 'bg-red-500 text-white' :
              t.type === 'warning' ? 'bg-amber-500 text-white' :
                                     'bg-blue-500 text-white'}`}>
          {t.type === 'success' && <CheckCircle2 size={14} />}
          {t.type === 'error'   && <AlertCircle  size={14} />}
          {t.type === 'warning' && <AlertCircle  size={14} />}
          {t.type === 'info'    && <Info         size={14} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100 pointer-events-auto">
            <X size={12} />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

//  ComingSoon badge 

const ComingSoon: React.FC<{ label?: string }> = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/15 text-violet-500 border border-violet-500/20">
    <Sparkles size={9} /> {label}
  </span>
);

//  Main component 

const GeospatialVisualization: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = (key: string, options?: object) => tRaw(`geospatialMap.${key}`, options);
  const { theme, toggleTheme, switchable } = useTheme();
  const isDark = theme === 'dark';

  //  Data state 
  const [datasets, setDatasets]   = useState<Dataset[]>([]);
  const [selectedColumns, setSelectedColumns] = useState({ lat: '', lng: '', value: '', time: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [exampleProgress, setExampleProgress] = useState(0);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  const [aiResults]   = useState<AIResults | null>(null);
  const [isAnalyzing] = useState(false);

  //  Map state 
  const [mapView, setMapView]             = useState<'street' | 'satellite' | 'dark'>('street');
  const [useClustering, setUseClustering] = useState(false);
  const [useHeatmap, setUseHeatmap]       = useState(false);
  const [displayLimit, setDisplayLimit]   = useState<number | 'unlimited'>(1000);
  const [globalPointRadius, setGlobalPointRadius]   = useState(8);
  const [globalPointOpacity, setGlobalPointOpacity] = useState(0.8);

  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    radius: 25, blur: 15, max: 1, minOpacity: 0.2,
    gradient: { 0.4: '#3b82f6', 0.6: '#06b6d4', 0.7: '#10b981', 0.8: '#f59e0b', 1.0: '#ef4444' },
    visible: false,
  });

  const [clusteringConfig, setClusteringConfig] = useState<ClusteringConfig>({
    showCoverageOnHover: true, zoomToBoundsOnClick: true,
    spiderfyOnMaxZoom: true, maxClusterRadius: 80,
    disableClusteringAtZoom: 10, animate: true,
    clusterColor: '#3b82f6', clusterTextColor: '#ffffff',
  });

  //  UI state 
  const [activeTab, setActiveTab]   = useState<'data' | 'analysis' | 'settings' | 'visualization'>('data');
  const [mobileTab, setMobileTab]   = useState<'map' | 'data' | 'analysis' | 'settings'>('map');
  const [showSidePanel, setShowSidePanel]         = useState(true);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);

  const [colorPickerCtx, setColorPickerCtx] = useState<{
    type: 'dataset' | 'cluster' | 'gradient'; id?: string; gradientKey?: number;
  } | null>(null);
  const [colorPickerValue, setColorPickerValue] = useState('#3b82f6');

  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef        = useRef<HTMLInputElement>(null);

  //  Beta features state 
  const [timelineDay, setTimelineDay]         = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const timelineRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [alertThreshold, setAlertThreshold] = useState(10000);
  const [alertsEnabled, setAlertsEnabled]   = useState(false);

  const [showComparison, setShowComparison] = useState(false);

  const [rtMode, setRtMode] = useState<'off' | 'connecting' | 'connected'>('off');
  const rtRef = useRef<ReturnType<typeof setInterval> | null>(null);

  //  Toast helpers 
  const pushToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);

  //  Timeline effect 
  useEffect(() => {
    if (timelinePlaying) {
      const maxDay = Math.max(1, datasets.reduce((m, d) => Math.max(m, d.data.length), 1));
      timelineRef.current = setInterval(() => {
        setTimelineDay(p => {
          if (p >= maxDay - 1) { setTimelinePlaying(false); return 0; }
          return p + 1;
        });
      }, 80);
    } else {
      if (timelineRef.current) clearInterval(timelineRef.current);
    }
    return () => { if (timelineRef.current) clearInterval(timelineRef.current); };
  }, [timelinePlaying, datasets]);

  //  Alert watcher 
  useEffect(() => {
    if (!alertsEnabled || !datasets.length || !selectedColumns.value) return;
    const exceeded = datasets
      .filter(d => d.visible)
      .flatMap(d => d.data)
      .filter(r => (parseFloat(r[selectedColumns.value] as string) || 0) >= alertThreshold);
    if (exceeded.length > 0) {
      pushToast(t('toasts.alertTriggered', { count: exceeded.length, threshold: alertThreshold.toLocaleString() }), 'warning');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsEnabled, alertThreshold]);

  //  Real-time simulation 
  useEffect(() => {
    if (rtMode === 'connecting') {
      const id = setTimeout(() => setRtMode('connected'), 2500);
      return () => clearTimeout(id);
    }
    if (rtMode === 'connected') {
      rtRef.current = setInterval(() => {
        pushToast(t('toasts.rtUpdate'), 'info');
      }, 8000);
      return () => { if (rtRef.current) clearInterval(rtRef.current); };
    }
    return () => { if (rtRef.current) clearInterval(rtRef.current); };
  }, [rtMode, pushToast, t]);

  //  Tile URL 
  const tileUrl = useMemo(() => {
    if (mapView === 'satellite') return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    if (mapView === 'dark')      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }, [mapView]);

  //  Severity color 
  const severityColor = (value: number, base: string) => {
    if (value > 1_000_000) return '#ef4444';
    if (value > 100_000)   return '#f59e0b';
    if (value > 10_000)    return '#10b981';
    return base;
  };

  //  Stats 
  const stats = useMemo(() => {
    const flat = datasets.filter(d => d.visible).flatMap(d => d.data);
    if (!flat.length || !selectedColumns.value) return { total: 0, avg: 0, max: 0, min: 0 };
    const vals = flat.map(r => parseFloat(r[selectedColumns.value] as string) || 0).filter(v => !isNaN(v));
    const total = vals.reduce((a, b) => a + b, 0);
    return { total, avg: vals.length ? total / vals.length : 0, max: Math.max(...vals), min: Math.min(...vals) };
  }, [datasets, selectedColumns.value]);

  //  Heatmap points 
  const heatmapPoints = useMemo((): [number, number, number][] => {
    if (!useHeatmap || !heatmapConfig.visible) return [];
    const limit = displayLimit === 'unlimited' ? Infinity : displayLimit;
    const pts: [number, number, number][] = [];
    for (const ds of datasets) {
      if (!ds.visible || ds.heatmap === false) continue;
      for (const row of ds.data) {
        if (pts.length >= limit) break;
        const lat = parseFloat(row[selectedColumns.lat] as string);
        const lng = parseFloat(row[selectedColumns.lng] as string);
        const val = parseFloat(row[selectedColumns.value] as string) || 0;
        if (!isNaN(lat) && !isNaN(lng)) pts.push([lat, lng, val]);
      }
    }
    return pts;
  }, [datasets, selectedColumns, useHeatmap, heatmapConfig.visible, displayLimit]);

  //  Circle markers 
  const circleMarkers = useMemo(() => {
    if (useClustering) return null;
    const limit = displayLimit === 'unlimited' ? Infinity : displayLimit;
    const els: React.ReactElement[] = [];
    let count = 0;
    for (const ds of datasets) {
      if (!ds.visible) continue;
      for (const row of ds.data) {
        if (count >= limit) break;
        const lat = parseFloat(row[selectedColumns.lat] as string);
        const lng = parseFloat(row[selectedColumns.lng] as string);
        const val = parseFloat(row[selectedColumns.value] as string) || 0;
        if (isNaN(lat) || isNaN(lng)) continue;
        const name = String(row['pays'] ?? row['country'] ?? row['name'] ?? 'Point');
        const baseR = ds.pointRadius ?? globalPointRadius;
        const r = Math.max(3, Math.min(18, Math.sqrt(Math.abs(val)) / 800)) * (baseR / 8);
        els.push(
          <CircleMarker key={`${ds.id}-${count}`} center={[lat, lng]} radius={r}
            pathOptions={{
              fillColor: severityColor(val, ds.color), color: ds.color, weight: 1.5,
              opacity: ds.pointOpacity ?? globalPointOpacity,
              fillOpacity: (ds.pointOpacity ?? globalPointOpacity) * 0.75,
            }}>
            <Tooltip>
              <div className="p-1.5 text-xs">
                <b>{name}</b><br />{t('map.tooltipCases')} {val.toLocaleString()}
              </div>
            </Tooltip>
            <Popup>
              <div className="p-2 text-xs max-w-[200px]">
                <p className="font-bold text-sm mb-1">{name}</p>
                {Object.entries(row)
                  .filter(([k]) => !['latitude', 'longitude'].includes(k)).slice(0, 8)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium">{typeof v === 'number' ? v.toLocaleString() : String(v)}</span>
                    </div>
                  ))}
              </div>
            </Popup>
          </CircleMarker>
        );
        count++;
      }
    }
    return els;
  }, [datasets, selectedColumns, useClustering, displayLimit, globalPointRadius, globalPointOpacity, t]);

  //  Cluster icon factory 
  const clusterIcon = useCallback((cluster: L.MarkerCluster) => {
    const n    = cluster.getChildCount();
    const size = n < 10 ? 34 : n < 100 ? 42 : 52;
    return L.divIcon({
      html: `<div style="background:${clusteringConfig.clusterColor};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.28);color:${clusteringConfig.clusterTextColor};font-weight:700;font-size:${size < 42 ? 12 : 14}px">${n}</div>`,
      className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    });
  }, [clusteringConfig.clusterColor, clusteringConfig.clusterTextColor]);

  //  Auto-detect columns 
  const autoDetect = useCallback((columns: string[]) => {
    const r = { lat: '', lng: '', value: '', time: '' };
    columns.forEach(col => {
      const lc = col.toLowerCase();
      if (!r.lat   && ['lat', 'latitude', 'y'].some(p => lc.includes(p)))                          r.lat   = col;
      if (!r.lng   && ['lng', 'lon', 'longitude', 'x'].some(p => lc.includes(p)))                  r.lng   = col;
      if (!r.value && ['value', 'val', 'count', 'cas', 'incidence', 'cases'].some(p => lc.includes(p))) r.value = col;
      if (!r.time  && ['time', 'date', 'timestamp', 'jour'].some(p => lc.includes(p)))             r.time  = col;
    });
    return r;
  }, []);

  const processData = useCallback((data: DataRow[], fileName: string) => {
    const clean = data.filter(row => Object.values(row).some(v => v !== null && String(v).trim()));
    if (!clean.length) { pushToast(t('toasts.fileEmpty'), 'error'); setIsLoading(false); return; }
    const detected = autoDetect(Object.keys(clean[0] ?? {}));
    setSelectedColumns(prev => ({ ...prev, ...Object.fromEntries(Object.entries(detected).filter(([, v]) => v)) }));
    setDatasets(prev => [...prev, {
      id: Date.now().toString(), name: fileName, color: randomColor(),
      data: clean, visible: true, clustering: true, heatmap: true, pointRadius: 8, pointOpacity: 0.8,
    }]);
    setIsLoading(false);
    pushToast(t('toasts.fileLoaded', { count: clean.length.toLocaleString(), name: fileName }), 'success');
  }, [autoDetect, pushToast, t]);

  const handleFile = useCallback((file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.csv')) {
      reader.onload = e => {
        Papa.parse(e.target?.result as string, {
          header: true, skipEmptyLines: true,
          complete: r => processData(r.data as DataRow[], file.name),
          error: err => { pushToast(t('toasts.csvError', { message: err.message }), 'error'); setIsLoading(false); },
        });
      };
      reader.readAsText(file);
    } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      reader.onload = e => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
          processData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as DataRow[], file.name);
        } catch (err) { pushToast(t('toasts.excelError', { message: (err as Error).message }), 'error'); setIsLoading(false); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      pushToast(t('toasts.formatError'), 'error');
      setIsLoading(false);
    }
  }, [processData, pushToast, t]);

  const loadExample = useCallback(async (id: string) => {
    const ex = DISEASE_EXAMPLES.find(d => d.id === id);
    if (!ex) return;
    setIsLoading(true); setExampleProgress(0);
    const tick = setInterval(() => setExampleProgress(p => Math.min(90, p + 12)), 80);
    await new Promise(r => setTimeout(r, 700));
    clearInterval(tick);
    const data = ex.countries.map(c => ({
      pays: c.name, maladie: ex.name,
      latitude: c.lat, longitude: c.lng,
      cas: c.cases, taux_incidence: c.incidenceRate,
      population: c.population, region: c.region,
    }));
    setDatasets(prev => [...prev, {
      id: ex.id + '-' + Date.now(), name: ex.name, color: ex.color,
      data, visible: true, clustering: true, heatmap: true, pointRadius: 8, pointOpacity: 0.8,
    }]);
    setSelectedColumns({ lat: 'latitude', lng: 'longitude', value: 'cas', time: '' });
    setExampleProgress(100); setIsLoading(false);
    pushToast(t('toasts.exampleLoaded', { name: ex.name, count: ex.countries.length }), 'success');
  }, [pushToast, t]);

  const loadSelectedExamples = useCallback(async () => {
    setIsExampleModalOpen(false);
    for (const id of selectedDiseases) await loadExample(id);
    setSelectedDiseases([]);
  }, [selectedDiseases, loadExample]);

  const runAIAnalysis = useCallback(() => {
    setActiveTab('analysis');
    setMobileTab('analysis');
    pushToast(t('toasts.aiComingSoon'), 'info');
  }, [pushToast, t]);

  //  Export helpers 
  const exportCSV = useCallback(() => {
    const flat = datasets.filter(d => d.visible).flatMap(d => d.data);
    if (!flat.length) { pushToast(t('toasts.exportCsvEmpty'), 'warning'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([Papa.unparse(flat)], { type: 'text/csv' }));
    a.download = 'geodata_export.csv'; a.click();
    pushToast(t('toasts.exportCsvSuccess'), 'success');
  }, [datasets, pushToast, t]);

  const exportGeoJSON = useCallback(() => {
    const flat = datasets.filter(d => d.visible).flatMap(d => d.data);
    if (!flat.length || !selectedColumns.lat || !selectedColumns.lng) {
      pushToast(t('toasts.exportGeoJsonWarning'), 'warning'); return;
    }
    const features = flat
      .filter(r => !isNaN(parseFloat(r[selectedColumns.lat] as string)) && !isNaN(parseFloat(r[selectedColumns.lng] as string)))
      .map(r => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(r[selectedColumns.lng] as string), parseFloat(r[selectedColumns.lat] as string)],
        },
        properties: Object.fromEntries(
          Object.entries(r).filter(([k]) => ![selectedColumns.lat, selectedColumns.lng].includes(k))
        ),
      }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ type: 'FeatureCollection', features }, null, 2)], { type: 'application/json' }));
    a.download = 'geodata_export.geojson'; a.click();
    pushToast(t('toasts.exportGeoJsonSuccess', { count: features.length }), 'success');
  }, [datasets, selectedColumns, pushToast, t]);

  const updateDataset = useCallback((id: string, updates: Partial<Dataset>) =>
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d)), []);

  const removeDataset = useCallback((id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    pushToast(t('toasts.datasetRemoved'), 'info');
  }, [pushToast, t]);

  const allColumns = useMemo(() => {
    const s = new Set<string>();
    datasets.forEach(d => d.data[0] && Object.keys(d.data[0]).forEach(k => s.add(k)));
    return [...s];
  }, [datasets]);

  const indicatorItems = [
    { label: t('indicators.points'),   value: datasets.reduce((s, d) => s + (d.visible ? d.data.length : 0), 0).toLocaleString(), accent: 'text-indigo-500' },
    { label: t('indicators.total'),    value: stats.total > 999999 ? `${(stats.total / 1e6).toFixed(1)}M` : stats.total.toLocaleString(), accent: 'text-rose-500' },
    { label: t('indicators.average'),  value: Math.round(stats.avg).toLocaleString(), accent: 'text-amber-500' },
    { label: t('indicators.max'),      value: stats.max.toLocaleString(), accent: 'text-emerald-500' },
    { label: t('indicators.datasets'), value: String(datasets.length), accent: 'text-violet-500' },
  ];

  //  UI tokens 
  const UI = {
    bg:    'bg-[#F8FAFC] dark:bg-[#0F172A]',
    card:  isDark ? 'bg-slate-800/70 border border-slate-700/50' : 'bg-white border border-slate-200',
    text:  'text-slate-700 dark:text-slate-300',
    muted: 'text-slate-500 dark:text-slate-400',
    hover: isDark ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50',
    input: 'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm px-3 py-2 outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400',
  };

  //  Color picker commit 
  const commitColor = useCallback((c: string) => {
    if (!colorPickerCtx) return;
    if (colorPickerCtx.type === 'dataset' && colorPickerCtx.id) {
      updateDataset(colorPickerCtx.id, { color: c });
    } else if (colorPickerCtx.type === 'cluster') {
      setClusteringConfig(p => ({ ...p, clusterColor: c }));
    } else if (colorPickerCtx.type === 'gradient' && colorPickerCtx.gradientKey !== undefined) {
      setHeatmapConfig(p => ({ ...p, gradient: { ...p.gradient, [colorPickerCtx.gradientKey!]: c } }));
    }
  }, [colorPickerCtx, updateDataset]);

  //  Side panel 

  const SidePanelContent = () => (
    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="h-full flex flex-col">
      <TabsList className="grid grid-cols-4 mb-4 flex-shrink-0 text-[10px]">
        <TabsTrigger value="data">         {t('tabs.data')}</TabsTrigger>
        <TabsTrigger value="visualization">{t('tabs.visualization')}</TabsTrigger>
        <TabsTrigger value="analysis">    {t('tabs.analysis')}</TabsTrigger>
        <TabsTrigger value="settings">    {t('tabs.settings')}</TabsTrigger>
      </TabsList>

      {/*  DATA tab  */}
      <TabsContent value="data" className="flex-1 overflow-y-auto space-y-5 pb-4">
        <div>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-3`}>
            {t('data.import')}
          </p>
          <div
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = ''; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = ''; const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-border rounded-2xl p-5 text-center transition-colors cursor-pointer ${UI.hover}`}>
            <Upload size={22} className={`mx-auto mb-2 ${UI.muted}`} />
            <p className={`text-xs ${UI.muted}`}>
              {t('data.dropzoneText')}{' '}
              <span className="text-primary font-medium">{t('data.dropzoneBrowse')}</span>
            </p>
            <p className={`text-[10px] ${UI.muted} mt-0.5`}>{t('data.formats')}</p>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        </div>

        {datasets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>
                {t('data.datasetsTitle', { count: datasets.length })}
              </p>
              <div className="flex gap-1">
                <button onClick={exportCSV} className={`text-[9px] font-bold text-primary px-2 py-1 rounded-lg ${UI.hover} flex items-center gap-1`}>
                  <Download size={9} />{t('data.exportCsv')}
                </button>
                <button onClick={exportGeoJSON} className={`text-[9px] font-bold text-primary px-2 py-1 rounded-lg ${UI.hover} flex items-center gap-1`}>
                  <Download size={9} />{t('data.exportGeojson')}
                </button>
              </div>
            </div>
            <ScrollArea className="h-72">
              <div className="space-y-3 pr-1">
                {datasets.map(ds => (
                  <div key={ds.id} className={`${UI.card} rounded-2xl p-3 relative`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <button className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                          style={{ backgroundColor: ds.color }}
                          onClick={() => { setColorPickerCtx({ type: 'dataset', id: ds.id }); setColorPickerValue(ds.color); }} />
                        <span className="text-xs font-semibold truncate max-w-[110px]">{ds.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => updateDataset(ds.id, { visible: !ds.visible })} className={`p-1 rounded-lg ${UI.hover} ${UI.muted}`}>
                          {ds.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button onClick={() => removeDataset(ds.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className={`text-[10px] ${UI.muted} mb-2`}>
                      {t('data.points', { count: ds.data.length.toLocaleString() })}
                    </p>
                    <div className="flex gap-3 text-[10px]">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Switch checked={ds.clustering ?? true} onCheckedChange={v => updateDataset(ds.id, { clustering: v })} className="scale-75" />
                        <span className={UI.muted}>{t('data.cluster')}</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Switch checked={ds.heatmap ?? true} onCheckedChange={v => updateDataset(ds.id, { heatmap: v })} className="scale-75" />
                        <span className={UI.muted}>{t('data.heatmap')}</span>
                      </label>
                    </div>
                    {colorPickerCtx?.type === 'dataset' && colorPickerCtx.id === ds.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <HexColorPicker color={colorPickerValue} onChange={c => { setColorPickerValue(c); commitColor(c); }} />
                        <button onClick={() => setColorPickerCtx(null)} className="mt-2 w-full py-1 bg-primary text-primary-foreground rounded-xl text-xs font-bold">
                          {t('data.confirm')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </TabsContent>

      {/*  VISUALIZATION tab  */}
      <TabsContent value="visualization" className="flex-1 overflow-y-auto space-y-5 pb-4">
        {/* Heatmap */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>
              {t('visualization.heatmapTitle')}
            </p>
            <Switch checked={heatmapConfig.visible} onCheckedChange={v => setHeatmapConfig(p => ({ ...p, visible: v }))} />
          </div>
          {heatmapConfig.visible && (
            <div className="space-y-3 pl-1">
              {([
                [t('visualization.radius'), 'radius', 5, 60, 1],
                [t('visualization.blur'),   'blur',   0, 40, 1],
              ] as const).map(([label, key, min, max, step]) => (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <Label className={`text-xs ${UI.muted}`}>{label}</Label>
                    <span className={`text-xs font-mono ${UI.muted}`}>{heatmapConfig[key]}</span>
                  </div>
                  <Slider value={[heatmapConfig[key]]} onValueChange={v => setHeatmapConfig(p => ({ ...p, [key]: v[0] }))} min={min} max={max} step={step} />
                </div>
              ))}
              <div>
                <Label className={`text-xs ${UI.muted} block mb-2`}>{t('visualization.gradient')}</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(heatmapConfig.gradient).map(([k, color]) => (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <button className="w-7 h-7 rounded-lg border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                        onClick={() => { setColorPickerCtx({ type: 'gradient', gradientKey: parseFloat(k) }); setColorPickerValue(color); }} />
                      <span className={`text-[8px] ${UI.muted}`}>{k}</span>
                    </div>
                  ))}
                </div>
                {colorPickerCtx?.type === 'gradient' && (
                  <div className="mt-2">
                    <HexColorPicker color={colorPickerValue} onChange={c => { setColorPickerValue(c); commitColor(c); }} />
                    <button onClick={() => setColorPickerCtx(null)} className="mt-2 w-full py-1 bg-primary text-primary-foreground rounded-xl text-xs font-bold">
                      {t('visualization.confirm')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Clustering */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>
              {t('visualization.clusteringTitle')}
            </p>
            <Switch checked={useClustering} onCheckedChange={setUseClustering} />
          </div>
          {useClustering && (
            <div className="space-y-3 pl-1">
              <div>
                <Label className={`text-xs ${UI.muted} block mb-1`}>{t('visualization.clusterColor')}</Label>
                <button className="w-8 h-8 rounded-xl border-2 border-white shadow-sm"
                  style={{ backgroundColor: clusteringConfig.clusterColor }}
                  onClick={() => { setColorPickerCtx({ type: 'cluster' }); setColorPickerValue(clusteringConfig.clusterColor); }} />
                {colorPickerCtx?.type === 'cluster' && (
                  <div className="mt-2">
                    <HexColorPicker color={colorPickerValue} onChange={c => { setColorPickerValue(c); commitColor(c); }} />
                    <button onClick={() => setColorPickerCtx(null)} className="mt-2 w-full py-1 bg-primary text-primary-foreground rounded-xl text-xs font-bold">
                      {t('visualization.confirm')}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <Label className={`text-xs ${UI.muted}`}>{t('visualization.maxRadius')}</Label>
                  <span className={`text-xs font-mono ${UI.muted}`}>{clusteringConfig.maxClusterRadius}</span>
                </div>
                <Slider value={[clusteringConfig.maxClusterRadius]}
                  onValueChange={v => setClusteringConfig(p => ({ ...p, maxClusterRadius: v[0] }))} min={20} max={200} step={5} />
              </div>
              {([
                [t('visualization.coverageOnHover'), 'showCoverageOnHover'],
                [t('visualization.zoomOnClick'),     'zoomToBoundsOnClick'],
                [t('visualization.spiderfy'),         'spiderfyOnMaxZoom'],
              ] as const).map(([label, key]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className={`text-xs ${UI.muted}`}>{label}</span>
                  <Switch checked={clusteringConfig[key]} onCheckedChange={v => setClusteringConfig(p => ({ ...p, [key]: v }))} className="scale-75" />
                </label>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Global points */}
        <div>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-3`}>
            {t('visualization.pointsTitle')}
          </p>
          {[
            { label: t('visualization.globalRadius'), val: globalPointRadius, set: setGlobalPointRadius, min: 2, max: 30, step: 1 },
            { label: t('visualization.opacity'), val: Math.round(globalPointOpacity * 100), set: (v: number) => setGlobalPointOpacity(v / 100), min: 10, max: 100, step: 5 },
          ].map(({ label, val, set, min, max, step }) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between mb-1">
                <Label className={`text-xs ${UI.muted}`}>{label}</Label>
                <span className={`text-xs font-mono ${UI.muted}`}>{val}</span>
              </div>
              <Slider value={[val]} onValueChange={v => set(v[0])} min={min} max={max} step={step} />
            </div>
          ))}
        </div>
      </TabsContent>

      {/*  ANALYSIS tab  */}
      <TabsContent value="analysis" className="flex-1 overflow-y-auto pb-4">
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
            <BrainCircuit size={24} className="text-primary" />
          </div>
          <h3 className="text-sm font-black mb-2">{t('analysis.title')}</h3>
          <p className={`text-xs ${UI.muted} max-w-[220px] mb-4 leading-relaxed`}>
            {t('analysis.description')}
          </p>
          <ComingSoon label={t('analysis.comingSoon')} />
          <div className="mt-6 w-full space-y-2">
            {([
              'clusterDetection', 'incidenceRate', 'temporalAnalysis', 'recommendations', 'riskScoring',
            ] as const).map(key => (
              <div key={key} className={`flex items-center gap-2.5 p-2.5 ${UI.card} rounded-xl text-xs`}>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                <span className={UI.muted}>{t(`analysis.${key}`)}</span>
                <span className="ml-auto"><ComingSoon label={t('comingSoon')} /></span>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      {/*  SETTINGS tab  */}
      <TabsContent value="settings" className="flex-1 overflow-y-auto space-y-5 pb-4">

        {/* Columns */}
        <div>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-3`}>
            {t('settings.columnsTitle')}
          </p>
          {allColumns.length > 0
            ? ([
                [t('settings.latitude'),  'lat'],
                [t('settings.longitude'), 'lng'],
                [t('settings.value'),     'value'],
                [t('settings.time'),      'time'],
              ] as const).map(([label, key]) => (
                <div key={key} className="mb-3">
                  <Label className={`block text-xs ${UI.muted} mb-1`}>{label}</Label>
                  <select value={selectedColumns[key]}
                    onChange={e => setSelectedColumns(p => ({ ...p, [key]: e.target.value }))}
                    className={UI.input}>
                    <option value="">{t('settings.selectPlaceholder')}</option>
                    {allColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))
            : <p className={`text-xs ${UI.muted}`}>{t('settings.noDataset')}</p>
          }
        </div>

        <Separator />

        {/* Display limit */}
        <div>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-2`}>
            {t('settings.displayLimitTitle')}
          </p>
          <select value={String(displayLimit)}
            onChange={e => setDisplayLimit(e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value))}
            className={UI.input}>
            <option value="500">    {t('settings.limit500')}</option>
            <option value="1000">   {t('settings.limit1000')}</option>
            <option value="5000">   {t('settings.limit5000')}</option>
            <option value="10000">  {t('settings.limit10000')}</option>
            <option value="unlimited">{t('settings.limitUnlimited')}</option>
          </select>
        </div>

        <Separator />

        {/* In-development features */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>
              {t('settings.inDevelopment')}
            </p>
            <ComingSoon label={t('comingSoon')} />
          </div>

          {/* 1 – Timeline */}
          <div className={`${UI.card} rounded-2xl p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-indigo-500" />
                <span className="text-xs font-bold">{t('settings.timelineTitle')}</span>
                <ComingSoon label={t('comingSoonBeta')} />
              </div>
              <button
                onClick={() => setTimelinePlaying(v => !v)}
                disabled={!datasets.length}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${timelinePlaying ? 'bg-rose-500/15 text-rose-500' : 'bg-indigo-500/15 text-indigo-500'}`}>
                {timelinePlaying ? '⏸' : '▶'}
              </button>
            </div>
            <div className="space-y-1.5">
              <input type="range" min={0}
                max={Math.max(1, datasets.reduce((m, d) => Math.max(m, d.data.length - 1), 1))}
                value={timelineDay}
                onChange={e => { setTimelineDay(Number(e.target.value)); setTimelinePlaying(false); }}
                className="w-full h-1.5 accent-indigo-500 cursor-pointer" />
              <div className={`flex justify-between text-[9px] ${UI.muted}`}>
                <span>{t('settings.timelineDayStart')}</span>
                <span className="font-mono font-bold text-indigo-500">
                  {t('settings.timelineDayCurrent', { day: timelineDay })}
                </span>
                <span>{t('settings.timelineDayEnd', { max: Math.max(1, datasets.reduce((m, d) => Math.max(m, d.data.length - 1), 1)) })}</span>
              </div>
            </div>
            <p className={`text-[10px] ${UI.muted} mt-1.5`}>{t('settings.timelineDescription')}</p>
          </div>

          {/* 2 – Alerts */}
          <div className={`${UI.card} rounded-2xl p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-amber-500" />
                <span className="text-xs font-bold">{t('settings.alertsTitle')}</span>
                <ComingSoon label={t('comingSoonBeta')} />
              </div>
              <button onClick={() => {
                setAlertsEnabled(v => !v);
                if (!alertsEnabled) pushToast(t('toasts.alertEnabled'), 'info');
              }}
                className={`w-8 h-4 rounded-full transition-all ${alertsEnabled ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${alertsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] ${UI.muted} flex-shrink-0`}>{t('settings.alertsThreshold')}</span>
              <input type="number" value={alertThreshold} min={100} step={1000}
                onChange={e => setAlertThreshold(Number(e.target.value))}
                className={`flex-1 ${UI.input} py-1 text-[10px] font-mono`} />
              <span className={`text-[10px] ${UI.muted}`}>{t('settings.alertsUnit')}</span>
            </div>
            {alertsEnabled && (
              <p className="text-[10px] text-amber-500 mt-1.5 flex items-center gap-1">
                <span>●</span> {t('settings.alertsActive', { threshold: alertThreshold.toLocaleString() })}
              </p>
            )}
          </div>

          {/* 3 – Multi-epidemic comparison */}
          <div className={`${UI.card} rounded-2xl p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FlaskConical size={12} className="text-emerald-500" />
                <span className="text-xs font-bold">{t('settings.comparisonTitle')}</span>
                <ComingSoon label={t('comingSoonBeta')} />
              </div>
              <button onClick={() => setShowComparison(v => !v)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${showComparison ? 'bg-emerald-500 text-white' : 'bg-emerald-500/15 text-emerald-500'}`}>
                {showComparison ? t('settings.comparisonHide') : t('settings.comparisonShow')}
              </button>
            </div>
            {showComparison && datasets.length > 0 ? (
              <div className="space-y-1.5 mt-1">
                {datasets.filter(d => d.visible).map(ds => {
                  const vals = ds.data.map(r => parseFloat(r[selectedColumns.value] as string) || 0).filter(v => !isNaN(v));
                  const max  = vals.length ? Math.max(...vals) : 0;
                  const sum  = vals.reduce((a, b) => a + b, 0);
                  const totalAll = datasets.filter(d => d.visible)
                    .reduce((m2, d2) => m2 + d2.data.map(r => parseFloat(r[selectedColumns.value] as string) || 0).reduce((a, b) => a + b, 0), 0);
                  return (
                    <div key={ds.id} className="p-2 rounded-xl bg-muted">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ds.color }} />
                        <span className="text-[10px] font-semibold truncate max-w-[100px]">{ds.name}</span>
                        <span className={`ml-auto text-[9px] ${UI.muted}`}>
                          {t('settings.comparisonPoints', { count: ds.data.length })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <span className={UI.muted}>
                          {t('settings.comparisonTotal')} <span className="font-mono font-bold text-foreground">{sum.toLocaleString()}</span>
                        </span>
                        <span className={UI.muted}>
                          {t('settings.comparisonMax')} <span className="font-mono font-bold text-rose-500">{max.toLocaleString()}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ backgroundColor: ds.color, width: `${totalAll > 0 ? Math.min(100, (sum / totalAll) * 100) : 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : showComparison ? (
              <p className={`text-[10px] ${UI.muted}`}>{t('settings.comparisonNoDatasets')}</p>
            ) : (
              <p className={`text-[10px] ${UI.muted}`}>{t('settings.comparisonHint')}</p>
            )}
          </div>

          {/* 4 – Real-time feed */}
          <div className={`${UI.card} rounded-2xl p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-violet-500" />
                <span className="text-xs font-bold">{t('settings.realtimeTitle')}</span>
                <ComingSoon label={t('comingSoonBeta')} />
              </div>
              <button onClick={() => {
                if (rtMode === 'off') { setRtMode('connecting'); pushToast(t('toasts.rtConnecting'), 'info'); }
                else { setRtMode('off'); if (rtRef.current) clearInterval(rtRef.current); pushToast(t('toasts.rtDisconnected'), 'info'); }
              }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1
                  ${rtMode === 'off'        ? 'bg-violet-500/15 text-violet-500' :
                    rtMode === 'connecting' ? 'bg-amber-500/15 text-amber-500'   :
                                              'bg-emerald-500 text-white'}`}>
                {rtMode === 'off'        && t('settings.realtimeStart')}
                {rtMode === 'connecting' && <><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" /> {t('settings.realtimeConnecting')}</>}
                {rtMode === 'connected'  && <><span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" /> {t('settings.realtimeLive')}</>}
              </button>
            </div>
            {rtMode === 'connected' && (
              <div className="text-[10px] text-emerald-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('settings.realtimeActive')}
              </div>
            )}
            {rtMode === 'off' && (
              <p className={`text-[10px] ${UI.muted}`}>{t('settings.realtimeDescription')}</p>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  //  Render 

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900 overflow-hidden">

      <ToastStack toasts={toasts} dismiss={dismissToast} />

      {/* Header */}
      <header className={`${UI.card.replace('border', '')} border-b border-border px-4 py-3 flex-shrink-0 z-10`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <nav className="flex items-center gap-2 text-xs">
            <Link href="/" className={`${UI.muted} hover:text-primary transition-colors`}>{t('nav.home')}</Link>
            <ChevronRight size={12} className={UI.muted} />
            <Link href="/geospatial" className={`${UI.muted} hover:text-primary transition-colors`}>{t('nav.geospatial')}</Link>
            <ChevronRight size={12} className={UI.muted} />
            <span className="font-semibold">{t('nav.map')}</span>
          </nav>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Map view selector */}
            <div className="flex bg-muted p-0.5 rounded-xl">
              {(['street', 'satellite', 'dark'] as const).map(v => (
                <button key={v} onClick={() => setMapView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mapView === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  <Globe size={11} />
                  {t(`header.${v}`)}
                </button>
              ))}
            </div>

            <button onClick={() => setIsExampleModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs font-medium ${UI.muted} ${UI.hover} transition-all`}>
              <Database size={13} /> {t('header.examples')}
            </button>

            <button onClick={runAIAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm shadow-primary/20">
              <BrainCircuit size={13} /> {t('header.analyze')}
            </button>

            <button onClick={() => setShowSidePanel(v => !v)}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs font-medium ${UI.muted} ${UI.hover} transition-all`}>
              <Settings2 size={13} /> {showSidePanel ? t('header.hidePanel') : t('header.showPanel')}
            </button>

            {switchable && (
              <button onClick={toggleTheme} className={`p-2 ${UI.card} rounded-xl ${UI.muted} ${UI.hover} transition-all`}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Indicator bar */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 flex-shrink-0">
        {indicatorItems.map((item, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
            className={`relative overflow-hidden ${UI.card} rounded-2xl p-3`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.accent} rounded-l-2xl`} />
            <p className={`text-[9px] font-bold uppercase tracking-widest ${item.accent} ${UI.muted} mb-0.5`}>{item.label}</p>
            <p className="text-xl font-black tracking-tight">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Desktop quick controls */}
      <div className="hidden lg:flex items-center gap-4 px-4 pb-3 flex-shrink-0">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={useClustering} onCheckedChange={setUseClustering} />
          <span className={`text-xs ${UI.muted}`}>{t('controls.clustering')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch checked={useHeatmap} onCheckedChange={setUseHeatmap} />
          <span className={`text-xs ${UI.muted}`}>{t('controls.heatmap')}</span>
        </label>
        <button onClick={exportCSV} className={`flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs ${UI.muted} ${UI.hover} transition-all`}>
          <Download size={12} /> {t('controls.csv')}
        </button>
        <button onClick={exportGeoJSON} className={`flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs ${UI.muted} ${UI.hover} transition-all`}>
          <Download size={12} /> {t('controls.geojson')}
        </button>
        <select value={String(displayLimit)}
          onChange={e => setDisplayLimit(e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value))}
          className={`${UI.input} w-auto text-[10px] h-8 py-0`}>
          <option value="1000">   {t('settings.limit1000')}</option>
          <option value="5000">   {t('settings.limit5000')}</option>
          <option value="10000">  {t('settings.limit10000')}</option>
          <option value="unlimited">{t('settings.limitUnlimited')}</option>
        </select>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* Map */}
        <div className="flex-1 relative overflow-hidden min-h-0 mx-3 mb-3 rounded-3xl border border-border">
          {datasets.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
              <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                <MapIcon size={24} className="text-primary" />
              </div>
              <h2 className="text-lg font-black mb-2">{t('map.emptyTitle')}</h2>
              <p className={`text-sm ${UI.muted} max-w-xs`}>{t('map.emptyDescription')}</p>
            </div>
          )}
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tileUrl} attribution="© OpenStreetMap" />
            {useHeatmap && heatmapConfig.visible && heatmapPoints.length > 0 && (
              <HeatmapLayer points={heatmapPoints} radius={heatmapConfig.radius} blur={heatmapConfig.blur}
                max={heatmapConfig.max} minOpacity={heatmapConfig.minOpacity} gradient={heatmapConfig.gradient} />
            )}
            {useClustering ? (
              <MarkerClusterGroup iconCreateFunction={clusterIcon}
                showCoverageOnHover={clusteringConfig.showCoverageOnHover}
                zoomToBoundsOnClick={clusteringConfig.zoomToBoundsOnClick}
                spiderfyOnMaxZoom={clusteringConfig.spiderfyOnMaxZoom}
                maxClusterRadius={clusteringConfig.maxClusterRadius}
                disableClusteringAtZoom={clusteringConfig.disableClusteringAtZoom}
                animate={clusteringConfig.animate}>
                {circleMarkers}
              </MarkerClusterGroup>
            ) : circleMarkers}
          </MapContainer>

          {/* Legend */}
          <div className={`absolute bottom-4 left-4 ${UI.card} rounded-2xl p-3 z-[400]`}>
            <p className={`text-[8px] font-bold uppercase tracking-widest ${UI.muted} mb-2`}>{t('map.legendTitle')}</p>
            {([
              ['#3b82f6', 'legendLow'],
              ['#10b981', 'legendModerate'],
              ['#f59e0b', 'legendHigh'],
              ['#ef4444', 'legendCritical'],
            ] as const).map(([color, key]) => (
              <div key={key} className="flex items-center gap-2 mb-1 last:mb-0">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className={`text-[10px] ${UI.muted}`}>{t(`map.${key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop side panel */}
        {showSidePanel && (
          <div className={`hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 mr-3 mb-3 ${UI.card} rounded-3xl overflow-hidden`}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-sm font-black tracking-tight">{t('panel.title')}</h2>
              <button onClick={() => setShowSidePanel(false)} className={`p-1 rounded-lg ${UI.hover} ${UI.muted}`}>
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden px-4 pb-4 min-h-0">
              <SidePanelContent />
            </div>
          </div>
        )}

        {/* Mobile panels */}
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden min-h-0 pb-14">
          {mobileTab !== 'map' && (
            <div className="flex-1 overflow-hidden px-3 py-2 min-h-0">
              <SidePanelContent />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-1 z-50">
        {([
          { id: 'map',      icon: MapIcon,      labelKey: 'mobile.map'      },
          { id: 'data',     icon: Database,     labelKey: 'mobile.data'     },
          { id: 'analysis', icon: BrainCircuit, labelKey: 'mobile.analysis' },
          { id: 'settings', icon: Settings2,    labelKey: 'mobile.settings' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setMobileTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] transition-all
              ${mobileTab === tab.id ? 'text-primary bg-primary/10' : `${UI.muted} ${UI.hover}`}`}>
            <tab.icon size={18} />
            <span>{t(tab.labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* Modal – Examples */}
      <Dialog open={isExampleModalOpen} onOpenChange={setIsExampleModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">{t('modal.title')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('modal.description')}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <Progress value={exampleProgress} className="w-full h-1.5" />
              <p className="text-xs text-muted-foreground">{exampleProgress}%</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[420px] pr-2">
              <div className="space-y-3">
                {DISEASE_EXAMPLES.map(ex => (
                  <button key={ex.id}
                    onClick={() => setSelectedDiseases(p => p.includes(ex.id) ? p.filter(d => d !== ex.id) : [...p, ex.id])}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedDiseases.includes(ex.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ex.color }} />
                          <span className="font-bold text-sm">{ex.name}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {ex.source.credibility === 'high' ? t('modal.highCredibility') : t('modal.mediumCredibility')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{ex.description}</p>
                        <div className="flex gap-2 text-[9px] flex-wrap">
                          <span className="px-2 py-0.5 bg-muted rounded-full font-medium">
                            {t('modal.countries', { count: ex.countries.length })}
                          </span>
                          <span className="px-2 py-0.5 bg-muted rounded-full font-medium">{ex.source.organization}</span>
                          <span className="px-2 py-0.5 bg-muted rounded-full font-medium">{ex.source.year}</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedDiseases.includes(ex.id) ? 'border-primary bg-primary' : 'border-border'}`}>
                        {selectedDiseases.includes(ex.id) && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsExampleModalOpen(false)} className="rounded-xl">
              {t('modal.cancel')}
            </Button>
            <Button onClick={loadSelectedExamples} disabled={!selectedDiseases.length} className="rounded-xl">
              {selectedDiseases.length > 0 ? t('modal.loadCount', { count: selectedDiseases.length }) : t('modal.load')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeospatialVisualization;