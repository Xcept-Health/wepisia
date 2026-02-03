import { CheckCircle, Users, Zap, Globe } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen pt-16 pb-12">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-slate-900 dark:to-slate-800 py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            À propos d'OpenEPI
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Découvrez l'histoire et la mission d'OpenEPI
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {/* About section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Qu'est-ce qu'OpenEPI ?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              OpenEPI est une suite d'outils biostatistiques gratuits et open source conçus pour les professionnels de la santé publique, les épidémiologistes et les chercheurs. Notre mission est de fournir des outils accessibles et précis pour l'analyse épidémiologique.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Cette version React représente une modernisation complète de la plateforme, offrant une interface utilisateur améliorée, des performances optimisées et une meilleure accessibilité.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {[
              {
                icon: CheckCircle,
                title: 'Gratuit et Open Source',
                description: 'Accès complet à tous les outils sans frais, code source disponible sur GitHub.',
              },
              {
                icon: Users,
                title: 'Communauté Active',
                description: 'Contribué et maintenu par une communauté mondiale de professionnels de la santé.',
              },
              {
                icon: Zap,
                title: 'Haute Performance',
                description: 'Calculs rapides et précis, même avec de grands ensembles de données.',
              },
              {
                icon: Globe,
                title: 'Multilingue',
                description: 'Interface disponible en plusieurs langues pour une accessibilité mondiale.',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Mission section */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Notre Mission
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Nous nous engageons à fournir des outils biostatistiques de qualité professionnelle qui sont :
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-3">✓</span>
                <span><strong>Accessibles</strong> : Faciles à utiliser pour les professionnels de tous niveaux</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-3">✓</span>
                <span><strong>Précis</strong> : Basés sur des algorithmes validés et des pratiques statistiques rigoureuses</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-3">✓</span>
                <span><strong>Transparents</strong> : Code source ouvert et disponible pour l'examen et l'amélioration</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 dark:text-blue-400 mr-3">✓</span>
                <span><strong>Gratuits</strong> : Aucun frais, aucune limitation, aucune publicité</span>
              </li>
            </ul>
          </div>

          {/* Contact section */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Nous contacter
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Avez-vous des questions, des suggestions ou des signalements de bugs ?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:contact@openepi.org"
                className="inline-flex items-center justify-center px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Envoyer un email
              </a>
              <a
                href="https://github.com/openepi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 text-lg font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
