import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import Globe from 'react-globe.gl';
import { useTranslation } from 'react-i18next';

import {
  Calculator,
  TrendingUp,
  Clock,
  PieChart,
  Activity,
  Grid,
  Code,
  ExternalLink,
  Search,
  ArrowUpRight,
  Zap,
  Brain,
  Command,
  Menu,
  ArrowRight,
  ChevronRight,
  Presentation,
  Table2,
  Map,
  Cpu,
  FileText,
  Globe as GlobeIcon,
  Layers,
  Sliders,
  Database,
  Settings,
  BookOpen,
  X,
  Sparkles,
  Users,
  Users2,
  UserCheck,
  UserX,
  UserPlus,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

/**
 * Home page – Landing page of the OpenEPI application.
 * 
 * This component serves as the main entry point of the application. It provides:
 * - A hero section with a title and a search bar that opens a command palette (⌘K).
 * - A command palette listing all available modules with categories for quick navigation.
 * - A bento grid highlighting featured modules (Biostatistics, AI, Geospatial, Simulation).
 * - A comprehensive grid of all tools (epidemiological calculators, sample size, power, etc.)
 *   with responsive card layout and hover effects.
 * - A floating navigation bar (desktop) and a mobile drawer menu.
 * - An interactive 3D globe in the Geospatial card to illustrate mapping capabilities.
 * - A footer with branding and links.
 * 
 * The component uses Framer Motion for animations, Lucide icons, and a custom command palette
 * from shadcn/ui. All links are handled by wouter's Link component for client-side routing.
 * 
 * Implementation notes:
 * - The command palette is triggered by Cmd+K / Ctrl+K and contains all modules.
 * - Tools are defined in a constant array with metadata (title, description, href, icon, color).
 * - The globe auto-rotates using the globeRef and its controls.
 * - Responsive design: mobile menu slides in from the right, grid adapts using col-span classes.
 * - Dark mode support via Tailwind's dark: variants.
 */
export default function Home() {
  const { t } = useTranslation();
  // --- State ---
  const [open, setOpen] = useState(false);               // Command palette open state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs
  const globeRef = useRef<any>();                         // Reference for the Globe component

  // --- Constants (with translations) ---
  // List of all modules for the command palette
  const modules = [
    { title: t('sidebar.home'), href: '/', category: t('sidebar.principal'), icon: 'Blocks' },
    { title: t('sidebar.stdMortalityRatio'), href: 'biostatistics/std_mortality_ratio', category: t('sidebar.numerotations'), icon: 'Blocks' },
    { title: t('sidebar.proportions'), href: '/biostatistics/proportions', category: t('sidebar.numerotations') },
    { title: t('sidebar.twoByTwo'), href: '/biostatistics/two_by_two', category: t('sidebar.numerotations') },
    { title: t('sidebar.doseResponse'), href: '/biostatistics/dose_response', category: t('sidebar.numerotations') },
    { title: t('sidebar.rByC'), href: '/biostatistics/r_by_c', category: t('sidebar.numerotations') },
    { title: t('sidebar.screening'), href: '/biostatistics/screening', category: t('sidebar.numerotations') },
    { title: t('sidebar.oneRate'), href: '/biostatistics/one_rate', category: t('sidebar.personnesTemps') },
    { title: t('sidebar.twoRates'), href: '/biostatistics/compare_two_rates', category: t('sidebar.personnesTemps') },
    { title: t('sidebar.meanCI'), href: '/biostatistics/mean_confidence_interval', category: t('sidebar.variablesContinues') },
    { title: t('sidebar.meanPercentileCI'), href: '/biostatistics/median_percentile_ci', category: t('sidebar.variablesContinues') },
    { title: t('sidebar.tTest'), href: '/biostatistics/t_test', category: t('sidebar.variablesContinues') },
    { title: t('sidebar.anova'), href: '/biostatistics/anova', category: t('sidebar.variablesContinues') },
    { title: t('sidebar.proportionsSample'), href: '/biostatistics/sample-proportions', category: t('sidebar.tailleEchantillon') },
    { title: t('sidebar.cohortRCT'), href: '/biostatistics/cohort-rct', category: t('sidebar.tailleEchantillon') },
    { title: t('sidebar.matchedCase'), href: '/biostatistics/matched_case', category: t('sidebar.tailleEchantillon') },
    { title: t('sidebar.meanDifference'), href: '/biostatistics/mean_difference_sample', category: t('sidebar.tailleEchantillon') },
    { title: t('sidebar.cohortRCT'), href: '/biostatistics/cohort_rct_power', category: t('sidebar.puissance') },
    { title: t('sidebar.clinicalTrial'), href: '/biostatistics/clinical_trial', category: t('sidebar.puissance') },
    { title: t('sidebar.caseControl'), href: '/biostatistics/case_control', category: t('sidebar.puissance') },
    { title: t('sidebar.meanDifference'), href: '/biostatistics/mean_difference-power', category: t('sidebar.puissance') },
    { title: t('sidebar.matchedCaseControl'), href: '/biostatistics/matched_case_control', category: t('sidebar.puissance') },
    { title: t('sidebar.randomNumbers'), href: '/biostatistics/random_numbers', category: t('sidebar.autres') },
    { title: t('sidebar.geospatial'), href: '/geospatial/map', category: t('sidebar.geospatial') },
    { title: t('sidebar.explorer'), href: '/explorer/search', category: t('sidebar.explorer') },
    { title: t('sidebar.simulation'), href: '/simulation/dashboard', category: t('sidebar.simulation') },
    { title: t('sidebar.codeEditor'), desc: t('home.codeEditorDesc'), href: '/workspace' },
    { title: t('common.help'), href: '/help', category: t('sidebar.support') },
    { title: t('common.docs'), href: '/docs', category: t('sidebar.support') },
    { title: t('common.settings'), href: '/settings', category: t('sidebar.support') },
  ];

  // List of tools displayed in the main grid
  const tools = [
    {
      title: t('sidebar.stdMortalityRatio'),
      desc: t('home.stdMortalityRatioDesc'),
      href: 'biostatistics/std_mortality_ratio',
      icon: Presentation,
      color: 'blue',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.proportions'),
      desc: t('home.proportionsDesc'),
      href: 'biostatistics/proportions',
      icon: PieChart,
      color: 'emerald',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.twoByTwo'),
      desc: t('home.twoByTwoDesc'),
      href: 'biostatistics/two_by_two',
      icon: Table2,
      color: 'blue',
      size: 'col-span-2',
    },
    {
      title: t('sidebar.doseResponse'),
      desc: t('home.doseResponseDesc'),
      href: 'biostatistics/dose_response',
      icon: Activity,
      color: 'purple',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.rByC'),
      desc: t('home.rByCDesc'),
      href: 'biostatistics/r_by_c',
      icon: Grid,
      color: 'blue',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.screening'),
      desc: t('home.screeningDesc'),
      href: 'biostatistics/screening',
      icon: FileText,
      color: 'emerald',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.oneRate'),
      desc: t('home.oneRateDesc'),
      href: 'biostatistics/one_rate',
      icon: Clock,
      color: 'purple',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.twoRates'),
      desc: t('home.twoRatesDesc'),
      href: 'biostatistics/compare_two_rates',
      icon: TrendingUp,
      color: 'blue',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.meanCI'),
      desc: t('home.meanCIDesc'),
      href: 'biostatistics/mean_confidence_interval',
      icon: Presentation,
      color: 'emerald',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.meanPercentileCI'),
      desc: t('home.percentileCIDesc'),
      href: 'biostatistics/median_percentile_ci',
      icon: Database,
      color: 'purple',
      size: 'col-span-2',
    },
    {
      title: t('sidebar.tTest'),
      desc: t('home.tTestDesc'),
      href: 'biostatistics/t_test',
      icon: Activity,
      color: 'blue',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.anova'),
      desc: t('home.anovaDesc'),
      href: 'biostatistics/anova',
      icon: Presentation,
      color: 'emerald',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.proportionsSample'),
      desc: t('home.sampleProportionsDesc'),
      href: 'biostatistics/proportions_sample',
      icon: Calculator,
      color: 'purple',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.cohortRCT'),
      desc: t('home.cohortRCTDesc'),
      href: 'biostatistics/cohort_rct',
      icon: Users,
      color: 'blue',
      size: 'col-span-2',
    },
    {
      title: t('sidebar.caseControl'),
      desc: t('home.caseControlDesc'),
      href: 'biostatistics/unmatched_case',
      icon: Grid,
      color: 'emerald',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.meanDifference'),
      desc: t('home.meanDifferenceDesc'),
      href: 'biostatistics/mean_difference_sample',
      icon: TrendingUp,
      color: 'purple',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.randomNumbers'),
      desc: t('home.randomNumbersDesc'),
      href: 'biostatistics/random_numbers',
      icon: Zap,
      color: 'blue',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.explorer'),
      desc: t('home.explorerDesc'),
      href: '/explorer/search',
      icon: GlobeIcon,
      color: 'blue',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.geospatial'),
      desc: t('home.geospatialDesc'),
      href: '/geospatial/map',
      icon: Map,
      color: 'emerald',
      size: 'col-span-2',
    },
    {
      title: t('sidebar.simulation'),
      desc: t('home.simulatorDesc'),
      href: '/simulation/dashboard',
      icon: Activity,
      color: 'purple',
      size: 'col-span-1',
    },
    {
      title: t('sidebar.codeEditor'),
      desc: t('home.codeEditorDesc'),
      href: '/workspace',
      icon: Code,
      color: 'blue',
      size: 'col-span-3',
    },
    {
      title: t('common.help'),
      desc: t('home.helpDesc'),
      href: '/help',
      icon: FileText,
      color: 'emerald',
      size: 'col-span-1',
    },
    {
      title: t('common.docs'),
      desc: t('home.docsDesc'),
      href: '/docs',
      icon: BookOpen,
      color: 'purple',
      size: 'col-span-2',
    },
  ];

  // Color mapping for tool cards (light and dark variants)
  const colorMap = {
    blue: {
      light: 'from-blue-500/20 to-blue-600/5 text-blue-600 border-blue-100 dark:border-blue-900/50',
      dark: 'from-blue-900/30 to-blue-800/10 text-blue-400 border-blue-900/50',
    },
    emerald: {
      light: 'from-emerald-500/20 to-emerald-600/5 text-emerald-600 border-emerald-100 dark:border-emerald-900/50',
      dark: 'from-emerald-900/30 to-emerald-800/10 text-emerald-400 border-emerald-900/50',
    },
    purple: {
      light: 'from-purple-500/20 to-purple-600/5 text-purple-600 border-purple-100 dark:border-purple-900/50',
      dark: 'from-purple-900/30 to-purple-800/10 text-purple-400 border-purple-900/50',
    },
  };

  const navLinks = [
    { label: t('nav.quickTour'), href: '#' },
    { label: t('common.docs'), href: '#' },
    { label: t('sidebar.workspace'), href: '#' },
  ];

  // --- Effects ---
  // Keyboard shortcut: Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Enable auto-rotation for the globe
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
  }, []);

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-200/50 dark:selection:bg-blue-900/50 selection:text-blue-900 dark:selection:text-blue-100">
      {/* Background mesh gradient */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 dark:bg-blue-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-200/30 dark:bg-purple-900/20 blur-[100px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-emerald-200/20 dark:bg-emerald-900/15 blur-[80px] rounded-full" />
      </div>

      {/* Floating navigation bar */}
      <nav className="fixed top-6 inset-x-0 z-[100] max-w-5xl mx-auto px-4">
        <div className={`
          flex items-center justify-between px-6 h-16
          bg-transparent dark:bg-transparent border-none shadow-none
          md:bg-white/70 md:dark:bg-black/70 md:backdrop-blur-2xl 
          md:border md:border-white/20 md:dark:border-white/10 
          md:shadow-[0_8px_32px_rgba(0,0,0,0.05)] md:rounded-3xl
        `}>
          {/* Logo */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex justify-center ">
              <svg width="20" height="25" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="  opacity-100">
                <path d="M20 5V55M5 15C5 15 10 10 20 10C30 10 35 15 35 15M5 45C5 45 10 50 20 50C30 50 35 45 35 45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="15" y="25" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="font-bold tracking-tighter text-lg">
              {t('app.name', 'Wepisia')}
            </span>
          </div>

          {/* Liens desktop (toujours cachés sur mobile) */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
              >
                {item.label}
              </a>
            ))}
            <button className="bg-slate-900 dark:bg-white dark:text-black text-white px-5 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform active:scale-95">
              {t('common.help')}
            </button>
          </div>

          {/* Bouton hamburger - ml-auto pour le pousser à droite sur mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-900 dark:text-white ml-auto z-50"
            aria-label={t('common.menu')}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Overlay mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-40 animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Drawer mobile – glisse depuis la droite */}
        <div
          className={`
            fixed top-0 right-0 h-full w-64 bg-white dark:bg-slate-900 shadow-xl z-50
            transform transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            md:hidden
          `}
        >
          <div className="flex flex-col p-6 pt-20 gap-4">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium py-2 border-b border-gray-100 dark:border-white/10"
              >
                {item.label}
              </a>
            ))}
            <button className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-3 rounded-xl text-sm font-bold mt-4">
              {t('common.help')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <header className="relative z-10 pt-36 pb-28 px-6 overflow-hidden">
        {/* Background Tribal Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.1] dark:opacity-[0.1] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tribal-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0 50 L25 50 M75 50 L100 50 M50 0 L50 25 M50 75 L50 100" stroke="currentColor" strokeWidth="0.5" fill="none" />
                <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="0.5" fill="none" />
                <path d="M35 35 L65 65 M35 65 L65 35" stroke="currentColor" strokeWidth="0.5" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tribal-pattern)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Tribal Identity Symbol - Stylized Mask / Totem line */}
          <div className="flex justify-center mb-8">
            <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="  opacity-80">
              <path d="M20 5V55M5 15C5 15 10 10 20 10C30 10 35 15 35 15M5 45C5 45 10 50 20 50C30 50 35 45 35 45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="15" y="25" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-gray-900 dark:text-white mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-600 to-purple-600">
              {t('home.title', 'Wepisia')}
            </span>
          </h1>

          <p className="max-w-xxl mx-auto text-xl leading-relaxed mb-14 font-light italic">
            {t('home.quote')}
            <br />
            <span className="not-italic text-base opacity-80 font-normal">{t('home.subquote')}</span>
          </p>

          {/* Search bar that opens command palette */}
          <div
            className="max-w-lg mx-auto relative group cursor-pointer"
            onClick={() => setOpen(true)}
          >
            <div className="absolute inset-0 bg-blue-400/20 dark:bg-blue-600/10 blur-xl group-hover:bg-blue-400/30 dark:group-hover:bg-blue-600/20 transition-all rounded-full opacity-50" />
            <div className="relative flex items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-2 transition-transform hover:scale-[1.02] group-hover:shadow-2xl">
              <Search className="w-5 h-5 ml-4 text-gray-400" />
              <div className="w-full px-4 py-3 text-gray-700 dark:text-gray-200">
                {t('home.searchPlaceholder')}
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 px-2 py-1 rounded-md text-xs text-gray-500 dark:text-gray-400 mr-2">
                <Command className="w-3 h-3" /> K
              </kbd>
            </div>
          </div>
        </div>
      </header>

      {/* Command palette dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t('command.searchPlaceholder')} />
        <CommandList>
          <CommandEmpty>{t('command.noResults')}</CommandEmpty>
          <CommandGroup heading={t('command.principalModules')}>
            {modules.map((module) => (
              <CommandItem
                key={module.href}
                onSelect={() => {
                  window.location.href = module.href;
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">{module.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{module.category}</p>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Bento grid – featured modules */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Biostatistics module */}
          <div className="md:col-span-8 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
            <div className="relative z-10">
              <Calculator className="text-blue-500 mb-6" size={32} />
              <h3 className="text-3xl font-bold mb-4">{t('home.biostatistics')}</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                {t('home.biostatisticsDesc')}
              </p>
              <button className="flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:gap-4 transition-all">
                {t('home.exploreModule')} <ArrowRight size={16} />
              </button>
            </div>
            {/* Decorative chart */}
            <div className="absolute right-[-5%] bottom-[-10%] w-1/2 h-2/3 bg-slate-100 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-4 transform rotate-[-5deg] group-hover:rotate-0 transition-transform duration-700">
              <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-transparent rounded-xl flex items-end p-4">
                <div className="flex gap-2 items-end w-full h-24">
                  {[40, 70, 45, 90, 65].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      className="flex-1 bg-blue-500/40 rounded-t-md"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI module */}
          <div className="md:col-span-4 bg-slate-900 text-white rounded-[2.5rem] p-10 flex flex-col justify-between overflow-hidden relative">
            <Brain className="text-blue-400 mb-6" size={32} />
            <div>
              <h3 className="text-2xl font-bold mb-2">{t('home.aiAnalysis')}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t('home.aiDescription')}
              </p>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Zap size={120} />
            </div>
          </div>

          {/* Geospatial module with interactive globe */}
          <div className="md:col-span-6 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] p-10 flex flex-col md:flex-row gap-8 items-center overflow-hidden">
            <div className="flex-1">
              <Map className="text-indigo-500 mb-6" size={32} />
              <h3 className="text-2xl font-bold mb-4">{t('home.geospatial')}</h3>
              <p className="text-slate-500 text-sm italic">
                {t('home.geospatialDescription')}
              </p>
            </div>
            <div className="w-full md:w-64 h-64 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full" />
              <Globe
                ref={globeRef}
                width={320}
                height={320}
                backgroundColor="rgba(255, 255, 255, 0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                atmosphereAltitude={0.25}
                hexPolygonsData={[]}
                customLayerData={[]}
                arcsData={Array.from({ length: 5 }).map(() => ({
                  startLat: (Math.random() - 0.5) * 180,
                  startLng: (Math.random() - 0.5) * 360,
                  endLat: (Math.random() - 0.6) * 180,
                  endLng: (Math.random() - 0.8) * 360,
                  color: ['#6366f1', '#f43f5e', '#ec4899'][Math.floor(Math.random() * 3)],
                }))}
                arcColor="color"
                arcDashLength={0.5}
                arcDashGap={4}
                arcDashAnimateTime={1000}
                arcStroke={0.7}
              />
            </div>
          </div>

          {/* Simulation module */}
          <div className="md:col-span-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2.5rem] p-10 group cursor-pointer overflow-hidden relative">
            <div className="relative z-10">
              <Activity className="mb-6" size={32} />
              <h3 className="text-2xl font-bold mb-4">{t('home.simulationEngine')}</h3>
              <p className="opacity-80 text-sm mb-6 max-w-xs">
                {t('home.simulationDescription')}
              </p>
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {t('home.webrPowered')}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {t('home.sixtyFps')}
                </span>
              </div>
            </div>
            <motion.div
              className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
              whileHover={{ scale: 1.05 }}
            />
          </div>
        </div>
      </section>

      {/* Mobile drawer (slide‑in from right) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[80%] bg-white dark:bg-[#0A0A0A] z-[120] p-10 shadow-2xl"
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="mb-12 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"
              >
                <X size={24} />
              </button>
              <nav className="flex flex-col gap-8">
                {navLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-base font-medium opacity-60 hover:opacity-100 transition-opacity"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main tools grid (all available modules) */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 grid-flow-dense">
          {tools.map((tool, idx) => {
            const colors = colorMap[tool.color as keyof typeof colorMap];
            const cardColors = `bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600`;
            const iconBg = `bg-gradient-to-br ${colors.light} dark:${colors.dark}`;
            const textColor = colors.light.split(' ')[2] || 'text-blue-600 dark:text-blue-400';

            // Check if the card should be larger (col-span-2)
            const isLarge = tool.size?.includes('col-span-2');

            return (
              <Link key={idx} href={tool.href} className={tool.size || 'col-span-1'}>
                <a
                  className={`group relative h-full w-full ${cardColors} backdrop-blur-sm rounded-[32px] p-8 transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col justify-between min-h-[240px]`}
                >
                  <div className="relative z-10">
                    <div
                      className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}
                    >
                      <tool.icon className={`w-7 h-7 ${textColor}`} />
                    </div>

                    <h3
                      className={`${isLarge ? 'text-3xl' : 'text-xl'} font-bold tracking-tight text-gray-900 dark:text-white mb-2 transition-colors`}
                    >
                      {tool.title}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 font-medium leading-snug max-w-[280px]">
                      {tool.desc}
                    </p>
                  </div>

                  <div className="relative z-10 mt-8 flex justify-between items-center">
                    <span
                      className={`text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 ${textColor}`}
                    >
                      {t('home.launchModule')}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center group-hover:bg-slate-900 dark:group-hover:bg-slate-100 group-hover:text-white dark:group-hover:text-slate-900 transition-all duration-300 shadow-sm">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Background glow on hover */}
                  <div
                    className={`absolute -right-4 -bottom-4 w-40 h-40 rounded-full bg-gradient-to-br ${
                      colors.light.split(' ')[0]
                    } dark:${colors.dark.split(' ')[0]} blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700`}
                  />
                </a>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full pt-10 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-8">
            {/* Floating social/action bar */}
            <div className="flex items-center gap-2 p-1.5 rounded-full bg-slate-50/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
              {[
                { icon: <ExternalLink size={16} />, label: t('footer.web') },
                { icon: <Code size={16} />, label: t('footer.github') },
                { icon: <Settings size={16} />, label: t('footer.data') },
                { icon: <BookOpen size={16} />, label: t('footer.documentation') },
              ].map((item, i) => (
                <button
                  key={i}
                  className="group relative p-3 rounded-full hover:bg-white dark:hover:bg-white/10 text-slate-400 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {item.icon}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-slate-500">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Text and branding */}
            <div className="text-center space-y-3">
              <p className="text-[13px] tracking-tight text-slate-500 dark:text-slate-400 font-light">
                {t('footer.copyright', { year: new Date().getFullYear() })}{' '}
                <span className="font-semibold text-slate-800 dark:text-white">wepisia</span>
                <span className="mx-3 opacity-20">|</span>
                {t('footer.tagline')}
              </p>

              <div className="flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-crosshair">
                  {t('footer.privacy')}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-crosshair">
                  {t('footer.terms')}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="group flex items-center gap-1">
                  {t('footer.poweredBy')}
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    Xcept-Health
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}