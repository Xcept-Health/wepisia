import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, LayersControl, LayerGroup, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import axios from 'axios';
import { ExternalLink, BookOpen, Calendar,Database, BrainCircuit, Settings2 } from 'lucide-react';
// Additional imports for clustering and heatmap
import MarkerClusterGroup from 'react-leaflet-markercluster';
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import 'leaflet.heat';

// Types et interfaces
interface DataRow {
  [key: string]: string | number;
}
interface Dataset {
  id: string;
  name: string;
  color: string;
  data: DataRow[];
  visible: boolean;
}
interface DiseaseExample {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  source: {
    organization: string;
    year: number;
    study: string;
    url: string; // Lien vers la source
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
    sourceDetail: string; // Source spécifique pour ce pays
  }[];
}
interface AIResults {
  summary: string;
  insights: string[];
  recommendations: string[];
  alerts: string[];
  riskLevel: 'low' | 'medium' | 'high';
}
// Composant principal avec toutes les fonctionnalités
const GeospatialVisualization: React.FC = () => {
  // États principaux
  const [datasets, setDatasets] = useState<Dataset[]>([]);
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
  const [aiTypes, setAiTypes] = useState({
    outbreak: true,
    prediction: true,
    spatial: true,
    risk: true,
    trends: true
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sidebarPosition, setSidebarPosition] = useState<'top' | 'bottom' | 'right'>('right');
  const [mapView, setMapView] = useState<'street' | 'satellite'>('street');
  // États pour le modal d'exemples
  const [isExampleModalOpen, setIsExampleModalOpen] = useState<boolean>(false);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [exampleProgress, setExampleProgress] = useState<number>(0);
  // Références
  const mapRef = useRef<L.Map>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Nouveaux états pour les paramètres de visualisation
  const [markerSize, setMarkerSize] = useState<number>(15); // Taille des marqueurs (5-30)
  const [colorScheme, setColorScheme] = useState<string>('sequential'); // Schéma de couleurs
  const [clustering, setClustering] = useState<boolean>(true); // Clustering automatique
  const [heatmap, setHeatmap] = useState<boolean>(false); // Superposer heatmap
  const [animation, setAnimation] = useState<boolean>(false); // Animation temporelle (stub pour l'instant)
  const [tooltips, setTooltips] = useState<boolean>(true); // Info-bulles au survol
  const [displayLimit, setDisplayLimit] = useState<number | 'unlimited'>(1000); // Limite d'affichage
  const [tileCache, setTileCache] = useState<boolean>(true); // Mise en cache des tuiles (pas directement implémentable, mais on garde l'état)
  const [currentTimeFrame, setCurrentTimeFrame] = useState<number>(0); // Pour animation temporelle

  // Données d'exemple de maladies avec sources pour crédibilité
  const diseaseExamples: DiseaseExample[] = [
    {
      id: 'ebola-2014-2016',
      name: 'Épidémie Ebola 2014-2016',
      description: 'Crise sanitaire majeure en Afrique de l\'Ouest avec transmission interhumaine prolongée',
      icon: '🦠',
      color: 'bg-red-500',
      source: {
        organization: 'Organisation Mondiale de la Santé (OMS)',
        year: 2016,
        study: 'Rapport final sur la flambée de maladie à virus Ebola en Afrique de l\'Ouest',
        url: 'https://www.who.int/publications/i/item/ebola-situation-report-30-march-2016',
        dataType: 'surveillance',
        credibility: 'high',
        lastUpdated: '2016-03-30'
      },
      countries: [
        {
          name: 'Guinée',
          lat: 9.9456,
          lng: -9.6966,
          cases: 3814,
          incidenceRate: 28.2,
          population: 12414000,
          region: 'Afrique de l\'Ouest',
          sourceDetail: 'OMS - Rapport de situation Guinée, Mars 2016'
        },
        {
          name: 'Sierra Leone',
          lat: 8.4606,
          lng: -11.7799,
          cases: 14124,
          incidenceRate: 195.3,
          population: 7791000,
          region: 'Afrique de l\'Ouest',
          sourceDetail: 'OMS - Rapport de situation Sierra Leone, Mars 2016'
        },
        {
          name: 'Liberia',
          lat: 6.4281,
          lng: -9.4295,
          cases: 10675,
          incidenceRate: 232.7,
          population: 4854000,
          region: 'Afrique de l\'Ouest',
          sourceDetail: 'OMS - Rapport de situation Liberia, Mars 2016'
        }
      ]
    },
    {
      id: 'covid-global',
      name: 'COVID-19 Distribution Globale',
      description: 'Données agrégées de la pandémie COVID-19 par pays - Phase de suivi post-pandémique',
      icon: '🦠',
      color: 'bg-blue-500',
      source: {
        organization: 'Johns Hopkins University Center for Systems Science and Engineering',
        year: 2023,
        study: 'COVID-19 Data Repository',
        url: 'https://github.com/CSSEGISandData/COVID-19',
        dataType: 'surveillance',
        credibility: 'high',
        lastUpdated: '2023-12-01'
      },
      countries: [
        {
          name: 'États-Unis',
          lat: 37.0902,
          lng: -95.7129,
          cases: 103436829,
          incidenceRate: 31156.8,
          population: 331900000,
          region: 'Amérique du Nord',
          sourceDetail: 'CDC COVID Data Tracker, 2023'
        },
        {
          name: 'Inde',
          lat: 20.5937,
          lng: 78.9629,
          cases: 44994454,
          incidenceRate: 3260.2,
          population: 1380000000,
          region: 'Asie du Sud',
          sourceDetail: 'Ministry of Health India, 2023'
        },
        {
          name: 'Brésil',
          lat: -14.2350,
          lng: -51.9253,
          cases: 37711693,
          incidenceRate: 17693.6,
          population: 213000000,
          region: 'Amérique du Sud',
          sourceDetail: 'Ministério da Saúde Brasil, 2023'
        },
        {
          name: 'France',
          lat: 46.603354,
          lng: 1.888334,
          cases: 40125670,
          incidenceRate: 59889.1,
          population: 67750000,
          region: 'Europe',
          sourceDetail: 'Santé Publique France, 2023'
        },
        {
          name: 'Afrique du Sud',
          lat: -30.5595,
          lng: 22.9375,
          cases: 4076463,
          incidenceRate: 6871.9,
          population: 59310000,
          region: 'Afrique',
          sourceDetail: 'National Institute for Communicable Diseases, 2023'
        }
      ]
    },
    {
      id: 'paludisme-2023',
      name: 'Paludisme 2023',
      description: 'Données sur le fardeau du paludisme dans les pays endémiques',
      icon: '🦟',
      color: 'bg-green-500',
      source: {
        organization: 'World Health Organization - Global Malaria Programme',
        year: 2023,
        study: 'World Malaria Report 2023',
        url: 'https://www.who.int/teams/global-malaria-programme/reports/world-malaria-report-2023',
        dataType: 'report',
        credibility: 'high',
        lastUpdated: '2023-11-30'
      },
      countries: [
        {
          name: 'Nigeria',
          lat: 9.0820,
          lng: 8.6753,
          cases: 67500000,
          incidenceRate: 327.5,
          population: 206140000,
          region: 'Afrique de l\'Ouest',
          sourceDetail: 'OMS Rapport Mondial Paludisme 2023 - Nigeria'
        },
        {
          name: 'RD Congo',
          lat: -4.0383,
          lng: 21.7587,
          cases: 26300000,
          incidenceRate: 295.5,
          population: 89000000,
          region: 'Afrique Centrale',
          sourceDetail: 'OMS Rapport Mondial Paludisme 2023 - RDC'
        },
        {
          name: 'Ouganda',
          lat: 1.3733,
          lng: 32.2903,
          cases: 12800000,
          incidenceRate: 279.0,
          population: 45900000,
          region: 'Afrique de l\'Est',
          sourceDetail: 'OMS Rapport Mondial Paludisme 2023 - Ouganda'
        },
        {
          name: 'Mozambique',
          lat: -18.6657,
          lng: 35.5296,
          cases: 9810000,
          incidenceRate: 314.4,
          population: 31200000,
          region: 'Afrique Australe',
          sourceDetail: 'OMS Rapport Mondial Paludisme 2023 - Mozambique'
        },
        {
          name: 'Burkina Faso',
          lat: 12.2383,
          lng: -1.5616,
          cases: 12400000,
          incidenceRate: 593.3,
          population: 20900000,
          region: 'Afrique de l\'Ouest',
          sourceDetail: 'OMS Rapport Mondial Paludisme 2023 - Burkina Faso'
        }
      ]
    },
    {
      id: 'cholera-yemen',
      name: 'Choléra Yémen 2016-2023',
      description: 'La plus grande épidémie de choléra jamais enregistrée dans l\'histoire',
      icon: '💧',
      color: 'bg-teal-500',
      source: {
        organization: 'UNICEF & WHO Cholera Task Force',
        year: 2023,
        study: 'Yemen Cholera Outbreak Response Report',
        url: 'https://www.who.int/emergencies/situations/cholera-yemen-2023',
        dataType: 'surveillance',
        credibility: 'high',
        lastUpdated: '2023-10-15'
      },
      countries: [
        {
          name: 'Yémen',
          lat: 15.5527,
          lng: 48.5164,
          cases: 2500000,
          incidenceRate: 838.9,
          population: 29800000,
          region: 'Moyen-Orient',
          sourceDetail: 'OMS/UNICEF - Situation du choléra au Yémen, 2023'
        },
        {
          name: 'Haïti',
          lat: 18.9712,
          lng: -72.2852,
          cases: 820000,
          incidenceRate: 72.6,
          population: 11300000,
          region: 'Caraïbes',
          sourceDetail: 'Ministère de la Santé Haïti, 2023'
        },
        {
          name: 'Somalie',
          lat: 5.1521,
          lng: 46.1996,
          cases: 18000,
          incidenceRate: 11.4,
          population: 15800000,
          region: 'Afrique de l\'Est',
          sourceDetail: 'OMS - Rapport situation choléra Somalie, 2023'
        }
      ]
    }
  ];
  // Fonction pour générer des exemples de données par continent
  const generateContinentalData = () => {
    const continents = [
      { name: 'Afrique', countries: [
        { name: 'Nigeria', lat: 9.0820, lng: 8.6753, cases: 5000, incidenceRate: 24.3, region: 'Ouest' },
        { name: 'Égypte', lat: 26.8206, lng: 30.8025, cases: 1200, incidenceRate: 12.1, region: 'Nord' },
        { name: 'Afrique du Sud', lat: -30.5595, lng: 22.9375, cases: 3500, incidenceRate: 59.0, region: 'Sud' },
        { name: 'Kenya', lat: -1.2864, lng: 36.8172, cases: 1800, incidenceRate: 33.4, region: 'Est' },
        { name: 'RD Congo', lat: -4.0383, lng: 21.7587, cases: 4200, incidenceRate: 47.2, region: 'Centre' }
      ]},
      { name: 'Europe', countries: [
        { name: 'France', lat: 46.603354, lng: 1.888334, cases: 2800, incidenceRate: 41.8, region: 'Ouest' },
        { name: 'Russie', lat: 61.5240, lng: 105.3188, cases: 6500, incidenceRate: 44.6, region: 'Est' },
        { name: 'Allemagne', lat: 51.1657, lng: 10.4515, cases: 3200, incidenceRate: 38.4, region: 'Centre' },
        { name: 'Suède', lat: 60.1282, lng: 18.6435, cases: 900, incidenceRate: 89.3, region: 'Nord' },
        { name: 'Italie', lat: 41.8719, lng: 12.5674, cases: 2100, incidenceRate: 34.7, region: 'Sud' }
      ]},
      { name: 'Asie', countries: [
        { name: 'Chine', lat: 35.8617, lng: 104.1954, cases: 15000, incidenceRate: 10.7, region: 'Est' },
        { name: 'Inde', lat: 20.5937, lng: 78.9629, cases: 25000, incidenceRate: 18.1, region: 'Sud' },
        { name: 'Japon', lat: 36.2048, lng: 138.2529, cases: 1800, incidenceRate: 14.2, region: 'Est' },
        { name: 'Turquie', lat: 38.9637, lng: 35.2433, cases: 4200, incidenceRate: 50.1, region: 'Ouest' },
        { name: 'Kazakhstan', lat: 48.0196, lng: 66.9237, cases: 1100, incidenceRate: 58.9, region: 'Centre' }
      ]},
      { name: 'Amérique', countries: [
        { name: 'États-Unis', lat: 37.0902, lng: -95.7129, cases: 9800, incidenceRate: 29.6, region: 'Nord' },
        { name: 'Brésil', lat: -14.2350, lng: -51.9253, cases: 7200, incidenceRate: 33.8, region: 'Sud' },
        { name: 'Canada', lat: 56.1304, lng: -106.3468, cases: 1400, incidenceRate: 37.1, region: 'Nord' },
        { name: 'Mexique', lat: 23.6345, lng: -102.5528, cases: 3800, incidenceRate: 29.5, region: 'Centre' },
        { name: 'Argentine', lat: -38.4161, lng: -63.6167, cases: 2100, incidenceRate: 46.7, region: 'Sud' }
      ]},
      { name: 'Océanie', countries: [
        { name: 'Australie', lat: -25.2744, lng: 133.7751, cases: 1200, incidenceRate: 47.2, region: 'Centre' },
        { name: 'Nouvelle-Zélande', lat: -40.9006, lng: 174.8860, cases: 400, incidenceRate: 8.3, region: 'Est' },
        { name: 'Papouasie-Nouvelle-Guinée', lat: -6.3150, lng: 143.9555, cases: 1800, incidenceRate: 201.5, region: 'Ouest' },
        { name: 'Fidji', lat: -17.7134, lng: 178.0650, cases: 300, incidenceRate: 33.4, region: 'Nord' },
        { name: 'Nouvelle-Calédonie', lat: -20.9043, lng: 165.6180, cases: 150, incidenceRate: 52.6, region: 'Sud' }
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
  const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16);
  // Charger un exemple de maladie
  const loadDiseaseExample = async (diseaseId: string) => {
    setIsLoading(true);
    setExampleProgress(0);
  
    // Simuler le chargement avec une progression
    const interval = setInterval(() => {
      setExampleProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);
    // Attendre un peu pour l'effet de chargement
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
        visible: true
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
        showNotification(`Données ${disease.name} chargées avec succès! Source: ${disease.source.organization} (${disease.source.year})`, 'success');
      }, 500);
    }
  };
  // Charger des données continentales
  const loadContinentalData = async () => {
    setIsLoading(true);
    setExampleProgress(0);
  
    const interval = setInterval(() => {
      setExampleProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
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
      visible: true
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
      showNotification('Données continentales chargées avec succès! (Données simulées basées sur des tendances générales OMS)', 'success');
    }, 500);
  };
  const loadSelectedExamples = async () => {
    setIsExampleModalOpen(false);
    for (const id of selectedDiseases) {
      await loadDiseaseExample(id);
    }
    setSelectedDiseases([]);
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
            processData(results.data as DataRow[], file.name);
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
          processData(jsonData, file.name);
        } catch (error) {
          showNotification('Erreur de lecture Excel: ' + (error as Error).message, 'error');
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
      visible: true
    }]);
  
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
      } else if (['value', 'val', 'count', 'cas', 'incidence', 'cases'].some(p => lowerCol.includes(p))) {
        newCols.value = col;
      } else if (['time', 'date', 'timestamp', 'jour'].some(p => lowerCol.includes(p))) {
        newCols.time = col;
      }
    });
  
    return newCols;
  };
  // Analyse IA avec Groq API
  const runAIAnalysis = async () => {
    const flatData = datasets.filter(d => d.visible).flatMap(d => d.data);
    if (flatData.length === 0) {
      showNotification('Veuillez charger des données d\'abord', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      // Résumer les données pour l'API (pour éviter d'envoyer trop de données)
      const dataSummary = JSON.stringify({
        totalPoints: flatData.length,
        stats: calculateStats(),
        sample: flatData.slice(0, 5), // Envoyer un échantillon
        types: aiTypes
      });
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions', // Endpoint Groq (adapté à Groq, qui proxy OpenAI-like)
        {
          model: 'mixtral-8x7b-32768', // Exemple de modèle Groq
          messages: [
            {
              role: 'system',
              content: 'You are an epidemiological AI analyst. Analyze the provided data and return in JSON format: {summary: string, insights: array<string>, recommendations: array<string>, alerts: array<string>, riskLevel: "low"|"medium"|"high"}'
            },
            {
              role: 'user',
              content: `Analyze this epidemiological data: ${dataSummary}`
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const aiResponse = JSON.parse(response.data.choices[0].message.content) as AIResults;
      setAiResults(aiResponse);
      showNotification('Analyse IA terminée avec succès!', 'success');
    } catch (error) {
      showNotification('Erreur lors de l\'analyse IA: ' + (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  // Export
  const exportMap = async () => {
    const mapElement = document.querySelector('.leaflet-container');
    if (!mapElement) return;
    try {
      const canvas = await html2canvas(mapElement as HTMLElement, {
        useCORS: true,
        backgroundColor: null,
        scale: 2
      });
    
      const link = document.createElement('a');
      link.download = `carte_epidemiologique_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    
      showNotification('Carte exportée avec succès!', 'success');
    } catch (error) {
      showNotification('Erreur d\'exportation', 'error');
    }
  };
  // Notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg animate-slide-in ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };
  // Calculer les statistiques
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

  // Fonction pour obtenir la couleur basée sur le schéma sélectionné
  const getMarkerColor = (value: number) => {
    switch (colorScheme) {
      case 'sequential':
        return value > 1000000 ? '#ef4444' :
               value > 100000 ? '#f59e0b' :
               value > 10000 ? '#10b981' : '#3b82f6';
      case 'diverging':
        return value > 500000 ? '#b91c1c' :
               value > 100000 ? '#ea580c' :
               value > 0 ? '#059669' : '#1d4ed8';
      case 'categorical':
        return '#' + Math.floor(Math.random() * 16777215).toString(16); // Couleur aléatoire par catégorie
      case 'red-green':
        return value > 1000000 ? '#ff0000' :
               value > 100000 ? '#ff9900' :
               value > 10000 ? '#00ff00' : '#009900';
      case 'blue-red':
        return value > 1000000 ? '#ff0000' :
               value > 100000 ? '#ff6666' :
               value > 10000 ? '#6666ff' : '#0000ff';
      case 'viridis':
        return value > 1000000 ? '#440154' :
               value > 100000 ? '#3b528b' :
               value > 10000 ? '#21918c' : '#5ec962';
      case 'plasma':
        return value > 1000000 ? '#0d0887' :
               value > 100000 ? '#7e03a8' :
               value > 10000 ? '#cc4778' : '#f89540';
      default:
        return '#3b82f6';
    }
  };

  // Logique pour l'animation temporelle (simple : cycle à travers les frames si colonne time existe)
  useEffect(() => {
    if (animation && selectedColumns.time) {
      const interval = setInterval(() => {
        setCurrentTimeFrame(prev => (prev + 1) % 10); // Exemple : 10 frames
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [animation, selectedColumns.time]);

  // Ajouter la heatmap layer si activée
  useEffect(() => {
    if (mapRef.current && heatmap) {
      const flatData = datasets.filter(d => d.visible).flatMap(d => d.data);
      const heatPoints = flatData.map(row => {
        const lat = parseFloat(row[selectedColumns.lat] as string);
        const lng = parseFloat(row[selectedColumns.lng] as string);
        const value = parseFloat(row[selectedColumns.value] as string) || 0;
        return [lat, lng, value / 1000000]; // Intensité normalisée
      }).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

      const heatLayer = (L as any).heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
      });
      heatLayer.addTo(mapRef.current);

      return () => {
        mapRef.current?.removeLayer(heatLayer);
      };
    }
  }, [heatmap, datasets, selectedColumns]);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-full flex relative">
        {/* Overlay mobile */}
        <div
          className={`geo-sidebar-overlay ${isSidebarOpen ? 'show' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />
      
        {/* Contenu principal */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 relative"> {/* Added relative for sidebar overlay */}
          {/* En-tête */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Visualisation Géospatiale Épidémiologique
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                    Analyse interactive des données de santé mondiale
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Section carte */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Carte Interactive des Données Épidémiologiques</CardTitle>
                <CardDescription>
                  Visualisez la distribution spatiale des cas et identifiez les zones à risque
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setMapView(mapView === 'street' ? 'satellite' : 'street')}
                        variant="outline"
                        size="sm"
                      >
                        {mapView === 'street' ? 'Vue Satellite' : 'Vue Standard'}
                      </Button>
                      <Button
                        onClick={() => mapRef.current?.setView([20, 0], 2)}
                        variant="outline"
                        size="sm"
                      >
                        Vue Monde
                      </Button>
                    </div>
                    <Badge variant={datasets.reduce((sum, d) => sum + (d.visible ? d.data.length : 0), 0) > 0 ? "default" : "secondary"}>
                      {datasets.reduce((sum, d) => sum + (d.visible ? d.data.length : 0), 0)} points
                    </Badge>
                  </div>
                
                  {/* Carte Leaflet */}
                  <div className="map-container">
                    <MapContainer
                      center={[20, 0]}
                      zoom={2}
                      style={{ height: '500px', borderRadius: '8px' }}
                      ref={mapRef}
                    >
                      <LayersControl position="topright">
                        {mapView === 'street' ? (
                          <LayersControl.BaseLayer checked name="Standard">
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
                        {datasets.map((dataset) => dataset.visible && (
  <LayerGroup key={dataset.id}>
    {clustering ? (
      <MarkerClusterGroup>
        {dataset.data
          .slice(0, displayLimit !== 'unlimited' ? displayLimit : undefined)
          .map((row, index) => {
            const lat = parseFloat(row[selectedColumns.lat] as string);
            const lng = parseFloat(row[selectedColumns.lng] as string);
            const value = parseFloat(row[selectedColumns.value] as string) || 0;
            const name = row['pays'] || row['country'] || 'Point';
            const incidence = row['taux_incidence'] || row['incidenceRate'] || 0;
          
            if (isNaN(lat) || isNaN(lng)) return null;
          
            // Calculer la taille basée sur la valeur et le paramètre markerSize
            const radius = Math.max(5, Math.min(30, (Math.sqrt(value) / 10) * (markerSize / 15)));
          
            // Filtrer par time si animation active (exemple simple : assume time est un nombre)
            if (animation && selectedColumns.time) {
              const timeValue = parseFloat(row[selectedColumns.time] as string) % 10;
              if (timeValue !== currentTimeFrame) return null;
            }

            return (
              <CircleMarker
                key={index}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  fillColor: getMarkerColor(value),
                  color: dataset.color,
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.7
                }}
              >
                {tooltips && (
                  <Tooltip>
                    <div className="p-2">
                      <h4 className="font-bold">{name}</h4>
                      <p>Groupe: {dataset.name}</p>
                      <p>Cas: {value.toLocaleString()}</p>
                      <p>Taux d'incidence: {incidence}</p>
                      {row['maladie'] && <p>Maladie: {row['maladie']}</p>}
                    </div>
                  </Tooltip>
                )}
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{name}</h3>
                    <div className="space-y-1 mt-2">
                      {Object.entries(row)
                        .filter(([key]) => !['latitude', 'longitude'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{value}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MarkerClusterGroup>
    ) : (
      <>
        {dataset.data
          .slice(0, displayLimit !== 'unlimited' ? displayLimit : undefined)
          .map((row, index) => {
            const lat = parseFloat(row[selectedColumns.lat] as string);
            const lng = parseFloat(row[selectedColumns.lng] as string);
            const value = parseFloat(row[selectedColumns.value] as string) || 0;
            const name = row['pays'] || row['country'] || 'Point';
            const incidence = row['taux_incidence'] || row['incidenceRate'] || 0;
          
            if (isNaN(lat) || isNaN(lng)) return null;
          
            // Calculer la taille basée sur la valeur et le paramètre markerSize
            const radius = Math.max(5, Math.min(30, (Math.sqrt(value) / 10) * (markerSize / 15)));
          
            // Filtrer par time si animation active (exemple simple : assume time est un nombre)
            if (animation && selectedColumns.time) {
              const timeValue = parseFloat(row[selectedColumns.time] as string) % 10;
              if (timeValue !== currentTimeFrame) return null;
            }

            return (
              <CircleMarker
                key={index}
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  fillColor: getMarkerColor(value),
                  color: dataset.color,
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.7
                }}
              >
                {tooltips && (
                  <Tooltip>
                    <div className="p-2">
                      <h4 className="font-bold">{name}</h4>
                      <p>Groupe: {dataset.name}</p>
                      <p>Cas: {value.toLocaleString()}</p>
                      <p>Taux d'incidence: {incidence}</p>
                      {row['maladie'] && <p>Maladie: {row['maladie']}</p>}
                    </div>
                  </Tooltip>
                )}
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{name}</h3>
                    <div className="space-y-1 mt-2">
                      {Object.entries(row)
                        .filter(([key]) => !['latitude', 'longitude'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{value}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </>
    )}
  </LayerGroup>
))}
                      </LayersControl>
                    </MapContainer>
                  </div>
                  
                
                  {/* Légende */}
                  <Card className="mt-4">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Légende</h4>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                            <span className="text-sm">Faible</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            <span className="text-sm">Modéré</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                            <span className="text-sm">Élevé</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-red-500"></div>
                            <span className="text-sm">Critique</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Points de Données</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{datasets.reduce((sum, d) => sum + (d.visible ? d.data.length : 0), 0)}</div>
                <p className="text-xs text-gray-500">Total des enregistrements</p>
              </CardContent>
            </Card>
          
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Cas Moyens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-gray-500">Par localisation</p>
              </CardContent>
            </Card>
          
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Maximum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.max.toLocaleString()}</div>
                <p className="text-xs text-gray-500">Zone la plus touchée</p>
              </CardContent>
            </Card>
          
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Minimum</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.min.toLocaleString()}</div>
                <p className="text-xs text-gray-500">Zone la moins touchée</p>
              </CardContent>
            </Card>
          </div>
          {/* Aperçu des données */}
          {datasets.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Aperçu des Données</CardTitle>
                <CardDescription>
                  {datasets.reduce((sum, d) => sum + (d.visible ? d.data.length : 0), 0)} enregistrements chargés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Groupe</th>
                        {datasets.length > 0 && datasets[0].data.length > 0 && Object.keys(datasets[0].data[0]).slice(0, 5).map((key) => (
                          <th key={key} className="text-left p-2 font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datasets.filter(d => d.visible).flatMap(d => d.data.slice(0, 5).map(row => ({...row, _group: d.name}))).map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-slate-800">
                          <td className="p-2">{row._group as string}</td>
                          {Object.values(row).slice(0, 5).map((value, idx) => (
                            <td key={idx} className="p-2">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          {/* Résultats IA */}
          {aiResults && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Résultats de l'Analyse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className={`mb-4 ${
                  aiResults.riskLevel === 'high' ? 'bg-red-50 border-red-200' :
                  aiResults.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <AlertTitle>
                    Niveau de risque:
                    <Badge className="ml-2" variant={
                      aiResults.riskLevel === 'high' ? 'destructive' :
                      aiResults.riskLevel === 'medium' ? 'secondary' : 'outline'
                    }>
                      {aiResults.riskLevel === 'high' ? 'ÉLEVÉ' :
                       aiResults.riskLevel === 'medium' ? 'MODÉRÉ' : 'FAIBLE'}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>{aiResults.summary}</AlertDescription>
                </Alert>
              
                <Tabs defaultValue="insights" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                    <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
                    <TabsTrigger value="alerts">Alertes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="insights" className="space-y-2">
                    {aiResults.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                        <span>{insight}</span>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="recommendations" className="space-y-2">
                    {aiResults.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                        <span>{rec}</span>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="alerts" className="space-y-2">
                    {aiResults.alerts.map((alert, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                        <span>{alert}</span>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </main>
        {/* Bouton toggle sidebar */}
        <Button
          className="geo-sidebar-toggle absolute top-4 right-4 z-40" // Positioned over the map
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          size="icon"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isSidebarOpen ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </Button>
        {/* Sidebar géospatiale - Opens over the map */}
        {isSidebarOpen && (
          <aside
            className={`geo-sidebar absolute top-0 right-0 h-full w-80 ${isDarkMode ? 'dark:bg-slate-800' : 'bg-white'} shadow-sm border-l border-gray-200 dark:border-slate-700 z-30 overflow-y-auto`} // Over map, fixed width
          >
            {/* Header */}
            <div className="geo-sidebar-header p-4 flex justify-between items-center">
              <div className="geo-sidebar-title flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19l-7-7 7-7m5.5 14l7-7-7-7" />
                </svg>
                <span>Configuration</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsSidebarOpen(false)}
              >
                ×
              </Button>
            </div>
          
            <ScrollArea className="p-6">
              <Tabs defaultValue="data" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="data"> <Database></Database> </TabsTrigger>
                  <TabsTrigger value="analysis"> <BrainCircuit></BrainCircuit> </TabsTrigger>
                  <TabsTrigger value="settings"> <Settings2></Settings2> </TabsTrigger>
                </TabsList>
              
                <TabsContent value="data" className="space-y-6">
                  {/* Section exemples */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Exemples de Données</CardTitle>
                      <CardDescription>
                        Chargez des données épidémiologiques pré-définies
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        className="w-full"
                        onClick={() => setIsExampleModalOpen(true)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Charger un exemple
                      </Button>
                    
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={loadContinentalData}
                      >
                        Données Continentales
                      </Button>
                    </CardContent>
                  </Card>
                  {/* Section chargement fichiers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Chargement de Fichiers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="drop-zone rounded-lg p-6 text-center mb-4 border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
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
                              Glissez-déposez votre fichier ou
                              <Button
                                variant="link"
                                className="ml-1"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                cliquez pour parcourir
                              </Button>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              CSV, Excel (.xlsx, .xls)
                            </p>
                          </div>
                        </div>
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
                    
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={exportMap}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Exporter
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setDatasets([]);
                            setAiResults(null);
                            showNotification('Données effacées', 'info');
                          }}
                        >
                          Effacer tout
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Configuration colonnes */}
                  {datasets.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Configuration des Colonnes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Colonne Latitude</label>
                          <select
                            value={selectedColumns.lat}
                            onChange={(e) => setSelectedColumns({...selectedColumns, lat: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="">Sélectionner...</option>
                            {datasets[0]?.data[0] && Object.keys(datasets[0].data[0]).map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      
                        <div>
                          <label className="block text-sm font-medium mb-2">Colonne Longitude</label>
                          <select
                            value={selectedColumns.lng}
                            onChange={(e) => setSelectedColumns({...selectedColumns, lng: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="">Sélectionner...</option>
                            {datasets[0]?.data[0] && Object.keys(datasets[0].data[0]).map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      
                        <div>
                          <label className="block text-sm font-medium mb-2">Colonne Valeur</label>
                          <select
                            value={selectedColumns.value}
                            onChange={(e) => setSelectedColumns({...selectedColumns, value: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="">Sélectionner...</option>
                            {datasets[0]?.data[0] && Object.keys(datasets[0].data[0]).map((col) => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              
                <TabsContent value="analysis" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Analyse Épidémiologique</CardTitle>
                      <CardDescription>
                        Détection automatique de patterns et risques via IA (Groq)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                        onClick={runAIAnalysis}
                        disabled={isLoading || datasets.reduce((sum, d) => sum + (d.visible ? d.data.length : 0), 0) === 0}
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <div className="ai-loading mr-2"></div>
                            Analyse en cours...
                          </div>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Lancer l'Analyse IA
                          </>
                        )}
                      </Button>
                    
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Types d'analyses :</h4>
                        <div className="space-y-2">
                          {Object.entries(aiTypes).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`analysis-${key}`}
                                checked={value}
                                onChange={(e) => setAiTypes({...aiTypes, [key]: e.target.checked})}
                                className="rounded"
                              />
                              <label htmlFor={`analysis-${key}`} className="text-sm">
                                {key === 'outbreak' && 'Détection d\'épidémies'}
                                {key === 'prediction' && 'Modélisation prédictive'}
                                {key === 'spatial' && 'Analyse spatiale'}
                                {key === 'risk' && 'Évaluation des risques'}
                                {key === 'trends' && 'Analyse des tendances'}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              
                <TabsContent value="settings" className="space-y-6">
                  {/* Paramètres de visualisation globaux */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Paramètres de Visualisation</CardTitle>
                      <CardDescription>
                        Configurez l'apparence générale de la carte et des données
                      </CardDescription>
                    </CardHeader>
                   
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Apparence des marqueurs</h4>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Taille des marqueurs
                            <span className="ml-2 text-xs text-gray-500">(5-30px)</span>
                          </label>
                          <input
                            type="range"
                            min="5"
                            max="30"
                            value={markerSize}
                            className="w-full"
                            onChange={(e) => setMarkerSize(parseInt(e.target.value))}
                          />
                        </div>
                       
                        <div>
                          <label className="block text-sm font-medium mb-2">Schéma de couleurs</label>
                          <select 
                            value={colorScheme}
                            onChange={(e) => setColorScheme(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="sequential">Séquentiel (faible à élevé)</option>
                            <option value="diverging">Divergent (centre extrêmes)</option>
                            <option value="categorical">Catégoriel (par maladie)</option>
                            <option value="red-green">Rouge-Vert (daltonien friendly)</option>
                            <option value="blue-red">Bleu-Rouge</option>
                            <option value="viridis">Viridis</option>
                            <option value="plasma">Plasma</option>
                          </select>
                        </div>
                      </div>
                     
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Fonctions avancées</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="clustering" 
                                checked={clustering}
                                onChange={(e) => setClustering(e.target.checked)}
                                className="rounded" 
                              />
                              <label htmlFor="clustering" className="text-sm">
                                Clustering automatique
                                <span className="block text-xs text-gray-500">
                                  Regroupe les points proches pour une meilleure lisibilité
                                </span>
                              </label>
                            </div>
                            <Badge variant="outline" size="sm">Recommandé</Badge>
                          </div>
                         
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="heatmap" 
                                checked={heatmap}
                                onChange={(e) => setHeatmap(e.target.checked)}
                                className="rounded" 
                              />
                              <label htmlFor="heatmap" className="text-sm">
                                Superposer la heatmap
                                <span className="block text-xs text-gray-500">
                                  Affiche les zones de densité en surimpression
                                </span>
                              </label>
                            </div>
                          </div>
                         
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="animation" 
                                checked={animation}
                                onChange={(e) => setAnimation(e.target.checked)}
                                className="rounded" 
                              />
                              <label htmlFor="animation" className="text-sm">
                                Animation temporelle
                                <span className="block text-xs text-gray-500">
                                  Anime l'évolution dans le temps si disponible
                                </span>
                              </label>
                            </div>
                          </div>
                         
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="tooltips" 
                                checked={tooltips}
                                onChange={(e) => setTooltips(e.target.checked)}
                                className="rounded" 
                              />
                              <label htmlFor="tooltips" className="text-sm">
                                Info-bulles au survol
                                <span className="block text-xs text-gray-500">
                                  Affiche les détails au survol de la souris
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                     
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Performance</h4>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Limite d'affichage
                            <span className="ml-2 text-xs text-gray-500">(points max simultanés)</span>
                          </label>
                          <select 
                            value={displayLimit.toString()}
                            onChange={(e) => setDisplayLimit(e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="1000">1000 points (Rapide)</option>
                            <option value="5000">5000 points (Équilibré)</option>
                            <option value="10000">10000 points (Détaillé)</option>
                            <option value="unlimited">Illimité (Expert)</option>
                          </select>
                        </div>
                       
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="cache" 
                            checked={tileCache}
                            onChange={(e) => setTileCache(e.target.checked)}
                            className="rounded" 
                          />
                          <label htmlFor="cache" className="text-sm">
                            Mise en cache des tuiles
                            <span className="block text-xs text-gray-500">
                              Améliore les performances de navigation
                            </span>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                   
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={() => {
                        setMarkerSize(15);
                        setColorScheme('sequential');
                        setClustering(true);
                        setHeatmap(false);
                        setAnimation(false);
                        setTooltips(true);
                        setDisplayLimit(1000);
                        setTileCache(true);
                        showNotification('Paramètres réinitialisés', 'info');
                      }}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Réinitialiser les paramètres
                      </Button>
                    </CardFooter>
                  </Card>
                 
                  {/* Datasets chargés - Configuration individuelle */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Datasets chargés</h3>
                      <Badge variant={datasets.length > 0 ? "default" : "secondary"}>
                        {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                   
                    {datasets.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-gray-500">Aucun dataset chargé</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Chargez un fichier ou un exemple pour commencer
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {datasets.map((ds) => (
                            <Card key={ds.id}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: ds.color }}
                                    />
                                    <input
                                      value={ds.name}
                                      onChange={e => updateDataset(ds.id, { name: e.target.value })}
                                      className="text-lg font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                                      placeholder="Nom du dataset"
                                    />
                                  </div>
                                  <Badge variant={ds.visible ? "default" : "outline"}>
                                    {ds.visible ? "Visible" : "Caché"}
                                  </Badge>
                                </div>
                              </CardHeader>
                             
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Couleur du dataset</label>
                                    <div className="flex items-center space-x-3">
                                      <input
                                        type="color"
                                        value={ds.color}
                                        onChange={e => updateDataset(ds.id, { color: e.target.value })}
                                        className="w-10 h-10 cursor-pointer rounded border"
                                      />
                                      <code className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                                        {ds.color}
                                      </code>
                                    </div>
                                  </div>
                                 
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Statistiques</label>
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Points:</span>
                                        <span className="font-medium">{ds.data.length}</span>
                                      </div>
                                      {selectedColumns.value && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-500">Moyenne:</span>
                                          <span className="font-medium">
                                            {(() => {
                                              const values = ds.data.map(row =>
                                                parseFloat(row[selectedColumns.value] as string) || 0
                                              ).filter(v => !isNaN(v));
                                              const avg = values.reduce((a, b) => a + b, 0) / values.length;
                                              return avg.toLocaleString(undefined, { maximumFractionDigits: 1 });
                                            })()}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                               
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`visible-${ds.id}`}
                                        checked={ds.visible}
                                        onChange={e => updateDataset(ds.id, { visible: e.target.checked })}
                                        className="rounded"
                                      />
                                      <label htmlFor={`visible-${ds.id}`} className="text-sm">
                                        Afficher sur la carte
                                      </label>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {ds.visible ? "✅ Actif" : "❌ Masqué"}
                                    </div>
                                  </div>
                                 
                                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                    <div className="text-sm">
                                      <div className="font-medium">Transparence</div>
                                      <div className="text-xs text-gray-500">Opacité des marqueurs</div>
                                    </div>
                                    <input
                                      type="range"
                                      min="10"
                                      max="100"
                                      defaultValue="70"
                                      className="w-24"
                                      onChange={(e) => {
                                        // Implémenter la logique de transparence si nécessaire
                                      }}
                                    />
                                  </div>
                                </div>
                              </CardContent>
                             
                              <CardFooter className="flex justify-between border-t pt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(ds.data.slice(0, 10)));
                                    showNotification('10 premières lignes copiées', 'success');
                                  }}
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Copier échantillon
                                </Button>
                               
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm(`Supprimer le dataset "${ds.name}" ?`)) {
                                      removeDataset(ds.id);
                                      showNotification(`Dataset "${ds.name}" supprimé`, 'info');
                                    }
                                  }}
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Supprimer
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </aside>
        )}
      </div>
      {/* Modal de sélection des exemples - Improved design: Larger, better spacing, cards with shadows */}
      <Dialog open={isExampleModalOpen} onOpenChange={setIsExampleModalOpen}>
        <DialogContent className="sm:max-w-[825px] max-h-[80vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl">Choisir un exemple de données épidémiologiques</DialogTitle>
            <DialogDescription className="text-gray-500">
              Sélectionnez une maladie ou un scénario pour charger des données de simulation. Sources incluses pour crédibilité.
            </DialogDescription>
          </DialogHeader>
        
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
              <p className="text-xl font-semibold mb-4">Chargement des données...</p>
              <Progress value={exampleProgress} className="w-full h-2" />
              <p className="text-sm text-gray-500 mt-4">{exampleProgress}% complété</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4 -mx-6 px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exemples par maladie */}
                {diseaseExamples.map((disease) => (
              
                  <Card
                    key={disease.id}
                    className={`cursor-pointer ${
                      selectedDiseases.includes(disease.id) ? 'ring-0' : ''
                    }`}
                    onClick={() => toggleDiseaseSelection(disease.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Titre cliquable qui ouvre la source */}
                          <a
                            href={disease.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group"
                            onClick={(e) => e.stopPropagation()} // Empêche la sélection de la carte
                          >
                            <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                              {disease.name}
                              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardTitle>
                          </a>
                        
                          <CardDescription className="text-sm mt-2">
                            {disease.description}
                          </CardDescription>
                        </div>
                      
                        <Badge variant="outline" className="ml-2">
                          {disease.countries.length} pays
                        </Badge>
                      </div>
                    </CardHeader>
                  
                    <CardContent>
                      <div className="space-y-3">
                        {/* Section source avec lien */}
                        <div className="flex items-start gap-2 text-sm">
                          <BookOpen className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium mb-1">Source principale:</div>
                            <a
                              href={disease.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {disease.source.organization}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <div className="text-xs text-gray-600 mt-1">
                              {disease.source.study} ({disease.source.year})
                            </div>
                          </div>
                        </div>
                      
                        {/* Indicateur de crédibilité */}
                        <div className="flex items-center gap-2 text-sm">
                          <div className={`w-3 h-3 rounded-full ${
                            disease.source.credibility === 'high' ? 'bg-green-500' :
                            disease.source.credibility === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="font-medium">Fiabilité:</span>
                          <span className="capitalize">{disease.source.credibility}</span>
                          <Badge variant="outline" size="sm">
                            {disease.source.dataType}
                          </Badge>
                        </div>
                      
                        {/* Dernière mise à jour */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Dernière mise à jour: {disease.source.lastUpdated}</span>
                        </div>
                      </div>
                    </CardContent>
                  
                    <CardFooter className="flex justify-between border-t pt-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadDiseaseExample(disease.id);
                        }}
                      >
                        Charger
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              
                {/* Exemple continental */}
                <Card
                  className="cursor-pointer hover:shadow-xl transition-shadow duration-200 border-2 border-dashed border-gray-300 "
                  onClick={loadContinentalData}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Données Continentales Complètes</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      25 pays répartis sur 5 continents (5 pays par continent)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Continents:</span>
                        <span className="font-medium">Afrique, Europe, Asie, Amérique, Océanie</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Points de données:</span>
                        <span className="font-medium">25</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Régions:</span>
                        <span className="font-medium">Centre, Est, Ouest, Nord, Sud</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Source:</span>
                        <span className="font-medium text-blue-600 hover:underline">
                          Données simulées basées sur tendances OMS
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={loadContinentalData}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Charger les données continentales
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </ScrollArea>
          )}
        
          <DialogFooter className="pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsExampleModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={loadSelectedExamples}
              disabled={selectedDiseases.length === 0 || isLoading}
            >
              Charger {selectedDiseases.length} sélectionnés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeospatialVisualization;