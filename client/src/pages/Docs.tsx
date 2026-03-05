import { Link } from "wouter";
import { useState, useEffect } from "react";
import {
  Cpu, Map, Film, Pause,  Database, Info, Grid, Package, Play, Download, Beaker, Bookmark,
  Sigma, BarChart3, GraduationCap, Search, ImageIcon,
  Terminal, Sparkles, Layers, Table2, FileCode2, TrendingUp, Divide as DivideIcon, DownloadCloud,
  X, Users, Activity, PieChart, 
  Shield, Zap,  Target, GitBranch, 
  Gauge, LineChart, HeartPulse,  FlaskConical,
  Binary, Hash, Network, Ruler,  BrainCircuit, Code2
} from "lucide-react";

export default function DocumentationPage() {

  return (
    
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

   
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

          {/* INTRODUCTION */}
          <section id="introduction" className="mb-20 scroll-mt-32">
            
            <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
              OpenEpi : La référence <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">en épidémiologie open-source</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-3xl">
              OpenEpi est une collection d'outils statistiques pour l'épidémiologie et la santé publique. Cette documentation couvre l'intégralité des modules disponibles.
            </p>
          </section>

          {/* BIOSTATISTIQUES - All modules */}
          <section id="biostatistics" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">Biostatistiques fondamentales</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 1. STANDARDIZED MORTALITY RATIO (SMR) */}
            <section id="standardized-mortality-ratio" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Sigma className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Ratio de Mortalité Standardisé (SMR)</h3>
                  <p className="text-slate-500">Compare les décès observés aux décès attendus dans une population.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
                    <p>Le SMR est le rapport entre le nombre de décès observés (O) et le nombre de décès attendus (E) dans la population d'étude, sous l'hypothèse que les taux de mortalité sont identiques à ceux de la population générale.</p>
                    <p className="mt-4 font-semibold">Formule : <span className="font-mono text-lg">SMR = O / E</span></p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><Beaker size={16} /> Méthodes de calcul</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between"><span>IC exact (Poisson)</span><span className="font-mono text-xs">Clopper-Pearson</span></li>
                      <li className="flex justify-between"><span>IC Byar</span><span className="font-mono text-xs">Approximation de Rothman</span></li>
                      <li className="flex justify-between"><span>IC Vandenbroucke</span><span className="font-mono text-xs">Méthode alternative</span></li>
                      <li className="flex justify-between"><span>Test exact de Poisson</span><span className="font-mono text-xs">p-value bilatérale</span></li>
                    </ul>
                  </div>

                 
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="ml-auto text-[10px] text-slate-400 font-mono">smr_calculator.tsx</span>
                  </div>
                  <div className="p-6">
                    <h5 className="text-sm font-bold mb-4">Exemple concret</h5>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <div className="text-xs text-slate-500">Décès observés (O)</div>
                        <div className="text-3xl font-bold">4</div>
                      </div>
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <div className="text-xs text-slate-500">Décès attendus (E)</div>
                        <div className="text-3xl font-bold">3.3</div>
                      </div>
                    </div>
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex justify-between"><span>SMR</span><span className="font-bold">1.212</span></div>
                      <div className="flex justify-between"><span>IC 95% exact</span><span className="font-mono">0.330 – 3.104</span></div>
                      <div className="flex justify-between"><span>Test exact de Poisson</span><span className="text-blue-600">p = 0.712</span></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-4 font-medium">→ Pas de différence significative (IC inclut 1.0)</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. TWO BY TWO TABLE */}
            <section id="two-by-two" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Table2 className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Tableaux 2×2</h3>
                  <p className="text-slate-500">Évaluation de l'association entre exposition et maladie.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <p className="text-slate-600 dark:text-slate-400">Les tableaux 2×2 croisent une exposition (oui/non) avec une maladie (oui/non). Les statistiques produites incluent les tests exacts de Fisher et mid-p, les khi-carrés, l'odds ratio, le risque relatif, la différence de risques et les fractions étiologiques.</p>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h4 className="font-semibold mb-4">Structure du tableau</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div></div>
                      <div className="font-bold">Malades +</div>
                      <div className="font-bold">Non malades -</div>
                      <div className="font-bold text-left">Exposés +</div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">a</div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">b</div>
                      <div className="font-bold text-left">Non exposés -</div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">c</div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">d</div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      <p><strong>OR</strong> = (a×d) / (b×c) &nbsp; | &nbsp; <strong>RR</strong> = (a/(a+b)) / (c/(c+d))</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                  <h4 className="font-bold mb-4">Exemple</h4>
                  <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                    <div></div>
                    <div className="text-xs">Malades</div>
                    <div className="text-xs">Non malades</div>
                    <div className="text-xs text-left font-bold">Exposés</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">60</div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">40</div>
                    <div className="text-xs text-left font-bold">Non exposés</div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">30</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">70</div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between"><span>Odds Ratio (OR)</span><span className="font-bold">3.50 [IC95% 1.94–6.30]</span></div>
                    <div className="flex justify-between"><span>Risque Relatif (RR)</span><span className="font-bold">2.00 [IC95% 1.39–2.88]</span></div>
                    <div className="flex justify-between"><span>χ² (non corrigé)</span><span className="text-blue-600">p &lt; 0.0001</span></div>
                    <div className="flex justify-between"><span>Test exact de Fisher</span><span className="text-blue-600">p &lt; 0.0001</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. PROPORTIONS */}
            <section id="proportions" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <PieChart className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Proportions</h3>
                  <p className="text-slate-500">Estimation d'une proportion et de son intervalle de confiance.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h4 className="font-semibold mb-4">Méthodes disponibles</h4>
                    <ul className="grid grid-cols-2 gap-3">
                      <li className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-mono text-blue-600">•</span> Exact (Clopper-Pearson)
                        <p className="text-xs text-slate-500 mt-1">Conservateur, basé sur la distribution binomiale</p>
                      </li>
                      <li className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-mono text-blue-600">•</span> Wilson
                        <p className="text-xs text-slate-500 mt-1">Recommandé pour la plupart des situations</p>
                      </li>
                      <li className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-mono text-blue-600">•</span> Agresti-Coull
                        <p className="text-xs text-slate-500 mt-1">Amélioration de Wald</p>
                      </li>
                      <li className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-mono text-blue-600">•</span> Mid-P exact
                        <p className="text-xs text-slate-500 mt-1">Moins conservateur que Clopper-Pearson</p>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-6 border">
                  <h4 className="font-semibold mb-2">Cas d'usage</h4>
                  <p className="text-sm">Sur 500 personnes testées, 75 sont positives. Quelle est la prévalence réelle ?</p>
                  <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <div className="flex justify-between"><span>Wilson IC 95%</span><span className="font-mono">11.9% – 18.5%</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. PROPORTIONS SAMPLE (proportions_sample.tsx) */}
            <section id="proportions-sample" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Ruler className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Taille d'échantillon pour une proportion</h3>
                  <p className="text-slate-500">Calcule la taille d'échantillon nécessaire pour estimer une proportion.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-slate-600">Ce module détermine le nombre de sujets requis pour estimer une proportion avec une précision donnée.</p>
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl">
                    <h4 className="font-semibold text-sm mb-3">Paramètres d'entrée</h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>• Niveau de confiance</strong> (90%, 95%, 99%)</li>
                      <li><strong>• Proportion anticipée</strong> (p)</li>
                      <li><strong>• Précision absolue</strong> (marge d'erreur)</li>
                      <li><strong>• Population finie</strong> (optionnel)</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">Pour estimer une prévalence de 20% avec une précision de ±3% et un niveau de confiance de 95% :</p>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                    <span className="text-2xl font-bold text-blue-600">n = 683</span>
                    <p className="text-xs text-slate-500">(méthode de Wald avec correction)</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. ONE RATE (one_rate.tsx) */}
            <section id="one-rate" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Gauge className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Test d'un taux</h3>
                  <p className="text-slate-500">Inférence sur un taux d'incidence ou de mortalité.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p className="mb-4">Compare un taux observé à un taux de référence ou calcule son intervalle de confiance. Utilise la distribution de Poisson pour les événements rares.</p>
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl">
                    <h4 className="font-semibold mb-2">Formules clés</h4>
                    <p className="font-mono text-sm">Taux = Nombre d'événements / Personnes-temps</p>
                    <p className="font-mono text-sm mt-2">IC 95% = Taux × [χ²(α/2, 2O)/2O , χ²(1-α/2, 2O+2)/2O]</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">Dans une cohorte de 10 000 personnes-suivies pendant 5 ans, on observe 25 cas.</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>Taux d'incidence</span><span className="font-bold">0.5 / 1000 personnes-années</span></div>
                    <div className="flex justify-between"><span>IC 95% (exact)</span><span className="font-mono">0.32 – 0.74</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. COMPARE TWO RATES (compare_two_rates.tsx) */}
            <section id="compare-two-rates" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Comparaison de deux taux</h3>
                  <p className="text-slate-500">Test de l'égalité de deux taux d'incidence.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Compare deux taux basés sur des données de personnes-temps. Calcule le rapport des taux (rate ratio) et la différence des taux avec leurs intervalles de confiance, ainsi que le test de Mantel-Haenszel.</p>
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl">
                    <h4 className="font-semibold mb-2">Statistiques produites</h4>
                    <ul className="list-disc list-inside text-sm">
                      <li>Rapport des taux (RR) + IC</li>
                      <li>Différence des taux + IC</li>
                      <li>Test du χ² de Mantel-Haenszel</li>
                      <li>Test exact basé sur Poisson</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-slate-500">Groupe 1</span><br />8 cas / 1250 pers-années</div>
                    <div><span className="text-slate-500">Groupe 2</span><br />3 cas / 980 pers-années</div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between"><span>Rate ratio</span><span className="font-bold">2.09 [IC95% 0.55–7.88]</span></div>
                    <div className="flex justify-between"><span>p-value (Mantel-Haenszel)</span><span className="text-blue-600">p = 0.28</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. ANOVA (anova.tsx) */}
            <section id="anova" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <BarChart3 className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">ANOVA à un facteur</h3>
                  <p className="text-slate-500">Comparaison des moyennes de trois groupes ou plus.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>L'ANOVA (Analysis of Variance) teste l'hypothèse nulle que les moyennes de plusieurs groupes sont égales. Elle décompose la variance totale en variance inter-groupes et intra-groupes .</p>
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl">
                    <h4 className="font-semibold mb-3">Sorties du module</h4>
                      <li><strong>Tableau ANOVA</strong> : Somme des carrés, degrés de liberté, carrés moyens</li>
                      <li><strong>Test F</strong> : statistique et p-value</li>
                      <li><strong>Test de Bartlett</strong> : homogénéité des variances</li>
                      <li><strong>IC 90/95/99%</strong> pour chaque moyenne</li>
                  
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">G1: n=12<br />m=23.4</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">G2: n=15<br />m=27.8</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">G3: n=10<br />m=21.2</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between"><span>F(2,34)</span><span className="font-bold">4.62</span></div>
                    <div className="flex justify-between"><span>p-value</span><span className="text-blue-600">0.017</span></div>
                    <div className="flex justify-between"><span>Bartlett</span><span className="text-slate-500">p = 0.32 (variances homogènes)</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 8. T-TEST (t_test.tsx) */}
            <section id="t-test" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <GraduationCap className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Test t de Student</h3>
                  <p className="text-slate-500">Comparaison de deux moyennes (échantillons indépendants).</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4 ">
                  <p>Le test t compare les moyennes de deux groupes indépendants. Deux versions sont proposées : test t de Student (variances égales) et test t de Welch (variances inégales) .</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30 dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-2">Pré-requis</h4>
                    <ul className="list-disc list-inside text-sm">
                      <li>Indépendance des observations</li>
                      <li>Normalité des distributions (approximative)</li>
                      <li>Test F de Hartley pour comparer les variances</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-slate-500">Groupe A</span><br />n=15, m=102.3, σ=8.1</div>
                    <div><span className="text-slate-500">Groupe B</span><br />n=18, m=96.7, σ=7.4</div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between"><span>Différence</span><span className="font-bold">+5.6</span></div>
                    <div className="flex justify-between"><span>t de Student</span><span className="text-blue-600">p = 0.042</span></div>
                    <div className="flex justify-between"><span>t de Welch</span><span className="text-blue-600">p = 0.045</span></div>
                    <div className="flex justify-between"><span>F de Hartley</span><span className="text-slate-500">p = 0.38 (variances égales)</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 9. MEAN CONFIDENCE INTERVAL (mean_confidence_interval.tsx) */}
            <section id="mean-confidence-interval" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Hash className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Intervalle de confiance d'une moyenne</h3>
                  <p className="text-slate-500">Estimation de la moyenne d'une population à partir d'un échantillon.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="mb-4">Calcule l'intervalle de confiance pour une moyenne à partir des statistiques descriptives de l'échantillon (n, moyenne, écart-type). Utilise la distribution t de Student.</p>
                  <div className="bg-slate-50 p-4 rounded-xl dark:bg-blue-900/30">
                    <p className="font-mono text-sm ">IC = m ± t(α/2, n-1) × (σ/√n)</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">n=25, moyenne=110, écart-type=15</p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg dark:bg-blue-900/30">
                    <div className="flex justify-between"><span>IC 95%</span><span className="font-mono">103.8 – 116.2</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 10. MEAN DIFFERENCE POWER (mean_difference_power.tsx) */}
            <section id="mean-difference-power" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Zap className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Puissance pour une différence de moyennes</h3>
                  <p className="text-slate-500">Calcule la puissance d'un test de comparaison de moyennes.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p>La puissance est la probabilité de rejeter l'hypothèse nulle lorsqu'elle est fausse. Ce module la calcule à partir des tailles d'échantillon, de la différence attendue et de la variabilité.</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">Différence = 5, σ=10, n1=n2=50, α=0.05</p>
                  <div className="mt-4 text-center">
                    <span className="text-2xl font-bold text-blue-600">Puissance = 0.78</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 11. MEAN DIFFERENCE SAMPLE (mean_difference_sample.tsx) */}
            <section id="mean-difference-sample" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Target className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Taille d'échantillon pour différence de moyennes</h3>
                  <p className="text-slate-500">Détermine le nombre de sujets nécessaires.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Calcule la taille d'échantillon requise pour détecter une différence donnée entre deux moyennes, avec une puissance et un niveau de confiance spécifiés.</p>
                  <div className="bg-slate-50 p-4 rounded-xl dark:bg-blue-900/30">
                    <h4 className="font-semibold text-sm">Paramètres</h4>
                    <ul className="text-sm mt-2">
                      <li>• Différence minimale à détecter (Δ)</li>
                      <li>• Écart-type (σ) — commun ou différent</li>
                      <li>• Puissance désirée (80%, 90%)</li>
                      <li>• Niveau de confiance (α)</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">Δ=10, σ=15, puissance 80%, α=5%</p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center dark:bg-blue-900/30">
                    <span className="text-2xl font-bold text-blue-600">n = 36 par groupe</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 12. MEDIAN PERCENTILE CI (median_percentile_ci.tsx) */}
            <section id="median-percentile-ci" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <LineChart className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Intervalle de confiance de la médiane et percentiles</h3>
                  <p className="text-slate-500">Estimation non-paramétrique pour les distributions non-normales.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p>Calcule les intervalles de confiance pour la médiane et les percentiles (25e, 75e, etc.) en utilisant la méthode binomiale ou basée sur les rangs .</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">Données : temps de survie (mois)</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>Médiane</span><span className="font-bold">34.2 mois</span></div>
                    <div className="flex justify-between"><span>IC 95%</span><span className="font-mono">28.1 – 41.7</span></div>
                  </div>
                </div>
              </div>
            </section>
          </section>

          {/* ÉTUDES CAS-TÉMOINS */}
          <section id="case-control" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">Études cas-témoins</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 13. UNMATCHED CASE-CONTROL (unmatched_case.tsx) */}
            <section id="unmatched-case-control" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Users className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Analyse cas-témoins non appariés</h3>
                  <p className="text-slate-500">Analyse de l'association exposition-maladie dans les études cas-témoins.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Ce module analyse les données d'une étude cas-témoins non appariée. Il calcule l'odds ratio (OR), son intervalle de confiance à 95% et effectue le test du χ² de Mantel-Haenszel pour tester l'association.</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30 bg-blue-100 dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-3">Sorties</h4>
                    <ul className="space-y-2">
                      <li><strong>OR</strong> (Mantel-Haenszel, maximum de vraisemblance)</li>
                      <li><strong>IC 95%</strong> (Woolf, exact)</li>
                      <li><strong>Test χ²</strong> (Mantel-Haenszel, corrigé)</li>
                      <li><strong>Test exact de Fisher</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border ">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <div className="grid grid-cols-2 gap-4 text-center mb-4 ">
                    <div className="p-3 bg-slate-100 rounded bg-blue-100 dark:bg-blue-900/30">Exposés<br />45 cas / 30 témoins</div>
                    <div className="p-3 bg-slate-100 rounded bg-blue-100 dark:bg-blue-900/30">Non-exposés<br />15 cas / 50 témoins</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>OR</span><span className="font-bold">5.0</span></div>
                    <div className="flex justify-between"><span>IC 95%</span><span className="font-mono">2.4 – 10.3</span></div>
                    <div className="flex justify-between"><span>p (χ²)</span><span className="text-blue-600">&lt; 0.001</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 14. SAMPLE SIZE UNMATCHED CASE-CONTROL (sample_size_unmatched_case_control.tsx) */}
            <section id="sample-size-unmatched-case-control" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Target className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Taille d'échantillon (cas-témoins non appariés)</h3>
                  <p className="text-slate-500">Calcule le nombre de cas et de témoins nécessaires.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Ce module calcule la taille d'échantillon pour une étude cas-témoins non appariée. Les utilisateurs entrent le niveau de confiance souhaité, la puissance, la proportion d'exposition chez les témoins, et soit un odds ratio soit la proportion d'exposition chez les cas.</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30 bg-blue-100 dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-3">Méthodes disponibles</h4>
                    <ul>
                      <li><strong>Kelsey</strong> — méthode classique</li>
                      <li><strong>Fleiss</strong> — avec/sans correction de continuité</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple d'utilisation </h4>
                  <p className="text-sm mb-4">Proportion d'exposition chez témoins : 59.3%<br />OR attendu : 4.85</p>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Cas nécessaires</span><span className="font-bold">34</span></div>
                    <div className="flex justify-between"><span>Témoins nécessaires</span><span className="font-bold">68</span></div>
                    <div className="flex justify-between"><span>Ratio témoins/cas</span><span className="font-mono">2:1</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 15. MATCHED CASE-CONTROL (matched_case_control) */}
            <section id="matched-case-control" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <GitBranch className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Analyse cas-témoins appariés</h3>
                  <p className="text-slate-500">Analyse de données appariées (1:1, 1:n, M:N).</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p>Pour les études cas-témoins appariées, ce module calcule l'odds ratio de Mantel-Haenszel, l'intervalle de confiance et le test de McNemar. Il gère les appariements 1:1, 1:n et M:N .</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple (appariement 1:1)</h4>
                  <div className="grid grid-cols-2 gap-2 text-center mb-4">
                    <div></div>
                    <div className="text-xs font-bold">Témoin exposé</div>
                    <div className="text-xs font-bold">Témoin non-exposé</div>
                    <div className="text-xs text-left">Cas exposé</div>
                    <div>5</div>
                    <div>20</div>
                    <div className="text-xs text-left">Cas non-exposé</div>
                    <div>8</div>
                    <div>12</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between"><span>OR apparié</span><span className="font-bold">2.5</span></div>
                    <div className="flex justify-between"><span>IC 95%</span><span className="font-mono">1.1 – 5.7</span></div>
                  </div>
                </div>
              </div>
            </section>
          </section>

          {/* COHORTE & ESSAIS */}
          <section id="cohort-trials" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">Cohorte & Essais randomisés</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 16. COHORT (cohort_.tsx) */}
            <section id="cohort" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Activity className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Analyse d'étude de cohorte</h3>
                  <p className="text-slate-500">Calcul du risque relatif, de la différence de risques et des fractions attribuables.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Dans les études de cohorte, on suit des groupes exposés et non-exposés dans le temps. Ce module calcule le risque relatif (RR), la différence de risques (RD), et les fractions étiologiques chez les exposés et dans la population.</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-3">Statistiques clés</h4>
                    <ul>
                      <li><strong>RR</strong> = (a/(a+b)) / (c/(c+d))</li>
                      <li><strong>RD</strong> = (a/(a+b)) - (c/(c+d))</li>
                      <li><strong>Fraction étiologique (exposés)</strong> = (RR-1)/RR</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">Exposés : 25 cas / 200 sujets<br />Non-exposés : 10 cas / 180 sujets</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>RR</span><span className="font-bold">2.25</span></div>
                    <div className="flex justify-between"><span>IC 95%</span><span className="font-mono">1.11 – 4.57</span></div>
                    <div className="flex justify-between"><span>RD</span><span className="font-bold">+6.9%</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 17. RCT (rct.tsx) */}
            <section id="rct" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <FlaskConical className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Essai randomisé contrôlé (RCT)</h3>
                  <p className="text-slate-500">Analyse spécifique aux essais cliniques randomisés.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p>Module dédié aux essais randomisés. Calcule le risque relatif, la réduction absolue du risque (RAR), le nombre nécessaire à traiter (NNT), et les intervalles de confiance correspondants.</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm">Groupe traitement : 15 événements / 200<br />Groupe contrôle : 30 événements / 200</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>RR</span><span className="font-bold">0.50</span></div>
                    <div className="flex justify-between"><span>RAR</span><span className="font-bold">7.5%</span></div>
                    <div className="flex justify-between"><span>NNT</span><span className="font-bold">14</span></div>
                  </div>
                </div>
              </div>
            </section>
          </section>

          {/* TESTS DIAGNOSTIQUES */}
          <section id="diagnostic" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">Tests diagnostiques & dépistage</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 18. SCREENING (screening.tsx) */}
            <section id="screening" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Shield className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Évaluation d'un test diagnostique</h3>
                  <p className="text-slate-500">Sensibilité, spécificité, valeurs prédictives, rapports de vraisemblance.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Ce module évalue la performance d'un test diagnostique par rapport à un gold standard. Il calcule la sensibilité, la spécificité, les valeurs prédictives positives et négatives, les rapports de vraisemblance, l'indice de Youden, et le coefficient Kappa de Cohen .</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-2">Formules clés</h4>
                    <p className="text-sm">Sensibilité = VP / (VP + FN)</p>
                    <p className="text-sm">Spécificité = VN / (VN + FP)</p>
                    <p className="text-sm">VPP = VP / (VP + FP)</p>
                    <p className="text-sm">RV+ = sensibilité / (1 - spécificité)</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <div className="grid grid-cols-2 gap-2 text-center mb-4 ">
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">VP=85</div>
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">FP=10</div>
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">FN=15</div>
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">VN=90</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Sensibilité</span><span className="font-bold">85.0%</span></div>
                    <div className="flex justify-between"><span>Spécificité</span><span className="font-bold">90.0%</span></div>
                    <div className="flex justify-between"><span>VPP</span><span className="font-bold">89.5%</span></div>
                    <div className="flex justify-between"><span>VPN</span><span className="font-bold">85.7%</span></div>
                    <div className="flex justify-between"><span>RV+</span><span className="font-bold">8.5</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 19. DOSE-RESPONSE (dose_response.tsx) */}
            <section id="dose-response" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Dose-réponse (χ² de tendance)</h3>
                  <p className="text-slate-500">Test de tendance linéaire pour plus de deux niveaux d'exposition.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Ce module effectue le test du χ² de tendance linéaire de Mantel-Haenszel pour des données avec plus de deux niveaux d'exposition (par exemple, doses croissantes). Il calcule la p-value à 1 degré de liberté pour tester l'hypothèse d'une relation linéaire entre l'exposition et le risque.</p>
                  <p className="text-sm text-slate-500">Plusieurs strates peuvent être entrées pour contrôler les facteurs de confusion.</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple (cigarette et malformations)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Non-fumeurs</span><span>5 cas / 95 témoins</span></div>
                    <div className="flex justify-between"><span>1-10 cigarettes</span><span>12 cas / 88 témoins</span></div>
                    <div className="flex justify-between"><span>11-20 cigarettes</span><span>20 cas / 80 témoins</span></div>
                    <div className="flex justify-between"><span>20+ cigarettes</span><span>30 cas / 70 témoins</span></div>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between"><span>χ² tendance</span><span className="font-bold">18.4</span></div>
                    <div className="flex justify-between"><span>p-value</span><span className="text-blue-600">&lt; 0.001</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 20. R x C TABLE (r_by_c.tsx) */}
            <section id="r-by-c" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Grid className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Tableau R x C</h3>
                  <p className="text-slate-500">Analyse de tables de contingence de taille quelconque.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p>Ce module généralise l'analyse des tableaux 2×2 à des tableaux de dimension R (lignes) × C (colonnes). Il calcule le χ² de Pearson, le rapport de vraisemblance (G²), le coefficient de contingence, et la V de Cramer. Il peut également analyser plusieurs strates .</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm mb-2">Association entre groupe sanguin et maladie (3 groupes × 4 phénotypes)</p>
                  <div className="flex justify-between"><span>χ² (6 ddl)</span><span className="font-bold">14.2</span></div>
                  <div className="flex justify-between"><span>p-value</span><span className="text-blue-600">p = 0.027</span></div>
                  <div className="flex justify-between"><span>V de Cramer</span><span className="font-bold">0.18</span></div>
                </div>
              </div>
            </section>
          </section>

          {/* AUTRES MODULES */}
          <section id="other" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">Autres modules</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 21. RANDOM NUMBERS (random_numbers.tsx) */}
            <section id="random-numbers" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Binary className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Générateur de nombres aléatoires</h3>
                  <p className="text-slate-500">Génération de nombres aléatoires pour la randomisation et les simulations.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>Ce module génère des nombres aléatoires selon différentes distributions : uniforme, normale, binomiale, Poisson. Il peut également générer des séquences pour la randomisation d'essais cliniques (blocs permutés).</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30 ">
                    <h4 className="font-semibold mb-2">Fonctionnalités</h4>
                    <ul>
                      <li>• Nombres aléatoires simples</li>
                      <li>• Échantillonnage aléatoire</li>
                      <li>• Randomisation par blocs</li>
                      <li>• Test de randomisation</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">Exemple</h4>
                  <p className="text-sm mb-2">Randomisation de 100 patients en 2 groupes (1:1) :</p>
                  <div className="font-mono text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded">
                    A B B A A B A B B A ...
                  </div>
                </div>
              </div>
            </section>
          </section>

