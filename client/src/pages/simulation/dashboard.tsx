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
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line, Bar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HexColorPicker } from 'react-colorful';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, annotationPlugin);

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
  cluster?: number; // Pour clustering optionnel
}

interface SimulationParams {
  model: ModelType;
  beta: number;      // Taux de transmission
  sigma: number;     // Taux d'incubation
  gamma: number;     // Taux de guérison
  mu: number;        // Taux de mortalité
  delta: number;     // Taux de quarantaine
  theta: number;     // Taux de sortie de quarantaine
  R0: number;        // Nombre de reproduction de base
  mobility: number;  // Mobilité inter-régions
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
      mobility: 0.05 // Mobilité réduite
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

const EpidemiologicalSimulation: React.FC = () => {
  // États principaux
  const [regions, setRegions] = useState<Region[]>(initialRegions.map(r => ({ ...r })));
  const [history, setHistory] = useState<any[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('Base');
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>(initialNetworkSettings);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // Modèles et paramètres
  const [activeModel, setActiveModel] = useState<ModelType>('SEIRD');
  const [params, setParams] = useState<SimulationParams>(predefinedScenarios[0].params);

  // UI États
  const [activeView, setActiveView] = useState<'map' | 'charts' | 'table' | 'network'>('map');
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [isComparisonParams, setIsComparisonParams] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonParams, setComparisonParams] = useState<SimulationParams | null>(null);
  const [comparisonHistory, setComparisonHistory] = useState<any[]>([]);

  // Références
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<NodeJS.Timeout>();

  // Modèles de simulation
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

  // Fonction pour exécuter une simulation complète (pour comparaison)
  const runFullSimulation = (simParams: SimulationParams, simInterventions: Intervention[]) => {
    let simRegions = initialRegions.map(r => ({ ...r }));
    let simHistory: any[] = [];
    let simDay = 0;

    const maxDays = 365; // Un an pour la comparaison
    while (simDay < maxDays) {
      // Appliquer interventions
      const activeInterventions = simInterventions.filter(i => simDay >= i.startDay);
      const reduction = activeInterventions.reduce((sum, i) => sum + i.effectiveness / 100, 0);
      const localParams = { ...simParams, beta: simParams.beta * (1 - reduction) };

      simRegions = simRegions.map(region => {
        const model = models[activeModel];
        const equations = model.equations(region, localParams);
        
        // Apply mobility (corrected: affect I based on relative infection rates)
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

  // Initialisation de la carte avec Leaflet
  useEffect(() => {
    if (activeView !== 'map' || !mapRef.current) return;

    const hasCoordinates = regions.every(r => r.latitude !== 0 && r.longitude !== 0);

    if (!hasCoordinates) {
      // Afficher message si pas de coordonnées
      mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-600">Pas de coordonnées géographiques disponibles pour les régions.</div>';
      return;
    }

    const map = L.map(mapRef.current).setView([46.2276, 2.2137], 5); // Centre sur l'Europe occidentale

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Ajouter marqueurs pour les régions
    regions.forEach(region => {
      const infectionRate = region.I / region.population;
      let fillColor = region.color;
      if (infectionRate > 0.01) fillColor = '#ef4444';
      else if (infectionRate > 0.001) fillColor = '#f59e0b';

      const marker = L.circleMarker([region.latitude, region.longitude], {
        radius: Math.sqrt(region.population) / 300,
        color: fillColor,
        fillColor: fillColor,
        fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(`
        <strong>${region.name}</strong><br/>
        Population: ${region.population.toLocaleString()}<br/>
        Infectés: ${Math.round(region.I)} (${(region.I/region.population*100).toFixed(2)}%)<br/>
        Décès: ${region.D || 0}<br/>
        R₀ local: ${(params.beta/params.gamma).toFixed(2)}
      `);

      // Ajouter connexions
      region.connections.forEach(targetId => {
        const target = regions.find(r => r.id === targetId);
        if (target) {
          L.polyline([[region.latitude, region.longitude], [target.latitude, target.longitude]], {
            color: '#94a3b8',
            weight: params.mobility * 5,
            opacity: 0.3
          }).addTo(map);
        }
      });
    });

    // Ajouter légende
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

    return () => {
      map.remove();
    };
  }, [regions, activeView, params.mobility]);

  // Initialisation du réseau avec D3 (amélioré avec clustering et styles)
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

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', d => params.mobility * 5)
      .attr('stroke-dasharray', networkSettings.linkStyle === 'dashed' ? '5,5' : 'none');

    // Draw nodes with different shapes
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
          return d3.symbol(d3.symbolCircle, size * size * Math.PI)(); // Circle by default
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

    // Add labels
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

  // Simulation step
  const simulateStep = () => {
    // Appliquer interventions actives
    const activeInterventions = interventions.filter(i => currentDay >= i.startDay);
    const reduction = activeInterventions.reduce((sum, i) => sum + i.effectiveness / 100, 0);
    const localParams = { ...params, beta: params.beta * (1 - reduction) };

    setRegions(prev => prev.map(region => {
      const model = models[activeModel];
      const equations = model.equations(region, localParams);
      
      // Apply mobility (corrected: affect I based on relative infection rates)
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

  // Gestion de la simulation
  useEffect(() => {
    if (isRunning) {
      simulationRef.current = setInterval(simulateStep, 1000 / speed);
    }
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [isRunning, speed, activeModel, params, interventions, currentDay]);

  // Mise à jour de l'historique
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

  // Gestion des scénarios
  const applyScenario = (scenarioName: string) => {
    const scenario = predefinedScenarios.find(s => s.name === scenarioName);
    if (scenario) {
      setParams(scenario.params);
      setInterventions(scenario.interventions);
      // Réinitialiser la simulation pour appliquer le scénario
      setIsRunning(false);
      setCurrentDay(0);
      setHistory([]);
      setRegions(initialRegions.map(r => ({ ...r })));
    }
  };

  // Fonction d'export CSV
  const exportData = () => {
    const csvData = history.map(h => ({ day: h.day, ...h.totals }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'simulation_history.csv';
    link.click();
  };

  // Fonction d'export JSON complet
  const exportFullState = () => {
    const state = {
      regions,
      history,
      currentDay,
      params,
      interventions,
      activeModel,
      networkSettings
    };
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'simulation_state.json';
    link.click();
  };

  // Fonction d'import JSON
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
    };
    reader.readAsText(file);
  };

  // Données pour les graphiques
  const getChartDatasets = (hist: any[], labelSuffix: string = '', borderDash: number[] = []) => [
    {
      label: 'Susceptibles' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.S),
      borderColor: '#3b82f6',
      borderDash,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true
    },
    {
      label: 'Exposés' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.E),
      borderColor: '#f59e0b',
      borderDash,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true
    },
    {
      label: 'Infectés' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.I),
      borderColor: '#ef4444',
      borderDash,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true
    },
    {
      label: 'Guéris' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.R),
      borderColor: '#10b981',
      borderDash,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true
    },
    {
      label: 'Décès' + labelSuffix,
      data: hist.slice(-100).map(h => h.totals.D),
      borderColor: '#6b7280',
      borderDash,
      backgroundColor: 'rgba(107, 114, 128, 0.1)',
      fill: true
    },
    {
      label: 'Rt' + labelSuffix,
      data: hist.slice(-100).map(h => {
        const S = h.totals.S;
        const N = regions.reduce((sum, r) => sum + r.population, 0);
        const activeInterventions = interventions.filter(i => h.day >= i.startDay);
        const reduction = activeInterventions.reduce((sum, i) => sum + i.effectiveness / 100, 0);
        const beta = params.beta * (1 - reduction);
        return (beta * (S / N) / params.gamma) || 0;
      }),
      borderColor: '#000000',
      borderDash,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      fill: true
    }
  ];

  const chartData = {
    labels: history.slice(-100).map(h => `J${h.day}`),
    datasets: isComparing 
      ? [...getChartDatasets(history), ...getChartDatasets(comparisonHistory, ' (Comparaison)', [5, 5])] 
      : getChartDatasets(history)
  };

  // Annotations pour interventions
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

  // Calcul des indicateurs
  const indicators = {
    currentInfections: Math.round(regions.reduce((sum, r) => sum + r.I, 0)),
    totalDeaths: Math.round(regions.reduce((sum, r) => sum + (r.D || 0), 0)),
    effectiveR: (params.beta / params.gamma * (1 - interventions.reduce((sum, i) => sum + i.effectiveness, 0) / 100)).toFixed(2),
    peakDay: history.length > 10 ? history.reduce((max, h) => h.totals.I > max.totals.I ? h : max).day : 0,
    healthcarePressure: (regions.reduce((sum, r) => sum + r.I, 0) / 1000).toFixed(1)
  };

  // Changer couleur de région
  const changeRegionColor = (id: string, newColor: string) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, color: newColor } : r));
  };

  // Changer nom de région
  const changeRegionName = (id: string, newName: string) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, name: newName } : r));
  };

