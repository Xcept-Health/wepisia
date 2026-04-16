import { useTranslation } from 'react-i18next';
import { 
  Heart, BookOpen, Code, Users, Globe, Map, 
  Ruler, Binary, LineChart, Shield, Sparkles,
 Mail, Award, Zap, ExternalLink, Settings
} from 'lucide-react';
import { FaLinkedin, FaGithub, FaUser } from 'react-icons/fa';

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        
        {/* Hero header */}
        <section className="mb-20">
          <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
            {t('about.title')}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">
              {t('about.subtitle')}
            </span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed max-w-3xl">
            {t('about.intro')}
          </p>
        </section>

        {/* Vision cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <Heart className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('about.visionTitle')}
            </h3>
            <p className="text-slate-500 text-sm">{t('about.visionDesc')}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <Globe className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('about.openEpiTitle')}
            </h3>
            <p className="text-slate-500 text-sm">{t('about.openEpiDesc')}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <Sparkles className="w-12 h-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('about.commitmentTitle')}
            </h3>
            <p className="text-slate-500 text-sm">{t('about.commitmentDesc')}</p>
          </div>
        </div>

        {/* OpenEpi Heritage Section with Image */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <div>
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <BookOpen className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('about.openEpiHeritageTitle')}
                </h2>
                <p className="text-slate-500">{t('about.openEpiHeritageDesc')}</p>
              </div>
            </div>
            <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400 space-y-4">
              <p>{t('about.openEpiContext')}</p>
              <p>{t('about.openEpiGoals')}</p>
              <h4 className="font-semibold mt-4">{t('about.openEpiFeatures')}</h4>
              <ul className="list-disc list-inside">
                <li>{t('about.feature1')}</li>
                <li>{t('about.feature2')}</li>
                <li>{t('about.feature3')}</li>
                <li>{t('about.feature4')}</li>
              </ul>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 flex flex-col items-center justify-center text-center h-full">
          <img 
    src="/OpenArch.jpg" 
    alt="OpenEpi logo" 
    className="w-full h-full object-cover rounded-2xl shadow-md"
    onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x200?text=OpenEpi+Logo' }}
  />

</div>
        </div>

        {/* Genesis Section */}
        <section className="mb-20">
          <div className="flex items-start gap-6 mb-8">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <Code className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                {t('about.genesisTitle')}
              </h2>
              <p className="text-slate-500">{t('about.genesisDesc')}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-slate-600 dark:text-slate-400">{t('about.genesisText')}</p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {[
                t('about.featureModern'),
                t('about.featureSimulation'),
                t('about.featureGeospatial'),
                t('about.featureEditor'),
                t('about.featureExplorer'),
                t('about.featureMultilingual')
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Zap size={16} className="text-blue-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recognition & Credits */}
        <section className="mb-20">
          <div className="flex items-start gap-6 mb-8">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <Award className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                {t('about.recognitionTitle')}
              </h2>
              <p className="text-slate-500">{t('about.recognitionDesc')}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">{t('about.creditsTitle')}</h3>
                <ul className="space-y-2 text-sm">
                  <li>Andrew G. Dean, MD, MPH</li>
                  <li>Kevin M. Sullivan, PhD, MPH</li>
                  <li>Roger Mir, MSc</li>
                  <li>{t('about.otherContributors')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">{t('about.referencesTitle')}</h3>
                <p className="text-sm mb-2">
                  Dean AG, Sullivan KM, Soe MM. <em>OpenEpi: Open Source Epidemiologic Statistics for Public Health</em>. Version 3.01. 
                  <a href="https://www.openepi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">www.OpenEpi.com</a>, updated 2013/04/06.
                </p>
                <p className="text-sm">
                  Sullivan KM, Dean AG, Mir R. OpenEpi: A Web-based Epidemiologic and Statistical Calculator for Public Health. 
                  <em>Public Health Reports</em>. 2009;124(3):471-474. 
                  <a href="https://doi.org/10.1177/003335490912400320" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DOI: 10.1177/003335490912400320</a>
                </p>
              </div>
            </div>
            <p className="mt-6 text-sm font-semibold border-t pt-4">
              {t('about.recognitionConclusion')}
            </p>
          </div>
        </section>

        {/* Contribute */}
        <section className="mb-20">
  <div className="flex items-start gap-6 mb-8">
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
      <Users className="text-blue-600" size={28} />
    </div>
    <div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
        {t('about.contributeTitle')}
      </h2>
      <p className="text-slate-500">{t('about.contributeDesc')}</p>
    </div>
  </div>
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
    <div className="flex items-center gap-2">
      <FaGithub size={20} className="text-slate-500" />
      <a href="https://github.com/Xcept-Health/wepisia" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        github.com/Xcept-Health/wepisia
      </a>
    </div>
    <div className="flex items-center gap-2">
      <Mail size={20} className="text-slate-500" />
      <a href="mailto:contact@xcept-health.com" className="text-blue-600 hover:underline">
        contact@xcept-health.com
      </a>
    </div>
    <div className="flex items-center gap-2">
      <FaUser size={20} className="text-slate-500" />
      <a href="mailto:votre.email@exemple.com" className="text-blue-600 hover:underline">
        arielshadrac@gmail.com
      </a>
    </div>
  </div>
</section>
              {/* Footer */}
              <footer className="w-full py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-8">
            {/* Social bar – responsive wrap */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full bg-slate-50/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 backdrop-blur-md">
              {[
                { icon: <Settings size={16} />, label: t('footer.data'), url: '/settings' },
                { icon: <BookOpen size={16} />, label: t('footer.documentation'), url: 'Docs' },
                { icon: <FaGithub size={16} />, label: t('footer.github'), url: 'https://github.com/Xcept-Health/wepisia' },
                { icon: <ExternalLink size={16} />, label: t('footer.web'), url: 'https://xcept-health.com' },
                { icon: <FaLinkedin size={16} />, label: 'LinkedIn', url: 'https://linkedin.com/company/xcept-health' },
              ].map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target={item.url.startsWith('http') ? '_blank' : undefined}
                  rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group relative p-3 rounded-full hover:bg-white dark:hover:bg-white/10 text-slate-400 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {item.icon}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-slate-500 whitespace-nowrap">
                    {item.label}
                  </span>
                </a>
              ))}
            </div>


            <div className="text-center space-y-3">
  <p className="text-[13px] tracking-tight text-slate-500 dark:text-slate-400 font-light px-2">
    © {new Date().getFullYear()} 
    <span className="font-semibold text-slate-800 dark:text-white"> Xcept-Health</span>
    <span className="mx-3 opacity-20">•</span>
    Wepisia
  </p>

  <p className="text-[13px] text-slate-500 dark:text-slate-400 font-light">
    {t('footer.tagline')}
  </p>

  <div className="flex items-center justify-center gap-6 text-xs text-slate-400 dark:text-slate-500">
    <a href="/privacy" >
      Confidentialité
    </a>
    <span className="opacity-30">|</span>
    <a href="/terms" >
      Conditions d’utilisation
    </a>
    <span className="opacity-30">|</span>
    <span className="italic">Burkina Faso</span>
  </div>
</div>
          </div>
        </div>
      </footer>
     
      </div>
    </div>
  );
}