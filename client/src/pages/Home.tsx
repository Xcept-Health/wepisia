import React, { useState, useEffect } from 'react';
import { 
  Calculator, TrendingUp, Clock, PieChart, 
  Activity, Grid,Code, ExternalLink,
  Search, ArrowUpRight, Zap, Brain, Command, Menu,
  ArrowRight,  ChevronRight, BookOpen,BarChart3,
  Table2,  Map, Cpu, FileText,
  Globe, Layers, Sliders, Database, 
  X,  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Link } from 'wouter';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function Home() {
  const [open, setOpen] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("intro");
  const { scrollY } = useScroll();

  // Effets de parallaxe pour le Hero
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Ouvrir avec Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Liste complète des modules (basée sur votre sidebar)
  const modules = [
    { title: "Accueil", href: "/", category: "Principal" },
    { title: "Rapport Std.Mort", href: "/biostatistics/std-mortality-ratio", category: "Numérotations", icon: "Blocks" },
    { title: "Proportions", href: "/proportions", category: "Numérotations" },
    { title: "Tableaux 2×2", href: "/two-by-two", category: "Numérotations" },
    { title: "Dose-Réponse", href: "/dose-response", category: "Numérotations" },
    { title: "Tableaux R×C", href: "/r-by-c", category: "Numérotations" },
    { title: "Dépistage", href: "/screening", category: "Numérotations" },
    { title: "Taux 1", href: "/one-rate", category: "Personnes temps" },
    { title: "Taux 2", href: "/compare-two-rates", category: "Personnes temps" },
    { title: "Mean CI", href: "/mean-ci", category: "Variables continues" },
    { title: "Mean Percentile Chi", href: "/median-percentile-ci", category: "Variables continues" },
    { title: "Test t", href: "/t-test", category: "Variables continues" },
    { title: "ANOVA", href: "/anova", category: "Variables continues" },
    { title: "Proportions", href: "/sample-proportions", category: "Taille d'échantillon" },
    { title: "Cohort RCT", href: "/cohort-rct", category: "Taille d'échantillon" },
    { title: "Matched Case", href: "/matched-case", category: "Taille d'échantillon" },
    { title: "Mean difference", href: "/mean-difference-sample", category: "Taille d'échantillon" },
    { title: "Cohorte RCT", href: "/cohort-rct-power", category: "Puissance" },
    { title: "Essai Cliniques", href: "/clinical-trial", category: "Puissance" },
    { title: "Coupe X", href: "/case-control", category: "Puissance" },
    { title: "Différence Moyenne", href: "/mean-difference-power", category: "Puissance" },
    { title: "Cas-Témoins Appariés", href: "/matched-case-control", category: "Puissance" },
    { title: "Nombres Aléatoires", href: "/random-numbers", category: "Autres" },
    { title: "GeoSpatial", href: "/geospatial", category: "GeoSpatial" },
    { title: "Épidémiologique", href: "/simulation", category: "Simulation" },
    { title: "Aide", href: "/help", category: "Support" },
    { title: "Documentation", href: "/docs", category: "Support" },
    { title: "Paramètres", href: "/settings", category: "Support" },
  ];

  const tools = [
    { title: "Tableaux 2×2", desc: "Analyse de contingence, odds ratio et risque relatif.", href: "/two-by-two", icon: Table2, color: "blue", size: "col-span-2" },
    { title: "Taille d'échantillon", desc: "Calculs de puissance et d'effectifs.", href: "/sample-proportions", icon: Calculator, color: "emerald", size: "col-span-1" },
    { title: "Variables continues", desc: "Tests t, ANOVA et analyses quantitatives.", href: "/mean-ci", icon: TrendingUp, color: "purple", size: "col-span-1" },
    { title: "Temps-personne", desc: "Taux d'incidence et comparaisons.", href: "/one-rate", icon: Clock, color: "blue", size: "col-span-1" },
    { title: "Proportions", desc: "Intervalles de confiance et tests.", href: "/proportions", icon: PieChart, color: "emerald", size: "col-span-1" },
    { title: "Dose-Réponse", desc: "Analyse de tendance.", href: "/dose-response", icon: Activity, color: "purple", size: "col-span-1" },
    { title: "Tableaux R×C", desc: "Dimensions arbitraires.", href: "/r-by-c", icon: Grid, color: "blue", size: "col-span-1" },
  ];

  const colorMap = {
    blue: {
      light: "from-blue-500/20 to-blue-600/5 text-blue-600 border-blue-100 dark:border-blue-900/50",
      dark: "from-blue-900/30 to-blue-800/10 text-blue-400 border-blue-900/50"
    },
    emerald: {
      light: "from-emerald-500/20 to-emerald-600/5 text-emerald-600 border-emerald-100 dark:border-emerald-900/50",
      dark: "from-emerald-900/30 to-emerald-800/10 text-emerald-400 border-emerald-900/50"
    },
    purple: {
      light: "from-purple-500/20 to-purple-600/5 text-purple-600 border-purple-100 dark:border-purple-900/50",
      dark: "from-purple-900/30 to-purple-800/10 text-purple-400 border-purple-900/50"
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-200/50 dark:selection:bg-blue-900/50 selection:text-blue-900 dark:selection:text-blue-100">
      
      {/* --- MESH GRADIENT SUBTILE --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 dark:bg-blue-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-200/30 dark:bg-purple-900/20 blur-[100px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-emerald-200/20 dark:bg-emerald-900/15 blur-[80px] rounded-full" />
      </div>

      {/* --- HEADER --- */}
      {/*  NAVIGATION FLOTTANTE ) */}

      <nav className="fixed top-6 inset-x-0 z-[100] max-w-5xl mx-auto px-4">
        <div className="bg-white/70 dark:bg-black/70 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-3xl h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tighter text-lg">OpenEPI <span className="font-light opacity-50">Reedited</span></span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {["Tour rapide", "Documentation", "Workspace"].map((item) => (
              <a key={item} href="#" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">{item}</a>
            ))}
            <button className="bg-slate-900 dark:bg-white dark:text-black text-white px-5 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform active:scale-95">
              Aide
            </button>
          </div>

          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2">
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative z-10 pt-45 pb-30 px-6">
        <div className="max-w-4xl mx-auto text-center">

          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-gray-900 dark:text-white mb-8">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-600 to-purple-600">
              Open Epi
            </span>
          </h1>
          
          <p className="max-w-xl mx-auto text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-10">
            OpenEPi reedited est une nouvelle version de l'outil Open Source Statistiques Épidémiologiques OpenEpi pour la Santé Publique.
          </p>

          {/* BARRE DE RECHERCHE(trigger pour Command Dialog) */}
          <div 
            className="max-w-lg mx-auto relative group cursor-pointer"
            onClick={() => setOpen(true)}
          >
            <div className="absolute inset-0 bg-blue-400/20 dark:bg-blue-600/10 blur-xl group-hover:bg-blue-400/30 dark:group-hover:bg-blue-600/20 transition-all rounded-full opacity-50" />
            <div className="relative flex items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-2 transition-transform hover:scale-[1.02] group-hover:shadow-2xl">
              <Search className="w-5 h-5 ml-4 text-gray-400" />
              <div className="w-full px-4 py-3 text-gray-700 dark:text-gray-200">
                Chercher (ex: Chi-carré, Odds Ratio...)
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 px-2 py-1 rounded-md text-xs text-gray-500 dark:text-gray-400 mr-2">
                <Command className="w-3 h-3" /> K
              </kbd>
            </div>
          </div>
        </div>
      </header>

      {/* Command Dialog de recherche (shadcn/ui) */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher un module ou un test..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Modules principaux">
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


        {/* 3. BENTO GRID  */}
            <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Module Biostat - Grande Carte */}
          <div className="md:col-span-8 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
            <div className="relative z-10">
              <Calculator className="text-blue-500 mb-6" size={32} />
              <h3 className="text-3xl font-bold mb-4">Calcul Biostatistiques</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                Des calculs de puissance aux tests de Mantel-Haenszel, accédez à une suite d'outils validés scientifiquement.
              </p>
              <button className="flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:gap-4 transition-all">
                Explorer le module <ArrowRight size={16} />
              </button>
            </div>
            {/* Simulation d'une partie d'image (Graphique soft) */}
            <div className="absolute right-[-5%] bottom-[-10%] w-1/2 h-2/3 bg-slate-100 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 p-4 transform rotate-[-5deg] group-hover:rotate-0 transition-transform duration-700">
               <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-transparent rounded-xl flex items-end p-4">
                  <div className="flex gap-2 items-end w-full h-24">
                    {[40, 70, 45, 90, 65].map((h, i) => (
                      <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} className="flex-1 bg-blue-500/40 rounded-t-md" />
                    ))}
                  </div>
               </div>
            </div>
          </div>

          {/* Petite Carte - AI */}
          <div className="md:col-span-4 bg-slate-900 text-white rounded-[2.5rem] p-10 flex flex-col justify-between overflow-hidden relative">
            <Brain className="text-blue-400 mb-6" size={32} />
            <div>
              <h3 className="text-2xl font-bold mb-2">Analyse IA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Interprétez vos résultats automatiquement grâce à notre moteur d'intelligence contextuelle.
              </p>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Zap size={120} />
            </div>
          </div>

          {/* Module Géo - Carte Moyenne */}
          <div className="md:col-span-6 bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] p-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
               <Map className="text-indigo-500 mb-6" size={32} />
               <h3 className="text-2xl font-bold mb-4">Visualisation Géo</h3>
               <p className="text-slate-500 text-sm italic">
                 "visualisez vos evènements épidémiologiques sur des cartes interactives avec des heatmaps dynamiques et des clusters intelligents."
               </p>
            </div>
            <div className="w-full md:w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden relative border border-slate-200 dark:border-white/10">
               {/* Image d'illustration "Map" */}
               <div className="absolute inset-0 bg-blue-500/10 blur-xl scale-150" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full animate-ping" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_20px_blue]" />
            </div>
          </div>

          {/* Simulation - Carte Moyenne */}
          <div className="md:col-span-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2.5rem] p-10 group cursor-pointer overflow-hidden relative">
            <div className="relative z-10">
              <Activity className="mb-6" size={32} />
              <h3 className="text-2xl font-bold mb-4">Moteur de Simulation</h3>
              <p className="opacity-80 text-sm mb-6 max-w-xs">
                Simulez des scénarios épidémiologiques complexes avec notre moteur de simulation avancé avec des performances optimales.
              </p>
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">WebR Powered</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">60 FPS</span>
              </div>
            </div>
            {/* Effet visuel au hover */}
            <motion.div 
              className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
              whileHover={{ scale: 1.05 }}
            />
          </div>
        </div>
      </section>

      {/* 4. DRAWER MOBILE (RESPONSIVE) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110]"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[80%] bg-white dark:bg-[#0A0A0A] z-[120] p-10 shadow-2xl"
            >
              <button onClick={() => setMobileMenuOpen(false)} className="mb-12 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl">
                <X size={24} />
              </button>
              <nav className="flex flex-col gap-8">
                {["Introduction", "Biostatistiques", "Simulation", "Géospatial", "Workspace"].map((item) => (
                  <button key={item} className="text-3xl font-bold tracking-tighter text-left hover:text-blue-600 transition-colors">
                    {item}
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      {/* --- BENTO GRID --- */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool, idx) => {
            const colors = colorMap[tool.color];
            const cardColors = `bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600`;
            const iconBg = `bg-gradient-to-br ${colors.light} dark:${colors.dark}`;
            const textColor = colors.light.split(' ')[2] || 'text-blue-600 dark:text-blue-400';

            return (
              <Link key={idx} href={tool.href}>
                <a className={`${tool.size} group relative ${cardColors} backdrop-blur-sm rounded-[32px] p-8 transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col justify-between min-h-[240px]`}>
                  <div className="relative z-10">
                    <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                      <tool.icon className={`w-7 h-7 ${textColor}`} />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">{tool.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 font-medium leading-snug">{tool.desc}</p>
                  </div>

                  <div className="relative z-10 mt-8 flex justify-between items-center">
                    <span className={`text-sm font-bold uppercase tracking-wider ${textColor}`}>Lancer le module</span>
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center group-hover:bg-slate-900 dark:group-hover:bg-slate-100 group-hover:text-white dark:group-hover:text-slate-900 transition-all duration-300">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>

                  <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-br ${colors.light.split(' ')[0]} dark:${colors.dark.split(' ')[0]} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                </a>
              </Link>
            );
          })}
        </div>
      </main>

      {/* FOOTER  */}
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200 dark:border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="opacity-40 text-sm italic">© 2026 OpenEPI Project. Build for Epidemiologiy. Prolpulsed by Xcept-Health</div>
          <div className="flex gap-6">
             <ExternalLink size={18} className="opacity-40 hover:opacity-100 cursor-pointer" />
             <Code size={18} className="opacity-40 hover:opacity-100 cursor-pointer" />
             <Database size={18} className="opacity-40 hover:opacity-100 cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}