  // Changer cluster de région
  const changeRegionCluster = (id: string, newCluster: number) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, cluster: newCluster } : r));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      {/* Tooltip D3 */}
      <div id="tooltip" className="fixed bg-white p-3 rounded-lg shadow-xl border pointer-events-none opacity-0 z-50 transition-opacity">
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Simulateur Épidémiologique</h1>
            <p className="text-gray-600">Modélisation avancée des dynamiques de propagation</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setIsComparisonParams(true);
                setShowParamsModal(true);
              }}
              className={`px-4 py-2 rounded-lg ${isComparing ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
            >
              {isComparing ? 'Mode Comparaison Actif' : 'Comparer Simulations'}
            </button>
            <button
              onClick={() => setShowDataModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importer
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exporter CSV
            </button>
            <button
              onClick={exportFullState}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"
            >
              Exporter JSON
            </button>
            <button
              onClick={() => setShowExplanationModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              Explications
            </button>
          </div>
        </div>

        {/* Navigation rapide */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['SIR', 'SEIR', 'SEIRD', 'SEIQRD'] as ModelType[]).map(model => (
            <button
              key={model}
              onClick={() => setActiveModel(model)}
              className={`px-4 py-2 rounded-lg ${activeModel === model ? 'bg-blue-600 text-white' : 'bg-white'}`}
            >
              {model}
            </button>
          ))}
          <button
            onClick={() => setShowParamsModal(true)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Paramètres
          </button>
        </div>

        {/* Sélection de scénario */}
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium">Scénario:</label>
          <select
            value={selectedScenario}
            onChange={(e) => {
              setSelectedScenario(e.target.value);
              applyScenario(e.target.value);
            }}
            className="p-2 border rounded"
          >
            {predefinedScenarios.map(sc => (
              <option key={sc.name} value={sc.name}>{sc.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Indicateurs rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Jour', value: currentDay, color: 'bg-blue-100 text-blue-800' },
          { label: 'Infectés Actifs', value: indicators.currentInfections.toLocaleString(), color: 'bg-red-100 text-red-800' },
          { label: 'R₀ Effectif', value: indicators.effectiveR, color: 'bg-orange-100 text-orange-800' },
          { label: 'Pic (Jour)', value: indicators.peakDay, color: 'bg-purple-100 text-purple-800' },
          { label: 'Pression Soins', value: `${indicators.healthcarePressure}/1000`, color: 'bg-yellow-100 text-yellow-800' }
        ].map((indicator, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-4 rounded-xl shadow-sm ${indicator.color}`}
          >
            <div className="text-sm font-medium">{indicator.label}</div>
            <div className="text-2xl font-bold">{indicator.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Contrôles de simulation */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 ${isRunning ? 'bg-orange-600' : 'bg-blue-600'} text-white`}
            >
              {isRunning ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Démarrer
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
              className="px-4 py-3 bg-gray-600 text-white rounded-lg"
            >
              Réinitialiser
            </button>

            <button
              onClick={() => setShowInterventionModal(true)}
              className="px-4 py-3 bg-yellow-600 text-white rounded-lg"
            >
              + Intervention
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Vitesse:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm font-medium">{speed}x</span>
            </div>

            <div className="flex gap-2">
              {['map', 'charts', 'table', 'network'].map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view as any)}
                  className={`px-4 py-2 rounded ${activeView === view ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                >
                  {view === 'map' && 'Carte'}
                  {view === 'charts' && 'Graphiques'}
                  {view === 'table' && 'Tableau'}
                  {view === 'network' && 'Réseau'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vue principale */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte / Visualisation principale */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4">
          {activeView === 'map' && (
            <div ref={mapRef} className="h-[500px] relative" />
          )}

          {activeView === 'charts' && (
            <div className="space-y-6">
              <div className="h-80">
                <Line 
                  data={chartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      title: {
                        display: true,
                        text: `Évolution des compartiments (Modèle ${activeModel})` + (isComparing ? ' avec Comparaison' : '')
                      },
                      annotation: {
                        annotations: chartAnnotations
                      }
                    }
                  }}
                />
              </div>
              
              <div className="h-64">
                <Bar
                  data={{
                    labels: regions.map(r => r.name),
                    datasets: [{
                      label: 'Taux d\'infection (%)',
                      data: regions.map(r => (r.I / r.population) * 100),
                      backgroundColor: regions.map(r => r.color)
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {activeView === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Région</th>
                    <th className="px-6 py-3">S</th>
                    <th className="px-6 py-3">E</th>
                    <th className="px-6 py-3">I</th>
                    {models[activeModel].compartments.includes('Q') && <th className="px-6 py-3">Q</th>}
                    <th className="px-6 py-3">R</th>
                    {models[activeModel].compartments.includes('D') && <th className="px-6 py-3">D</th>}
                    <th className="px-6 py-3">Population</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map(region => (
                    <tr key={region.id} className="bg-white border-b">
                      <td className="px-6 py-4 font-medium">{region.name}</td>
                      <td className="px-6 py-4">{Math.round(region.S)}</td>
                      <td className="px-6 py-4">{Math.round(region.E)}</td>
                      <td className="px-6 py-4">{Math.round(region.I)}</td>
                      {models[activeModel].compartments.includes('Q') && <td className="px-6 py-4">{Math.round(region.Q || 0)}</td>}
                      <td className="px-6 py-4">{Math.round(region.R)}</td>
                      {models[activeModel].compartments.includes('D') && <td className="px-6 py-4">{Math.round(region.D || 0)}</td>}
                      <td className="px-6 py-4">{region.population.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeView === 'network' && (
            <div className="h-[500px] relative">
              <svg ref={svgRef} className="w-full h-full" />
              <button
                onClick={() => setShowNetworkModal(true)}
                className="absolute top-4 right-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Paramètres Réseau
              </button>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Détails du Modèle</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Modèle {activeModel}</span>
                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {models[activeModel].compartments.join(' → ')}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {activeModel === 'SEIRD' && 'Susceptible → Exposé → Infecté → Guéri/Décédé'}
                {activeModel === 'SEIQRD' && 'Avec quarantaine et décès'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">β (Transmission)</div>
                <div className="text-lg font-bold">{params.beta.toFixed(3)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">γ (Guérison)</div>
                <div className="text-lg font-bold">{params.gamma.toFixed(3)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">σ (Incubation)</div>
                <div className="text-lg font-bold">{params.sigma.toFixed(3)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">μ (Mortalité)</div>
                <div className="text-lg font-bold">{params.mu.toFixed(3)}</div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-3">Régions et Personnalisation</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {regions.map(region => (
                  <div key={region.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-center mb-1">
                      <input
                        type="text"
                        value={region.name}
                        onChange={(e) => changeRegionName(region.id, e.target.value)}
                        className="font-medium border-b"
                      />
                      <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: region.color + '20', color: region.color }}>
                        {(region.I / region.population * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Pop: {region.population.toLocaleString()} • 
                      Infectés: {Math.round(region.I)} • 
                      Décès: {Math.round(region.D || 0)}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div>
                        <button 
                          onClick={() => setSelectedRegionId(region.id === selectedRegionId ? null : region.id)}
                          className="text-sm text-blue-600"
                        >
                          {selectedRegionId === region.id ? 'Fermer' : 'Couleur'}
                        </button>
                        {selectedRegionId === region.id && (
                          <HexColorPicker 
                            color={region.color} 
                            onChange={(color) => changeRegionColor(region.id, color)} 
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-sm">Cluster:</label>
                        <input
                          type="number"
                          value={region.cluster || 0}
                          onChange={(e) => changeRegionCluster(region.id, Number(e.target.value))}
                          className="w-16 ml-2 border rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modale Paramètres */}
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

      {/* Modale Interventions */}
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

      {/* Modale Import Data */}
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

      {/* Modale Explications */}
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

      {/* Modale Paramètres Réseau */}
      <AnimatePresence>
        {showNetworkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowNetworkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Paramètres du Réseau</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Force de Répulsion</label>
                  <input 
                    type="range" 
                    min="-500"
                    max="0"
                    value={networkSettings.chargeStrength}
                    onChange={(e) => setNetworkSettings(prev => ({ ...prev, chargeStrength: Number(e.target.value) }))}
                    className="w-full" 
                  />
                  <span>{networkSettings.chargeStrength}</span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Distance des Liens</label>
                  <input 
                    type="range" 
                    min="50"
                    max="300"
                    value={networkSettings.linkDistance}
                    onChange={(e) => setNetworkSettings(prev => ({ ...prev, linkDistance: Number(e.target.value) }))}
                    className="w-full" 
                  />
                  <span>{networkSettings.linkDistance}</span>
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={networkSettings.enableClustering}
                    onChange={(e) => setNetworkSettings(prev => ({ ...prev, enableClustering: e.target.checked }))}
                  />
                  <label className="ml-2">Activer Clustering (basé sur cluster des régions)</label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Forme des Nœuds</label>
                  <select 
                    value={networkSettings.nodeShape}
                    onChange={(e) => setNetworkSettings(prev => ({ ...prev, nodeShape: e.target.value as 'circle' | 'square' | 'triangle' }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="circle">Cercle</option>
                    <option value="square">Carré</option>
                    <option value="triangle">Triangle</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Style des Liens</label>
                  <select 
                    value={networkSettings.linkStyle}
                    onChange={(e) => setNetworkSettings(prev => ({ ...prev, linkStyle: e.target.value as 'solid' | 'dashed' }))}
                    className="w-full p-2 border rounded"
                  >
                    <option value="solid">Solide</option>
                    <option value="dashed">Pointillé</option>
                  </select>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowNetworkModal(false)}
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
    </div>
  );
};

export default EpidemiologicalSimulation;