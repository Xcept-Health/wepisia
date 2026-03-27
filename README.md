<div align="center">

```
██╗    ██╗███████╗██████╗ ██╗███████╗██╗ █████╗
██║    ██║██╔════╝██╔══██╗██║██╔════╝██║██╔══██╗
██║ █╗ ██║█████╗  ██████╔╝██║███████╗██║███████║
██║███╗██║██╔══╝  ██╔═══╝ ██║╚════██║██║██╔══██║
╚███╔███╔╝███████╗██║     ██║███████║██║██║  ██║
 ╚══╝╚══╝ ╚══════╝╚═╝     ╚═╝╚══════╝╚═╝╚═╝  ╚═╝
```

**Open Epidemiology Platform  Built for Africa**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange.svg)]()
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![OpenEpi Validated](https://img.shields.io/badge/OpenEpi-validated-green.svg)]()

*« La connaissance est comme un baobab : une seule personne ne peut l'embrasser. »*

[**Live Demo**](https://wepisia.xcept-health.com) · [**Documentation**](https://wepisia.xcept-health.com/docs) · [**Report a Bug**](https://github.com/Xcept-Health/wepisia/issues) · [**Contact**](mailto:contact@xcept-health.com)

</div>

---

## What is Wepisia?

Wepisia is a complete architectural rewrite of [OpenEpi](https://www.openepi.com), the world's reference open-source epidemiology calculator rebuilt with modern web technologies and extended with capabilities the original never had: multi-region epidemic simulation, interactive geospatial mapping, an in-browser R IDE, and multilingual support for African languages.

Everything runs **locally in the browser**. No server. No installation. No data leaves your device.

---

## Standing on Giants : a tribute to OpenEpi

> This project would not exist without the foundational work of the OpenEpi team. Their decision to release a complete, scientifically rigorous epidemiology toolkit under the MIT license made Wepisia possible. We owe them a profound debt.

**OpenEpi Creators:**
- **Andrew G. Dean**, MD, MPH
- **Kevin M. Sullivan**, PhD, MPH
- **Roger Mir**, MSc
- *and all OpenEpi contributors*

**Primary Reference:**
> Dean AG, Sullivan KM, Soe MM. *OpenEpi: Open Source Epidemiologic Statistics for Public Health*, Version 3.01. [www.OpenEpi.com](https://www.openepi.com), updated 2013/04/06.

**Peer-reviewed publication:**
> Sullivan KM, Dean AG, Mir R. OpenEpi: A Web-based Epidemiologic and Statistical Calculator for Public Health. *Public Health Reports*. 2009;124(3):471–474. [DOI: 10.1177/003335490912400320](https://doi.org/10.1177/003335490912400320)

Every statistical result in Wepisia is validated against OpenEpi v3. Where the two tools differ on edge cases (small-sample CI approximations), the difference is documented and annotated in the interface.

---

## What's New  Beyond OpenEpi

```
OpenEpi (2002)          Wepisia (2026)
─────────────────       ─────────────────────────────────────────
Static HTML/JS    →     React 18 + TypeScript + Vite
Desktop-only      →     Mobile-first, fully responsive
English-only      →     6 languages incl. Mooré, Wolof, Swahili
No simulation     →     Multi-region SIR/SEIR/SEIRD/SEIQRD engine
No mapping        →     Interactive geospatial + heatmap + clustering
No R runtime      →     Full R IDE via WebAssembly (WebR)
No literature     →     PubMed explorer with MeSH generator
No dark mode      →     System-adaptive dark/light theme
```

---

## Feature Overview

<details>
<summary><strong>Biostatistics Suite</strong> with 19 modules, OpenEpi-validated</summary>

### Diagnostic & Screening
Full replication of OpenEpi's Screening Test module:
- Sensitivity, specificity, PPV, NPV, accuracy  Wilson CIs
- LR+/LR−  Katz log method
- Diagnostic odds ratio, Cohen's Kappa, Shannon entropy reduction, bias index
- Cutoff-specific and level-specific analyses
- ROC curve with AUC (Hanley–McNeil 1982 CI)

### Contingency Tables
- **2×2**  Fisher exact, mid-P, Mantel–Haenszel, Yates correction, OR, RR, risk difference, attributable fractions (Woolf CI)
- **R×C**  Pearson χ², degrees of freedom, p-value (jStat exact), Cramér's V, expected frequencies

### Rates & Person-Time
- **One rate**  5 CI methods: mid-P exact (Miettinen 1974), Fisher (Armitage 1971), Normal (Rosner), Byar (Rothman–Boice 1979), Rothman–Greenland
- **Two rates**  Rate ratio, rate difference, Mantel–Haenszel χ², exact Poisson test

### Dose-Response
- Mantel linear trend test (χ² at 1 df)
- OR and RR per exposure level vs. reference, Woolf CIs

### Continuous Variables
- Independent t-test: Student (equal variance) + Welch (Satterthwaite df) + Hartley F-test
- One-way ANOVA with Bartlett's test for variance homogeneity
- Mean CI (Student t), median/percentile CI (binomial method)

### Sample Size & Power
- Proportions (Kelsey, Fleiss ±continuity correction)
- Cohort/RCT, unmatched case-control, mean difference

### Mortality
- SMR (Standardized Mortality Ratio)  6 methods: Exact Poisson/χ², mid-P, Byar, Vandenbroucke, Rothman–Greenland, Pearson χ²

</details>

<details>
<summary><strong>Epidemic Simulation Engine</strong></summary>

Multi-region compartmental modeling with real-time interactive visualization:

**Models**: SIR · SEIR · SEIRD · SEIQRD

**Regions**: User-configurable network. Each region has its own population, compartments, and connections. Mobility parameter drives inter-regional transmission.

**Interventions** (cumulative, multiplicative effects):
Lockdown (−60% β), Vaccination (−40% β), Distancing (−20% β), Masks (−15% β), School closures

**Visualizations**:
- 2D map (Leaflet) and 3D globe (Globe.gl) with proportional markers and mobility flows
- Epidemic curves: S, E, I, R, D compartments + Rt effective tracking
- Phase portrait (S–I space)
- Force-directed network graph with infection-rate-colored nodes

**Pre-built scenarios** (real disease parameters):
COVID-19 · Ebola (West Africa 2014) · Seasonal flu · Measles · Meningococcal meningitis · Cholera

**Comparison mode**: Side-by-side simulation with overlay curves.

</details>

<details>
<summary><strong>Geospatial Module</strong></summary>

- CSV/Excel import with automatic lat/lng column detection
- Three visualization modes: individual markers, intelligent clustering, weighted heatmap
- Multi-layer dataset management with independent per-layer settings
- Timeline animation slider for temporal datasets
- GeoJSON export
- AI-powered epidemiological analysis: cluster summary, trend detection, risk scoring (building)

</details>

<details>
<summary><strong>In-Browser R IDE (WebAssembly)</strong></summary>

A full R environment running entirely in the browser, no server, no installation.

- **Engine**: [WebR](https://docs.r-wasm.org/webr/latest/)  R compiled to WebAssembly
- **Editor**: CodeMirror 6 with R syntax highlighting, autocompletion, bracket matching, fold gutters, lint
- Multi-file tabs with context menu and auto-save
- Automatic plot capture, grid view, animation mode, PNG export
- Package management via `webr::install()`
- Interactive console with command history

</details>

<details>
<summary><strong>PubMed Explorer</strong></summary>

- Full-text search across 35M+ NCBI biomedical references
- **MeSH generator**: free-text → controlled vocabulary via PubMed's translation API
- Filters: date range, publication type, sort by relevance or date
- Favorites (up to 200) with **RIS export** (EndNode, Zotero, Mendeley)

</details>

---

## Language Support

| Language | Status | Notes |
|---|---|---|
| Français | Complete | Full UI + documentation |
| English | Complete | Full UI + documentation |
| Mooré | Experimental | Community review welcome |
| Wolof | Experimental | Community review welcome |
| Swahili | Experimental | Community review welcome |
| Haoussa | Experimental | Community review welcome |

> Wepisia is the first epidemiology platform to offer multilingual support in indigenous African languages. All translations are open to community contribution and verification by native speakers.

---

## Architecture

```
client/
├── src/
│   ├── pages/
│   │   ├── biostatistics/     # 19 statistical modules
│   │   ├── simulation/        # Epidemic simulation dashboard
│   │   ├── geospatial/        # Interactive mapping
│   │   ├── explorer/          # PubMed search
│   │   └── Workspace.tsx      # R IDE
│   ├── components/            # Shared UI components
│   ├── contexts/              # Theme, i18n
│   └── lib/                   # Utilities, notifications
```

| Concern | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Routing | Wouter |
| Charts | Chart.js + React-chartjs-2 |
| 3D Globe | Globe.gl |
| Maps | Leaflet + D3 |
| Statistics | jStat (exact distributions) |
| R runtime | WebR (WebAssembly) |
| Code editor | CodeMirror 6 |
| PDF export | jsPDF + jspdf-autotable |
| i18n | i18next |
| Animations | Framer Motion |

---

## Privacy & Data

- No data collection. No analytics. No cookies.
- All computations are local, nothing leaves the browser.
- No login required. No account. No tracking.
- HTTPS delivery. MIT licensed source code.

---

## Getting Started

```bash
git clone https://github.com/Xcept-Health/wepisia.git
cd wepisia/client
npm install
npm run dev
```

Requires Node.js 18+. No backend needed.

---

## Contributing

Contributions welcome,  biostatisticians, developers, translators, public health practitioners.

```
contact@xcept-health.com
arielshadrac@gmail.com
github.com/Xcept-Health/wepisia
```

Priority areas: language verification (Mooré, Wolof, Swahili, Haoussa), additional modules, FETP-aligned workflows.

---

## Author

**F. Ariel Shadrac Ouédraogo**
Medical student · Self-taught developer · Burkina Faso
Founder, [Xcept-Health](https://xcept-health.com) open-source medical AI for Africa

---

## License

MIT License, free to use, modify, and distribute, including commercially.

```
Copyright (c) 2026 F. Ariel Shadrac Ouédraogo / Xcept-Health
```

The statistical methodologies implemented in this software are derived from OpenEpi
(© Andrew G. Dean, Kevin M. Sullivan, Roger Mir), also MIT licensed.
Full license text in [LICENSE](./LICENSE).

---

<div align="center">

*Wepisia v0.1.0-alpha · March 2026 · Made in Burkina Faso 🇧🇫*

**"Without OpenEpi, no Wepisia. Without Wepisia, fewer tools for Africa."**

</div>