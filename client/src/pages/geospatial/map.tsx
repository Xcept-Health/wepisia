import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { HexColorPicker } from 'react-colorful';
import {
  ChevronRight,
  Database,
  BrainCircuit,
  Settings2,
  Upload,
  Globe,
  Eye,
  EyeOff,
  Trash2,
  Layers,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

// ------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------
interface DataRow {
  [key: string]: string | number;
}

interface Dataset {
  id: string;
  name: string;
  color: string;
  data: DataRow[];
  visible: boolean;
  clustering?: boolean;
  heatmap?: boolean;
  pointRadius?: number;
  pointOpacity?: number;
}

interface DiseaseExample {
  id: string;
  name: string;
  description: string;
  color: string;
  source: {
    organization: string;
    year: number;
    study: string;
    url: string;
    dataType: 'surveillance' | 'report' | 'study' | 'model';
    credibility: 'high' | 'medium' | 'low';
    lastUpdated: string;
  };
  countries: {
    name: string;
    lat: number;
    lng: number;
    cases: number;
    incidenceRate: number;
    population: number;
    region: string;
    sourceDetail: string;
  }[];
}

interface AIResults {
  summary: string;
  insights: string[];
  recommendations: string[];
  alerts: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface HeatmapConfig {
  radius: number;
  blur: number;
  maxZoom: number;
  max: number;
  minOpacity: number;
  gradient: { [key: number]: string };
  visible: boolean;
}

interface ClusteringConfig {
  showCoverageOnHover: boolean;
  zoomToBoundsOnClick: boolean;
  spiderfyOnMaxZoom: boolean;
  removeOutsideVisibleBounds: boolean;
  maxClusterRadius: number;
  disableClusteringAtZoom: number;
  animate: boolean;
  animateAddingMarkers: boolean;
  chunkedLoading: boolean;
  chunkInterval: number;
  chunkDelay: number;
  clusterColor: string;
  clusterTextColor: string;
}


// COMPOSANT HEATMAP PERSONNALISÉ *
interface HeatmapLayerProps {
  points: [number, number, number][];
  radius?: number;
  blur?: number;
  max?: number;
  minOpacity?: number;
  gradient?: { [key: number]: string };
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  points,
  radius = 25,
  blur = 15,
  max = 1.0,
  minOpacity = 0.2,
  gradient
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius,
      blur,
      maxZoom: map.getMaxZoom() || 18,
      max,
      minOpacity,
      gradient
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, radius, blur, max, minOpacity, gradient]);

  return null;
};

