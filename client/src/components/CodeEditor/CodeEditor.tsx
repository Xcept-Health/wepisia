"use client";

import { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { langs } from '@uiw/codemirror-extensions-langs';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { useTheme } from '@/contexts/ThemeContext';
import { StreamLanguage } from '@codemirror/language';
import { r } from '@codemirror/legacy-modes/mode/r';

interface CodeEditorProps {
  value: string;
  language: 'python' | 'r' | 'javascript';
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  language,
  onChange,
  height = '500px',
  readOnly = false
}: CodeEditorProps) {
  const { theme } = useTheme();
  const [extensions, setExtensions] = useState<any[]>([]);

  useEffect(() => {
    switch (language) {
      case 'python':
        setExtensions([python()]);
        break;
      case 'r':
        // Utilisez le mode R hérité (legacy)
        setExtensions([StreamLanguage.define(r)]);
        // Alternative: utilisez l'extension de langues (moins de fonctionnalités)
        // setExtensions([langs.r()]);
        break;
      case 'javascript':
        setExtensions([javascript()]);
        break;
      default:
        setExtensions([]);
    }
  }, [language]);

  return (
    <div className="h-full overflow-hidden">
      <CodeMirror
        value={value}
        height={height}
        theme={theme === 'dark' ? githubDark : githubLight}
        extensions={extensions}
        onChange={onChange}
        readOnly={readOnly}
        className="h-full text-sm"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          drawSelection: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  );
}