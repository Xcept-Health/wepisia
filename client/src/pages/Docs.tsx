import { Link } from "wouter";
import { useState, useEffect } from "react";
import {
  HelpCircle, ChevronRight, BookOpen, Calculator, BarChart3,
  Table2, Activity, Map, Cpu, FileText, Scale, Users,
  Divide, Sigma, TestTube, Globe, PieChart, Target, Box,
  TrendingUp, Layers, Sliders, Grid, Hash, ListChecks,
  Brain, FlaskConical, Database, BookMarked, ExternalLink,
  GraduationCap, Info, AlertCircle, CheckCircle, Menu,
  X, Search, ArrowUp,  Zap, AlignJustify, Sparkles,
  Shield, Code, Filter, Bookmark
} from "lucide-react";

export default function DocumentationPage() {
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

  // Filtered search for sections (simple text search in section titles)
  const allSections = [
    { id: "introduction", name: "Introduction" },
    { id: "biostatistics", name: "Module de Biostatistiques" },
    { id: "tableaux-2x2", name: "Tableaux 2x2" },
    { id: "anova", name: "ANOVA à un Facteur" },
    { id: "sample-size-case-control", name: "Taille d'Échantillon pour Études Cas-Témoins Non Appariées" },
    { id: "simulation", name: "Module de Simulation" },
    { id: "modeles-epidemiologiques", name: "Modèles Épidémiologiques" },
    { id: "parametres-simulation", name: "Paramètres de Simulation" },
    { id: "regions-connexions", name: "Régions et Connexions" },
    { id: "interventions", name: "Interventions" },
    { id: "scenarios-predefinis", name: "Scénarios Prédéfinis" },
    { id: "visualisations", name: "Visualisations" },
    { id: "reglages-avances", name: "Réglages Avancés" },
    { id: "geospatial", name: "Module de Visualisation Géospatiale" },
    { id: "chargement-donnees", name: "Chargement des Données" },
    { id: "gestion-jeux-donnees", name: "Gestion des Jeux de Données" },
    { id: "types-visualisation", name: "Types de Visualisation" },
    { id: "analyse-ia", name: "Analyse IA" },
    { id: "reglages-carte", name: "Réglages de la Carte" },
    { id: "workspace", name: "Espace de Travail" },
    { id: "gestion-fichiers-dossiers", name: "Gestion des Fichiers et Dossiers" },
    { id: "editeur-code", name: "Éditeur de Code" },
    { id: "execution-code-r", name: "Exécution de Code R" },
    { id: "variables-sortie", name: "Variables et Sortie" },
    { id: "pubmed", name: "Explorateur PubMed" },
    { id: "recherche-articles", name: "Recherche d'Articles" },
    { id: "filtres-tri", name: "Filtres et Tri" },
    { id: "gestion-favoris", name: "Gestion des Favoris" },
    { id: "analyse-tendance", name: "Analyse de Tendance" },
    { id: "generateur-requetes-mesh", name: "Générateur de Requêtes MeSH" },
    { id: "references", name: "Références" },
  ];

  const filteredSections = searchTerm
    ? allSections.filter(section =>
        section.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;



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

  // Content block for documentation sections
  const ContentBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-700">
      <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-4">
        {title}
      </h3>
      <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
        {children}
      </div>
    </div>
  );

  // Table of contents items – all blue
  const tocItems = [
    { id: "introduction", label: "1. Introduction", icon: <BookOpen className="w-4 h-4" /> },
    { id: "biostatistics", label: "2. Module de Biostatistiques", icon: <Calculator className="w-4 h-4" /> },
    { id: "tableaux-2x2", label: "2.1 Tableaux 2x2", parent: "biostatistics" },
    { id: "anova", label: "2.2 ANOVA à un Facteur", parent: "biostatistics" },
    { id: "sample-size-case-control", label: "2.3 Taille d'Échantillon pour Études Cas-Témoins Non Appariées", parent: "biostatistics" },
    { id: "simulation", label: "3. Module de Simulation", icon: <Cpu className="w-4 h-4" /> },
    { id: "modeles-epidemiologiques", label: "3.1 Modèles Épidémiologiques", parent: "simulation" },
    { id: "parametres-simulation", label: "3.2 Paramètres de Simulation", parent: "simulation" },
    { id: "regions-connexions", label: "3.3 Régions et Connexions", parent: "simulation" },
    { id: "interventions", label: "3.4 Interventions", parent: "simulation" },
    { id: "scenarios-predefinis", label: "3.5 Scénarios Prédéfinis", parent: "simulation" },
    { id: "visualisations", label: "3.6 Visualisations", parent: "simulation" },
    { id: "reglages-avances", label: "3.7 Réglages Avancés", parent: "simulation" },
    { id: "geospatial", label: "4. Module de Visualisation Géospatiale", icon: <Map className="w-4 h-4" /> },
    { id: "chargement-donnees", label: "4.1 Chargement des Données", parent: "geospatial" },
    { id: "gestion-jeux-donnees", label: "4.2 Gestion des Jeux de Données", parent: "geospatial" },
    { id: "types-visualisation", label: "4.3 Types de Visualisation", parent: "geospatial" },
    { id: "analyse-ia", label: "4.4 Analyse IA", parent: "geospatial" },
    { id: "reglages-carte", label: "4.5 Réglages de la Carte", parent: "geospatial" },
    { id: "workspace", label: "5. Espace de Travail", icon: <Layers className="w-4 h-4" /> },
    { id: "gestion-fichiers-dossiers", label: "5.1 Gestion des Fichiers et Dossiers", parent: "workspace" },
    { id: "editeur-code", label: "5.2 Éditeur de Code", parent: "workspace" },
    { id: "execution-code-r", label: "5.3 Exécution de Code R", parent: "workspace" },
    { id: "variables-sortie", label: "5.4 Variables et Sortie", parent: "workspace" },
    { id: "pubmed", label: "6. Explorateur PubMed", icon: <Database className="w-4 h-4" /> },
    { id: "recherche-articles", label: "6.1 Recherche d'Articles", parent: "pubmed" },
    { id: "filtres-tri", label: "6.2 Filtres et Tri", parent: "pubmed" },
    { id: "gestion-favoris", label: "6.3 Gestion des Favoris", parent: "pubmed" },
    { id: "analyse-tendance", label: "6.4 Analyse de Tendance", parent: "pubmed" },
    { id: "generateur-requetes-mesh", label: "6.5 Générateur de Requêtes MeSH", parent: "pubmed" },
    { id: "references", label: "7. Références", icon: <BookMarked className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 relative">

        {/* Breadcrumb */}
        <nav className="flex mb-4 overflow-x-auto" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <li><Link href="/" className="hover:text-blue-500 transition-colors">Accueil</Link></li>
            <li><ChevronRight className="w-3 h-3" /></li>
            <li><span className="text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Documentation</span></li>
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
              <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Documentation Utilisateur OpenEPI Réédité
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
            placeholder="Rechercher une section, un concept…"
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
            {filteredSections && filteredSections.length > 0 ? (
              <div className="space-y-2">
                {filteredSections.slice(0, 10).map((section, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400"
                  >
                    <span className="truncate">{section.name}</span>
                  </button>
                ))}
                {filteredSections.length > 10 && (
                  <p className="text-sm text-slate-500 mt-2">
                    + {filteredSections.length - 10} autres résultats…
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Aucune section ne correspond à votre recherche.</p>
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
                    Table des Matières
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
            {/* Introduction */}
            <div id="introduction" className="scroll-mt-20">
              <SectionHeader
                icon={<BookOpen className="w-6 h-6" />}
                title="1. Introduction"
                subtitle="Bienvenue dans la documentation utilisateur d'OpenEPI"
                id="introduction"
              />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <p>OpenEPI est une plateforme interactive conçue pour les professionnels de la santé publique, les chercheurs et les étudiants. Elle intègre des outils avancés pour l'analyse épidémiologique, la modélisation de la propagation des maladies, la cartographie des données de santé et l'exploration de la littérature scientifique. L'objectif est de fournir un environnement complet et intuitif pour comprendre et répondre aux défis de la santé publique.</p>
              </div>
            </div>

            {/* Biostatistics */}
            <div id="biostatistics" className="scroll-mt-20">
              <SectionHeader
                icon={<Calculator className="w-6 h-6" />}
                title="2. Module de Biostatistiques"
                subtitle="Ce module offre une collection d'outils statistiques essentiels pour l'épidémiologie"
                id="biostatistics"
              />
              <div className="space-y-8 pl-2">
                <div id="tableaux-2x2" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Table2 className="w-5 h-5 text-blue-500" />
                    2.1. Tableaux 2x2
                  </h3>
                  <ContentBlock title="Fonctionnalités">
                    <p>L'outil <strong>Tableaux 2x2</strong> est fondamental pour l'analyse des associations entre une exposition et une maladie dans les études épidémiologiques. Il permet de calculer diverses mesures d'association et tests statistiques à partir d'un tableau de contingence 2x2.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Saisie des données :</strong> L'utilisateur entre les quatre valeurs (a, b, c, d) du tableau 2x2.</li>
                      <li><strong>Calcul automatique :</strong> Les résultats sont mis à jour en temps réel.</li>
                      <li><strong>Mesures d'association :</strong> Odds Ratio (OR), Risque Relatif (RR).</li>
                      <li><strong>Intervalles de Confiance (IC 95%) :</strong> Fournis pour l'OR et le RR.</li>
                      <li><strong>Tests Statistiques :</strong> Chi-deux, Mantel-Haenszel, Yates, Test exact de Fisher.</li>
                      <li><strong>Interprétation des résultats :</strong> Interpretation textuelle simple.</li>
                      <li><strong>Fonctionnalités utilitaires :</strong> Effacer, exemple, copier, export PDF.</li>
                    </ul>
                    <p><strong>Formules Clés :</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>OR = ad/bc</li>
                      <li>RR = [a/(a+b)] / [c/(c+d)]</li>
                      <li>Chi-deux = [(ad - bc)^2 N] / [(a+b)(c+d)(a+c)(b+d)]</li>
                    </ul>
                    <p><strong>Utilisation :</strong> Naviguez vers le module, entrez les valeurs, consultez les résultats.</p>
                  </ContentBlock>
                </div>
                <div id="anova" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    2.2. ANOVA à un Facteur
                  </h3>
                  <ContentBlock title="Fonctionnalités">
                    <p>L'<strong>Analyse de la Variance (ANOVA) à un facteur</strong> est utilisée pour comparer les moyennes de trois groupes ou plus.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Saisie des données par groupe :</strong> n, Moyenne, Écart-type.</li>
                      <li><strong>Niveau de confiance :</strong> Par défaut 95%.</li>
                      <li><strong>Tableau ANOVA :</strong> SC, dl, CM, F, p-value.</li>
                      <li><strong>Test de Bartlett :</strong> Homogénéité des variances.</li>
                      <li><strong>Intervalles de Confiance :</strong> Pour chaque groupe.</li>
                      <li><strong>Fonctionnalités utilitaires :</strong> Effacer, exemple, copier, export PDF.</li>
                    </ul>
                    <p><strong>Formules Clés :</strong></p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>F = CM_entre / CM_dans</li>
                      <li>SSB = ∑ n_i (x̄_i - x̄_grand)^2</li>
                      <li>SSW = ∑ (n_i - 1) s_i^2</li>
                    </ul>
                    <p><strong>Utilisation :</strong> Entrez les données, ajustez le niveau, consultez les résultats.</p>
                  </ContentBlock>
                </div>
                <div id="sample-size-case-control" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-500" />
                    2.3. Taille d'Échantillon pour Études Cas-Témoins Non Appariées
                  </h3>
                  <ContentBlock title="Fonctionnalités">
                    <p>Cet outil permet de calculer la taille d'échantillon nécessaire pour les études cas-témoins non appariées.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Paramètres d'entrée :</strong> Confiance, Puissance, Rapport, P2, P1 ou OR.</li>
                      <li><strong>Calcul de la taille :</strong> Méthodes de Kelsey, Fleiss, Fleiss avec CC.</li>
                      <li><strong>Résultats détaillés :</strong> Nombre de cas et témoins.</li>
                      <li><strong>Fonctionnalités utilitaires :</strong> Effacer, exemple, copier, export PDF.</li>
                    </ul>
                    <p><strong>Formules Clés :</strong> Basées sur Z-alpha, Z-beta, proportions.</p>
                    <p><strong>Utilisation :</strong> Entrez les paramètres, consultez les tailles.</p>
                  </ContentBlock>
                </div>
              </div>
            </div>

            {/* Simulation */}
            <div id="simulation" className="scroll-mt-20">
              <SectionHeader
                icon={<Cpu className="w-6 h-6" />}
                title="3. Module de Simulation"
                subtitle="Modéliser la propagation de maladies infectieuses"
                id="simulation"
              />
              <div className="space-y-8 pl-2">
                <div id="modeles-epidemiologiques" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-500" />
                    3.1. Modèles Épidémiologiques
                  </h3>
                  <ContentBlock title="Description">
                    <p>Le module prend en charge plusieurs modèles compartimentaux :</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>SIR :</strong> S, I, R. Équations : dS/dt = -β S I / N, etc.</li>
                      <li><strong>SEIR :</strong> S, E, I, R. Ajoute Exposé (E).</li>
                      <li><strong>SEIRD :</strong> Ajoute Décédé (D).</li>
                      <li><strong>SEIQRD :</strong> Ajoute Quarantaine (Q).</li>
                      <li><strong>CUSTOM :</strong> Équations personnalisées.</li>
                    </ul>
                  </ContentBlock>
                </div>
                {/* Add similar blocks for other subsections */}
                <div id="parametres-simulation" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Sliders className="w-5 h-5 text-blue-500" />
                    3.2. Paramètres de Simulation
                  </h3>
                  <ContentBlock title="Description">
                    <p>Ajustez beta (β), sigma (σ), gamma (γ), mu (μ), delta (δ), theta (θ), R0, mobility.</p>
                  </ContentBlock>
                </div>
                <div id="regions-connexions" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-blue-500" />
                    3.3. Régions et Connexions
                  </h3>
                  <ContentBlock title="Description">
                    <p>Chaque région a population, compartiments initiaux, coordonnées, connexions.</p>
                  </ContentBlock>
                </div>
                <div id="interventions" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-blue-500" />
                    3.4. Interventions
                  </h3>
                  <ContentBlock title="Description">
                    <p>Type, efficacité, jour de début.</p>
                  </ContentBlock>
                </div>
                <div id="scenarios-predefinis" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <ListChecks className="w-5 h-5 text-blue-500" />
                    3.5. Scénarios Prédéfinis
                  </h3>
                  <ContentBlock title="Description">
                    <p>Base, Confinement Strict, Vaccination Massive, Intervention Tardive.</p>
                  </ContentBlock>
                </div>
                <div id="visualisations" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    3.6. Visualisations
                  </h3>
                  <ContentBlock title="Description">
                    <p>Carte 2D/3D, graphiques linéaires, barres, tableau, réseau.</p>
                  </ContentBlock>
                </div>
                <div id="reglages-avances" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-500" /> {/* Assuming Gear icon if available, else replace */}
                    3.7. Réglages Avancés
                  </h3>
                  <ContentBlock title="Description">
                    <p>Réseau, carte, graphiques personnalisables.</p>
                  </ContentBlock>
                </div>
              </div>
            </div>

            {/* Geospatial */}
            <div id="geospatial" className="scroll-mt-20">
              <SectionHeader
                icon={<Map className="w-6 h-6" />}
                title="4. Module de Visualisation Géospatiale"
                subtitle="Cartographier des données de santé"
                id="geospatial"
              />
              <div className="space-y-8 pl-2">
                <div id="chargement-donnees" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-500" />
                    4.1. Chargement des Données
                  </h3>
                  <ContentBlock title="Description">
                    <p>Import CSV/Excel, mappez lat, lng, value, time.</p>
                  </ContentBlock>
                </div>
                {/* Add other geospatial subsections similarly */}
                <div id="gestion-jeux-donnees" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-blue-500" />
                    4.2. Gestion des Jeux de Données
                  </h3>
                  <ContentBlock title="Description">
                    <p>Multiples jeux, personnalisation, exemples (Ebola, COVID).</p>
                  </ContentBlock>
                </div>
                <div id="types-visualisation" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Grid className="w-5 h-5 text-blue-500" />
                    4.3. Types de Visualisation
                  </h3>
                  <ContentBlock title="Description">
                    <p>Marqueurs, clustering, heatmap.</p>
                  </ContentBlock>
                </div>
                <div id="analyse-ia" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-blue-500" />
                    4.4. Analyse IA
                  </h3>
                  <ContentBlock title="Description">
                    <p>Résumé, aperçus, recommandations, alertes.</p>
                  </ContentBlock>
                </div>
                <div id="reglages-carte" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Sliders className="w-5 h-5 text-blue-500" />
                    4.5. Réglages de la Carte
                  </h3>
                  <ContentBlock title="Description">
                    <p>Thèmes, limite d'affichage, paramètres globaux, configuration avancée.</p>
                  </ContentBlock>
                </div>
              </div>
            </div>

            {/* Workspace */}
            <div id="workspace" className="scroll-mt-20">
              <SectionHeader
                icon={<Layers className="w-6 h-6" />}
                title="5. Espace de Travail"
                subtitle="Environnement de développement intégré pour R"
                id="workspace"
              />
              <div className="space-y-8 pl-2">
                <div id="gestion-fichiers-dossiers" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-500" />
                    5.1. Gestion des Fichiers et Dossiers
                  </h3>
                  <ContentBlock title="Description">
                    <p>Arborescence, types de fichiers, import/export, persistance.</p>
                  </ContentBlock>
                </div>
                {/* Add other workspace subsections */}
                <div id="editeur-code" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Code className="w-5 h-5 text-blue-500" /> {/* Assuming Code icon */}
                    5.2. Éditeur de Code
                  </h3>
                  <ContentBlock title="Description">
                    <p>Monaco Editor, onglets, analyse de code.</p>
                  </ContentBlock>
                </div>
                <div id="execution-code-r" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-500" />
                    5.3. Exécution de Code R
                  </h3>
                  <ContentBlock title="Description">
                    <p>WebR, exécution manuelle/auto, packages.</p>
                  </ContentBlock>
                </div>
                <div id="variables-sortie" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-blue-500" />
                    5.4. Variables et Sortie
                  </h3>
                  <ContentBlock title="Description">
                    <p>Terminal, explorateur de variables, visualisations.</p>
                  </ContentBlock>
                </div>
              </div>
            </div>

            {/* PubMed */}
            <div id="pubmed" className="scroll-mt-20">
              <SectionHeader
                icon={<Database className="w-6 h-6" />}
                title="6. Explorateur PubMed"
                subtitle="Outil de recherche bibliographique"
                id="pubmed"
              />
              <div className="space-y-8 pl-2">
                <div id="recherche-articles" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Search className="w-5 h-5 text-blue-500" />
                    6.1. Recherche d'Articles
                  </h3>
                  <ContentBlock title="Description">
                    <p>Requête, API PubMed, affichage des résultats.</p>
                  </ContentBlock>
                </div>
                {/* Add other pubmed subsections */}
                <div id="filtres-tri" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-blue-500" /> {/* Assuming Filter icon */}
                    6.2. Filtres et Tri
                  </h3>
                  <ContentBlock title="Description">
                    <p>Période, type d'article, tri par pertinence/date.</p>
                  </ContentBlock>
                </div>
                <div id="gestion-favoris" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Bookmark className="w-5 h-5 text-blue-500" /> {/* Assuming Bookmark icon */}
                    6.3. Gestion des Favoris
                  </h3>
                  <ContentBlock title="Description">
                    <p>Mise en favoris, vue, export.</p>
                  </ContentBlock>
                </div>
                <div id="analyse-tendance" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    6.4. Analyse de Tendance
                  </h3>
                  <ContentBlock title="Description">
                    <p>Graphique de distribution temporelle.</p>
                  </ContentBlock>
                </div>
                <div id="generateur-requetes-mesh" className="scroll-mt-20">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    6.5. Générateur de Requêtes MeSH
                  </h3>
                  <ContentBlock title="Description">
                    <p>Vocabulaire MeSH, générateur IA pour requêtes complexes.</p>
                  </ContentBlock>
                </div>
              </div>
            </div>

            {/* References */}
            <div id="references" className="scroll-mt-20">
              <SectionHeader
                icon={<BookMarked className="w-6 h-6" />}
                title="7. Références"
                subtitle="Sources et liens"
                id="references"
              />
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="https://jstat.github.io/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                      jStat <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    <a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                      Leaflet <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.chartjs.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                      Chart.js <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    <a href="https://docs.r-wasm.org/webr/latest/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                      WebR <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    <a href="https://www.ncbi.nlm.nih.gov/books/NBK25501/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                      PubMed E-utilities <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 dark:text-slate-500">
          <p className="mt-2">OpenEPI Suite – Documentation rééditée en février 2026.</p>
        </div>
      </div>
    </div>
  );
}