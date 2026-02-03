import { BarChart3, Calculator, Zap, Users, TrendingUp, Activity, Layers, PieChart } from 'lucide-react';
import { ToolCard } from '@/components/ToolCard';

export default function Tools() {
  const allTools = [
    {
      icon: BarChart3,
      title: 'Tableaux 2×2',
      description: 'Calculs d\'odds ratio, risque relatif et chi-carré pour l\'analyse de tableaux de contingence.',
      href: '/tools/two-by-two',
      color: 'blue' as const,
    },
    {
      icon: Calculator,
      title: 'Taille d\'échantillon',
      description: 'Calculs de taille d\'échantillon et de puissance pour différents types d\'études.',
      href: '/tools/sample-size',
      color: 'green' as const,
    },
    {
      icon: TrendingUp,
      title: 'Variables continues',
      description: 'Tests t, ANOVA et analyses statistiques pour variables quantitatives.',
      href: '/tools/continuous',
      color: 'purple' as const,
    },
    {
      icon: Users,
      title: 'Études de cohorte',
      description: 'Analyse des études de cohorte avec calcul du risque relatif et intervalles de confiance.',
      href: '/tools/cohort',
      color: 'blue' as const,
    },
    {
      icon: Activity,
      title: 'Études cas-contrôle',
      description: 'Analyse des études cas-contrôle avec odds ratio et tests d\'association.',
      href: '/tools/case-control',
      color: 'green' as const,
    },
    {
      icon: Zap,
      title: 'Simulation épidémique',
      description: 'Modèles SEIR et simulations de propagation de maladies infectieuses.',
      href: '/tools/simulation',
      color: 'purple' as const,
    },
    {
      icon: Layers,
      title: 'Analyse stratifiée',
      description: 'Analyse des données stratifiées avec ajustement pour les variables de confusion.',
      href: '/tools/stratified',
      color: 'blue' as const,
    },
    {
      icon: PieChart,
      title: 'Proportions',
      description: 'Calculs de proportions, intervalles de confiance et comparaisons.',
      href: '/tools/proportions',
      color: 'green' as const,
    },
  ];

  return (
    <div className="min-h-screen pt-16 pb-12">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-slate-900 dark:to-slate-800 py-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tous les outils
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Explorez notre collection complète d'outils biostatistiques pour l'épidémiologie.
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allTools.map((tool) => (
              <ToolCard
                key={tool.href}
                icon={tool.icon}
                title={tool.title}
                description={tool.description}
                href={tool.href}
                colorClass={tool.color}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
