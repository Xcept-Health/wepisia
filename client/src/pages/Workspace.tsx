/**
 * Workspace.tsx  In-Browser R IDE  
 * based on CodeMirror 6 and WebR
 */

import React, {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react';
import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
import { useTheme } from '@/contexts/ThemeContext';

// CodeMirror 6
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor, highlightSpecialChars,
} from '@codemirror/view';
import {
  defaultKeymap, history, historyKeymap, indentWithTab, toggleComment,
} from '@codemirror/commands';
import {
  HighlightStyle, syntaxHighlighting,
  indentOnInput, bracketMatching, foldGutter, foldKeymap,
  StreamLanguage,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { r as rLanguage } from '@codemirror/legacy-modes/mode/r';
import {
  autocompletion, completionKeymap, closeBrackets,
  closeBracketsKeymap, snippet,
  type CompletionContext, type Completion,
} from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches, search } from '@codemirror/search';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';

// Lucide icons
import {
  Play, Square, Loader2, Terminal, FileCode2, Code2,
  Download, X, ChevronLeft, ChevronRight, Maximize2,
  Layers, Package, DownloadCloud, Pause, Film, RotateCcw,
  Plus, FolderOpen, Save, HelpCircle, CornerDownRight,
  Edit2, Copy, Trash2, Upload, RefreshCw, Cpu, Clock,
  BookOpen, AlertTriangle, BarChart2, ListTree,
  Sun, Moon, Maximize, Minimize, FileText, Database,
} from 'lucide-react';

// Types
interface RFile { id: string; name: string; code: string; saved: boolean; }
type LogType = 'stdout' | 'stderr' | 'info' | 'cmd' | 'result' | 'error' | 'success' | 'separator' | 'help';
interface OutputEntry { type: LogType; text: string; ts: number; }
interface REnvVar { name: string; type: string; dim: string; preview: string; }
interface CtxMenu { visible: boolean; x: number; y: number; fileId: string; }
type PanelTab = 'console' | 'environment' | 'plots' | 'help';
type MobileTab = 'editor' | 'console' | 'files' | 'plots';
type StatusKind = 'idle' | 'loading' | 'running' | 'installing' | 'error';

// Storage key
const STORAGE_KEY = 'wepisia_ide_v4';
const DEFAULT_FONT = 14;

// R keyword completions
const KW: Completion[] = [
  'c(','list(','vector(','matrix(','array(','data.frame(','tibble(','factor(','ordered(',
  'read.csv(','read.table(','readLines(','write.csv(','writeLines(',
  'read.delim(','readRDS(','saveRDS(','read.csv2(',
  'subset(','merge(','rbind(','cbind(','apply(','lapply(','sapply(',
  'tapply(','mapply(','do.call(','Reduce(','Filter(','Map(',
  'which(','which.min(','which.max(','match(',
  'order(','sort(','rank(','rev(','unique(','duplicated(',
  'table(','xtabs(','prop.table(','addmargins(',
  'reshape(','split(','unsplit(','stack(',
  'mean(','median(','sd(','var(','IQR(','range(','quantile(',
  'summary(','cor(','cov(','scale(',
  't.test(','wilcox.test(','chisq.test(','fisher.test(','mcnemar.test(',
  'prop.test(','binom.test(','poisson.test(','ks.test(',
  'shapiro.test(','bartlett.test(',
  'lm(','glm(','lmer(','glmer(','aov(','anova(','manova(',
  'confint(','coef(','residuals(','fitted(','predict(',
  'logit(','qlogis(','plogis(',
  'pnorm(','qnorm(','dnorm(','rnorm(',
  'pbinom(','qbinom(','dbinom(','rbinom(',
  'ppois(','qpois(','dpois(','rpois(',
  'pchisq(','qchisq(','dchisq(','rchisq(',
  'pt(','qt(','dt(','rt(',
  'pf(','qf(','df(','rf(',
  'set.seed(',
  'survfit(','Surv(','coxph(','cox.zph(','survdiff(',
  'roc(','auc(','ci.auc(',
  'power.prop.test(','power.t.test(',
  'plot(','hist(','boxplot(','barplot(','pie(','pairs(',
  'points(','lines(','segments(','arrows(','polygon(','rect(',
  'abline(','curve(','text(','mtext(','legend(','title(',
  'par(','layout(','axis(','box(','grid(',
  'ggplot(','aes(','geom_point(','geom_line(','geom_bar(',
  'geom_histogram(','geom_boxplot(','geom_violin(','geom_smooth(',
  'facet_wrap(','facet_grid(',
  'theme(','theme_minimal(','theme_classic(','theme_bw(',
  'labs(','coord_flip(',
  'library(','require(','webr::install(',
  'options(','format(','sprintf(','paste(','paste0(',
  'nchar(','substr(','gsub(','sub(','grep(','grepl(',
  'strsplit(','toupper(','tolower(','trimws(',
  'is.na(','is.null(','is.numeric(','is.character(',
  'as.numeric(','as.character(','as.Date(','as.factor(',
  'nrow(','ncol(','dim(','length(','names(','colnames(',
  'head(','tail(','str(','class(','typeof(',
  'print(','cat(','message(','warning(','stop(','tryCatch(',
  'for (','while (','if (','ifelse(','switch(',
  'function(','return(','invisible(',
  'TRUE','FALSE','NULL','NA','NaN','Inf','-Inf',
].map(label => ({
  label,
  type: (label.endsWith('(') ? 'function' : 'keyword') as any,
  boost: label.endsWith('(') ? 1 : 0,
}));

// Epidemiology snippets — triggered by keyword + Tab
const SNIPPETS: Completion[] = [
  {
    label: 'sir', detail: 'SIR model (Euler)', type: 'keyword' as any, boost: 10,
    apply: snippet(
`# SIR model — Euler integration
N <- \${N:100000}; I0 <- \${I0:10}
R0 <- \${R0:2.5}; gamma <- \${gamma:1/7}
beta <- R0 * gamma / N
dt <- 0.5; steps <- \${days:180} / dt
S <- numeric(steps+1); I <- numeric(steps+1); R <- numeric(steps+1)
t <- seq(0, \${days:180}, by=dt)
S[1] <- N-I0; I[1] <- I0; R[1] <- 0
for (k in seq_len(steps)) {
  ni <- beta*S[k]*I[k]; nr <- gamma*I[k]
  S[k+1] <- S[k]-ni*dt; I[k+1] <- I[k]+(ni-nr)*dt; R[k+1] <- R[k]+nr*dt
}
pk <- which.max(I)
matplot(t, cbind(S,I,R)/N*100, type="l", lwd=2, lty=1,
        col=c("#2563eb","#dc2626","#16a34a"),
        xlab="Days", ylab="% population", main=paste0("SIR — R0=",R0), bty="l")
legend("right",c("S","I","R"),col=c("#2563eb","#dc2626","#16a34a"),lwd=2,bty="n")
cat(sprintf("Peak day: %.0f — %.1f%% infected\\n", t[pk], I[pk]/N*100))
\${}`),
  },
  {
    label: 'seird', detail: 'SEIRD model', type: 'keyword' as any, boost: 10,
    apply: snippet(
`library(deSolve)
seird <- function(t, y, p) with(as.list(c(y, p)), {
  dS <- -beta*S*I/N; dE <- beta*S*I/N - sigma*E
  dI <- sigma*E - (gamma+mu)*I; dR <- gamma*I; dD <- mu*I
  list(c(dS,dE,dI,dR,dD))
})
N <- \${N:100000}
p  <- c(beta=\${beta:0.5},sigma=\${sigma:0.2},gamma=\${gamma:0.1},mu=\${mu:0.005},N=N)
y0 <- c(S=N-1,E=0,I=1,R=0,D=0)
out <- as.data.frame(ode(y=y0,times=seq(0,\${days:180}),func=seird,parms=p))
matplot(out$time,out[,2:6]/N*100,type="l",lwd=2,lty=1,
        col=c("#2563eb","#f59e0b","#dc2626","#16a34a","#374151"),
        xlab="Days",ylab="%",main="SEIRD",bty="l")
legend("right",c("S","E","I","R","D"),
       col=c("#2563eb","#f59e0b","#dc2626","#16a34a","#374151"),lwd=2,bty="n")
\${}`),
  },
  {
    label: 'surv', detail: 'Kaplan-Meier + log-rank', type: 'keyword' as any, boost: 10,
    apply: snippet(
`library(survival)
km <- survfit(Surv(\${time}, \${event}) ~ \${group}, data=\${df})
plot(km, col=c("#2563eb","#dc2626"), lwd=2, conf.int=TRUE,
     xlab="Time", ylab="Survival probability", main="Kaplan-Meier")
legend("topright", levels(\${df}$\${group}),
       col=c("#2563eb","#dc2626"), lwd=2, bty="n")
survdiff(Surv(\${time}, \${event}) ~ \${group}, data=\${df})
\${}`),
  },
  {
    label: 'cox', detail: 'Cox proportional hazards', type: 'keyword' as any, boost: 10,
    apply: snippet(
`library(survival)
cox <- coxph(Surv(\${time}, \${event}) ~ \${vars}, data=\${df})
summary(cox)
cox.zph(cox)
exp(cbind(HR=coef(cox), confint(cox)))
\${}`),
  },
  {
    label: 'logreg', detail: 'Logistic regression + OR', type: 'keyword' as any, boost: 10,
    apply: snippet(
`mod <- glm(\${outcome} ~ \${predictors}, data=\${df}, family=binomial)
summary(mod)
cbind(OR=exp(coef(mod)), exp(confint(mod)))
1 - mod$deviance / mod$null.deviance  # pseudo R²
\${}`),
  },
  {
    label: 'tabla2x2', detail: '2x2 table: OR, RR, tests', type: 'keyword' as any, boost: 10,
    apply: snippet(
`tab <- table(\${exposure}, \${outcome})
addmargins(tab); chisq.test(tab); fisher.test(tab)
OR  <- (tab[1,1]*tab[2,2])/(tab[1,2]*tab[2,1])
lOR <- log(OR); se <- sqrt(sum(1/tab))
cat(sprintf("OR = %.2f (95%% CI: %.2f-%.2f)\\n", OR, exp(lOR-1.96*se), exp(lOR+1.96*se)))
RR <- (tab[1,1]/(tab[1,1]+tab[1,2]))/(tab[2,1]/(tab[2,1]+tab[2,2]))
cat(sprintf("RR = %.2f\\n", RR))
\${}`),
  },
  {
    label: 'roc', detail: 'ROC curve + AUC', type: 'keyword' as any, boost: 10,
    apply: snippet(
`library(pROC)
roc_obj <- roc(\${outcome} ~ \${predictor}, data=\${df}, ci=TRUE)
plot(roc_obj, col="#2563eb", lwd=2,
     main=sprintf("ROC — AUC=%.3f (%.3f-%.3f)",
       as.numeric(roc_obj$auc), as.numeric(roc_obj$ci[1]), as.numeric(roc_obj$ci[3])))
abline(a=0,b=1,lty=2,col="#94a3b8")
ci.auc(roc_obj)
\${}`),
  },
  {
    label: 'sample_size', detail: 'Sample size — 2 proportions', type: 'keyword' as any, boost: 10,
    apply: snippet(
`n <- power.prop.test(p1=\${p1:0.30}, p2=\${p2:0.20},
                      sig.level=\${alpha:0.05}, power=\${power:0.80})
cat(sprintf("n per group = %d  |  N total = %d\\n", ceiling(n$n), 2*ceiling(n$n)))
ns <- seq(20,500,by=10)
pw <- sapply(ns, function(ni)
  power.prop.test(n=ni, p1=\${p1:0.30}, p2=\${p2:0.20}, sig.level=\${alpha:0.05})$power)
plot(ns, pw*100, type="l", col="#2563eb", lwd=2,
     xlab="n per group", ylab="Power (%)", bty="l")
abline(h=80, lty=2, col="#dc2626")
abline(v=ceiling(n$n), lty=2, col="#16a34a")
\${}`),
  },
  {
    label: 'epi_rate', detail: 'Incidence rate + exact CI', type: 'keyword' as any, boost: 10,
    apply: snippet(
`cases <- \${cases:50}; py <- \${py:10000}; mult <- \${mult:1000}
rate <- cases/py*mult
ci_l <- qchisq(0.025, 2*cases)/(2*py)*mult
ci_h <- qchisq(0.975, 2*(cases+1))/(2*py)*mult
cat(sprintf("Rate = %.2f (95%% CI: %.2f-%.2f) per %d PY\\n", rate, ci_l, ci_h, mult))
\${}`),
  },
  {
    label: 'anova1', detail: 'One-way ANOVA + Tukey', type: 'keyword' as any, boost: 10,
    apply: snippet(
`mod <- aov(\${outcome} ~ \${factor}, data=\${df})
summary(mod); TukeyHSD(mod)
par(mfrow=c(2,2)); plot(mod)
\${}`),
  },
  {
    label: 'glmm', detail: 'GLMM with random effects', type: 'keyword' as any, boost: 10,
    apply: snippet(
`library(lme4)
mod <- glmer(\${outcome} ~ \${fixed} + (1|\${cluster}), data=\${df}, family=binomial)
summary(mod)
vc <- as.numeric(VarCorr(mod)$\${cluster})
icc <- vc/(vc+pi^2/3)
cat("ICC =", round(icc,3), "\\n")
\${}`),
  },
  {
    label: 'desc', detail: 'Descriptive statistics table', type: 'keyword' as any, boost: 10,
    apply: snippet(
`desc <- function(x) {
  x <- x[!is.na(x)]
  c(n=length(x), mean=mean(x), sd=sd(x),
    median=median(x), IQR=IQR(x), min=min(x), max=max(x))
}
round(sapply(\${df}[, sapply(\${df}, is.numeric)], desc), 2)
\${}`),
  },
  {
    label: 'normtest', detail: 'Normality tests + QQ plot', type: 'keyword' as any, boost: 10,
    apply: snippet(
`x <- \${df}$\${variable}
shapiro.test(x); ks.test(scale(x), "pnorm")
par(mfrow=c(1,2), bg="white")
hist(x, prob=TRUE, col="#dbeafe", border="white", main="Distribution")
curve(dnorm(x, mean(x), sd(x)), add=TRUE, col="#2563eb", lwd=2)
qqnorm(x, pch=19, col="#64748b"); qqline(x, col="#dc2626", lwd=2)
\${}`),
  },
  {
    label: 'bootstrap', detail: 'Bootstrap confidence interval', type: 'keyword' as any, boost: 10,
    apply: snippet(
`library(boot)
fn <- function(d, i) mean(d[i,]$\${variable}, na.rm=TRUE)
b  <- boot(\${df}, fn, R=\${B:1000})
boot.ci(b, type=c("perc","bca"))
plot(b)
\${}`),
  },
  {
    label: 'forest', detail: 'Forest plot — meta-analysis', type: 'keyword' as any, boost: 10,
    apply: snippet(
`library(meta)
m <- metagen(TE=\${log_or}, seTE=\${se}, studlab=\${study}, data=\${df},
             sm="OR", common=TRUE, random=TRUE)
summary(m)
forest(m, sortvar=TE, col.square="#2563eb",
       col.diamond="#dc2626", col.diamond.lines="#dc2626")
\${}`),
  },
];

// CodeMirror compartments — allow reconfiguring without destroying the view
const themeComp    = new Compartment();
const lintComp     = new Compartment();
const listenerComp = new Compartment();
const historyComp  = new Compartment();

// Dark theme (GitHub Dark palette)
const darkTheme = EditorView.theme({
  '&': { height:'100%', backgroundColor:'#0d1117', color:'#e6edf3' },
  '.cm-scroller': { fontFamily:"'JetBrains Mono','Fira Code',Consolas,monospace", overflow:'auto' },
  '.cm-content': { caretColor:'#58a6ff', padding:'8px 0' },
  '.cm-cursor': { borderLeftColor:'#58a6ff', borderLeftWidth:'2px' },
  '.cm-gutters': { backgroundColor:'#0d1117', color:'#484f58', border:'none', borderRight:'1px solid #21262d' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth:'42px', padding:'0 8px', fontSize:'12px' },
  '.cm-activeLineGutter': { backgroundColor:'#161b22', color:'#79c0ff' },
  '.cm-activeLine': { backgroundColor:'rgba(56,68,77,0.16)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor:'#264f78 !important' },
  '.cm-matchingBracket': { backgroundColor:'#3d5a80', color:'#cae8ff !important', outline:'1px solid #79c0ff' },
  '.cm-searchMatch': { backgroundColor:'#9e6a0399', borderRadius:'2px' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor:'#f0883e99' },
  '.cm-tooltip': { backgroundColor:'#1c2128', border:'1px solid #30363d', borderRadius:'6px', fontSize:'12px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor:'#1f6feb' },
  '.cm-panel': { backgroundColor:'#161b22', borderTop:'1px solid #30363d' },
  '.cm-panel input': { backgroundColor:'#0d1117', color:'#e6edf3', border:'1px solid #30363d', borderRadius:'4px', padding:'2px 6px' },
  '.cm-lintRange-error': { backgroundImage:'none', borderBottom:'2px wavy #f85149' },
  '.cm-lintRange-warning': { backgroundImage:'none', borderBottom:'2px wavy #d29922' },
}, { dark: true });

const darkHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword,                     color:'#ff7b72', fontWeight:'bold' },
  { tag: tags.comment,                     color:'#8b949e', fontStyle:'italic' },
  { tag: tags.string,                      color:'#a5d6ff' },
  { tag: tags.number,                      color:'#79c0ff' },
  { tag: tags.operator,                    color:'#58a6ff' },
  { tag: tags.function(tags.variableName), color:'#d2a8ff' },
  { tag: tags.variableName,               color:'#e6edf3' },
  { tag: [tags.bool, tags.null],           color:'#79c0ff', fontWeight:'bold' },
  { tag: tags.bracket,                     color:'#c9d1d9' },
]));

// Light theme (GitHub Light palette)
const lightTheme = EditorView.theme({
  '&': { height:'100%', backgroundColor:'#ffffff', color:'#1f2328' },
  '.cm-scroller': { fontFamily:"'JetBrains Mono','Fira Code',Consolas,monospace", overflow:'auto' },
  '.cm-content': { caretColor:'#0969da', padding:'8px 0' },
  '.cm-cursor': { borderLeftColor:'#0969da', borderLeftWidth:'2px' },
  '.cm-gutters': { backgroundColor:'#f6f8fa', color:'#6e7781', border:'none', borderRight:'1px solid #d0d7de' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth:'42px', padding:'0 8px', fontSize:'12px' },
  '.cm-activeLineGutter': { backgroundColor:'#eef0f2' },
  '.cm-activeLine': { backgroundColor:'#f3f4f6' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor:'#b3d4ff !important' },
  '.cm-matchingBracket': { backgroundColor:'#d8e4fc', outline:'1px solid #0969da' },
  '.cm-tooltip': { backgroundColor:'#ffffff', border:'1px solid #d0d7de', borderRadius:'6px', boxShadow:'0 4px 12px rgba(0,0,0,.12)', fontSize:'12px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor:'#0969da', color:'#fff' },
  '.cm-panel': { backgroundColor:'#f6f8fa', borderTop:'1px solid #d0d7de' },
  '.cm-lintRange-error': { backgroundImage:'none', borderBottom:'2px wavy #cf222e' },
}, { dark: false });

const lightHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword,                     color:'#cf222e', fontWeight:'bold' },
  { tag: tags.comment,                     color:'#6e7781', fontStyle:'italic' },
  { tag: tags.string,                      color:'#0a3069' },
  { tag: tags.number,                      color:'#0550ae' },
  { tag: tags.operator,                    color:'#0969da' },
  { tag: tags.function(tags.variableName), color:'#8250df' },
  { tag: tags.variableName,               color:'#1f2328' },
  { tag: [tags.bool, tags.null],           color:'#0550ae', fontWeight:'bold' },
  { tag: tags.bracket,                     color:'#1f2328' },
]));

