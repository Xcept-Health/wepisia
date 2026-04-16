# Contributing to Wepisia

Thank you for your interest in Wepisia. This document explains how to contribute effectively  whether you are a biostatistician, a developer, a public health practitioner, or a native speaker of one of the supported African languages.

Wepisia is a rewrite of OpenEpi extended for the African context. Every contribution, however small, helps make rigorous epidemiological tools more accessible on the continent.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Statistical Validation](#statistical-validation)
  - [Language & Translation](#language--translation)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Setting Up the Development Environment](#setting-up-the-development-environment)
- [Project Structure](#project-structure)
- [Coding Conventions](#coding-conventions)
- [Testing Your Changes](#testing-your-changes)
- [Documentation](#documentation)
- [Review Process](#review-process)

---

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a respectful, inclusive environment across languages, disciplines, and backgrounds. By participating, you agree to uphold it.

---

## How Can I Contribute?

### Reporting Bugs

Before opening an issue, search existing issues to avoid duplicates. When reporting a bug, provide:

1. A **clear and descriptive title**.
2. **Step-by-step instructions** to reproduce the problem.
3. The **expected behavior** and what you observed instead.
4. Your **environment**: browser name and version, OS, screen size if relevant.
5. If the bug is statistical: the **input values**, the **result you obtained**, and the **expected result** (with reference if possible  OpenEpi, a textbook, a paper).
6. Screenshots, console errors, or network logs if applicable.

> Statistical bugs are treated as high-priority. If a computation differs from OpenEpi v3 on a non-edge case without documented justification, that is a bug.

### Suggesting Enhancements

Open an issue with:

- A **descriptive title**.
- A **clear description** of the proposed functionality and why it matters.
- **Use cases**: who benefits, in what workflow.
- **References**: if proposing a new statistical method, cite the primary publication and, if possible, an existing implementation.
- Whether the request is aligned with the project's scope: OpenEpi parity, African public health context, FETP-style workflows, or offline-first access.

### Statistical Validation

Wepisia validates every result against OpenEpi v3. You can contribute by:

- Cross-checking existing modules against OpenEpi, STATA, R, or published tables and reporting discrepancies as bugs.
- Verifying edge cases: zero counts, single observations, extreme proportions, near-singular inputs.
- Proposing or implementing additional CI methods for existing modules with primary bibliographic references.
- Reviewing the documented deviations from OpenEpi (small-sample CI approximations) and assessing their scientific justification.

If you identify a discrepancy, open an issue with the **module name**, **inputs**, **Wepisia output**, **reference output**, and the **source of the reference**.

### Language & Translation

Wepisia is the first epidemiology platform to support Mooré, Wolof, Swahili, and Haoussa alongside French and English. All four African languages are currently experimental and need community review.

Translation files are located in `client/src/i18n/locales/`. Each file is a structured JSON keyed against the English source (`en.json`).

**Convention**: Standard statistical and epidemiological terms (sensitivity, specificity, p-value, odds ratio, SMR, etc.) are preserved in their original scientific form and are not translated. This convention aligns with WHO and CDC terminology standards and is applied consistently across all locale files.

To contribute a translation:

1. Open the locale file for your language (e.g., `wo.json` for Wolof).
2. Translate the values, leaving standard technical terms untouched.
3. If you are a native speaker, focus on natural phrasing  do not translate mechanically from French or English.
4. Submit a pull request with a note on your familiarity with the language.

For a new language not yet in the project, open an issue first to discuss scope before starting work.

### Submitting a Pull Request

1. **Fork** the repository and create a branch from `main` with a descriptive name following these conventions:
   - `feature/add-mantel-haenszel-stratified`
   - `fix/welch-df-rounding`
   - `i18n/wolof-biostatistics-section`
   - `refactor/geospatial-layer-manager`

2. **Implement** your changes following the coding conventions described below.

3. **Validate** statistical results if your change touches any computation. Compare against OpenEpi v3 or a documented primary reference.

4. **Test** your changes across browsers (Chromium and Firefox at minimum).

5. **Document** your changes: update JSDoc comments, update the inline annotation if a deviation from OpenEpi is introduced, and update the README if a new module or language is added.

6. **Push** your branch and open a pull request against `main`.

7. In the PR description:
   - Explain what changed and why.
   - If statistical: list the methods affected, the reference used, and test inputs/outputs.
   - If UI: include a before/after screenshot.
   - Link any related issue (e.g., `Closes #45`).

---

## Setting Up the Development Environment

**Requirements**: Node.js 18+. No backend. No database.

```bash
git clone https://github.com/your-username/wepisia.git
cd wepisia/client
npm install
npm run dev
```

The application runs entirely in the browser. All statistical computations, the WebR runtime, and PubMed queries are client-side.

**Available scripts**:

```bash
npm run dev        # Development server with HMR
npm run build      # Production build
npm run preview    # Preview the production build locally
npm run lint       # ESLint
npm run type-check # TypeScript type checking without emit
```

---

## Project Structure

```
client/
├── src/
│   ├── pages/
│   │   ├── biostatistics/     # 19 statistical modules (OpenEpi-validated)
│   │   ├── simulation/        # SIR/SEIR/SEIRD/SEIQRD epidemic engine
│   │   ├── geospatial/        # Leaflet-based mapping and clustering
│   │   ├── explorer/          # PubMed search (Xplorer component)
│   │   └── Workspace.tsx      # In-browser R IDE (WebR/WebAssembly)
│   ├── components/            # Shared UI components
│   ├── contexts/              # ThemeContext (light/dark/system), i18n
│   ├── i18n/
│   │   └── locales/           # en.json, fr.json, wo.json, mos.json, sw.json, ha.json
│   └── lib/                   # Statistical utilities, notifications, helpers
```

Each statistical module in `pages/biostatistics/` is self-contained. New modules follow the same file structure as existing ones.

---

## Coding Conventions

### TypeScript

- Strict mode is enabled. All types must be explicit; `any` is not accepted without a documented justification.
- Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, and utility types.
- Export types separately from implementation with `export type`.

### React

- Functional components only. No class components.
- State logic that exceeds a few lines belongs in a custom hook (`useXxx`).
- Do not bypass the theming system. All colors must reference CSS custom properties (e.g., `var(--color-primary)`) or Tailwind v4 tokens that resolve to them. No hardcoded hex values in component code.
- The dark mode toggle is managed by `ThemeContext`. Do not implement local dark mode logic.

### CSS / Tailwind

- The project uses Tailwind CSS v4 with oklch color tokens.
- Theme palettes (Sahara, Kilimanjaro, Yennenga, Béhanzin) are defined as CSS variables in the global stylesheet. Do not redefine palette colors locally.
- The `.dark` class is applied at the root element. Scoped dark variants must follow this convention.
- Avoid inline `style` attributes for anything that belongs in the theme system.

### Statistical Modules

Every statistical function must:

- Have a JSDoc comment citing the **primary bibliographic reference** for the method (author, publication, year, equation number if applicable).
- Return typed result objects, not raw primitives.
- Handle edge cases explicitly (zero cells, undefined degrees of freedom, etc.) and return a documented sentinel or error state rather than `NaN` or `Infinity` silently.
- Be validated against OpenEpi v3. If the result intentionally differs, include an inline comment explaining the deviation and its justification.

### i18n

- All user-facing strings must go through `react-i18next`. No hardcoded French or English strings in JSX.
- Standard epidemiological and statistical terms are not translated (see [Language & Translation](#language--translation)).
- Translation keys use dot-notation namespacing by section: `biostatistics.contingency.oddsRatio`, `simulation.parameters.beta`.

### Naming

| Context | Convention | Example |
|---|---|---|
| Components | PascalCase | `ContingencyTable.tsx` |
| Hooks | camelCase with `use` prefix | `useTheme.ts` |
| Utilities | camelCase | `computeWilsonCI.ts` |
| CSS variables | kebab-case | `--color-sahara-500` |
| i18n keys | camelCase segments | `biostatistics.screening.sensitivity` |

### Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
feat(biostatistics): add SMR Vandenbroucke method
fix(geospatial): correct heatmap layer ordering on mobile
i18n(wolof): complete biostatistics section
refactor(xplorer): bridge internal theme to CSS variable tokens
docs: update architecture diagram in README
```

---

## Testing Your Changes

Wepisia does not yet have an automated test suite for statistical modules. Until one is in place, validation is manual and must be documented in the PR.

**For statistical changes**, include in your PR a validation table:

| Input | Expected (OpenEpi / Reference) | Wepisia output | Match |
|---|---|---|---|
| … | … | … | Yes / Documented deviation |

Test at minimum on:
- Chrome/Chromium (latest)
- Firefox (latest)
- A mobile viewport (375px width)

For WebR-related changes, test with and without an active internet connection (the R runtime must degrade gracefully offline).

---

## Documentation

- **JSDoc**: all exported functions and components require JSDoc with a description, typed `@param` and `@returns`, and `@see` for bibliographic references on statistical methods.
- **README**: update the feature table if you add a new module or language.
- **Inline deviations**: any result that intentionally differs from OpenEpi v3 must be annotated with a comment in the source and noted in the interface tooltip where relevant.
- **CHANGELOG**: add an entry under `[Unreleased]` following [Keep a Changelog](https://keepachangelog.com/) conventions.

---

## Review Process

Pull requests are reviewed by the maintainer. The review will focus on:

1. **Statistical correctness**  validated results, cited references, edge case handling.
2. **Type safety**  no `any`, no implicit `undefined` propagation.
3. **Theme compliance**  no hardcoded colors, no local dark mode bypasses.
4. **i18n completeness**  no strings left outside the translation system.
5. **Code clarity**  readable logic, appropriate abstractions, documented deviations.

Feedback will be specific. If changes are requested, address each comment and push to the same branch. Do not open a new PR for the same feature.

Maintainer contact: [arielshadrac@gmail.com](mailto:arielshadrac@gmail.com) · [contact@xcept-health.com](mailto:contact@xcept-health.com)

---

<div align="center">

*Wepisia · Xcept-Health · Ouagadougou, Burkina Faso*

*« La connaissance est comme un baobab : une seule personne ne peut l'embrasser. »*

</div>
