"use client";
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Code, Play, Save, Download, Copy, Terminal, BarChart3,
  Braces, ChevronRight, X, Maximize2, Minimize2, Bot,
  Share2, FileCode, PanelLeftClose, PanelLeftOpen,
  Check, Zap, AlertCircle, RefreshCw, Sparkles, Languages,
  Folder, File, Plus, Trash2, FolderPlus, Archive, FileArchive,
  Edit2, FileText, FileSpreadsheet, FileJson, FileImage,
  FolderOpen, FolderClosed, ChevronRight as ChevronRightIcon,
  ChevronDown, Search, MoreVertical, Upload, FileUp,
  FolderTree, FolderInput, FolderOutput, FilePlus,
  FileMinus, FileEdit, FileSearch, FileSymlink,
  FileX, FileCheck, FileWarning, FileDiff,
  FileType2, FileType, Type, Hash, Loader2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CodeEditor from '@/components/CodeEditor/CodeEditor';
import ChatbotMini from '@/components/Chatbot/ChatbotMini';
import JSZip from 'jszip';
import * as pyodidePackage from 'pyodide';
import { loadPyodide } from 'pyodide';

interface WorkspaceFile {
  id: string;
  name: string;
  language: 'python' | 'r' | 'javascript' | 'other';
  code: string;
  lastModified: Date;
  size: number;
  type: 'file';
  path: string;
  parentId: string | null;
  extension: string;
}

interface WorkspaceFolder {
  id: string;
  name: string;
  type: 'folder';
  path: string;
  parentId: string | null;
  children: string[];
  expanded: boolean;
}

type WorkspaceItem = WorkspaceFile | WorkspaceFolder;

interface WorkspaceState {
  items: Record<string, WorkspaceItem>;
  activeFileId: string | null;
  currentFolderId: string | null;
  output: string;
  variables: Record<string, any>;
  autoRun: boolean;
}

interface CodeAnalysis {
  isValid: boolean;
  detectedLanguage?: 'python' | 'r' | 'javascript';
  suggestions: string[];
  errors: string[];
}