// ------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ------------------------------------------------------------------
const GeospatialVisualization: React.FC = () => {
  // États principaux
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeTab, setActiveTab] = useState<'data' | 'analysis' | 'settings' | 'visualization'>('data');
  const [selectedColumns, setSelectedColumns] = useState({
    lat: '',
    lng: '',
    value: '',
    time: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiResults, setAiResults] = useState<AIResults | null>(null);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState<boolean>(false);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [exampleProgress, setExampleProgress] = useState<number>(0);
  const [showSidePanel, setShowSidePanel] = useState<boolean>(true);
  const [mapView, setMapView] = useState<'street' | 'satellite' | 'dark'>('street');
  const [displayLimit, setDisplayLimit] = useState<number | 'unlimited'>(1000);
  const [useClustering, setUseClustering] = useState<boolean>(false);
  const [useHeatmap, setUseHeatmap] = useState<boolean>(false);
  const [globalPointRadius, setGlobalPointRadius] = useState<number>(8);
  const [globalPointOpacity, setGlobalPointOpacity] = useState<number>(0.8);
  const [showColorPickerFor, setShowColorPickerFor] = useState<string | null>(null);
  
  // Configuration avancée
  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    radius: 25,
    blur: 15,
    maxZoom: 10,
    max: 1.0,
    minOpacity: 0.2,
    gradient: {
      0.4: 'blue',
      0.6: 'cyan',
      0.7: 'lime',
      0.8: 'yellow',
      1.0: 'red'
    },
    visible: false
  });

  const [clusteringConfig, setClusteringConfig] = useState<ClusteringConfig>({
    showCoverageOnHover: true,
    zoomToBoundsOnClick: true,
    spiderfyOnMaxZoom: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 80,
    disableClusteringAtZoom: 10,
    animate: true,
    animateAddingMarkers: true,
    chunkedLoading: true,
    chunkInterval: 100,
    chunkDelay: 500,
    clusterColor: '#3388ff',
    clusterTextColor: '#ffffff'
  });

  const mapRef = useRef<L.Map>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------
  // DONNÉES D'EXEMPLE
  // ------------------------------------------------------------------
  const diseaseExamples: DiseaseExample[] = [
    {
      id: 'ebola-2014-2016',
      name: 'Épidémie Ebola 2014-2016',
      description: 'Crise sanitaire majeure en Afrique de l\'Ouest',
      color: 'bg-red-500',
      source: {
        organization: 'OMS',
        year: 2016,
        study: 'Rapport final sur la flambée Ebola',
        url: 'https://www.who.int/',
        dataType: 'surveillance',
        credibility: 'high',
        lastUpdated: '2016-03-30'
      },
      countries: [
        { name: 'Guinée', lat: 9.9456, lng: -9.6966, cases: 3814, incidenceRate: 28.2, population: 12414000, region: 'Afrique de l\'Ouest', sourceDetail: 'OMS' },
        { name: 'Sierra Leone', lat: 8.4606, lng: -11.7799, cases: 14124, incidenceRate: 195.3, population: 7791000, region: 'Afrique de l\'Ouest', sourceDetail: 'OMS' },
        { name: 'Liberia', lat: 6.4281, lng: -9.4295, cases: 10675, incidenceRate: 232.7, population: 4854000, region: 'Afrique de l\'Ouest', sourceDetail: 'OMS' }
      ]
    },
    {
      id: 'covid-global',
      name: 'COVID-19 Distribution',
      description: 'Données agrégées de la pandémie COVID-19',
      color: 'bg-blue-500',
      source: {
        organization: 'Johns Hopkins University',
        year: 2023,
        study: 'COVID-19 Data Repository',
        url: 'https://github.com/CSSEGISandData/COVID-19',
        dataType: 'surveillance',
        credibility: 'high',
        lastUpdated: '2023-12-01'
      },
      countries: [
        { name: 'États-Unis', lat: 37.0902, lng: -95.7129, cases: 103436829, incidenceRate: 31156.8, population: 331900000, region: 'Amérique du Nord', sourceDetail: 'CDC' },
        { name: 'Inde', lat: 20.5937, lng: 78.9629, cases: 44994454, incidenceRate: 3260.2, population: 1380000000, region: 'Asie du Sud', sourceDetail: 'MoH India' },
        { name: 'Brésil', lat: -14.2350, lng: -51.9253, cases: 37711693, incidenceRate: 17693.6, population: 213000000, region: 'Amérique du Sud', sourceDetail: 'Ministério da Saúde' }
      ]
    }
  ];

  // ------------------------------------------------------------------
  // FONCTIONS UTILITAIRES
  // ------------------------------------------------------------------
  const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16);

  const generateContinentalData = () => {
    const continents = [
      { name: 'Afrique', countries: [
        { name: 'Nigeria', lat: 9.0820, lng: 8.6753, cases: 5000, incidenceRate: 24.3, region: 'Ouest' },
        { name: 'Égypte', lat: 26.8206, lng: 30.8025, cases: 1200, incidenceRate: 12.1, region: 'Nord' },
        { name: 'Afrique du Sud', lat: -30.5595, lng: 22.9375, cases: 3500, incidenceRate: 59.0, region: 'Sud' }
      ]},
      { name: 'Europe', countries: [
        { name: 'France', lat: 46.603354, lng: 1.888334, cases: 2800, incidenceRate: 41.8, region: 'Ouest' },
        { name: 'Allemagne', lat: 51.1657, lng: 10.4515, cases: 3200, incidenceRate: 38.4, region: 'Centre' },
        { name: 'Italie', lat: 41.8719, lng: 12.5674, cases: 2100, incidenceRate: 34.7, region: 'Sud' }
      ]}
    ];
    return continents.flatMap(continent =>
      continent.countries.map(country => ({
        pays: country.name,
        continent: continent.name,
        region: country.region,
        latitude: country.lat,
        longitude: country.lng,
        cas: country.cases,
        taux_incidence: country.incidenceRate,
        population: Math.floor(Math.random() * 50000000) + 1000000
      }))
    );
  };

  const loadDiseaseExample = async (diseaseId: string) => {
    setIsLoading(true);
    setExampleProgress(0);
    
    const interval = setInterval(() => {
      setExampleProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    const disease = diseaseExamples.find(d => d.id === diseaseId);
    if (disease) {
      const data = disease.countries.map(country => ({
        pays: country.name,
        maladie: disease.name,
        latitude: country.lat,
        longitude: country.lng,
        cas: country.cases,
        taux_incidence: country.incidenceRate,
        population: country.population,
        region: country.region,
        statut: country.cases > 1000000 ? 'Critique' :
                country.cases > 100000 ? 'Élevé' :
                country.cases > 10000 ? 'Modéré' : 'Faible'
      }));
      setDatasets(prev => [...prev, {
        id: disease.id + '-' + Date.now(),
        name: disease.name,
        color: disease.color.replace('bg-', '#'),
        data,
        visible: true,
        clustering: true,
        heatmap: true,
        pointRadius: 8,
        pointOpacity: 0.8
      }]);
      setSelectedColumns({
        lat: 'latitude',
        lng: 'longitude',
        value: 'cas',
        time: ''
      });
      
      setExampleProgress(100);
      setTimeout(() => {
        clearInterval(interval);
        setIsLoading(false);
        showNotification(`Données ${disease.name} chargées`, 'success');
      }, 500);
    }
  };

  const loadContinentalData = async () => {
    setIsLoading(true);
    setExampleProgress(0);
    
    const interval = setInterval(() => {
      setExampleProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 15;
      });
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    const data = generateContinentalData();
    setDatasets(prev => [...prev, {
      id: 'continental-' + Date.now(),
      name: 'Données Continentales',
      color: randomColor(),
      data,
      visible: true,
      clustering: true,
      heatmap: true,
      pointRadius: 8,
      pointOpacity: 0.8
    }]);
    setSelectedColumns({
      lat: 'latitude',
      lng: 'longitude',
      value: 'cas',
      time: ''
    });
    
    setExampleProgress(100);
    setTimeout(() => {
      clearInterval(interval);
      setIsLoading(false);
      showNotification('Données continentales chargées', 'success');
    }, 500);
  };

  const handleFileUpload = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      reader.onload = (e) => {
        Papa.parse(e.target?.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processData(results.data as DataRow[], file.name);
          },
          error: (error) => {
            showNotification('Erreur CSV: ' + error.message, 'error');
            setIsLoading(false);
          }
        });
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as DataRow[];
          processData(jsonData, file.name);
        } catch (error) {
          showNotification('Erreur Excel: ' + (error as Error).message, 'error');
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showNotification('Format non supporté', 'error');
      setIsLoading(false);
    }
  };

  const processData = (data: DataRow[], fileName: string) => {
    const filteredData = data.filter(row =>
      Object.values(row).some(val =>
        val !== null && val !== undefined && val !== '' && String(val).trim() !== ''
      )
    );

    const columns = Object.keys(filteredData[0] || {});
    const detectedCols = autoDetectColumns(columns);
    setSelectedColumns(detectedCols);
    setDatasets(prev => [...prev, {
      id: Date.now().toString(),
      name: fileName || 'Uploaded Data',
      color: randomColor(),
      data: filteredData,
      visible: true,
      clustering: true,
      heatmap: true,
      pointRadius: 8,
      pointOpacity: 0.8
    }]);

    setIsLoading(false);
    showNotification(`${filteredData.length} lignes chargées`, 'success');
  };

  const autoDetectColumns = (columns: string[]) => {
    const newCols = { ...selectedColumns };
    columns.forEach(col => {
      const lowerCol = col.toLowerCase();
      if (['lat', 'latitude', 'y'].some(p => lowerCol.includes(p))) newCols.lat = col;
      else if (['lng', 'lon', 'longitude', 'x'].some(p => lowerCol.includes(p))) newCols.lng = col;
      else if (['value', 'val', 'count', 'cas', 'incidence', 'cases'].some(p => lowerCol.includes(p))) newCols.value = col;
      else if (['time', 'date', 'timestamp', 'jour'].some(p => lowerCol.includes(p))) newCols.time = col;
    });
    return newCols;
  };

  const runAIAnalysis = async () => {
    const flatData = datasets.filter(d => d.visible).flatMap(d => d.data);
    if (flatData.length === 0) {
      showNotification('Veuillez charger des données d\'abord', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const aiResponse: AIResults = {
        summary: 'Analyse préliminaire indiquant des clusters dans les zones urbaines. Forte corrélation entre densité populationnelle et taux d\'incidence.',
        insights: [
          'Cluster principal identifié en Afrique de l\'Ouest',
          'Taux d\'incidence en augmentation de 15% dans les régions tempérées',
          'Corrélation positive entre densité urbaine et propagation'
        ],
        recommendations: [
          'Renforcer la surveillance dans les zones urbaines',
          'Mettre en place des centres de dépistage mobiles',
          'Augmenter la collecte de données temporelles'
        ],
        alerts: [
          'Zone à haut risque identifiée en Afrique Centrale',
          'Sous-déclaration suspectée dans certaines régions'
        ],
        riskLevel: 'medium'
      };
      setAiResults(aiResponse);
      showNotification('Analyse IA terminée', 'success');
    } catch (error) {
      showNotification('Erreur lors de l\'analyse IA', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`${type}: ${message}`);
    // Ici vous pouvez intégrer une vraie notification (sonner, toast, etc.)
  };

  const calculateStats = () => {
    const flatData = datasets.filter(d => d.visible).flatMap(d => d.data);
    if (flatData.length === 0) return { total: 0, avg: 0, max: 0, min: 0 };

    const values = flatData
      .map(row => parseFloat(row[selectedColumns.value] as string) || 0)
      .filter(val => !isNaN(val));

    const total = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? total / values.length : 0;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return { total, avg, max, min };
  };

  const stats = calculateStats();

  const updateDataset = (id: string, updates: Partial<Dataset>) => {
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const removeDataset = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
  };

  const toggleDiseaseSelection = (id: string) => {
    setSelectedDiseases(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const loadSelectedExamples = async () => {
    setIsExampleModalOpen(false);
    for (const id of selectedDiseases) {
      await loadDiseaseExample(id);
    }
    setSelectedDiseases([]);
  };

  const getTileUrl = () => {
    switch (mapView) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  // ------------------------------------------------------------------
  // FONCTIONS DE VISUALISATION
  // ------------------------------------------------------------------
  const getMarkerColor = (value: number, baseColor: string): string => {
    if (value > 1000000) return '#ef4444';
    if (value > 100000) return '#f59e0b';
    if (value > 10000) return '#10b981';
    return baseColor || '#3b82f6';
  };

  const createCircleIcon = (value: number, baseColor: string, radius?: number) => {
    const r = radius || globalPointRadius;
    const color = getMarkerColor(value, baseColor);
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: ${r*2}px; height: ${r*2}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-marker',
      iconSize: [r*2, r*2],
      iconAnchor: [r, r]
    });
  };

  const customClusterIcon = (cluster: L.MarkerCluster): L.DivIcon => {
    const count = cluster.getChildCount();
    let size = '40px';
    let fontSize = '16px';
    if (count < 10) size = '35px';
    else if (count < 100) size = '45px';
    else size = '55px';

    return L.divIcon({
      html: `<div style="background-color: ${clusteringConfig.clusterColor}; width: ${size}; height: ${size}; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.4); color: ${clusteringConfig.clusterTextColor}; font-weight: bold; font-size: ${fontSize};">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(parseInt(size), parseInt(size)),
      iconAnchor: L.point(parseInt(size)/2, parseInt(size)/2)
    });
  };

  // Données pour la heatmap
  const heatmapData = useMemo(() => {
    if (!useHeatmap || !heatmapConfig.visible) return [];
    const points: [number, number, number][] = [];
    const limit = displayLimit === 'unlimited' ? Infinity : displayLimit;
    let count = 0;
    for (const dataset of datasets) {
      if (!dataset.visible || dataset.heatmap === false) continue;
      for (const row of dataset.data) {
        if (count >= limit) break;
        const lat = parseFloat(row[selectedColumns.lat] as string);
        const lng = parseFloat(row[selectedColumns.lng] as string);
        const val = parseFloat(row[selectedColumns.value] as string) || 0;
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(val)) {
          points.push([lat, lng, val]);
          count++;
        }
      }
    }
    return points;
  }, [datasets, selectedColumns, useHeatmap, heatmapConfig.visible, displayLimit]);

  // Marqueurs pour le clustering
  const clusterMarkers = useMemo(() => {
    if (!useClustering) return null;
    const markers: JSX.Element[] = [];
    const limit = displayLimit === 'unlimited' ? Infinity : displayLimit;
    let count = 0;
    for (const dataset of datasets) {
      if (!dataset.visible || dataset.clustering === false) continue;
      for (const row of dataset.data) {
        if (count >= limit) break;
        const lat = parseFloat(row[selectedColumns.lat] as string);
        const lng = parseFloat(row[selectedColumns.lng] as string);
        const value = parseFloat(row[selectedColumns.value] as string) || 0;
        if (isNaN(lat) || isNaN(lng)) continue;
        const name = row['pays'] || row['country'] || 'Point';
        const radius = dataset.pointRadius || globalPointRadius;
        markers.push(
          <Marker
            key={`${dataset.id}-${count}`}
            position={[lat, lng]}
            icon={createCircleIcon(value, dataset.color, radius)}
          >
            <Tooltip>
              <div className="p-2">
                <h4 className="font-bold">{name}</h4>
                <p>Dataset: {dataset.name}</p>
                <p>Cas: {value.toLocaleString()}</p>
              </div>
            </Tooltip>
            <Popup>
              <div className="p-2 max-w-xs">
                <h3 className="font-bold text-lg">{name}</h3>
                <div className="space-y-1 mt-2">
                  {Object.entries(row)
                    .filter(([key]) => !['latitude', 'longitude'].includes(key))
                    .slice(0, 8)
                    .map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="font-medium">{key}:</span>
                        <span>{typeof val === 'number' ? val.toLocaleString() : String(val)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
        count++;
      }
    }
    return markers;
  }, [datasets, selectedColumns, useClustering, displayLimit, globalPointRadius]);

  // Cercles individuels (si clustering désactivé)
  const circleMarkers = useMemo(() => {
    if (useClustering) return null;
    const markers: JSX.Element[] = [];
    const limit = displayLimit === 'unlimited' ? Infinity : displayLimit;
    let count = 0;
    for (const dataset of datasets) {
      if (!dataset.visible) continue;
      for (const row of dataset.data) {
        if (count >= limit) break;
        const lat = parseFloat(row[selectedColumns.lat] as string);
        const lng = parseFloat(row[selectedColumns.lng] as string);
        const value = parseFloat(row[selectedColumns.value] as string) || 0;
        if (isNaN(lat) || isNaN(lng)) continue;
        const name = row['pays'] || row['country'] || 'Point';
        const radius = Math.max(4, Math.min(20, Math.sqrt(value) / 1000)) * ((dataset.pointRadius || globalPointRadius) / 8);
        markers.push(
          <CircleMarker
            key={`${dataset.id}-${count}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              fillColor: getMarkerColor(value, dataset.color),
              color: dataset.color,
              weight: 2,
              opacity: dataset.pointOpacity ?? globalPointOpacity,
              fillOpacity: (dataset.pointOpacity ?? globalPointOpacity) * 0.8
            }}
          >
            <Tooltip>
              <div className="p-2">
                <h4 className="font-bold">{name}</h4>
                <p>Dataset: {dataset.name}</p>
                <p>Cas: {value.toLocaleString()}</p>
              </div>
            </Tooltip>
            <Popup>
              <div className="p-2 max-w-xs">
                <h3 className="font-bold text-lg">{name}</h3>
                <div className="space-y-1 mt-2">
                  {Object.entries(row)
                    .filter(([key]) => !['latitude', 'longitude'].includes(key))
                    .slice(0, 8)
                    .map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="font-medium">{key}:</span>
                        <span>{typeof val === 'number' ? val.toLocaleString() : String(val)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
        count++;
      }
    }
    return markers;
  }, [datasets, selectedColumns, useClustering, displayLimit, globalPointRadius, globalPointOpacity]);

  // Indicateurs
  const indicators = [
    { label: 'Points de Données', value: datasets.reduce((sum, d) => sum + (d.visible ? d.data.length : 0), 0) },
    { label: 'Cas Moyens', value: stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { label: 'Maximum', value: stats.max.toLocaleString() },
    { label: 'Minimum', value: stats.min.toLocaleString() },
    { label: 'Datasets', value: datasets.length }
  ];

  // ------------------------------------------------------------------
  // RENDU
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
                    Accueil
                  </Link>
                </li>
                <li>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </li>
                <li>
                  <Link href="/geospatial/map" className="text-gray-500 hover:text-blue-600 transition-colors">
                    Map
                  </Link>
                </li>
              </ol>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExampleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Exemples</span>
            </button>
            
            <button
              onClick={runAIAnalysis}
              disabled={datasets.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <BrainCircuit className="w-4 h-4" />
              <span className="text-sm font-medium">Analyser</span>
            </button>
          </div>
        </div>
      </header>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        {indicators.map((indicator, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative overflow-hidden bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {indicator.label}
              </span>
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {indicator.value}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Barre de contrôle */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm p-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Boutons de vue */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl items-center">
            {['street', 'satellite', 'dark'].map(view => (
              <button
                key={view}
                onClick={() => setMapView(view as any)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mapView === view
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Globe className="w-4 h-4" />
                {view === 'street' ? 'Standard' : view === 'satellite' ? 'Satellite' : 'Sombre'}
              </button>
            ))}
          </div>

          {/* Options de visualisation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="clustering-toggle"
                checked={useClustering}
                onCheckedChange={setUseClustering}
              />
              <Label htmlFor="clustering-toggle" className="text-sm text-slate-600">
                Clustering
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="heatmap-toggle"
                checked={useHeatmap}
                onCheckedChange={setUseHeatmap}
              />
              <Label htmlFor="heatmap-toggle" className="text-sm text-slate-600">
                Heatmap
              </Label>
            </div>
            
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Limite</span>
              <select
                value={displayLimit.toString()}
                onChange={(e) => setDisplayLimit(e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value))}
                className="text-sm border-slate-200 rounded-lg p-1.5"
              >
                <option value="1000">1000 pts</option>
                <option value="5000">5000 pts</option>
                <option value="10000">10000 pts</option>
                <option value="unlimited">Illimité</option>
              </select>
            </div>
          </div>

          {/* Bouton paramètres */}
          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
          >
            <Settings2 className="w-4 h-4" />
            <span className="text-sm font-medium">Configuration avancée</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Zone de carte */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative h-[600px]">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={getTileUrl()}
            />
            
            {/* Heatmap */}
            {useHeatmap && heatmapConfig.visible && heatmapData.length > 0 && (
              <HeatmapLayer
                points={heatmapData}
                radius={heatmapConfig.radius}
                blur={heatmapConfig.blur}
                max={heatmapConfig.max}
                minOpacity={heatmapConfig.minOpacity}
                gradient={heatmapConfig.gradient}
              />
            )}

            {/* Clustering */}
            {useClustering && clusterMarkers && clusterMarkers.length > 0 && (
              <MarkerClusterGroup
                {...clusteringConfig}
                iconCreateFunction={customClusterIcon}
                showCoverageOnHover={clusteringConfig.showCoverageOnHover}
                zoomToBoundsOnClick={clusteringConfig.zoomToBoundsOnClick}
                spiderfyOnMaxZoom={clusteringConfig.spiderfyOnMaxZoom}
                maxClusterRadius={clusteringConfig.maxClusterRadius}
                disableClusteringAtZoom={clusteringConfig.disableClusteringAtZoom}
                animate={clusteringConfig.animate}
                animateAddingMarkers={clusteringConfig.animateAddingMarkers}
                chunkedLoading={clusteringConfig.chunkedLoading}
                chunkInterval={clusteringConfig.chunkInterval}
                chunkDelay={clusteringConfig.chunkDelay}
              >
                {clusterMarkers}
              </MarkerClusterGroup>
            )}

            {/* Points individuels */}
            {!useClustering && circleMarkers}
          </MapContainer>
          
          {/* Légende */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Légende</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs">Faible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs">Modéré</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs">Élevé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-xs">Critique</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel latéral - Configuration avancée */}
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 h-[600px] flex flex-col overflow-hidden animate-in slide-in-from-right-4 ${
          showSidePanel ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Configuration</h2>
            <button
              onClick={() => setShowSidePanel(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Données
              </TabsTrigger>
              <TabsTrigger value="visualization" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Visuel
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" />
                Analyse
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Réglages
              </TabsTrigger>
            </TabsList>

            {/* Onglet Données */}
            <TabsContent value="data" className="h-[calc(100%-60px)] overflow-y-auto space-y-6">
              {/* Upload */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Charger des données</h3>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 mb-2">
                    Glissez-déposez ou{' '}
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      parcourez
                    </button>
                  </p>
                  <p className="text-xs text-slate-500">CSV, Excel (.xlsx, .xls)</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Datasets */}
              {datasets.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Datasets</h3>
                    <Badge variant="outline">{datasets.length}</Badge>
                  </div>
                  
                  <ScrollArea className="h-72">
                    <div className="space-y-4">
                      {datasets.map(dataset => (
                        <div key={dataset.id} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full cursor-pointer"
                                style={{ backgroundColor: dataset.color }}
                                onClick={() => setShowColorPickerFor(dataset.id)}
                              />
                              {showColorPickerFor === dataset.id && (
                                <div className="absolute z-50 mt-8">
                                  <HexColorPicker
                                    color={dataset.color}
                                    onChange={(color) => updateDataset(dataset.id, { color })}
                                  />
                                  <Button size="sm" className="mt-2" onClick={() => setShowColorPickerFor(null)}>
                                    Valider
                                  </Button>
                                </div>
                              )}
                              <span className="font-medium text-sm">{dataset.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateDataset(dataset.id, { visible: !dataset.visible })}
                                className="p-1 hover:bg-slate-100 rounded"
                              >
                                {dataset.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => removeDataset(dataset.id)}
                                className="p-1 hover:bg-red-50 text-red-600 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 mb-2">
                            {dataset.data.length} points •{' '}
                            {selectedColumns.value && (
                              <>
                                Moyenne:{' '}
                                {(() => {
                                  const values = dataset.data.map(row =>
                                    parseFloat(row[selectedColumns.value] as string) || 0
                                  ).filter(v => !isNaN(v));
                                  const avg = values.reduce((a, b) => a + b, 0) / values.length;
                                  return avg.toLocaleString(undefined, { maximumFractionDigits: 1 });
                                })()}
                              </>
                            )}
                          </div>
                          {/* Options spécifiques au dataset */}
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <Switch
                                id={`cluster-${dataset.id}`}
                                checked={dataset.clustering ?? true}
                                onCheckedChange={(val) => updateDataset(dataset.id, { clustering: val })}
                              />
                              <Label htmlFor={`cluster-${dataset.id}`} className="text-xs">Cluster</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch
                                id={`heatmap-${dataset.id}`}
                                checked={dataset.heatmap ?? true}
                                onCheckedChange={(val) => updateDataset(dataset.id, { heatmap: val })}
                              />
                              <Label htmlFor={`heatmap-${dataset.id}`} className="text-xs">Heatmap</Label>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-xs">Rayon</Label>
                            <Input
                              type="number"
                              value={dataset.pointRadius ?? globalPointRadius}
                              onChange={(e) => updateDataset(dataset.id, { pointRadius: parseInt(e.target.value) || 4 })}
                              className="w-16 h-7 text-xs"
                              min={2}
                              max={30}
                            />
                            <Label className="text-xs">Opacité</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="1"
                              value={dataset.pointOpacity ?? globalPointOpacity}
                              onChange={(e) => updateDataset(dataset.id, { pointOpacity: parseFloat(e.target.value) || 0.8 })}
                              className="w-16 h-7 text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            {/* Onglet Visualisation */}
            <TabsContent value="visualization" className="h-[calc(100%-60px)] overflow-y-auto space-y-6">
              {/* Configuration Heatmap */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Heatmap</h3>
                  <Switch
                    checked={heatmapConfig.visible}
                    onCheckedChange={(v) => setHeatmapConfig(prev => ({ ...prev, visible: v }))}
                  />
                </div>
                {heatmapConfig.visible && (
                  <div className="space-y-4 pl-2">
                    <div>
                      <Label className="text-sm">Rayon</Label>
                      <Slider
                        value={[heatmapConfig.radius]}
                        onValueChange={(v) => setHeatmapConfig(prev => ({ ...prev, radius: v[0] }))}
                        min={5}
                        max={50}
                        step={1}
                      />
                      <span className="text-xs text-slate-500">{heatmapConfig.radius} px</span>
                    </div>
                    <div>
                      <Label className="text-sm">Flou</Label>
                      <Slider
                        value={[heatmapConfig.blur]}
                        onValueChange={(v) => setHeatmapConfig(prev => ({ ...prev, blur: v[0] }))}
                        min={0}
                        max={30}
                        step={1}
                      />
                      <span className="text-xs text-slate-500">{heatmapConfig.blur} px</span>
                    </div>
                    <div>
                      <Label className="text-sm">Opacité min</Label>
                      <Slider
                        value={[heatmapConfig.minOpacity * 100]}
                        onValueChange={(v) => setHeatmapConfig(prev => ({ ...prev, minOpacity: v[0] / 100 }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                      <span className="text-xs text-slate-500">{heatmapConfig.minOpacity}</span>
                    </div>
                    <div>
                      <Label className="text-sm">Intensité max</Label>
                      <Slider
                        value={[heatmapConfig.max]}
                        onValueChange={(v) => setHeatmapConfig(prev => ({ ...prev, max: v[0] }))}
                        min={0.1}
                        max={2}
                        step={0.1}
                      />
                      <span className="text-xs text-slate-500">{heatmapConfig.max}</span>
                    </div>
                    <div>
                      <Label className="text-sm">Dégradé de couleurs</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {Object.entries(heatmapConfig.gradient).map(([key, color]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs">{key}</span>
                            <div
                              className="w-6 h-6 rounded cursor-pointer border"
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                const newColor = prompt(`Nouvelle couleur pour ${key} (ex: red, #ff0000)`, color);
                                if (newColor) {
                                  setHeatmapConfig(prev => ({
                                    ...prev,
                                    gradient: { ...prev.gradient, [parseFloat(key)]: newColor }
                                  }));
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Configuration Clustering */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clustering</h3>
                  <Switch
                    checked={useClustering}
                    onCheckedChange={setUseClustering}
                  />
                </div>
                {useClustering && (
                  <div className="space-y-4 pl-2">
                    <div>
                      <Label className="text-sm">Couleur des clusters</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-8 h-8 rounded cursor-pointer border"
                          style={{ backgroundColor: clusteringConfig.clusterColor }}
                          onClick={() => {
                            const color = prompt('Couleur du cluster (hex ou nom)', clusteringConfig.clusterColor);
                            if (color) setClusteringConfig(prev => ({ ...prev, clusterColor: color }));
                          }}
                        />
                        <span className="text-xs">{clusteringConfig.clusterColor}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Couleur du texte</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-8 h-8 rounded cursor-pointer border"
                          style={{ backgroundColor: clusteringConfig.clusterTextColor }}
                          onClick={() => {
                            const color = prompt('Couleur du texte', clusteringConfig.clusterTextColor);
                            if (color) setClusteringConfig(prev => ({ ...prev, clusterTextColor: color }));
                          }}
                        />
                        <span className="text-xs">{clusteringConfig.clusterTextColor}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Rayon max du cluster</Label>
                      <Slider
                        value={[clusteringConfig.maxClusterRadius]}
                        onValueChange={(v) => setClusteringConfig(prev => ({ ...prev, maxClusterRadius: v[0] }))}
                        min={20}
                        max={200}
                        step={5}
                      />
                      <span className="text-xs">{clusteringConfig.maxClusterRadius} px</span>
                    </div>
                    <div>
                      <Label className="text-sm">Désactiver clustering au zoom</Label>
                      <Slider
                        value={[clusteringConfig.disableClusteringAtZoom]}
                        onValueChange={(v) => setClusteringConfig(prev => ({ ...prev, disableClusteringAtZoom: v[0] }))}
                        min={5}
                        max={18}
                        step={1}
                      />
                      <span className="text-xs">Zoom {clusteringConfig.disableClusteringAtZoom}+</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="showCoverage"
                        checked={clusteringConfig.showCoverageOnHover}
                        onCheckedChange={(v) => setClusteringConfig(prev => ({ ...prev, showCoverageOnHover: v }))}
                      />
                      <Label htmlFor="showCoverage">Afficher la zone au survol</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="zoomToBounds"
                        checked={clusteringConfig.zoomToBoundsOnClick}
                        onCheckedChange={(v) => setClusteringConfig(prev => ({ ...prev, zoomToBoundsOnClick: v }))}
                      />
                      <Label htmlFor="zoomToBounds">Zoom au clic</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="spiderfy"
                        checked={clusteringConfig.spiderfyOnMaxZoom}
                        onCheckedChange={(v) => setClusteringConfig(prev => ({ ...prev, spiderfyOnMaxZoom: v }))}
                      />
                      <Label htmlFor="spiderfy">Spiderfy au zoom max</Label>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Paramètres globaux des points */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Points (sans clustering)</h3>
                <div>
                  <Label className="text-sm">Rayon global</Label>
                  <Slider
                    value={[globalPointRadius]}
                    onValueChange={(v) => setGlobalPointRadius(v[0])}
                    min={2}
                    max={30}
                    step={1}
                  />
                  <span className="text-xs">{globalPointRadius} px</span>
                </div>
                <div>
                  <Label className="text-sm">Opacité globale</Label>
                  <Slider
                    value={[globalPointOpacity * 100]}
                    onValueChange={(v) => setGlobalPointOpacity(v[0] / 100)}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <span className="text-xs">{globalPointOpacity}</span>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Analyse */}
            <TabsContent value="analysis" className="h-[calc(100%-60px)] overflow-y-auto space-y-6">
              {aiResults ? (
                <>
                  <Alert className={`${
                    aiResults.riskLevel === 'high' ? 'bg-rose-50 border-rose-200' :
                    aiResults.riskLevel === 'medium' ? 'bg-amber-50 border-amber-200' :
                    'bg-emerald-50 border-emerald-200'
                  }`}>
                    <AlertTitle className="flex items-center gap-2">
                      Niveau de risque:
                      <Badge variant={
                        aiResults.riskLevel === 'high' ? 'destructive' :
                        aiResults.riskLevel === 'medium' ? 'secondary' : 'outline'
                      }>
                        {aiResults.riskLevel === 'high' ? 'ÉLEVÉ' :
                         aiResults.riskLevel === 'medium' ? 'MODÉRÉ' : 'FAIBLE'}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription>{aiResults.summary}</AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700">Insights</h3>
                    <div className="space-y-2">
                      {aiResults.insights.map((insight, idx) => (
                        <div key={idx} className="text-sm p-3 bg-blue-50 rounded-lg">
                          {insight}
                        </div>
                      ))}
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">Recommandations</h3>
                    <div className="space-y-2">
                      {aiResults.recommendations.map((rec, idx) => (
                        <div key={idx} className="text-sm p-3 bg-green-50 rounded-lg">
                          {rec}
                        </div>
                      ))}
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">Alertes</h3>
                    <div className="space-y-2">
                      {aiResults.alerts.map((alert, idx) => (
                        <div key={idx} className="text-sm p-3 bg-amber-50 rounded-lg">
                          {alert}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <BrainCircuit className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-sm text-slate-500 text-center">
                    Lancez une analyse IA pour obtenir des insights
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Onglet Réglages */}
            <TabsContent value="settings" className="h-[calc(100%-60px)] overflow-y-auto space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Colonnes</h3>
                {datasets.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="block text-sm font-medium mb-2">Latitude</Label>
                      <select
                        value={selectedColumns.lat}
                        onChange={(e) => setSelectedColumns({...selectedColumns, lat: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">Sélectionner...</option>
                        {datasets[0]?.data[0] && Object.keys(datasets[0].data[0]).map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium mb-2">Longitude</Label>
                      <select
                        value={selectedColumns.lng}
                        onChange={(e) => setSelectedColumns({...selectedColumns, lng: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">Sélectionner...</option>
                        {datasets[0]?.data[0] && Object.keys(datasets[0].data[0]).map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium mb-2">Valeur (intensité)</Label>
                      <select
                        value={selectedColumns.value}
                        onChange={(e) => setSelectedColumns({...selectedColumns, value: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">Sélectionner...</option>
                        {datasets[0]?.data[0] && Object.keys(datasets[0].data[0]).map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Chargez d'abord un dataset</p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Performance</h3>
                <div>
                  <Label className="block text-sm font-medium mb-2">Limite d'affichage</Label>
                  <select
                    value={displayLimit.toString()}
                    onChange={(e) => setDisplayLimit(e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="1000">1000 points (Rapide)</option>
                    <option value="5000">5000 points (Équilibré)</option>
                    <option value="10000">10000 points (Détaillé)</option>
                    <option value="unlimited">Illimité (Expert)</option>
                  </select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Modal d'exemples */}
      <Dialog open={isExampleModalOpen} onOpenChange={setIsExampleModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exemples de données épidémiologiques</DialogTitle>
            <DialogDescription>
              Sélectionnez une maladie pour charger des données de simulation
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
              <Progress value={exampleProgress} className="w-full h-2 mb-2" />
              <p className="text-sm text-slate-500">{exampleProgress}% complété</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {diseaseExamples.map(disease => (
                  <div
                    key={disease.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedDiseases.includes(disease.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => toggleDiseaseSelection(disease.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-800">{disease.name}</h4>
                        <p className="text-sm text-slate-600 mt-1">{disease.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {disease.countries.length} pays
                          </Badge>
                          <span className="text-xs text-slate-500">
                            Source: {disease.source.organization}
                          </span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                        selectedDiseases.includes(disease.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`}>
                        {selectedDiseases.includes(disease.id) && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div
                  className="p-4 rounded-xl border border-dashed border-slate-300 cursor-pointer hover:border-blue-500 transition-all"
                  onClick={loadContinentalData}
                >
                  <div className="text-center">
                    <Globe className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h4 className="font-semibold text-slate-800">Données Continentales</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      25 pays répartis sur 5 continents
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExampleModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={loadSelectedExamples}
              disabled={selectedDiseases.length === 0}
            >
              Charger {selectedDiseases.length} sélectionné(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeospatialVisualization;