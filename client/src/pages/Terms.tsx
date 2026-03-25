import { Link } from "wouter";
import {
  FileText, Scale, Shield, Globe, Code, Mail, Calendar, BookOpen,
  AlertTriangle, CheckCircle, XCircle, Users, Lock, Eye,Settings,ExternalLink
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* INTRODUCTION */}
        <section className="mb-20 scroll-mt-32">
          <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
            {t('terms.title')}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">
              {t('terms.subtitle')}
            </span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed max-w-3xl">
            {t('terms.intro')}
          </p>
          <p className="text-slate-500 mt-4 max-w-3xl">
            {t('terms.summary')}
          </p>
        </section>

        {/* KEY PRINCIPLES CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <Scale size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('terms.freeAndOpen')}
            </h3>
            <p className="text-slate-500 text-sm">
              {t('terms.freeAndOpenDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
              <Code size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('terms.openSource')}
            </h3>
            <p className="text-slate-500 text-sm">
              {t('terms.openSourceDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('terms.noWarranty')}
            </h3>
            <p className="text-slate-500 text-sm">
              {t('terms.noWarrantyDesc')}
            </p>
          </div>
        </div>

        {/* DETAILED SECTIONS */}
        <div className="space-y-20 mb-20">

          {/* 1. Acceptance of Terms */}
          <section className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <FileText className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('terms.acceptanceTitle')}
                </h2>
                <p className="text-slate-500">{t('terms.acceptanceDesc')}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('terms.acceptanceDetail')}
              </p>
            </div>
          </section>

          {/* 2. Use of the Service */}
          <section className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Globe className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('terms.useTitle')}
                </h2>
                <p className="text-slate-500">{t('terms.useDesc')}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-lg mb-3">{t('terms.permitted')}</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t('terms.permittedAcademic')}</li>
                  <li>{t('terms.permittedPersonal')}</li>
                  <li>{t('terms.permittedTeaching')}</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-lg mb-3">{t('terms.prohibited')}</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t('terms.prohibitedCommercial')}</li>
                  <li>{t('terms.prohibitedMisuse')}</li>
                  <li>{t('terms.prohibitedIllegal')}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Intellectual Property */}
          <section className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Shield className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('terms.ipTitle')}
                </h2>
                <p className="text-slate-500">{t('terms.ipDesc')}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('terms.ipDetail')}
              </p>
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  {t('terms.licenseNotice')}
                </p>
              </div>
            </div>
          </section>

          {/* 4. Disclaimer of Warranties */}
          <section className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <AlertTriangle className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('terms.disclaimerTitle')}
                </h2>
                <p className="text-slate-500">{t('terms.disclaimerDesc')}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('terms.disclaimerDetail')}
              </p>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>{t('terms.disclaimerMedical')}</span>
                </p>
              </div>
            </div>
          </section>

          {/* 5. Limitation of Liability */}
          <section className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <XCircle className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('terms.liabilityTitle')}
                </h2>
                <p className="text-slate-500">{t('terms.liabilityDesc')}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('terms.liabilityDetail')}
              </p>
            </div>
          </section>

          {/* 6. Changes to Terms */}
          <section className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Calendar className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('terms.changesTitle')}
                </h2>
                <p className="text-slate-500">{t('terms.changesDesc')}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('terms.changesDetail')}
              </p>
            </div>
          </section>

          {/* 7. Contact */}
          <section className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Mail className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('terms.contactTitle')}
                </h2>
                <p className="text-slate-500">{t('terms.contactDesc')}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <p className="font-semibold">{t('terms.contactEmail')}</p>
                <a href="mailto:contact@xcept-health.com" className="text-blue-600 hover:underline">
                  contact@xcept-health.com
                </a>
              </div>
              <div>
                <p className="font-semibold">{t('terms.contactSite')}</p>
                <a href="https://xcept-health.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  xcept-health.com
                </a>
              </div>
              <div className="text-sm text-slate-500">
                {t('terms.openSourceLink')}
              </div>
            </div>
          </section>
        </div>

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