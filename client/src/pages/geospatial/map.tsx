import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Settings,
  Brain,
  BarChart3,
  Upload,
  X,
  ChevronRight,
  Home,
  Download,
  Filter,
  Layers,
  Play,
  Pause,
  RefreshCw,
  Maximize2,
  Minimize2,
  Move,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Globe,
  Satellite,
  StreetMap,
  ZoomIn,
  ZoomOut,
  Compass,
  Grid3x3,
  Map,
  Activity,
  TrendingUp,
  Shield,
  Target,
  Users,
  Calendar,
  Clock,
  Database,
  Cloud,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Tablet,
  Moon,
  Sun,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  MousePointer,
  MousePointerClick,
  Hand,
  HelpCircle,
  Info,
  Zap,
  Cpu,
  Sparkles,
  Target as TargetIcon,
  Thermometer,
  Wind,
  Droplets,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  SunDim,
  ThermometerSun,
  Circle,
  Square,
  Triangle,
  Star,
  Hexagon,
  Octagon,
  Pentagon,
  CircleDot
} from 'lucide-react';
import { Link } from 'wouter';

// Types
type MapView = 'street' | 'satellite' | 'hybrid';
type TabType = 'basic' | 'ai' | 'advanced';
type SidebarPosition = 'top' | 'bottom' | 'right' | 'left';
type DeviceType = 'desktop' | 'tablet' | 'mobile';
type MapMode = 'normal' | 'pip' | 'fullscreen';

interface DataPoint {
  [key: string]: string | number;
  id: string;
  lat: number;
  lng: number;
  value: number;
  name: string;
  date?: string;
  category?: string;
}

interface AIIntelligence {
  outbreakDetection: boolean;
  trendAnalysis: boolean;
  riskAssessment: boolean;
  clustering: boolean;
  predictions: boolean;
}

interface MapState {
  zoom: number;
  center: [number, number];
  view: MapView;
  mode: MapMode;
  isLoading: boolean;
  bounds?: [number, number, number, number];
}

interface Statistics {
  totalPoints: number;
  avgValue: number;
  maxValue: number;
  minValue: number;
  stdDev: number;
  totalValue: number;
  clusters: number;
  hotspots: number;
}

// URL SVG encodée pour le pattern de grille (avec guillemets correctement échappés)
const gridPatternURL = `data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23e5e7eb' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E`;

