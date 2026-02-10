import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as d3 from 'd3';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { ChevronRight } from 'lucide-react';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line, Bar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HexColorPicker } from 'react-colorful';
import Globe from 'globe.gl';
import {Link} from 'wouter'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, annotationPlugin);

// Options des graphiques
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#374151',
        font: {
          size: 11,
          family: "'Inter', sans-serif"
        },
        padding: 20,
        usePointStyle: true,
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#111827',
      bodyColor: '#4B5563',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      cornerRadius: 8,
      boxPadding: 6,
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(229, 231, 235, 0.3)',
        drawBorder: false
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 10,
          family: "'Inter', sans-serif"
        }
      }
    },
    y: {
      grid: {
        color: 'rgba(229, 231, 235, 0.3)',
        drawBorder: false
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 10,
          family: "'Inter', sans-serif"
        }
      }
    }
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2
    },
    point: {
      radius: 0,
      hoverRadius: 6
    }
  },
  interaction: {
    intersect: false,
    mode: 'index' as const
  }
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#111827',
      bodyColor: '#4B5563',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 10,
          family: "'Inter', sans-serif"
        }
      }
    },
    y: {
      grid: {
        color: 'rgba(229, 231, 235, 0.3)'
      },
      ticks: {
        color: '#6B7280',
        font: {
          size: 10,
          family: "'Inter', sans-serif"
        },
        callback: function(value: any) {
          return value + '%';
        }
      }
    }
  }
};

// Types et interfaces
type ModelType = 'SIR' | 'SEIR' | 'SEIRD' | 'SEIQRD' | 'CUSTOM';
interface Region {
  id: string;
  name: string;
  population: number;
  S: number;
  E: number;
  I: number;
  Q?: number;
  R: number;
  D?: number;
  latitude: number;
  longitude: number;
  color: string;
  connections: string[];
  cluster?: number;
}
interface SimulationParams {
  model: ModelType;
  beta: number;
  sigma: number;
  gamma: number;
  mu: number;
  delta: number;
  theta: number;
  R0: number;
  mobility: number;
}
interface Intervention {
  type: string;
  effectiveness: number;
  startDay: number;
}
interface Scenario {
  name: string;
  params: SimulationParams;
  interventions: Intervention[];
}
interface NetworkSettings {
  chargeStrength: number;
  linkDistance: number;
  enableClustering: boolean;
  nodeShape: 'circle' | 'square' | 'triangle';
  linkStyle: 'solid' | 'dashed';
}
interface MapSettings {
  markerShape: 'circle' | 'marker';
  markerOpacity: number;
  lineStyle: 'solid' | 'dashed';
  lineOpacity: number;
  tileTheme: 'light' | 'dark' | 'satellite';
  showLabels: boolean;
  zoomLevel: number;
}
interface ChartSettings {
  lineStyle: 'solid' | 'dashed';
  lineWidth: number;
  fillOpacity: number;
  showGrid: boolean;
  theme: 'light' | 'dark';
  showAnnotations: boolean;
}

const initialRegions: Region[] = [
  {
    id: 'idf',
    name: 'Île-de-France',
    population: 12000000,
    S: 11950000,
    E: 3000,
    I: 1500,
    R: 800,
    D: 100,
    latitude: 48.8566,
    longitude: 2.3522,
    color: '#3b82f6',
    connections: ['ara', 'nor', 'ger', 'uk'],
    cluster: 1
  },
  {
    id: 'ara',
    name: 'Auvergne-Rhône-Alpes',
    population: 8000000,
    S: 7995000,
    E: 200,
    I: 89,
    R: 50,
    D: 20,
    latitude: 45.7640,
    longitude: 4.8357,
    color: '#10b981',
    connections: ['idf', 'paca', 'occ', 'ita', 'ger'],
    cluster: 1
  },
  {
    id: 'paca',
    name: 'Provence-Alpes-Côte d\'Azur',
    population: 5000000,
    S: 4994500,
    E: 300,
    I: 120,
    R: 80,
    D: 40,
    latitude: 43.9352,
    longitude: 6.0679,
    color: '#f59e0b',
    connections: ['ara', 'occ', 'ita'],
    cluster: 1
  },
  {
    id: 'ger',
    name: 'Allemagne',
    population: 83000000,
    S: 82900000,
    E: 5000,
    I: 2500,
    R: 1500,
    D: 200,
    latitude: 52.52,
    longitude: 13.405,
    color: '#ef4444',
    connections: ['idf', 'ara', 'ita', 'spa', 'uk'],
    cluster: 2
  },
  {
    id: 'ita',
    name: 'Italie',
    population: 60000000,
    S: 59900000,
    E: 4000,
    I: 2000,
    R: 1000,
    D: 150,
    latitude: 41.9028,
    longitude: 12.4964,
    color: '#6b7280',
    connections: ['ara', 'paca', 'ger'],
    cluster: 2
  },
  {
    id: 'spa',
    name: 'Espagne',
    population: 47000000,
    S: 46950000,
    E: 2000,
    I: 1000,
    R: 500,
    D: 100,
    latitude: 40.4168,
    longitude: -3.7038,
    color: '#a855f7',
    connections: ['ger', 'uk', 'paca'],
    cluster: 3
  },
  {
    id: 'uk',
    name: 'Royaume-Uni',
    population: 67000000,
    S: 66900000,
    E: 3000,
    I: 1500,
    R: 800,
    D: 100,
    latitude: 51.5074,
    longitude: -0.1278,
    color: '#eab308',
    connections: ['idf', 'ger', 'spa'],
    cluster: 3
  },
  {
    id: 'nor',
    name: 'Normandie',
    population: 3300000,
    S: 3295000,
    E: 100,
    I: 50,
    R: 30,
    D: 10,
    latitude: 49.1829,
    longitude: -0.3707,
    color: '#22c55e',
    connections: ['idf', 'uk'],
    cluster: 1
  },
  {
    id: 'occ',
    name: 'Occitanie',
    population: 5900000,
    S: 5895000,
    E: 200,
    I: 100,
    R: 60,
    D: 20,
    latitude: 43.6047,
    longitude: 1.4442,
    color: '#ec4899',
    connections: ['ara', 'paca', 'spa'],
    cluster: 1
  }
];