// R completion source combining keywords and snippets
function rCompletionSource(ctx: CompletionContext) {
  const word = ctx.matchBefore(/[\w.:]+/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;
  const q = word.text.toLowerCase();
  const snippetMatches = SNIPPETS.filter(c => c.label.toLowerCase().startsWith(q));
  const kwMatches      = KW.filter(c => c.label.toLowerCase().startsWith(q)).slice(0, 40);
  if (!snippetMatches.length && !kwMatches.length) return null;
  return { from: word.from, options: [...snippetMatches, ...kwMatches], validFor: /^[\w.:]*$/ };
}

// Async R lint source — calls parse() in WebR
function createLintSource(
  webRRef: React.MutableRefObject<any>,
  busyRef: React.MutableRefObject<boolean>,
) {
  return async (view: EditorView): Promise<Diagnostic[]> => {
    const wr = webRRef.current;
    if (!wr || busyRef.current) return [];
    const code = view.state.doc.toString();
    if (!code.trim() || code.length > 80_000) return [];
    const shelter = await new wr.Shelter();
    try {
      await shelter.evalR(`parse(text=${JSON.stringify(code)})`);
      return [];
    } catch (e: any) {
      const raw = (e.message ?? 'Syntax error').replace(/^Error.*?: /, '');
      const m   = raw.match(/<text>:(\d+)(?::(\d+))?/);
      const lineNum = m ? Math.min(parseInt(m[1]), view.state.doc.lines) : 1;
      const colNum  = m?.[2] ? parseInt(m[2]) : 0;
      const line = view.state.doc.line(lineNum);
      const from = Math.min(line.from + Math.max(0, colNum - 1), line.to);
      const to   = Math.max(from + 1, line.to);
      return [{ from, to, severity: 'error', message: raw.replace(/<text>:\d+:\d+:\s*/, '') }];
    } finally {
      await shelter.purge();
    }
  };
}

// Static CodeMirror extensions (never change at runtime)
function buildBaseExtensions() {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    historyComp.of(history()),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    autocompletion({ override: [rCompletionSource], icons: true }),
    StreamLanguage.define(rLanguage),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
      { key: 'Ctrl-/', run: toggleComment, preventDefault: true },
    ]),
    EditorView.lineWrapping,
    lintGutter(),
    lintComp.of([]),
    listenerComp.of([]),
    themeComp.of([darkTheme, darkHighlight]),
  ];
}

