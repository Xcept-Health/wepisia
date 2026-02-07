import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents, LayersControl, LayerGroup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// Types et interfaces
interface DataRow {
  [key: string]: string | number;
}

interface GeoSidebarPosition {
  top?: number;
  bottom?: number;
  right?: number;
  left?: number;
}

interface AITypes {
  outbreak: boolean;
  prediction: boolean;
  spatial: boolean;
  risk: boolean;
  trends: boolean;
}

interface AIResults {
  summary: string;
  insights: string[];
  recommendations: string[];
  alerts: string[];
}

// Composant principal
const GeospatialVisualization: React.FC = () => {
  // États
  const [currentData, setCurrentData] = useState<DataRow[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'basic' | 'excel-ai' | 'advanced'>('basic');
  const [selectedColumns, setSelectedColumns] = useState({
    lat: '',
    lng: '',
    value: '',
    time: ''
  });
  const [filters, setFilters] = useState({
    min: -Infinity,
    max: Infinity
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [aiResults, setAiResults] = useState<AIResults | null>(null);
  const [aiTypes, setAiTypes] = useState<AITypes>({
    outbreak: true,
    prediction: true,
    spatial: true,
    risk: true,
    trends: true
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sidebarPosition, setSidebarPosition] = useState<'top' | 'bottom' | 'right'>('right');
  const [isPipMode, setIsPipMode] = useState<boolean>(false);
  const [mapView, setMapView] = useState<'street' | 'satellite'>('street');
  
  // Références
  const mapRef = useRef<L.Map>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pipContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup>(null);

  // Données d'exemple
  const sampleData: DataRow[] = [
    { ville: 'Paris', latitude: 48.8566, longitude: 2.3522, cas: 150, population: 2161000, taux_incidence: 6.9 },
    { ville: 'Lyon', latitude: 45.7640, longitude: 4.8357, cas: 89, population: 515695, taux_incidence: 17.3 },
    { ville: 'Marseille', latitude: 43.2965, longitude: 5.3698, cas: 120, population: 861635, taux_incidence: 13.9 },
    { ville: 'Toulouse', latitude: 43.6047, longitude: 1.4442, cas: 67, population: 471941, taux_incidence: 14.2 },
    { ville: 'Nice', latitude: 43.7102, longitude: 7.2620, cas: 45, population: 342522, taux_incidence: 13.1 }
  ];

  // Initialiser la carte
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, [isSidebarOpen, sidebarPosition]);

  // Gérer le thème
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  // Gestion des fichiers
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
            processData(results.data as DataRow[]);
          },
          error: (error) => {
            showNotification('Erreur de lecture CSV: ' + error.message, 'error');
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
          processData(jsonData);
        } catch (error) {
          showNotification('Erreur de lecture Excel: ' + error.message, 'error');
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showNotification('Format non supporté', 'error');
      setIsLoading(false);
    }
  };

  const processData = (data: DataRow[]) => {
    const filteredData = data.filter(row => 
      Object.values(row).some(val => 
        val !== null && val !== undefined && val !== '' && String(val).trim() !== ''
      )
    );
    
    setCurrentData(filteredData);
    
    // Auto-détection des colonnes
    const columns = Object.keys(filteredData[0] || {});
    const detectedCols = autoDetectColumns(columns);
    setSelectedColumns(detectedCols);
    
    setIsLoading(false);
    showNotification(`${filteredData.length} lignes chargées`, 'success');
  };

  const autoDetectColumns = (columns: string[]) => {
    const newCols = { ...selectedColumns };
    
    columns.forEach(col => {
      const lowerCol = col.toLowerCase();
      if (['lat', 'latitude', 'y'].some(p => lowerCol.includes(p))) {
        newCols.lat = col;
      } else if (['lng', 'lon', 'longitude', 'x'].some(p => lowerCol.includes(p))) {
        newCols.lng = col;
      } else if (['value', 'val', 'count', 'cas', 'incidence'].some(p => lowerCol.includes(p))) {
        newCols.value = col;
      } else if (['time', 'date', 'timestamp'].some(p => lowerCol.includes(p))) {
        newCols.time = col;
      }
    });
    
    return newCols;
  };

  // Analyse IA
  const runAIAnalysis = async () => {
    if (currentData.length === 0) {
      showNotification('Veuillez charger des données d\'abord', 'warning');
      return;
    }

    setIsLoading(true);
    
    // Simulation d'analyse IA
    setTimeout(() => {
      const results: AIResults = {
        summary: `Analyse IA effectuée sur ${currentData.length} points`,
        insights: [
          'Tendance croissante détectée dans le nord',
          'Cluster principal identifié autour de Paris',
          'Variabilité modérée entre les régions'
        ],
        recommendations: [
          'Renforcer la surveillance dans les clusters identifiés',
          'Mettre à jour les données quotidiennement',
          'Investigation des causes de variabilité'
        ],
        alerts: [
          'Risque élevé détecté dans 2 zones',
          'Augmentation prévue de 15% dans les 7 jours'
        ]
      };
      
      setAiResults(results);
      setIsLoading(false);
      showNotification('Analyse IA terminée', 'success');
    }, 2000);
  };

  // Export
  const exportMap = async () => {
    const mapElement = document.querySelector('.leaflet-container');
    if (!mapElement) return;

    try {
      const canvas = await html2canvas(mapElement as HTMLElement, {
        useCORS: true,
        backgroundColor: null
      });
      
      const link = document.createElement('a');
      link.download = 'carte_epidemiologique.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      showNotification('Carte exportée avec succès', 'success');
    } catch (error) {
      showNotification('Erreur d\'exportation', 'error');
    }
  };

  // Notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Implémentation simple de notification
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // Composants de style inline (répliqués de l'original)
  const styles = {
    mapContainer: {
      height: '600px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      transition: 'width 0.3s ease-out'
    },
    sidebar: {
      width: '320px',
      background: 'white',
      boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)'
    },
    darkSidebar: {
      background: 'rgb(30, 41, 59)'
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-full flex relative">
        {/* Overlay mobile */}
        <div 
          className={`geo-sidebar-overlay ${isSidebarOpen ? 'show' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        
        {/* Contenu principal */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          {/* En-tête */}
          <div className="mb-8">
            <nav className="flex mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <a href="/" className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors duration-200">
                    Accueil
                  </a>
                </li>
                <li>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </li>
                <li>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    Simulation épidemiologique
                  </span>
                </li>
              </ol>
            </nav>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Visualisation géospatiale
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                  Visualisation interactive sur carte
                </p>
              </div>
            </div>
          </div>

          {/* Section carte */}
          <div className="mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setMapView(mapView === 'street' ? 'satellite' : 'street')}
                    className="control-button px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    {mapView === 'street' ? 'Vue Satellite' : 'Vue Rue'}
                  </button>
                  <button 
                    onClick={() => mapRef.current?.setView([46.2276, 2.2137], 6)}
                    className="control-button px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
              
              {/* Carte Leaflet */}
              <div className="map-container">
                <MapContainer
                  center={[46.2276, 2.2137]}
                  zoom={6}
                  style={styles.mapContainer}
                  ref={mapRef}
                >
                  <LayersControl position="topright">
                    {mapView === 'street' ? (
                      <LayersControl.BaseLayer checked name="OpenStreetMap">
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                      </LayersControl.BaseLayer>
                    ) : (
                      <LayersControl.BaseLayer checked name="Satellite">
                        <TileLayer
                          attribution='&copy; Esri'
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                      </LayersControl.BaseLayer>
                    )}
                    
                    {/* Marqueurs */}
                    <LayerGroup>
                      {currentData.map((row, index) => {
                        const lat = parseFloat(row[selectedColumns.lat] as string);
                        const lng = parseFloat(row[selectedColumns.lng] as string);
                        const value = parseFloat(row[selectedColumns.value] as string) || 0;
                        
                        if (isNaN(lat) || isNaN(lng)) return null;
                        
                        return (
                          <CircleMarker
                            key={index}
                            center={[lat, lng]}
                            radius={10 + value / 10}
                            pathOptions={{
                              fillColor: value > 100 ? '#ef4444' : value > 50 ? '#f59e0b' : '#10b981',
                              color: '#fff',
                              weight: 2,
                              opacity: 1,
                              fillOpacity: 0.7
                            }}
                          >
                            <Tooltip>
                              <div className="custom-tooltip">
                                <strong>{row['ville'] || 'Point'}</strong><br />
                                Latitude: {lat}<br />
                                Longitude: {lng}<br />
                                Cas: {value}
                              </div>
                            </Tooltip>
                          </CircleMarker>
                        );
                      })}
                    </LayerGroup>
                  </LayersControl>
                </MapContainer>
              </div>
              
              {/* Légende */}
              <div className="legend mt-4 p-4 rounded-lg bg-white dark:bg-slate-800 shadow">
                <h4 className="font-medium mb-2">Légende</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm">Faible incidence</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Incidence modérée</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm">Forte incidence</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Statistiques Géospatiales
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-primary-600">
                    {currentData.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Points totaux</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-secondary-600">
                    {currentData.length > 0 
                      ? (currentData.reduce((sum, row) => sum + (parseFloat(row[selectedColumns.value] as string) || 0), 0) / currentData.length).toFixed(2)
                      : '0'
                    }
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Valeur moyenne</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-accent-600">
                    {currentData.length > 0
                      ? Math.max(...currentData.map(row => parseFloat(row[selectedColumns.value] as string) || 0))
                      : '0'
                    }
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Valeur maximale</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {currentData.length > 0
                      ? Math.min(...currentData.map(row => parseFloat(row[selectedColumns.value] as string) || 0))
                      : '0'
                    }
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Valeur minimale</div>
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu des données */}
          {currentData.length > 0 && (
            <div className="mb-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Aperçu des Données
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        {Object.keys(currentData[0]).map((key) => (
                          <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                      {currentData.slice(0, 5).map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, idx) => (
                            <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bouton toggle sidebar */}
        <button
          id="geo-sidebar-toggle"
          className="geo-sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Ouvrir ou fermer la barre latérale"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isSidebarOpen ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>

        {/* Sidebar géospatiale */}
        <aside
          id="geo-sidebar"
          ref={sidebarRef}
          className={`geo-sidebar ${isDarkMode ? 'dark:bg-slate-800' : 'bg-white'} shadow-sm border-l border-gray-200 dark:border-slate-700 position-${sidebarPosition} ${isSidebarOpen ? '' : 'hidden'}`}
          style={isDarkMode ? { ...styles.sidebar, ...styles.darkSidebar } : styles.sidebar}
        >
          {/* Header */}
          <div className="geo-sidebar-header">
            <div className="geo-sidebar-title">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19l-7-7 7-7m5.5 14l7-7-7-7" />
              </svg>
              <span>Configuration Géospatiale</span>
            </div>
            <div className="geo-sidebar-controls">
              <button 
                onClick={() => setSidebarPosition('top')}
                className="geo-sidebar-control-btn"
                title="Position haute"
              >
                ↑
              </button>
              <button 
                onClick={() => setSidebarPosition('bottom')}
                className="geo-sidebar-control-btn"
                title="Position basse"
              >
                ↓
              </button>
              <button 
                onClick={() => setSidebarPosition('right')}
                className="geo-sidebar-control-btn"
                title="Position droite"
              >
                →
              </button>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="geo-sidebar-control-btn"
                title="Fermer"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="geo-sidebar-content p-6">
            {/* Configuration de visualisation */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configuration de la Visualisation
              </h2>
              
              {/* Onglets */}
              <div className="mb-4">
                <div className="flex space-x-1 bg-gray-100 dark:bg-slate-900 rounded-lg p-1 text-center">
                  <button
                    onClick={() => setActiveTab('basic')}
                    className={`tab-button flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors text-center ${activeTab === 'basic' ? 'active' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m13.11 7.664 1.78 2.672" />
                      <path d="m14.162 12.788-3.324 1.424" />
                      <path d="m20 4-6.06 1.515" />
                      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                      <circle cx="12" cy="6" r="2" />
                      <circle cx="16" cy="12" r="2" />
                      <circle cx="9" cy="15" r="2" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('excel-ai')}
                    className={`tab-button flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors text-center ${activeTab === 'excel-ai' ? 'active' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                      <path d="M9 13a4.5 4.5 0 0 0 3-4" />
                      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
                      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
                      <path d="M6 18a4 4 0 0 1-1.967-.516" />
                      <path d="M12 13h4" />
                      <path d="M12 18h6a2 2 0 0 1 2 2v1" />
                      <path d="M12 8h8" />
                      <path d="M16 8V5a2 2 0 0 1 2-2" />
                      <circle cx="16" cy="13" r=".5" />
                      <circle cx="18" cy="3" r=".5" />
                      <circle cx="20" cy="21" r=".5" />
                      <circle cx="20" cy="8" r=".5" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('advanced')}
                    className={`tab-button flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors text-center ${activeTab === 'advanced' ? 'active' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 17H5" />
                      <path d="M19 7h-9" />
                      <circle cx="17" cy="17" r="3" />
                      <circle cx="7" cy="7" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Contenu onglet Basique */}
              {activeTab === 'basic' && (
                <div id="content-basic" className="tab-content">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="lat-column" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Colonne Latitude
                      </label>
                      <select
                        id="lat-column"
                        value={selectedColumns.lat}
                        onChange={(e) => setSelectedColumns({...selectedColumns, lat: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Sélectionner...</option>
                        {currentData.length > 0 && Object.keys(currentData[0]).map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="lng-column" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Colonne Longitude
                      </label>
                      <select
                        id="lng-column"
                        value={selectedColumns.lng}
                        onChange={(e) => setSelectedColumns({...selectedColumns, lng: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Sélectionner...</option>
                        {currentData.length > 0 && Object.keys(currentData[0]).map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="value-column" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Colonne Valeur
                      </label>
                      <select
                        id="value-column"
                        value={selectedColumns.value}
                        onChange={(e) => setSelectedColumns({...selectedColumns, value: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      >
                        <option value="">Sélectionner...</option>
                        {currentData.length > 0 && Object.keys(currentData[0]).map((col) => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Filtres */}
                  <div className="mt-6">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Filtres</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="value-min" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Valeur minimale
                        </label>
                        <input
                          type="number"
                          id="value-min"
                          placeholder="Min"
                          value={filters.min === -Infinity ? '' : filters.min}
                          onChange={(e) => setFilters({...filters, min: e.target.value ? parseFloat(e.target.value) : -Infinity})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="value-max" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Valeur maximale
                        </label>
                        <input
                          type="number"
                          id="value-max"
                          placeholder="Max"
                          value={filters.max === Infinity ? '' : filters.max}
                          onChange={(e) => setFilters({...filters, max: e.target.value ? parseFloat(e.target.value) : Infinity})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => showNotification('Visualisation mise à jour', 'success')}
                      disabled={!selectedColumns.lat || !selectedColumns.lng}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Visualiser sur la carte
                    </button>
                    <button
                      onClick={exportMap}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Exporter la carte
                    </button>
                  </div>
                </div>
              )}
              
              {/* Contenu onglet Excel IA */}
              {activeTab === 'excel-ai' && (
                <div id="content-excel-ai" className="tab-content">
                  <div className="space-y-4">
                    {/* Analyse IA automatique */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <h3 className="text-md font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Analyse IA Épidémiologique
                      </h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                        L'IA analyse automatiquement vos données pour détecter des patterns épidémiologiques et générer des insights.
                      </p>
                      <button
                        onClick={runAIAnalysis}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-md transition-all transform hover:scale-105"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="ai-loading mr-2"></div>
                            Analyse en cours...
                          </div>
                        ) : (
                          <>
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Lancer l'Analyse IA
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Types d'analyses */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Types d'analyses disponibles :</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(aiTypes).map(([key, value]) => (
                          <label key={key} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => setAiTypes({...aiTypes, [key]: e.target.checked})}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {key === 'outbreak' && 'Détection d\'épidémies'}
                              {key === 'prediction' && 'Modélisation prédictive'}
                              {key === 'spatial' && 'Analyse spatiale'}
                              {key === 'risk' && 'Évaluation des risques'}
                              {key === 'trends' && 'Analyse des tendances'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    {/* Résultats IA */}
                    {aiResults && (
                      <div id="ai-results" className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                        <h4 className="text-md font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Résultats de l'Analyse IA
                        </h4>
                        <div id="ai-results-content" className="text-sm text-green-700 dark:text-green-300">
                          <div className="space-y-3">
                            <div className="font-medium">{aiResults.summary}</div>
                            
                            {aiResults.alerts.length > 0 && (
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-700">
                                <h5 className="font-semibold text-red-800 dark:text-red-300 mb-2">🚨 Alertes</h5>
                                <ul className="space-y-1">
                                  {aiResults.alerts.map((alert, idx) => (
                                    <li key={idx} className="text-red-700 dark:text-red-300 text-sm">• {alert}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {aiResults.insights.length > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700">
                                <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">💡 Insights</h5>
                                <ul className="space-y-1">
                                  {aiResults.insights.map((insight, idx) => (
                                    <li key={idx} className="text-blue-700 dark:text-blue-300 text-sm">• {insight}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {aiResults.recommendations.length > 0 && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-700">
                                <h5 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">📋 Recommandations</h5>
                                <ul className="space-y-1">
                                  {aiResults.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-yellow-700 dark:text-yellow-300 text-sm">• {rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors">
                            Exporter PDF
                          </button>
                          <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors">
                            Visualiser
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Contenu onglet Avancé */}
              {activeTab === 'advanced' && (
                <div id="content-advanced" className="tab-content">
                  <div className="space-y-4">
                    {/* Paramètres de visualisation */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Paramètres de visualisation
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="marker-size" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Taille des marqueurs
                          </label>
                          <input
                            type="range"
                            id="marker-size"
                            min="5"
                            max="30"
                            defaultValue="15"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="opacity" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Opacité
                          </label>
                          <input
                            type="range"
                            id="opacity"
                            min="0.1"
                            max="1"
                            step="0.1"
                            defaultValue="0.7"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="color-scheme" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Schéma de couleurs
                          </label>
                          <select
                            id="color-scheme"
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                          >
                            <option value="red-green">Rouge-Vert</option>
                            <option value="blue-red">Bleu-Rouge</option>
                            <option value="viridis">Viridis</option>
                            <option value="plasma">Plasma</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Clustering */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Clustering</h4>
                      <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">Activer le clustering automatique</span>
                      </label>
                    </div>
                    
                    {/* Heatmap */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Carte de chaleur</h4>
                      <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">Afficher la heatmap</span>
                      </label>
                    </div>
                    
                    {/* Animation temporelle */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Animation temporelle</h4>
                      <div className="space-y-2">
                        <label htmlFor="time-column" className="block text-xs text-gray-600 dark:text-gray-400">
                          Colonne temporelle
                        </label>
                        <select
                          id="time-column"
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700 dark:text-white"
                        >
                          <option value="">Aucune</option>
                          {currentData.length > 0 && Object.keys(currentData[0]).map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-1 px-3 rounded transition-colors">
                          ▶ Lancer l'animation
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chargement des données */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Chargement des Données
              </h2>
              
              {/* Zone drag and drop */}
              <div
                id="drop-zone"
                className="drop-zone rounded-lg p-6 text-center mb-4"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('dragover');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('dragover');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  if (e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 text-gray-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Glissez-déposez votre fichier CSV/Excel ici ou
                      <label
                        htmlFor="file-input"
                        className="text-primary-600 hover:text-primary-500 cursor-pointer font-medium ml-1"
                      >
                        cliquez pour parcourir
                      </label>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Formats supportés: CSV, Excel (.xlsx, .xls)
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  id="file-input"
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
              
              {/* Boutons d'exemple */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setCurrentData(sampleData);
                    setSelectedColumns({
                      lat: 'latitude',
                      lng: 'longitude',
                      value: 'cas',
                      time: ''
                    });
                    showNotification('Données d\'exemple chargées', 'success');
                  }}
                  className="control-button px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                >
                  Charger des données d'exemple
                </button>
                <button
                  onClick={() => {
                    setCurrentData([]);
                    setAiResults(null);
                    showNotification('Données effacées', 'info');
                  }}
                  className="control-button px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium"
                >
                  Effacer les données
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default GeospatialVisualization;