const predefinedScenarios: Scenario[] = [
  {
    name: 'Base',
    params: {
      model: 'SEIRD',
      beta: 0.3,
      sigma: 0.2,
      gamma: 0.1,
      mu: 0.01,
      delta: 0.05,
      theta: 0.1,
      R0: 2.5,
      mobility: 0.1
    },
    interventions: []
  },
  {
    name: 'Confinement Strict',
    params: {
      model: 'SEIRD',
      beta: 0.3,
      sigma: 0.2,
      gamma: 0.1,
      mu: 0.01,
      delta: 0.05,
      theta: 0.1,
      R0: 2.5,
      mobility: 0.05
    },
    interventions: [
      { type: 'Confinement', effectiveness: 60, startDay: 10 }
    ]
  },
  {
    name: 'Vaccination Massive',
    params: {
      model: 'SEIRD',
      beta: 0.25,
      sigma: 0.2,
      gamma: 0.1,
      mu: 0.01,
      delta: 0.05,
      theta: 0.1,
      R0: 2.0,
      mobility: 0.1
    },
    interventions: [
      { type: 'Vaccination', effectiveness: 40, startDay: 30 },
      { type: 'Distanciation', effectiveness: 20, startDay: 5 }
    ]
  },
  {
    name: 'Intervention Tardive',
    params: {
      model: 'SEIRD',
      beta: 0.35,
      sigma: 0.2,
      gamma: 0.1,
      mu: 0.015,
      delta: 0.05,
      theta: 0.1,
      R0: 3.0,
      mobility: 0.15
    },
    interventions: [
      { type: 'Confinement', effectiveness: 50, startDay: 50 }
    ]
  }
];

const initialNetworkSettings: NetworkSettings = {
  chargeStrength: -200,
  linkDistance: 100,
  enableClustering: false,
  nodeShape: 'circle',
  linkStyle: 'solid'
};

const initialMapSettings: MapSettings = {
  markerShape: 'circle',
  markerOpacity: 0.8,
  lineStyle: 'solid',
  lineOpacity: 0.3,
  tileTheme: 'light',
  showLabels: true,
  zoomLevel: 5
};

const initialChartSettings: ChartSettings = {
  lineStyle: 'solid',
  lineWidth: 2,
  fillOpacity: 0.1,
  showGrid: true,
  theme: 'light',
  showAnnotations: true
};

