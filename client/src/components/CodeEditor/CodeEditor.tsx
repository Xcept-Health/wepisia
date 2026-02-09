"use client";

import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  language: 'r' | 'other';
  onChange: (value: string) => void;
  height?: string;
  theme?: 'light' | 'dark';
  readOnly?: boolean;
  onMount?: (editor: any) => void;
}

export default function CodeEditor({
  value,
  language = 'r',
  onChange,
  height = '100%',
  theme = 'light',
  readOnly = false,
  onMount
}: CodeEditorProps) {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    
    // Configuration spécifique pour R
    if (language === 'r') {
      // Activer le pliage de code
      editor.updateOptions({
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'always'
      });
      
      // Configuration des suggestions
      const monaco = (window as any).monaco;
      monaco.languages.registerCompletionItemProvider('r', {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };

          // Suggestions pour R
          const suggestions = [
            // Fonctions statistiques
            { label: 'mean', kind: monaco.languages.CompletionItemKind.Function, insertText: 'mean(${1:x})', documentation: 'Calcule la moyenne' },
            { label: 'sd', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sd(${1:x})', documentation: 'Écart-type' },
            { label: 'summary', kind: monaco.languages.CompletionItemKind.Function, insertText: 'summary(${1:object})', documentation: 'Résumé statistique' },
            { label: 'lm', kind: monaco.languages.CompletionItemKind.Function, insertText: 'lm(${1:formula}, data=${2:df})', documentation: 'Régression linéaire' },
            { label: 'glm', kind: monaco.languages.CompletionItemKind.Function, insertText: 'glm(${1:formula}, family=${2:binomial}, data=${3:df})', documentation: 'Modèle linéaire généralisé' },
            
            // Fonctions épidémiologiques
            { label: 'riskratio', kind: monaco.languages.CompletionItemKind.Function, insertText: 'riskratio(${1:a}, ${2:b}, ${3:c}, ${4:d})', documentation: 'Calcul du risque relatif' },
            { label: 'oddsratio', kind: monaco.languages.CompletionItemKind.Function, insertText: 'oddsratio(${1:a}, ${2:b}, ${3:c}, ${4:d})', documentation: 'Calcul du odds ratio' },
            
            // Bibliothèques courantes
            { label: 'library', kind: monaco.languages.CompletionItemKind.Function, insertText: 'library(${1:package})', documentation: 'Charger un package' },
            { label: 'require', kind: monaco.languages.CompletionItemKind.Function, insertText: 'require(${1:package})', documentation: 'Charger un package (avec retour)' },
            
            // Structures de contrôle
            { label: 'function', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '${1:name} <- function(${2:args}) {\n\t${3:# code}\n}', documentation: 'Définir une fonction' },
            { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for (${1:variable} in ${2:sequence}) {\n\t${3:# code}\n}', documentation: 'Boucle for' },
            { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if (${1:condition}) {\n\t${2:# code}\n}', documentation: 'Condition if' },
            { label: 'else', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'else {\n\t${1:# code}\n}', documentation: 'Condition else' },
            
            // Packages d'épidémiologie
            { label: 'epiR', kind: monaco.languages.CompletionItemKind.Module, insertText: 'epiR', documentation: 'Package pour analyses épidémiologiques' },
            { label: 'survival', kind: monaco.languages.CompletionItemKind.Module, insertText: 'survival', documentation: 'Analyses de survie' },
            { label: 'meta', kind: monaco.languages.CompletionItemKind.Module, insertText: 'meta', documentation: 'Méta-analyses' },
          ];

          return { suggestions };
        }
      });
    }
    
    if (onMount) onMount(editor);
  };

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Chargement de l'éditeur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height={height}
        language={language === 'r' ? 'r' : 'plaintext'}
        value={value}
        theme={monacoTheme}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
          wordWrap: 'on',
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: true,
          snippets: true,
          folding: true,
          foldingHighlight: true,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          mouseWheelZoom: true,
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false
          },
          // Options spécifiques R
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          // Paramètres de complétion
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          parameterHints: { enabled: true },
        }}
      />
    </div>
  );
}