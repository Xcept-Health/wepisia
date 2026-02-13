import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  HelpCircle, ChevronRight, BookOpen, Calculator, BarChart3,
  Table2, Activity, Map, Cpu, FileText, Scale, Users,
  Divide, Sigma, TestTube, Globe, PieChart, Target, Box,
  TrendingUp, Layers, Sliders, Grid, Hash, ListChecks,
  Brain, FlaskConical, Database, BookMarked, ExternalLink,
  GraduationCap, Info, AlertCircle, CheckCircle, Menu,
  X, Search, ArrowUp, Zap, AlignJustify,
  Shield, Code, Filter, Bookmark, Terminal
} from "lucide-react";

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState<string>("introduction");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Gestion du scroll pour mettre à jour la TOC
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let current = "";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 160) {
          current = section.id;
        }
      });
      if (current && current !== activeSection) {
        setActiveSection(current);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      setMobileMenuOpen(false);
    }
  };

  const allSections = [
    { id: "introduction", name: "Introduction", icon: <BookOpen className="w-4 h-4" /> },
    { id: "biostatistics", name: "Module de Biostatistiques", icon: <Calculator className="w-4 h-4" /> },
    { id: "tableaux-2x2", name: "Tableaux 2x2", parent: "biostatistics" },
    { id: "anova", name: "ANOVA à un Facteur", parent: "biostatistics" },
    { id: "simulation", name: "Module de Simulation", icon: <Cpu className="w-4 h-4" /> },
    { id: "geospatial", name: "Visualisation Géospatiale", icon: <Map className="w-4 h-4" /> },
    { id: "workspace", name: "Espace de Travail", icon: <Layers className="w-4 h-4" /> },
    { id: "pubmed", name: "Explorateur PubMed", icon: <Database className="w-4 h-4" /> },
  ];

  const filteredSections = searchTerm
    ? allSections.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  // Composant interne pour les petits titres de section
  const SubSectionTitle = ({ icon: Icon, title, id }: any) => (
    <section id={id} className="scroll-mt-32 mb-10">
       <div className="flex items-center gap-2 mb-4 group">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Icon size={18} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
       </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <nav className="flex mb-6 lg:mb-10 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Documentation</span></li>
          </ol>
        </nav>
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24">
              <nav className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4 px-3">Sommaire</p>
                {allSections.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-3
                      ${item.parent ? "ml-4 border-l border-slate-200 dark:border-slate-800 rounded-l-none pl-6" : "font-medium"}
                      ${activeSection === item.id
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-500 shadow-sm"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                  >
                    {item.icon && <span className={`${activeSection === item.id ? "text-blue-600" : "text-slate-400"}`}>{item.icon}</span>}
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-8 p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                <p className="text-xs font-bold opacity-80 mb-1">Besoin d'aide ?</p>
                <p className="text-xs mb-3">Notre IA peut vous aider à générer des analyses.</p>
                <button className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-xs font-semibold transition-colors">
                  Ouvrir l'assistant
                </button>
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* 1. Introduction */}
            <section id="introduction" className="scroll-mt-32 mb-16">
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                  Documentation Utilisateur
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                  Apprenez à maîtriser OpenEPI, la plateforme tout-en-un pour l'épidémiologie moderne, 
                  la biostatistique et la visualisation géospatiale.
                </p>
              </div>
              
              <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                <div className="flex items-start gap-4 text-blue-600 dark:text-blue-400 mb-4">
                  <Info className="shrink-0 w-6 h-6" />
                  <p className="text-slate-600 dark:text-slate-300">
                    OpenEPI est conçu pour les chercheurs et professionnels de santé. Cette documentation couvre l'intégralité des modules, de la saisie de données 2x2 à la simulation de modèles SEIR complexes.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Biostatistiques */}
            <section id="biostatistics" className="scroll-mt-32 mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
                  <Calculator size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Module de Biostatistiques</h2>
                  <p className="text-sm text-slate-500">Outils d'analyse quantitative et tests d'hypothèses.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tableaux 2x2 */}
                <div id="tableaux-2x2" className="group p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Table2 className="w-5 h-5 text-blue-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white">2.1 Tableaux 2x2</h4>
                  </div>
                  <p className="text-sm leading-relaxed mb-4">Analyse de l'exposition et de la maladie via tableaux de contingence.</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                      <Terminal size={14} />
                      <span>Formule OR : (a*d) / (b*c)</span>
                    </div>
                    <ul className="text-xs space-y-2">
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Tests de Chi-deux et Fisher</li>
                      <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Intervalles de confiance 95%</li>
                    </ul>
                  </div>
                </div>

                {/* ANOVA */}
                <div id="anova" className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <h4 className="font-bold text-slate-900 dark:text-white">2.2 ANOVA un Facteur</h4>
                  </div>
                  <p className="text-sm leading-relaxed mb-4">Comparaison de moyennes pour 3 groupes ou plus.</p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Usage Type</p>
                    <p className="text-xs italic text-slate-500">"Comparer l'efficacité de 3 vaccins différents sur la charge virale moyenne."</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Simulation Section */}
            <section id="simulation" className="scroll-mt-32 mb-16">
               <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20">
                  <Cpu size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Module de Simulation</h2>
                  <p className="text-sm text-slate-500">Modélisation dynamique des maladies infectieuses.</p>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                   <div className="flex gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                     <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                     <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                   </div>
                   <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Model Engine v1.4</span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                     <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                       <p className="text-xs text-slate-500 mb-1">SIR</p>
                       <p className="text-[10px] text-slate-400 leading-tight">Sust-Inf-Rec</p>
                     </div>
                     <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                       <p className="text-xs text-blue-400 mb-1 font-bold">SEIRD</p>
                       <p className="text-[10px] text-blue-300/70 leading-tight">+Exposed +Dead</p>
                     </div>
                     <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                       <p className="text-xs text-slate-500 mb-1">CUSTOM</p>
                       <p className="text-[10px] text-slate-400 leading-tight">Equations R/JS</p>
                     </div>
                  </div>
                  <p className="text-sm text-slate-400 font-mono leading-relaxed">
                    Les simulations utilisent des équations différentielles ordinaires (ODE) pour calculer la transition entre compartiments à chaque pas de temps (dt).
                  </p>
                </div>
              </div>
            </section>

            {/* Footer de navigation */}
            <div className="mt-20 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                <ArrowUp size={16} /> Retour en haut
              </button>
              <p className="text-xs text-slate-400 italic">Dernière mise à jour : Février 2026</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}