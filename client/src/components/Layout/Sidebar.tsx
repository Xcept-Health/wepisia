import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Menu, X, Home, BarChart3, Calculator, Zap, Users, 
  BookOpen, Settings, Blocks, Proportions as ProportionsIcon,
  Grid2x2, ChartNoAxesCombined, TableCellsSplit, ScanEye,
  CirclePercent, SquarePercent, BetweenHorizontalStart, 
  BetweenVerticalEnd, AlignVerticalDistributeCenter,
  AlignHorizontalDistributeCenter, ChartPie, Link as LinkIcon,
  AlignHorizontalSpaceAround, TestTubes, Shrink,
  ChartBarStacked, UnfoldHorizontal, Shuffle, Dices,
  MapPinHouse, Biohazard, HeartHandshake, Moon, Sun,
  ChevronRight, Building, UsersRound, ChevronsLeft
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  href: string;
  section?: string;
}

export function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si on est en mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Condition commune : afficher les labels (mode étendu ou mobile ouvert)
  const showLabels = !isCollapsed || (isMobile && isOpen);

  const mainItems: MenuItem[] = [
    { id: 'home', label: 'Accueil', icon: Home, href: '/' },
  ];

  const sections = [
    {
      id: 'numerotations',
      title: 'Numérotations',
      items: [
        { id: 'std_mortality_ratio', label: 'Rapport Std.Mort', icon: Blocks, href: '/biostatistics/std-mortality-ratio' },
        { id: 'proportions', label: 'Proportions', icon: ProportionsIcon, href: '/biostatistics/proportions' },
        { id: 'two_by_two', label: 'Tableaux 2×2', icon: Grid2x2, href: '/biostatistics/two_by_two' },
        { id: 'dose_response', label: 'Dose-Réponse', icon: ChartNoAxesCombined, href: '/biostatistics/dose-response' },
        { id: 'r_by_c', label: 'Tableaux R×C', icon: TableCellsSplit, href: '/biostatistics/r_by_c' },
        { id: 'screening', label: 'Dépistage', icon: ScanEye, href: '/biostatistics/screening' },
      ]
    },
    {
      id: 'personnes_temps',
      title: 'Personnes temps',
      items: [
        { id: 'one_rate', label: 'Taux 1', icon: CirclePercent, href: '/biostatistics/one_rate' },
        { id: 'compare_two_rates', label: 'Taux 2', icon: SquarePercent, href: '/biostatistics/compare_two_rates' },
      ]
    },
    {
      id: 'variables_continues',
      title: 'Variables continues',
      items: [
        { id: 'mean_ci', label: 'Mean CI', icon: BetweenHorizontalStart, href: '/mean-ci' },
        { id: 'median_percentile_ci', label: 'Mean Percentile Chi', icon: BetweenVerticalEnd, href: '/median-percentile-ci' },
        { id: 't_test', label: 'Test t', icon: AlignVerticalDistributeCenter, href: '/t-test' },
        { id: 'anova', label: 'ANOVA', icon: AlignHorizontalDistributeCenter, href: '/anova' },
      ]
    },
    {
      id: 'taille_echantillon',
      title: "Taille d'échantillon",
      items: [
        { id: 'proportions_sample', label: 'Proportions', icon: ChartPie, href: '/sample-proportions' },
        { id: 'cohort_rct', label: 'Cohort RCT', icon: UsersRound, href: '/cohort-rct' },
        { id: 'matched_case', label: 'Matched Case', icon: LinkIcon, href: '/matched-case' },
        { id: 'mean_difference_sample', label: 'Mean difference', icon: AlignHorizontalSpaceAround, href: '/mean-difference-sample' },
      ]
    },
    {
      id: 'puissance',
      title: 'Puissance',
      items: [
        { id: 'cohort_rct_power', label: 'Cohorte RCT', icon: Users, href: '/cohort-rct-power' },
        { id: 'clinical_trial', label: 'Essai Cliniques', icon: TestTubes, href: '/clinical-trial' },
        { id: 'case_control', label: 'Coupe X', icon: Shrink, href: '/case-control' },
        { id: 'mean_difference_power', label: 'Différence Moyenne', icon: ChartBarStacked, href: '/mean-difference-power' },
        { id: 'matched_case_control', label: 'Cas-Témoins Appariés', icon: UnfoldHorizontal, href: '/matched-case-control' },
      ]
    },
    {
      id: 'autres',
      title: 'Autres',
      items: [
        { id: 'random_numbers', label: 'Nombres Aléatoires', icon: Dices, href: '/random-numbers' },
      ]
    },
    {
      id: 'geospatial',
      title: 'GeoSpatial',
      items: [
        { id: 'geospatial_module', label: 'GeoSpatial', icon: MapPinHouse, href: '/geospatial' },
      ]
    },
    {
      id: 'simulation',
      title: 'Simulation',
      items: [
        { id: 'epidemic_simulation', label: 'Épidémiologique', icon: Biohazard, href: '/simulation' },
      ]
    },
    {
      id: 'support',
      title: 'Support',
      items: [
        { id: 'help', label: 'Aide', icon: HeartHandshake, href: '/help' },
      ]
    }
  ];

  const footerItems = [
    { id: 'docs', label: 'Documentation', icon: BookOpen, href: '/docs' },
    { id: 'settings', label: 'Paramètres', icon: Settings, href: '/settings' },
  ];

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ${
          isMobile 
            ? (isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full') 
            : (isCollapsed ? 'w-20' : 'w-64')
        }`}
      >
        {/* Header */}
        <div className={`flex items-center ${showLabels ? 'justify-between' : 'justify-center'} p-4`}>
          <Link href="/" onClick={handleLinkClick}>
            <div className="flex items-center gap-3 cursor-pointer">
              {showLabels && (
                <div className="animate-fade-in">
                  <h1 className="font-bold text-lg text-gray-900 dark:text-white">OpenEPI</h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Reedited</p>
                </div>
              )}
            </div>
          </Link>

          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={isMobile ? 'Fermer le menu' : (isCollapsed ? 'Développer la sidebar' : 'Réduire la sidebar')}
          >
            {isMobile ? (
              <X className="w-5 h-5" strokeWidth={1.5} />
            ) : (
              <ChevronsLeft
                className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                strokeWidth={1.5}
              />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Main Items */}
          <div className="mb-4">
            {mainItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href}>
                  <a
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`flex items-center gap-3 px-3 py-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group ${!showLabels ? 'justify-center' : ''}`}
                    onClick={handleLinkClick}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                    {showLabels && (
                      <>
                        <span className="text-sm">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-auto" strokeWidth={1.5} />
                      </>
                    )}
                  </a>
                </Link>
              );
            })}
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.id} className="pt-4">
              {showLabels && (
                <div className="flex items-center justify-between mb-3 animate-slide-in">
                  <h3 className="px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="w-6 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shrink-0" />
                </div>
              )}
              
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.id} href={item.href}>
                      <a
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`flex items-center gap-3 px-3 py-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group ${!showLabels ? 'justify-center' : ''}`}
                        onClick={handleLinkClick}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                        {showLabels && (
                          <>
                            <span className="text-sm">{item.label}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-auto" strokeWidth={1.5} />
                          </>
                        )}
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 space-y-1">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.href}>
                <a
                  className={`flex items-center gap-3 px-3 py-4 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 ${!showLabels ? 'justify-center' : ''}`}
                  onClick={handleLinkClick}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                  {showLabels && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </a>
              </Link>
            );
          })}
        </div>

        {/* Version and Theme/Language Controls */}
        {showLabels && (
          <div className="px-4 py-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                R1.0.0
              </div>
              <div className="flex items-center space-x-2">
                <select className="text-xs bg-transparent border-none text-gray-500 dark:text-gray-400 focus:outline-none cursor-pointer">
                  <option value="fr">🇫🇷</option>
                  <option value="en">🇺🇸</option>
                  <option value="es">🇪🇸</option>
                  <option value="pt">🇵🇹</option>
                  <option value="it">🇮🇹</option>
                </select>
                
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
                  ) : (
                    <Moon className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Bouton Burger fixe pour mobile – visible seulement quand la sidebar est fermée */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-3 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 transition-all hover:shadow-xl"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" strokeWidth={1.5} />
        </button>
      )}

      {/* Styles CSS pour les animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}