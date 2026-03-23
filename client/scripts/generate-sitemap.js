import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


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

const today = new Date().toISOString().slice(0, 10);


function getPriority(route) {
  if (route === '/') return '1.0';
  if (route.includes('simulation')) return '0.95';
  if (route.includes('geospatial')) return '0.90';
  if (route.includes('explorer')) return '0.85';
  if (route.includes('workspace')) return '0.80';
  if (route.includes('biostatistics')) {
    if (route.includes('std_mortality_ratio') || route.includes('two_by_two')) return '0.85';
    if (route.includes('proportions') || route.includes('screening') || route.includes('proportions_sample') || route.includes('cohort_rct') || route.includes('unmatched_case')) return '0.80';
    if (route.includes('dose-response') || route.includes('r_by_c') || route.includes('one_rate') || route.includes('compare_two_rates') || route.includes('mean_difference_sample') || route.includes('mean_difference_power')) return '0.75';
    return '0.70';
  }
  if (route === '/docs') return '0.8';
  if (route === '/about') return '0.6';
  if (route === '/help') return '0.5';
  if (route === '/settings') return '0.4';
  return '0.7';
}

function getChangefreq(route) {
  if (route === '/') return 'weekly';
  if (route.includes('explorer')) return 'weekly';
  if (route === '/settings') return 'yearly';
  return 'monthly';
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${routes.map(route => {
  const loc = `https://wepisia.com${route}`;
  const priority = getPriority(route);
  const changefreq = getChangefreq(route);
  let image = '';
  if (route === '/') {
    image = `    <image:image>
      <image:loc>https://wepisia.com/og/home.png</image:loc>
      <image:title>Wepisia – OpenEPI reinvented</image:title>
    </image:image>`;
  }
  if (route === '/simulation/dashboard') {
    image = `    <image:image>
      <image:loc>https://wepisia.com/og/simulation.png</image:loc>
      <image:title>Epidemic simulator – SIR/SEIR/SEIRD/SEIQRD</image:title>
    </image:image>`;
  }

  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${image ? image + '\n' : ''}  </url>`;
}).join('\n')}

</urlset>`;

const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, sitemap);
