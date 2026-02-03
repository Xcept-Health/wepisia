import { BookOpen, Code, Zap, HelpCircle } from 'lucide-react';

export default function Docs() {
  const sections = [
    {
      icon: BookOpen,
      title: 'Guide d\'utilisation',
      description: 'Apprenez comment utiliser chaque outil d\'OpenEPI avec des tutoriels détaillés.',
      href: '#guide',
    },
    {
      icon: Code,
      title: 'API Documentation',
      description: 'Documentation technique pour intégrer OpenEPI dans vos applications.',
      href: '#api',
    },
    {
      icon: Zap,
      title: 'Tutoriels vidéo',
      description: 'Regardez nos tutoriels vidéo pour apprendre rapidement.',
      href: '#videos',
    },
    {
      icon: HelpCircle,
      title: 'FAQ',
      description: 'Trouvez les réponses aux questions fréquemment posées.',
      href: '#faq',
    },
  ];

  return (
    <div className="min-h-screen pt-16 pb-12">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-slate-900 dark:to-slate-800 py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Documentation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Tout ce que vous devez savoir pour utiliser OpenEPI
          </p>
        </div>
      </section>

      {/* Documentation sections */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <a
                  key={index}
                  href={section.href}
                  className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {section.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {section.description}
                  </p>
                </a>
              );
            })}
          </div>

          {/* Quick start */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-2xl p-8 mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Démarrage rapide
            </h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                <strong>Étape 1 :</strong> Sélectionnez l'outil qui correspond à votre type d'analyse
              </p>
              <p>
                <strong>Étape 2 :</strong> Entrez vos données dans les champs fournis
              </p>
              <p>
                <strong>Étape 3 :</strong> Cliquez sur "Calculer" pour obtenir les résultats
              </p>
              <p>
                <strong>Étape 4 :</strong> Exportez ou partagez vos résultats
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
              Questions fréquemment posées
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: 'OpenEPI est-il vraiment gratuit ?',
                  a: 'Oui, OpenEPI est complètement gratuit et open source. Il n\'y a aucun frais caché.',
                },
                {
                  q: 'Mes données sont-elles sécurisées ?',
                  a: 'Toutes les analyses sont effectuées localement dans votre navigateur. Vos données ne sont jamais envoyées à nos serveurs.',
                },
                {
                  q: 'Puis-je utiliser OpenEPI hors ligne ?',
                  a: 'Oui, vous pouvez télécharger OpenEPI et l\'utiliser hors ligne sur votre ordinateur.',
                },
                {
                  q: 'Comment puis-je signaler un bug ?',
                  a: 'Veuillez nous contacter via notre page GitHub ou envoyer un email à contact@openepi.org',
                },
              ].map((faq, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {faq.q}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
