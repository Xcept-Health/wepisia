/**
 * Wepisia - SEO Component
 * Usage: <Seo page="home" lang="fr" />
 * Handles title, meta, Open Graph, Twitter, JSON-LD, hreflang, canonical.
 * Language detection is done at the index.html level; this component adapts to the current language.
 */

import { useEffect } from 'react';

//  Types 

type PageKey =
  | 'home' | 'simulation' | 'geospatial' | 'explorer'
  | 'workspace' | 'documentation' | 'settings'
  | 'smr' | 'proportions' | 'twoByTwo' | 'screening'
  | 'doseResponse' | 'rByC' | 'oneRate' | 'twoRates'
  | 'meanCI' | 'tTest' | 'anova' | 'sampleSize';

interface SeoProps {
  page: PageKey;
  /** Override canonical path, e.g. "/simulation" */
  canonicalPath?: string;
  /** Current language (fr, en, mos, sw, wo, ha) – default 'en' */
  lang?: string;
}

//  Site constants 

const SITE_URL      = 'https://wepisia.com';
const SITE_NAME     = 'Wepisia';
const TWITTER_HANDLE = '@wepisia';
const OG_IMAGE      = `${SITE_URL}/og/default.png`; // 1200×630
const SUPPORTED_LANGS = ['fr', 'en', 'mos', 'sw', 'wo', 'ha'];

//  Per‑page SEO data (English) 
// All descriptions mention OpenEPI to strengthen association.

const PAGE_META: Record<PageKey, {
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  path: string;
}> = {
  home: {
    path: '/',
    title: 'Wepisia - OpenEPI reinvented | Biostatistics & Epidemiological Simulation',
    description: 'Wepisia is the modern, open‑source evolution of OpenEPI: biostatistics calculators (SMR, 2×2 tables, proportions…), multi‑region epidemic simulator (SIR/SEIR/SEIRD/SEIQRD), geospatial visualization, R editor, and PubMed explorer. Created by Xcept‑Health, developed by F. Ariel Shadrac OUEDRAOGO. Free, multilingual, no ads.',
    keywords: 'OpenEPI, Wepisia, biostatistics, epidemiology, SMR, standardized mortality ratio, 2x2 table, odds ratio, relative risk, SIR simulation, SEIR simulation, SEIRD simulation, SEIQRD, epidemiological calculator, open source, public health, Xcept-Health, R editor, PubMed search',
    ogImage: `${SITE_URL}/og/home.png`,
  },
  simulation: {
    path: '/simulation',
    title: 'Epidemic Simulator - SIR, SEIR, SEIRD, SEIQRD | Wepisia (OpenEPI)',
    description: 'Simulate the spread of infectious diseases with SIR, SEIR, SEIRD, SEIQRD models on an interconnected region network. Interactive 2D/3D map, real‑time charts, interventions (lockdown, vaccination), pre‑defined scenarios (COVID‑19, Ebola, seasonal flu, measles, cholera, meningitis). Modern alternative to OpenEPI simulation tools.',
    keywords: 'epidemic simulator, SIR, SEIR, SEIRD, SEIQRD, compartmental models, COVID simulation, Ebola simulation, effective Rt, attack rate, lockdown, vaccination, disease spread, OpenEPI simulation, computational epidemiology, Wepisia simulation',
    ogImage: `${SITE_URL}/og/simulation.png`,
  },
  geospatial: {
    path: '/geospatial',
    title: 'Geospatial Visualization - Map, Clustering, Heatmap | Wepisia (OpenEPI)',
    description: 'Import CSV/Excel data and visualize disease cases on an interactive Leaflet map. Automatic clustering, density heatmap, AI‑driven cluster analysis, and epidemiological recommendations. Next‑generation geospatial tool inspired by OpenEPI.',
    keywords: 'geospatial epidemiology, epidemic map, heatmap, clustering, Leaflet epidemiology, public health mapping, hotspot detection, OpenEPI map, Wepisia geospatial',
    ogImage: `${SITE_URL}/og/geospatial.png`,
  },
  explorer: {
    path: '/explorer',
    title: 'PubMed Explorer - Bibliographic Search for Epidemiology | Wepisia',
    description: 'Access over 35 million PubMed references directly from Wepisia. Advanced search, MeSH query generation, favorites, RIS export (EndNote, Zotero, Mendeley). The literature explorer for public health and epidemiology researchers.',
    keywords: 'PubMed search, MeSH query, medical bibliography, epidemiology research, RIS export, EndNote Zotero Mendeley, NCBI, public health literature, OpenEPI search, Wepisia explorer',
    ogImage: `${SITE_URL}/og/explorer.png`,
  },
  workspace: {
    path: '/workspace',
    title: 'R Code Editor - WebR, ggplot2, Statistical Analyses | Wepisia',
    description: 'Run R code directly in your browser with WebR. Multi‑file scripts, interactive console, automatic graphics, epidemic curve animations, package installation (ggplot2, dplyr, KernSmooth). Integrated statistical workspace for OpenEPI users.',
    keywords: 'R online, WebR browser, ggplot2 online, R editor, online statistical analysis, epidemic curve R, biostatistics R, OpenEPI R, Wepisia workspace, R epidemiology',
    ogImage: `${SITE_URL}/og/workspace.png`,
  },
  documentation: {
    path: '/documentation',
    title: 'Documentation - Biostatistics, Simulation, Geospatial | Wepisia (OpenEPI)',
    description: 'Complete documentation of Wepisia: all biostatistical modules (SMR, 2×2 tables, proportions, t‑test, ANOVA…), the epidemic simulator, geospatial module, PubMed explorer, and R editor. Formulas, examples, interpretation of results.',
    keywords: 'OpenEPI documentation, biostatistics guide, SMR formula, 2x2 table guide, epidemic simulation documentation, Wepisia documentation, epidemiology methods, medical statistics guide',
    ogImage: `${SITE_URL}/og/documentation.png`,
  },
  settings: {
    path: '/settings',
    title: 'Settings - Language, Theme, Accessibility | Wepisia',
    description: 'Customize Wepisia: choose language (French, English, Mooré, Swahili, Wolof, Hausa), theme (light/dark), font size, accessibility options. Multilingual interface for researchers worldwide.',
    keywords: 'Wepisia settings, language epidemiology, multilingual public health, Mooré biostatistics, Swahili epidemiology, OpenEPI multilingual, Wepisia preferences',
    path: '/settings',
  },
  smr: {
    path: '/biostatistics',
    title: 'SMR Calculator - Standardized Mortality Ratio with 6 Methods | Wepisia (OpenEPI)',
    description: 'Compute the Standardized Mortality Ratio (SMR) with 6 statistical methods: Exact Poisson, Mid‑P, Byar, Vandenbroucke, Rothman‑Greenland, χ². Confidence intervals, p‑values, automatic interpretation. Improves and extends the OpenEPI SMR calculator.',
    keywords: 'SMR calculator, standardized mortality ratio, OpenEPI SMR, Byar approximation, Poisson exact, Mid-P SMR, confidence interval mortality, epidemiology mortality, Wepisia SMR',
  },
  proportions: {
    path: '/biostatistics',
    title: 'Proportion Confidence Intervals - Clopper‑Pearson, Wilson, Agresti‑Coull | Wepisia',
    description: 'Calculate confidence intervals for a proportion with 4 methods: Clopper‑Pearson (exact), Wilson, Agresti‑Coull, Mid‑P. Modernized OpenEPI proportion tool with graphical visualization.',
    keywords: 'confidence interval proportion, Clopper-Pearson, Wilson CI, prevalence CI, OpenEPI proportions, biostatistics proportion, Wepisia proportions',
  },
  twoByTwo: {
    path: '/biostatistics',
    title: '2×2 Table - Odds Ratio, Relative Risk, Fisher’s Exact Test | Wepisia (OpenEPI)',
    description: 'Analyze case‑control or cohort data with a 2×2 table: odds ratio, relative risk, risk difference, etiological fractions, Fisher’s exact test, corrected χ². Modernized version of the OpenEPI 2×2 table.',
    keywords: '2x2 table, odds ratio calculator, relative risk, Fisher’s exact test, chi‑square, OpenEPI 2x2, case‑control analysis, epidemiology analytics, Wepisia contingency table',
  },
  screening: {
    path: '/biostatistics',
    title: 'Diagnostic Test Evaluation - Sensitivity, Specificity, Predictive Values | Wepisia',
    description: 'Evaluate a diagnostic test: sensitivity, specificity, positive/negative predictive values, likelihood ratios, Youden index, Cohen’s Kappa. Next‑generation OpenEPI screening module.',
    keywords: 'sensitivity specificity, positive predictive value, NPV calculator, likelihood ratio, Youden index, Kappa Cohen, diagnostic test, OpenEPI screening, epidemiology screening',
  },
  doseResponse: {
    path: '/biostatistics',
    title: 'Dose‑Response - χ² Linear Trend Test | Wepisia (OpenEPI)',
    description: 'Test linear dose‑response trend with Mantel‑Haenszel χ². Multiple exposure levels, strata, 1‑degree‑of‑freedom p‑value. Modernized OpenEPI dose‑response module.',
    keywords: 'dose‑response, chi‑square trend, Mantel‑Haenszel trend, OpenEPI dose response, linear trend epidemiology, Wepisia dose response',
  },
  rByC: {
    path: '/biostatistics',
    title: 'R×C Table - Pearson χ², Cramer’s V, Likelihood Ratio | Wepisia (OpenEPI)',
    description: 'Analyze contingency tables of any size R×C: Pearson χ², likelihood ratio G², contingency coefficient, Cramer’s V. Extended OpenEPI R×C module.',
    keywords: 'R×C table, chi‑square Pearson, Cramer’s V, G², arbitrary contingency, OpenEPI RxC, association statistics, Wepisia R×C',
  },
  oneRate: {
    path: '/biostatistics',
    title: 'Single Rate Test - Incidence Rate, Exact Poisson CI | Wepisia',
    description: 'Calculate confidence intervals for an incidence rate using the Poisson distribution. Compare to a reference rate, p‑value. Person‑time module inspired by OpenEPI.',
    keywords: 'incidence rate calculator, confidence interval rate, Poisson CI, person‑time, OpenEPI rate, epidemiology incidence, Wepisia rate',
  },
  twoRates: {
    path: '/biostatistics',
    title: 'Compare Two Rates - Rate Ratio, Mantel‑Haenszel Test | Wepisia',
    description: 'Compare two incidence rates: rate ratio, rate difference, Mantel‑Haenszel χ² test, exact Poisson test. Modernized OpenEPI two‑rates module.',
    keywords: 'compare incidence rates, rate ratio, Mantel‑Haenszel rates, OpenEPI two rates, comparative epidemiology, Wepisia two rates',
  },
  meanCI: {
    path: '/biostatistics',
    title: 'Confidence Interval for a Mean - Student’s t‑distribution | Wepisia',
    description: 'Calculate the confidence interval for a mean using Student’s t‑distribution. Descriptive statistics, 90/95/99% CIs. Continuous variables module from OpenEPI.',
    keywords: 'confidence interval mean, Student t‑CI, OpenEPI mean, biostatistics mean, Wepisia mean CI',
  },
  tTest: {
    path: '/biostatistics',
    title: 'Student’s t‑test - Welch, Hartley, Compare Means | Wepisia',
    description: 'Compare two independent means with Student’s t‑test or Welch’s t‑test. Hartley’s F‑test for variance homogeneity. Modernized OpenEPI t‑test module.',
    keywords: 't‑test, Welch test, Hartley variance, compare means, OpenEPI t‑test, biostatistics comparison, Wepisia t‑test',
  },
  anova: {
    path: '/biostatistics',
    title: 'One‑Way ANOVA - F‑test, Bartlett’s Test, Group Means | Wepisia',
    description: 'Compare means of 3 or more groups with ANOVA. Full ANOVA table, F‑test, Bartlett’s test for homogeneity of variances, 90/95/99% CIs per group.',
    keywords: 'ANOVA, analysis of variance, F‑test, Bartlett test, compare multiple means, OpenEPI ANOVA, biostatistics ANOVA, Wepisia ANOVA',
  },
  sampleSize: {
    path: '/biostatistics',
    title: 'Sample Size - Proportions, Cohort, Case‑Control, Means | Wepisia',
    description: 'Calculate required sample size: for estimating a proportion (Wald), cohort/RCT study, unmatched case‑control (Kelsey, Fleiss), or detecting a mean difference. Complete OpenEPI sample size suite.',
    keywords: 'sample size calculator, power calculation, cohort sample size, case‑control sample size, RCT sample size, OpenEPI sample size, Wepisia sample size, proportion sample size',
  },
};

//  JSON‑LD generators 

function buildJsonLd(page: PageKey, lang: string) {
  const meta = PAGE_META[page];
  const baseUrl = `${SITE_URL}${meta.path}`;

  // Organization (Xcept‑Health)
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Xcept-Health',
    url: 'https://xcept-health.com',
    logo: 'https://xcept-health.com/logo.png',
    description: 'Creator of Wepisia, a modern biostatistics and epidemiology platform based on OpenEPI.',
    founder: {
      '@type': 'Person',
      name: 'F. Ariel Shadrac OUEDRAOGO',
    },
    sameAs: ['https://github.com/Xcept-health/wepisia', 'https://xcept-health.com'],
  };

  // Person (developer)
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'F. Ariel Shadrac OUEDRAOGO',
    jobTitle: 'Lead Developer & Founder',
    worksFor: {
      '@type': 'Organization',
      name: 'Xcept-Health',
    },
    url: 'https://github.com/ton-profil',
    sameAs: ['https://github.com/ton-profil', 'https://linkedin.com/in/ton-profil'],
    description: 'Developer of Wepisia, the modern evolution of OpenEPI.',
  };

  // SoftwareApplication (Wepisia)
  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Wepisia',
    alternateName: ['OpenEPI reinvented', 'OpenEPI modern', 'Wepisia OpenEPI'],
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    author: {
      '@type': 'Organization',
      name: 'Xcept-Health',
      url: 'https://xcept-health.com',
    },
    creator: {
      '@type': 'Person',
      name: 'F. Ariel Shadrac OUEDRAOGO',
    },
    inLanguage: SUPPORTED_LANGS,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    featureList: [
      'Multi‑region epidemic simulator (SIR, SEIR, SEIRD, SEIQRD)',
      'SMR calculator with 6 statistical methods',
      '2×2 table – odds ratio, relative risk, risk difference',
      'Geospatial visualization (points, clustering, heatmap)',
      'PubMed explorer with MeSH generation',
      'R code editor with WebR',
      'Multilingual: French, English, Mooré, Swahili, Wolof, Hausa',
      'Diagnostic test evaluation (sensitivity, specificity, predictive values)',
      'ANOVA, t‑test, confidence intervals',
      'Sample size: cohort, case‑control, proportions',
    ],
    screenshot: `${SITE_URL}/og/home.png`,
    isBasedOn: 'https://www.openepi.com/',
  };

  // WebSite + SearchAction
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Wepisia',
    alternateName: ['OpenEPI', 'OpenEPI modern', 'Wepisia OpenEPI', 'OpenEPI next generation'],
    url: SITE_URL,
    author: {
      '@type': 'Organization',
      name: 'Xcept-Health',
    },
    creator: {
      '@type': 'Person',
      name: 'F. Ariel Shadrac OUEDRAOGO',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/explorer?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  // BreadcrumbList (except home)
  const breadcrumb = page !== 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: lang === 'fr' ? 'Accueil' : 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: meta.title.split('|')[0].trim(),
            item: baseUrl,
          },
        ],
      }
    : null;

  // FAQ (only on home)
  const faq = page === 'home'
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Wepisia?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Wepisia is a modern, open‑source evolution of OpenEPI, the reference online tool for biostatistics and epidemiology. It includes all classic OpenEPI calculators (SMR, 2×2 tables, proportions…) and adds a multi‑region epidemic simulator (SIR/SEIR/SEIRD/SEIQRD), geospatial visualization, a PubMed explorer, and an integrated R editor. Created by Xcept‑Health, developed by F. Ariel Shadrac OUEDRAOGO.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Wepisia replace OpenEPI?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Wepisia builds on all the functionality of OpenEPI and modernises it with a multilingual interface (French, English, Mooré, Swahili, Wolof, Hausa), interactive visualisations, and additional innovative modules. It is a free, open‑source evolution.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Wepisia free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, Wepisia is completely free, open‑source (code on GitHub), and ad‑free. It works directly in your browser with no installation required.',
            },
          },
          {
            '@type': 'Question',
            name: 'Which epidemic models does Wepisia offer?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Wepisia provides SIR, SEIR, SEIRD, and SEIQRD models with multi‑region simulation, an interactive 2D/3D map, pre‑defined scenarios (COVID‑19, Ebola, seasonal flu, measles, cholera, meningitis), and fully customisable parameters.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I use the SMR calculator in Wepisia?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Go to wepisia.com/smr, enter the observed and expected deaths, choose your confidence level. Wepisia automatically computes the SMR with six statistical methods (Exact Poisson, Mid‑P, Byar, Vandenbroucke, Rothman‑Greenland, χ²) and can export a PDF report.',
            },
          },
          {
            '@type': 'Question',
            name: 'What makes Wepisia different from OpenEPI?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Wepisia retains all core calculations of OpenEPI but adds: a modern responsive interface, interactive visualisations (maps, dynamic graphs), a multi‑region epidemic simulator, geospatial clustering and heatmaps, a PubMed explorer with MeSH suggestions, an integrated R editor (WebR), and support for six languages including Mooré, Wolof, and Hausa. The code is fully open‑source under the MIT license.',
            },
          },
        ],
      }
    : null;

  return [organization, person, software, website, breadcrumb, faq].filter(Boolean);
}

