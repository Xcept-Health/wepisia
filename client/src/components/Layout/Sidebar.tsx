import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Menu, X, Home,  Users, 
  BookOpen, Settings, Blocks, Proportions as ProportionsIcon,
  Grid2x2, ChartNoAxesCombined, TableCellsSplit, ScanEye,
  CirclePercent, SquarePercent, BetweenHorizontalStart, 
  BetweenVerticalEnd, AlignVerticalDistributeCenter,
  AlignHorizontalDistributeCenter, ChartPie, Link as LinkIcon,
  AlignHorizontalSpaceAround, Globe,
  ChartBarStacked, UnfoldHorizontal, Shuffle, Dices,
  MapPinHouse, ChartScatter, HeartHandshake, Moon, Sun,
  ChevronRight, Code, UsersRound, ChevronsLeft
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from 'react-i18next'; 

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
  const { settings, updateSetting } = useSettings();
  const { i18n, t } = useTranslation();

  const getFloatingButtonClasses = () => {
    switch (settings.floatingButtonPosition) {
      case 'top-right': return 'top-6 right-6';
      case 'bottom-left': return 'bottom-6 left-6';
      case 'bottom-right': return 'bottom-6 right-6';
      default: return 'top-6 left-6';
    }
  };

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
    { id: 'home', label: t('common.home'), icon: Home, href: '/' },
  ];

  const sections = [
    {
      id: 'numerotations',
      title: t('sidebar.numerotations'),
      items: [
        { id: 'std_mortality_ratio', label: t('sidebar.stdMortalityRatio'), icon: Blocks, href: '/biostatistics/std_mortality_ratio' },
        { id: 'proportions', label: t('sidebar.proportions'), icon: ProportionsIcon, href: '/biostatistics/proportions' },
        { id: 'two_by_two', label: t('sidebar.twoByTwo'), icon: Grid2x2, href: '/biostatistics/two_by_two' },
        { id: 'dose_response', label: t('sidebar.doseResponse'), icon: ChartNoAxesCombined, href: '/biostatistics/dose-response' },
        { id: 'r_by_c', label: t('sidebar.rByC'), icon: TableCellsSplit, href: '/biostatistics/r_by_c' },
        { id: 'screening', label: t('sidebar.screening'), icon: ScanEye, href: '/biostatistics/screening' },
      ]
    },
    {
      id: 'personnes_temps',
      title: t('sidebar.personnesTemps'),
      items: [
        { id: 'one_rate', label: t('sidebar.oneRate'), icon: CirclePercent, href: '/biostatistics/one_rate' },
        { id: 'compare_two_rates', label: t('sidebar.twoRates'), icon: SquarePercent, href: '/biostatistics/compare_two_rates' },
      ]
    },
    {
      id: 'variables_continues',
      title: t('sidebar.variablesContinues'),
      items: [
        { id: 'mean_confidence_interval', label: t('sidebar.meanCI'), icon: BetweenHorizontalStart, href: '/biostatistics/mean_confidence_interval' },
        { id: 'median_percentile_ci', label: t('sidebar.meanPercentileCI'), icon: BetweenVerticalEnd, href: '/biostatistics/median_percentile_ci' },
        { id: 't_test', label: t('sidebar.tTest'), icon: AlignVerticalDistributeCenter, href: '/biostatistics/t_test' },
        { id: 'anova', label: t('sidebar.anova'), icon: AlignHorizontalDistributeCenter, href: '/biostatistics/anova' },
      ]
    },
    {
      id: 'taille_echantillon',
      title: t('sidebar.tailleEchantillon'),
      items: [
        { id: 'proportions_sample', label: t('sidebar.proportionsSample'), icon: ChartPie, href: '/biostatistics/proportions_sample' },
        { id: 'cohort_rct', label: t('sidebar.cohortRCT'), icon: UsersRound, href: '/biostatistics/cohort_rct' },
        { id: 'matched_case', label: t('sidebar.casNonApparie'), icon: LinkIcon, href: '/biostatistics/unmatched_case' },
        { id: 'mean_difference_sample', label: t('sidebar.meanDifference'), icon: AlignHorizontalSpaceAround, href: '/biostatistics/mean_difference_sample' },
      ]
    },
    {
      id: 'puissance',
      title: t('sidebar.puissance'),
      items: [
        { id: 'random_numbers', label: t('sidebar.nombresAleatoires'), icon: Dices, href: '/biostatistics/random_numbers' },
      ]
    },
    {
      id: 'Recherches',
      title: t('sidebar.recherches'),
      items: [
        { id: 'Explorer', label: t('sidebar.explorer'), icon: Globe, href: '/explorer/search' },
      ]
    },

    {
      id: 'geospatial',
      title: t('sidebar.geospatial'),
      items: [
        { id: 'geospatial_module', label: t('sidebar.geospatialModule'), icon: MapPinHouse, href: '/geospatial/map' },
      ]
    },
    {
      id: 'simulation',
      title: t('sidebar.simulation'),
      items: [
        { id: 'epidemic_simulation', label: t('sidebar.simulateur'), icon: ChartScatter, href: '/simulation/dashboard' },
      ]
    },
    {
      id: 'workspace',
      items: [
        { id: 'Atelier code', label: t('sidebar.codeEditor'), icon: Code, href: '/workspace' },
      ]
    },
    {
      id: 'support',
      title: t('sidebar.support'),
      items: [
        { id: 'help', label: t('sidebar.help'), icon: HeartHandshake, href: '/help' },
        { id: 'docs', label: t('sidebar.docs'), icon: BookOpen, href: '/docs' },
      ]
    }
  ];

  const footerItems = [
    { id: 'settings', label: t('common.settings'), icon: Settings, href: '/settings' },
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
        <div className="px-3 py-2 space-y-1">
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
                0.1.0a1
              </div>
              <div className="flex items-center space-x-2">
                <select 
                  value={settings.language}
                  onChange={(e) => {
                    updateSetting('language', e.target.value as any);
                    i18n.changeLanguage(e.target.value);
                  }}
                  className="text-xs bg-transparent border-none text-gray-500 dark:text-gray-400 focus:outline-none cursor-pointer"
                >
                  <option value="fr">fr</option>
                  <option value="mos">mos</option>
                  <option value="wo">wo</option>
                  <option value="ha">ha</option>
                  <option value="sw">sw</option>
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

{/* Bouton Burger fixe pour mobile – position dynamique */}
{isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${getFloatingButtonClasses()} z-50 flex items-center gap-2 p-1
            bg-black/10 dark:bg-white/10 backdrop-blur-lg
            rounded-full shadow-inner
            border border-white/10 dark:border-white/5
            transition-all duration-300 ease-out
            hover:bg-black/20 dark:hover:bg-white/20
            hover:scale-105 active:scale-95 group`}
          aria-label="menu"
        >
          {/* Cercle d'icône avec morphing */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full 
            bg-white dark:bg-slate-950 
            shadow-md shadow-black/10
            transition-all duration-300 group-hover:shadow-lg group-hover:shadow-black/20">
            
            {/* Animation des barres en X au survol */}
            <div className="flex flex-col gap-1.5 w-4.5 transition-transform duration-300 group-hover:rotate-180">
              <span className="w-4.5 h-0.5 bg-slate-900 dark:bg-white rounded-full transition-all group-hover:rotate-45 group-hover:translate-y-1.5" />
              <span className="w-3 h-0.5 bg-slate-900 dark:bg-white rounded-full transition-all group-hover:opacity-0" />
              <span className="w-4.5 h-0.5 bg-slate-900 dark:bg-white rounded-full transition-all group-hover:-rotate-45 group-hover:-translate-y-1.5" />
            </div>
          </div>
          
       
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