// Format R output to string
function formatOutput(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return v.map(formatOutput).filter(Boolean).join('\n');
  if (v.values !== undefined) {
    const vals = Array.isArray(v.values) ? v.values : [v.values];
    if (v.names && vals.every((x: any) => x?.values)) {
      const cols   = v.names as string[];
      const rows   = (vals[0].values as any[]).length;
      const data   = cols.map((c: string, i: number) => ({ name: c, vals: (vals[i].values as any[]).map(String) }));
      const widths = data.map(c => Math.max(c.name.length, ...c.vals.map((x: string) => x.length)));
      const header = data.map((c, i) => c.name.padEnd(widths[i])).join('  ');
      const sep    = widths.map(w => '-'.repeat(w)).join('  ');
      const body   = Array.from({ length: rows }, (_, r) =>
        data.map((c, i) => c.vals[r].padEnd(widths[i])).join('  ')
      ).join('\n');
      return [header, sep, body].join('\n');
    }
    return vals.map(formatOutput).filter(Boolean).join('\n');
  }
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

// Default script — base R only, no packages required
const INIT_CODE = `# SIR model — Euler integration, no packages required
# Run: Ctrl+Shift+Enter (full script)  |  Ctrl+Enter (current line)

N     <- 100000
I0    <- 10
R0    <- 2.5
gamma <- 1 / 7
beta  <- R0 * gamma / N
dt    <- 0.5
days  <- 180
steps <- days / dt

S <- numeric(steps + 1); I <- numeric(steps + 1); R <- numeric(steps + 1)
t <- seq(0, days, by = dt)
S[1] <- N - I0; I[1] <- I0; R[1] <- 0

for (k in seq_len(steps)) {
  ni     <- beta * S[k] * I[k]
  nr     <- gamma * I[k]
  S[k+1] <- S[k] - ni * dt
  I[k+1] <- I[k] + (ni - nr) * dt
  R[k+1] <- R[k] + nr * dt
}

pk <- which.max(I)
cat(sprintf("R0             : %.1f\\n", R0))
cat(sprintf("Peak day       : %.0f — %.1f%% infected\\n", t[pk], I[pk]/N*100))
cat(sprintf("Attack rate    : %.1f%%\\n", max(R)/N*100))

par(mfrow = c(1, 2), mar = c(4, 4, 2.5, 1), bg = "white")

matplot(t, cbind(S, I, R) / N * 100,
        type = "l", lwd = 2.5, lty = 1,
        col  = c("#2563eb", "#dc2626", "#16a34a"),
        xlab = "Days", ylab = "% population",
        main = paste0("SIR model — R0 = ", R0), bty = "l")
abline(v = t[pk], lty = 2, col = "#94a3b8")
legend("right", c("Susceptible","Infected","Recovered"),
       col = c("#2563eb","#dc2626","#16a34a"), lwd = 2.5, bty = "n", cex = 0.85)

vals <- c("Peak I"  = I[pk]/N*100,
          "Attack"  = max(R)/N*100,
          "Final S" = S[steps+1]/N*100)
bp <- barplot(vals, col=c("#dc2626","#16a34a","#2563eb"), border=NA,
              ylab="%", main="Key indicators", ylim=c(0, max(vals)*1.25), bty="l",
              names.arg=c("Peak I","Attack","S\u221e"))
text(bp, vals + 1.5, sprintf("%.1f%%", vals), cex=0.85, font=2)
`;

// Main component
export default function Workspace() {

  // WebR state
  const [webR, setWebR]     = useState<any>(null);
  const webRRef             = useRef<any>(null);
  const [status, setStatus] = useState<StatusKind>('loading');
  const busyRef             = useRef(false);

  // Files
  const [files, setFiles]       = useState<RFile[]>([
    { id: '1', name: 'analyse.R', code: INIT_CODE, saved: true },
  ]);
  const [activeId, setActiveId] = useState('1');
  const activeIdRef             = useRef('1');

  // Output
  const [log, setLog]           = useState<OutputEntry[]>([]);
  const [envVars, setEnvVars]   = useState<REnvVar[]>([]);
  const [memMB, setMemMB]       = useState<number | null>(null);
  const [plotUrls, setPlotUrls] = useState<string[]>([]);
  const prevUrls                = useRef<string[]>([]);

  // Animation
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame]     = useState(0);
  const animRef               = useRef<any>(null);

  // Interactive console
  const [consoleIn, setConsoleIn] = useState('');
  const [cmdHist, setCmdHist]     = useState<string[]>([]);
  const [histIdx, setHistIdx]     = useState(-1);

  // WebR FS listing
  const [fsFiles, setFsFiles] = useState<string[]>([]);

  // UI state
  const [panel, setPanel]           = useState<PanelTab>('console');
  const [mobileTab, setMobileTab]   = useState<MobileTab>('editor');
  const [lightbox, setLightbox]     = useState<number | null>(null);
  const [showExp, setShowExp]       = useState(true);
  const [pkg, setPkg]               = useState('');
  const [installing, setInstalling] = useState(false);
  const [ctxMenu, setCtxMenu]       = useState<CtxMenu>({ visible:false, x:0, y:0, fileId:'' });
  const [renaming, setRenaming]     = useState<string|null>(null);
  const [newName, setNewName]       = useState('');
  const [fontSize, setFontSize]     = useState(DEFAULT_FONT);
  const [fullscreen, setFullscreen] = useState(false);
  const [errBanner, setErrBanner]   = useState('');

  // Clock and execution timer
  const [clock, setClock]   = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef            = useRef<any>(null);

  // Panel resize (desktop only)

  // Mobile breakpoint — reactive, drives layout logic
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const h = (ev: MediaQueryListEvent) => setIsMobile(ev.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  const [panelW, setPanelW] = useState(460);
  const dragging            = useRef(false);
  const dragX0              = useRef(0);
  const dragW0              = useRef(0);

  // DOM refs
  const editorDivRef  = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const outputRef     = useRef<HTMLDivElement>(null);
  const consoleRef    = useRef<HTMLInputElement>(null);
  const ctxRef        = useRef<HTMLDivElement>(null);

  // Theme from global context
  const { theme, toggleTheme, switchable } = useTheme();
  const isDark = theme === 'dark';

  const activeFile = files.find(f => f.id === activeId);

  // Log helpers
  const push = useCallback((type: LogType, text: string) => {
    setLog(prev => [...prev, { type, text, ts: Date.now() }]);
  }, []);
  const clearLog = useCallback(() => setLog([]), []);

  // Persistence
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      if (s.files?.length) {
        setFiles(s.files);
        setActiveId(s.activeId ?? s.files[0].id);
        activeIdRef.current = s.activeId ?? s.files[0].id;
      }
      if (s.panelW)  setPanelW(s.panelW);
      if (s.fontSize) setFontSize(s.fontSize);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ files, activeId, panelW, fontSize }));
    } catch {}
  }, [files, activeId, panelW, fontSize]);

  // WebR initialization
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const wr = new WebR();
        await wr.init();
        if (cancel) return;
        webRRef.current = wr;
        setWebR(wr);
        setStatus('idle');
        push('info', 'WebR 4.x ready.');
        push('info', 'Ctrl+Shift+Enter: run script  |  Ctrl+Enter: run line  |  ?: help  |  Tab: autocomplete');
      } catch (e: any) {
        if (!cancel) { setStatus('error'); setErrBanner('WebR init error: ' + e.message); }
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Clock — update every second
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Execution timer — counts seconds while running
  useEffect(() => {
    clearInterval(timerRef.current);
    if (status === 'running' || status === 'installing') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  // CodeMirror — single instance, created once on mount
  useLayoutEffect(() => {
    if (!editorDivRef.current) return;

    // The listener reads activeIdRef (a ref) to avoid stale closures
    const listener = EditorView.updateListener.of(update => {
      if (!update.docChanged) return;
      const code = update.state.doc.toString();
      setFiles(prev => {
        const id = activeIdRef.current;
        const f  = prev.find(x => x.id === id);
        if (!f || f.code === code) return prev;
        return prev.map(x => x.id === id ? { ...x, code, saved: false } : x);
      });
    });

    const state = EditorState.create({ doc: '', extensions: buildBaseExtensions() });
    const view  = new EditorView({ state, parent: editorDivRef.current });
    editorViewRef.current = view;
    view.dispatch({ effects: listenerComp.reconfigure(listener) });
    setEditorReady(true);

    return () => { view.destroy(); editorViewRef.current = null; };
  }, []);

  // Switch file — update content and reset undo history via Compartment, no view rebuild
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view || !editorReady) return;
    activeIdRef.current = activeId;
    const newCode = files.find(f => f.id === activeId)?.code ?? '';
    if (view.state.doc.toString() === newCode) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newCode },
      effects: historyComp.reconfigure(history()),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, editorReady]);

  // Font size
  useEffect(() => {
    if (editorViewRef.current) editorViewRef.current.dom.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // Theme switch via Compartment — no view rebuild
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeComp.reconfigure(isDark
        ? [darkTheme, darkHighlight]
        : [lightTheme, lightHighlight]
      ),
    });
  }, [isDark, editorReady]);

  // Lint — enabled once WebR is ready
  useEffect(() => {
    const view = editorViewRef.current;
    if (!webR || !view) return;
    view.dispatch({
      effects: lintComp.reconfigure(linter(createLintSource(webRRef, busyRef), { delay: 900 })),
    });
  }, [webR, editorReady]);

  // Plot animation
  useEffect(() => {
    clearInterval(animRef.current);
    if (playing && plotUrls.length > 1)
      animRef.current = setInterval(() => setFrame(p => (p + 1) % plotUrls.length), 120);
    return () => clearInterval(animRef.current);
  }, [playing, plotUrls.length]);

  useEffect(() => { setFrame(0); setPlaying(false); }, [plotUrls]);

  // Auto-scroll console
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [log]);

  // Image capture — URL.createObjectURL instead of base64
  // Fill white background before drawing: R plots are transparent by default,
  // which makes them unreadable on both dark and light themes.
  const revoke = useCallback(() => {
    prevUrls.current.forEach(u => URL.revokeObjectURL(u));
    prevUrls.current = [];
  }, []);

  const capturePlots = useCallback(async (images: ImageBitmap[]) => {
    revoke();
    const urls: string[] = [];
    for (const bmp of images) {
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d');
      if (!ctx) continue;
      // White fill — fixes transparent plot backgrounds on both themes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0);
      await new Promise<void>(res => c.toBlob(b => {
        if (b) { const u = URL.createObjectURL(b); urls.push(u); prevUrls.current.push(u); }
        res();
      }, 'image/png'));
    }
    setPlotUrls(urls);
    if (urls.length) {
      setPanel('plots');
      setMobileTab('plots'); // auto-switch mobile view to plots
    }
  }, [revoke]);

  // Refresh .GlobalEnv — fix: no %||%, use plain base R
  const refreshEnv = useCallback(async (wr: any) => {
    if (!wr) return;
    const shelter = await new wr.Shelter();
    try {
      const cap = await shelter.captureR(`
local({
  objs <- ls(envir=.GlobalEnv)
  if (!length(objs)) return(invisible(NULL))
  lapply(objs, function(nm) {
    obj <- tryCatch(get(nm, envir=.GlobalEnv), error=function(e) NULL)
    if (is.null(obj)) return(NULL)
    cls <- paste(class(obj), collapse="/")
    d   <- dim(obj)
    dm  <- if (!is.null(d)) paste(d, collapse="x") else as.character(length(obj))
    prv <- tryCatch({
      s <- paste(capture.output(print(head(obj, 2))), collapse=" ")
      if (nchar(s) > 65) paste0(substr(s,1,65),"\u2026") else s
    }, error=function(e) "?")
    list(name=nm, type=cls, dim=dm, preview=prv)
  })
})`, { captureGraphics: false });

      const res = await cap.result.toJs();
      if (res?.values) {
        const vars: REnvVar[] = (res.values as any[])
          .filter(Boolean)
          .map((v: any) => ({
            name:    v?.values?.[0]?.values?.[0] ?? '',
            type:    v?.values?.[1]?.values?.[0] ?? '',
            dim:     v?.values?.[2]?.values?.[0] ?? '',
            preview: v?.values?.[3]?.values?.[0] ?? '',
          }))
          .filter(x => x.name);
        setEnvVars(vars);
      }

      // Approximate memory usage
      const memCap = await shelter.captureR(`
tryCatch({
  sizes <- vapply(ls(envir=.GlobalEnv), function(nm)
    tryCatch(as.numeric(object.size(get(nm,envir=.GlobalEnv))), error=function(e) 0), numeric(1))
  round(sum(sizes)/1024^2, 1)
}, error=function(e) -1)
`, { captureGraphics: false });
      const mb = await memCap.result.toJs();
      const v  = mb?.values?.[0] ?? (typeof mb === 'number' ? mb : null);
      if (typeof v === 'number' && v >= 0) setMemMB(v);
    } catch {} finally { await shelter.purge(); }
  }, []);

  // WebR FS — list imported files
  const refreshFS = useCallback(async (wr: any) => {
    if (!wr) return;
    try {
      const entries = await wr.FS.readdir('/home/web_user');
      setFsFiles((entries as string[]).filter(e => e !== '.' && e !== '..'));
    } catch {}
  }, []);

  // Execute full script
  // Pre-pass: run webr::install() calls sequentially before the main captureR.
  // Mixing install + library() in one captureR fails — install is async at the C level.
  const execute = useCallback(async () => {
    if (!webR || status !== 'idle' || busyRef.current) return;
    const file = files.find(f => f.id === activeId);
    if (!file) return;

    busyRef.current = true;
    setStatus('running');
    setErrBanner('');

    const stamp = new Date().toLocaleTimeString('fr-FR');
    push('separator', `${file.name} · ${stamp}`);

    const rawCode = file.code.replace(/\r\n?/g, '\n');
    const installRe = /^\s*(?:webr::install|webr::install\.packages)\s*\(\s*["']([^"']+)["'][^)]*\)/gm;
    const pkgsToInstall: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = installRe.exec(rawCode)) !== null) pkgsToInstall.push(m[1]);

    if (pkgsToInstall.length > 0) {
      setStatus('installing');
      for (const pkgName of pkgsToInstall) {
        push('info', `Installing "${pkgName}"…`);
        const sh = await new webR.Shelter();
        try {
          const cap = await sh.captureR(`webr::install("${pkgName}")`, { captureGraphics: false });
          for (const msg of cap.output) push('stdout', typeof msg.data === 'string' ? msg.data : String(msg.data));
          push('success', `"${pkgName}" installed.`);
        } catch (e: any) {
          push('error', `Install failed — "${pkgName}": ${e.message}`);
        } finally { await sh.purge(); }
      }
      setStatus('running');
    }

    // Strip install lines — already handled above
    const cleanCode = rawCode.split('\n')
      .filter(line => !/^\s*webr::install/.test(line))
      .join('\n');

    const shelter = await new webR.Shelter();
    try {
      const t0  = performance.now();
      const cap = await shelter.captureR(cleanCode, {
        captureGraphics: { width: 920, height: 640, res: 130 },
      });

      for (const msg of cap.output) {
        const txt = typeof msg.data === 'string' ? msg.data : String(msg.data);
        push(msg.type === 'stderr' || msg.type === 'message' ? 'stderr' : 'stdout', txt);
      }

      try {
        const js = await cap.result.toJs();
        if (js !== null && js !== undefined && !cap.images?.length) {
          const out = formatOutput(js);
          if (out.trim()) push('result', out);
        }
      } catch {}

      if (cap.images?.length) await capturePlots(cap.images);

      push('success', `Done in ${((performance.now() - t0) / 1000).toFixed(2)}s`);
      await refreshEnv(webR);
      setStatus('idle');
    } catch (err: any) {
      const msg = err.message ?? String(err);
      setErrBanner(msg);
      push('error', msg);
      setStatus('idle'); // recoverable — engine stays alive
    } finally {
      await shelter.purge();
      busyRef.current = false;
    }
  }, [webR, status, files, activeId, push, capturePlots, refreshEnv]);

  // Stop — interrupt WebR worker
  const stopExec = useCallback(async () => {
    if (!webR) return;
    try { await webR.interrupt(); } catch {}
    push('info', 'Script interrupted.');
    busyRef.current = false;
    setStatus('idle');
  }, [webR, push]);

  // Execute current line or selection
  const executeLine = useCallback(async () => {
    if (!webR || status !== 'idle' || busyRef.current) return;
    const view = editorViewRef.current;
    if (!view) return;
    const sel  = view.state.selection.main;
    const code = sel.empty
      ? view.state.doc.lineAt(sel.head).text
      : view.state.sliceDoc(sel.from, sel.to);
    if (!code.trim() || code.trim().startsWith('#')) return;

    busyRef.current = true;
    setStatus('running');
    push('cmd', `> ${code.length > 70 ? code.slice(0, 70) + '…' : code}`);

    const shelter = await new webR.Shelter();
    try {
      const cap = await shelter.captureR(code, {
        captureGraphics: { width: 920, height: 640, res: 130 },
      });
      for (const msg of cap.output)
        push('stdout', typeof msg.data === 'string' ? msg.data : String(msg.data));
      try {
        const js = await cap.result.toJs();
        if (js !== null && js !== undefined) push('result', formatOutput(js));
      } catch {}
      if (cap.images?.length) await capturePlots(cap.images);
      await refreshEnv(webR);
      setStatus('idle');
    } catch (err: any) {
      push('error', err.message ?? String(err));
      setStatus('idle');
    } finally {
      await shelter.purge();
      busyRef.current = false;
    }
  }, [webR, status, push, capturePlots, refreshEnv]);

  // Interactive console — also handles ?topic help lookups
  const handleConsole = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webR || status !== 'idle' || !consoleIn.trim() || busyRef.current) return;
    const cmd = consoleIn.trim();

    // Intercept ?topic — fetch R help text
    if (/^\?[a-zA-Z_][a-zA-Z0-9_.]*$/.test(cmd)) {
      const topic = cmd.slice(1);
      setConsoleIn('');
      setCmdHist(p => [cmd, ...p.slice(0, 99)]);
      busyRef.current = true;
      setStatus('running');
      push('cmd', cmd);
      const shelter = await new webR.Shelter();
      try {
        const cap = await shelter.captureR(
          `cat(paste(capture.output(help("${topic}", help_type="text")), collapse="\\n"))`,
          { captureGraphics: false }
        );
        const txt = cap.output.map((m: any) => String(m.data)).join('\n').trim();
        push('help', txt || `No documentation found for "${topic}"`);
        setPanel('help');
      } catch {
        push('stderr', `Help unavailable for "${topic}" in WebR`);
      } finally {
        await shelter.purge();
        busyRef.current = false;
        setStatus('idle');
      }
      return;
    }

    setCmdHist(p => [cmd, ...p.slice(0, 99)]);
    setHistIdx(-1);
    setConsoleIn('');
    push('cmd', `> ${cmd}`);
    busyRef.current = true;
    setStatus('running');

    const shelter = await new webR.Shelter();
    try {
      const cap = await shelter.captureR(cmd, {
        captureGraphics: { width: 920, height: 640, res: 130 },
      });
      for (const msg of cap.output)
        push('stdout', typeof msg.data === 'string' ? msg.data : String(msg.data));
      try {
        const js = await cap.result.toJs();
        if (js !== null && js !== undefined) push('result', formatOutput(js));
      } catch {}
      if (cap.images?.length) await capturePlots(cap.images);
      await refreshEnv(webR);
      setStatus('idle');
    } catch (err: any) {
      push('error', err.message ?? String(err));
      setStatus('idle');
    } finally {
      await shelter.purge();
      busyRef.current = false;
    }
  }, [webR, status, consoleIn, push, capturePlots, refreshEnv]);

  // Reset .GlobalEnv
  const resetEnv = useCallback(async () => {
    if (!webR || status !== 'idle' || busyRef.current) return;
    if (!confirm('Remove all objects from .GlobalEnv?')) return;
    busyRef.current = true;
    setStatus('running');
    const shelter = await new webR.Shelter();
    try {
      await shelter.captureR('rm(list=ls(envir=.GlobalEnv), envir=.GlobalEnv)', { captureGraphics: false });
      setEnvVars([]);
      setMemMB(0);
      push('success', 'Environment cleared.');
      setStatus('idle');
    } catch (e: any) {
      push('error', e.message);
      setStatus('idle');
    } finally {
      await shelter.purge();
      busyRef.current = false;
    }
  }, [webR, status, push]);

  // Install package
  const installPkg = useCallback(async () => {
    if (!webR || status !== 'idle' || !pkg.trim() || busyRef.current) return;
    const name = pkg.trim();
    setPkg('');
    busyRef.current = true;
    setInstalling(true);
    setStatus('installing');
    push('info', `Installing "${name}"…`);
    const shelter = await new webR.Shelter();
    try {
      const cap = await shelter.captureR(`webr::install("${name}")`, { captureGraphics: false });
      for (const msg of cap.output) push('stdout', typeof msg.data === 'string' ? msg.data : String(msg.data));
      push('success', `"${name}" installed.`);
      setStatus('idle');
    } catch (e: any) {
      push('error', `Install failed: ${e.message}`);
      setStatus('idle');
    } finally {
      await shelter.purge();
      setInstalling(false);
      busyRef.current = false;
    }
  }, [webR, status, pkg, push]);

  // Upload CSV to WebR virtual filesystem
  const uploadCSV = useCallback(async () => {
    if (!webR || status !== 'idle') return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.csv,.tsv,.txt,.xls,.xlsx';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f || !webRRef.current) return;
      const buf = await f.arrayBuffer();
      try {
        await webRRef.current.FS.writeFile(`/home/web_user/${f.name}`, new Uint8Array(buf));
        push('success', `"${f.name}" uploaded to WebR FS:`);
        push('info', `df <- read.csv("/home/web_user/${f.name}")`);
        await refreshFS(webRRef.current);
      } catch (e: any) { push('error', `Upload error: ${e.message}`); }
    };
    inp.click();
  }, [webR, status, push, refreshFS]);

  // Export console log as .txt
  const exportLog = useCallback(() => {
    const text = log.map(e => {
      const d = new Date(e.ts).toLocaleTimeString('fr-FR');
      return `[${d}] ${e.type.toUpperCase().padEnd(8)} ${e.text}`;
    }).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `session_${new Date().toISOString().slice(0, 16).replace('T', '_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [log]);

  // File management
  const addFile = useCallback(() => {
    const id = Date.now().toString();
    setFiles(p => [...p, { id, name: `script${p.length + 1}.R`, code: '# New R script\n', saved: true }]);
    setActiveId(id); activeIdRef.current = id;
  }, []);

  const openFile = useCallback(() => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.R,.r,.Rmd,.qmd,.txt';
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = e => {
        const id = Date.now().toString();
        setFiles(p => [...p, { id, name: f.name, code: (e.target?.result as string) ?? '', saved: true }]);
        setActiveId(id); activeIdRef.current = id;
      };
      reader.readAsText(f);
    };
    inp.click();
  }, []);

  const saveFile = useCallback((fid?: string) => {
    const f = fid ? files.find(x => x.id === fid) : files.find(x => x.id === activeId);
    if (!f) return;
    const blob = new Blob([f.code], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = f.name; a.click();
    URL.revokeObjectURL(a.href);
    setFiles(p => p.map(x => x.id === f.id ? { ...x, saved: true } : x));
  }, [files, activeId]);

  const closeFile = useCallback((id: string) => {
    if (!confirm('Close this file?')) return;
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      if (!next.length) return [{ id: Date.now().toString(), name: 'script1.R', code: '', saved: true }];
      return next;
    });
    if (activeId === id) {
      const remaining = files.filter(f => f.id !== id);
      const nid = remaining[0]?.id ?? '';
      setActiveId(nid); activeIdRef.current = nid;
    }
  }, [activeId, files]);

  const renameFile = useCallback((id: string, name: string) => {
    setFiles(p => p.map(f => f.id === id ? { ...f, name } : f));
    setRenaming(null);
  }, []);

  const copyFile = useCallback((id: string) => {
    const orig = files.find(f => f.id === id); if (!orig) return;
    const base = orig.name.replace(/(\.[^.]*)$/, '');
    const ext  = orig.name.match(/\.[^.]+$/)?.[0] ?? '.R';
    let nm = `${base}-copy${ext}`;
    let n = 2;
    while (files.some(f => f.name === nm)) { nm = `${base}-copy${n}${ext}`; n++; }
    const nid = Date.now().toString();
    setFiles(p => [...p, { id: nid, name: nm, code: orig.code, saved: false }]);
    setActiveId(nid); activeIdRef.current = nid;
  }, [files]);

  // Panel resize handle (desktop)
  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true; dragX0.current = e.clientX; dragW0.current = panelW;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (ev: MouseEvent) => {
      if (dragging.current)
        setPanelW(Math.max(240, Math.min(900, dragW0.current + dragX0.current - ev.clientX)));
    };
    const up = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [panelW]);

  // Global keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 's')     { e.preventDefault(); saveFile(); }
      if (e.ctrlKey && e.shiftKey  && e.key === 'Enter') { e.preventDefault(); execute(); }
      if (e.ctrlKey && !e.shiftKey && e.key === 'Enter') { e.preventDefault(); executeLine(); }
      if (e.ctrlKey && e.shiftKey  && e.key === 'F')     { e.preventDefault(); setFullscreen(v => !v); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveFile, execute, executeLine]);

  // Close context menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node))
        setCtxMenu(p => ({ ...p, visible: false }));
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const downloadImg = useCallback((url: string, i: number) => {
    const a = document.createElement('a'); a.href = url; a.download = `plot-${i + 1}.png`; a.click();
  }, []);

  // Status indicator config
  const SM: Record<StatusKind, { dot: string; label: string; pulse: boolean }> = {
    idle:       { dot: 'bg-emerald-500', label: 'Ready',       pulse: false },
    loading:    { dot: 'bg-amber-500',   label: 'Loading',     pulse: true  },
    running:    { dot: 'bg-blue-500',    label: 'Running',     pulse: true  },
    installing: { dot: 'bg-purple-500',  label: 'Installing',  pulse: true  },
    error:      { dot: 'bg-red-500',     label: 'Error',       pulse: false },
  };
  const sm    = SM[status];
  const isBusy = status !== 'idle';

  // Log entry colors
  const LC: Record<LogType, string> = {
    stdout:    'text-slate-200',
    stderr:    'text-amber-400',
    info:      'text-blue-400',
    cmd:       'text-slate-500',
    result:    'text-emerald-400',
    error:     'text-red-400',
    success:   'text-emerald-300',
    separator: 'text-slate-600',
    help:      'text-cyan-300',
  };

  // UI colors derived from theme
  const UI = {
    bg:     isDark ? 'bg-[#0d1117]'     : 'bg-white',
    sidebar: isDark ? 'bg-[#161b22]'    : 'bg-[#f6f8fa]',
    border:  isDark ? 'border-[#30363d]': 'border-[#d0d7de]',
    text:    isDark ? 'text-slate-100'  : 'text-[#1f2328]',
    muted:   isDark ? 'text-slate-500'  : 'text-[#6e7781]',
    hover:   isDark ? 'hover:bg-[#21262d]' : 'hover:bg-[#eef0f2]',
    card:    isDark ? 'bg-[#161b22]'    : 'bg-white',
    active:  isDark
      ? 'bg-blue-600/15 text-blue-300 border-blue-500'
      : 'bg-blue-50 text-blue-700 border-blue-500',
    tab:     isDark ? 'border-blue-500 text-blue-400' : 'border-blue-600 text-blue-600',
    input:   isDark
      ? 'bg-[#0d1117] text-slate-300 border-[#30363d]'
      : 'bg-white text-[#1f2328] border-[#d0d7de]',
  };

  // File row — used in both desktop sidebar and mobile files panel
  const FileRow = ({ file }: { file: RFile }) => (
    <div
      onClick={() => { setActiveId(file.id); activeIdRef.current = file.id; setMobileTab('editor'); }}
      onContextMenu={e => { e.preventDefault(); setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, fileId: file.id }); }}
      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer text-xs border-l-2 transition-all
        ${activeId === file.id ? `${UI.active}` : `${UI.muted} ${UI.hover} border-transparent`}`}
    >
      <FileCode2 size={12} className="flex-shrink-0" />
      {renaming === file.id
        ? <form className="flex-1" onSubmit={e => { e.preventDefault(); if (newName.trim()) renameFile(file.id, newName.trim()); }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onBlur={() => setRenaming(null)}
              className={`w-full ${UI.input} border rounded px-1 py-0.5 text-xs outline-none`} />
          </form>
        : <>
            <span className="flex-1 truncate">{file.name}</span>
            {!file.saved && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
            <button onClick={e => { e.stopPropagation(); closeFile(file.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400">
              <X size={10} />
            </button>
          </>
      }
    </div>
  );

  // Console panel — shared between desktop and mobile
  const ConsolePanel = () => (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {errBanner && (
        <div className="mx-2 mt-2 p-2 bg-red-900/20 border border-red-800/50 rounded-lg flex gap-2 text-xs text-red-400 flex-shrink-0">
          <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
          <pre className="whitespace-pre-wrap font-mono leading-relaxed flex-1 overflow-hidden">{errBanner}</pre>
          <button onClick={() => setErrBanner('')} className="flex-shrink-0 hover:text-red-300"><X size={10} /></button>
        </div>
      )}
      <div ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-0.5 hide-scrollbar"
        style={{ userSelect: 'text' }}>
        {log.length === 0 && <span className={UI.muted}>{'> Ready. Ctrl+Shift+Enter to run.'}</span>}
        {log.map((entry, i) => (
          entry.type === 'separator'
            ? <div key={i} className={`${LC.separator} text-[10px] py-1`}>{entry.text}</div>
            : <pre key={i} className={`whitespace-pre-wrap break-words ${LC[entry.type]}`}>{entry.text}</pre>
        ))}
      </div>
      {/* Console input — always visible, not hidden behind scroll */}
      <form onSubmit={handleConsole}
        className={`flex items-center gap-2 px-3 py-2.5 border-t ${UI.border} ${UI.sidebar} flex-shrink-0`}>
        <span className="text-blue-400 font-mono text-xs flex-shrink-0">&gt;</span>
        <input ref={consoleRef} value={consoleIn}
          onChange={e => setConsoleIn(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'ArrowUp')   { e.preventDefault(); const i = Math.min(histIdx + 1, cmdHist.length - 1); setHistIdx(i); setConsoleIn(cmdHist[i] ?? ''); }
            if (e.key === 'ArrowDown') { e.preventDefault(); const i = Math.max(histIdx - 1, -1); setHistIdx(i); setConsoleIn(i < 0 ? '' : cmdHist[i] ?? ''); }
          }}
          placeholder="R command… (? for help)"
          disabled={isBusy}
          className={`flex-1 bg-transparent outline-none text-xs ${UI.text} placeholder:text-slate-500 font-mono disabled:opacity-50`}
          style={{ userSelect: 'text' }}
        />
        <button type="submit" disabled={isBusy || !consoleIn.trim()} className="text-blue-400 disabled:opacity-30">
          <Play size={11} fill="currentColor" />
        </button>
      </form>
    </div>
  );

  // Environment panel — shared
  const EnvironmentPanel = () => (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className={`px-3 py-2 border-b ${UI.border} flex items-center gap-2 flex-shrink-0`}>
        <span className={`text-[10px] ${UI.muted} uppercase tracking-wider flex-1`}>.GlobalEnv</span>
        {memMB !== null && <span className={`text-[10px] font-mono ${UI.muted}`}>{memMB} MB</span>}
        <button onClick={resetEnv} disabled={isBusy} title="rm(list=ls())"
          className="p-1 rounded text-red-400 hover:bg-red-900/20 disabled:opacity-30 text-[10px] flex items-center gap-1">
          <Trash2 size={10} /> Reset
        </button>
        <button onClick={() => refreshEnv(webR)} disabled={isBusy}
          className={`p-1 rounded ${UI.muted} ${UI.hover} disabled:opacity-30`}>
          <RefreshCw size={11} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {envVars.length === 0
          ? <p className={`p-4 text-xs ${UI.muted}`}>No objects. Run a script first.</p>
          : <table className="w-full text-xs">
              <thead className={`sticky top-0 ${UI.sidebar}`}>
                <tr className={`text-[9px] ${UI.muted} uppercase`}>
                  <th className="text-left px-3 py-1.5 font-medium">Name</th>
                  <th className="text-left px-2 py-1.5 font-medium">Type</th>
                  <th className="text-left px-2 py-1.5 font-medium hidden sm:table-cell">Dim</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((v, i) => (
                  <tr key={i} className={`border-t ${UI.border} ${UI.hover}`} title={v.preview}>
                    <td className="px-3 py-1.5 text-blue-400 font-mono">{v.name}</td>
                    <td className="px-2 py-1.5 text-emerald-400">{v.type}</td>
                    <td className={`px-2 py-1.5 ${UI.muted} hidden sm:table-cell`}>{v.dim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );

  // Plots panel — shared
  const PlotsPanel = () => (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {plotUrls.length > 0 && (
        <div className={`px-3 py-1.5 border-b ${UI.border} flex items-center gap-1.5 flex-shrink-0`}>
          <span className={`text-[10px] ${UI.muted}`}>{frame + 1}/{plotUrls.length}</span>
          {plotUrls.length > 1 && <>
            <button onClick={() => setPlaying(v => !v)}
              className={`p-1 rounded ${playing ? 'bg-blue-600/20 text-blue-400' : `${UI.muted} ${UI.hover}`}`}>
              {playing ? <Pause size={12} /> : <Film size={12} />}
            </button>
            <button onClick={() => setFrame(p => (p - 1 + plotUrls.length) % plotUrls.length)}
              className={`p-1 rounded ${UI.muted} ${UI.hover}`}><ChevronLeft size={12} /></button>
            <button onClick={() => setFrame(p => (p + 1) % plotUrls.length)}
              className={`p-1 rounded ${UI.muted} ${UI.hover}`}><ChevronRight size={12} /></button>
          </>}
          <div className="flex-1" />
          <button onClick={() => downloadImg(plotUrls[frame], frame)}
            className={`p-1 rounded ${UI.muted} hover:text-blue-400 ${UI.hover}`}><Download size={12} /></button>
          <button onClick={() => setLightbox(frame)}
            className={`p-1 rounded ${UI.muted} hover:text-blue-400 ${UI.hover}`}><Maximize2 size={12} /></button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2 hide-scrollbar">
        {plotUrls.length === 0
          ? <div className={`h-full flex flex-col items-center justify-center gap-3 ${UI.muted} opacity-40`}>
              <BarChart2 size={28} />
              <p className="text-xs text-center">No plots yet. Run a script with plot().</p>
            </div>
          : playing
            ? <img src={plotUrls[frame]} alt="frame" className="w-full h-auto rounded-lg" />
            : <div className={`grid gap-2 ${plotUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {plotUrls.map((url, i) => (
                  <div key={i}
                    className={`group relative rounded-lg overflow-hidden border ${UI.border} cursor-pointer`}
                    onClick={() => { setFrame(i); setLightbox(i); }}>
                    <img src={url} alt={`plot ${i + 1}`} className="w-full h-auto" />
                    <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={e => { e.stopPropagation(); setLightbox(i); }}
                        className={`p-1.5 ${UI.card} rounded-full`}><Maximize2 size={11} /></button>
                      <button onClick={e => { e.stopPropagation(); downloadImg(url, i); }}
                        className="p-1.5 bg-blue-600 rounded-full text-white"><Download size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  );

  // Files panel — used in mobile view
  const FilesPanel = () => (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className={`px-3 py-2 border-b ${UI.border} flex items-center justify-between flex-shrink-0`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${UI.muted}`}>Files</span>
        <div className="flex gap-1">
          <button onClick={openFile} className={`p-1.5 ${UI.muted} ${UI.hover}`}><FolderOpen size={14} /></button>
          <button onClick={addFile}  className={`p-1.5 ${UI.muted} ${UI.hover}`}><Plus size={14} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1 hide-scrollbar">
        {files.map(f => <FileRow key={f.id} file={f} />)}
      </div>
      {fsFiles.length > 0 && (
        <div className={`border-t ${UI.border}`}>
          <div className={`px-3 py-1.5 flex items-center justify-between`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>Imported (WebR FS)</span>
            <button onClick={() => refreshFS(webR)} className={`${UI.muted} ${UI.hover} p-0.5`}>
              <RefreshCw size={10} />
            </button>
          </div>
          {fsFiles.map(fname => (
            <div key={fname} className={`px-3 py-1 text-[10px] ${UI.muted} font-mono truncate`}>
              <Database size={9} className="inline mr-1" />{fname}
            </div>
          ))}
        </div>
      )}
      <button onClick={uploadCSV} disabled={isBusy}
        className={`mx-3 mb-3 py-2 text-xs ${UI.muted} border border-dashed ${UI.border}
          hover:border-blue-500/60 hover:text-blue-400 rounded-lg flex items-center justify-center gap-2
          transition-colors disabled:opacity-40`}>
        <Upload size={13} /> Import CSV / data file
      </button>
    </div>
  );

  // Help panel — shared
  const HelpPanel = () => (
    <div className={`flex-1 overflow-y-auto p-4 text-xs space-y-5 hide-scrollbar ${UI.text}`} style={{ userSelect: 'text' }}>
      <div>
        <h3 className="text-blue-400 font-bold mb-2 text-sm">Keyboard shortcuts</h3>
        <div className="space-y-1.5 font-mono">
          {[
            ['Ctrl+Shift+Enter', 'Run full script'],
            ['Ctrl+Enter',       'Run current line / selection'],
            ['Ctrl+S',           'Save file'],
            ['Ctrl+/',           'Toggle comment'],
            ['Ctrl+F',           'Search / replace'],
            ['Ctrl+Z / Y',       'Undo / Redo'],
            ['Tab',              'Indent / autocomplete'],
            ['Ctrl+Shift+F',     'Fullscreen'],
            ['?function',        'Show R help (e.g. ?lm)'],
            ['↑/↓ in console',   'Command history'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <kbd className={`px-1.5 py-0.5 ${UI.card} border ${UI.border} rounded text-blue-400 text-[9px] flex-shrink-0`}>{k}</kbd>
              <span className={UI.muted}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-blue-400 font-bold mb-2 text-sm">Snippets</h3>
        <p className={`${UI.muted} mb-2`}>Type the keyword then Tab or select from autocomplete:</p>
        <div className="grid grid-cols-2 gap-1">
          {SNIPPETS.map(s => (
            <div key={s.label} className={`${UI.card} border ${UI.border} rounded px-2 py-1`}>
              <span className="text-emerald-400 font-mono">{s.label}</span>
              <span className={`ml-2 ${UI.muted} text-[9px]`}>{(s.detail as string)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-blue-400 font-bold mb-2 text-sm">Import data</h3>
        <p className={`${UI.muted} mb-2`}>Use "Import" in the Files tab, then in R:</p>
        <code className={`block ${isDark ? 'bg-[#161b22]' : 'bg-[#f6f8fa]'} border ${UI.border} p-2 rounded text-emerald-400 leading-relaxed`}>
          df &lt;- read.csv("/home/web_user/file.csv")<br />
          head(df); str(df)
        </code>
      </div>
      <div>
        <h3 className="text-blue-400 font-bold mb-2 text-sm">Recommended packages</h3>
        <div className="flex flex-wrap gap-1">
          {['deSolve','survival','pROC','meta','lme4','epitools','epiR','ggplot2','dplyr','boot','MASS'].map(p => (
            <span key={p} className={`${isDark ? 'bg-[#161b22]' : 'bg-white'} border ${UI.border} rounded px-1.5 py-0.5 font-mono text-emerald-400 text-[10px]`}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // Output panel tabs
  const OutputTabs = () => (
    <div className={`flex items-center border-b ${UI.border} ${UI.sidebar} flex-shrink-0`}>
      {([
        { id: 'console',     icon: Terminal,  label: 'Console' },
        { id: 'environment', icon: ListTree,  label: 'Env'     },
        { id: 'plots',       icon: BarChart2, label: plotUrls.length ? `Plots (${plotUrls.length})` : 'Plots' },
        { id: 'help',        icon: BookOpen,  label: 'Help'    },
      ] as const).map(tab => (
        <button key={tab.id} onClick={() => setPanel(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors
            ${panel === tab.id ? UI.tab : `border-transparent ${UI.muted} ${UI.hover}`}`}>
          <tab.icon size={11} />
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
      <div className="flex-1" />
      <button onClick={exportLog} title="Export log"  className={`p-2 ${UI.muted} ${UI.hover}`}><FileText size={11} /></button>
      <button onClick={clearLog}  title="Clear"       className={`p-2 ${UI.muted} ${UI.hover}`}><RotateCcw size={11} /></button>
    </div>
  );

  // Output panel content switcher
  const OutputContent = () => {
    if (panel === 'console')     return <ConsolePanel />;
    if (panel === 'environment') return <EnvironmentPanel />;
    if (panel === 'plots')       return <PlotsPanel />;
    return <HelpPanel />;
  };

  // Shared header (run/stop buttons, file tabs, package install)
  const Header = () => (
    <header className={`h-12 px-3 flex items-center gap-2 ${UI.sidebar} border-b ${UI.border} flex-shrink-0 z-10`}>
      {/* File tabs */}
      <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 hide-scrollbar">
        {files.map(file => (
          <div key={file.id}
            onClick={() => { setActiveId(file.id); activeIdRef.current = file.id; }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs cursor-pointer flex-shrink-0 border-b-2 transition-all
              ${activeId === file.id
                ? `${isDark ? 'bg-[#0d1117] text-slate-200' : 'bg-white text-[#1f2328]'} border-blue-500`
                : `${UI.muted} border-transparent ${UI.hover}`}`}
          >
            <FileCode2 size={10} />
            <span className="max-w-[100px] truncate">{file.name}</span>
            {!file.saved && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            <button onClick={e => { e.stopPropagation(); closeFile(file.id); }}
              className={`ml-0.5 p-0.5 ${UI.muted} hover:text-red-400 rounded opacity-50 hover:opacity-100`}>
              <X size={9} />
            </button>
          </div>
        ))}
        <button onClick={addFile} className={`p-1.5 ${UI.muted} ${UI.hover} rounded-md flex-shrink-0`}>
          <Plus size={14} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={() => saveFile()}    className={`p-1.5 ${UI.muted} ${UI.hover} rounded-md`} title="Save (Ctrl+S)"><Save size={14} /></button>
        <button onClick={executeLine} disabled={isBusy} className={`p-1.5 ${UI.muted} ${UI.hover} rounded-md disabled:opacity-30`} title="Run line (Ctrl+Enter)"><CornerDownRight size={14} /></button>

        {/* Package installer */}
        <div className={`hidden md:flex items-center gap-1 ${isDark ? 'bg-[#0d1117]' : 'bg-white'} border ${UI.border} rounded-lg px-2 py-1`}>
          <Package size={11} className={UI.muted} />
          <input value={pkg} onChange={e => setPkg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && installPkg()}
            placeholder="Package…"
            className={`w-20 bg-transparent text-xs outline-none ${UI.text} placeholder:text-slate-500`} />
          <button onClick={installPkg} disabled={isBusy || !pkg.trim()} className="text-blue-400 hover:text-blue-300 disabled:opacity-30">
            {installing ? <Loader2 size={12} className="animate-spin" /> : <DownloadCloud size={12} />}
          </button>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isDark ? 'bg-[#0d1117]' : 'bg-white'} border ${UI.border} text-[10px] font-bold uppercase tracking-wider`}>
          <div className={`w-2 h-2 rounded-full ${sm.dot} ${sm.pulse ? 'animate-pulse' : ''}`} />
          <span className={`hidden sm:inline ${UI.muted}`}>{sm.label}</span>
        </div>

        {/* Stop button — only shown while running */}
        {status === 'running' && (
          <button onClick={stopExec}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-all"
            title="Interrupt">
            <Square size={12} fill="currentColor" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}

        {/* Run button */}
        <button onClick={execute} disabled={isBusy}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
          {status === 'running' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
          <span className="hidden sm:inline">Run</span>
          <kbd className="hidden lg:inline text-[9px] opacity-60 font-normal">⌃⇧↵</kbd>
        </button>
      </div>
    </header>
  );

  // Status bar
  const StatusBar = () => (
    <div className="h-6 px-4 flex items-center gap-4 bg-blue-700 text-[10px] text-blue-200 flex-shrink-0 font-mono">
      <span className="flex items-center gap-1"><Cpu size={9} /> WebR 4.x</span>
      <span className="flex items-center gap-1"><Clock size={9} /> {clock}</span>
      {(status === 'running' || status === 'installing') && (
        <span className="flex items-center gap-1 text-blue-100 font-bold">
          <Loader2 size={9} className="animate-spin" /> {elapsed}s
        </span>
      )}
      {activeFile && <span className="hidden sm:inline">{activeFile.name} · {activeFile.code.split('\n').length} L</span>}
      {memMB !== null && <span className="hidden sm:flex items-center gap-1"><Database size={9} /> {memMB} MB</span>}
      <span className="ml-auto flex items-center gap-2">
        {sm.label}
        <button onClick={() => setFullscreen(v => !v)} className="hover:text-white transition-colors" title="Fullscreen (Ctrl+Shift+F)">
          {fullscreen ? <Minimize size={10} /> : <Maximize size={10} />}
        </button>
      </span>
    </div>
  );

  // Mobile bottom navigation
  const MobileNav = () => (
    <nav className={`lg:hidden flex-shrink-0 ${UI.sidebar} border-t ${UI.border} flex items-center justify-around px-2 py-1 z-20`}>
      {([
        { id: 'editor',  icon: Code2,     label: 'Editor'  },
        { id: 'console', icon: Terminal,  label: 'Console' },
        { id: 'files',   icon: Layers,    label: 'Files'   },
        { id: 'plots',   icon: BarChart2, label: `Plots${plotUrls.length ? ` (${plotUrls.length})` : ''}` },
      ] as const).map(tab => (
        <button key={tab.id} onClick={() => setMobileTab(tab.id)}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-[10px] transition-all
            ${mobileTab === tab.id
              ? 'text-blue-400 bg-blue-600/15'
              : `${UI.muted} ${UI.hover}`}`}>
          <tab.icon size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className={`flex h-screen w-full ${UI.bg} ${UI.text} font-sans overflow-hidden
      ${fullscreen ? 'fixed inset-0 z-[200]' : ''}`}>

      {/* Vertical icon sidebar — desktop only */}
      <nav className={`hidden lg:flex ${fullscreen ? '!hidden' : ''} w-14 ${UI.sidebar} border-r ${UI.border}
        flex-col items-center py-3 gap-1 flex-shrink-0 z-20`}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mb-3 flex-shrink-0">
          <Code2 size={15} className="text-white" />
        </div>

        {([
          { icon: Layers,     tip: 'Explorer',     action: () => setShowExp(v => !v),       active: showExp         },
          { icon: Terminal,   tip: 'Console',       action: () => setPanel('console'),       active: panel==='console'     },
          { icon: ListTree,   tip: 'Environment',   action: () => setPanel('environment'),   active: panel==='environment' },
          { icon: BarChart2,  tip: 'Plots',         action: () => setPanel('plots'),         active: panel==='plots'       },
          { icon: HelpCircle, tip: 'Help',          action: () => setPanel('help'),          active: panel==='help'        },
        ] as const).map((item, i) => (
          <button key={i} onClick={item.action} title={item.tip}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all
              ${item.active ? 'bg-blue-600/20 text-blue-400' : `${UI.muted} ${UI.hover}`}`}>
            <item.icon size={18} />
          </button>
        ))}

        <div className="flex-1" />

        {/* Theme toggle — only if ThemeProvider allows switching */}
        {switchable && (
          <button onClick={toggleTheme} title={isDark ? 'Light theme' : 'Dark theme'}
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${UI.muted} ${UI.hover}`}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
        <button onClick={() => setFontSize(s => Math.max(10, s - 1))} title="Decrease font"
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${UI.muted} ${UI.hover} text-[11px] font-bold`}>A-</button>
        <button onClick={() => setFontSize(s => Math.min(22, s + 1))} title="Increase font"
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${UI.muted} ${UI.hover} text-[11px] font-bold`}>A+</button>
      </nav>

      {/* File explorer sidebar — desktop only */}
      {showExp && !fullscreen && (
        <aside className={`hidden lg:flex w-56 ${UI.sidebar} border-r ${UI.border} flex-col flex-shrink-0`}>
          <div className={`px-3 py-2 border-b ${UI.border} flex items-center justify-between`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${UI.muted}`}>Files</span>
            <div className="flex gap-1">
              <button onClick={openFile} title="Open" className={`p-1 rounded ${UI.muted} ${UI.hover}`}><FolderOpen size={12} /></button>
              <button onClick={addFile}  title="New"  className={`p-1 rounded ${UI.muted} ${UI.hover}`}><Plus size={12} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1 hide-scrollbar">
            {files.map(f => <FileRow key={f.id} file={f} />)}
          </div>
          {fsFiles.length > 0 && (
            <>
              <div className={`px-3 py-1 border-t ${UI.border} flex items-center justify-between`}>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${UI.muted}`}>Imported files</span>
                <button onClick={() => refreshFS(webR)} className={`${UI.muted} ${UI.hover} p-0.5 rounded`}><RefreshCw size={10} /></button>
              </div>
              {fsFiles.map(fname => (
                <div key={fname} className={`px-3 py-1 text-[10px] ${UI.muted} font-mono truncate`}>
                  <Database size={9} className="inline mr-1" />{fname}
                </div>
              ))}
            </>
          )}
          <button onClick={uploadCSV} disabled={isBusy}
            className={`mx-3 mb-3 py-1.5 text-[10px] ${UI.muted} border border-dashed ${UI.border}
              hover:border-blue-500/60 hover:text-blue-400 rounded-lg flex items-center justify-center gap-1.5
              transition-colors disabled:opacity-40`}>
            <Upload size={11} /> Import CSV / data
          </button>
        </aside>
      )}

      {/* Context menu */}
      {ctxMenu.visible && (
        <div ref={ctxRef} style={{ top: ctxMenu.y, left: ctxMenu.x }}
          className={`fixed z-[60] ${UI.card} border ${UI.border} rounded-lg shadow-2xl py-1 min-w-[160px]`}>
          {[
            { icon: Edit2, label: 'Rename',    fn: () => { const f = files.find(x => x.id === ctxMenu.fileId); setRenaming(ctxMenu.fileId); setNewName(f?.name ?? ''); setCtxMenu(p => ({ ...p, visible: false })); } },
            { icon: Copy,  label: 'Duplicate', fn: () => { copyFile(ctxMenu.fileId); setCtxMenu(p => ({ ...p, visible: false })); } },
            { icon: Save,  label: 'Save',      fn: () => { saveFile(ctxMenu.fileId); setCtxMenu(p => ({ ...p, visible: false })); } },
          ].map(item => (
            <button key={item.label} onClick={item.fn}
              className={`w-full text-left px-3 py-1.5 text-xs ${UI.text} ${UI.hover} flex items-center gap-2`}>
              <item.icon size={12} />{item.label}
            </button>
          ))}
          <div className={`my-1 border-t ${UI.border}`} />
          <button onClick={() => { closeFile(ctxMenu.fileId); setCtxMenu(p => ({ ...p, visible: false })); }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 flex items-center gap-2">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        {/* Layout: editor + output panel.
            editorDivRef must stay in the DOM at all times  CodeMirror cannot be moved.
            Use inline display:none instead of conditional rendering on mobile. */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* Editor column — always in the DOM, never unmounted */}
          <div
            className={`flex flex-col overflow-hidden flex-1 ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}
            style={{ display: isMobile && mobileTab !== 'editor' ? 'none' : 'flex' }}
          >
            <div className={`h-7 px-4 flex items-center gap-2 ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'} border-b ${UI.border} text-[10px] ${UI.muted} flex-shrink-0`}>
              <FileCode2 size={9} />
              <span>{activeFile?.name ?? '—'}</span>
              <span>{(activeFile?.code ?? '').split('\n').length} lines</span>
              <span className="ml-auto hidden sm:inline">{fontSize}px · R · {isDark ? 'Dark' : 'Light'}</span>
            </div>
            {/* Single CodeMirror mount point */}
            <div ref={editorDivRef} className="flex-1 overflow-hidden" style={{ userSelect: 'text' }} />
          </div>

          {/* Drag resize handle — desktop only */}
          {!isMobile && (
            <div onMouseDown={onDragStart}
              className={`w-1 flex-shrink-0 ${isDark ? 'bg-[#30363d] hover:bg-blue-500' : 'bg-[#d0d7de] hover:bg-blue-400'} cursor-col-resize transition-colors z-10`} />
          )}

          {/* Output panel */}
          <div
            className={`flex flex-col overflow-hidden border-l ${UI.border} ${isDark ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}
            style={{
              width: isMobile ? '100%' : panelW,
              display: isMobile && mobileTab === 'editor' ? 'none' : 'flex',
            }}
          >
            {!isMobile && <><OutputTabs /><OutputContent /></>}
            {isMobile && mobileTab === 'console' && <ConsolePanel />}
            {isMobile && mobileTab === 'files'   && <FilesPanel />}
            {isMobile && mobileTab === 'plots'   && <PlotsPanel />}
          </div>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav />

        <StatusBar />
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-[100] bg-black/96 backdrop-blur-xl flex flex-col">
          <header className="flex justify-between items-center px-6 py-4 text-white flex-shrink-0">
            <span className="font-mono text-sm text-slate-400">Plot {lightbox + 1} / {plotUrls.length}</span>
            <div className="flex gap-2">
              {lightbox > 0               && <button onClick={() => setLightbox(lightbox - 1)} className="p-2 hover:bg-white/10 rounded-full"><ChevronLeft  size={20} /></button>}
              {lightbox < plotUrls.length - 1 && <button onClick={() => setLightbox(lightbox + 1)} className="p-2 hover:bg-white/10 rounded-full"><ChevronRight size={20} /></button>}
              <button onClick={() => downloadImg(plotUrls[lightbox], lightbox)} className="p-2 hover:bg-white/10 rounded-full"><Download size={20} /></button>
              <button onClick={() => setLightbox(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={plotUrls[lightbox]} alt="Plot" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { width:4px; height:4px; }
        .hide-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background:#30363d; border-radius:10px; }
        .cm-editor { height:100% !important; }
        .cm-scroller { overflow:auto !important; }
        .cm-editor .cm-completionIcon-function::after { content:"ƒ "; color:#d2a8ff; }
        .cm-editor .cm-completionIcon-keyword::after  { content:"⌨ "; color:#ff7b72; }
      `}</style>
    </div>
  );
}