// Composant principal
export default function GeospatialVisualization() {
  // États principaux
  const [mapState, setMapState] = useState<MapState>({
    zoom: 6,
    center: [46.2276, 2.2137] as [number, number],
    view: 'street',
    mode: 'normal',
    isLoading: false
  });

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [data, setData] = useState<DataPoint[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalPoints: 0,
    avgValue: 0,
    maxValue: 0,
    minValue: 0,
    stdDev: 0,
    totalValue: 0,
    clusters: 0,
    hotspots: 0
  });

  const [aiIntelligence, setAIIntelligence] = useState<AIIntelligence>({
    outbreakDetection: true,
    trendAnalysis: true,
    riskAssessment: true,
    clustering: true,
    predictions: true
  });

  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>('right');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [isDragging, setIsDragging] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [mapLayers, setMapLayers] = useState<string[]>(['base', 'markers']);
  const [selectedColumns, setSelectedColumns] = useState({
    lat: 'latitude',
    lng: 'longitude',
    value: 'value',
    name: 'name',
    date: 'date'
  });

  // Références
  const mapRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef({ x: 0, y: 0 });

  // Effets
  useEffect(() => {
    // Détection du type d'appareil
    const updateDeviceType = () => {
      const width = window.innerWidth;
      if (width < 640) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);

    // Surveiller la connexion
    const updateConnectionStatus = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    // Simulation du niveau de batterie
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level * 100);
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level * 100);
        });
      });
    }

    // Charger des données d'exemple au démarrage
    loadSampleData();

    return () => {
      window.removeEventListener('resize', updateDeviceType);
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
    };
  }, []);

  useEffect(() => {
    // Ajuster la sidebar sur mobile
    if (deviceType === 'mobile') {
      setSidebarVisible(false);
      setSidebarPosition('bottom');
    } else {
      setSidebarVisible(true);
      setSidebarPosition('right');
    }
  }, [deviceType]);

  // Fonctions de données
  const loadSampleData = () => {
    const sampleData: DataPoint[] = [
      { id: '1', lat: 48.8566, lng: 2.3522, value: 150, name: 'Paris', category: 'urbain', date: '2024-01-15' },
      { id: '2', lat: 45.7640, lng: 4.8357, value: 89, name: 'Lyon', category: 'urbain', date: '2024-01-15' },
      { id: '3', lat: 43.2965, lng: 5.3698, value: 120, name: 'Marseille', category: 'urbain', date: '2024-01-15' },
      { id: '4', lat: 43.6047, lng: 1.4442, value: 67, name: 'Toulouse', category: 'urbain', date: '2024-01-15' },
      { id: '5', lat: 43.7102, lng: 7.2620, value: 45, name: 'Nice', category: 'côtier', date: '2024-01-15' },
      { id: '6', lat: 47.2184, lng: -1.5536, value: 78, name: 'Nantes', category: 'urbain', date: '2024-01-15' },
      { id: '7', lat: 48.5734, lng: 7.7521, value: 56, name: 'Strasbourg', category: 'urbain', date: '2024-01-15' },
      { id: '8', lat: 43.6110, lng: 3.8767, value: 92, name: 'Montpellier', category: 'urbain', date: '2024-01-15' },
      { id: '9', lat: 44.8378, lng: -0.5792, value: 73, name: 'Bordeaux', category: 'urbain', date: '2024-01-15' },
      { id: '10', lat: 50.6292, lng: 3.0573, value: 84, name: 'Lille', category: 'urbain', date: '2024-01-15' }
    ];

    setData(sampleData);
    calculateStatistics(sampleData);
  };

  const calculateStatistics = (dataPoints: DataPoint[]) => {
    const values = dataPoints.map(d => d.value);
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Simuler la détection de clusters et hotspots
    const clusters = Math.floor(values.length / 3);
    const hotspots = values.filter(v => v > avg + stdDev).length;

    setStatistics({
      totalPoints: values.length,
      avgValue: avg,
      maxValue: max,
      minValue: min,
      stdDev,
      totalValue: total,
      clusters,
      hotspots
    });
  };

  // Gestion de la carte
  const toggleMapView = () => {
    setMapState(prev => ({
      ...prev,
      view: prev.view === 'street' ? 'satellite' : 'street'
    }));
  };

  const resetMapView = () => {
    setMapState({
      zoom: 6,
      center: [46.2276, 2.2137],
      view: 'street',
      mode: 'normal',
      isLoading: false
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const zoomIn = () => {
    setMapState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 18) }));
  };

  const zoomOut = () => {
    setMapState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 1) }));
  };

  // Gestion des fichiers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simuler le traitement de fichier
    setMapState(prev => ({ ...prev, isLoading: true }));

    setTimeout(() => {
      // Ici, vous ajouteriez la logique de parsing CSV/Excel
      console.log('Fichier chargé:', file.name);
      setMapState(prev => ({ ...prev, isLoading: false }));
      
      // Mettre à jour les données
      loadSampleData();
    }, 1500);
  };

  // Intelligence Artificielle
  const runAIAnalysis = () => {
    setMapState(prev => ({ ...prev, isLoading: true }));

    // Simuler l'analyse IA
    setTimeout(() => {
      const aiInsights = [
        "📊 **Analyse terminée avec succès**",
        `🔍 ${statistics.hotspots} zones à risque détectées`,
        `📈 Tendance: ${statistics.avgValue > 100 ? 'Élevée' : 'Modérée'}`,
        `⚠️ Recommandation: Surveiller les clusters identifiés`,
        `🎯 Précision: ${Math.random() > 0.5 ? 'Haute' : 'Moyenne'}`
      ];

      alert(aiInsights.join('\n'));
      setMapState(prev => ({ ...prev, isLoading: false }));
    }, 2000);
  };

  // Gestion responsive
  const getResponsiveClass = (base: string, mobile?: string, tablet?: string) => {
    if (deviceType === 'mobile' && mobile) return mobile;
    if (deviceType === 'tablet' && tablet) return tablet;
    return base;
  };

  // Gestion drag & drop pour la sidebar
  const handleSidebarDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPosition.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  };

  const handleSidebarDragEnd = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sidebarRef.current) return;

      const deltaX = e.clientX - dragStartPosition.current.x;
      const deltaY = e.clientY - dragStartPosition.current.y;

      // Déterminer la nouvelle position basée sur le mouvement
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 50) setSidebarPosition('right');
        else if (deltaX < -50) setSidebarPosition('left');
      } else {
        if (deltaY > 50) setSidebarPosition('bottom');
        else if (deltaY < -50) setSidebarPosition('top');
      }

      dragStartPosition.current = { x: e.clientX, y: e.clientY };
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleSidebarDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleSidebarDragEnd);
    };
  }, [isDragging]);

  // Rendu
  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Barre de statut supérieure */}
      <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-sm 
        ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'} shadow-sm`}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span className="font-medium">Visualisation Géospatiale</span>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${connectionStatus === 'online' ? 'text-green-500' : 'text-red-500'}`}>
              {connectionStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="text-xs">{connectionStatus === 'online' ? 'En ligne' : 'Hors ligne'}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs">
              <BatteryIcon level={batteryLevel} />
              <span>{batteryLevel}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <DeviceIndicator type={deviceType} />
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* En-tête */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Cartographie Épidémiologique
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                  Visualisez et analysez les données géospatiales de santé
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                  {isFullscreen ? 'Réduire' : 'Plein écran'}
                </button>
                <button
                  onClick={resetMapView}
                  className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Compass className="w-4 h-4 mr-2" />
                  Recentrer
                </button>
              </div>
            </div>
          </div>

          {/* Grille principale */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Carte (2/3 de largeur) */}
            <div 
              ref={mapContainerRef}
              className={`lg:col-span-2 ${getResponsiveClass('h-[500px]', 'h-[400px]', 'h-[450px]')} 
                rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 relative`}
            >
              {/* Carte simulée */}
              <div 
                ref={mapRef}
                className="w-full h-full bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 relative"
              >
                {/* Overlay de carte */}
                <div className={`absolute inset-0 opacity-20 ${showGrid ? '' : 'hidden'}`} 
                     style={{backgroundImage: `url('${gridPatternURL}')`}}></div>
                
                {/* Marqueurs simulés */}
                {showMarkers && data.map(point => (
                  <MarkerPoint
                    key={point.id}
                    point={point}
                    mapView={mapState.view}
                    showLabels={showLabels}
                  />
                ))}

                {/* Légende */}
                {showLegend && (
                  <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Légende</span>
                      <div className="flex space-x-1">
                        <Circle className="w-4 h-4 text-red-500" />
                        <Square className="w-4 h-4 text-blue-500" />
                        <Triangle className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-gray-600 dark:text-gray-400">Élevé ({statistics.maxValue})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-gray-600 dark:text-gray-400">Moyen ({statistics.avgValue.toFixed(0)})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-gray-600 dark:text-gray-400">Faible ({statistics.minValue})</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contrôles de la carte */}
                <div className="absolute top-4 right-4 flex flex-col space-y-2">
                  <button
                    onClick={zoomIn}
                    className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow hover:shadow-lg transition-shadow"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={zoomOut}
                    className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow hover:shadow-lg transition-shadow"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={toggleMapView}
                    className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow hover:shadow-lg transition-shadow"
                    aria-label="Changer de vue"
                  >
                    {mapState.view === 'street' ? 
                      <Satellite className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : 
                      <StreetMap className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    }
                  </button>
                </div>

                {/* Indicateurs */}
                <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                  <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Zoom: {mapState.zoom}x
                  </div>
                  <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {data.length} points
                  </div>
                </div>

                {/* Overlay de chargement */}
                {mapState.isLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                      <p className="mt-2 text-gray-700 dark:text-gray-300">Analyse en cours...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Barre latérale */}
            <div className="space-y-6">
              {/* Statistiques en temps réel */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  Statistiques en temps réel
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Target}
                    label="Points totaux"
                    value={statistics.totalPoints}
                    color="blue"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Valeur moyenne"
                    value={statistics.avgValue.toFixed(1)}
                    color="green"
                  />
                  <StatCard
                    icon={Shield}
                    label="Zones à risque"
                    value={statistics.hotspots}
                    color="red"
                  />
                  <StatCard
                    icon={Users}
                    label="Clusters"
                    value={statistics.clusters}
                    color="purple"
                  />
                </div>
              </div>

              {/* Tabs de contrôle */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {/* En-tête des tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <TabButton
                    active={activeTab === 'basic'}
                    onClick={() => setActiveTab('basic')}
                    icon={Settings}
                    label="Configuration"
                  />
                  <TabButton
                    active={activeTab === 'ai'}
                    onClick={() => setActiveTab('ai')}
                    icon={Brain}
                    label="IA"
                  />
                  <TabButton
                    active={activeTab === 'advanced'}
                    onClick={() => setActiveTab('advanced')}
                    icon={BarChart3}
                    label="Avancé"
                  />
                </div>

                {/* Contenu des tabs */}
                <div className="p-4">
                  {activeTab === 'basic' && (
                    <div className="space-y-4 animate-fadeIn">
                      <h4 className="font-medium text-gray-900 dark:text-white">Configuration de base</h4>
                      
                      {/* Upload rapide */}
                      <div className="space-y-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 transition-colors flex flex-col items-center justify-center"
                        >
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Glissez-déposez ou cliquez pour importer</span>
                          <span className="text-xs text-gray-500 mt-1">CSV, Excel, GeoJSON supportés</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".csv,.xlsx,.json,.geojson"
                          onChange={handleFileUpload}
                        />
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={loadSampleData}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            Données d'exemple
                          </button>
                          <button
                            onClick={() => setData([])}
                            className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                          >
                            Effacer
                          </button>
                        </div>
                      </div>

                      {/* Options rapides */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Marqueurs</span>
                          <ToggleSwitch
                            checked={showMarkers}
                            onChange={setShowMarkers}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Légende</span>
                          <ToggleSwitch
                            checked={showLegend}
                            onChange={setShowLegend}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Étiquettes</span>
                          <ToggleSwitch
                            checked={showLabels}
                            onChange={setShowLabels}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="space-y-4 animate-fadeIn">
                      <h4 className="font-medium text-gray-900 dark:text-white">Intelligence Artificielle</h4>
                      
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded-lg">
                          <div className="flex items-center">
                            <Sparkles className="w-5 h-5 mr-2" />
                            <span className="font-medium">Analyse prédictive activée</span>
                          </div>
                          <p className="text-sm opacity-90 mt-1">
                            L'IA détecte automatiquement les patterns et anomalies
                          </p>
                        </div>

                        {/* Options IA */}
                        <div className="space-y-2">
                          {Object.entries(aiIntelligence).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </span>
                              <ToggleSwitch
                                checked={value}
                                onChange={(checked) => setAIIntelligence(prev => ({ ...prev, [key]: checked }))}
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={runAIAnalysis}
                          disabled={mapState.isLoading}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2.5 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50"
                        >
                          {mapState.isLoading ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Analyse en cours...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Zap className="w-4 h-4 mr-2" />
                              Lancer l'analyse IA
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'advanced' && (
                    <div className="space-y-4 animate-fadeIn">
                      <h4 className="font-medium text-gray-900 dark:text-white">Options avancées</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Carte de chaleur</span>
                          <ToggleSwitch
                            checked={showHeatmap}
                            onChange={setShowHeatmap}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Grille</span>
                          <ToggleSwitch
                            checked={showGrid}
                            onChange={setShowGrid}
                          />
                        </div>
                        
                        <div className="pt-2">
                          <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
                            Type de visualisation
                          </label>
                          <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">
                            <option>Cercles proportionnels</option>
                            <option>Carte de chaleur</option>
                            <option>Clusters</option>
                            <option>Animation temporelle</option>
                          </select>
                        </div>
                        
                        <button className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm">
                          <div className="flex items-center justify-center">
                            <Download className="w-4 h-4 mr-2" />
                            Exporter les données
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Conseils rapides */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Astuces rapides
                </h4>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex items-start">
                    <MousePointerClick className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Cliquez sur les marqueurs pour les détails</span>
                  </li>
                  <li className="flex items-start">
                    <Move className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Glissez la carte pour naviguer</span>
                  </li>
                  <li className="flex items-start">
                    <ZoomIn className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Zoom avec la molette ou les boutons + -</span>
                  </li>
                  {deviceType === 'mobile' && (
                    <li className="flex items-start">
                      <Hand className="w-3 h-3 mt-0.5 mr-2 flex-shrink-0" />
                      <span>Utilisez deux doigts pour zoomer sur mobile</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Tableau de données (mobile seulement) */}
          {deviceType === 'mobile' && data.length > 0 && (
            <div className="mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Données ({data.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">Ville</th>
                        <th className="px-4 py-2 text-left">Valeur</th>
                        <th className="px-4 py-2 text-left">Catégorie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 5).map(point => (
                        <tr key={point.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-2">{point.name}</td>
                          <td className="px-4 py-2">{point.value}</td>
                          <td className="px-4 py-2">{point.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Barre de navigation inférieure (mobile) */}
          {deviceType === 'mobile' && (
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
              <div className="flex items-center justify-around py-3">
                <button
                  onClick={() => setSidebarVisible(!sidebarVisible)}
                  className="flex flex-col items-center"
                >
                  <Menu className="w-5 h-5" />
                  <span className="text-xs mt-1">Menu</span>
                </button>
                <button
                  onClick={toggleMapView}
                  className="flex flex-col items-center"
                >
                  {mapState.view === 'street' ? 
                    <Satellite className="w-5 h-5" /> : 
                    <Map className="w-5 h-5" />
                  }
                  <span className="text-xs mt-1">Vue</span>
                </button>
                <button
                  onClick={runAIAnalysis}
                  className="flex flex-col items-center"
                >
                  <Brain className="w-5 h-5" />
                  <span className="text-xs mt-1">Analyse IA</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex flex-col items-center"
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  <span className="text-xs mt-1">{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar flottante pour mobile */}
      {deviceType === 'mobile' && sidebarVisible && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSidebarVisible(false)}>
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl transform transition-transform duration-300 ${
              sidebarVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Navigation</h3>
                <button
                  onClick={() => setSidebarVisible(false)}
                  className="p-1"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button className="w-full p-3 bg-blue-600 text-white rounded-lg">
                  Nouvelle analyse
                </button>
                <button className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  Mes projets
                </button>
                <button className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  Paramètres
                </button>
                <button className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  Aide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de performance (mobile) */}
      {deviceType === 'mobile' && (
        <div className="fixed top-16 right-4 z-30">
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            {data.length} pts
          </div>
        </div>
      )}
    </div>
  );
}

// Composants auxiliaires
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center mb-1">
        <div className={`p-1.5 rounded-md ${colors[color]}`}>
          <Icon className="w-3 h-3" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 flex items-center justify-center space-x-2 transition-colors ${
        active 
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

interface MarkerPointProps {
  point: DataPoint;
  mapView: MapView;
  showLabels: boolean;
}

function MarkerPoint({ point, mapView, showLabels }: MarkerPointProps) {
  const size = Math.max(10, Math.min(30, point.value / 5));
  const color = point.value > 100 ? '#ef4444' : point.value > 50 ? '#f59e0b' : '#10b981';
  
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
      style={{
        left: `${((point.lng + 180) / 360) * 100}%`,
        top: `${((90 - point.lat) / 180) * 100}%`
      }}
    >
      <div
        className={`rounded-full shadow-lg transition-all duration-300 group-hover:scale-125 ${
          mapView === 'satellite' ? 'ring-2 ring-white' : ''
        }`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          opacity: 0.8
        }}
      />
      {showLabels && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded text-xs font-medium whitespace-nowrap shadow-sm">
          {point.name}
        </div>
      )}
    </div>
  );
}

interface DeviceIndicatorProps {
  type: DeviceType;
}

function DeviceIndicator({ type }: DeviceIndicatorProps) {
  const icons = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone
  };
  
  const Icon = icons[type];
  
  return (
    <div className="flex items-center space-x-1 text-xs">
      <Icon className="w-3 h-3" />
      <span className="capitalize">{type}</span>
    </div>
  );
}

interface BatteryIconProps {
  level: number;
}

function BatteryIcon({ level }: BatteryIconProps) {
  const color = level > 50 ? 'text-green-500' : level > 20 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="relative w-4 h-2 border border-gray-400 rounded">
      <div 
        className={`absolute top-0 left-0 bottom-0 rounded-sm ${color}`}
        style={{ width: `${level}%` }}
      />
    </div>
  );
}

// Styles globaux
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
  }
  
  /* Scrollbar personnalisée */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.7);
  }
  
  .dark ::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.5);
  }
  
  .dark ::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.7);
  }
  
  /* Styles pour mobile */
  @media (max-width: 640px) {
    .mobile-touch {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    
    .mobile-scroll {
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
  }
  
  /* Améliorations pour le mode sombre */
  .dark .shadow-sm {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  }
  
  .dark .shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  }
  
  /* Transitions fluides */
  .transition-transform {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }
  
  /* Effet de pulse pour les marqueurs */
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }
  
  .pulse {
    animation: pulse 2s infinite;
  }
`;

// Injecter les styles
useEffect(() => {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  return () => {
    document.head.removeChild(styleSheet);
  };
}, []);