const EpidemiologicalSimulation: React.FC = () => {
  const [regions, setRegions] = useState<Region[]>(initialRegions.map(r => ({ ...r })));
  const [history, setHistory] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('Base');
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>(initialNetworkSettings);
  const [mapSettings, setMapSettings] = useState<MapSettings>(initialMapSettings);
  const [chartSettings, setChartSettings] = useState<ChartSettings>(initialChartSettings);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [mapType, setMapType] = useState<'2d' | '3d'>('3d');
  const [activeModel, setActiveModel] = useState<ModelType>('SEIRD');
  const [params, setParams] = useState<SimulationParams>(predefinedScenarios[0].params);
  const [activeView, setActiveView] = useState<'map' | 'charts' | 'table' | 'network'>('map');
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [isComparisonParams, setIsComparisonParams] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonParams, setComparisonParams] = useState<SimulationParams | null>(null);
  const [comparisonHistory, setComparisonHistory] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<NodeJS.Timeout>();
  const globeInstanceRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();

  const models = {
    SIR: {
      name: 'SIR',
      compartments: ['S', 'I', 'R'],
      equations: (region: Region, params: SimulationParams) => {
        const N = region.population;
        const beta = params.beta;
        const gamma = params.gamma;
        
        const dS = -beta * region.S * region.I / N;
        const dI = beta * region.S * region.I / N - gamma * region.I;
        const dR = gamma * region.I;
        
        return { dS, dI, dR, dE: 0, dD: 0, dQ: 0 };
      }
    },
    SEIR: {
      name: 'SEIR',
      compartments: ['S', 'E', 'I', 'R'],
      equations: (region: Region, params: SimulationParams) => {
        const N = region.population;
        const beta = params.beta;
        const sigma = params.sigma;
        const gamma = params.gamma;
        
        const dS = -beta * region.S * region.I / N;
        const dE = beta * region.S * region.I / N - sigma * region.E;
        const dI = sigma * region.E - gamma * region.I;
        const dR = gamma * region.I;
        
        return { dS, dE, dI, dR, dD: 0, dQ: 0 };
      }
    },
    SEIRD: {
      name: 'SEIRD',
      compartments: ['S', 'E', 'I', 'R', 'D'],
      equations: (region: Region, params: SimulationParams) => {
        const N = region.population;
        const beta = params.beta;
        const sigma = params.sigma;
        const gamma = params.gamma;
        const mu = params.mu;
        
        const dS = -beta * region.S * region.I / N;
        const dE = beta * region.S * region.I / N - sigma * region.E;
        const dI = sigma * region.E - (gamma + mu) * region.I;
        const dR = gamma * region.I;
        const dD = mu * region.I;
        
        return { dS, dE, dI, dR, dD, dQ: 0 };
      }
    },
    SEIQRD: {
      name: 'SEIQRD',
      compartments: ['S', 'E', 'I', 'Q', 'R', 'D'],
      equations: (region: Region, params: SimulationParams) => {
        const N = region.population;
        const beta = params.beta;
        const sigma = params.sigma;
        const gamma = params.gamma;
        const mu = params.mu;
        const delta = params.delta;
        const theta = params.theta;
        
        const dS = -beta * region.S * region.I / N;
        const dE = beta * region.S * region.I / N - sigma * region.E;
        const dI = sigma * region.E - (gamma + mu + delta) * region.I;
        const dQ = delta * region.I - theta * (region.Q || 0);
        const dR = gamma * region.I + theta * (region.Q || 0);
        const dD = mu * region.I;
        
        return { dS, dE, dI, dR, dD, dQ };
      }
    }
  };

  const runFullSimulation = (simParams: SimulationParams, simInterventions: Intervention[]) => {
    let simRegions = initialRegions.map(r => ({ ...r }));
    let simHistory: any[] = [];
    let simDay = 0;
    const maxDays = 365;
    while (simDay < maxDays) {
      const activeInterventions = simInterventions.filter(i => simDay >= i.startDay);
      const reduction = activeInterventions.reduce((sum, i) => sum + i.effectiveness / 100, 0);
      const localParams = { ...simParams, beta: simParams.beta * (1 - reduction) };
      simRegions = simRegions.map(region => {
        const model = models[activeModel];
        const equations = model.equations(region, localParams);
        
        const mobilityEffect = simRegions
          .filter(r => region.connections.includes(r.id))
          .reduce((sum, r) => sum + (r.I / r.population - region.I / region.population) * localParams.mobility * region.population, 0);
        return {
          ...region,
          S: Math.max(0, region.S + equations.dS),
          E: Math.max(0, region.E + equations.dE),
          I: Math.max(0, region.I + equations.dI + mobilityEffect),
          R: Math.max(0, region.R + equations.dR),
          D: Math.max(0, (region.D || 0) + (equations.dD || 0)),
          Q: equations.dQ ? Math.max(0, (region.Q || 0) + equations.dQ) : region.Q
        };
      });
      const totals = simRegions.reduce((acc, region) => ({
        S: acc.S + region.S,
        E: acc.E + region.E,
        I: acc.I + region.I,
        R: acc.R + region.R,
        D: acc.D + (region.D || 0)
      }), { S: 0, E: 0, I: 0, R: 0, D: 0 });
      simHistory.push({ day: simDay, totals, regions: simRegions.map(r => ({ ...r })) });
      simDay++;
    }
    return simHistory;
  };

  const handleMapTypeChange = (newType: '2d' | '3d') => {
    if (mapType === newType) return;
    
    setIsTransitioning(true);
    if (mapRef.current) {
      mapRef.current.style.opacity = '0.5';
      mapRef.current.style.transition = 'opacity 0.3s ease-in-out';
    }
    
    setTimeout(() => {
      setMapType(newType);
      setIsTransitioning(false);
      if (mapRef.current) {
        mapRef.current.style.opacity = '1';
      }
    }, 300);
  };

  const animateGlobeData = () => {
    if (!globeInstanceRef.current || mapType !== '3d' || activeView !== 'map') return;
    
    const globe = globeInstanceRef.current;
    const pointsData = regions.map(region => {
      const infectionRate = region.I / region.population;
      let color = region.color;
      if (infectionRate > 0.01) color = '#ef4444';
      else if (infectionRate > 0.001) color = '#f59e0b';
      
      return {
        lat: region.latitude,
        lng: region.longitude,
        size: Math.sqrt(region.population) / 300000,
        color: color,
        name: region.name,
        population: region.population,
        I: region.I,
        D: region.D || 0,
        pulse: Math.sin(Date.now() * 0.001 + region.id.length) * 0.1 + 1
      };
    });
    
    globe.pointsData(pointsData);
    
    const arcsData: any[] = [];
    regions.forEach(region => {
      region.connections.forEach(targetId => {
        const target = regions.find(r => r.id === targetId);
        if (target) {
          const flowIntensity = Math.min(1, (region.I + target.I) / (region.population + target.population) * 100);
          arcsData.push({
            startLat: region.latitude,
            startLng: region.longitude,
            endLat: target.latitude,
            endLng: target.longitude,
            color: `rgba(148, 163, 184, ${0.3 + flowIntensity * 0.7})`,
            stroke: params.mobility * (0.5 + flowIntensity),
            dashLength: 0.2 + Math.sin(Date.now() * 0.001) * 0.1
          });
        }
      });
    });
    
    globe.arcsData(arcsData);
  };

  useEffect(() => {
    if (activeView !== 'map' || !mapRef.current) return;
    
    const hasCoordinates = regions.every(r => r.latitude !== 0 && r.longitude !== 0);
    if (!hasCoordinates) {
      mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-600">Pas de coordonnées géographiques disponibles pour les régions.</div>';
      return;
    }
    
    if (globeInstanceRef.current) {
      globeInstanceRef.current._destructor?.();
      globeInstanceRef.current = null;
    }
    
    mapRef.current.innerHTML = '';
    let map: any;
    
    if (mapType === '2d') {
      map = L.map(mapRef.current).setView([46.2276, 2.2137], mapSettings.zoomLevel);
      let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      if (mapSettings.tileTheme === 'dark') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
      } else if (mapSettings.tileTheme === 'satellite') {
        tileUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
      }
      L.tileLayer(tileUrl, {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      regions.forEach(region => {
        const infectionRate = region.I / region.population;
        let fillColor = region.color;
        if (infectionRate > 0.01) fillColor = '#ef4444';
        else if (infectionRate > 0.001) fillColor = '#f59e0b';
        let marker;
        if (mapSettings.markerShape === 'circle') {
          marker = L.circleMarker([region.latitude, region.longitude], {
            radius: Math.sqrt(region.population) / 300,
            color: fillColor,
            fillColor: fillColor,
            fillOpacity: mapSettings.markerOpacity
          }).addTo(map);
        } else {
          marker = L.marker([region.latitude, region.longitude], {
            icon: L.icon({
              iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-green.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            }),
            opacity: mapSettings.markerOpacity
          }).addTo(map);
        }
        marker.bindPopup(`
          <strong>${region.name}</strong><br/>
          Population: ${region.population.toLocaleString()}<br/>
          Infectés: ${Math.round(region.I)} (${(region.I/region.population*100).toFixed(2)}%)<br/>
          Décès: ${region.D || 0}<br/>
          R₀ local: ${(params.beta/params.gamma).toFixed(2)}
        `);
        if (mapSettings.showLabels) {
          L.tooltip({
            permanent: true,
            direction: 'top',
            className: 'text-xs'
          }).setContent(region.name).setLatLng([region.latitude, region.longitude]).addTo(map);
        }
        region.connections.forEach(targetId => {
          const target = regions.find(r => r.id === targetId);
          if (target) {
            L.polyline([[region.latitude, region.longitude], [target.latitude, target.longitude]], {
              color: '#94a3b8',
              weight: params.mobility * 5,
              opacity: mapSettings.lineOpacity,
              dashArray: mapSettings.lineStyle === 'dashed' ? '5,5' : null
            }).addTo(map);
          }
        });
      });
      
      const legend = L.control({ position: 'bottomright' });
      legend.onAdd = () => {
        const div = L.DomUtil.create('div', 'info legend bg-white p-2 rounded shadow');
        div.innerHTML = `
          <h4>Légende</h4>
          <i style="background: green; width: 18px; height: 18px; display: inline-block; border-radius: 50%;"></i> Faible infection<br>
          <i style="background: orange; width: 18px; height: 18px; display: inline-block; border-radius: 50%;"></i> Moyenne infection<br>
          <i style="background: red; width: 18px; height: 18px; display: inline-block; border-radius: 50%;"></i> Haute infection<br>
          Taille ~ √Population<br>
          Lignes: Mobilité
        `;
        return div;
      };
      legend.addTo(map);
    } else {
      const globeContainer = document.createElement('div');
      globeContainer.style.width = '100%';
      globeContainer.style.height = '100%';
      globeContainer.style.position = 'absolute';
      globeContainer.style.top = '0';
      globeContainer.style.left = '0';
      mapRef.current.appendChild(globeContainer);

      const getPointColor = (region: Region) => {
        const infectionRate = region.I / region.population;
        if (infectionRate > 0.01) return '#ef4444';
        if (infectionRate > 0.001) return '#f59e0b';
        return region.color;
      };

      const pointsData = regions.map(region => ({
        lat: region.latitude,
        lng: region.longitude,
        size: Math.sqrt(region.population) / 300000,
        color: getPointColor(region),
        name: region.name,
        population: region.population,
        I: region.I,
        D: region.D || 0
      }));

      const arcsData: any[] = [];
      regions.forEach(region => {
        region.connections.forEach(targetId => {
          const target = regions.find(r => r.id === targetId);
          if (target) {
            arcsData.push({
              startLat: region.latitude,
              startLng: region.longitude,
              endLat: target.latitude,
              endLng: target.longitude,
              color: '#94a3b8',
              stroke: params.mobility * 0.5
            });
          }
        });
      });

      const myGlobe = Globe()(globeContainer)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .pointOfView({ lat: 48.0, lng: 2.0, altitude: 1.5 })
        .onGlobeReady(() => {
          myGlobe.controls().autoRotate = true;
          myGlobe.controls().autoRotateSpeed = 0.3;
          myGlobe.controls().enableZoom = true;
          myGlobe.controls().enablePan = true;
          setTimeout(() => {
            myGlobe.pointOfView({ lat: 48.0, lng: 2.0, altitude: 1.5 }, 2000);
          }, 500);
        })
        .pointsData(pointsData)
        .pointAltitude('size')
        .pointColor('color')
        .pointRadius(0.5)
        .pointsTransitionDuration(2000)
        .pointLabel((d: any) => `
          <div style="background: white; padding: 8px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 200px;">
            <strong>${d.name}</strong><br/>
            Population: ${d.population.toLocaleString()}<br/>
            Infectés: ${Math.round(d.I)}<br/>
            Décès: ${Math.round(d.D)}
          </div>
        `)
        .arcsData(arcsData)
        .arcColor('color')
        .arcStroke('stroke')
        .arcDashLength(mapSettings.lineStyle === 'dashed' ? 0.5 : 0)
        .arcDashGap(mapSettings.lineStyle === 'dashed' ? 0.1 : 0)
        .arcDashAnimateTime(3000)
        .arcAltitudeAutoScale(0.3)
        .atmosphereColor('#3a0ca3')
        .atmosphereAltitude(0.2)
        .pointResolution(window.innerWidth < 768 ? 8 : 16);

      globeInstanceRef.current = myGlobe;
      globeContainer.style.opacity = '0';
      setTimeout(() => {
        globeContainer.style.transition = 'opacity 0.5s ease-in-out';
        globeContainer.style.opacity = '1';
      }, 100);
    }

    return () => {
      if (mapType === '2d') {
        map?.remove();
      } else {
        if (globeInstanceRef.current) {
          try {
            globeInstanceRef.current._destructor?.();
          } catch (e) {
            console.log('Cleanup du globe:', e);
          }
          globeInstanceRef.current = null;
        }
      }
    };
  }, [regions, activeView, params.mobility, mapSettings, mapType]);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mapType === '3d' && isRunning && activeView === 'map') {
      const animate = () => {
        animateGlobeData();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mapType, isRunning, regions, params.mobility, activeView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (activeView === 'map') {
        if (e.key === '2') {
          handleMapTypeChange('2d');
          e.preventDefault();
        } else if (e.key === '3') {
          handleMapTypeChange('3d');
          e.preventDefault();
        }
      }
      if (activeView === 'map' && mapType === '3d') {
        switch (e.key) {
          case 'ArrowLeft':
            rotateGlobe('left');
            e.preventDefault();
            break;
          case 'ArrowRight':
            rotateGlobe('right');
            e.preventDefault();
            break;
          case 'ArrowUp':
            rotateGlobe('up');
            e.preventDefault();
            break;
          case 'ArrowDown':
            rotateGlobe('down');
            e.preventDefault();
            break;
          case 'r':
          case 'R':
            if (globeInstanceRef.current) {
              globeInstanceRef.current.pointOfView(
                { lat: 48.0, lng: 2.0, altitude: 1.5 },
                1000
              );
            }
            e.preventDefault();
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mapType, activeView]);

  useEffect(() => {
    if (activeView !== 'network' || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    svg.selectAll('*').remove();
    
    const links = regions.flatMap(region =>
      region.connections.map(targetId => ({ source: region.id, target: targetId }))
    );
    
    const simulation = d3.forceSimulation<Region>(regions)
      .force('link', d3.forceLink<Region, { source: string; target: string }>(links).id(d => d.id).distance(networkSettings.linkDistance).strength(0.1))
      .force('charge', d3.forceManyBody().strength(networkSettings.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => Math.sqrt(d.population) / 300 + 5));
    
    if (networkSettings.enableClustering && regions.some(r => r.cluster !== undefined)) {
      simulation.force('cluster', alpha => {
        regions.forEach(node => {
          if (node.cluster !== undefined) {
            const clusterNodes = regions.filter(n => n.cluster === node.cluster);
            const cx = d3.mean(clusterNodes, d => d.x || 0) || 0;
            const cy = d3.mean(clusterNodes, d => d.y || 0) || 0;
            node.vx! -= (node.x! - cx) * 0.05 * alpha;
            node.vy! -= (node.y! - cy) * 0.05 * alpha;
          }
        });
      });
    }
    
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', d => params.mobility * 5)
      .attr('stroke-dasharray', networkSettings.linkStyle === 'dashed' ? '5,5' : 'none');
    
    const node = svg.append('g')
      .selectAll('path')
      .data(regions)
      .enter()
      .append('path')
      .attr('d', d => {
        const size = Math.sqrt(d.population) / 300;
        if (networkSettings.nodeShape === 'square') {
          return `M ${-size/2} ${-size/2} L ${size/2} ${-size/2} L ${size/2} ${size/2} L ${-size/2} ${size/2} Z`;
        } else if (networkSettings.nodeShape === 'triangle') {
          return `M 0 ${-size} L ${size} ${size} L ${-size} ${size} Z`;
        } else {
          return d3.symbol(d3.symbolCircle, size * size * Math.PI)();
        }
      })
      .attr('fill', d => {
        const infectionRate = d.I / d.population;
        if (infectionRate > 0.01) return '#ef4444';
        if (infectionRate > 0.001) return '#f59e0b';
        return d.color;
      })
      .call(d3.drag<SVGPathElement, Region>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );
    
    const labels = svg.append('g')
      .selectAll('text')
      .data(regions)
      .enter()
      .append('text')
      .text(d => d.name)
      .attr('font-size', '10px')
      .attr('dx', 12)
      .attr('dy', '.35em');
    
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);
      node
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
      labels
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0);
    });
  }, [regions, activeView, params.mobility, networkSettings]);

  const simulateStep = () => {
    const activeInterventions = interventions.filter(i => currentDay >= i.startDay);
    const reduction = activeInterventions.reduce((sum, i) => sum + i.effectiveness / 100, 0);
    const localParams = { ...params, beta: params.beta * (1 - reduction) };
    
    setRegions(prev => prev.map(region => {
      const model = models[activeModel];
      const equations = model.equations(region, localParams);
      
      const mobilityEffect = prev
        .filter(r => region.connections.includes(r.id))
        .reduce((sum, r) => sum + (r.I / r.population - region.I / region.population) * localParams.mobility * region.population, 0);
      
      return {
        ...region,
        S: Math.max(0, region.S + equations.dS),
        E: Math.max(0, region.E + equations.dE),
        I: Math.max(0, region.I + equations.dI + mobilityEffect),
        R: Math.max(0, region.R + equations.dR),
        D: Math.max(0, (region.D || 0) + (equations.dD || 0)),
        Q: equations.dQ ? Math.max(0, (region.Q || 0) + equations.dQ) : region.Q
      };
    }));
    
    setCurrentDay(prev => prev + 1);
  };

  useEffect(() => {
    if (isRunning) {
      simulationRef.current = setInterval(simulateStep, 1000 / speed);
    }
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [isRunning, speed, activeModel, params, interventions, currentDay]);

  useEffect(() => {
    const totals = regions.reduce((acc, region) => ({
      S: acc.S + region.S,
      E: acc.E + region.E,
      I: acc.I + region.I,
      R: acc.R + region.R,
      D: acc.D + (region.D || 0)
    }), { S: 0, E: 0, I: 0, R: 0, D: 0 });
    
    setHistory(prev => [...prev, {
      day: currentDay,
      totals,
      regions: regions.map(r => ({ ...r }))
    }]);
  }, [currentDay]);

  const applyScenario = (scenarioName: string) => {
    const scenario = predefinedScenarios.find(s => s.name === scenarioName);
    if (scenario) {
      setParams(scenario.params);
      setInterventions(scenario.interventions);
      setIsRunning(false);
      setCurrentDay(0);
      setHistory([]);
      setRegions(initialRegions.map(r => ({ ...r })));
    }
  };

  const exportData = () => {
    const csvData = history.map(h => ({ day: h.day, ...h.totals }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'simulation_history.csv';
    link.click();
  };

  const exportFullState = () => {
    const state = {
      regions,
      history,
      currentDay,
      params,
      interventions,
      activeModel,
      networkSettings,
      mapSettings,
      chartSettings
    };
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'simulation_state.json';
    link.click();
  };

  const importFullState = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const state = JSON.parse(e.target?.result as string);
      setRegions(state.regions);
      setHistory(state.history);
      setCurrentDay(state.currentDay);
      setParams(state.params);
      setInterventions(state.interventions);
      setActiveModel(state.activeModel);
      setNetworkSettings(state.networkSettings || initialNetworkSettings);
      setMapSettings(state.mapSettings || initialMapSettings);
      setChartSettings(state.chartSettings || initialChartSettings);
    };
    reader.readAsText(file);
  };

  const getChartDatasets = (hist: any[], labelSuffix: string = '', borderDash: number[] = []) => [
    {
      label: 'Susceptibles' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.S),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      borderDash: chartSettings.lineStyle === 'dashed' ? [5, 5] : borderDash,
      borderWidth: chartSettings.lineWidth,
      fill: true,
      tension: 0.4
    },
    {
      label: 'Exposés' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.E),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
      borderDash: chartSettings.lineStyle === 'dashed' ? [5, 5] : borderDash,
      borderWidth: chartSettings.lineWidth,
      fill: true,
      tension: 0.4
    },
    {
      label: 'Infectés' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.I),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
      borderDash: chartSettings.lineStyle === 'dashed' ? [5, 5] : borderDash,
      borderWidth: chartSettings.lineWidth,
      fill: true,
      tension: 0.4
    },
    {
      label: 'Guéris' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.R),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
      borderDash: chartSettings.lineStyle === 'dashed' ? [5, 5] : borderDash,
      borderWidth: chartSettings.lineWidth,
      fill: true,
      tension: 0.4
    },
    {
      label: 'Décès' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.D),
      borderColor: '#6b7280',
      backgroundColor: 'rgba(107, 114, 128, 0.05)',
      borderDash: chartSettings.lineStyle === 'dashed' ? [5, 5] : borderDash,
      borderWidth: chartSettings.lineWidth,
      fill: true,
      tension: 0.4
    }
  ];

  const chartData = {
    labels: history.slice(-100).map(h => `J${h.day}`),
    datasets: isComparing
      ? [...getChartDatasets(history), ...getChartDatasets(comparisonHistory, ' (Comparaison)', [5, 5])]
      : getChartDatasets(history)
  };

  const barData = {
    labels: regions.map(r => r.name),
    datasets: [{
      label: 'Taux d\'infection (%)',
      data: regions.map(r => (r.I / r.population) * 100),
      backgroundColor: regions.map(r => r.color + '80'),
      borderColor: regions.map(r => r.color),
      borderWidth: 1,
      borderRadius: 6,
      hoverBackgroundColor: regions.map(r => r.color)
    }]
  };

  const chartAnnotations = interventions.map((int, index) => ({
    type: 'line',
    xMin: int.startDay,
    xMax: int.startDay,
    borderColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    label: {
      content: `${int.type} (${int.effectiveness}%)`,
      display: true,
      position: 'start',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      color: 'black'
    }
  }));

  const indicators = {
    currentInfections: Math.round(regions.reduce((sum, r) => sum + r.I, 0)),
    totalDeaths: Math.round(regions.reduce((sum, r) => sum + (r.D || 0), 0)),
    effectiveR: (params.beta / params.gamma * (1 - interventions.reduce((sum, i) => sum + i.effectiveness, 0) / 100)).toFixed(2),
    peakDay: history.length > 10 ? history.reduce((max, h) => h.totals.I > max.totals.I ? h : max).day : 0,
    healthcarePressure: (regions.reduce((sum, r) => sum + r.I, 0) / 1000).toFixed(1)
  };

  const changeRegionColor = (id: string, newColor: string) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, color: newColor } : r));
  };

  const changeRegionName = (id: string, newName: string) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, name: newName } : r));
  };

  const changeRegionCluster = (id: string, newCluster: number) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, cluster: newCluster } : r));
  };

  const rotateGlobe = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (!globeInstanceRef.current) return;
    
    const globe = globeInstanceRef.current;
    const pov = globe.pointOfView();
    const step = direction.includes('left') || direction.includes('right') ? 15 : 10;
    
    globe.controls().autoRotate = false;
    
    switch (direction) {
      case 'left':
        pov.lng -= step;
        break;
      case 'right':
        pov.lng += step;
        break;
      case 'up':
        pov.lat = Math.min(85, pov.lat + step);
        break;
      case 'down':
        pov.lat = Math.max(-85, pov.lat - step);
        break;
    }
    
    globe.pointOfView(pov, 500);
    
    setTimeout(() => {
      if (globeInstanceRef.current) {
        globeInstanceRef.current.controls().autoRotate = true;
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div id="tooltip" className="fixed bg-white p-3 rounded-lg shadow-xl border pointer-events-none opacity-0 z-50 transition-opacity">
      </div>
      
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
          <nav aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link href="/" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                    Accueil
                  </Link>
                </li>
                <li>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </li>
                <li>
                  <Link href="/workspace" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                    Tableau de Bord
                  </Link>
                </li>
                
              </ol>
         </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
  
            {/* --- GROUPE : ANALYSE & MODE --- */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsComparisonParams(true);
                  setShowParamsModal(true);
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isComparing 
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isComparing && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isComparing ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
                </span>
                {isComparing ? 'Mode Comparaison Actif' : 'Comparer Simulations'}
              </button>

              <button
                onClick={() => setShowExplanationModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Explications
              </button>
            </div>

            {/* --- GROUPE : DONNÉES (Import/Export) --- */}
            <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
              <button
                onClick={() => setShowDataModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-emerald-600 rounded-xl transition-all text-xs font-bold uppercase tracking-tight"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Importer
              </button>

              <div className="w-px h-4 bg-slate-200 mx-1" /> {/* Séparateur vertical */}

              <button
                onClick={exportData}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-xs font-bold uppercase tracking-tight"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                CSV
              </button>

              <button
                onClick={exportFullState}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-xs font-bold uppercase tracking-tight"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                JSON
              </button>
            </div>

          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mb-8">
          
          {/* --- SÉLECTEUR DE MODÈLE (Segmented Control) --- */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl items-center border border-slate-200/50">
            {(['SIR', 'SEIR', 'SEIRD', 'SEIQRD'] as ModelType[]).map(model => (
              <button
                key={model}
                onClick={() => setActiveModel(model)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeModel === model
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {model}
              </button>
            ))}
          </div>

          {/* --- BOUTON PARAMÈTRES (Style Minimal) --- */}
          <button
            onClick={() => setShowParamsModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-sm font-medium">Réglages</span>
          </button>

          {/* --- SÉLECTEUR DE SCÉNARIO (Stylisé) --- */}
          <div className="flex items-center gap-3 ml-auto bg-white border border-slate-200 pl-4 pr-2 py-1.5 rounded-xl shadow-sm">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-100 pr-3">
              Scénario
            </label>
            <div className="relative flex items-center">
              <select
                value={selectedScenario}
                onChange={(e) => {
                  setSelectedScenario(e.target.value);
                  applyScenario(e.target.value);
                }}
                className="appearance-none bg-transparent pr-8 pl-1 py-0.5 text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer z-10"
              >
                {predefinedScenarios.map(sc => (
                  <option key={sc.name} value={sc.name}>{sc.name}</option>
                ))}
              </select>
              {/* Icône de flèche personnalisée pour remplacer celle du navigateur */}
              <svg className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

        </div>

      </header>
      
     
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        {[
          { label: 'Jour', value: currentDay },
          { label: 'Infectés Actifs', value: indicators.currentInfections.toLocaleString() },
          { label: 'R₀ Effectif', value: indicators.effectiveR },
          { label: 'Pic (Jour)', value: indicators.peakDay },
          { label: 'Pression Soins', value: `${indicators.healthcarePressure}/1000` }
        ].map((indicator, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative overflow-hidden bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0,02)] group hover:shadow-md transition-shadow duration-300"
          >
            {/* Barre d'accentuation latérale ultra-fine */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicator.color} opacity-60`} />
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest uppercase">
                {indicator.label}
              </span>
              
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">
                  {indicator.value}
                </span>
                {/* Petit point de rappel de couleur */}
                <div className={`w-1.5 h-1.5 rounded-full ${indicator.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm p-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* --- BLOC LECTURE & RÉINITIALISATION --- */}
          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-full border border-slate-100">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                isRunning 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700'
              }`}
            >
              {isRunning ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  <span className="text-sm">Pause</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <span className="text-sm">Démarrer</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsRunning(false);
                setCurrentDay(0);
                setHistory([]);
                setRegions(initialRegions.map(r => ({ ...r })));
              }}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-full transition-all"
              title="Réinitialiser"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* --- BLOC VUES (NAVIGATION) --- */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl items-center">
            {[
              { id: 'map', label: 'Carte', icon: <path d="M9 20l-5-2V4l5 2m0 14l6-2m-6 2V6m6 12l5 2V6l-5-2m0 14V4" /> },
              { id: 'charts', label: 'Stats', icon: <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
              { id: 'table', label: 'Liste', icon: <path d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
              { id: 'network', label: 'Flux', icon: <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /> }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeView === view.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {view.icon}
                </svg>
                {view.label}
              </button>
            ))}
          </div>

          {/* --- BLOC RÉGLAGES ET ACTION --- */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vitesse</span>
              <input
                type="range"
                min="1" max="10"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-600 w-6">{speed}x</span>
            </div>

            <button
              onClick={() => setShowInterventionModal(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              <div className="p-0.5 bg-slate-700 rounded-full group-hover:bg-indigo-500 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-medium">Intervention</span>
            </button>
          </div>

        </div>
      </div>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* --- ZONE DE VISUALISATION (COL 2/3) --- */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative h-[600px] flex flex-col">
          
          {/* BOUTON PARAMÈTRES UNIQUE & SOFT */}
          <div className="absolute top-4 right-4 z-40">
            <button
              onClick={() => setShowSidePanel(!showSidePanel)}
              className={`p-3 rounded-2xl backdrop-blur-md transition-all duration-300 border shadow-xl ${
                showSidePanel 
                  ? 'bg-slate-900 text-white border-slate-900 rotate-90' 
                  : 'bg-white/80 text-slate-500 border-slate-200 hover:text-indigo-600'
              }`}
            >
              {showSidePanel ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              )}
            </button>
          </div>

          {/* PANNEAU LATÉRAL DE RÉGLAGES (SIDE PANEL) */}
          <div className={`absolute top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-2xl border-l border-slate-100 z-30 transform transition-transform duration-500 ease-in-out shadow-2xl ${showSidePanel ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-8 pt-20 h-full overflow-y-auto">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Configuration Vue</h3>
              
              {/* Contenu dynamique du panneau selon la vue */}
              <div className="space-y-8">
                {activeView === 'map' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 font-medium">Type de Projection</p>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                      <button onClick={() => handleMapTypeChange('2d')} className={`py-2 text-xs rounded-lg transition-all ${mapType === '2d' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>Plat (2D)</button>
                      <button onClick={() => handleMapTypeChange('3d')} className={`py-2 text-xs rounded-lg transition-all ${mapType === '3d' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>Globe (3D)</button>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 font-medium">Thème Carte</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['light', 'dark', 'satellite'].map(theme => (
                          <button
                            key={theme}
                            onClick={() => setMapSettings(prev => ({ ...prev, tileTheme: theme as any }))}
                            className={`py-2 text-xs rounded-lg transition-all ${mapSettings.tileTheme === theme ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {theme === 'light' ? 'Clair' : theme === 'dark' ? 'Sombre' : 'Satellite'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {activeView === 'charts' && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-2">Style des Lignes</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setChartSettings(prev => ({ ...prev, lineStyle: 'solid' }))}
                          className={`py-2 text-xs rounded-lg ${chartSettings.lineStyle === 'solid' ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Continue
                        </button>
                        <button
                          onClick={() => setChartSettings(prev => ({ ...prev, lineStyle: 'dashed' }))}
                          className={`py-2 text-xs rounded-lg ${chartSettings.lineStyle === 'dashed' ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Pointillée
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-2">Épaisseur</p>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={chartSettings.lineWidth}
                        onChange={(e) => setChartSettings(prev => ({ ...prev, lineWidth: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Fine</span>
                        <span>Épaisse</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-2">Opacité Remplissage</p>
                      <input
                        type="range"
                        min="0"
                        max="0.3"
                        step="0.05"
                        value={chartSettings.fillOpacity}
                        onChange={(e) => setChartSettings(prev => ({ ...prev, fillOpacity: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>Transparent</span>
                        <span>Opaque</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-700">Afficher la grille</span>
                      <button
                        onClick={() => setChartSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                        className={`w-12 h-6 rounded-full transition-all ${chartSettings.showGrid ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${chartSettings.showGrid ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                )}
                
                {activeView === 'network' && (
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-2">Forme des Nœuds</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['circle', 'square', 'triangle'].map(shape => (
                          <button
                            key={shape}
                            onClick={() => setNetworkSettings(prev => ({ ...prev, nodeShape: shape as any }))}
                            className={`py-2 text-xs rounded-lg transition-all ${networkSettings.nodeShape === shape ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {shape === 'circle' ? 'Cercle' : shape === 'square' ? 'Carré' : 'Triangle'}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-2">Style des Liens</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setNetworkSettings(prev => ({ ...prev, linkStyle: 'solid' }))}
                          className={`py-2 text-xs rounded-lg ${networkSettings.linkStyle === 'solid' ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Continue
                        </button>
                        <button
                          onClick={() => setNetworkSettings(prev => ({ ...prev, linkStyle: 'dashed' }))}
                          className={`py-2 text-xs rounded-lg ${networkSettings.linkStyle === 'dashed' ? 'bg-indigo-100 text-indigo-600 font-bold' : 'bg-slate-100 text-slate-600'}`}
                        >
                          Pointillée
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-2">Force Répulsion</p>
                      <input
                        type="range"
                        min="-500"
                        max="-50"
                        value={networkSettings.chargeStrength}
                        onChange={(e) => setNetworkSettings(prev => ({ ...prev, chargeStrength: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-700">Activer clustering</span>
                      <button
                        onClick={() => setNetworkSettings(prev => ({ ...prev, enableClustering: !prev.enableClustering }))}
                        className={`w-12 h-6 rounded-full transition-all ${networkSettings.enableClustering ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${networkSettings.enableClustering ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ZONE DE CONTENU PRINCIPALE */}
          <div className="flex-1 relative bg-slate-50">
            
            {/* VUE MAP (2D/3D) */}
            {activeView === 'map' && (
              <div className="h-full w-full relative animate-in fade-in duration-700">
                {isTransitioning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] z-20">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div ref={mapRef} className="h-full w-full" style={{ opacity: isTransitioning ? 0.6 : 1 }} />
                
                {/* HUD de rotation 3D */}
                {mapType === '3d' && (
                  <div className="absolute bottom-6 left-6 flex flex-col items-center gap-1 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xl">
                    <button onClick={() => rotateGlobe('up')} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">↑</button>
                    <div className="flex gap-1">
                      <button onClick={() => rotateGlobe('left')} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">←</button>
                      <button onClick={() => rotateGlobe('right')} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">→</button>
                    </div>
                    <button onClick={() => rotateGlobe('down')} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all">↓</button>
                  </div>
                )}
              </div>
            )}

            {/* VUE CHARTS */}
            {activeView === 'charts' && (
              <div className="h-full w-full p-8 overflow-y-auto space-y-8 animate-in slide-in-from-bottom-4">
                <div className="h-[300px] bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Évolution des Compartiments</h3>
                  <Line data={chartData} options={chartOptions} />
                </div>
                <div className="h-[250px] bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Taux d'Infection par Région</h3>
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            )}

            {/* VUE TABLE */}
            {activeView === 'table' && (
              <div className="h-full w-full overflow-y-auto animate-in fade-in">
                <div className="bg-white rounded-2xl m-4">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800">Données Détailées par Région</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Région</th>
                          <th className="px-6 py-4 font-bold text-slate-800 text-center">S</th>
                          <th className="px-6 py-4 font-bold text-slate-800 text-center">E</th>
                          <th className="px-6 py-4 font-bold text-slate-800 text-center">I</th>
                          {activeModel.includes('Q') && <th className="px-6 py-4 font-bold text-slate-800 text-center">Q</th>}
                          <th className="px-6 py-4 font-bold text-slate-800 text-center">R</th>
                          {activeModel.includes('D') && <th className="px-6 py-4 font-bold text-slate-800 text-center">D</th>}
                          <th className="px-6 py-4 font-bold text-slate-800 text-right">Taux</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {regions.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-700">{r.name}</td>
                            <td className="px-6 py-4 text-center font-mono text-blue-600">{Math.round(r.S).toLocaleString()}</td>
                            <td className="px-6 py-4 text-center font-mono text-amber-600">{Math.round(r.E).toLocaleString()}</td>
                            <td className="px-6 py-4 text-center font-mono text-rose-600 font-bold">{Math.round(r.I).toLocaleString()}</td>
                            {activeModel.includes('Q') && <td className="px-6 py-4 text-center font-mono text-violet-600">{Math.round(r.Q || 0).toLocaleString()}</td>}
                            <td className="px-6 py-4 text-center font-mono text-emerald-600">{Math.round(r.R).toLocaleString()}</td>
                            {activeModel.includes('D') && <td className="px-6 py-4 text-center font-mono text-slate-600">{Math.round(r.D || 0).toLocaleString()}</td>}
                            <td className="px-6 py-4 text-right font-bold text-slate-700">
                              <span className="inline-block px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-xs">
                                {((r.I / r.population) * 100).toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VUE NETWORK */}
            {activeView === 'network' && (
              <div className="h-full w-full relative">
                <svg ref={svgRef} className="w-full h-full" />
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-xs text-slate-700">Haute infection</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-slate-700">Infection modérée</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span className="text-xs text-slate-700">Faible infection</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- DÉTAILS DU MODÈLE (COL 1/3) --- */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 h-[600px] flex flex-col overflow-hidden animate-in slide-in-from-right-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Analyse {activeModel}</h2>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold uppercase">{activeModel}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            {/* Paramètres Clés */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'β Trans.', value: params.beta, color: 'bg-amber-50 text-amber-600' },
                { label: 'γ Guérison', value: params.gamma, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'σ Incubation', value: params.sigma, color: 'bg-blue-50 text-blue-600' },
                { label: 'μ Mortalité', value: params.mu, color: 'bg-rose-50 text-rose-600' }
              ].map((item, idx) => (
                <div key={idx} className={`${item.color} p-3 rounded-2xl border border-current/10`}>
                  <div className="text-[10px] uppercase font-bold opacity-70 mb-1">{item.label}</div>
                  <div className="text-lg font-black font-mono">{item.value.toFixed(3)}</div>
                </div>
              ))}
            </div>

            {/* Interventions Actives */}
            {interventions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interventions Actives</h3>
                <div className="space-y-2">
                  {interventions.map((intervention, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700">{intervention.type}</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          J{intervention.startDay}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Efficacité: <span className="font-bold">{intervention.effectiveness}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des Régions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Régions actives</h3>
              {regions.map(region => (
                <div key={region.id} className="p-4 rounded-2xl border border-slate-50 hover:border-indigo-100 transition-all bg-slate-50/30 group">
                  <div className="flex justify-between items-center mb-2">
                    <input
                      type="text"
                      value={region.name}
                      onChange={(e) => changeRegionName(region.id, e.target.value)}
                      className="bg-transparent font-bold text-slate-700 outline-none w-2/3 focus:text-indigo-600 transition-colors"
                    />
                    <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: region.color }} />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] text-slate-400 font-mono">
                      Pop: {region.population.toLocaleString()}
                    </div>
                    <button 
                      onClick={() => setSelectedRegionId(region.id === selectedRegionId ? null : region.id)}
                      className="text-[10px] font-bold text-indigo-500 hover:underline"
                    >
                      Couleur
                    </button>
                  </div>
                  {selectedRegionId === region.id && (
                    <div className="mt-4 pt-4 border-t border-white flex justify-center scale-90 origin-top">
                      <HexColorPicker color={region.color} onChange={(color) => changeRegionColor(region.id, color)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      {/* Modales restantes */}
      <AnimatePresence>
        {showParamsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowParamsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Configuration du Modèle</h2>
                <p className="text-gray-600">Paramètres épidémiologiques avancés {isComparisonParams ? 'pour la comparaison' : ''}</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(params).filter(([key]) => !['model', 'R0'].includes(key)).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2 capitalize">
                        {key} ({key === 'beta' ? 'transmission' : key === 'gamma' ? 'guérison' : key === 'sigma' ? 'incubation' : key})
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={value as number}
                        onChange={e => setParams(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>0</span>
                        <span className="font-bold">{Number(value).toFixed(3)}</span>
                        <span>1</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                  <button
                    onClick={() => setShowParamsModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (isComparisonParams) {
                        setComparisonParams(params);
                        setComparisonHistory(runFullSimulation(params, interventions));
                        setIsComparing(true);
                        setIsComparisonParams(false);
                      }
                      setShowParamsModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showInterventionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowInterventionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Nouvelle Intervention</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type d'intervention</label>
                  <select
                    id="interventionType"
                    className="w-full p-2 border rounded"
                  >
                    <option>Confinement</option>
                    <option>Vaccination</option>
                    <option>Distanciation</option>
                    <option>Masques</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Efficacité (%)</label>
                  <input
                    id="effectiveness"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="50"
                    className="w-full"
                  />
                  <span id="effectivenessValue">50%</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Jour de début</label>
                  <input
                    id="startDay"
                    type="number"
                    className="w-full p-2 border rounded"
                    defaultValue={currentDay}
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowInterventionModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const type = (document.getElementById('interventionType') as HTMLSelectElement).value;
                      const effectiveness = Number((document.getElementById('effectiveness') as HTMLInputElement).value);
                      const startDay = Number((document.getElementById('startDay') as HTMLInputElement).value);
                      setInterventions(prev => [...prev, { type, effectiveness, startDay }]);
                      setShowInterventionModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showDataModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDataModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Importer Données</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fichier CSV (régions)</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        Papa.parse(file, {
                          header: true,
                          complete: (results) => {
                            const newRegions = results.data.map((row: any) => ({
                              ...row,
                              population: Number(row.population),
                              S: Number(row.S),
                              E: Number(row.E),
                              I: Number(row.I),
                              R: Number(row.R),
                              D: Number(row.D),
                              latitude: Number(row.latitude),
                              longitude: Number(row.longitude),
                              color: row.color || '#3b82f6',
                              connections: row.connections ? row.connections.split(',') : [],
                              cluster: Number(row.cluster) || 0
                            })) as Region[];
                            setRegions(newRegions);
                            setShowDataModal(false);
                          }
                        });
                      }
                    }}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fichier JSON (état complet)</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        importFullState(file);
                        setShowDataModal(false);
                      }
                    }}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDataModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showExplanationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowExplanationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Explications des Fonctionnalités</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-bold">Contrôles de la Carte 3D</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Boutons de rotation :</strong> Visibles en bas à gauche en mode 3D</li>
                    <li><strong>Raccourcis clavier :</strong>
                      <ul className="list-circle pl-5">
                        <li><code>2</code> : Basculer en mode 2D</li>
                        <li><code>3</code> : Basculer en mode 3D</li>
                        <li><code>Flèches</code> : Tourner le globe</li>
                        <li><code>R</code> : Réinitialiser la vue</li>
                      </ul>
                    </li>
                    <li><strong>Zoom :</strong> Molette de la souris ou pincement tactile</li>
                    <li><strong>Rotation libre :</strong> Glisser-déposer avec la souris</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold">Mode Comparaison</h3>
                  <p>Le mode comparaison permet de lancer une simulation parallèle avec des paramètres différents et de comparer les courbes d'évolution sur les graphiques. Cliquez sur "Comparer" pour configurer les paramètres de comparaison.</p>
                </div>
                <div>
                  <h3 className="font-bold">Interventions</h3>
                  <p>Les interventions simulent des mesures comme le confinement ou la vaccination qui réduisent le taux de transmission (beta). Elles sont appliquées à partir d'un jour spécifique et réduisent beta d'un pourcentage donné.</p>
                </div>
                <div>
                  <h3 className="font-bold">Personnalisation des Couleurs</h3>
                  <p>Dans la sidebar, cliquez sur "Personnaliser Couleur" pour une région pour choisir une nouvelle couleur de base. Celle-ci est utilisée quand le taux d'infection est bas.</p>
                </div>
                <div>
                  <h3 className="font-bold">Scénarios Pré-enregistrés</h3>
                  <p>Choisissez un scénario pour appliquer automatiquement des paramètres et interventions prédéfinis, comme un confinement strict ou une vaccination massive.</p>
                </div>
                <div>
                  <h3 className="font-bold">Réseau Amélioré</h3>
                  <p>Le vue réseau permet maintenant de personnaliser le style (forme des nœuds, style des liens), activer le clustering (basé sur l'attribut cluster des régions), ajuster la force de répulsion et la distance des liens.</p>
                </div>
                <div>
                  <h3 className="font-bold">Personnalisation Carte et Graphiques</h3>
                  <p>Nouvelles modales pour personnaliser la carte (forme des marqueurs, thème des tuiles, etc.) et les graphiques (style des lignes, opacité, grille, etc.).</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowExplanationModal(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EpidemiologicalSimulation;