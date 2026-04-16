import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

//  Routes
const routes = [
  '/',
  '/about',
  '/docs',
  '/tools',
  '/help',
  '/settings',
  '/simulation/dashboard',
  '/geospatial/map',
  '/explorer/search',
  '/workspace',
  '/biostatistics/std_mortality_ratio',
  '/biostatistics/proportions',
  '/biostatistics/r_by_c',
  '/biostatistics/screening',
  '/biostatistics/dose-response',
  '/biostatistics/two_by_two',
  '/biostatistics/one_rate',
  '/biostatistics/compare_two_rates',
  '/biostatistics/mean_confidence_interval',
  '/biostatistics/median_percentile_ci',
  '/biostatistics/t_test',
  '/biostatistics/anova',
  '/biostatistics/proportions_sample',
  '/biostatistics/cohort_rct',
  '/biostatistics/unmatched_case',
  '/biostatistics/mean_difference_sample',
  '/biostatistics/mean_difference_power',
  '/biostatistics/random_numbers',
];

// Supported languages for hreflang 
const LANGS = ['en', 'fr', 'mos', 'sw', 'wo', 'ha'];
const BASE_URL = 'https://wepisia.com';

const today = new Date().toISOString().slice(0, 10);

//  Priorité par route 
function getPriority(route) {
  if (route === '/') return '1.0';
  if (route.includes('simulation')) return '0.95';
  if (route.includes('geospatial')) return '0.90';
  if (route.includes('explorer')) return '0.85';
  if (route.includes('workspace')) return '0.80';
  if (route.includes('biostatistics')) {
    if (route.includes('std_mortality_ratio') || route.includes('two_by_two')) return '0.85';
    if (route.includes('proportions_sample') || route.includes('screening') || route.includes('cohort_rct') || route.includes('unmatched_case') || route.includes('proportions')) return '0.80';
    if (route.includes('dose-response') || route.includes('r_by_c') || route.includes('one_rate') || route.includes('compare_two_rates') || route.includes('mean_difference')) return '0.75';
    return '0.70';
  }
  if (route === '/docs') return '0.80';
  if (route === '/about') return '0.60';
  if (route === '/help') return '0.50';
  if (route === '/settings') return '0.40';
  return '0.70';
}

//  Update frequency
function getChangefreq(route) {
  if (route === '/') return 'weekly';
  if (route.includes('explorer')) return 'weekly';
  if (route === '/settings') return 'yearly';
  return 'monthly';
}

//  Open Graphe images
function getImage(route) {
  const images = {
    '/': { loc: `${BASE_URL}/og/home.png`, title: 'Wepisia – OpenEPI reinvented' },
    '/simulation/dashboard': { loc: `${BASE_URL}/og/simulation.png`, title: 'Epidemic simulator – SIR/SEIR/SEIRD/SEIQRD' },
    '/geospatial/map': { loc: `${BASE_URL}/og/geospatial.png`, title: 'Epidemiological Geospatial Visualization' },
    '/explorer/search': { loc: `${BASE_URL}/og/explorer.png`, title: 'PubMed Explorer – Wepisia' },
    '/workspace': { loc: `${BASE_URL}/og/workspace.png`, title: 'Online R Editor – WebR' },
    '/docs': { loc: `${BASE_URL}/og/documentation.png`, title: 'Wepisia Documentation' },
  };
  return images[route] ?? null;
}

//  Hreflang ?lang
const HREFLANG_ROUTES = new Set([
  '/',
  '/simulation/dashboard',
  '/geospatial/map',
  '/explorer/search',
  '/workspace',
  '/docs',
  '/biostatistics/std_mortality_ratio',
  '/biostatistics/two_by_two',
  '/biostatistics/proportions',
  '/biostatistics/screening',
]);

function buildHreflang(route) {
  if (!HREFLANG_ROUTES.has(route)) return '';
  const sep = route.includes('?') ? '&' : '?';
  const lines = LANGS.map(
    lang => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${BASE_URL}${route}${sep}lang=${lang}"/>`
  );
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${route}"/>`);
  return lines.join('\n');
}

//  Sitemap XML generation
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${routes.map(route => {
  const loc       = `${BASE_URL}${route}`;
  const priority  = getPriority(route);
  const changefreq = getChangefreq(route);
  const img       = getImage(route);
  const hreflang  = buildHreflang(route);

  const imageBlock = img
    ? `    <image:image>\n      <image:loc>${img.loc}</image:loc>\n      <image:title>${img.title}</image:title>\n    </image:image>`
    : '';

  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflang ? hreflang + '\n' : ''}${imageBlock ? imageBlock + '\n' : ''}  </url>`;
}).join('\n')}

</urlset>`;

// Write sitemap to public directory
const outputPath = path.resolve(__dirname, '../client/public/sitemap.xml');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sitemap, 'utf-8');