{/* Simulation */}
<section id="simulation" className="scroll-mt-32 mb-20">
  <div className="flex items-center gap-6 mb-12">
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <h2 className="text-2xl font-bold text-slate-400">Simulation Épidémiologique</h2>
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  {/* Introduction */}
  <div className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <Cpu size={28} className="text-blue-600" />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Modélisation multi‑régions
        </h3>
        <p className="text-slate-500 mt-1">
          Simulez la propagation d’une maladie infectieuse entre régions interconnectées, avec des modèles compartimentaux et des interventions.
        </p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-8">
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>
          Ce module permet de simuler l’évolution d’une épidémie sur un réseau de régions (ex. pays, départements). 
          Chaque région possède sa propre population et ses propres compartiments (S, E, I, R, D, Q selon le modèle choisi). 
          Les régions sont reliées par des connexions qui modélisent les flux de population (mobilité), influençant la dynamique inter‑régionale.
        </p>
        <p className="mt-4">
          Les calculs utilisent des équations différentielles ordinaires (ODE) en temps discret. 
          L’utilisateur peut ajuster les paramètres épidémiologiques, ajouter des interventions (confinement, vaccination) et observer l’impact en temps réel sur une carte interactive, des graphiques, ou un réseau dynamique.
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 ">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          Modèles disponibles
        </h4>
        <div className="space-y-3">
          {[
            { name: 'SIR', compartments: 'S, I, R', desc: 'Modèle de base sans période d’incubation' },
            { name: 'SEIR', compartments: 'S, E, I, R', desc: 'Ajoute une phase d’exposition (E)' },
            { name: 'SEIRD', compartments: 'S, E, I, R, D', desc: 'Inclut la mortalité (D)' },
            { name: 'SEIQRD', compartments: 'S, E, I, Q, R, D', desc: 'Ajoute une quarantaine (Q)' }
          ].map(m => (
            <div key={m.name} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
             {m.name}
              <span className="text-xs text-slate-500 font-mono">{m.compartments}</span>
              <span className="text-xs text-slate-400 ml-auto">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>

  {/* Paramètres clés */}
  <div className="grid md:grid-cols-5 gap-4 mb-16">
    {[
      { icon: <Activity size={18} />, label: 'β (transmission)', value: '0.3', desc: 'taux de contact infectieux' },
      { icon: <Zap size={18} />, label: 'σ (incubation)', value: '0.2', desc: 'taux de passage E → I' },
      { icon: <HeartPulse size={18} />, label: 'γ (guérison)', value: '0.1', desc: 'taux de guérison' },
      { icon: <X size={18} />, label: 'μ (mortalité)', value: '0.01', desc: 'taux de décès' },
      { icon: <GitBranch size={18} />, label: 'mobilité', value: '0.1', desc: 'influence inter‑régions' }
    ].map((p, idx) => (
      <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5  ">
        <div className="flex items-center gap-2 text-indigo-600 mb-2">
          {p.icon}
          <span className="text-xs font-bold uppercase tracking-wider">{p.label}</span>
        </div>
        <div className="text-2xl font-bold font-mono text-slate-800 dark:text-white">{p.value}</div>
        <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
      </div>
    ))}
  </div>

  {/* Visualisations */}
  <div className=" rounded-3xl p-8 border mb-12">
    <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
     
      Quatre modes de visualisation
    </h3>

    <div className="grid md:grid-cols-4 gap-6">
      {/* Carte 2D/3D */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <Map size={20} />
        </div>
        <h4 className="font-bold mb-2">Carte interactive</h4>
        <p className="text-xs text-slate-500 mb-2">2D (Leaflet) ou 3D (Globe) avec marqueurs proportionnels à la population et flux de mobilité.</p>
       
      </div>

      {/* Graphiques */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <LineChart size={20} />
        </div>
        <h4 className="font-bold mb-2">Courbes d’évolution</h4>
        <p className="text-xs text-slate-500 mb-2">Suivi des compartiments S, E, I, R, D dans le temps. Possibilité de comparer deux simulations.</p>
       
      </div>

      {/* Réseau */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <Network size={20} />
        </div>
        <h4 className="font-bold mb-2">Graphe dynamique</h4>
        <p className="text-xs text-slate-500 mb-2">Visualisation en forces dirigées, avec nœuds colorés selon le taux d’infection, liens pondérés par la mobilité.</p>
       
      </div>

      {/* Tableau */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <Table2 size={20} />
        </div>
        <h4 className="font-bold mb-2">Données détaillées</h4>
        <p className="text-xs text-slate-500 mb-2">Liste complète des régions avec leurs effectifs par compartiment et taux d’infection.</p>
        
      </div>
    </div>
  </div>

  {/* Scénarios et interventions */}
  <div className="grid md:grid-cols-2 gap-8 mb-12">
    {/* Scénarios pré‑définis */}
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
          <Layers size={20} />
        </div>
        <h4 className="text-lg font-bold">Scénarios pré‑enregistrés</h4>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Quatre configurations types pour démarrer rapidement :
      </p>
      <ul className="space-y-2">
        <li className="flex items-center gap-2">Base<span className="text-sm">paramètres par défaut (R₀=2.5)</span></li>
        <li className="flex items-center gap-2">Confinement strict<span className="text-sm">réduction de la mobilité à 5%</span></li>
        <li className="flex items-center gap-2">Vaccination massive<span className="text-sm">β réduit, efficacité 40% à J30</span></li>
        <li className="flex items-center gap-2">Intervention tardive<span className="text-sm">confinement à J50, R₀=3.0</span></li>
      </ul>
    </div>

    {/* Interventions personnalisées */}
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
          <Shield size={20} />
        </div>
        <h4 className="text-lg font-bold">Interventions</h4>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Ajoutez des mesures à des jours précis, réduisant le taux de transmission β.
      </p>
      <div className="space-y-3">
        <div className="flex justify-between text-xs">
          <span>Confinement</span>
          <span className="font-mono">‑60% β</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Vaccination</span>
          <span className="font-mono">‑40% β</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Distanciation</span>
          <span className="font-mono">‑20% β</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Masques</span>
          <span className="font-mono">‑15% β</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t text-xs text-slate-400">
        Plusieurs interventions peuvent se cumuler (effet multiplicatif).
      </div>
    </div>
  </div>

  {/* Personnalisation avancée */}
  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 mb-12">
    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">

      Réglages avancés par vue
    </h3>

    <div className="grid md:grid-cols-3 gap-6">
      {/* Carte */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><Map size={16} /> Carte</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Type :</strong> 2D (Leaflet) / 3D (Globe)</li>
          <li><strong>Thème :</strong> clair, sombre, satellite</li>
          <li><strong>Forme des marqueurs :</strong> cercle / icône</li>
          <li><strong>Opacité des lignes</strong> (mobilité)</li>
        </ul>
      </div>
      {/* Graphiques */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><LineChart size={16} /> Graphiques</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Style des lignes :</strong> continue / pointillée</li>
          <li><strong>Épaisseur</strong> réglable</li>
          <li><strong>Opacité de remplissage</strong> sous les courbes</li>
          <li><strong>Grille</strong> affichable/masquable</li>
          <li><strong>Annotations</strong> pour interventions</li>
        </ul>
      </div>
      {/* Réseau */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><Network size={16} /> Réseau</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Forme des nœuds :</strong> cercle, carré, triangle</li>
          <li><strong>Style des liens :</strong> continu / pointillé</li>
          <li><strong>Force de répulsion</strong> (charge)</li>
          <li><strong>Clustering</strong> par région (basé sur l’attribut <span className="font-mono">cluster</span>)</li>
        </ul>
      </div>
    </div>
  </div>

  {/* Exemple d’utilisation */}
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
    <h3 className="text-xl font-bold mb-4">Exemple d’utilisation</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
        <div>Sélectionnez un <strong>modèle</strong> (SEIRD par défaut) et un <strong>scénario</strong> (Base).</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
        <div>Cliquez sur <strong>Démarrer</strong> pour lancer la simulation. Observez l’évolution sur la carte et les graphiques.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
        <div>Ajoutez une <strong>intervention</strong> (confinement) via le bouton dédié pour voir son impact sur la courbe des infectés.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">4</div>
        <div>Passez en <strong>mode comparaison</strong> pour simuler un scénario alternatif avec des paramètres différents et comparer les courbes.</div>
      </div>
    </div>
    <div className="mt-6 p-4  rounded-xl border">
      <p className="text-xs flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          <strong>Raccourcis clavier (mode carte 3D) :</strong> flèches pour tourner le globe, <span className="font-mono">R</span> pour recentrer, <span className="font-mono">2</span>/<span className="font-mono">3</span> pour changer de projection.
        </span>
      </p>
    </div>
  </div>


  {/* Note technique */}
  <div className="mt-8 p-4 border rounded-xl">
    <p className="text-xs flex items-start gap-2">
      <Info size={14} className="shrink-0 mt-0.5" />
      <span>
        <strong>Note :</strong> La simulation utilise un pas de temps discret de 1 jour. Les équations sont basées sur les modèles compartimentaux standards. La mobilité inter‑régions est modélisée par un terme de diffusion proportionnel à la différence de prévalence.
      </span>
    </p>
  </div>
</section>

          {/* GÉOSPATIAL  */}

<section id="geospatial" className="scroll-mt-32 mb-20">
  <div className="flex items-center gap-6 mb-12">
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <h2 className="text-2xl font-bold text-slate-400">Module Géospatial</h2>
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  {/* Introduction */}
  <div className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 bg-blue-600 rounded-xl text-white  ">
        <Map size={28} />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Visualisation cartographique interactive
        </h3>
        <p className="text-slate-500 mt-1">
          Basé sur Leaflet et react-leaflet – explorez vos données épidémiologiques sur des cartes dynamiques.
        </p>
      </div>
    </div>

    <div>
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>
          Le module géospatial permet de charger, visualiser et analyser des données géoréférencées (points, incidents, taux d’incidence…). 
          Il offre trois modes de représentation complémentaires : 
          <strong> marqueurs individuels</strong>, <strong>clustering</strong> pour les grands volumes, et <strong>heatmap</strong> (carte de chaleur) pour visualiser les densités.
        </p>
        <p className="mt-4">
          Les données peuvent être importées depuis des fichiers CSV ou Excel, ou via des exemples intégrés (épidémies historiques, données continentales). 
          Une analyse IA intégrée fournit automatiquement des résumés, des tendances et des alertes.
        </p>
      </div>
      
    </div>
  </div>

  {/* Fonctionnalités principales */}
  <div className="grid md:grid-cols-3 gap-6 mb-16">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Database size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Import de données</h4>
      <p className="text-sm text-slate-500">
        Glissez-déposez ou sélectionnez vos fichiers. Détection automatique des colonnes de latitude/longitude et de la valeur d’intensité.
      </p>
      <div className="mt-4 text-xs text-slate-400 border-t pt-3">
        <span className="font-mono">lat, latitude, y</span> • <span className="font-mono">lng, lon, x</span>
      </div>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Layers size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Multi‑calques</h4>
      <p className="text-sm text-slate-500">
        Chaque dataset est un calque indépendant. Affichez/masquez, changez la couleur, le rayon ou l’opacité de chaque série.
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <BrainCircuit size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Analyse IA intégrée</h4>
      <p className="text-sm text-slate-500">
        Générez automatiquement un résumé, des tendances, des recommandations et des alertes de risque à partir des données visibles.
      </p>
    </div>
  </div>

  {/* Modes de visualisation */}
  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 mb-12">
    <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
      Trois modes de visualisation
    </h3>

    <div className="grid md:grid-cols-3 gap-8">
      {/* Mode Points */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white "></div>
          <h4 className="font-semibold">Points individuels</h4>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Chaque donnée est représentée par un cercle dont la taille et la couleur varient selon l’intensité (ex: nombre de cas). 
          Idéal pour les petits jeux de données.
        </p>
        <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
          <span className="font-bold">Paramètres :</span> rayon global, opacité, couleur par dataset
        </div>
      </div>

      {/* Mode Clustering */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">12</div>
          <h4 className="font-semibold">Clustering</h4>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Regroupe automatiquement les points proches en clusters dont la taille indique le nombre d’éléments. 
          Recommandé pour plus de 500 points.
        </p>
        <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
          <span className="font-bold">Options :</span> couleur du cluster, rayon max, seuil de désactivation au zoom
        </div>
      </div>

      {/* Mode Heatmap */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5" style={{ background: 'linear-gradient(45deg, blue, cyan, lime, yellow, red)' }}></div>
          <h4 className="font-semibold">Heatmap (carte de chaleur)</h4>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Visualise la densité de points pondérée par l’intensité. Idéal pour identifier des clusters ou des zones à risque.
        </p>
        <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
          <span className="font-bold">Réglages :</span> rayon, flou, dégradé de couleurs, opacité minimale
        </div>
      </div>
    </div>
  </div>


  {/* Configuration avancée */}
  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 mb-12">
    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">

      Configuration avancée
    </h3>
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h4 className="font-semibold mb-3">Heatmap</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Rayon</strong> – taille du point de chaleur (défaut 25)</li>
          <li><strong>Flou</strong> – adoucissement du dégradé (défaut 15)</li>
          <li><strong>Opacité minimale</strong> – transparence des zones froides</li>
          <li><strong>Dégradé personnalisable</strong> – ex: 0.4 → bleu, 1.0 → rouge</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Clustering</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Couleur du cluster</strong> et couleur du texte</li>
          <li><strong>Rayon max du cluster</strong> (distance de regroupement)</li>
          <li><strong>Seuil de désactivation</strong> – à partir de quel zoom les clusters s’affichent en points individuels</li>
          <li><strong>Spiderfy</strong> – disposition en araignée au zoom maximal</li>
        </ul>
      </div>
    </div>
    <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <p className="text-sm flex items-center gap-2">
        <Info size={16} className="text-blue-500" />
        <span>Chaque dataset conserve ses propres réglages de visibilité, clustering, heatmap, couleur, rayon et opacité. Les paramètres globaux servent de valeur par défaut.</span>
      </p>
    </div>
  </div>

  {/* Analyse IA */}
  <div className=" dark:bg-blue-900/3 rounded-3xl p-8 border mb-12">
    <div className="flex items-center gap-3 mb-4">

      <h3 className="text-xl font-bold">Analyse automatique par IA</h3>
    </div>
    <p className="text-slate-600 dark:text-slate-300 mb-6">
      En un clic, le module exécute une analyse des données visibles et produit :
    </p>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border ">
        <div className="font-semibold mb-1">Résumé</div>
        <p className="text-xs text-slate-500">Description des clusters, corrélations, tendances globales</p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border ">
        <div className="font-semibold mb-1">Insights</div>
        <p className="text-xs text-slate-500">Faits marquants : zone à risque, augmentation, sous‑déclaration</p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border ">
        <div className="font-semibold mb-1">Alertes</div>
        <p className="text-xs text-slate-500">Niveau de risque (bas / modéré / élevé) et points d’attention</p>
      </div>
    </div>
  </div>

  {/* Exemple d’utilisation */}
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
    <h3 className="text-xl font-bold mb-4">Exemple d’utilisation</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
        <div>Chargez un fichier CSV contenant des colonnes <span className="font-mono">latitude</span>, <span className="font-mono">longitude</span> et <span className="font-mono">cas</span>.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
        <div>Activez le <strong>clustering</strong> pour visualiser la répartition globale, puis passez en <strong>heatmap</strong> pour identifier les hotspots.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
        <div>Dans le panneau de configuration, ajustez la couleur du dataset, le rayon des points et l’opacité.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
        <div>Cliquez sur <strong>Analyser</strong> pour obtenir un rapport IA avec niveau de risque et recommandations.</div>
      </div>
    </div>
    
  </div>


</section>

{/* Worspace */}
<section id="workspace" className="scroll-mt-32 mb-32">
  <div className="flex items-center gap-6 mb-12">
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <h2 className="text-2xl font-bold text-slate-400">Espace de travail</h2>
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  <div className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <Terminal size={28} className="text-blue-600" />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Environnement R intégré
        </h3>
        <p className="text-slate-500 mt-1">
          Exécutez du code R directement dans votre navigateur.
        </p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-8">
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>
          L’espace de travail embarque un moteur R complet basé sur WebR (portage de R en WebAssembly).
          Vous pouvez créer, ouvrir et sauvegarder plusieurs scripts <code>.R</code>, exécuter tout le code
          ou seulement une ligne, et visualiser immédiatement les résultats dans la console ou sous forme de graphiques.
        </p>
        <p className="mt-4">
          Les fonctionnalités suivantes sont disponibles :
          exécution de scripts, gestion des fichiers, console interactive, capture de graphiques, téléchargement
          des images, installation de packages courants (<code>ggplot2</code>, <code>dplyr</code>, …). 
          Certaines parties (animation avancée, support complet de tous les packages) sont encore en cours
          d’amélioration et signalées comme bêta.
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 ">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Code2 size={18} className="text-blue-500" />
          Environnement d’exécution
        </h4>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-2">
           
            <span>Exécution complète du script (<code>Ctrl+Shift+Enter</code>)</span>
          </li>
          <li className="flex items-center gap-2">
           
            <span>Exécution de la ligne courante (<code>Ctrl+Enter</code>)</span>
          </li>
          <li className="flex items-center gap-2">
           
            <span>Console interactive avec historique</span>
          </li>
          <li className="flex items-center gap-2">
           
            <span>Capture automatique des graphiques (PNG)</span>
          </li>
          <li className="flex items-center gap-2">
            bêta
            <span>Animation de séquences d’images</span>
          </li>
          <li className="flex items-center gap-2">
           
            <span>Installation de packages via <code>webr::install()</code></span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  {/* Grille des fonctionnalités clés */}
  <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-16">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <FileCode2 size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Éditeur multi‑fichiers</h4>
      <p className="text-sm text-slate-500">
        Onglets pour gérer plusieurs scripts simultanément. Renommez, dupliquez, supprimez
        via un menu contextuel. Sauvegarde automatique dans le navigateur (localStorage).
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <Terminal size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Console interactive</h4>
      <p className="text-sm text-slate-500">
        Saisissez des commandes R en direct, naviguez dans l’historique avec les flèches,
        visualisez les sorties texte et les graphiques dans la même zone.
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <ImageIcon size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Visualisations graphiques</h4>
      <p className="text-sm text-slate-500">
        Tous les graphiques générés par R sont automatiquement capturés et affichés.
        Mode grille, mode animation, téléchargement individuel et agrandissement plein écran.
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <Package size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Gestion des packages</h4>
      <p className="text-sm text-slate-500">
        Installez des packages depuis le dépôt webR (ex: <code>ggplot2</code>, <code>dplyr</code>, <code>KernSmooth</code>)
        via le champ dédié dans l’en-tête ou directement avec <code>webr::install()</code>.
      </p>
    </div>
  </div>

  <div className=" rounded-3xl p-8 border border-blue-200 dark:border-blue-800 mb-12">
    <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
      Fonctionnalités avancées
    </h3>

    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><Film size={16} /> Animation (bêta)</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Si votre script produit plusieurs graphiques (ex: dans une boucle), vous pouvez les visualiser
          en mode grille ou lancer une animation. Le bouton <span className="inline-flex p-1 bg-indigo-100 dark:bg-indigo-900/30 rounded"><Pause size={12} /></span> permet
          de lire/pause l’animation. La navigation manuelle est aussi possible.
        </p>
        <p className="text-xs text-blue-600 flex items-center gap-1">
         l’animation fonctionne pour les séquences pré‑générées, mais la lecture en continu de graphiques dynamiques est encore en optimisation.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><DownloadCloud size={16} /> Installation de packages</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          WebR permet d’installer des packages pré‑compilés pour WebAssembly. Dans l’en‑tête, un champ dédié
          vous permet d’installer rapidement un package (ex: <code>ggplot2</code>). Les logs d’installation
          s’affichent dans la console.
        </p>
        <p className="text-xs text-slate-500">
          Les packages nécessitant des dépendances système ou une compilation native peuvent ne pas être disponibles.
        </p>
      </div>
    </div>
  </div>

  {/* Exemple d’utilisation */}
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-12">
    <h3 className="text-xl font-bold mb-4">Exemple d’utilisation</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
        <div>Créez un nouveau script (onglet <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">script1.R</span>).</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
        <div>Écrivez du code R, par exemple :</div>
      </div>
      <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-xs overflow-x-auto">
{`# Courbe épidémique mobile
x <- seq(-5, 10, length.out = 200)
for (i in 1:40) {
  mu <- i / 8
  y <- dnorm(x, mean = mu, sd = 1.5)
  plot(x, y, type="n", ylim=c(0, 0.3), axes=FALSE)
  polygon(c(x, rev(x)), c(y, rep(0, 200)), col="#3b82f622", border=NA)
  lines(x, y, col="#3b82f6", lwd=3)
  Sys.sleep(0.04)
}`}
      </pre>
      <div className="flex gap-3 mt-2">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
        <div>Cliquez sur le bouton <span className="inline-flex items-center gap-1 bg-indigo-600 text-white px-2 py-1 rounded text-xs"><Play size={12} /> Lancer</span> pour exécuter tout le script. Vous verrez apparaître une animation dans la console.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
        <div>Utilisez les flèches de navigation ou le bouton <span className="inline-flex p-1 bg-indigo-100 rounded"><Film size={12} /></span> pour contrôler l’animation. Exportez une image en cliquant sur l’icône <Download size={12} />.</div>
      </div>
    </div>
  </div>

</section>

{/* Explorateur*/}
<section id="explorer" className="scroll-mt-32 mb-20">
  <div className="flex items-center gap-6 mb-12">
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <h2 className="text-2xl font-bold text-slate-400">Explorateur</h2>
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  {/* Introduction */}
  <div className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <Database size={28} className="text-blue-600"  />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Recherche bibliographique PubMed
        </h3>
        <p className="text-slate-500 mt-1">
          Accédez directement à plus de 35 millions de références biomédicales depuis votre espace de travail.
        </p>
      </div>
    </div>

    <div>
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>
          L'explorateur intègre une interface complète vers la base de données <strong>PubMed</strong> (NCBI). 
          Vous pouvez effectuer des recherches par mots‑clés, filtrer par année et type de publication, 
          trier par pertinence ou date, et consulter les résumés détaillés.
        </p>
        <p className="mt-4">
          Une fonctionnalité unique de <strong>génération de requêtes MeSH</strong> utilise la traduction automatique de 
          PubMed pour enrichir vos termes de recherche avec les descripteurs MeSH appropriés. 
          Les articles peuvent être sauvegardés localement (favoris) et exportés au format RIS pour vos logiciels de gestion bibliographique.
        </p>
      </div>
     
    </div>
  </div>

  {/* Fonctionnalités principales */}
  <div className="grid md:grid-cols-3 gap-6 mb-16">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Search size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Recherche avancée</h4>
      <p className="text-sm text-slate-500">
        Mots‑clés, filtres par période (ex: 2010‑2025), types d'articles (revue, essai clinique, méta‑analyse…), 
        tri par pertinence ou date de publication.
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Sparkles size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Générateur MeSH</h4>
      <p className="text-sm text-slate-500">
        À partir d'une expression libre, récupérez la traduction MeSH proposée par PubMed, 
        incluant des termes contrôlés et des tags de champ (ex: <span className="font-mono">"[PTYP]"</span>).
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6  ">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Bookmark size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Favoris & export</h4>
      <p className="text-sm text-slate-500">
        Sauvegardez localement jusqu'à 200 articles. Exportez une page de résultats ou l'ensemble des favoris 
        au format RIS (compatible EndNote, Zotero, Mendeley).
      </p>
    </div>
  </div>

  {/* Détails de l'interface */}
  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 mb-12">
    <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
      Interface en deux modes
    </h3>

    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h4 className="font-semibold mb-3">Accueil</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li>• Barre de recherche avec filtre</li>
          <li>• Accès direct aux favoris depuis le lien en bas</li>
          <li>• Affichage des suggestions MeSH dans un panneau distinct</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Résultats</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li>• Bascule rapide entre recherche et favoris</li>
          <li>• Panneau latéral de détails d'article (résumé, auteurs, DOI, PMID)</li>
          <li>• Graphique de distribution temporelle des résultats</li>
        </ul>
      </div>
    </div>
  </div>

  {/* Exemple d'utilisation */}
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-12">
    <h3 className="text-xl font-bold mb-4">Exemple d’utilisation</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
        <div>Dans le mode centré, tapez <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">covid-19 vaccine</span>.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
        <div>Cliquez sur <strong>Générer MeSH</strong> pour obtenir une requête optimisée (ex: <span className="font-mono text-xs">"COVID-19 Vaccines"[Mesh]</span>). Appliquez‑la.</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
        <div>Affinez avec les filtres : période 2020‑2025, type "Revue".</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
        <div>Parcourez les résultats, cliquez sur un article pour voir le détail. Ajoutez‑le aux favoris (icône signet).</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">5</div>
        <div>Basculez sur l'onglet <strong>Favoris</strong>, puis <strong>Exporter tout</strong> pour générer un fichier RIS.</div>
      </div>
    </div>
   
  </div>


</section>


        
        </div>
      </div>

  );
}