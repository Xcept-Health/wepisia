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
import { useTranslation } from 'react-i18next';

export default function DocumentationPage() {
  const { t } = useTranslation();
  
  return (
    
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

   
        {/* Main content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

          {/* INTRODUCTION */}
          <section id="introduction" className="mb-20 scroll-mt-32">
            
            <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
              {t('documentation.introduction.titleMain')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-400">{t('documentation.introduction.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-3xl">
              {t('documentation.introduction.subtitle')}
            </p>
          </section>

          {/* BIOSTATISTIQUES - All modules */}
          <section id="biostatistics" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">{t('documentation.biostatistics.sectionTitle')}</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 1. STANDARDIZED MORTALITY RATIO (SMR) */}
            <section id="standardized-mortality-ratio" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Sigma className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.standardizedMortalityRatio.title')}</h3>
                  <p className="text-slate-500">{t('documentation.standardizedMortalityRatio.description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
                    <p>{t('documentation.standardizedMortalityRatio.explanation')}</p>
                    <p className="mt-4 font-semibold">{t('documentation.standardizedMortalityRatio.formula')}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><Beaker size={16} /> {t('documentation.standardizedMortalityRatio.calculationMethods')}</h4>
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
                    <h5 className="text-sm font-bold mb-4">{t('documentation.standardizedMortalityRatio.exampleTitle')}</h5>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <div className="text-xs text-slate-500">{t('documentation.standardizedMortalityRatio.observedDeaths')}</div>
                        <div className="text-3xl font-bold">4</div>
                      </div>
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <div className="text-xs text-slate-500">{t('documentation.standardizedMortalityRatio.expectedDeaths')}</div>
                        <div className="text-3xl font-bold">3.3</div>
                      </div>
                    </div>
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex justify-between"><span>{t('documentation.standardizedMortalityRatio.smrValue')}</span><span className="font-bold">1.212</span></div>
                      <div className="flex justify-between"><span>{t('documentation.standardizedMortalityRatio.exact95CI')}</span><span className="font-mono">0.330 – 3.104</span></div>
                      <div className="flex justify-between"><span>{t('documentation.standardizedMortalityRatio.poissonPValue')}</span><span className="text-blue-600">p = 0.712</span></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-4 font-medium">{t('documentation.standardizedMortalityRatio.noSignificantDifference')}</p>
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
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.twoByTwoTable.title')}</h3>
                  <p className="text-slate-500">{t('documentation.twoByTwoTable.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <p className="text-slate-600 dark:text-slate-400">{t('documentation.twoByTwoTable.explanation')}</p>

                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h4 className="font-semibold mb-4">{t('documentation.twoByTwoTable.tableStructure')}</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div></div>
                      <div className="font-bold">{t('documentation.twoByTwoTable.diseasedPlus')}</div>
                      <div className="font-bold">{t('documentation.twoByTwoTable.nonDiseasedMinus')}</div>
                      <div className="font-bold text-left">{t('documentation.twoByTwoTable.exposedPlus')}</div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">a</div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">b</div>
                      <div className="font-bold text-left">{t('documentation.twoByTwoTable.nonExposedMinus')}</div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">c</div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">d</div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      <p>{t('documentation.twoByTwoTable.orFormula')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                  <h4 className="font-bold mb-4">{t('documentation.twoByTwoTable.example')}</h4>
                  <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                    <div></div>
                    <div className="text-xs">{t('documentation.twoByTwoTable.diseased')}</div>
                    <div className="text-xs">{t('documentation.twoByTwoTable.nonDiseased')}</div>
                    <div className="text-xs text-left font-bold">{t('documentation.twoByTwoTable.exposed')}</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">60</div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">40</div>
                    <div className="text-xs text-left font-bold">{t('documentation.twoByTwoTable.nonExposed')}</div>
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">30</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">70</div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between"><span>{t('documentation.twoByTwoTable.oddsRatio')}</span><span className="font-bold">3.50 [IC95% 1.94–6.30]</span></div>
                    <div className="flex justify-between"><span>{t('documentation.twoByTwoTable.relativeRisk')}</span><span className="font-bold">2.00 [IC95% 1.39–2.88]</span></div>
                    <div className="flex justify-between"><span>{t('documentation.twoByTwoTable.uncorrectedChiSquare')}</span><span className="text-blue-600">p &lt; 0.0001</span></div>
                    <div className="flex justify-between"><span>{t('documentation.twoByTwoTable.fishersExactTest')}</span><span className="text-blue-600">p &lt; 0.0001</span></div>
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
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.proportions.title')}</h3>
                  <p className="text-slate-500">{t('documentation.proportions.description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h4 className="font-semibold mb-4">{t('documentation.proportions.availableMethods')}</h4>
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
                  <h4 className="font-semibold mb-2">{t('documentation.proportions.useCase')}</h4>
                  <p className="text-sm">{t('documentation.proportions.useCaseDescription')}</p>
                  <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <div className="flex justify-between"><span>{t('documentation.proportions.wilson95CI')}</span><span className="font-mono">11.9% – 18.5%</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. PROPORTIONS SAMPLE */}
            <section id="proportions-sample" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Ruler className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.proportionsSample.title')}</h3>
                  <p className="text-slate-500">{t('documentation.proportionsSample.description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-slate-600">{t('documentation.proportionsSample.explanation')}</p>
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl">
                    <h4 className="font-semibold text-sm mb-3">{t('documentation.proportionsSample.inputParameters')}</h4>
                    <ul className="space-y-2 text-sm">
                      <li><strong>{t('documentation.proportionsSample.confidenceLevel')}</strong></li>
                      <li><strong>{t('documentation.proportionsSample.anticipatedProportion')}</strong></li>
                      <li><strong>{t('documentation.proportionsSample.absolutePrecision')}</strong></li>
                      <li><strong>{t('documentation.proportionsSample.finitePopulation')}</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.proportionsSample.example')}</h4>
                  <p className="text-sm">{t('documentation.proportionsSample.exampleDescription')}</p>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                    <span className="text-2xl font-bold text-blue-600">{t('documentation.proportionsSample.sampleSize')}</span>
                    <p className="text-xs text-slate-500">{t('documentation.proportionsSample.method')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. ONE RATE */}
            <section id="one-rate" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Gauge className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.oneRate.title')}</h3>
                  <p className="text-slate-500">{t('documentation.oneRate.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p className="mb-4">{t('documentation.oneRate.explanation')}</p>
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl">
                    <h4 className="font-semibold mb-2">{t('documentation.oneRate.keyFormulas')}</h4>
                    <p className="font-mono text-sm">{t('documentation.oneRate.rateFormula')}</p>
                    <p className="font-mono text-sm mt-2">{t('documentation.oneRate.ci95Formula')}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.oneRate.example')}</h4>
                  <p className="text-sm">{t('documentation.oneRate.exampleDescription')}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>{t('documentation.oneRate.incidenceRate')}</span><span className="font-bold">0.5 / 1000 personnes-années</span></div>
                    <div className="flex justify-between"><span>{t('documentation.oneRate.exact95CI')}</span><span className="font-mono">0.32 – 0.74</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 6. COMPARE TWO RATES */}
            <section id="compare-two-rates" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.compareTwoRates.title')}</h3>
                  <p className="text-slate-500">{t('documentation.compareTwoRates.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.compareTwoRates.explanation')}</p>
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl">
                    <h4 className="font-semibold mb-2">{t('documentation.compareTwoRates.producedStatistics')}</h4>
                    <ul className="list-disc list-inside text-sm">
                      <li>{t('documentation.compareTwoRates.rateRatio')}</li>
                      <li>{t('documentation.compareTwoRates.rateDifference')}</li>
                      <li>{t('documentation.compareTwoRates.mantelHaenszelChiSquare')}</li>
                      <li>{t('documentation.compareTwoRates.exactPoissonBasedTest')}</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.compareTwoRates.example')}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-slate-500">{t('documentation.compareTwoRates.group1')}</span><br />8 cas / 1250 pers-années</div>
                    <div><span className="text-slate-500">{t('documentation.compareTwoRates.group2')}</span><br />3 cas / 980 pers-années</div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between"><span>{t('documentation.compareTwoRates.rateRatioValue')}</span><span className="font-bold">2.09 [IC95% 0.55–7.88]</span></div>
                    <div className="flex justify-between"><span>{t('documentation.compareTwoRates.mantelHaenszelPValue')}</span><span className="text-blue-600">p = 0.28</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. ANOVA */}
            <section id="anova" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <BarChart3 className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.anova.title')}</h3>
                  <p className="text-slate-500">{t('documentation.anova.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.anova.explanation')}</p>
                  <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl">
                    <h4 className="font-semibold mb-3">{t('documentation.anova.moduleOutputs')}</h4>
                      <li><strong>{t('documentation.anova.anovaTable')}</strong></li>
                      <li><strong>{t('documentation.anova.fTest')}</strong></li>
                      <li><strong>{t('documentation.anova.bartlettTest')}</strong></li>
                      <li><strong>{t('documentation.anova.ciLevels')}</strong></li>
                  
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.anova.example')}</h4>
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">G1: n=12<br />m=23.4</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">G2: n=15<br />m=27.8</div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">G3: n=10<br />m=21.2</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between"><span>F(2,34)</span><span className="font-bold">4.62</span></div>
                    <div className="flex justify-between"><span>p-value</span><span className="text-blue-600">0.017</span></div>
                    <div className="flex justify-between"><span>{t('documentation.anova.bartlettP')}</span><span className="text-slate-500">p = 0.32 (variances homogènes)</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 8. T-TEST */}
            <section id="t-test" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <GraduationCap className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.tTest.title')}</h3>
                  <p className="text-slate-500">{t('documentation.tTest.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4 ">
                  <p>{t('documentation.tTest.explanation')}</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-2">{t('documentation.tTest.prerequisites')}</h4>
                    <ul className="list-disc list-inside text-sm">
                      <li>{t('documentation.tTest.independence')}</li>
                      <li>{t('documentation.tTest.normality')}</li>
                      <li>{t('documentation.tTest.hartleyFTest')}</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.tTest.example')}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-slate-500">{t('documentation.tTest.groupA')}</span><br />n=15, m=102.3, σ=8.1</div>
                    <div><span className="text-slate-500">{t('documentation.tTest.groupB')}</span><br />n=18, m=96.7, σ=7.4</div>
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between"><span>{t('documentation.tTest.difference')}</span><span className="font-bold">+5.6</span></div>
                    <div className="flex justify-between"><span>{t('documentation.tTest.studentT')}</span><span className="text-blue-600">p = 0.042</span></div>
                    <div className="flex justify-between"><span>{t('documentation.tTest.welchT')}</span><span className="text-blue-600">p = 0.045</span></div>
                    <div className="flex justify-between"><span>{t('documentation.tTest.hartleyF')}</span><span className="text-slate-500">p = 0.38 (variances égales)</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 9. MEAN CONFIDENCE INTERVAL */}
            <section id="mean-confidence-interval" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Hash className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.meanConfidenceInterval.title')}</h3>
                  <p className="text-slate-500">{t('documentation.meanConfidenceInterval.description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="mb-4">{t('documentation.meanConfidenceInterval.explanation')}</p>
                  <div className="bg-slate-50 p-4 rounded-xl dark:bg-blue-900/30">
                    <p className="font-mono text-sm">{t('documentation.meanConfidenceInterval.ciFormula')}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.meanConfidenceInterval.example')}</h4>
                  <p className="text-sm">n=25, moyenne=110, écart-type=15</p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg dark:bg-blue-900/30">
                    <div className="flex justify-between"><span>{t('documentation.meanConfidenceInterval.ci95')}</span><span className="font-mono">103.8 – 116.2</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 10. MEAN DIFFERENCE POWER */}
            <section id="mean-difference-power" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Zap className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.meanDifferencePower.title')}</h3>
                  <p className="text-slate-500">{t('documentation.meanDifferencePower.description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p>{t('documentation.meanDifferencePower.explanation')}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.meanDifferencePower.example')}</h4>
                  <p className="text-sm">Différence = 5, σ=10, n1=n2=50, α=0.05</p>
                  <div className="mt-4 text-center">
                    <span className="text-2xl font-bold text-blue-600">{t('documentation.meanDifferencePower.power')} = 0.78</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 11. MEAN DIFFERENCE SAMPLE */}
            <section id="mean-difference-sample" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Target className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.meanDifferenceSample.title')}</h3>
                  <p className="text-slate-500">{t('documentation.meanDifferenceSample.description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.meanDifferenceSample.explanation')}</p>
                  <div className="bg-slate-50 p-4 rounded-xl dark:bg-blue-900/30">
                    <h4 className="font-semibold text-sm">{t('documentation.meanDifferenceSample.parameters')}</h4>
                    <ul className="text-sm mt-2">
                      <li>{t('documentation.meanDifferenceSample.minimumDifference')}</li>
                      <li>{t('documentation.meanDifferenceSample.standardDeviation')}</li>
                      <li>{t('documentation.meanDifferenceSample.desiredPower')}</li>
                      <li>{t('documentation.meanDifferenceSample.confidenceLevel')}</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.meanDifferenceSample.example')}</h4>
                  <p className="text-sm">Δ=10, σ=15, puissance 80%, α=5%</p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center dark:bg-blue-900/30">
                    <span className="text-2xl font-bold text-blue-600">{t('documentation.meanDifferenceSample.sampleSizePerGroup')}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 12. MEDIAN PERCENTILE CI */}
            <section id="median-percentile-ci" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <LineChart className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.medianPercentileCi.title')}</h3>
                  <p className="text-slate-500">{t('documentation.medianPercentileCi.description')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p>{t('documentation.medianPercentileCi.explanation')}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.medianPercentileCi.example')}</h4>
                  <p className="text-sm">{t('documentation.medianPercentileCi.data')}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>{t('documentation.medianPercentileCi.median')}</span><span className="font-bold">34.2 mois</span></div>
                    <div className="flex justify-between"><span>{t('documentation.medianPercentileCi.ci95')}</span><span className="font-mono">28.1 – 41.7</span></div>
                  </div>
                </div>
              </div>
            </section>
          </section>

          {/* ÉTUDES CAS-TÉMOINS */}
          <section id="case-control" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">{t('documentation.caseControl.sectionTitle')}</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 13. UNMATCHED CASE-CONTROL */}
            <section id="unmatched-case-control" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Users className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.unmatchedCaseControl.title')}</h3>
                  <p className="text-slate-500">{t('documentation.unmatchedCaseControl.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.unmatchedCaseControl.explanation')}</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30 bg-blue-100 dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-3">{t('documentation.unmatchedCaseControl.outputs')}</h4>
                    <ul className="space-y-2">
                      <li><strong>{t('documentation.unmatchedCaseControl.orMantelHaenszel')}</strong></li>
                      <li><strong>{t('documentation.unmatchedCaseControl.ci95Woolf')}</strong></li>
                      <li><strong>{t('documentation.unmatchedCaseControl.chiSquareTest')}</strong></li>
                      <li><strong>{t('documentation.unmatchedCaseControl.fishersExactTest')}</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border ">
                  <h4 className="font-bold mb-3">{t('documentation.unmatchedCaseControl.example')}</h4>
                  <div className="grid grid-cols-2 gap-4 text-center mb-4 ">
                    <div className="p-3 bg-slate-100 rounded bg-blue-100 dark:bg-blue-900/30">{t('documentation.unmatchedCaseControl.exposed')}<br />45 cas / 30 témoins</div>
                    <div className="p-3 bg-slate-100 rounded bg-blue-100 dark:bg-blue-900/30">{t('documentation.unmatchedCaseControl.nonExposed')}<br />15 cas / 50 témoins</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>{t('documentation.unmatchedCaseControl.or')}</span><span className="font-bold">5.0</span></div>
                    <div className="flex justify-between"><span>{t('documentation.unmatchedCaseControl.ci95')}</span><span className="font-mono">2.4 – 10.3</span></div>
                    <div className="flex justify-between"><span>{t('documentation.unmatchedCaseControl.chiSquareP')}</span><span className="text-blue-600">&lt; 0.001</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 14. SAMPLE SIZE UNMATCHED CASE-CONTROL */}
            <section id="sample-size-unmatched-case-control" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Target className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.sampleSizeUnmatchedCaseControl.title')}</h3>
                  <p className="text-slate-500">{t('documentation.sampleSizeUnmatchedCaseControl.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.sampleSizeUnmatchedCaseControl.explanation')}</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30 bg-blue-100 dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-3">{t('documentation.sampleSizeUnmatchedCaseControl.availableMethods')}</h4>
                    <ul>
                      <li><strong>{t('documentation.sampleSizeUnmatchedCaseControl.kelsey')}</strong></li>
                      <li><strong>{t('documentation.sampleSizeUnmatchedCaseControl.fleiss')}</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.sampleSizeUnmatchedCaseControl.example')}</h4>
                  <p className="text-sm mb-4">{t('documentation.sampleSizeUnmatchedCaseControl.exposureProportionControls')}<br />{t('documentation.sampleSizeUnmatchedCaseControl.expectedOR')}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>{t('documentation.sampleSizeUnmatchedCaseControl.requiredCases')}</span><span className="font-bold">34</span></div>
                    <div className="flex justify-between"><span>{t('documentation.sampleSizeUnmatchedCaseControl.requiredControls')}</span><span className="font-bold">68</span></div>
                    <div className="flex justify-between"><span>{t('documentation.sampleSizeUnmatchedCaseControl.controlsCasesRatio')}</span><span className="font-mono">2:1</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 15. MATCHED CASE-CONTROL */}
            <section id="matched-case-control" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <GitBranch className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.matchedCaseControl.title')}</h3>
                  <p className="text-slate-500">{t('documentation.matchedCaseControl.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p>{t('documentation.matchedCaseControl.explanation')}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.matchedCaseControl.example')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-center mb-4">
                    <div></div>
                    <div className="text-xs font-bold">{t('documentation.matchedCaseControl.witnessExposed')}</div>
                    <div className="text-xs font-bold">{t('documentation.matchedCaseControl.witnessNonExposed')}</div>
                    <div className="text-xs text-left">{t('documentation.matchedCaseControl.caseExposed')}</div>
                    <div>5</div>
                    <div>20</div>
                    <div className="text-xs text-left">{t('documentation.matchedCaseControl.caseNonExposed')}</div>
                    <div>8</div>
                    <div>12</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between"><span>{t('documentation.matchedCaseControl.matchedOR')}</span><span className="font-bold">2.5</span></div>
                    <div className="flex justify-between"><span>{t('documentation.matchedCaseControl.ci95')}</span><span className="font-mono">1.1 – 5.7</span></div>
                  </div>
                </div>
              </div>
            </section>
          </section>

          {/* COHORTE & ESSAIS */}
          <section id="cohort-trials" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">{t('documentation.cohortTrials.sectionTitle')}</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 16. COHORT */}
            <section id="cohort" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Activity className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.cohort.title')}</h3>
                  <p className="text-slate-500">{t('documentation.cohort.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.cohort.explanation')}</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-3">{t('documentation.cohort.keyStatistics')}</h4>
                    <ul>
                      <li><strong>{t('documentation.cohort.rrFormula')}</strong></li>
                      <li><strong>{t('documentation.cohort.rdFormula')}</strong></li>
                      <li><strong>{t('documentation.cohort.etiologicalFractionExposed')}</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.cohort.example')}</h4>
                  <p className="text-sm">{t('documentation.cohort.exposedCasesSubjects')}<br />{t('documentation.cohort.nonExposedCasesSubjects')}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>{t('documentation.cohort.rr')}</span><span className="font-bold">2.25</span></div>
                    <div className="flex justify-between"><span>{t('documentation.cohort.ci95')}</span><span className="font-mono">1.11 – 4.57</span></div>
                    <div className="flex justify-between"><span>{t('documentation.cohort.rd')}</span><span className="font-bold">+6.9%</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 17. RCT */}
            <section id="rct" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <FlaskConical className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.rct.title')}</h3>
                  <p className="text-slate-500">{t('documentation.rct.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p>{t('documentation.rct.explanation')}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.rct.example')}</h4>
                  <p className="text-sm">{t('documentation.rct.treatmentGroup')}<br />{t('documentation.rct.controlGroup')}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between"><span>{t('documentation.rct.rr')}</span><span className="font-bold">0.50</span></div>
                    <div className="flex justify-between"><span>{t('documentation.rct.arr')}</span><span className="font-bold">7.5%</span></div>
                    <div className="flex justify-between"><span>{t('documentation.rct.nnt')}</span><span className="font-bold">14</span></div>
                  </div>
                </div>
              </div>
            </section>
          </section>

          {/* TESTS DIAGNOSTIQUES */}
          <section id="diagnostic" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">{t('documentation.diagnostic.sectionTitle')}</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 18. SCREENING */}
            <section id="screening" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Shield className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.screening.title')}</h3>
                  <p className="text-slate-500">{t('documentation.screening.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.screening.explanation')}</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30">
                    <h4 className="font-semibold mb-2">{t('documentation.screening.keyFormulas')}</h4>
                    <p className="text-sm">{t('documentation.screening.sensitivity')}</p>
                    <p className="text-sm">{t('documentation.screening.specificity')}</p>
                    <p className="text-sm">{t('documentation.screening.ppv')}</p>
                    <p className="text-sm">{t('documentation.screening.lrPlus')}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.screening.example')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-center mb-4 ">
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">{t('documentation.screening.tp')}</div>
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">{t('documentation.screening.fp')}</div>
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">{t('documentation.screening.fn')}</div>
                    <div className="p-2 bg-slate-100 dark:bg-blue-900/30">{t('documentation.screening.tn')}</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>{t('documentation.screening.sensitivityValue')}</span><span className="font-bold">85.0%</span></div>
                    <div className="flex justify-between"><span>{t('documentation.screening.specificityValue')}</span><span className="font-bold">90.0%</span></div>
                    <div className="flex justify-between"><span>{t('documentation.screening.ppvValue')}</span><span className="font-bold">89.5%</span></div>
                    <div className="flex justify-between"><span>{t('documentation.screening.npv')}</span><span className="font-bold">85.7%</span></div>
                    <div className="flex justify-between"><span>{t('documentation.screening.lrPlusValue')}</span><span className="font-bold">8.5</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 19. DOSE-RESPONSE */}
            <section id="dose-response" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.doseResponse.title')}</h3>
                  <p className="text-slate-500">{t('documentation.doseResponse.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.doseResponse.explanation')}</p>
                  <p className="text-sm text-slate-500">{t('documentation.doseResponse.multipleStrata')}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.doseResponse.example')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>{t('documentation.doseResponse.nonSmokers')}</span><span>5 cas / 95 témoins</span></div>
                    <div className="flex justify-between"><span>{t('documentation.doseResponse.1to10Cigarettes')}</span><span>12 cas / 88 témoins</span></div>
                    <div className="flex justify-between"><span>{t('documentation.doseResponse.11to20Cigarettes')}</span><span>20 cas / 80 témoins</span></div>
                    <div className="flex justify-between"><span>{t('documentation.doseResponse.20PlusCigarettes')}</span><span>30 cas / 70 témoins</span></div>
                  </div>
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between"><span>{t('documentation.doseResponse.trendChiSquare')}</span><span className="font-bold">18.4</span></div>
                    <div className="flex justify-between"><span>{t('documentation.doseResponse.pValue')}</span><span className="text-blue-600">&lt; 0.001</span></div>
                  </div>
                </div>
              </div>
            </section>

            {/* 20. R x C TABLE */}
            <section id="r-by-c" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Grid className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.rByCTable.title')}</h3>
                  <p className="text-slate-500">{t('documentation.rByCTable.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <p>{t('documentation.rByCTable.explanation')}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.rByCTable.example')}</h4>
                  <p className="text-sm mb-2">{t('documentation.rByCTable.associationBloodGroupDisease')}</p>
                  <div className="flex justify-between"><span>{t('documentation.rByCTable.chiSquare6Df')}</span><span className="font-bold">14.2</span></div>
                  <div className="flex justify-between"><span>{t('documentation.rByCTable.pValue')}</span><span className="text-blue-600">p = 0.027</span></div>
                  <div className="flex justify-between"><span>{t('documentation.rByCTable.cramersV')}</span><span className="font-bold">0.18</span></div>
                </div>
              </div>
            </section>
          </section>

          {/* AUTRES MODULES */}
          <section id="other" className="space-y-20 mb-20">
            <div className="flex items-center gap-6">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h2 className="text-2xl font-bold text-slate-400">{t('documentation.other.sectionTitle')}</h2>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* 21. RANDOM NUMBERS */}
            <section id="random-numbers" className="scroll-mt-32">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <Binary className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('documentation.randomNumbers.title')}</h3>
                  <p className="text-slate-500">{t('documentation.randomNumbers.description')}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p>{t('documentation.randomNumbers.explanation')}</p>
                  <div className="bg-slate-50 p-5 rounded-xl dark:bg-blue-900/30 ">
                    <h4 className="font-semibold mb-2">{t('documentation.randomNumbers.features')}</h4>
                    <ul>
                      <li>{t('documentation.randomNumbers.simpleRandomNumbers')}</li>
                      <li>{t('documentation.randomNumbers.randomSampling')}</li>
                      <li>{t('documentation.randomNumbers.blockRandomization')}</li>
                      <li>{t('documentation.randomNumbers.randomizationTest')}</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border">
                  <h4 className="font-bold mb-3">{t('documentation.randomNumbers.example')}</h4>
                  <p className="text-sm mb-2">{t('documentation.randomNumbers.randomization100Patients')}</p>
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
    <h2 className="text-2xl font-bold text-slate-400">{t('documentation.simulation.sectionTitle')}</h2>
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
          {t('documentation.simulation.modelingMultiRegions')}
        </h3>
        <p className="text-slate-500 mt-1">
          {t('documentation.simulation.description')}
        </p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-8">
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>{t('documentation.simulation.explanation1')}</p>
        <p className="mt-4">{t('documentation.simulation.explanation2')}</p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 ">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          {t('documentation.simulation.availableModels')}
        </h4>
        <div className="space-y-3">
          {[
            { name: 'SIR', compartments: 'S, I, R', desc: t('documentation.simulation.sir').split(' - ')[1] },
            { name: 'SEIR', compartments: 'S, E, I, R', desc: t('documentation.simulation.seir').split(' - ')[1] },
            { name: 'SEIRD', compartments: 'S, E, I, R, D', desc: t('documentation.simulation.seird').split(' - ')[1] },
            { name: 'SEIQRD', compartments: 'S, E, I, Q, R, D', desc: t('documentation.simulation.seiqrd').split(' - ')[1] }
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
      { icon: <Activity size={18} />, label: 'β (transmission)', value: '0.3', desc: t('documentation.simulation.betaTransmission').split(': ')[2] },
      { icon: <Zap size={18} />, label: 'σ (incubation)', value: '0.2', desc: t('documentation.simulation.sigmaIncubation').split(': ')[2] },
      { icon: <HeartPulse size={18} />, label: 'γ (guérison)', value: '0.1', desc: t('documentation.simulation.gammaRecovery').split(': ')[2] },
      { icon: <X size={18} />, label: 'μ (mortalité)', value: '0.01', desc: t('documentation.simulation.muMortality').split(': ')[2] },
      { icon: <GitBranch size={18} />, label: 'mobilité', value: '0.1', desc: t('documentation.simulation.mobility').split(': ')[2] }
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
      {t('documentation.simulation.fourVisualizationModes')}
    </h3>

    <div className="grid md:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <Map size={20} />
        </div>
        <h4 className="font-bold mb-2">Carte interactive</h4>
        <p className="text-xs text-slate-500 mb-2">{t('documentation.simulation.interactiveMap')}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <LineChart size={20} />
        </div>
        <h4 className="font-bold mb-2">Courbes d'évolution</h4>
        <p className="text-xs text-slate-500 mb-2">{t('documentation.simulation.evolutionCurves')}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <Network size={20} />
        </div>
        <h4 className="font-bold mb-2">Graphe dynamique</h4>
        <p className="text-xs text-slate-500 mb-2">{t('documentation.simulation.dynamicGraph')}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-3">
          <Table2 size={20} />
        </div>
        <h4 className="font-bold mb-2">Données détaillées</h4>
        <p className="text-xs text-slate-500 mb-2">{t('documentation.simulation.detailedData')}</p>
      </div>
    </div>
  </div>

  {/* Scénarios et interventions */}
  <div className="grid md:grid-cols-2 gap-8 mb-12">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
          <Layers size={20} />
        </div>
        <h4 className="text-lg font-bold">{t('documentation.simulation.preDefinedScenarios')}</h4>
      </div>
      <ul className="space-y-2">
        <li className="flex items-center gap-2">Base<span className="text-sm">{t('documentation.simulation.base').split(': ')[1]}</span></li>
        <li className="flex items-center gap-2">Confinement strict<span className="text-sm">{t('documentation.simulation.strictLockdown').split(': ')[1]}</span></li>
        <li className="flex items-center gap-2">Vaccination massive<span className="text-sm">{t('documentation.simulation.massVaccination').split(': ')[1]}</span></li>
        <li className="flex items-center gap-2">Intervention tardive<span className="text-sm">{t('documentation.simulation.lateIntervention').split(': ')[1]}</span></li>
      </ul>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
          <Shield size={20} />
        </div>
        <h4 className="text-lg font-bold">{t('documentation.simulation.interventions')}</h4>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-xs">
          <span>Confinement</span>
          <span className="font-mono">{t('documentation.simulation.lockdown').split(': ')[1]}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Vaccination</span>
          <span className="font-mono">{t('documentation.simulation.vaccination').split(': ')[1]}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Distanciation</span>
          <span className="font-mono">{t('documentation.simulation.distancing').split(': ')[1]}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Masques</span>
          <span className="font-mono">{t('documentation.simulation.masks').split(': ')[1]}</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t text-xs text-slate-400">
        {t('documentation.simulation.cumulativeInterventions')}
      </div>
    </div>
  </div>

  {/* Personnalisation avancée */}
  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 mb-12">
    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
      {t('documentation.simulation.advancedSettingsByView')}
    </h3>

    <div className="grid md:grid-cols-3 gap-6">
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><Map size={16} /> Carte</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Type :</strong> 2D (Leaflet) / 3D (Globe)</li>
          <li><strong>Thème :</strong> clair, sombre, satellite</li>
          <li><strong>Forme des marqueurs :</strong> cercle / icône</li>
          <li><strong>Opacité des lignes</strong> (mobilité)</li>
        </ul>
      </div>
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
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><Network size={16} /> Réseau</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Forme des nœuds :</strong> cercle, carré, triangle</li>
          <li><strong>Style des liens :</strong> continu / pointillé</li>
          <li><strong>Force de répulsion</strong> (charge)</li>
          <li><strong>Clustering</strong> par région</li>
        </ul>
      </div>
    </div>
  </div>

  {/* Exemple d'utilisation */}
  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
    <h3 className="text-xl font-bold mb-4">{t('documentation.simulation.usageExample')}</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
        <div>{t('documentation.simulation.step1')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
        <div>{t('documentation.simulation.step2')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
        <div>{t('documentation.simulation.step3')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">4</div>
        <div>{t('documentation.simulation.step4')}</div>
      </div>
    </div>
    <div className="mt-6 p-4  rounded-xl border">
      <p className="text-xs flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>{t('documentation.simulation.keyboardShortcuts')}</span>
      </p>
    </div>
  </div>

  <div className="mt-8 p-4 border rounded-xl">
    <p className="text-xs flex items-start gap-2">
      <Info size={14} className="shrink-0 mt-0.5" />
      <span>{t('documentation.simulation.technicalNote')}</span>
    </p>
  </div>
</section>

          {/* GÉOSPATIAL */}
<section id="geospatial" className="scroll-mt-32 mb-20">
  <div className="flex items-center gap-6 mb-12">
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <h2 className="text-2xl font-bold text-slate-400">{t('documentation.geospatial.sectionTitle')}</h2>
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  <div className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 bg-blue-600 rounded-xl text-white  ">
        <Map size={28} />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('documentation.geospatial.interactiveCartographicVisualization')}
        </h3>
        <p className="text-slate-500 mt-1">
          {t('documentation.geospatial.description')}
        </p>
      </div>
    </div>

    <div>
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>{t('documentation.geospatial.explanation1')}</p>
        <p className="mt-4">{t('documentation.geospatial.explanation2')}</p>
      </div>
    </div>
  </div>

  <div className="grid md:grid-cols-3 gap-6 mb-16">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Database size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Import de données</h4>
      <p className="text-sm text-slate-500">{t('documentation.geospatial.dataImport').split(': ')[1]}</p>
      <div className="mt-4 text-xs text-slate-400 border-t pt-3">
        <span className="font-mono">lat, latitude, y</span> • <span className="font-mono">lng, lon, x</span>
      </div>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Layers size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Multi‑calques</h4>
      <p className="text-sm text-slate-500">{t('documentation.geospatial.multiLayers').split(': ')[1]}</p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <BrainCircuit size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Analyse IA intégrée</h4>
      <p className="text-sm text-slate-500">{t('documentation.geospatial.integratedAIAnalysis').split(': ')[1]}</p>
    </div>
  </div>

  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 mb-12">
    <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
      {t('documentation.geospatial.threeVisualizationModes')}
    </h3>

    <div className="grid md:grid-cols-3 gap-8">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white"></div>
          <h4 className="font-semibold">Points individuels</h4>
        </div>
        <p className="text-sm text-slate-500 mb-3">{t('documentation.geospatial.individualPoints').split(': ')[1]}</p>
        <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
          <span className="font-bold">Paramètres :</span> {t('documentation.geospatial.pointsParameters').split(': ')[1]}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">12</div>
          <h4 className="font-semibold">Clustering</h4>
        </div>
        <p className="text-sm text-slate-500 mb-3">{t('documentation.geospatial.clustering').split(': ')[1]}</p>
        <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
          <span className="font-bold">Options :</span> {t('documentation.geospatial.clusteringOptions').split(': ')[1]}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5" style={{ background: 'linear-gradient(45deg, blue, cyan, lime, yellow, red)' }}></div>
          <h4 className="font-semibold">Heatmap</h4>
        </div>
        <p className="text-sm text-slate-500 mb-3">{t('documentation.geospatial.heatmap').split(': ')[1]}</p>
        <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
          <span className="font-bold">Réglages :</span> {t('documentation.geospatial.heatmapSettings').split(': ')[1]}
        </div>
      </div>
    </div>
  </div>

  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 mb-12">
    <h3 className="text-xl font-bold mb-6">{t('documentation.geospatial.advancedConfiguration')}</h3>
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h4 className="font-semibold mb-3">Heatmap</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Rayon</strong> – taille du point de chaleur (défaut 25)</li>
          <li><strong>Flou</strong> – adoucissement du dégradé (défaut 15)</li>
          <li><strong>Opacité minimale</strong> – transparence des zones froides</li>
          <li><strong>Dégradé personnalisable</strong></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-3">Clustering</h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Couleur du cluster</strong> et couleur du texte</li>
          <li><strong>Rayon max du cluster</strong></li>
          <li><strong>Seuil de désactivation</strong></li>
          <li><strong>Spiderfy</strong></li>
        </ul>
      </div>
    </div>
    <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <p className="text-sm flex items-center gap-2">
        <Info size={16} className="text-blue-500" />
        <span>{t('documentation.geospatial.note').split(': ')[1]}</span>
      </p>
    </div>
  </div>

  <div className="dark:bg-blue-900/3 rounded-3xl p-8 border mb-12">
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-xl font-bold">{t('documentation.geospatial.automaticAIAnalysis')}</h3>
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border">
        <div className="font-semibold mb-1">Résumé</div>
        <p className="text-xs text-slate-500">{t('documentation.geospatial.summary').split(': ')[1]}</p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border">
        <div className="font-semibold mb-1">Insights</div>
        <p className="text-xs text-slate-500">{t('documentation.geospatial.insights').split(': ')[1]}</p>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border">
        <div className="font-semibold mb-1">Alertes</div>
        <p className="text-xs text-slate-500">{t('documentation.geospatial.alerts').split(': ')[1]}</p>
      </div>
    </div>
  </div>

  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
    <h3 className="text-xl font-bold mb-4">{t('documentation.geospatial.usageExample')}</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
        <div>{t('documentation.geospatial.step1')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
        <div>{t('documentation.geospatial.step2')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
        <div>{t('documentation.geospatial.step3')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
        <div>{t('documentation.geospatial.step4')}</div>
      </div>
    </div>
  </div>
</section>

{/* Workspace */}
<section id="workspace" className="scroll-mt-32 mb-32">
  <div className="flex items-center gap-6 mb-12">
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <h2 className="text-2xl font-bold text-slate-400">{t('documentation.workspace.sectionTitle')}</h2>
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  <div className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <Terminal size={28} className="text-blue-600" />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('documentation.workspace.integratedREnvironment')}
        </h3>
        <p className="text-slate-500 mt-1">
          {t('documentation.workspace.description')}
        </p>
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-8">
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>{t('documentation.workspace.explanation1')}</p>
        <p className="mt-4">{t('documentation.workspace.explanation2')}</p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Code2 size={18} className="text-blue-500" />
          {t('documentation.workspace.executionEnvironment')}
        </h4>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-2"><span>{t('documentation.workspace.fullScriptExecution')}</span></li>
          <li className="flex items-center gap-2"><span>{t('documentation.workspace.currentLineExecution')}</span></li>
          <li className="flex items-center gap-2"><span>{t('documentation.workspace.interactiveConsole')}</span></li>
          <li className="flex items-center gap-2"><span>{t('documentation.workspace.automaticGraphCapture')}</span></li>
          <li className="flex items-center gap-2">bêta<span>{t('documentation.workspace.animationBeta')}</span></li>
          <li className="flex items-center gap-2"><span>{t('documentation.workspace.packageInstallation')}</span></li>
        </ul>
      </div>
    </div>
  </div>

  <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-16">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <FileCode2 size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Éditeur multi‑fichiers</h4>
      <p className="text-sm text-slate-500">{t('documentation.workspace.multiFileEditor').split(': ')[1]}</p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <Terminal size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Console interactive</h4>
      <p className="text-sm text-slate-500">{t('documentation.workspace.interactiveConsoleFeature').split(': ')[1]}</p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <ImageIcon size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Visualisations graphiques</h4>
      <p className="text-sm text-slate-500">{t('documentation.workspace.graphicalVisualizations').split(': ')[1]}</p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
        <Package size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Gestion des packages</h4>
      <p className="text-sm text-slate-500">{t('documentation.workspace.packageManagement').split(': ')[1]}</p>
    </div>
  </div>

  <div className="rounded-3xl p-8 border border-blue-200 dark:border-blue-800 mb-12">
    <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
      {t('documentation.workspace.advancedFeatures')}
    </h3>

    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><Film size={16} /> Animation (bêta)</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('documentation.workspace.animationBetaDetail').split(': ')[1]}</p>
        <p className="text-xs text-blue-600 flex items-center gap-1">{t('documentation.workspace.animationNote')}</p>
      </div>
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-1"><DownloadCloud size={16} /> Installation de packages</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('documentation.workspace.packageInstallationDetail').split(': ')[1]}</p>
        <p className="text-xs text-slate-500">{t('documentation.workspace.packageNote')}</p>
      </div>
    </div>
  </div>

  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-12">
    <h3 className="text-xl font-bold mb-4">{t('documentation.workspace.usageExample')}</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
        <div>{t('documentation.workspace.step1')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
        <div>{t('documentation.workspace.step2')}</div>
      </div>
      <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-xs overflow-x-auto">
{t('documentation.workspace.codeExample')}
      </pre>
      <div className="flex gap-3 mt-2">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
        <div>{t('documentation.workspace.step3')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
        <div>{t('documentation.workspace.step4')}</div>
      </div>
    </div>
  </div>
</section>

{/* Explorateur */}
<section id="explorer" className="scroll-mt-32 mb-20">
  <div className="flex items-center gap-6 mb-12">
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <h2 className="text-2xl font-bold text-slate-400">{t('documentation.explorer.sectionTitle')}</h2>
    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  <div className="mb-12">
    <div className="flex items-center gap-4 mb-6">
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <Database size={28} className="text-blue-600"  />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t('documentation.explorer.pubmedBibliographicSearch')}
        </h3>
        <p className="text-slate-500 mt-1">
          {t('documentation.explorer.description')}
        </p>
      </div>
    </div>

    <div>
      <div className="prose dark:prose-invert text-slate-600 dark:text-slate-400">
        <p>{t('documentation.explorer.explanation1')}</p>
        <p className="mt-4">{t('documentation.explorer.explanation2')}</p>
      </div>
    </div>
  </div>

  <div className="grid md:grid-cols-3 gap-6 mb-16">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Search size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Recherche avancée</h4>
      <p className="text-sm text-slate-500">{t('documentation.explorer.advancedSearch').split(': ')[1]}</p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Sparkles size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Générateur MeSH</h4>
      <p className="text-sm text-slate-500">{t('documentation.explorer.meshGenerator').split(': ')[1]}</p>
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 mb-4">
        <Bookmark size={20} />
      </div>
      <h4 className="font-bold text-lg mb-2">Favoris & export</h4>
      <p className="text-sm text-slate-500">{t('documentation.explorer.favoritesExport').split(': ')[1]}</p>
    </div>
  </div>

  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 mb-12">
    <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
      {t('documentation.explorer.twoModeInterface')}
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
          <li>• Panneau latéral de détails d'article</li>
          <li>• Graphique de distribution temporelle des résultats</li>
        </ul>
      </div>
    </div>
  </div>

  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-12">
    <h3 className="text-xl font-bold mb-4">{t('documentation.explorer.usageExample')}</h3>
    <div className="space-y-4 text-sm">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
        <div>{t('documentation.explorer.step1')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
        <div>{t('documentation.explorer.step2')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
        <div>{t('documentation.explorer.step3')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
        <div>{t('documentation.explorer.step4')}</div>
      </div>
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">5</div>
        <div>{t('documentation.explorer.step5')}</div>
      </div>
    </div>
  </div>
</section>

        
        </div>
      </div>

  );
}