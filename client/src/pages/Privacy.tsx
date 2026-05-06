import { Link } from "wouter";
import { useState, useEffect } from "react";
import {
  Shield, Database, Eye, Cookie, Lock, Globe, Mail, Calendar, 
  FileText, CheckCircle, XCircle, AlertTriangle, UserCheck, 
  Server, Smartphone, Share2, Code, Settings, BookOpen, ExternalLink
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { FaLinkedin, FaGithub } from 'react-icons/fa';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

        {/* INTRODUCTION */}
        <section id="introduction" className="mb-20 scroll-mt-32">
          <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
            {t('privacy.title')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">
              {t('privacy.subtitle')}
            </span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed max-w-3xl">
            {t('privacy.intro')}
          </p>
          <p className="text-slate-500 mt-4 max-w-3xl">
            {t('privacy.summary')}
          </p>
        </section>

        {/* KEY PRINCIPLES CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <Database size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('privacy.noDataCollection')}
            </h3>
            <p className="text-slate-500 text-sm">
              {t('privacy.noDataDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('privacy.localProcessing')}
            </h3>
            <p className="text-slate-500 text-sm">
              {t('privacy.localDesc')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Eye size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('privacy.noTracking')}
            </h3>
            <p className="text-slate-500 text-sm">
              {t('privacy.noTrackingDesc')}
            </p>
          </div>
        </div>

        {/* DETAILED SECTIONS */}
        <div className="space-y-20 mb-20">

          <section id="data-collected" className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Database className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('privacy.dataCollectedTitle')}
                </h2>
                <p className="text-slate-500">{t('privacy.dataCollectedDesc')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-500" />
                    {t('privacy.neverCollected')}
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li>{t('privacy.noName')}</li>
                    <li>{t('privacy.noIp')}</li>
                    <li>{t('privacy.noTrackingData')}</li>
                    <li>{t('privacy.noHealthData')}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Server size={20} className="text-blue-500" />
                  {t('privacy.localStorage')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {t('privacy.localStorageDesc')}
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-500">
                  <li>{t('privacy.langPref')}</li>
                  <li>{t('privacy.uiState')}</li>
                </ul>
                <p className="text-xs text-slate-400 mt-3">
                  {t('privacy.clearLocalStorage')}
                </p>
              </div>
            </div>
          </section>


          <section id="data-usage" className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Share2 className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('privacy.dataUsageTitle')}
                </h2>
                <p className="text-slate-500">{t('privacy.dataUsageDesc')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-lg mb-3">{t('privacy.calculations')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('privacy.calculationsDesc')}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-lg mb-3">{t('privacy.persistence')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('privacy.persistenceDesc')}
                </p>
              </div>
            </div>
          </section>


          <section id="cookies" className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Cookie className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('privacy.cookiesTitle')}
                </h2>
                <p className="text-slate-500">{t('privacy.cookiesDesc')}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('privacy.cookiesDetail')}
              </p>
            </div>
          </section>


          <section id="third-parties" className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Globe className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('privacy.thirdPartiesTitle')}
                </h2>
                <p className="text-slate-500">{t('privacy.thirdPartiesDesc')}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('privacy.thirdPartiesDetail')}
              </p>
            </div>
          </section>


          <section id="security" className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Lock className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('privacy.securityTitle')}
                </h2>
                <p className="text-slate-500">{t('privacy.securityDesc')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-lg mb-3">{t('privacy.localComputation')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('privacy.localComputationDesc')}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-lg mb-3">{t('privacy.https')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('privacy.httpsDesc')}
                </p>
              </div>
            </div>
          </section>


          <section id="changes" className="scroll-mt-32">
            <div className="flex items-start gap-6 mb-8">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <Calendar className="text-blue-600" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                  {t('privacy.changesTitle')}
                </h2>
                <p className="text-slate-500">{t('privacy.changesDesc')}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('privacy.changesDetail')}
              </p>
            </div>
          </section>


          <section id="contact" className="scroll-mt-32">
  <div className="flex items-start gap-6 mb-8">
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
      <Mail className="text-blue-600" size={28} />
    </div>
    <div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
        {t('privacy.contactTitle')}
      </h2>
      <p className="text-slate-500">{t('privacy.contactDesc')}</p>
    </div>
  </div>

  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
    <div>
      <p className="font-semibold">{t('privacy.contactEmail')}</p>
      <a href="mailto:contact@xcept-health.com" className="text-blue-600 hover:underline">
        contact@xcept-health.com
      </a>
    </div>

    <div>
      <p className="font-semibold">{t('privacy.contactDirect')}</p>
      <a href="mailto:arielshadrac@gmail.com" className="text-blue-600 hover:underline">
        arielshadrac@gmail.com
      </a>

    </div>

    <div>
      <p className="font-semibold">{t('privacy.contactSite')}</p>
      <a href="https://xcept-health.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        xcept-health.com
      </a>
    </div>
    <div>
      <p className="font-semibold">{t('privacy.openSource')}</p>
      <a href="https://github.com/Xcept-Health/wepisia" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        https://github.com/Xcept-Health/wepisia
      </a>
    </div>
  </div>
</section>
        </div>
              {/* Footer */}
      <footer className="w-full py-2 px-4 sm:px-6">
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