export default function WorkspacePage() {
  const [location, setLocation] = useLocation();
  const [state, setState] = useState<WorkspaceState>({
    items: {
      'root': {
        id: 'root',
        name: 'Workspace',
        type: 'folder',
        path: '/',
        parentId: null,
        children: ['file1', 'folder1'],
        expanded: true
      },
      'file1': {
        id: 'file1',
        name: 'analyse_r.r',
        language: 'r',
        code: '# Bienvenue dans l\'atelier d\'analyse OpenEPI\n# Vous pouvez écrire du code R ou Python ici\n\n# Exemple : Calcul de risque relatif\ncalculate_rr <- function(a, b, c, d) {\n risk_exposed <- a / (a + b)\n risk_unexposed <- c / (c + d)\n return(risk_exposed / risk_unexposed)\n}\n\n# Test avec des données d\'exemple\nrr <- calculate_rr(70, 30, 30, 70)\nprint(paste("Risque relatif:", round(rr, 2)))',
        lastModified: new Date(),
        size: 1024,
        type: 'file',
        path: '/analyse_r.r',
        parentId: 'root',
        extension: '.r'
      },
      'folder1': {
        id: 'folder1',
        name: 'Analyses',
        type: 'folder',
        path: '/Analyses',
        parentId: 'root',
        children: [],
        expanded: false
      }
    },
    activeFileId: 'file1',
    currentFolderId: 'root',
    output: '',
    variables: {},
    autoRun: false
  });
  const [activeTab, setActiveTab] = useState('terminal');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [codeAnalysis, setCodeAnalysis] = useState<CodeAnalysis | null>(null);
  const [showConversionAlert, setShowConversionAlert] = useState(false);
  const [pendingLanguageChange, setPendingLanguageChange] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  const [webR, setWebR] = useState<any>(null);

  // États pour les modals et actions
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [itemToRename, setItemToRename] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingItemName, setRenamingItemName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const runTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastLanguageChangeTime = useRef<number>(Date.now());

  // Récupérer le fichier actif et le dossier courant
  const activeFile = state.activeFileId ? (state.items[state.activeFileId] as WorkspaceFile) : null;
  const currentFolder = state.currentFolderId ? (state.items[state.currentFolderId] as WorkspaceFolder) : null;
  const rootFolder = state.items['root'] as WorkspaceFolder;

  // Initialiser Pyodide et WebR
  useEffect(() => {
    async function initRuntimes() {
      // Pyodide for Python
      const py = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
      });
      setPyodide(py);

      // WebR for R
      const { WebR } = await import('webr');
      const wr = new WebR();
      await wr.init();
      setWebR(wr);
    }
    initRuntimes();
  }, []);

  // Récupérer depuis l'URL ou le localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    const langFromUrl = params.get('lang') as WorkspaceFile['language'];

    if (codeFromUrl) {
      const newFileId = `imported_${Date.now()}`;
      const extension = getExtensionFromLanguage(langFromUrl || 'r');

      setState(prev => ({
        ...prev,
        items: {
          ...prev.items,
          [newFileId]: {
            id: newFileId,
            name: `imported${extension}`,
            language: langFromUrl || 'r',
            code: decodeURIComponent(codeFromUrl),
            lastModified: new Date(),
            size: codeFromUrl.length,
            type: 'file',
            path: `/imported${extension}`,
            parentId: 'root',
            extension
          },
          'root': {
            ...(prev.items['root'] as WorkspaceFolder),
            children: [...(prev.items['root'] as WorkspaceFolder).children, newFileId]
          }
        },
        activeFileId: newFileId
      }));
    } else {
      const saved = localStorage.getItem('openepi_workspace_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convertir les dates strings en objets Date
        const itemsWithDates = Object.keys(parsed.items).reduce((acc, key) => {
          const item = parsed.items[key];
          if (item.type === 'file') {
            acc[key] = { ...item, lastModified: new Date(item.lastModified) };
          } else {
            acc[key] = item;
          }
          return acc;
        }, {} as Record<string, WorkspaceItem>);

        setState({ ...parsed, items: itemsWithDates });
      }
    }
  }, []);

  // Sauvegarder automatiquement
  useEffect(() => {
    const toSave = { ...state };
    localStorage.setItem('openepi_workspace_state', JSON.stringify(toSave));
  }, [state]);

  // Focus sur l'input de renommage quand il apparaît
  useEffect(() => {
    if (renamingItemId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingItemId]);

  // Fonctions utilitaires
  const getExtensionFromLanguage = (language: WorkspaceFile['language']): string => {
    switch (language) {
      case 'python': return '.py';
      case 'r': return '.r';
      case 'javascript': return '.js';
      default: return '.txt';
    }
  };

  const getLanguageFromExtension = (extension: string): WorkspaceFile['language'] => {
    switch (extension.toLowerCase()) {
      case '.py': return 'python';
      case '.r': return 'r';
      case '.js': return 'javascript';
      default: return 'other';
    }
  };

  const isValidExtension = (filename: string): boolean => {
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')).toLowerCase() : '';
    return ['.r', '.py', '.js', '.txt', '.csv', '.json', '.md'].includes(ext);
  };

  const getFileIcon = (extension: string) => {
    switch (extension.toLowerCase()) {
      case '.r': return <FileType className="w-4 h-4 text-blue-600" />;
      case '.py': return <FileType className="w-4 h-4 text-green-600" />;
      case '.js': return <Type className="w-4 h-4 text-yellow-500" />;
      case '.txt': return <FileText className="w-4 h-4 text-gray-600" />;
      case '.csv': return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case '.json': return <FileJson className="w-4 h-4 text-purple-600" />;
      case '.md': return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  // Gestion des fichiers et dossiers
  const handleCreateFile = () => {
    if (!newItemName.trim() || !isValidExtension(newItemName)) {
      alert("Nom de fichier invalide. Extension autorisée: .r, .py, .js, .txt, .csv, .json, .md");
      return;
    }
    const extension = newItemName.includes('.')
      ? newItemName.substring(newItemName.lastIndexOf('.')).toLowerCase()
      : '.txt';

    const language = getLanguageFromExtension(extension);
    const newId = `file_${Date.now()}`;
    const parentId = state.currentFolderId || 'root';
    setState(prev => {
      const parent = prev.items[parentId] as WorkspaceFolder;

      return {
        ...prev,
        items: {
          ...prev.items,
          [newId]: {
            id: newId,
            name: newItemName,
            language,
            code: `# Nouveau fichier ${extension}\n# Créé le ${new Date().toLocaleDateString()}\n\n# Commencez à écrire votre code ici...`,
            lastModified: new Date(),
            size: 0,
            type: 'file',
            path: `${parent.path}/${newItemName}`,
            parentId,
            extension
          },
          [parentId]: {
            ...parent,
            children: [...parent.children, newId],
            expanded: true
          }
        },
        activeFileId: newId
      };
    });
    setShowCreateFileModal(false);
    setNewItemName('');
  };

  const handleCreateFolder = () => {
    if (!newItemName.trim()) {
      alert("Nom du dossier requis");
      return;
    }
    const newId = `folder_${Date.now()}`;
    const parentId = state.currentFolderId || 'root';
    setState(prev => {
      const parent = prev.items[parentId] as WorkspaceFolder;

      return {
        ...prev,
        items: {
          ...prev.items,
          [newId]: {
            id: newId,
            name: newItemName,
            type: 'folder',
            path: `${parent.path}/${newItemName}`,
            parentId,
            children: [],
            expanded: false
          },
          [parentId]: {
            ...parent,
            children: [...parent.children, newId],
            expanded: true
          }
        }
      };
    });
    setShowCreateFolderModal(false);
    setNewItemName('');
  };

  const handleRenameItem = () => {
    if (!itemToRename || !newItemName.trim()) return;
    const item = state.items[itemToRename];

    if (item.type === 'file') {
      const file = item as WorkspaceFile;
      const oldExtension = file.extension;
      const newExtension = newItemName.includes('.')
        ? newItemName.substring(newItemName.lastIndexOf('.')).toLowerCase()
        : oldExtension;

      if (!isValidExtension(newItemName)) {
        alert("Extension invalide. Autorisé: .r, .py, .js, .txt, .csv, .json, .md");
        return;
      }
      const newLanguage = getLanguageFromExtension(newExtension);

      setState(prev => ({
        ...prev,
        items: {
          ...prev.items,
          [itemToRename]: {
            ...file,
            name: newItemName,
            language: newLanguage,
            extension: newExtension,
            lastModified: new Date()
          }
        }
      }));
    } else {
      const folder = item as WorkspaceFolder;

      setState(prev => ({
        ...prev,
        items: {
          ...prev.items,
          [itemToRename]: {
            ...folder,
            name: newItemName,
            path: folder.path.replace(/\/[^\/]+$/, `/${newItemName}`)
          }
        }
      }));
    }
    setShowRenameModal(false);
    setItemToRename(null);
    setNewItemName('');
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    const item = state.items[itemToDelete];

    // Si c'est le root, on ne peut pas le supprimer
    if (itemToDelete === 'root') {
      alert("Impossible de supprimer le dossier racine");
      return;
    }
    // Récursivement supprimer les enfants
    const deleteRecursive = (id: string) => {
      const item = state.items[id];
      if (item.type === 'folder') {
        const folder = item as WorkspaceFolder;
        folder.children.forEach(childId => deleteRecursive(childId));
      }
      delete state.items[id];
    };
    deleteRecursive(itemToDelete);
    // Retirer de la liste des enfants du parent
    if (item.parentId) {
      const parent = state.items[item.parentId] as WorkspaceFolder;
      setState(prev => ({
        ...prev,
        items: {
          ...prev.items,
          [item.parentId!]: {
            ...parent,
            children: parent.children.filter(id => id !== itemToDelete)
          }
        },
        activeFileId: prev.activeFileId === itemToDelete ? null : prev.activeFileId,
        currentFolderId: prev.currentFolderId === itemToDelete ? 'root' : prev.currentFolderId
      }));
    }
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleDownloadFile = (fileId: string) => {
    const file = state.items[fileId] as WorkspaceFile;
    const blob = new Blob([file.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFolder = async (folderId: string) => {
    const folder = state.items[folderId] as WorkspaceFolder;
    const zip = new JSZip();

    const addToZip = (id: string, currentPath: string) => {
      const item = state.items[id];

      if (item.type === 'file') {
        const file = item as WorkspaceFile;
        zip.file(`${currentPath}/${file.name}`, file.code);
      } else {
        const subFolder = item as WorkspaceFolder;
        const folderPath = `${currentPath}/${subFolder.name}`;
        subFolder.children.forEach(childId => addToZip(childId, folderPath));
      }
    };
    folder.children.forEach(childId => addToZip(childId, folder.name));

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folder.name}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const root = state.items['root'] as WorkspaceFolder;

    const addToZip = (id: string, currentPath: string) => {
      const item = state.items[id];

      if (item.type === 'file') {
        const file = item as WorkspaceFile;
        zip.file(`${currentPath}/${file.name}`, file.code);
      } else if (id !== 'root') {
        const folder = item as WorkspaceFolder;
        const folderPath = `${currentPath}/${folder.name}`;
        folder.children.forEach(childId => addToZip(childId, folderPath));
      } else {
        const folder = item as WorkspaceFolder;
        folder.children.forEach(childId => addToZip(childId, currentPath));
      }
    };
    addToZip('root', '');

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadFile = async () => {
    if (!uploadedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const extension = uploadedFile.name.substring(uploadedFile.name.lastIndexOf('.')).toLowerCase();
      const language = getLanguageFromExtension(extension);
      const newId = `file_${Date.now()}`;
      const parentId = state.currentFolderId || 'root';

      setState(prev => {
        const parent = prev.items[parentId] as WorkspaceFolder;
        return {
          ...prev,
          items: {
            ...prev.items,
            [newId]: {
              id: newId,
              name: uploadedFile.name,
              language,
              code: content,
              lastModified: new Date(),
              size: content.length,
              type: 'file',
              path: `${parent.path}/${uploadedFile.name}`,
              parentId,
              extension
            },
            [parentId]: {
              ...parent,
              children: [...parent.children, newId],
              expanded: true
            }
          },
          activeFileId: newId
        };
      });
      setShowUploadModal(false);
      setUploadedFile(null);
    };
    reader.readAsText(uploadedFile);
  };

  const handleSelectFile = (fileId: string) => {
    const file = state.items[fileId] as WorkspaceFile;
    if (file.language === 'other') {
      alert("Ce type de fichier ne peut pas être édité dans l'éditeur de code");
      return;
    }
    setState(prev => ({ ...prev, activeFileId: fileId }));
  };

  const handleSelectFolder = (folderId: string) => {
    const folder = state.items[folderId] as WorkspaceFolder;
    setState(prev => ({
      ...prev,
      currentFolderId: folderId,
      items: {
        ...prev.items,
        [folderId]: { ...folder, expanded: !folder.expanded }
      }
    }));
  };

  const handleCodeChange = (value: string) => {
    if (!activeFile) return;

    setState(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [prev.activeFileId!]: {
          ...(prev.items[prev.activeFileId!] as WorkspaceFile),
          code: value,
          lastModified: new Date(),
          size: value.length
        }
      }
    }));

    // Analyse si auto-run activé
    if (state.autoRun) {
      const analysis = analyzeCode(value, activeFile.language);
      setCodeAnalysis(analysis);
      handleRunCode(); // Auto-exécuter si activé
    }
  };

  // Fonctions pour l'analyse et la conversion
  const analyzeCode = (code: string, currentLanguage: WorkspaceFile['language']): CodeAnalysis => {
    const analysis: CodeAnalysis = {
      isValid: true,
      suggestions: [],
      errors: []
    };
    // Détection améliorée avec plus de patterns
    const lines = code.split('\n');
    const rPatterns = ['<-', '%>%', 'library(', 'function(', 'print(paste'];
    const pythonPatterns = ['def ', 'import ', 'print(f"', 'class '];
    const jsPatterns = ['function ', 'const ', 'let ', 'console.log(', '=>'];

    const rCount = rPatterns.reduce((count, pat) => count + lines.filter(line => line.includes(pat)).length, 0);
    const pyCount = pythonPatterns.reduce((count, pat) => count + lines.filter(line => line.includes(pat)).length, 0);
    const jsCount = jsPatterns.reduce((count, pat) => count + lines.filter(line => line.includes(pat)).length, 0);

    let detected = currentLanguage;
    if (rCount > pyCount && rCount > jsCount) detected = 'r';
    else if (pyCount > rCount && pyCount > jsCount) detected = 'python';
    else if (jsCount > rCount && jsCount > pyCount) detected = 'javascript';

    if (detected !== currentLanguage) {
      analysis.detectedLanguage = detected;
      analysis.suggestions.push(`Code détecté comme ${detected.toUpperCase()}. Considérer une conversion automatique.`);
      analysis.isValid = false;
    }

    // Vérification basique d'erreurs
    if (code.includes('syntax error')) analysis.errors.push('Potentielle erreur de syntaxe détectée.');

    return analysis;
  };

  const handleLanguageChange = (lang: WorkspaceFile['language']) => {
    if (!activeFile) return;

    lastLanguageChangeTime.current = Date.now();
    const analysis = analyzeCode(activeFile.code, lang);

    if (analysis.detectedLanguage && analysis.detectedLanguage !== lang) {
      setPendingLanguageChange(lang);
      setCodeAnalysis(analysis);
      setShowConversionAlert(true);
    } else {
      updateFileLanguage(lang);
    }
  };

  const updateFileLanguage = (lang: WorkspaceFile['language']) => {
    setState(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [prev.activeFileId!]: {
          ...(prev.items[prev.activeFileId!] as WorkspaceFile),
          language: lang,
          name: (prev.items[prev.activeFileId!] as WorkspaceFile).name.replace(
            /\.(r|py|js)$/,
            lang === 'python' ? '.py' : lang === 'javascript' ? '.js' : '.r'
          ),
          extension: getExtensionFromLanguage(lang)
        }
      }
    }));
    setState(prev => ({ ...prev, autoRun: false }));
  };

  const handleConvertCode = () => {
    if (!pendingLanguageChange || !codeAnalysis || !activeFile) return;

    let convertedCode = activeFile.code;

    // Conversions améliorées avec plus de règles
    if (activeFile.language === 'r' && pendingLanguageChange === 'python') {
      convertedCode = convertedCode
        .replace(/<-/g, '=')
        .replace(/function\((.*?)\)/g, 'def $1:')
        .replace(/print\(paste\((.*?)\)\)/g, 'print(f"$1")')
        .replace(/library\((.*?)\)/g, 'import $1')
        .replace(/\[/g, '[') // Ajustements supplémentaires si nécessaire
        .replace(/\$/g, '.');
    } else if (activeFile.language === 'python' && pendingLanguageChange === 'r') {
      convertedCode = convertedCode
        .replace(/def (.*?):/g, '$1 <- function(')
        .replace(/print\(f"(.*?)"\)/g, 'print(paste($1))')
        .replace(/import (.*?)/g, 'library($1)')
        .replace(/\./g, '$');
    } else if (activeFile.language === 'r' && pendingLanguageChange === 'javascript') {
      convertedCode = convertedCode
        .replace(/<-/g, '=')
        .replace(/function\((.*?)\)/g, 'function($1)')
        .replace(/print\(paste\((.*?)\)\)/g, 'console.log($1)')
        .replace(/library\((.*?)\)/g, '// Import $1 (JS equivalent)');
    } else if (activeFile.language === 'javascript' && pendingLanguageChange === 'r') {
      convertedCode = convertedCode
        .replace(/function\((.*?)\)/g, 'function($1)')
        .replace(/console\.log\((.*?)\)/g, 'print(paste($1))');
    } else if (activeFile.language === 'python' && pendingLanguageChange === 'javascript') {
      convertedCode = convertedCode
        .replace(/def (.*?):/g, 'function $1')
        .replace(/print\(f"(.*?)"\)/g, 'console.log(`$1`)')
        .replace(/import (.*?)/g, '// Import $1 (JS equivalent)');
    } else if (activeFile.language === 'javascript' && pendingLanguageChange === 'python') {
      convertedCode = convertedCode
        .replace(/function (.*?)\{/g, 'def $1:')
        .replace(/console\.log\(`(.*?)`\)/g, 'print(f"$1")');
    }

    setState(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [prev.activeFileId!]: {
          ...(prev.items[prev.activeFileId!] as WorkspaceFile),
          language: pendingLanguageChange,
          code: convertedCode,
          name: (prev.items[prev.activeFileId!] as WorkspaceFile).name.replace(
            /\.(r|py|js)$/,
            pendingLanguageChange === 'python' ? '.py' :
            pendingLanguageChange === 'javascript' ? '.js' : '.r'
          ),
          extension: getExtensionFromLanguage(pendingLanguageChange)
        }
      }
    }));

    setShowConversionAlert(false);
    setPendingLanguageChange(null);

    // Message dans le terminal
    setState(prev => ({
      ...prev,
      output: `🔄 Code converti de ${activeFile.language.toUpperCase()} vers ${pendingLanguageChange.toUpperCase()}. Vérifiez les ajustements manuels si nécessaire.\n\n${prev.output}`
    }));
  };

  // Exécution réelle du code
  const handleRunCode = async () => {
    if (!activeFile || isRunning) return;

    setIsRunning(true);
    const startTime = Date.now();
    let output = '';
    let variables = {};
    let error = null;

    try {
      if (activeFile.language === 'javascript') {
        // Exécution JS native
        const func = new Function(activeFile.code);
        const consoleLog = console.log;
        const logs = [];
        console.log = (...args) => logs.push(args.join(' '));
        func();
        console.log = consoleLog;
        output = logs.join('\n');
      } else if (activeFile.language === 'python' && pyodide) {
        // Exécution Python avec Pyodide
        // Installer des modules si nécessaire (ex: numpy)
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        // Exemple : await micropip.install('numpy');
        output = await pyodide.runPythonAsync(activeFile.code);
      } else if (activeFile.language === 'r' && webR) {
        // Exécution R avec WebR
        const shelter = await webR.evalR(activeFile.code);
        output = await shelter.toJs();
        await shelter.close();
      }
    } catch (err) {
      error = err.message;
    }

    const endTime = Date.now();
    const executionTimeMs = endTime - startTime;
    setExecutionTime(executionTimeMs);

    setState(prev => ({
      ...prev,
      output: error ? `❌ Erreur: ${error}\n\n${prev.output}` : `${output}\n✅ Terminé en ${executionTimeMs}ms\n\n${prev.output}`,
      variables: variables // À implémenter l'inspection des variables
    }));

    setIsRunning(false);
  };

  const LanguageIcon = ({ language }: { language: string }) => {
    switch (language) {
      case 'python': return <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-yellow-500 rounded text-white font-bold text-xs flex items-center justify-center">Py</span>;
      case 'r': return <span className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded text-white font-bold text-xs flex items-center justify-center">R</span>;
      case 'javascript': return <span className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded text-white font-bold text-xs flex items-center justify-center">JS</span>;
      default: return <FileCode className="w-4 h-4" />;
    }
  };

  const renderTree = (folderId: string, depth = 0) => {
    const folder = state.items[folderId] as WorkspaceFolder;

    return (
      <div key={folderId} className="select-none">
        <div
          className={`flex items-center px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
            state.currentFolderId === folderId ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => handleSelectFolder(folderId)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {folder.expanded ? (
              <ChevronDown className="w-4 h-4 mr-1 flex-shrink-0 text-gray-600" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 mr-1 flex-shrink-0 text-gray-600" />
            )}
            {folder.expanded ? (
              <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0 text-blue-600" />
            ) : (
              <FolderClosed className="w-4 h-4 mr-2 flex-shrink-0 text-blue-600" />
            )}
            <span className="text-sm font-medium truncate">{folder.name}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                setItemToRename(folderId);
                setNewItemName(folder.name);
                setShowRenameModal(true);
              }}>
                <Edit2 className="w-4 h-4 mr-2" />
                Renommer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadFolder(folderId)}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger en ZIP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setItemToDelete(folderId);
                setShowDeleteConfirm(true);
              }} className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {folder.expanded && (
          <div>
            {folder.children.map(childId => {
              const child = state.items[childId];
              if (child.type === 'folder') {
                return renderTree(childId, depth + 1);
              } else {
                const file = child as WorkspaceFile;
                return (
                  <ContextMenu key={childId}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={`flex items-center px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group ${
                          state.activeFileId === childId ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : ''
                        }`}
                        style={{ paddingLeft: `${(depth + 1) * 20 + 8}px` }}
                        onClick={() => handleSelectFile(childId)}
                        onDoubleClick={() => {
                          if (file.language === 'other') return;
                          setRenamingItemId(childId);
                          setRenamingItemName(file.name);
                        }}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          {getFileIcon(file.extension)}
                          <span className="ml-2 text-sm font-medium truncate">
                            {renamingItemId === childId ? (
                              <input
                                ref={inputRef}
                                type="text"
                                value={renamingItemName}
                                onChange={(e) => setRenamingItemName(e.target.value)}
                                onBlur={() => {
                                  if (renamingItemName.trim() && isValidExtension(renamingItemName)) {
                                    const newExtension = renamingItemName.includes('.')
                                      ? renamingItemName.substring(renamingItemName.lastIndexOf('.')).toLowerCase()
                                      : file.extension;
                                    const newLanguage = getLanguageFromExtension(newExtension);

                                    setState(prev => ({
                                      ...prev,
                                      items: {
                                        ...prev.items,
                                        [childId]: {
                                          ...file,
                                          name: renamingItemName,
                                          language: newLanguage,
                                          extension: newExtension
                                        }
                                      }
                                    }));
                                  }
                                  setRenamingItemId(null);
                                  setRenamingItemName('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (renamingItemName.trim() && isValidExtension(renamingItemName)) {
                                      const newExtension = renamingItemName.includes('.')
                                        ? renamingItemName.substring(renamingItemName.lastIndexOf('.')).toLowerCase()
                                        : file.extension;
                                      const newLanguage = getLanguageFromExtension(newExtension);

                                      setState(prev => ({
                                        ...prev,
                                        items: {
                                          ...prev.items,
                                          [childId]: {
                                            ...file,
                                            name: renamingItemName,
                                            language: newLanguage,
                                            extension: newExtension
                                          }
                                        }
                                      }));
                                    }
                                    setRenamingItemId(null);
                                    setRenamingItemName('');
                                  } else if (e.key === 'Escape') {
                                    setRenamingItemId(null);
                                    setRenamingItemName('');
                                  }
                                }}
                                className="px-1 py-0.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none w-full dark:border-gray-600 dark:bg-gray-800"
                              />
                            ) : (
                              file.name
                            )}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(childId);
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Télécharger</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => {
                                setItemToRename(childId);
                                setNewItemName(file.name);
                                setShowRenameModal(true);
                              }}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Renommer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadFile(childId)}>
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setItemToDelete(childId);
                                setShowDeleteConfirm(true);
                              }} className="text-red-600 focus:text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem onClick={() => handleSelectFile(childId)}>
                        <File className="w-4 h-4 mr-2" />
                        Ouvrir
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleDownloadFile(childId)}>
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => {
                        setItemToRename(childId);
                        setNewItemName(file.name);
                        setShowRenameModal(true);
                      }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Renommer
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => {
                        setItemToDelete(childId);
                        setShowDeleteConfirm(true);
                      }} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              }
            })}
          </div>
        )}
      </div>
    );
  };

  // Rendu principal
  return (
    <div className={`flex flex-col h-screen bg-background ${theme} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow">
              <Code className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <FolderTree className="w-5 h-5 text-blue-600" />
              <div>
                <h1 className="font-bold text-sm">Atelier OpenEPI</h1>
                <p className="text-xs text-muted-foreground">
                  {activeFile ? activeFile.name : 'Sélectionnez un fichier'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {activeFile && (
            <Button 
              variant="default" 
              size="sm" 
              className="h-8 px-3 bg-gradient-to-r from-green-600 to-emerald-600" 
              onClick={handleRunCode}
              disabled={isRunning || !pyodide || !webR}
            >
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              <span className="text-xs">{isRunning ? 'Exécution...' : 'Exécuter'}</span>
            </Button>
          )}
          {activeFile && (
            <div className="flex items-center space-x-2 px-3 border-l">
              <Switch checked={state.autoRun} onCheckedChange={(checked) => setState(prev => ({ ...prev, autoRun: checked }))} className="scale-75" />
              <Label className="text-xs cursor-pointer">Auto-run</Label>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsChatbotOpen(!isChatbotOpen)} className="h-8 w-8 p-0">
            <Bot className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                <Sparkles className="w-4 h-4 mr-2" />
                Changer thème ({theme === 'light' ? 'Sombre' : 'Clair'})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {/* Alerte de conversion */}
      {showConversionAlert && codeAnalysis && pendingLanguageChange && (
        <Alert className="mx-4 mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div>
              Détection de langage : code semble être en{' '}
              <span className="font-bold">{codeAnalysis.detectedLanguage?.toUpperCase()}</span>. {codeAnalysis.suggestions.join(' ')}
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => setShowConversionAlert(false)}>Ignorer</Button>
              <Button size="sm" onClick={handleConvertCode} className="bg-blue-600 hover:bg-blue-700">
                <Sparkles className="w-3 h-3 mr-2" />
                Convertir automatiquement
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Arborescence */}
        {showSidebar && (
          <div className="w-72 border-r bg-card flex flex-col shadow-inner">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center">
                  <FolderTree className="w-4 h-4 mr-2 text-primary" />
                  Explorateur de fichiers
                </h3>
                <div className="flex space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCreateFileModal(true);
                            setNewItemName('');
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <FilePlus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Nouveau fichier</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCreateFolderModal(true);
                            setNewItemName('');
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <FolderPlus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Nouveau dossier</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowUploadModal(true)}
                          className="h-7 w-7 p-0"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Uploader fichier</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDownloadAll}
                          className="h-7 w-7 p-0"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Télécharger tout (ZIP)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Input placeholder="Rechercher dans le workspace..." className="h-8 text-xs" prefix={<Search className="w-4 h-4 text-muted-foreground" />} />
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {renderTree('root')}
              </div>
            </ScrollArea>
            {/* Stats */}
            <div className="p-3 border-t text-xs text-muted-foreground">
              <div className="flex justify-between mb-1">
                <span>Fichiers:</span>
                <span>{Object.values(state.items).filter(item => item.type === 'file').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Dossiers:</span>
                <span>{Object.values(state.items).filter(item => item.type === 'folder').length - 1}</span>
              </div>
            </div>
          </div>
        )}
        {/* Éditeur principal */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeFile && activeFile.language !== 'other' ? (
            <>
              {/* Barre d'outils éditeur */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-card shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
                    {(['r', 'python', 'javascript'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`flex items-center justify-center h-7 px-3 rounded-md transition-all text-xs font-medium ${
                          activeFile.language === lang
                            ? 'bg-background shadow ring-1 ring-border'
                            : 'hover:bg-muted-foreground/10'
                        }`}
                      >
                        {activeFile.language === lang && <Check className="w-3 h-3 mr-1 text-success" />}
                        <LanguageIcon language={lang} />
                        <span className="ml-1">{lang === 'r' ? 'R' : lang === 'python' ? 'Py' : 'JS'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getFileIcon(activeFile.extension)}
                    <span className="text-sm font-medium">{activeFile.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {activeFile.extension.toUpperCase().replace('.', '')}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activeFile.code.length} caractères • {activeFile.code.split('\n').length} lignes
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownloadFile(activeFile.id)} className="h-7 text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    Télécharger
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setItemToRename(activeFile.id);
                    setNewItemName(activeFile.name);
                    setShowRenameModal(true);
                  }} className="h-7 text-xs">
                    <Edit2 className="w-3 h-3 mr-1" />
                    Renommer
                  </Button>
                </div>
              </div>
              {/* Éditeur */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  value={activeFile.code}
                  language={activeFile.language}
                  onChange={handleCodeChange}
                  height="100%"
                  theme={theme === 'light' ? 'vs-light' : 'vs-dark'}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/50">
              <div className="text-center p-8 rounded-lg bg-card shadow-lg">
                <File className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sélectionnez ou créez un fichier</h3>
                <p className="text-muted-foreground mb-6">
                  Ouvrez un fichier depuis l'explorateur ou commencez un nouveau projet.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => setShowCreateFileModal(true)} className="shadow">
                    <FilePlus className="w-4 h-4 mr-2" />
                    Nouveau fichier
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateFolderModal(true)}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Nouveau dossier
                  </Button>
                  <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Uploader
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Terminal panel */}
        {showTerminal && (
          <div className="w-96 border-l flex flex-col shadow-inner">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="justify-start border-b px-4">
                <TabsTrigger value="terminal" className="text-xs">
                  <Terminal className="w-3 h-3 mr-1" />
                  Terminal
                </TabsTrigger>
                <TabsTrigger value="variables" className="text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Variables
                </TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Analyse
                </TabsTrigger>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" onClick={() => setShowTerminal(false)} className="h-6 w-6 p-0">
                    <PanelLeftClose className="w-3 h-3" />
                  </Button>
                </div>
              </TabsList>
              <TabsContent value="terminal" className="flex-1 overflow-hidden m-0">
                <ScrollArea ref={terminalRef} className="h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 dark:bg-gray-950">
                  {state.output || '# Terminal prêt pour l\'exécution'}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="variables" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4 bg-gray-900 dark:bg-gray-950">
                  {Object.keys(state.variables).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(state.variables).map(([key, value]) => (
                        <Card key={key} className="bg-gray-800 border-gray-700">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <code className="font-bold text-blue-400">{key}</code>
                                <Badge variant="secondary" className="text-xs">{typeof value}</Badge>
                              </div>
                              <div className="font-mono text-sm truncate max-w-[200px]">{JSON.stringify(value)}</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune variable définie pour le moment.</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="analysis" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full p-4 bg-gray-900 dark:bg-gray-950">
                  {codeAnalysis ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant={codeAnalysis.isValid ? 'success' : 'destructive'}>
                          {codeAnalysis.isValid ? 'Valide' : 'Améliorations suggérées'}
                        </Badge>
                        {codeAnalysis.detectedLanguage && (
                          <Badge variant="outline">Détecté: {codeAnalysis.detectedLanguage.toUpperCase()}</Badge>
                        )}
                      </div>
                      {codeAnalysis.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Suggestions:</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            {codeAnalysis.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                          </ul>
                        </div>
                      )}
                      {codeAnalysis.errors.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm text-red-400">Erreurs potentielles:</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-red-300">
                            {codeAnalysis.errors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune analyse disponible. Exécutez du code pour analyser.</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
            <div className="px-3 py-2 border-t bg-gray-900">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div>
                  {state.autoRun ? '🟢 Auto-run actif' : '⚪ Auto-run inactif'}
                </div>
                {activeTab === 'terminal' && state.output && (
                  <Button variant="ghost" size="sm" onClick={() => setState(prev => ({ ...prev, output: '' }))} className="h-6 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Effacer console
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Chatbot */}
        {isChatbotOpen && (
          <div className="w-80 border-l shadow-inner">
            <ChatbotMini onClose={() => setIsChatbotOpen(false)} />
          </div>
        )}
      </div>
      {/* Barre d'état */}
      <footer className="px-4 py-2 border-t bg-card text-sm shadow-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!showSidebar && (
              <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)} className="h-7 text-xs">
                <PanelLeftOpen className="w-3 h-3 mr-1" />
                Explorateur
              </Button>
            )}
            {!showTerminal && (
              <Button variant="outline" size="sm" onClick={() => { setShowTerminal(true); setActiveTab('terminal'); }} className="h-7 text-xs">
                <PanelLeftOpen className="w-3 h-3 mr-1" />
                Terminal
              </Button>
            )}
            <div className="text-muted-foreground">
              {activeFile?.name ?? 'Aucun fichier sélectionné'} • {activeFile?.code.split('\n').length ?? 0} lignes • {activeFile?.code.length ?? 0} caractères
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {activeFile && <LanguageIcon language={activeFile.language} />}
            {activeFile && <span className="font-medium text-xs">{activeFile.language.toUpperCase()}</span>}
            {executionTime && <Badge variant="outline" className="text-xs">⚡ {executionTime}ms</Badge>}
            <Badge variant="secondary" className="text-xs">
              {pyodide && webR ? 'Runtimes prêts' : 'Chargement des runtimes...'}
            </Badge>
          </div>
        </div>
      </footer>
      {/* Modals */}
      {/* Create File Modal */}
      <Dialog open={showCreateFileModal} onOpenChange={setShowCreateFileModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un nouveau fichier</DialogTitle>
            <DialogDescription>
              Spécifiez le nom et l'extension supportée.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="exemple.py"
              className="mb-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
              }}
            />
            <div className="text-xs text-muted-foreground mt-2">
              Extensions: .r, .py, .js, .txt, .csv, .json, .md
            </div>
            {newItemName && !isValidExtension(newItemName) && (
              <Alert className="mt-2" variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>Extension non supportée</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFileModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFile} disabled={!newItemName.trim() || !isValidExtension(newItemName)}>
              Créer fichier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Create Folder Modal */}
      <Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Nom du dossier"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newItemName.trim()}>
              Créer dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer {itemToRename ? (state.items[itemToRename].type === 'file' ? 'le fichier' : 'le dossier') : ''}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Nouveau nom"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameItem();
              }}
            />
            {itemToRename && state.items[itemToRename].type === 'file' && (
              <div className="text-xs text-muted-foreground mt-2">
                Inclure l'extension (.r, .py, etc.)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleRenameItem}
              disabled={!newItemName.trim() || (itemToRename && state.items[itemToRename].type === 'file' && !isValidExtension(newItemName))}
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirm Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Supprimer {itemToDelete ? (state.items[itemToDelete].type === 'file' ? 'ce fichier' : 'ce dossier et son contenu') : ''} ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Uploader un fichier</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier à importer dans le workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="file" 
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} 
              className="cursor-pointer"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleUploadFile} disabled={!uploadedFile}>
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}