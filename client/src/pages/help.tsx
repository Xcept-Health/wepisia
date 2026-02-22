import { Link } from "wouter";
import { useState, useEffect } from "react";
import {
  HelpCircle, ChevronRight, BookOpen, Calculator, Presentation,
  Table2, Activity, Map, Cpu, FileText, Scale, Users,
  Divide, Sigma, TestTube, Globe, PieChart, Target, Box,
  TrendingUp, Layers, Sliders, Grid, Hash, ListChecks,
  Brain, FlaskConical, Database, BookMarked, ExternalLink,
  GraduationCap, Info, AlertCircle, CheckCircle, Menu,
  X, Search, ArrowUp,  Zap, AlignJustify, Sparkles,
 Shield,



} from "lucide-react";

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section[id]");
      let current = "";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          current = section.id;
        }
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  // All tools data – comprehensive list from App.tsx
  const tools = {
    biostatistics: {
      descriptive: [
        { path: "/biostatistics/mean_confidence_interval", name: "IC d'une moyenne", desc: "Intervalle de confiance pour µ (écart-type connu ou estimé). Utilise la loi normale ou Student.", formula: "IC = x̄ ± t·(s/√n)", interpretation: "Si l'IC ne contient pas la valeur de référence, la moyenne est significativement différente." },
        { path: "/biostatistics/median_percentile_ci", name: "IC d'une médiane", desc: "Intervalle non paramétrique basé sur les percentiles. Méthode de Conover.", formula: "IC = [x_{(L)}, x_{(U)}] avec L = ⌊n/2 - z·√(n/4)⌋, U = ⌈n/2 + z·√(n/4)⌉", interpretation: "Utile pour données asymétriques. Largeur dépend de la taille de l'échantillon." }
      ],
      proportions: [
        { path: "/biostatistics/proportions", name: "IC d'une proportion", desc: "Plusieurs méthodes : Wilson (recommandé), Clopper‑Pearson (exact), Wald (classique).", formula: "Wilson : (p + z²/2n ± z√[p(1-p)/n + z²/4n²]) / (1 + z²/n)", interpretation: "Wilson donne de bonnes propriétés même pour p proche de 0 ou 1." },
        { path: "/biostatistics/compare_two_rates", name: "Comparaison de deux proportions", desc: "Test du χ², test exact de Fisher, différence de proportions, risque relatif, odds ratio.", formula: "χ² = Σ(O-E)²/E, OR = (a/b)/(c/d)", interpretation: "Fisher est préférable si effectifs théoriques < 5." }
      ],
      rates: [
        { path: "/biostatistics/one_rate", name: "IC d'un taux", desc: "Taux d'incidence ou de mortalité. Intervalles exact (Poisson) ou normal.", formula: "Exact : [χ²(α/2, 2O)/2T, χ²(1-α/2, 2(O+1))/2T]", interpretation: "Utiliser l'exact si O < 100." }
      ],
      contingency: [
        { path: "/biostatistics/two_by_two", name: "Tableau 2×2", desc: "Odds ratio, risque relatif, différence de risques, χ², test de Fisher, mesures d'impact.", formula: "OR = ad/bc, RR = a/(a+b) / c/(c+d)", interpretation: "OR est l'approximation du RR pour les maladies rares." },
        { path: "/biostatistics/r_by_c", name: "Tableau R×C", desc: "Test d'indépendance du χ², tableau des effectifs observés/attendus.", formula: "χ² = Σ(Oᵢⱼ - Eᵢⱼ)² / Eᵢⱼ", interpretation: "Condition : 80% des Eᵢⱼ ≥ 5." },
        { path: "/biostatistics/dose-response", name: "Dose‑réponse (χ² tendance)", desc: "Test de Cochrane‑Armitage pour tendance linéaire.", formula: "χ²_tendance = [Σ(dᵢ·(Oᵢ - Eᵢ))]² / var", interpretation: "Détecte une relation dose-effet." }
      ],
      smr: [
        { path: "/biostatistics/std_mortality_ratio", name: "RMS / SMR", desc: "Ratio de mortalité standardisé. Méthodes exacte (Fisher, Mid‑P), Byar, Vandenbroucke.", formula: "SMR = O/E, IC exact : [χ²(α/2,2O)/2E, χ²(1-α/2,2(O+1))/2E]", interpretation: "SMR > 1 : surmortalité ; IC contient 1 : non significatif." }
      ],
      sampleSize: [
        { path: "/biostatistics/proportions_sample", name: "Taille échantillon – proportion", desc: "Estimation d'une proportion avec précision absolue ou relative.", formula: "n = z²·p(1-p)/d²", interpretation: "Utiliser p=0.5 si aucune information." },
        { path: "/biostatistics/cohort_rct", name: "Cohorte / RCT", desc: "Comparaison de deux proportions (essai, cohorte).", formula: "Formule de Fleiss avec correction de continuité.", interpretation: "Nécessite p0, p1, puissance, α." },
        { path: "/biostatistics/unmatched_case", name: "Cas‑témoins non apparié", desc: "Kelsey, Fleiss, Fleiss avec CC.", formula: "Fleiss : n = [zα√((r+1)p̄(1-p̄)) + zβ√(r p0(1-p0)+p1(1-p1))]² / (r·(p1-p0)²)", interpretation: "Fleiss avec CC recommandé." },
        { path: "/biostatistics/mean_difference_sample", name: "Différence de moyennes", desc: "Taille d'échantillon pour comparer deux moyennes.", formula: "n = 2·(zα+zβ)²·σ² / Δ²", interpretation: "Préciser l'écart-type anticipé." },
        { path: "/biostatistics/clinical_trial", name: "Essai clinique", desc: "Supériorité, non‑infériorité, équivalence.", formula: "Non‑infériorité : n = 2·(zα+zβ)²·σ² / (Δ-δ)²", interpretation: "Marge de non‑infériorité δ définie par le clinicien." }
      ],
      power: [
        { path: "/biostatistics/cohort_rct_power", name: "Puissance – cohorte/RCT", desc: "Calcul de puissance pour deux proportions.", formula: "zβ = (√(n·Δ²) - zα·√(2p̄(1-p̄))) / √(p0(1-p0)+p1(1-p1))", interpretation: "Puissance = Φ(zβ)." },
        { path: "/biostatistics/case_control", name: "Puissance – cas‑témoins", desc: "Puissance post‑hoc pour étude cas‑témoins non appariée.", formula: "Basée sur la formule de Kelsey/Fleiss.", interpretation: "Utile pour interpréter les résultats non significatifs." },
        { path: "/biostatistics/mean_difference_power", name: "Puissance – différence de moyennes", desc: "Puissance pour comparaison de deux moyennes.", formula: "zβ = (Δ·√(n/2) / σ) - zα", interpretation: "Fonction de la taille d'effet Δ/σ." },
        { path: "/biostatistics/matched_case_power", name: "Puissance – cas‑témoins appariés", desc: "Basé sur le test de McNemar.", formula: "Méthode de Schlesselman.", interpretation: "Nécessite proportion de discordants attendue." }
      ],
      tests: [
        { path: "/biostatistics/t_test", name: "Test t de Student", desc: "Échantillon unique, apparié, indépendant (variances égales ou inégales).", formula: "t = (x̄ - μ) / (s/√n) ; t = (x̄₁-x̄₂)/√(s₁²/n₁+s₂²/n₂) (Welch)", interpretation: "Rejeter H0 si p < α. Vérifier normalité." },
        { path: "/biostatistics/anova", name: "ANOVA", desc: "Comparaison de 3+ moyennes (one‑way).", formula: "F = (SCE_inter / (k-1)) / (SCE_intra / (N-k))", interpretation: "Post‑hoc (Tukey) si significatif." }
      ],
      diagnostic: [
        { path: "/biostatistics/screening", name: "Tests diagnostiques", desc: "Sensibilité, spécificité, VPP, VPN, rapports de vraisemblance.", formula: "Se = VP/(VP+FN), Sp = VN/(VN+FP), VPP = VP/(VP+FP)", interpretation: "RV+ = Se/(1-Sp), RV- = (1-Se)/Sp." }
      ],
      random: [
        { path: "/biostatistics/random_numbers", name: "Nombres aléatoires", desc: "Générateur de nombres uniformes, normaux, binomiaux, de Poisson.", formula: "Box‑Muller pour loi normale.", interpretation: "Reproductible via seed." }
      ]
    },
    epidemiology: [
      { path: "/biostatistics/case_control", name: "Étude cas‑témoins", desc: "Analyse complète (OR, IC, test de McNemar pour apparié).", formula: "OR de Mantel‑Haenszel si stratification.", interpretation: "Ajustement possible." },
      { path: "/biostatistics/cohort_rct_power", name: "Étude de cohorte / RCT", desc: "Analyse de cohorte (RR, différence de risques).", formula: "RR = (a/(a+b)) / (c/(c+d))", interpretation: "IC de Katz ou logarithmique." }
    ],
    geospatial: [
      { path: "/geospatial/map", name: "Cartographie", desc: "Visualisation de données épidémiologiques par zone. Choroplèthe, agrégation.", formula: "Taux standardisés, lissage bayésien empirique.", interpretation: "Comparaison de taux entre régions." }
    ],
    simulation: [
      { path: "/simulation/dashboard", name: "Simulation épidémiologique", desc: "Modèles SIR, SEIR, SIS. Paramètres modifiables en temps réel.", formula: "dS/dt = -βSI, dI/dt = βSI - γI, dR/dt = γI", interpretation: "R₀ = β/γ." }
    ],
    workspace: [
      { path: "/workspace", name: "Espace de travail", desc: "Sauvegarde de plusieurs analyses, export PDF global, session utilisateur.", formula: "", interpretation: "Fonctionne avec IndexedDB." }
    ]
  };

  const allTools = [
    ...Object.values(tools.biostatistics).flat(),
    ...tools.epidemiology,
    ...tools.geospatial,
    ...tools.simulation,
    ...tools.workspace
  ];

  const filteredTools = searchTerm
    ? allTools.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.desc.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  // Badge component
  const Badge = ({ children, variant = "blue" }: { children: React.ReactNode; variant?: "blue" | "light" }) => (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
      ${variant === "blue" 
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
        : "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300"}`}>
      {children}
    </span>
  );

  // Section header component – all blue
  const SectionHeader = ({ icon, title, subtitle, id }: { icon: React.ReactNode; title: string; subtitle: string; id: string }) => (
    <div id={id} className="scroll-mt-20 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6">
      <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-900/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Tool card – uniform blue design
  const ToolCard = ({ tool }: { tool: any }) => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700">
      <div className="flex items-start justify-between">
        <Link href={tool.path} className="group flex items-start gap-2 flex-1">
          <div className="shrink-0 w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base">
              {tool.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {tool.desc}
            </p>
            {tool.formula && (
              <div className="mt-2 font-mono text-xs bg-slate-50 dark:bg-slate-900/30 p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                {tool.formula}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="light">
                <Info className="w-3 h-3" />
                {tool.interpretation.length > 60 ? tool.interpretation.substring(0, 60) + "…" : tool.interpretation}
              </Badge>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );

  // Table of contents items – all blue
  const tocItems = [
    { id: "biostatistics", label: "Biostatistiques", icon: <Presentation className="w-4 h-4" /> },
    { id: "descriptive", label: "Descriptive", parent: "biostatistics" },
    { id: "proportions", label: "Proportions", parent: "biostatistics" },
    { id: "rates", label: "Taux", parent: "biostatistics" },
    { id: "contingency", label: "Tableaux", parent: "biostatistics" },
    { id: "smr", label: "SMR/RMS", parent: "biostatistics" },
    { id: "samplesize", label: "Taille d'échantillon", parent: "biostatistics" },
    { id: "power", label: "Puissance", parent: "biostatistics" },
    { id: "tests", label: "Tests paramétriques", parent: "biostatistics" },
    { id: "diagnostic", label: "Diagnostique", parent: "biostatistics" },
    { id: "random", label: "Aléatoire", parent: "biostatistics" },
    { id: "epidemiology", label: "Épidémiologie", icon: <Activity className="w-4 h-4" /> },
    { id: "geospatial", label: "Géospatial", icon: <Map className="w-4 h-4" /> },
    { id: "simulation", label: "Simulation", icon: <Cpu className="w-4 h-4" /> },
    { id: "workspace", label: "Workspace", icon: <Layers className="w-4 h-4" /> },
    { id: "references", label: "Références", icon: <BookMarked className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 relative">

        {/* Breadcrumb */}
        <nav className="flex mb-4 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Aide</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <HelpCircle className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Aide & Ressources
              </h1>
              
            </div>
          </div>
       
        </div>

        {/* Search bar */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un outil, une formule, un concept…"
            className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>

        {/* Search results */}
        {searchTerm && (
          <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Résultats pour "{searchTerm}"
            </h3>
            {filteredTools && filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTools.slice(0, 6).map((tool, idx) => (
                  <ToolCard key={idx} tool={tool} />
                ))}
                {filteredTools.length > 6 && (
                  <p className="text-sm text-slate-500 mt-2 col-span-2">
                    + {filteredTools.length - 6} autres résultats…
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Aucun outil ne correspond à votre recherche.</p>
            )}
          </div>
        )}

        {/* Main content with sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Table of contents - sticky */}
          <div className="lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-6 space-y-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlignJustify className="w-4 h-4" />
                    Sommaire
                  </h4>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
                <div className={`space-y-1 ${mobileMenuOpen ? "block" : "hidden lg:block"}`}>
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors
                        ${item.parent ? "ml-4" : "font-medium"}
                        ${activeSection === item.id
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-l-2 border-blue-500"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400"
                        }`}
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hidden lg:block">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <ArrowUp className="w-4 h-4" />
                  <span>Défilez pour naviguer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 space-y-8">
            {/* Biostatistiques section */}
            <div id="biostatistics" className="scroll-mt-20">
              <SectionHeader
                icon={<Calculator className="w-6 h-6" />}
                title="Biostatistiques"
                subtitle="Inférence, tests d'hypothèse, estimation, plans expérimentaux"
                id="biostatistics"
              />
              <div className="space-y-8 pl-2">
                {/* Descriptive */}
                <div id="descriptive" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Sigma className="w-5 h-5 text-blue-500" />
                    Statistique descriptive
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.descriptive.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Proportions */}
                <div id="proportions" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <PieChart className="w-5 h-5 text-blue-500" />
                    Proportions
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.proportions.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Rates */}
                <div id="rates" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Taux et ratios
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.rates.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Contingency tables */}
                <div id="contingency" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Table2 className="w-5 h-5 text-blue-500" />
                    Tableaux de contingence
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.contingency.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* SMR */}
                <div id="smr" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-blue-500" />
                    Ratio standardisé (RMS/SMR)
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.smr.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Sample size */}
                <div id="samplesize" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-500" />
                    Taille d'échantillon
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.sampleSize.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Power */}
                <div id="power" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-500" />
                    Calcul de puissance
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.power.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Parametric tests */}
                <div id="tests" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <TestTube className="w-5 h-5 text-blue-500" />
                    Tests paramétriques
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.tests.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Diagnostic */}
                <div id="diagnostic" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <FlaskConical className="w-5 h-5 text-blue-500" />
                    Tests diagnostiques
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.diagnostic.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
                {/* Random numbers */}
                <div id="random" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Hash className="w-5 h-5 text-blue-500" />
                    Générateur aléatoire
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {tools.biostatistics.random.map((tool, i) => (
                      <ToolCard key={i} tool={tool} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Epidemiology section */}
            <div id="epidemiology" className="scroll-mt-20">
              <SectionHeader
                icon={<Activity className="w-6 h-6" />}
                title="Épidémiologie"
                subtitle="Mesures d'effet, ajustement, plans d'étude"
                id="epidemiology"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pl-2">
                {tools.epidemiology.map((tool, i) => (
                  <ToolCard key={i} tool={tool} />
                ))}
              </div>
            </div>

            {/* Geospatial section */}
            <div id="geospatial" className="scroll-mt-20">
              <SectionHeader
                icon={<Globe className="w-6 h-6" />}
                title="Géospatial"
                subtitle="Cartographie épidémiologique, agrégation, lissage"
                id="geospatial"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pl-2">
                {tools.geospatial.map((tool, i) => (
                  <ToolCard key={i} tool={tool} />
                ))}
              </div>
            </div>

            {/* Simulation section */}
            <div id="simulation" className="scroll-mt-20">
              <SectionHeader
                icon={<Cpu className="w-6 h-6" />}
                title="Simulation épidémiologique"
                subtitle="Modèles compartimentaux, scénarios d'intervention"
                id="simulation"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pl-2">
                {tools.simulation.map((tool, i) => (
                  <ToolCard key={i} tool={tool} />
                ))}
              </div>
            </div>

            {/* Workspace section */}
            <div id="workspace" className="scroll-mt-20">
              <SectionHeader
                icon={<Layers className="w-6 h-6" />}
                title="Espace de travail"
                subtitle="Sauvegarde, export, gestion de projet"
                id="workspace"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pl-2">
                {tools.workspace.map((tool, i) => (
                  <ToolCard key={i} tool={tool} />
                ))}
              </div>
            </div>

            {/* References */}
            <div id="references" className="scroll-mt-20">
              <SectionHeader
                icon={<BookMarked className="w-6 h-6" />}
                title="Références scientifiques"
                subtitle="Sources ayant servi à la validation des calculateurs"
                id="references"
              />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 pl-2">
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      Ouvrages fondamentaux
                    </h4>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                      <li className="flex gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        Rothman KJ, Greenland S, Lash TL. <span className="italic">Modern Epidemiology</span>, 3e éd. Lippincott, 2008.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        Fleiss JL, Levin B, Paik MC. <span className="italic">Statistical Methods for Rates and Proportions</span>, 3e éd. Wiley, 2003.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        Altman DG et al. <span className="italic">Statistics with Confidence</span>, 2e éd. BMJ Books, 2000.
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      Références en ligne
                    </h4>
                    <ul className="space-y-2">
                      <li>
                        <a href="https://www.openepi.com" target="_blank" rel="noopener noreferrer" 
                           className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                          OpenEpi.com <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-xs text-slate-500 ml-2">Sullivan et al., 2009</span>
                      </li>
                      <li>
                        <a href="https://www.who.int" target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                          Organisation mondiale de la santé <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    </ul>
                    <div className="pt-4 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-700">
                      <p>Dernière révision : février 2026</p>
                      <p className="mt-1">Tous les calculateurs ont été validés par recoupement avec OpenEpi.com, SAS et R (epitools, stats).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500">

          <p className="mt-2">OpenEpi Suite – Tous les outils sont gratuits et open‑source.</p>
        </div>
      </div>
    </div>
  );
}