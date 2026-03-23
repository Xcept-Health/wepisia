/**
 * EpidemiologicalSimulation
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import Papa from 'papaparse';
import * as d3 from 'd3';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HexColorPicker } from 'react-colorful';
import Globe from 'globe.gl';
import { Link } from 'wouter';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import {
  Play, Pause, RotateCcw, ChevronRight,
  Map as MapIcon, BarChart2, Network, Table2,
  Download, Upload, Info, Plus, X, Settings,Database,
  Activity, TrendingUp, Users, Sun, Moon, Sliders,
  AlertTriangle, SkipBack, SkipForward, ChevronDown, 
  Beaker, Globe2, Wind, Droplets, Zap, ChartScatter
} from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler, annotationPlugin,
);

// Types
type ModelType   = 'SIR' | 'SEIR' | 'SEIRD' | 'SEIQRD';
type MapType     = '2d' | '3d';
type ActiveView  = 'map' | 'charts' | 'table' | 'network';
type MobileTab   = 'map' | 'charts' | 'regions' | 'controls';

interface Region {
  id: string; name: string; population: number;
  S: number; E: number; I: number; Q?: number; R: number; D?: number;
  latitude: number; longitude: number;
  color: string; connections: string[]; cluster?: number;
  x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null;
}

interface SimParams {
  model: ModelType;
  beta: number; sigma: number; gamma: number;
  mu: number; delta: number; theta: number; mobility: number;
}

interface Intervention {
  id: string; type: string; effectiveness: number; startDay: number;
}

interface HistoryFrame {
  day: number;
  totals: { S: number; E: number; I: number; R: number; D: number };
  regions: Region[];
  newCases: number;
  Rt: number;
}

interface Scenario {
  name: string;
  params: SimParams;
  interventions: Omit<Intervention, 'id'>[];
}

interface MapSettings {
  markerOpacity: number;
  tileTheme: 'light' | 'dark' | 'satellite';
  showLabels: boolean;
}

interface NetworkSettings {
  chargeStrength: number;
  linkDistance: number;
  enableClustering: boolean;
  nodeShape: 'circle' | 'square' | 'triangle';
}

// Models - outside component, never recreated
const MODELS: Record<ModelType, {
  compartments: string[];
  step: (r: Region, p: SimParams) => Record<string, number>;
}> = {
  SIR: {
    compartments: ['S', 'I', 'R'],
    step: (r, p) => {
      const inf = p.beta * r.S * r.I / r.population;
      return { dS: -inf, dI: inf - p.gamma * r.I, dR: p.gamma * r.I };
    },
  },
  SEIR: {
    compartments: ['S', 'E', 'I', 'R'],
    step: (r, p) => {
      const inf = p.beta * r.S * r.I / r.population;
      return {
        dS: -inf, dE: inf - p.sigma * r.E,
        dI: p.sigma * r.E - p.gamma * r.I, dR: p.gamma * r.I,
      };
    },
  },
  SEIRD: {
    compartments: ['S', 'E', 'I', 'R', 'D'],
    step: (r, p) => {
      const inf = p.beta * r.S * r.I / r.population;
      return {
        dS: -inf, dE: inf - p.sigma * r.E,
        dI: p.sigma * r.E - (p.gamma + p.mu) * r.I,
        dR: p.gamma * r.I, dD: p.mu * r.I,
      };
    },
  },
  SEIQRD: {
    compartments: ['S', 'E', 'I', 'Q', 'R', 'D'],
    step: (r, p) => {
      const inf = p.beta * r.S * r.I / r.population;
      const Q = r.Q ?? 0;
      return {
        dS: -inf, dE: inf - p.sigma * r.E,
        dI: p.sigma * r.E - (p.gamma + p.mu + p.delta) * r.I,
        dQ: p.delta * r.I - p.theta * Q,
        dR: p.gamma * r.I + p.theta * Q, dD: p.mu * r.I,
      };
    },
  },
};

// Initial regions
const INITIAL_REGIONS: Region[] = [
  { id: 'idf', name: 'Île-de-France', population: 12000000, S: 11950000, E: 3000, I: 1500, R: 800, D: 100, latitude: 48.8566, longitude: 2.3522, color: '#3b82f6', connections: ['ara', 'nor', 'ger', 'uk'], cluster: 1 },
  { id: 'ara', name: 'Auvergne-Rhône-Alpes', population: 8000000, S: 7995000, E: 200, I: 89, R: 50, D: 20, latitude: 45.764, longitude: 4.8357, color: '#10b981', connections: ['idf', 'paca', 'occ', 'ita', 'ger'], cluster: 1 },
  { id: 'paca', name: 'Provence-Alpes-Côte d\'Azur', population: 5000000, S: 4994500, E: 300, I: 120, R: 80, D: 40, latitude: 43.9352, longitude: 6.0679, color: '#f59e0b', connections: ['ara', 'occ', 'ita'], cluster: 1 },
  { id: 'ger', name: 'Allemagne', population: 83000000, S: 82900000, E: 5000, I: 2500, R: 1500, D: 200, latitude: 52.52, longitude: 13.405, color: '#ef4444', connections: ['idf', 'ara', 'ita', 'spa', 'uk'], cluster: 2 },
  { id: 'ita', name: 'Italie', population: 60000000, S: 59900000, E: 4000, I: 2000, R: 1000, D: 150, latitude: 41.9028, longitude: 12.4964, color: '#6b7280', connections: ['ara', 'paca', 'ger'], cluster: 2 },
  { id: 'spa', name: 'Espagne', population: 47000000, S: 46950000, E: 2000, I: 1000, R: 500, D: 100, latitude: 40.4168, longitude: -3.7038, color: '#a855f7', connections: ['ger', 'uk', 'paca'], cluster: 3 },
  { id: 'uk', name: 'Royaume-Uni', population: 67000000, S: 66900000, E: 3000, I: 1500, R: 800, D: 100, latitude: 51.5074, longitude: -0.1278, color: '#eab308', connections: ['idf', 'ger', 'spa'], cluster: 3 },
  { id: 'nor', name: 'Normandie', population: 3300000, S: 3295000, E: 100, I: 50, R: 30, D: 10, latitude: 49.1829, longitude: -0.3707, color: '#22c55e', connections: ['idf', 'uk'], cluster: 1 },
  { id: 'occ', name: 'Occitanie', population: 5900000, S: 5895000, E: 200, I: 100, R: 60, D: 20, latitude: 43.6047, longitude: 1.4442, color: '#ec4899', connections: ['ara', 'paca', 'spa'], cluster: 1 },
];

const DEFAULT_PARAMS: SimParams = {
  model: 'SEIRD', beta: 0.3, sigma: 0.2, gamma: 0.1,
  mu: 0.01, delta: 0.05, theta: 0.1, mobility: 0.1,
};

const SCENARIOS: Scenario[] = [
  { name: 'Base', params: DEFAULT_PARAMS, interventions: [] },
  {
    name: 'Confinement Strict',
    params: { ...DEFAULT_PARAMS, mobility: 0.02 },
    interventions: [{ type: 'Confinement', effectiveness: 60, startDay: 10 }],
  },
  {
    name: 'Vaccination Massive',
    params: { ...DEFAULT_PARAMS, beta: 0.22 },
    interventions: [
      { type: 'Vaccination', effectiveness: 40, startDay: 30 },
      { type: 'Distanciation', effectiveness: 20, startDay: 5 },
    ],
  },
  {
    name: 'Intervention Tardive',
    params: { ...DEFAULT_PARAMS, beta: 0.35, mu: 0.015, mobility: 0.15 },
    interventions: [{ type: 'Confinement', effectiveness: 50, startDay: 50 }],
  },
];


// Disease examples - real-world inspired initial conditions and parameters
interface DiseaseExample {
  id: string;
  name: string;
  year: string;
  pathogen: string;
  description: string;
  badge: string;
  badgeColor: string;
  iconColor: string;
  R0: number;
  source: string;
  model: ModelType;
  params: SimParams;
  initialRegions: Region[];
}

const DISEASE_EXAMPLES: DiseaseExample[] = [
  {
    id: 'covid19',
    name: 'COVID-19',
    year: '2020',
    pathogen: 'SARS-CoV-2',
    description: 'Pandémie mondiale. Transmission aérienne, période d\'incubation 5–6 jours, CFR ~1%.',
    badge: 'Pandémie',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    iconColor: '#3b82f6',
    R0: 2.5,
    source: 'Johns Hopkins University / WHO',
    model: 'SEIRD',
    params: { model: 'SEIRD', beta: 0.28, sigma: 0.18, gamma: 0.10, mu: 0.008, delta: 0.05, theta: 0.1, mobility: 0.15 },
    initialRegions: [
      { id: 'idf', name: 'Île-de-France', population: 12000000, S: 11993000, E: 4000, I: 2000, R: 500, D: 50, latitude: 48.8566, longitude: 2.3522, color: '#3b82f6', connections: ['ara','nor','ger','uk'], cluster: 1 },
      { id: 'ara', name: 'Auvergne-Rhône-Alpes', population: 8000000, S: 7997500, E: 1200, I: 600, R: 200, D: 20, latitude: 45.764, longitude: 4.8357, color: '#10b981', connections: ['idf','paca','occ','ita','ger'], cluster: 1 },
      { id: 'paca', name: 'Provence-Alpes-Côte d\'Azur', population: 5000000, S: 4998000, E: 800, I: 400, R: 120, D: 15, latitude: 43.9352, longitude: 6.0679, color: '#f59e0b', connections: ['ara','occ','ita'], cluster: 1 },
      { id: 'ger', name: 'Allemagne', population: 83000000, S: 82960000, E: 15000, I: 8000, R: 2000, D: 200, latitude: 52.52, longitude: 13.405, color: '#ef4444', connections: ['idf','ara','ita','spa','uk'], cluster: 2 },
      { id: 'ita', name: 'Italie', population: 60000000, S: 59970000, E: 12000, I: 7000, R: 1500, D: 300, latitude: 41.9028, longitude: 12.4964, color: '#6b7280', connections: ['ara','paca','ger'], cluster: 2 },
      { id: 'spa', name: 'Espagne', population: 47000000, S: 46980000, E: 9000, I: 5000, R: 1200, D: 150, latitude: 40.4168, longitude: -3.7038, color: '#a855f7', connections: ['ger','uk','paca'], cluster: 3 },
      { id: 'uk', name: 'Royaume-Uni', population: 67000000, S: 66975000, E: 11000, I: 6500, R: 1800, D: 250, latitude: 51.5074, longitude: -0.1278, color: '#eab308', connections: ['idf','ger','spa'], cluster: 3 },
      { id: 'nor', name: 'Normandie', population: 3300000, S: 3298500, E: 600, I: 300, R: 80, D: 8, latitude: 49.1829, longitude: -0.3707, color: '#22c55e', connections: ['idf','uk'], cluster: 1 },
      { id: 'occ', name: 'Occitanie', population: 5900000, S: 5897500, E: 1200, I: 600, R: 150, D: 18, latitude: 43.6047, longitude: 1.4442, color: '#ec4899', connections: ['ara','paca','spa'], cluster: 1 },
    ],
  },
  {
    id: 'ebola2014',
    name: 'Épidémie Ebola',
    year: '2014–2016',
    pathogen: 'Virus Ebola',
    description: 'Crise sanitaire majeure en Afrique de l\'Ouest. CFR ~50%. Transmission par contact direct.',
    badge: 'Létalité élevée',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    iconColor: '#ef4444',
    R0: 1.8,
    source: 'OMS - Rapport final 2016',
    model: 'SEIRD',
    params: { model: 'SEIRD', beta: 0.22, sigma: 0.25, gamma: 0.08, mu: 0.12, delta: 0.05, theta: 0.1, mobility: 0.02 },
    initialRegions: [
      { id: 'gui', name: 'Guinée', population: 12414000, S: 12410000, E: 2000, I: 1000, R: 200, D: 80, latitude: 9.9456, longitude: -9.6966, color: '#ef4444', connections: ['sle','lib','mali'], cluster: 1 },
      { id: 'sle', name: 'Sierra Leone', population: 7791000, S: 7785000, E: 3000, I: 1500, R: 300, D: 120, latitude: 8.4606, longitude: -11.7799, color: '#f97316', connections: ['gui','lib'], cluster: 1 },
      { id: 'lib', name: 'Liberia', population: 4854000, S: 4848000, E: 2500, I: 1200, R: 250, D: 100, latitude: 6.4281, longitude: -9.4295, color: '#eab308', connections: ['gui','sle','ci'], cluster: 1 },
      { id: 'mali', name: 'Mali', population: 20251000, S: 20250000, E: 500, I: 200, R: 50, D: 10, latitude: 12.6392, longitude: -8.0029, color: '#22c55e', connections: ['gui','nga'], cluster: 2 },
      { id: 'ci', name: 'Côte d\'Ivoire', population: 26378000, S: 26377000, E: 400, I: 150, R: 40, D: 8, latitude: 6.8277, longitude: -5.2893, color: '#10b981', connections: ['lib','gui','gh'], cluster: 2 },
      { id: 'nga', name: 'Nigeria', population: 206139000, S: 206138000, E: 300, I: 100, R: 30, D: 5, latitude: 9.082, longitude: 8.6753, color: '#3b82f6', connections: ['mali','ci'], cluster: 3 },
      { id: 'gh', name: 'Ghana', population: 31073000, S: 31072500, E: 200, I: 80, R: 20, D: 3, latitude: 7.9465, longitude: -1.0232, color: '#8b5cf6', connections: ['ci','nga'], cluster: 3 },
      { id: 'sen', name: 'Sénégal', population: 16743000, S: 16742800, E: 100, I: 50, R: 10, D: 2, latitude: 14.4974, longitude: -14.4524, color: '#a855f7', connections: ['gui','mali'], cluster: 2 },
      { id: 'brk', name: 'Burkina Faso', population: 21511000, S: 21510900, E: 60, I: 30, R: 5, D: 1, latitude: 12.3641, longitude: -1.5337, color: '#ec4899', connections: ['mali','gh','ci'], cluster: 2 },
    ],
  },
  {
    id: 'flu_seasonal',
    name: 'Grippe Saisonnière',
    year: 'Annuel',
    pathogen: 'Influenza A/B',
    description: 'Épidémie hivernale classique. R0 modéré, récupération rapide, faible létalité générale.',
    badge: 'Saisonnier',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    iconColor: '#0ea5e9',
    R0: 1.4,
    source: 'Santé Publique France / ECDC',
    model: 'SEIR',
    params: { model: 'SEIR', beta: 0.28, sigma: 0.50, gamma: 0.20, mu: 0.001, delta: 0.05, theta: 0.1, mobility: 0.12 },
    initialRegions: INITIAL_REGIONS.map(r => ({
      ...r,
      S: Math.round(r.population * 0.85),
      E: Math.round(r.population * 0.005),
      I: Math.round(r.population * 0.002),
      R: Math.round(r.population * 0.143),
      D: 0,
    })),
  },
  {
    id: 'measles',
    name: 'Rougeole',
    year: 'Endémique',
    pathogen: 'Paramyxovirus',
    description: 'Maladie très contagieuse (R0 12–18). Vaccination efficace mais couverture insuffisante dans certaines zones.',
    badge: 'R0 très élevé',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    iconColor: '#f97316',
    R0: 14,
    source: 'OMS - Bulletin mondial de la santé',
    model: 'SEIR',
    params: { model: 'SEIR', beta: 1.40, sigma: 0.25, gamma: 0.10, mu: 0.002, delta: 0.05, theta: 0.1, mobility: 0.08 },
    initialRegions: INITIAL_REGIONS.map(r => ({
      ...r,
      S: Math.round(r.population * 0.10),   // 90% immune via vaccination
      E: Math.round(r.population * 0.001),
      I: Math.round(r.population * 0.0005),
      R: Math.round(r.population * 0.8985),
      D: 0,
    })),
  },
  {
    id: 'meningitis',
    name: 'Méningite à Méningocoque',
    year: 'Saison sèche',
    pathogen: 'Neisseria meningitidis',
    description: 'Épidémies saisonnières dans la "ceinture méningitique" sub-saharienne. Létalité ~10%.',
    badge: 'Afrique sub-saharienne',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    iconColor: '#d97706',
    R0: 2.0,
    source: 'OMS / CEREMUJER - Burkina Faso 2012',
    model: 'SEIRD',
    params: { model: 'SEIRD', beta: 0.24, sigma: 0.33, gamma: 0.14, mu: 0.05, delta: 0.08, theta: 0.15, mobility: 0.05 },
    initialRegions: [
      { id: 'brk2', name: 'Burkina Faso', population: 21511000, S: 21505000, E: 3000, I: 1500, R: 300, D: 50, latitude: 12.3641, longitude: -1.5337, color: '#d97706', connections: ['mali2','niger2','gh2','togo2'], cluster: 1 },
      { id: 'mali2', name: 'Mali', population: 20251000, S: 20247000, E: 2000, I: 1000, R: 200, D: 30, latitude: 12.6392, longitude: -8.0029, color: '#ef4444', connections: ['brk2','niger2','sen2'], cluster: 1 },
      { id: 'niger2', name: 'Niger', population: 24207000, S: 24204000, E: 1500, I: 800, R: 150, D: 20, latitude: 17.6078, longitude: 8.0817, color: '#10b981', connections: ['brk2','mali2','nga2','chad2'], cluster: 1 },
      { id: 'nga2', name: 'Nigeria (Nord)', population: 50000000, S: 49992000, E: 4000, I: 2000, R: 500, D: 80, latitude: 11.8037, longitude: 8.5168, color: '#3b82f6', connections: ['niger2','chad2'], cluster: 2 },
      { id: 'chad2', name: 'Tchad', population: 16425000, S: 16423000, E: 1000, I: 500, R: 100, D: 15, latitude: 15.4542, longitude: 18.7322, color: '#a855f7', connections: ['niger2','nga2','cam2'], cluster: 2 },
      { id: 'cam2', name: 'Cameroun (Nord)', population: 12000000, S: 11999000, E: 500, I: 250, R: 60, D: 8, latitude: 10.2166, longitude: 14.3999, color: '#22c55e', connections: ['chad2','nga2'], cluster: 2 },
      { id: 'gh2', name: 'Ghana (Nord)', population: 8000000, S: 7999200, E: 400, I: 200, R: 50, D: 6, latitude: 10.1599, longitude: -1.0232, color: '#ec4899', connections: ['brk2','togo2'], cluster: 1 },
      { id: 'togo2', name: 'Togo', population: 8278000, S: 8277500, E: 250, I: 120, R: 30, D: 4, latitude: 8.6195, longitude: 0.8248, color: '#06b6d4', connections: ['gh2','brk2'], cluster: 1 },
      { id: 'sen2', name: 'Sénégal', population: 16743000, S: 16742500, E: 200, I: 100, R: 25, D: 3, latitude: 14.4974, longitude: -14.4524, color: '#8b5cf6', connections: ['mali2','brk2'], cluster: 1 },
    ],
  },
  {
    id: 'cholera',
    name: 'Choléra',
    year: 'Endémique / Flambées',
    pathogen: 'Vibrio cholerae',
    description: 'Épidémies liées à l\'eau contaminée. Mortalité rapide sans traitement, faible avec réhydratation.',
    badge: 'Eau & assainissement',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    iconColor: '#0d9488',
    R0: 3.0,
    source: 'OMS - Flambées choléra 2022–2024',
    model: 'SEIRD',
    params: { model: 'SEIRD', beta: 0.35, sigma: 0.50, gamma: 0.20, mu: 0.02, delta: 0.08, theta: 0.15, mobility: 0.04 },
    initialRegions: [
      { id: 'hai', name: 'Haïti', population: 11402000, S: 11398000, E: 2000, I: 1000, R: 200, D: 40, latitude: 18.9712, longitude: -72.2852, color: '#0d9488', connections: ['dr','jam','cub'], cluster: 1 },
      { id: 'dr', name: 'République Dominicaine', population: 10448000, S: 10447000, E: 600, I: 300, R: 80, D: 10, latitude: 18.7357, longitude: -70.1627, color: '#3b82f6', connections: ['hai'], cluster: 1 },
      { id: 'jam', name: 'Jamaïque', population: 2961000, S: 2960800, E: 100, I: 50, R: 15, D: 2, latitude: 18.1096, longitude: -77.2975, color: '#10b981', connections: ['hai','cub'], cluster: 2 },
      { id: 'cub', name: 'Cuba', population: 11326000, S: 11325700, E: 150, I: 75, R: 20, D: 3, latitude: 21.5218, longitude: -77.7812, color: '#f59e0b', connections: ['jam','hai'], cluster: 2 },
      { id: 'sud_sou', name: 'Soudan du Sud', population: 11194000, S: 11191000, E: 1500, I: 750, R: 150, D: 30, latitude: 6.877, longitude: 31.307, color: '#ef4444', connections: ['eth','uga'], cluster: 3 },
      { id: 'eth', name: 'Éthiopie', population: 114964000, S: 114960000, E: 2000, I: 1000, R: 200, D: 35, latitude: 9.145, longitude: 40.4897, color: '#a855f7', connections: ['sud_sou','uga','ken'], cluster: 3 },
      { id: 'uga', name: 'Ouganda', population: 45741000, S: 45739500, E: 800, I: 400, R: 80, D: 12, latitude: 1.3733, longitude: 32.2903, color: '#22c55e', connections: ['sud_sou','eth','ken'], cluster: 3 },
      { id: 'ken', name: 'Kenya', population: 53771000, S: 53770000, E: 500, I: 250, R: 60, D: 8, latitude: -0.0236, longitude: 37.9062, color: '#ec4899', connections: ['eth','uga'], cluster: 3 },
      { id: 'yem', name: 'Yémen', population: 29826000, S: 29822000, E: 2000, I: 1000, R: 200, D: 40, latitude: 15.5527, longitude: 48.5164, color: '#06b6d4', connections: [], cluster: 4 },
    ],
  },
];

// Indicator accent colors matched to the array position
const INDICATOR_ACCENTS = [
  'bg-indigo-500', 'bg-rose-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-violet-500',
];

// Pure simulation - runs in ~5ms for 365 days × 9 regions
// Accepts optional custom initial regions (for disease examples)
function computeTrajectory(
  params: SimParams,
  interventions: Intervention[],
  days = 365,
  customInitialRegions?: Region[],
): HistoryFrame[] {
  const model = MODELS[params.model];
  let regions = (customInitialRegions ?? INITIAL_REGIONS).map(r => ({ ...r }));
  const history: HistoryFrame[] = [];
  const totalPop = regions.reduce((s, r) => s + r.population, 0);

  for (let day = 0; day < days; day++) {
    const reduction = interventions
      .filter(i => day >= i.startDay)
      .reduce((sum, i) => Math.min(sum + i.effectiveness / 100, 0.95), 0);
    const p = { ...params, beta: params.beta * (1 - reduction) };

    const prevI = regions.reduce((s, r) => s + r.I, 0);

    regions = regions.map(region => {
      const d = model.step(region, p);
      const mobility = regions
        .filter(r => region.connections.includes(r.id))
        .reduce((sum, r) =>
          sum + (r.I / r.population - region.I / region.population)
            * p.mobility * region.population, 0);
      return {
        ...region,
        S: Math.max(0, region.S + (d.dS ?? 0)),
        E: Math.max(0, region.E + (d.dE ?? 0)),
        I: Math.max(0, region.I + (d.dI ?? 0) + mobility),
        Q: Math.max(0, (region.Q ?? 0) + (d.dQ ?? 0)),
        R: Math.max(0, region.R + (d.dR ?? 0)),
        D: Math.max(0, (region.D ?? 0) + (d.dD ?? 0)),
      };
    });

    const totals = regions.reduce((acc, r) => ({
      S: acc.S + r.S, E: acc.E + r.E, I: acc.I + r.I,
      R: acc.R + r.R, D: acc.D + (r.D ?? 0),
    }), { S: 0, E: 0, I: 0, R: 0, D: 0 });

    const Rt = (p.beta / p.gamma) * (totals.S / totalPop);
    const newCases = Math.max(0, totals.I - prevI + totals.R - (history[day - 1]?.totals.R ?? 0));

    history.push({ day, totals, regions: regions.map(r => ({ ...r })), newCases, Rt });
  }
  return history;
}

function getRegionColor(region: Region): string {
  const rate = region.I / region.population;
  if (rate > 0.01)  return '#ef4444';
  if (rate > 0.001) return '#f59e0b';
  return region.color;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toString();
}

// Chart.js base options using CSS variables
const chartBase = (isDark: boolean) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 150 } as const,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: isDark ? '#cbd5e1' : '#374151', font: { size: 11 }, padding: 16, usePointStyle: true },
    },
    tooltip: {
      backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.97)',
      titleColor: isDark ? '#f1f5f9' : '#111827',
      bodyColor: isDark ? '#94a3b8' : '#4b5563',
      borderColor: isDark ? '#334155' : '#e5e7eb',
      borderWidth: 1, cornerRadius: 8, boxPadding: 4,
    },
  },
  scales: {
    x: {
      grid: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(229,231,235,0.5)' },
      ticks: { color: isDark ? '#64748b' : '#6b7280', font: { size: 10 } },
    },
    y: {
      grid: { color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(229,231,235,0.5)' },
      ticks: { color: isDark ? '#64748b' : '#6b7280', font: { size: 10 } },
    },
  },
  elements: { line: { tension: 0.4, borderWidth: 2 }, point: { radius: 0, hoverRadius: 5 } },
  interaction: { intersect: false, mode: 'index' as const },
});

// Main component
export default function EpidemiologicalSimulation() {
  const { theme, toggleTheme, switchable } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useTranslation();

  // Simulation state - starts neutral (no auto-run)
  const [params, setParams]             = useState<SimParams>(DEFAULT_PARAMS);
  const [activeModel, setActiveModel]   = useState<ModelType>('SEIRD');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [simHistory, setSimHistory]     = useState<HistoryFrame[]>([]);
  const [simRunId, setSimRunId]         = useState(0);
  const [playbackDay, setPlaybackDay]   = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [speed, setSpeed]               = useState(3);
  const [simDays, setSimDays]           = useState(365);
  const simDaysRef                      = useRef(365);
  const [loadedExample, setLoadedExample] = useState<string | null>(null);
  const activeRegions                   = useRef<Region[]>(INITIAL_REGIONS);

  // UI state
  const [activeView, setActiveView]     = useState<ActiveView>('map');
  const [mobileTab, setMobileTab]       = useState<MobileTab>('map');
  const [mapType, setMapType]           = useState<MapType>('3d');
  const [selectedScenario, setSelectedScenario] = useState('Base');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [isComputing, setIsComputing]   = useState(false);

  // Region customization (local, does not affect sim)
  const [regionColors, setRegionColors] = useState<Record<string, string>>({});
  const [regionNames, setRegionNames]   = useState<Record<string, string>>({});

  // Modal state - controlled (no getElementById)
  const [showParamsModal, setShowParamsModal]           = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showDataModal, setShowDataModal]               = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [showExamplesModal, setShowExamplesModal]       = useState(false);
  const [isComparisonParams, setIsComparisonParams]     = useState(false);
  const [compHistory, setCompHistory]                   = useState<HistoryFrame[]>([]);
  const [isComparing, setIsComparing]                   = useState(false);
  const [editParams, setEditParams]                     = useState<SimParams>(DEFAULT_PARAMS);

  // Intervention form state
  const [newIntervention, setNewIntervention] = useState({
    type: 'Confinement', effectiveness: 50, startDay: 0,
  });

  // Map settings
  const [mapSettings, setMapSettings] = useState<MapSettings>({
    markerOpacity: 0.85, tileTheme: 'light', showLabels: true,
  });
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({
    chargeStrength: -200, linkDistance: 100, enableClustering: false, nodeShape: 'circle',
  });

  // DOM refs
  const mapRef      = useRef<HTMLDivElement>(null);
  const svgRef      = useRef<SVGSVGElement>(null);
  const leafletRef  = useRef<L.Map | null>(null);
  const leafletMarkers = useRef<Map<string, L.CircleMarker>>(new Map());
  const globeRef    = useRef<any>(null);
  const globeContainerRef = useRef<HTMLDivElement | null>(null);

  // Display regions - derived from history[playbackDay]
  const displayRegions: Region[] = useMemo(() => {
    const frame = simHistory[playbackDay];
    if (!frame) return [];
    return frame.regions.map(r => ({
      ...r,
      name:  regionNames[r.id]  ?? r.name,
      color: regionColors[r.id] ?? r.color,
    }));
  }, [simHistory, playbackDay, regionColors, regionNames]);

  const totalPop = useMemo(
    () => INITIAL_REGIONS.reduce((s, r) => s + r.population, 0),
    [],
  );

  const hasSimulation = simHistory.length > 0;

  useEffect(() => { simDaysRef.current = simDays; }, [simDays]);

  const runSimulation = useCallback((
    p: SimParams,
    ints: Intervention[],
    customRegions?: Region[],
    days?: number,
  ) => {
    if (customRegions) activeRegions.current = customRegions;
    setIsComputing(true);
    setTimeout(() => {
      const d = days ?? simDaysRef.current;
      const history = computeTrajectory(p, ints, d, activeRegions.current);
      setSimHistory(history);
      setSimRunId(n => n + 1);
      setPlaybackDay(0);
      setIsPlaying(false);
      setIsComputing(false);
    }, 50);
  }, []);

  // Playback animation
  useEffect(() => {
    if (!isPlaying || simHistory.length === 0) return;
    const interval = setInterval(() => {
      setPlaybackDay(prev => {
        const next = prev + Math.max(1, Math.round(speed));
        if (next >= simHistory.length - 1) { setIsPlaying(false); return simHistory.length - 1; }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, speed, simHistory.length]);

  // Apply scenario
  const applyScenario = useCallback((name: string) => {
    const sc = SCENARIOS.find(s => s.name === name);
    if (!sc) return;
    const p = { ...sc.params, model: activeModel };
    const ints = sc.interventions.map((i, idx) => ({ ...i, id: String(idx) }));
    setParams(p);
    setInterventions(ints);
    setSelectedScenario(name);
    setLoadedExample(null);
    activeRegions.current = INITIAL_REGIONS;
    runSimulation(p, ints, INITIAL_REGIONS);
  }, [activeModel, runSimulation]);

  // Load a disease example
  const loadExample = useCallback((ex: DiseaseExample) => {
    const p = { ...ex.params, model: ex.model };
    setParams(p);
    setActiveModel(ex.model);
    setInterventions([]);
    setSelectedScenario('Base');
    setLoadedExample(ex.id);
    setShowExamplesModal(false);
    activeRegions.current = ex.initialRegions;
    runSimulation(p, [], ex.initialRegions);
  }, [runSimulation]);

  // Leaflet map init
  useEffect(() => {
    if (activeView !== 'map' || mapType !== '2d' || !mapRef.current) return;

    if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    leafletMarkers.current.clear();

    const map = L.map(mapRef.current, { zoomControl: true, preferCanvas: true })
      .setView([46.2276, 2.2137], 5);

    const tiles: Record<string, string> = {
      light:     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      satellite: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    };
    L.tileLayer(tiles[mapSettings.tileTheme], {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    displayRegions.forEach(region => {
      const color = getRegionColor(region);
      const marker = L.circleMarker([region.latitude, region.longitude], {
        radius: Math.sqrt(region.population) / 350,
        color, fillColor: color,
        fillOpacity: mapSettings.markerOpacity, weight: 1.5,
      });
      marker.bindPopup(`
        <b>${region.name}</b><br/>
        ${t('simulation.map.popup_pop')} ${region.population.toLocaleString()}<br/>
        ${t('simulation.map.popup_infected')} ${Math.round(region.I)} (${(region.I / region.population * 100).toFixed(2)}%)<br/>
        ${t('simulation.map.popup_deaths')} ${Math.round(region.D ?? 0)}
      `);
      if (mapSettings.showLabels) {
        marker.bindTooltip(region.name, { permanent: true, direction: 'top', className: 'text-xs' });
      }
      marker.addTo(map);
      leafletMarkers.current.set(region.id, marker);
    });

    displayRegions.forEach(region => {
      region.connections.forEach(tid => {
        const target = displayRegions.find(r => r.id === tid);
        if (target) {
          L.polyline([[region.latitude, region.longitude], [target.latitude, target.longitude]], {
            color: isDark ? '#475569' : '#94a3b8', weight: 1.5, opacity: 0.35,
          }).addTo(map);
        }
      });
    });

    leafletRef.current = map;
    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
      leafletMarkers.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType, mapSettings, activeView, isDark]);

  // Leaflet data update
  useEffect(() => {
    if (!leafletRef.current || mapType !== '2d') return;
    displayRegions.forEach(region => {
      const marker = leafletMarkers.current.get(region.id);
      if (!marker) return;
      const color = getRegionColor(region);
      marker.setStyle({ color, fillColor: color, fillOpacity: mapSettings.markerOpacity });
      marker.setRadius(Math.sqrt(region.population) / 350);
      marker.getPopup()?.setContent(`
        <b>${region.name}</b><br/>
        ${t('simulation.map.popup_pop')} ${region.population.toLocaleString()}<br/>
        ${t('simulation.map.popup_infected')} ${Math.round(region.I)} (${(region.I / region.population * 100).toFixed(2)}%)<br/>
        ${t('simulation.map.popup_deaths')} ${Math.round(region.D ?? 0)}
      `);
    });
  }, [displayRegions, mapType, mapSettings.markerOpacity]);

  // Globe init
  useEffect(() => {
    if (activeView !== 'map' || mapType !== '3d' || !mapRef.current) return;

    const cleanupGlobe = () => {
      if (globeRef.current) {
        try {
          const renderer = globeRef.current.renderer?.();
          if (renderer) {
            renderer.dispose();
            renderer.forceContextLoss?.();
            renderer.domElement?.remove();
          }
        } catch {}
        globeRef.current = null;
      }
      globeContainerRef.current?.remove();
      globeContainerRef.current = null;
    };

    cleanupGlobe();

    const container = document.createElement('simulation.div');
    container.style.cssText = 'width:100%;height:100%;position:absolute;top:0;left:0;';
    mapRef.current.appendChild(container);
    globeContainerRef.current = container;

    const globe = Globe()(container)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .pointOfView({ lat: 48, lng: 5, altitude: 1.5 })
      .pointsData(displayRegions.map(r => ({
        lat: r.latitude, lng: r.longitude,
        size: Math.sqrt(r.population) / 300000,
        color: getRegionColor(r), label: r.name,
      })))
      .pointAltitude('size')
      .pointColor('color')
      .pointRadius(0.5)
      .pointLabel((d: any) => `<div style="background:white;padding:6px;border-radius:6px;font-size:12px"><b>${d.label}</b></div>`)
      .arcsData(displayRegions.flatMap(r =>
        r.connections.map(tid => {
          const t2 = displayRegions.find(x => x.id === tid);
          return t2 ? { startLat: r.latitude, startLng: r.longitude, endLat: t2.latitude, endLng: t2.longitude } : null;
        }).filter(Boolean)
      ))
      .arcColor(() => '#94a3b8')
      .arcStroke(1)
      .arcAltitudeAutoScale(0.3)
      .atmosphereColor('#3a0ca3')
      .atmosphereAltitude(0.15)
      .onGlobeReady(() => {
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.4;
      });

    globeRef.current = globe;

    container.style.opacity = '0';
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.5s ease';
      container.style.opacity = '1';
    });

    return cleanupGlobe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapType, mapSettings, activeView]);

  // Globe data update
  useEffect(() => {
    if (!globeRef.current || mapType !== '3d') return;
    globeRef.current.pointsData(displayRegions.map(r => ({
      lat: r.latitude, lng: r.longitude,
      size: Math.sqrt(r.population) / 300000,
      color: getRegionColor(r), label: r.name,
    })));
  }, [displayRegions, mapType]);

  // D3 network
  useEffect(() => {
    if (activeView !== 'network' || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const W = svgRef.current.clientWidth || 600;
    const H = svgRef.current.clientHeight || 400;
    svg.selectAll('*').remove();

    const nodes: Region[] = displayRegions.map(r => ({ ...r }));
    const links = nodes.flatMap(r =>
      r.connections.map(tid => ({ source: r.id, target: tid }))
    );

    const sim = d3.forceSimulation<Region>(nodes)
      .force('link', d3.forceLink<Region, { source: string; target: string }>(links)
        .id(d => d.id).distance(networkSettings.linkDistance).strength(0.1))
      .force('charge', d3.forceManyBody().strength(networkSettings.chargeStrength))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide<Region>().radius(d => Math.sqrt(d.population) / 400 + 10));

    const link = svg.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', isDark ? '#475569' : '#94a3b8').attr('stroke-width', 1.5);

    const node = svg.append('g').selectAll('circle').data(nodes).enter().append('circle')
      .attr('r', d => Math.sqrt(d.population) / 700 + 6)
      .attr('fill', d => getRegionColor(d))
      .attr('stroke', isDark ? '#1e293b' : '#fff').attr('stroke-width', 2)
      .call(d3.drag<SVGCircleElement, Region>()
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append('title').text(d =>
      `${d.name}\n${t('simulation.charts.infected')}: ${fmt(d.I)} (${(d.I / d.population * 100).toFixed(2)}%)`
    );

    const labels = svg.append('g').selectAll('text').data(nodes).enter().append('text')
      .text(d => d.name).attr('font-size', 10).attr('dx', 14).attr('dy', 4)
      .attr('fill', isDark ? '#cbd5e1' : '#374151');

    sim.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x).attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x).attr('y2', d => (d.target as any).y);
      node.attr('cx', d => d.x ?? 0).attr('cy', d => d.y ?? 0);
      labels.attr('x', d => d.x ?? 0).attr('y', d => d.y ?? 0);
    });

    return () => sim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, networkSettings, isDark]);

  // Key indicators
  const frame = simHistory[playbackDay];
  const indicators = useMemo(() => {
    if (!frame) return { infections: 0, deaths: 0, Rt: 0, attackRate: 0, peakDay: 0 };
    const peakFrame = simHistory.reduce((mx, f) => f.totals.I > mx.totals.I ? f : mx, simHistory[0] ?? frame);
    return {
      infections: frame.totals.I,
      deaths:     frame.totals.D,
      Rt:         frame.Rt,
      attackRate: frame.totals.R / totalPop * 100,
      peakDay:    peakFrame?.day ?? 0,
    };
  }, [frame, simHistory, totalPop]);

  const chartSlice = useMemo(() => {
    if (!simHistory.length) return [];
    const slice = simHistory.slice(0, playbackDay + 1);
    const STEP  = Math.max(1, Math.floor(simHistory.length / 120));
    return slice.filter((_, i, arr) => i % STEP === 0 || i === arr.length - 1);
  }, [simHistory, playbackDay]);

  const epidemicCurveData = useMemo(() => {
    if (!chartSlice.length) return { labels: [], datasets: [] };
    const base = { tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, fill: true as const };
    return {
      labels: chartSlice.map(f => `${t('simulation.timeline.day_abbr')}${f.day}`),
      datasets: [
        { ...base, label: t('simulation.charts.susceptible'), data: chartSlice.map(f => f.totals.S), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)' },
        { ...base, label: t('simulation.charts.exposed'),     data: chartSlice.map(f => f.totals.E), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.05)' },
        { ...base, label: t('simulation.charts.infected'),    data: chartSlice.map(f => f.totals.I), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' },
        { ...base, label: t('simulation.charts.recovered'),   data: chartSlice.map(f => f.totals.R), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)' },
        { ...base, label: t('simulation.charts.deaths'),      data: chartSlice.map(f => f.totals.D), borderColor: '#6b7280', backgroundColor: 'rgba(107,114,128,0.04)' },
      ],
    };
  }, [chartSlice, t]);

  const newCasesData = useMemo(() => {
    if (!chartSlice.length) return { labels: [], datasets: [] };
    return {
      labels: chartSlice.map(f => `${t('simulation.timeline.day_abbr')}${f.day}`),
      datasets: [{ label: t('simulation.charts.new_cases_label'), data: chartSlice.map(f => f.newCases),
        borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.15)',
        fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }],
    };
  }, [chartSlice, t]);

  const rtData = useMemo(() => {
    if (!chartSlice.length) return { labels: [], datasets: [] };
    return {
      labels: chartSlice.map(f => `${t('simulation.timeline.day_abbr')}${f.day}`),
      datasets: [{ label: t('simulation.charts.rt_label'), data: chartSlice.map(f => parseFloat(f.Rt.toFixed(3))),
        borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)',
        fill: false, tension: 0.4, borderWidth: 2, pointRadius: 0 }],
    };
  }, [chartSlice, t]);

  const phaseData = useMemo(() => {
    if (!chartSlice.length) return { datasets: [] };
    return {
      datasets: [{ label: t('simulation.charts.phase_label'),
        data: chartSlice.filter((_, i) => i % 2 === 0 || i === chartSlice.length - 1).map(f => ({
          x: parseFloat((f.totals.S / totalPop * 100).toFixed(2)),
          y: parseFloat((f.totals.I / totalPop * 100).toFixed(2)),
        })),
        borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.15)',
        showLine: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }],
    };
  }, [chartSlice, totalPop, t]);

  const regionalData = useMemo(() => ({
    labels: displayRegions.map(r => regionNames[r.id] ?? r.name),
    datasets: [{
      label: t('simulation.charts.infection_rate'),
      data: displayRegions.map(r => r.population > 0
        ? parseFloat((r.I / r.population * 100).toFixed(3)) : 0),
      backgroundColor: displayRegions.map(r => (regionColors[r.id] ?? r.color) + 'cc'),
      borderColor: displayRegions.map(r => regionColors[r.id] ?? r.color),
      borderWidth: 1.5, borderRadius: 6,
    }],
  }), [displayRegions, regionNames, regionColors, t]);

  // Export helpers
  const exportCSV = useCallback(() => {
    const rows = simHistory.map(f => ({ day: f.day, ...f.totals, Rt: f.Rt.toFixed(3), newCases: f.newCases }));
    const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv' });
    const a = document.createElement('simulation.a'); a.href = URL.createObjectURL(blob); a.download = 'simulation.csv'; a.click();
  }, [simHistory]);

  const exportJSON = useCallback(() => {
    const state = { params, activeModel, interventions, simHistory };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('simulation.a'); a.href = URL.createObjectURL(blob); a.download = 'simulation.json'; a.click();
  }, [params, activeModel, interventions, simHistory]);

  // Derived display values for indicators
  const indicatorItems = [
    { label: t('simulation.indicators.day'),            value: String(playbackDay),                          accent: INDICATOR_ACCENTS[0] },
    { label: t('simulation.indicators.active_infected'), value: fmt(indicators.infections),                  accent: INDICATOR_ACCENTS[1] },
    { label: t('simulation.indicators.rt'),              value: indicators.Rt.toFixed(2),                    accent: INDICATOR_ACCENTS[2] },
    { label: t('simulation.indicators.attack_rate'),     value: `${indicators.attackRate.toFixed(1)}%`,      accent: INDICATOR_ACCENTS[3] },
    { label: t('simulation.indicators.peak_day'),        value: String(indicators.peakDay),                  accent: INDICATOR_ACCENTS[4] },
  ];

  // UI theme tokens
  const UI = {
    bg:      'bg-[#F8FAFC] dark:bg-[#0F172A]',
    card:    'bg-white dark:bg-slate-800/60 border border-border',
    text:    'text-foreground',
    muted:   'text-muted-foreground',
    input:   'bg-background border border-input text-foreground',
    hover:   isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50',
    active:  'bg-primary/10 text-primary border-primary',
  };

  // Shared timeline slider
  const TimelineSlider = () => (
    <div className={`flex items-center gap-3 px-4 py-2 border-t border-border bg-card`}>
      <button onClick={() => setPlaybackDay(0)} className={`${UI.muted} ${UI.hover} p-1 rounded-lg transition-colors`} title={t('simulation.timeline.start_title')}>
        <SkipBack size={14} />
      </button>
      <button onClick={() => setIsPlaying(v => !v)} disabled={isComputing || simHistory.length === 0}
        className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-40">
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <button onClick={() => setPlaybackDay(simHistory.length - 1)} className={`${UI.muted} ${UI.hover} p-1 rounded-lg transition-colors`} title={t('simulation.timeline.end_title')}>
        <SkipForward size={14} />
      </button>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className={`text-[10px] font-mono ${UI.muted} flex-shrink-0`}>{t('simulation.timeline.day_abbr')}0</span>
        <input type="range" min={0} max={Math.max(0, simHistory.length - 1)} value={playbackDay}
          onChange={e => { setPlaybackDay(Number(e.target.value)); setIsPlaying(false); }}
          className="flex-1 h-1.5 rounded-full accent-blue-600 cursor-pointer" />
        <span className={`text-[10px] font-mono ${UI.muted} flex-shrink-0`}>{t('simulation.timeline.day_abbr')}{simHistory.length - 1}</span>
      </div>
      <span className="text-xs font-bold text-primary font-mono flex-shrink-0 w-12 text-right">
        {t('simulation.timeline.day_abbr')}{playbackDay}
      </span>
      <div className="hidden sm:flex items-center gap-2">
        <span className={`text-[9px] uppercase tracking-wider ${UI.muted}`}>{t('simulation.timeline.speed_label')}</span>
        <input type="range" min={1} max={15} value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="w-16 h-1 accent-blue-600 cursor-pointer" />
        <span className={`text-[10px] font-mono ${UI.muted}`}>{speed}</span>
      </div>
      {/* Simulation duration selector */}
      <div className="hidden md:flex items-center gap-1.5 border-l border-border pl-3">
        <span className={`text-[9px] uppercase tracking-wider ${UI.muted} flex-shrink-0`}>{t('simulation.timeline.days_label')}</span>
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          {[90, 180, 365, 730].map(d => (
            <button key={d} onClick={() => {
              setSimDays(d);
              if (hasSimulation) runSimulation({ ...params, model: activeModel }, interventions, undefined, d);
            }}
              className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${simDays === d ? 'bg-background text-primary shadow-sm' : UI.muted}`}>
              {d < 365 ? t('simulation.timeline.days_short', { count: d }) : d === 365 ? t('simulation.timeline.1_year') : t('simulation.timeline.2_years')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Base chart options
  const chartOpts = useMemo(() => chartBase(isDark), [isDark]);

  // Rt chart options
  const rtOpts = useMemo(() => ({
    ...chartBase(isDark),
    plugins: {
      ...chartBase(isDark).plugins,
      annotation: {
        annotations: {
          threshold: {
            type: 'line' as const,
            yMin: 1, yMax: 1,
            borderColor: '#ef4444', borderWidth: 1.5, borderDash: [4, 4],
            label: {
              content: t('simulation.charts.rt_threshold'), display: true, position: 'end' as const,
              color: '#ef4444', font: { size: 10 },
            },
          },
        },
      },
    },
  }), [isDark, t]);

  // Memoized bar options
  const barOpts = useMemo(() => ({
    ...chartOpts,
    plugins: { ...chartOpts.plugins, legend: { display: false } },
    scales: {
      x: { ...chartOpts.scales.x, ticks: { ...chartOpts.scales.x.ticks, font: { size: 8 } } },
      y: { ...chartOpts.scales.y, ticks: { ...chartOpts.scales.y.ticks, callback: (v: any) => `${Number(v).toFixed(2)}%` } },
    },
  }), [chartOpts]);

  // Memoized scatter options
  const phaseOpts = useMemo(() => ({
    ...chartOpts,
    scales: {
      x: { ...chartOpts.scales.x, title: { display: true, text: t('simulation.charts.pct_susceptible'), font: { size: 9 }, color: isDark ? '#64748b' : '#6b7280' } },
      y: { ...chartOpts.scales.y, title: { display: true, text: t('simulation.charts.pct_infected'), font: { size: 9 }, color: isDark ? '#64748b' : '#6b7280' } },
    },
  }), [chartOpts, isDark, t]);

  // ChartsPanel
  const ChartsPanelContent = () => {
    if (!hasSimulation) return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <BarChart2 size={32} className={`mx-auto mb-3 ${UI.muted} opacity-40`} />
          <p className={`text-sm ${UI.muted}`}>{t('simulation.charts.empty')}</p>
        </div>
      </div>
    );
    return (
      <div className="p-4 space-y-4">
        <div className={`${UI.card} rounded-2xl p-4`} style={{ height: 240 }}>
          <p className={`text-xs font-bold ${UI.muted} uppercase tracking-wider mb-3`}>{t('simulation.charts.epidemic_curves')}</p>
          <div style={{ position: 'relative', height: 190 }}>
            <Line key={`epi-${simRunId}`} data={epidemicCurveData} options={chartOpts} updateMode="none" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`${UI.card} rounded-2xl p-4`} style={{ height: 200 }}>
            <p className={`text-xs font-bold ${UI.muted} uppercase tracking-wider mb-3`}>{t('simulation.charts.rt_section')}</p>
            <div style={{ position: 'relative', height: 150 }}>
              <Line key={`rt-${simRunId}`} data={rtData} options={rtOpts as any} />
            </div>
          </div>
          <div className={`${UI.card} rounded-2xl p-4`} style={{ height: 200 }}>
            <p className={`text-xs font-bold ${UI.muted} uppercase tracking-wider mb-3`}>{t('simulation.charts.new_cases_section')}</p>
            <div style={{ position: 'relative', height: 150 }}>
              <Line key={`nc-${simRunId}`} data={newCasesData} options={chartOpts} />
            </div>
          </div>
          <div className={`${UI.card} rounded-2xl p-4`} style={{ height: 200 }}>
            <p className={`text-xs font-bold ${UI.muted} uppercase tracking-wider mb-3`}>{t('simulation.charts.phase_portrait')}</p>
            <div style={{ position: 'relative', height: 150 }}>
              <Scatter key={`ph-${simRunId}`} data={phaseData} options={phaseOpts as any} />
            </div>
          </div>
          <div className={`${UI.card} rounded-2xl p-4`} style={{ height: 200 }}>
            <p className={`text-xs font-bold ${UI.muted} uppercase tracking-wider mb-3`}>{t('simulation.charts.regional_rate', { day: playbackDay })}</p>
            <div style={{ position: 'relative', height: 150 }}>
              <Bar key={`rg-${simRunId}`} data={regionalData} options={barOpts as any} />
            </div>
          </div>
        </div>
      </div>
    );
  };
  const ChartsPanel = ChartsPanelContent;

  // Table panel
  const TablePanel = () => (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs">
        <thead className={`sticky top-0 bg-muted`}>
          <tr>
            {[t('simulation.table.col_region'), 'S', 'E', 'I', 'R', 'D', t('simulation.table.col_rate')].map(h => (
              <th key={h} className={`px-3 py-2 text-left font-bold ${UI.muted} uppercase tracking-wider text-[9px]`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRegions.map(r => (
            <tr key={r.id} className={`border-t border-border ${UI.hover} transition-colors`}>
              <td className="px-3 py-2 font-medium">{regionNames[r.id] ?? r.name}</td>
              <td className="px-3 py-2 font-mono text-blue-500">{fmt(r.S)}</td>
              <td className="px-3 py-2 font-mono text-amber-500">{fmt(r.E)}</td>
              <td className="px-3 py-2 font-mono text-rose-500 font-bold">{fmt(r.I)}</td>
              <td className="px-3 py-2 font-mono text-emerald-500">{fmt(r.R)}</td>
              <td className="px-3 py-2 font-mono text-slate-500">{fmt(r.D ?? 0)}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-mono text-[9px] font-bold">
                  {(r.I / r.population * 100).toFixed(3)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Regions side panel
  const RegionsPanel = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-4`}>{t('simulation.regions.title')}</p>
      {displayRegions.map(region => (
        <div key={region.id} className={`${UI.card} rounded-2xl p-3`}>
          <div className="flex items-center justify-between mb-1">
            <input
              value={regionNames[region.id] ?? region.name}
              onChange={e => setRegionNames(prev => ({ ...prev, [region.id]: e.target.value }))}
              className=" text-sm font-semibold outline-none flex-1 mr-2"
            />
            <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-inner"
              style={{ backgroundColor: regionColors[region.id] ?? region.color }} />
          </div>
          <div className={`flex justify-between text-[10px] ${UI.muted} mb-2`}>
            <span>{region.population.toLocaleString()}</span>
            <span className="text-rose-500 font-bold">{t('simulation.regions.infected_pct', { pct: (region.I / region.population * 100).toFixed(3) })}</span>
          </div>
          <button
            onClick={() => setSelectedRegionId(selectedRegionId === region.id ? null : region.id)}
            className={`text-[10px] font-bold text-primary hover:underline`}>
            {selectedRegionId === region.id ? t('simulation.actions.close_color') : t('simulation.actions.color')}
          </button>
          {selectedRegionId === region.id && (
            <div className="mt-3 flex justify-center scale-90 origin-top">
              <HexColorPicker
                color={regionColors[region.id] ?? region.color}
                onChange={c => setRegionColors(prev => ({ ...prev, [region.id]: c }))} />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Controls panel (mobile)
  const ControlsPanel = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* Model selector */}
      <div>
        <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-2`}>{t('simulation.controls.model')}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['SIR', 'SEIR', 'SEIRD', 'SEIQRD'] as ModelType[]).map(m => (
            <button key={m} onClick={() => {
              setActiveModel(m);
              if (hasSimulation) runSimulation({ ...params, model: m }, interventions);
            }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${activeModel === m ? 'bg-primary text-primary-foreground' : `${UI.card} ${UI.muted}`}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario */}
      <div>
        <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-2`}>{t('simulation.controls.scenario')}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {SCENARIOS.map(sc => (
            <button key={sc.name} onClick={() => applyScenario(sc.name)}
              className={`py-2 px-3 rounded-xl text-xs font-medium text-left transition-all ${selectedScenario === sc.name ? 'bg-primary text-primary-foreground' : `${UI.card} ${UI.muted}`}`}>
              {t(`scenario.${sc.name}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Params summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>{t('simulation.controls.params')}</p>
          <button onClick={() => { setEditParams(params); setShowParamsModal(true); }}
            className="text-[10px] text-primary font-bold">{t('simulation.actions.edit')}</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'β', value: params.beta, color: 'text-amber-500' },
            { label: 'γ', value: params.gamma, color: 'text-emerald-500' },
            { label: 'σ', value: params.sigma, color: 'text-blue-500' },
            { label: 'μ', value: params.mu, color: 'text-rose-500' },
          ].map(p => (
            <div key={p.label} className={`${UI.card} rounded-xl p-2.5`}>
              <span className={`text-[10px] ${UI.muted}`}>{p.label}</span>
              <div className={`text-base font-black font-mono ${p.color}`}>{p.value.toFixed(3)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interventions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>{t('simulation.controls.interventions')}</p>
          <button onClick={() => setShowInterventionModal(true)}
            className="text-[10px] text-primary font-bold flex items-center gap-0.5">
            <Plus size={10} /> {t('simulation.actions.add')}
          </button>
        </div>
        {interventions.length === 0
          ? <p className={`text-xs ${UI.muted}`}>{t('simulation.controls.no_interventions')}</p>
          : interventions.map(i => (
            <div key={i.id} className={`${UI.card} rounded-xl p-2.5 flex items-center justify-between mb-1.5`}>
              <div>
                <p className="text-xs font-semibold">{t(`intervention_modal.types.${i.type}`)}</p>
                <p className={`text-[10px] ${UI.muted}`}>{t('simulation.intervention_modal.intervention_day', { day: i.startDay, pct: i.effectiveness })}</p>
              </div>
              <button onClick={() => setInterventions(prev => prev.filter(x => x.id !== i.id))}
                className="text-rose-400 hover:text-rose-600 p-1"><X size={12} /></button>
            </div>
          ))
        }
      </div>

      {/* Export */}
      <div>
        <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-2`}>{t('simulation.controls.export')}</p>
        <div className="flex gap-2">
          <button onClick={exportCSV} className={`flex-1 py-2 ${UI.card} rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 ${UI.muted}`}>
            <Download size={12} /> {t('simulation.actions.csv')}
          </button>
          <button onClick={exportJSON} className={`flex-1 py-2 ${UI.card} rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 ${UI.muted}`}>
            <Download size={12} /> {t('simulation.actions.json')}
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile bottom navigation
  const MobileNav = () => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-1 z-50">
      {([
        { id: 'map',      icon: MapIcon,   label: t('simulation.mobile_nav.map')      },
        { id: 'charts',   icon: BarChart2, label: t('simulation.mobile_nav.charts')   },
        { id: 'regions',  icon: Users,     label: t('simulation.mobile_nav.regions')  },
        { id: 'controls', icon: Sliders,   label: t('simulation.mobile_nav.controls') },
      ] as const).map(tab => (
        <button key={tab.id} onClick={() => setMobileTab(tab.id)}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] transition-all
            ${mobileTab === tab.id ? 'text-primary bg-primary/10' : `${UI.muted} ${UI.hover}`}`}>
          <tab.icon size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  // Empty state
  const EmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
      <div className={`w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-5`}>
        <ChartScatter size={28} className="text-primary" />
      </div>
      <h2 className="text-xl font-black mb-2">{t('simulation.empty_state.title')}</h2>
      <p className={`text-sm ${UI.muted} max-w-xs mb-8`}>
        {t('simulation.empty_state.description')}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowExamplesModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
          <Database size={15} /> {t('simulation.empty_state.load_example')}
        </button>
        <button
          onClick={() => applyScenario('Base')}
          className={`flex items-center gap-2 px-5 py-2.5 ${UI.card} rounded-2xl text-sm font-medium ${UI.muted} hover:opacity-80 transition-all`}>
          <Play size={14} fill="currentColor" /> {t('simulation.empty_state.default_scenario')}
        </button>
      </div>
      {/* Quick example chips */}
      <div className="flex flex-wrap justify-center gap-2 mt-8">
        {DISEASE_EXAMPLES.map(ex => (
          <button key={ex.id} onClick={() => loadExample(ex)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${UI.card} hover:border-primary/40 hover:text-primary`}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ex.iconColor }} />
            {t(`simulation.disease.${ex.id}.name`)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-[100dvh] ${UI.bg} ${UI.text} font-sans overflow-hidden`}>

      {/* Header */}
      <header className={`${UI.card.replace('border', '')} border-b border-border px-4 py-3 flex-shrink-0 z-10`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs">
            <Link href="/" className={`${UI.muted} hover:text-primary transition-colors`}>{t('simulation.nav.home')}</Link>
            <ChevronRight size={12} className={UI.muted} />
            <Link href="/workspace" className={`${UI.muted} hover:text-primary transition-colors`}>{t('simulation.nav.dashboard')}</Link>
            <ChevronRight size={12} className={UI.muted} />
            <span className="font-semibold">{t('simulation.nav.simulation')}</span>
          </nav>

          {/* Desktop model selector */}
          <div className="hidden lg:flex items-center gap-2 bg-muted p-1 rounded-xl">
            {(['SIR', 'SEIR', 'SEIRD', 'SEIQRD'] as ModelType[]).map(m => (
              <button key={m} onClick={() => {
                setActiveModel(m);
                if (hasSimulation) runSimulation({ ...params, model: m }, interventions);
              }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeModel === m ? 'bg-background text-primary shadow-sm' : UI.muted}`}>
                {m}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scenario selector */}
            <div className="relative flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${UI.muted} border-r border-border pr-2`}>{t('simulation.header.scenario_label')}</span>
              <select value={selectedScenario}
                onChange={e => { setSelectedScenario(e.target.value); applyScenario(e.target.value); }}
                className="appearance-none  text-xs font-semibold pr-6 outline-none cursor-pointer">
                {SCENARIOS.map(s => <option key={s.name} value={s.name}>{t(`scenario.${s.name}`)}</option>)}
              </select>
              <ChevronDown size={12} className={`absolute right-2 pointer-events-none ${UI.muted}`} />
            </div>

            <button onClick={() => { setEditParams(params); setIsComparisonParams(false); setShowParamsModal(true); }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs font-medium ${UI.muted} ${UI.hover} transition-all`}>
              <Settings size={13} /> {t('simulation.header.params_btn')}
            </button>

            <button onClick={() => setShowInterventionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-medium hover:opacity-90 transition-all shadow-sm">
              <Plus size={13} /> {t('simulation.header.intervention_btn')}
            </button>

            {switchable && (
              <button onClick={toggleTheme} className={`p-2 ${UI.card} rounded-xl ${UI.muted} ${UI.hover} transition-all`}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}

            <button onClick={() => setShowExamplesModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                ${loadedExample ? 'bg-primary/10 text-primary border border-primary/30' : `${UI.card} ${UI.muted} ${UI.hover}`}`}>
              <Database size={13} /> {t('simulation.header.examples_btn')}
            </button>
            <button onClick={() => setShowExplanationModal(true)} className={`p-2 ${UI.card} rounded-xl ${UI.muted} ${UI.hover} transition-all`}>
              <Info size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Indicators */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 flex-shrink-0">
        {indicatorItems.map((item, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
            className={`relative overflow-hidden ${UI.card} rounded-2xl p-3`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.accent} rounded-l-2xl`} />
            <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-1`}>{item.label}</p>
            <p className="text-xl font-black tracking-tight">{isComputing ? '…' : item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Desktop view tabs + controls bar */}
      <div className={`hidden lg:flex items-center justify-between gap-4 px-4 pb-3 flex-shrink-0`}>
        {/* View tabs */}
        <div className="flex bg-muted p-1 rounded-xl">
          {([
            { id: 'map',     icon: MapIcon,   label: t('simulation.views.map')     },
            { id: 'charts',  icon: BarChart2, label: t('simulation.views.charts')  },
            { id: 'table',   icon: Table2,    label: t('simulation.views.table')   },
            { id: 'network', icon: Network,   label: t('simulation.views.network') },
          ] as const).map(v => (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeView === v.id ? 'bg-background text-foreground shadow-sm' : UI.muted}`}>
              <v.icon size={13} /> {v.label}
            </button>
          ))}
        </div>

        {/* Export + comparison */}
        <div className="flex items-center gap-2">
          {isComputing && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          <button onClick={exportCSV} className={`flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs ${UI.muted} ${UI.hover} transition-all`}>
            <Download size={12} /> {t('simulation.actions.csv')}
          </button>
          <button onClick={exportJSON} className={`flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs ${UI.muted} ${UI.hover} transition-all`}>
            <Download size={12} /> {t('simulation.actions.json')}
          </button>
          <button onClick={() => { setEditParams(params); setIsComparisonParams(true); setShowParamsModal(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isComparing ? 'bg-indigo-600 text-white' : `${UI.card} ${UI.muted}`}`}>
            <TrendingUp size={12} /> {t('simulation.actions.compare')}
          </button>
          <button onClick={() => setShowDataModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 ${UI.card} rounded-xl text-xs ${UI.muted} ${UI.hover} transition-all`}>
            <Upload size={12} /> {t('simulation.actions.import')}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden min-h-0">

        {/* Desktop: main panel (2/3) */}
        <div className="hidden lg:flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Map view */}
          {activeView === 'map' && !hasSimulation && (
            <div className="flex-1 mx-3 mb-3 rounded-3xl border border-border overflow-hidden">
              {EmptyState()}
            </div>
          )}
          {activeView === 'map' && hasSimulation && (
            <div className="flex-1 relative overflow-hidden mx-3 mb-3 rounded-3xl border border-border">
              {/* Map type toggle */}
              <div className="absolute top-3 left-3 z-20 flex bg-card/90 backdrop-blur-sm border border-border rounded-xl p-0.5">
                {(['2d', '3d'] as MapType[]).map(tp => (
                  <button key={tp} onClick={() => setMapType(tp)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${mapType === tp ? 'bg-primary text-primary-foreground shadow-sm' : UI.muted}`}>
                    {tp === '2d' ? t('simulation.map.flat') : t('simulation.map.globe')}
                  </button>
                ))}
              </div>
              {/* Settings panel toggle */}
              <button onClick={() => setShowSidePanel(v => !v)}
                className={`absolute top-3 right-3 z-20 p-2.5 rounded-2xl backdrop-blur-sm border border-border shadow-lg transition-all ${showSidePanel ? 'bg-slate-900 text-white' : 'bg-card/90 text-foreground hover:text-primary'}`}>
                <Settings size={16} />
              </button>
              {/* Settings side panel */}
              <div className={`absolute top-0 right-0 h-full w-72 bg-card/95 backdrop-blur-2xl border-l border-border z-10 transform transition-transform duration-300 shadow-2xl ${showSidePanel ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 pt-16 h-full overflow-y-auto space-y-6">
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>{t('simulation.map.view_label')}</p>
                  <div>
                    <p className={`text-xs font-medium ${UI.muted} mb-2`}>{t('simulation.map.projection')}</p>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
                      {(['2d', '3d'] as MapType[]).map(tp => (
                        <button key={tp} onClick={() => setMapType(tp)}
                          className={`py-1.5 text-xs rounded-lg transition-all ${mapType === tp ? 'bg-background text-primary font-bold shadow-sm' : UI.muted}`}>
                          {tp === '2d' ? t('simulation.map.flat_2d') : t('simulation.map.globe_3d')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${UI.muted} mb-2`}>{t('simulation.map.tile_theme')}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([['light', t('simulation.map.light')], ['dark', t('simulation.map.dark')], ['satellite', t('simulation.map.satellite')]] as [string, string][]).map(([v, l]) => (
                        <button key={v} onClick={() => setMapSettings(p => ({ ...p, tileTheme: v as 'light' | 'dark' | 'satellite' }))}
                          className={`py-1.5 text-xs rounded-xl transition-all ${mapSettings.tileTheme === v ? 'bg-primary/10 text-primary font-bold' : `bg-muted ${UI.muted}`}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${UI.muted} mb-1`}>{t('simulation.map.opacity')}</p>
                    <input type="range" min={0.2} max={1} step={0.05} value={mapSettings.markerOpacity}
                      onChange={e => setMapSettings(p => ({ ...p, markerOpacity: Number(e.target.value) }))}
                      className="w-full h-1.5 accent-blue-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${UI.muted}`}>{t('simulation.map.labels_toggle')}</span>
                    <button onClick={() => setMapSettings(p => ({ ...p, showLabels: !p.showLabels }))}
                      className={`w-10 h-5 rounded-full transition-all ${mapSettings.showLabels ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-0.5 ${mapSettings.showLabels ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Map container */}
              <div ref={mapRef} className="w-full h-full" />
            </div>
          )}

          {/* Charts view */}
          {activeView === 'charts' && (
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {ChartsPanel()}
            </div>
          )}

          {/* Table view */}
          {activeView === 'table' && (
            <div className="flex-1 mx-3 mb-3 rounded-3xl border border-border overflow-hidden">
              <div className={`px-4 py-3 border-b border-border`}>
                <p className="text-sm font-bold">{t('simulation.table.title', { day: playbackDay })}</p>
              </div>
              {TablePanel()}
            </div>
          )}

          {/* Network view */}
          {activeView === 'network' && (
            <div className="flex-1 mx-3 mb-3 rounded-3xl border border-border overflow-hidden relative">
              <svg ref={svgRef} className="w-full h-full" />
              <div className={`absolute bottom-4 right-4 ${UI.card} rounded-2xl p-3 space-y-1.5`}>
                {[['#ef4444', t('simulation.network.high')], ['#f59e0b', t('simulation.network.medium')], ['-', t('simulation.network.low')]].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c === '-' ? '#3b82f6' : c }} />
                    <span className={UI.muted}>{l}</span>
                  </div>
                ))}
              </div>
              {/* Network settings */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {(['circle','square','triangle'] as const).map(shape => (
                  <button key={shape} onClick={() => setNetworkSettings(p => ({ ...p, nodeShape: shape }))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${networkSettings.nodeShape === shape ? 'bg-primary text-primary-foreground' : `${UI.card} ${UI.muted}`}`}>
                    {shape === 'circle' ? '●' : shape === 'square' ? '■' : '▲'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline slider */}
          <div className="mx-3 mb-3 rounded-2xl border border-border overflow-hidden">
            {TimelineSlider()}
          </div>
        </div>

        {/* Desktop: right side panel (1/3) */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 mr-3 mb-3 space-y-3 overflow-y-auto">
          {/* Params card */}
          <div className={`${UI.card} rounded-3xl p-5 flex-shrink-0`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black tracking-tight">{t('simulation.params_card.title', { model: activeModel })}</h2>
              <button onClick={() => { setEditParams(params); setShowParamsModal(true); }}
                className={`p-1.5 ${UI.hover} rounded-xl transition-colors ${UI.muted}`}>
                <Settings size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: t('simulation.params_card.beta'),  value: params.beta,  cls: 'bg-amber-500/10 text-amber-600' },
                { label: t('simulation.params_card.gamma'), value: params.gamma, cls: 'bg-emerald-500/10 text-emerald-600' },
                { label: t('simulation.params_card.sigma'), value: params.sigma, cls: 'bg-blue-500/10 text-blue-600' },
                { label: t('simulation.params_card.mu'),    value: params.mu,    cls: 'bg-rose-500/10 text-rose-600' },
              ].map(p => (
                <div key={p.label} className={`${p.cls} rounded-2xl p-2.5`}>
                  <p className="text-[9px] uppercase font-bold opacity-70 mb-0.5">{p.label}</p>
                  <p className="text-lg font-black font-mono">{p.value.toFixed(3)}</p>
                </div>
              ))}
            </div>

            {/* Active interventions */}
            {interventions.length > 0 && (
              <div>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted} mb-2`}>{t('simulation.controls.interventions')}</p>
                {interventions.map(i => (
                  <div key={i.id} className={`flex items-center justify-between p-2 bg-muted rounded-xl mb-1.5`}>
                    <div>
                      <p className="text-xs font-semibold">{t(`intervention_modal.types.${i.type}`)}</p>
                      <p className={`text-[10px] ${UI.muted}`}>{t('simulation.intervention_modal.intervention_day', { day: i.startDay, pct: i.effectiveness })}</p>
                    </div>
                    <button onClick={() => setInterventions(prev => prev.filter(x => x.id !== i.id))}
                      className="text-rose-400 hover:text-rose-600 p-0.5"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regions card */}
          <div className={`${UI.card} rounded-3xl flex-1 overflow-hidden`}>
            <div className="px-5 pt-5 pb-2">
              <p className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>{t('simulation.regions.title')}</p>
            </div>
            <div className="overflow-y-auto px-4 pb-4 space-y-2" style={{ maxHeight: '360px' }}>
              {displayRegions.map(region => (
                <div key={region.id} className={`p-3 bg-muted rounded-2xl`}>
                  <div className="flex items-center justify-between mb-1">
                    <input value={regionNames[region.id] ?? region.name}
                      onChange={e => setRegionNames(p => ({ ...p, [region.id]: e.target.value }))}
                      className=" text-xs font-semibold outline-none flex-1 mr-1.5" />
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: regionColors[region.id] ?? region.color }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] ${UI.muted}`}>{t('simulation.regions.infected_count', { count: fmt(region.I) })}</span>
                    <button onClick={() => setSelectedRegionId(selectedRegionId === region.id ? null : region.id)}
                      className="text-[10px] text-primary font-bold hover:underline">{t('simulation.actions.color')}</button>
                  </div>
                  {selectedRegionId === region.id && (
                    <div className="mt-3 flex justify-center scale-[0.85] origin-top">
                      <HexColorPicker color={regionColors[region.id] ?? region.color}
                        onChange={c => setRegionColors(p => ({ ...p, [region.id]: c }))} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: full-screen panels */}
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden min-h-0 pb-14">
          {mobileTab === 'map' && !hasSimulation && (
            <div className="flex-1 border-b border-border overflow-hidden">
              {EmptyState()}
            </div>
          )}
          {mobileTab === 'map' && hasSimulation && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 relative overflow-hidden mx-2 mt-1 rounded-2xl border border-border">
                <div className="absolute top-2 left-2 z-20 flex bg-card/90 backdrop-blur-sm border border-border rounded-xl p-0.5">
                  {(['2d', '3d'] as MapType[]).map(tp => (
                    <button key={tp} onClick={() => setMapType(tp)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${mapType === tp ? 'bg-primary text-primary-foreground' : UI.muted}`}>
                      {tp === '2d' ? t('simulation.map.flat') : t('simulation.map.globe')}
                    </button>
                  ))}
                </div>
                <div ref={mapRef} className="w-full h-full" />
              </div>
              <div className="mx-2 my-1 rounded-2xl border border-border overflow-hidden">
                {TimelineSlider()}
              </div>
            </div>
          )}
          {mobileTab === 'charts' && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 overflow-hidden min-h-0">
                {ChartsPanel()}
              </div>
              <div className="flex-shrink-0 border-t border-border overflow-hidden">
                {TimelineSlider()}
              </div>
            </div>
          )}
          {mobileTab === 'regions' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {RegionsPanel()}
            </div>
          )}
          {mobileTab === 'controls' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {ControlsPanel()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {MobileNav()}

      {/* Modal - Params */}
      <AnimatePresence>
        {showParamsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60  flex items-center justify-center p-4 z-50"
            onClick={() => setShowParamsModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className={`${UI.card} rounded-3xl bg-white dark:bg-slate-900 w-full max-w-xl shadow-2xl`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-lg font-black">{isComparisonParams ? t('simulation.params_modal.title_comparison') : t('simulation.params_modal.title')}</h2>
                  <p className={`text-xs ${UI.muted} mt-0.5`}>{t('simulation.params_modal.subtitle', { model: activeModel })}</p>
                </div>
                <button onClick={() => setShowParamsModal(false)} className={`p-2 ${UI.hover} rounded-xl ${UI.muted}`}><X size={16} /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-5">
                {(Object.entries(editParams).filter(([k]) => !['model'].includes(k)) as [string, number][]).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    beta:     t('simulation.params_modal.beta'),
                    gamma:    t('simulation.params_modal.gamma'),
                    sigma:    t('simulation.params_modal.sigma'),
                    mu:       t('simulation.params_modal.mu'),
                    delta:    t('simulation.params_modal.delta'),
                    theta:    t('simulation.params_modal.theta'),
                    mobility: t('simulation.params_modal.mobility'),
                  };
                  return (
                    <div key={key}>
                      <label className={`block text-xs font-medium ${UI.muted} mb-2`}>{labels[key] ?? key}</label>
                      <input type="range" min={0} max={key === 'mobility' ? 0.5 : 1} step={0.005} value={value}
                        onChange={e => setEditParams(p => ({ ...p, [key]: Number(e.target.value) }))}
                        className="w-full h-1.5 rounded-full accent-blue-600" />
                      <div className={`flex justify-between text-[10px] ${UI.muted} mt-1`}>
                        <span>0</span>
                        <span className="font-bold text-foreground font-mono">{Number(value).toFixed(3)}</span>
                        <span>{key === 'mobility' ? 0.5 : 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 p-6 pt-0">
                <button onClick={() => setShowParamsModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm ${UI.muted} ${UI.hover} transition-all`}>
                  {t('simulation.actions.cancel')}
                </button>
                <button onClick={() => {
                  if (isComparisonParams) {
                    const p = { ...editParams, model: activeModel };
                    setCompHistory(computeTrajectory(p, interventions, simDaysRef.current));
                    setIsComparing(true);
                    setIsComparisonParams(false);
                  } else {
                    const p = { ...editParams, model: activeModel };
                    setParams(p);
                    runSimulation(p, interventions);
                  }
                  setShowParamsModal(false);
                }}
                  className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all">
                  {t('simulation.actions.apply')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal - Intervention */}
      <AnimatePresence>
        {showInterventionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowInterventionModal(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className={`${UI.card} rounded-3xl w-full bg-white dark:bg-slate-900 max-w-md shadow-2xl`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black">{t('simulation.intervention_modal.title')}</h2>
                <button onClick={() => setShowInterventionModal(false)} className={`p-2 ${UI.hover} rounded-xl ${UI.muted}`}><X size={16} /></button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className={`block text-xs font-medium ${UI.muted} mb-2`}>{t('simulation.intervention_modal.type_label')}</label>
                  <select value={newIntervention.type}
                    onChange={e => setNewIntervention(p => ({ ...p, type: e.target.value }))}
                    className={`w-full px-3 py-2 ${UI.input} rounded-xl text-sm outline-none`}>
                    {['Confinement','Vaccination','Distanciation','Masques','Fermeture écoles'].map(intType => (
                      <option key={intType} value={intType}>{t(`intervention_modal.types.${intType}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${UI.muted} mb-2`}>
                    {t('simulation.intervention_modal.effectiveness_prefix')} <span className="font-bold text-foreground">{newIntervention.effectiveness}%</span>
                  </label>
                  <input type="range" min={0} max={95} value={newIntervention.effectiveness}
                    onChange={e => setNewIntervention(p => ({ ...p, effectiveness: Number(e.target.value) }))}
                    className="w-full h-1.5 accent-blue-600" />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${UI.muted} mb-2`}>{t('simulation.intervention_modal.start_day')}</label>
                  <input type="number" min={0} max={364} value={newIntervention.startDay}
                    onChange={e => setNewIntervention(p => ({ ...p, startDay: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 ${UI.input} rounded-xl text-sm outline-none`} />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 pt-0">
                <button onClick={() => setShowInterventionModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm ${UI.muted} ${UI.hover} transition-all`}>{t('simulation.actions.cancel')}</button>
                <button onClick={() => {
                  setInterventions(prev => [...prev, { ...newIntervention, id: Date.now().toString() }]);
                  setShowInterventionModal(false);
                  setNewIntervention({ type: 'Confinement', effectiveness: 50, startDay: 0 });
                }}
                  className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all">
                  {t('simulation.actions.add')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal - Import data */}
      <AnimatePresence>
        {showDataModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowDataModal(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className={`${UI.card} rounded-3xl w-full bg-white dark:bg-slate-900 max-w-md shadow-2xl`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black">{t('simulation.data_modal.title')}</h2>
                <button onClick={() => setShowDataModal(false)} className={`p-2 ${UI.hover} rounded-xl ${UI.muted}`}><X size={16} /></button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className={`block text-xs font-medium ${UI.muted} mb-2`}>{t('simulation.data_modal.csv_label')}</label>
                  <input type="file" accept=".csv"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      Papa.parse(file, {
                        header: true,
                        complete: results => {
                          const names: Record<string, string> = {};
                          const colors: Record<string, string> = {};
                          (results.data as any[]).forEach((row: any) => {
                            if (row.id && row.name) names[row.id] = row.name;
                            if (row.id && row.color) colors[row.id] = row.color;
                          });
                          setRegionNames(names);
                          setRegionColors(colors);
                          setShowDataModal(false);
                        },
                      });
                    }}
                    className={`w-full px-3 py-2 ${UI.input} rounded-xl text-sm cursor-pointer`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${UI.muted} mb-2`}>{t('simulation.data_modal.json_label')}</label>
                  <input type="file" accept=".json"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        try {
                          const state = JSON.parse(ev.target?.result as string);
                          if (state.params)      setParams(state.params);
                          if (state.activeModel) setActiveModel(state.activeModel);
                          if (state.interventions) setInterventions(state.interventions);
                        } catch {}
                        setShowDataModal(false);
                      };
                      reader.readAsText(file);
                    }}
                    className={`w-full px-3 py-2 ${UI.input} rounded-xl text-sm cursor-pointer`} />
                </div>
              </div>
              <div className="flex justify-end p-6 pt-0">
                <button onClick={() => setShowDataModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm ${UI.muted} ${UI.hover} transition-all`}>{t('simulation.actions.close')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal - Explanations */}
      <AnimatePresence>
        {showExplanationModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowExplanationModal(false)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              className={`${UI.card} rounded-3xl w-full bg-white dark:bg-slate-900 max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black">{t('simulation.explanation_modal.title')}</h2>
                <button onClick={() => setShowExplanationModal(false)} className={`p-2 ${UI.hover} rounded-xl ${UI.muted}`}><X size={16} /></button>
              </div>
              <div className="p-6 space-y-5 text-sm">
                {[
                  { title: t('simulation.explanation_modal.slider_title'),        body: t('simulation.explanation_modal.slider_body') },
                  { title: t('simulation.explanation_modal.models_title'),         body: t('simulation.explanation_modal.models_body') },
                  { title: t('simulation.explanation_modal.rt_title'),             body: t('simulation.explanation_modal.rt_body') },
                  { title: t('simulation.explanation_modal.phase_title'),          body: t('simulation.explanation_modal.phase_body') },
                  { title: t('simulation.explanation_modal.interventions_title'),  body: t('simulation.explanation_modal.interventions_body') },
                  { title: t('simulation.explanation_modal.comparison_title'),     body: t('simulation.explanation_modal.comparison_body') },
                ].map(({ title, body }) => (
                  <div key={title}>
                    <h3 className="font-bold mb-1">{title}</h3>
                    <p className={UI.muted}>{body}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end p-6 pt-0">
                <button onClick={() => setShowExplanationModal(false)}
                  className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all">
                  {t('simulation.actions.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal - Disease examples */}
      <AnimatePresence>
        {showExamplesModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowExamplesModal(false)}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className={`${UI.card} rounded-3xl w-full max-w-2xl bg-white dark:bg-slate-900  max-h-[85vh] overflow-y-auto`}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-lg font-black">{t('simulation.examples_modal.title')}</h2>
                  <p className={`text-xs ${UI.muted} mt-0.5`}>{t('simulation.examples_modal.subtitle')}</p>
                </div>
                <button onClick={() => setShowExamplesModal(false)} className={`p-2 ${UI.hover} rounded-xl ${UI.muted}`}><X size={16} /></button>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DISEASE_EXAMPLES.map(ex => (
                  <button key={ex.id} onClick={() => loadExample(ex)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${UI.hover} ${
                      loadedExample === ex.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}>
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ex.iconColor }} />
                        <span className="font-bold text-sm">{t(`simulation.disease.${ex.id}.name`)}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${ex.badgeColor}`}>
                        {t(`simulation.disease.${ex.id}.badge`)}
                      </span>
                    </div>
                    <p className={`text-[10px] ${UI.muted} mb-2 leading-relaxed`}>{t(`simulation.disease.${ex.id}.description`)}</p>
                    <div className="flex flex-wrap gap-2 text-[9px]">
                      <span className={`px-1.5 py-0.5 rounded-md bg-muted font-mono font-bold`}>{t('simulation.examples_modal.r0_label', { value: ex.R0 })}</span>
                      <span className={`px-1.5 py-0.5 rounded-md bg-muted font-mono`}>{ex.model}</span>
                      <span className={`px-1.5 py-0.5 rounded-md bg-muted`}>{ex.pathogen}</span>
                    </div>
                    <p className={`text-[9px] ${UI.muted} mt-2 italic`}>{t('simulation.examples_modal.source_prefix')} {ex.source}</p>
                    {loadedExample === ex.id && (
                      <p className="text-[9px] text-primary font-bold mt-1">{t('simulation.examples_modal.loaded')}</p>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-end p-4 pt-0">
                <button onClick={() => setShowExamplesModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm ${UI.muted} ${UI.hover} transition-all`}>{t('simulation.actions.close')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}