//  Hreflang generation 

function buildHreflang(path: string, currentLang: string) {
  // For the current language, we still generate all alternates.
  const links = SUPPORTED_LANGS.map(lang => ({
    hreflang: lang,
    href: `${SITE_URL}/${lang === currentLang ? '' : `${lang}/`}${path.replace(/^\//, '')}`,
  }));
  return links.map(l => ({ ...l, href: `${SITE_URL}/${l.hreflang}${path}` }));
}

//  Component 

export function Seo({ page, canonicalPath, lang = 'en' }: SeoProps) {
  const meta = PAGE_META[page];
  const path = canonicalPath ?? meta.path;
  const canonical = `${SITE_URL}${lang === 'en' ? '' : `/${lang}`}${path}`;
  const ogImage = meta.ogImage ?? OG_IMAGE;
  const hreflangs = buildHreflang(path, lang);
  const jsonLds = buildJsonLd(page, lang);

  useEffect(() => {
    // Title
    document.title = meta.title;

    // Helper to upsert meta tags
    const setMeta = (selector: string, attr: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, content);
      el.setAttribute('content', content);
    };

    // Standard meta
    setMeta('meta[name="description"]', 'name', meta.description);
    setMeta('meta[name="keywords"]', 'name', meta.keywords);
    setMeta('meta[name="robots"]', 'name', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    setMeta('meta[name="author"]', 'name', 'Xcept-Health');
    setMeta('meta[name="creator"]', 'name', 'F. Ariel Shadrac OUEDRAOGO');

    // Open Graph
    setMeta('meta[property="og:type"]', 'property', 'website');
    setMeta('meta[property="og:title"]', 'property', meta.title);
    setMeta('meta[property="og:description"]', 'property', meta.description);
    setMeta('meta[property="og:url"]', 'property', canonical);
    setMeta('meta[property="og:image"]', 'property', ogImage);
    setMeta('meta[property="og:image:width"]', 'property', '1200');
    setMeta('meta[property="og:image:height"]', 'property', '630');
    setMeta('meta[property="og:site_name"]', 'property', SITE_NAME);
    setMeta('meta[property="og:locale"]', 'property', lang === 'fr' ? 'fr_FR' : lang === 'en' ? 'en_US' : lang);

    // Twitter Card
    setMeta('meta[name="twitter:card"]', 'name', 'summary_large_image');
    setMeta('meta[name="twitter:site"]', 'name', TWITTER_HANDLE);
    setMeta('meta[name="twitter:title"]', 'name', meta.title);
    setMeta('meta[name="twitter:description"]', 'name', meta.description);
    setMeta('meta[name="twitter:image"]', 'name', ogImage);

    // Canonical
    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonical);

    // Hreflang
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    hreflangs.forEach(({ hreflang, href }) => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      link.setAttribute('href', href);
      document.head.appendChild(link);
    });
    // x‑default hreflang
    const xDefault = document.createElement('link');
    xDefault.setAttribute('rel', 'alternate');
    xDefault.setAttribute('hreflang', 'x-default');
    xDefault.setAttribute('href', `${SITE_URL}${path}`);
    document.head.appendChild(xDefault);

    // JSON‑LD
    document.querySelectorAll('script[data-wepisia-jsonld]').forEach(el => el.remove());
    jsonLds.forEach((schema, i) => {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-wepisia-jsonld', String(i));
      script.textContent = JSON.stringify(schema, null, 0);
      document.head.appendChild(script);
    });

    // HTML lang attribute
    document.documentElement.setAttribute('lang', lang);

  }, [page, lang, canonical, meta, ogImage, hreflangs, jsonLds]);

  return null;
}

export default Seo;