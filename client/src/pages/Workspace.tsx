"use client";
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useLocation } from 'wouter';
import {
  Play, Download, Terminal, ChevronRight, X, 
  FileCode, PanelLeftClose, PanelLeftOpen, File, Trash2, FolderPlus,
  Edit2, FileText, FileSpreadsheet, FileJson, 
  FolderOpen, FolderClosed, ChevronRight as ChevronRightIcon,
  ChevronDown, Search, MoreVertical, Upload, FolderTree, FilePlus,
  FileType, Loader2, Cpu, ChartScatter, Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import JSZip from 'jszip';
import { Chart } from 'chart.js';

// Charger Monaco Editor dynamiquement avec React.lazy
const CodeEditor = lazy(() => import('@/components/CodeEditor/CodeEditor'));

// Types
interface WorkspaceFile {
  id: string;
  name: string;
  language: 'r' | 'other';
  code: string;
  lastModified: Date;
  size: number;
  type: 'file';
  path: string;
  parentId: string | null;
  extension: string;
  isDirty?: boolean;
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
  openFiles: string[];
  currentFolderId: string | null;
  output: string;
  variables: Record<string, any>;
  autoRun: boolean;
  theme: 'light' | 'dark';
}

interface CodeAnalysis {
  isValid: boolean;
  suggestions: string[];
  errors: string[];
  warnings: string[];
  executionTime?: number;
  memoryUsage?: number;
}

interface RFunction {
  name: string;
  description: string;
  category: string;
  example: string;
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
        children: ['file1'],
        expanded: true
      },
      'file1': {
        id: 'file1',
        name: 'untitled.r',
        language: 'r',
        code: `
# === ANALYSE DE RISQUE RELATIF ===
calculate_rr <- function(a, b, c, d) {
  # a: exposés avec maladie
  # b: exposés sans maladie
  # c: non-exposés avec maladie
  # d: non-exposés sans maladie
  
  risk_exposed <- a / (a + b)
  risk_unexposed <- c / (c + d)
  rr <- risk_exposed / risk_unexposed
  
  # Intervalle de confiance à 95%
  se_log_rr <- sqrt(1/a + 1/c - 1/(a+b) - 1/(c+d))
  ci_lower <- exp(log(rr) - 1.96 * se_log_rr)
  ci_upper <- exp(log(rr) + 1.96 * se_log_rr)
  
  return(list(
    rr = rr,
    ci_lower = ci_lower,
    ci_upper = ci_upper,
    risk_exposed = risk_exposed,
    risk_unexposed = risk_unexposed
  ))
}

# Données d'exemple: Étude cas-témoins
# Exposition: Tabagisme
# Maladie: Cancer du poumon
data <- list(
  exposed_cases = 70,      # a
  exposed_controls = 30,   # b
  unexposed_cases = 30,    # c
  unexposed_controls = 70  # d
)

# Calcul du risque relatif
result <- calculate_rr(
  data$exposed_cases,
  data$exposed_controls,
  data$unexposed_cases,
  data$unexposed_controls
)

# Affichage des résultats
cat("=== RÉSULTATS DE L'ANALYSE ÉPIDÉMIOLOGIQUE ===\\n")
cat("Risque chez les exposés:", round(result$risk_exposed * 100, 1), "%\\n")
cat("Risque chez les non-exposés:", round(result$risk_unexposed * 100, 1), "%\\n")
cat("\\n")
cat("Risque relatif (RR):", round(result$rr, 2), "\\n")
cat("IC 95%: [", round(result$ci_lower, 2), "-", round(result$ci_upper, 2), "]\\n")
cat("\\n")

# Interprétation
if (result$rr > 1) {
  cat("L'exposition est associée à un risque accru de maladie.\\n")
} else if (result$rr < 1) {
  cat("L'exposition est associée à un risque réduit de maladie.\\n")
} else {
  cat("Aucune association détectée.\\n")
}

# === ANALYSE STATISTIQUE SUPPLÉMENTAIRE ===
# Test du Chi2
matrix_data <- matrix(c(70, 30, 30, 70), nrow = 2)
chi_test <- chisq.test(matrix_data)
cat("\\nTest du Chi2:\\n")
cat("p-value:", format.pval(chi_test$p.value, digits = 3), "\\n")

# === VISUALISATION ===
# Création d'un graphique simple
par(mfrow = c(1, 2))

# Barplot des risques
risks <- c(result$risk_exposed, result$risk_unexposed) * 100
barplot(risks, 
        names.arg = c("Exposés", "Non-exposés"),
        ylab = "Risque (%)",
        main = "Distribution du risque",
        col = c("#3b82f6", "#93c5fd"),
        ylim = c(0, 50))

# Plot du RR avec intervalle de confiance
plot(1, result$rr, xlim = c(0.5, 1.5), ylim = c(0, max(result$ci_upper) + 1),
     xaxt = 'n', xlab = '', ylab = "Risque relatif",
     main = "RR avec IC 95%",
     pch = 19, cex = 2, col = "#ef4444")
arrows(1, result$ci_lower, 1, result$ci_upper, 
       angle = 90, code = 3, length = 0.1, col = "#ef4444")
abline(h = 1, lty = 2, col = "gray")
`,
        lastModified: new Date(),
        size: 3250,
        type: 'file',
        path: '/analyse_epidemio.r',
        parentId: 'root',
        extension: '.r'
      },
   
  
    },
    activeFileId: 'file1',
    openFiles: ['file1'],
    currentFolderId: 'root',
    output: 'WorkSpace Initialisé. Prêt à exécuter votre code !\n\n',
    variables: {},
    autoRun: false,
    theme: 'light'
  });

  const [activeTab, setActiveTab] = useState<string>('terminal');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showTerminal, setShowTerminal] = useState<boolean>(true);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [webR, setWebR] = useState<any>(null);
  const [webRStatus, setWebRStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editorInstance, setEditorInstance] = useState<any>(null);

  // États pour les modals
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [itemToRename, setItemToRename] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const autoRunRef = useRef<NodeJS.Timeout>();

  // Récupérer les éléments
  const activeFile = state.activeFileId ? (state.items[state.activeFileId] as WorkspaceFile) : null;
  const currentFolder = state.currentFolderId ? (state.items[state.currentFolderId] as WorkspaceFolder) : null;
  const openFiles = state.openFiles.map(id => state.items[id] as WorkspaceFile).filter(Boolean);

  // Initialiser WebR
  useEffect(() => {
    const initWebR = async () => {
      try {
        setWebRStatus('loading');
        const { WebR } = await import('webr');
        const webRInstance = new WebR();
        await webRInstance.init();
        
        // Charger quelques packages de base
        await webRInstance.evalR('library(stats)');
        await webRInstance.evalR('library(graphics)');
        
        setWebR(webRInstance);
        setWebRStatus('ready');
        
    
      } catch (error) {
        console.error('Erreur WebR:', error);
        setWebRStatus('error');
        setState(prev => ({
          ...prev,
          output: `⚠️ WebR non disponible: ${error instanceof Error ? error.message : 'Erreur inconnue'}\n🔧 Mode simulation activé\n\n${prev.output}`
        }));
      }
    };

    initWebR();

    return () => {
      if (webR) {
        webR.destroy();
      }
    };
  }, []);

  // Sauvegarde automatique
  useEffect(() => {
    const saveState = () => {
      const toSave = {
        ...state,
        items: Object.fromEntries(
          Object.entries(state.items).map(([key, item]) => {
            if (item.type === 'file') {
              const file = item as WorkspaceFile;
              return [key, { ...file, lastModified: file.lastModified.toISOString() }];
            }
            return [key, item];
          })
        )
      };
      localStorage.setItem('openepi_workspace_state', JSON.stringify(toSave));
    };

    const timer = setTimeout(saveState, 1000);
    return () => clearTimeout(timer);
  }, [state]);

  // Auto-scroll terminal
  useEffect(() => {
    if (outputEndRef.current && showTerminal && activeTab === 'terminal') {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.output, showTerminal, activeTab]);

  // Auto-run si activé
  useEffect(() => {
    if (state.autoRun && activeFile?.language === 'r' && !isRunning) {
      if (autoRunRef.current) clearTimeout(autoRunRef.current);
      autoRunRef.current = setTimeout(() => {
        handleRunCode();
      }, 1500);
    }
    return () => {
      if (autoRunRef.current) clearTimeout(autoRunRef.current);
    };
  }, [state.autoRun, activeFile?.code]);

  // Fonctions utilitaires
  const getFileIcon = (extension: string) => {
    switch (extension.toLowerCase()) {
      case '.r': return <FileType className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case '.rmd': return <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case '.csv': return <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case '.json': return <FileJson className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case '.txt': return <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLanguageName = (language: string) => {
    return language === 'r' ? 'R' : 'Texte';
  };

  // Fonction pour télécharger tout le workspace
  const handleDownloadAll = async () => {
    try {
      const zip = new JSZip();
      const root = state.items['root'] as WorkspaceFolder;
      
      // Fonction récursive pour ajouter les fichiers au ZIP
      const addToZip = (itemId: string, currentPath: string) => {
        const item = state.items[itemId];
        
        if (item.type === 'file') {
          const file = item as WorkspaceFile;
          zip.file(`${currentPath}/${file.name}`, file.code);
        } else if (itemId !== 'root') {
          const folder = item as WorkspaceFolder;
          const folderPath = `${currentPath}/${folder.name}`;
          folder.children.forEach(childId => addToZip(childId, folderPath));
        } else {
          const folder = item as WorkspaceFolder;
          folder.children.forEach(childId => addToZip(childId, currentPath));
        }
      };
      
      // Ajouter tous les fichiers au ZIP
      addToZip('root', '');
      
      // Générer le fichier ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openepi_workspace_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Ajouter un message dans le terminal
      setState(prev => ({
        ...prev,
        output: `📦 Workspace téléchargé avec succès!\n${prev.output}`
      }));
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setState(prev => ({
        ...prev,
        output: ` Erreur lors du téléchargement du workspace: ${error}\n${prev.output}`
      }));
    }
  };

  // Fonction pour renommer un élément
  const handleRenameItem = () => {
    if (!itemToRename || !newItemName.trim()) return;
    
    const item = state.items[itemToRename];
    
    setState(prev => {
      const newItems = { ...prev.items };
      
      if (item.type === 'file') {
        const file = item as WorkspaceFile;
        const oldExtension = file.extension;
        let newExtension = newItemName.includes('.') 
          ? newItemName.substring(newItemName.lastIndexOf('.')).toLowerCase()
          : oldExtension;
        
        // Si pas d'extension, garder l'ancienne
        if (!newItemName.includes('.')) {
          newExtension = oldExtension;
        }
        
        const newLanguage = newExtension === '.r' ? 'r' : 'other';
        
        newItems[itemToRename] = {
          ...file,
          name: newItemName.includes('.') ? newItemName : `${newItemName}${newExtension}`,
          language: newLanguage,
          extension: newExtension,
          lastModified: new Date()
        };
      } else {
        const folder = item as WorkspaceFolder;
        newItems[itemToRename] = {
          ...folder,
          name: newItemName
        };
      }
      
      return {
        ...prev,
        items: newItems
      };
    });
    
    setShowRenameModal(false);
    setItemToRename(null);
    setNewItemName('');
  };

  // Fonction pour supprimer un élément
  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    
    // Ne pas supprimer le dossier racine
    if (itemToDelete === 'root') {
      alert("Impossible de supprimer le dossier racine");
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      return;
    }
    
    const item = state.items[itemToDelete];
    
    // Créer une copie des items
    const newItems = { ...state.items };
    
    // Fonction récursive pour supprimer les enfants
    const deleteRecursive = (id: string) => {
      const item = newItems[id];
      if (item.type === 'folder') {
        const folder = item as WorkspaceFolder;
        folder.children.forEach(childId => deleteRecursive(childId));
      }
      delete newItems[id];
    };
    
    // Supprimer l'élément et ses enfants
    deleteRecursive(itemToDelete);
    
    // Retirer de la liste des enfants du parent
    if (item.parentId) {
      const parent = newItems[item.parentId] as WorkspaceFolder;
      newItems[item.parentId] = {
        ...parent,
        children: parent.children.filter(id => id !== itemToDelete)
      };
    }
    
    setState(prev => ({
      ...prev,
      items: newItems,
      activeFileId: prev.activeFileId === itemToDelete ? null : prev.activeFileId,
      currentFolderId: prev.currentFolderId === itemToDelete ? 'root' : prev.currentFolderId,
      openFiles: prev.openFiles.filter(id => id !== itemToDelete)
    }));
    
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Gestion des fichiers
  const handleCreateFile = () => {
    if (!newItemName.trim()) return;

    let fileName = newItemName;
    let extension = '.r';
    
    if (fileName.includes('.')) {
      extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    } else {
      fileName += extension;
    }

    const language = extension === '.r' ? 'r' : 'other';
    const newId = `file_${Date.now()}`;
    const parentId = state.currentFolderId || 'root';

    const newFile: WorkspaceFile = {
      id: newId,
      name: fileName,
      language,
      code: language === 'r' 
        ? `# Nouveau script R - ${new Date().toLocaleDateString()}\n# Atelier OpenEPI - Analyse épidémiologique\n\n# Charger les bibliothèques nécessaires\nlibrary(stats)\nlibrary(graphics)\n\n# Votre code ici...\ncat("Bienvenue dans l'atelier OpenEPI!\\n")`
        : `# ${fileName}`,
      lastModified: new Date(),
      size: 0,
      type: 'file',
      path: `${parentId === 'root' ? '' : (state.items[parentId] as WorkspaceFolder).path}/${fileName}`,
      parentId,
      extension
    };

    setState(prev => {
      const parent = prev.items[parentId] as WorkspaceFolder;
      return {
        ...prev,
        items: {
          ...prev.items,
          [newId]: newFile,
          [parentId]: {
            ...parent,
            children: [...parent.children, newId],
            expanded: true
          }
        },
        activeFileId: newId,
        openFiles: [...prev.openFiles, newId]
      };
    });

    setShowCreateFileModal(false);
    setNewItemName('');
  };

  const handleCreateFolder = () => {
    if (!newItemName.trim()) return;

    const newId = `folder_${Date.now()}`;
    const parentId = state.currentFolderId || 'root';

    const newFolder: WorkspaceFolder = {
      id: newId,
      name: newItemName,
      type: 'folder',
      path: `${parentId === 'root' ? '' : (state.items[parentId] as WorkspaceFolder).path}/${newItemName}`,
      parentId,
      children: [],
      expanded: false
    };

    setState(prev => {
      const parent = prev.items[parentId] as WorkspaceFolder;
      return {
        ...prev,
        items: {
          ...prev.items,
          [newId]: newFolder,
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

  const handleSelectFile = (fileId: string) => {
    const file = state.items[fileId] as WorkspaceFile;
    setState(prev => ({
      ...prev,
      activeFileId: fileId,
      openFiles: prev.openFiles.includes(fileId) ? prev.openFiles : [...prev.openFiles, fileId]
    }));
  };

  const handleCloseFile = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setState(prev => {
      const newOpenFiles = prev.openFiles.filter(id => id !== fileId);
      const newActiveFileId = prev.activeFileId === fileId 
        ? (newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null)
        : prev.activeFileId;
      
      return {
        ...prev,
        openFiles: newOpenFiles,
        activeFileId: newActiveFileId
      };
    });
  };

  // FONCTION CORRIGÉE POUR EXÉCUTER LE CODE
  const handleRunCode = async () => {
    if (!activeFile || activeFile.language !== 'r' || isRunning) return;

    setIsRunning(true);
    const startTime = Date.now();

    try {
      if (webR && webRStatus === 'ready') {
        // Clear previous output
      

        // Utiliser capture.output pour capturer toute la sortie
        const captureCode = `
          captured <- capture.output({
            ${activeFile.code}
          }, type = "output")
          captured
        `;

        try {
          const result = await webR.evalR(captureCode);
          const output = await result.toJs();
          
          let outputText = '';
          if (output.values && output.values.length > 0) {
            outputText = output.values.join('\n');
          }

          const endTime = Date.now();
          setExecutionTime(endTime - startTime);

          setState(prev => ({
            ...prev,
            output: prev.output + outputText + 
                    `\n`
          }));
        } catch (error: any) {
          const endTime = Date.now();
          setExecutionTime(endTime - startTime);
          setState(prev => ({
            ...prev,
            output: prev.output + 
                    `Erreur R: ${error.message || error}\n` +
                    `${'-'.repeat(50)}\n Exécution interrompue après ${endTime - startTime}ms\n\n`
          }));
        }
      } else {
        // Fallback simulation mode pour quand WebR n'est pas disponible
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulation d'une sortie R typique
        const simulatedOutput = `> # === RÉSULTATS DE L'ANALYSE ÉPIDÉMIOLOGIQUE ===
> cat("=== RÉSULTATS DE L'ANALYSE ÉPIDÉMIOLOGIQUE ===\\n")
=== RÉSULTATS DE L'ANALYSE ÉPIDÉMIOLOGIQUE ===

> cat("Risque chez les exposés:", round(result$risk_exposed * 100, 1), "%\\n")
Risque chez les exposés: 70 %

> cat("Risque chez les non-exposés:", round(result$risk_unexposed * 100, 1), "%\\n")
Risque chez les non-exposés: 30 %

> cat("\\n")

> cat("Risque relatif (RR):", round(result$rr, 2), "\\n")
Risque relatif (RR): 2.33

> cat("IC 95%: [", round(result$ci_lower, 2), "-", round(result$ci_upper, 2), "]\\n")
IC 95%: [ 1.45 - 3.76 ]

> cat("\\n")

> # Interprétation
> if (result$rr > 1) {
+   cat("L'exposition est associée à un risque accru de maladie.\\n")
+ } else if (result$rr < 1) {
+   cat("L'exposition est associée à un risque réduit de maladie.\\n")
+ } else {
+   cat("Aucune association détectée.\\n")
+ }
L'exposition est associée à un risque accru de maladie.

> # === ANALYSE STATISTIQUE SUPPLÉMENTAIRE ===
> # Test du Chi2
> matrix_data <- matrix(c(70, 30, 30, 70), nrow = 2)
> chi_test <- chisq.test(matrix_data)
> cat("\\nTest du Chi2:\\n")

Test du Chi2:
> cat("p-value:", format.pval(chi_test$p.value, digits = 3), "\\n")
p-value: <0.001

> # === VISUALISATION ===
> # Création d'un graphique simple
> par(mfrow = c(1, 2))
> 
> # Barplot des risques
> risks <- c(result$risk_exposed, result$risk_unexposed) * 100
> barplot(risks, 
+         names.arg = c("Exposés", "Non-exposés"),
+         ylab = "Risque (%)",
+         main = "Distribution du risque",
+         col = c("#3b82f6", "#93c5fd"),
+         ylim = c(0, 50))
> 
> # Plot du RR avec intervalle de confiance
> plot(1, result$rr, xlim = c(0.5, 1.5), ylim = c(0, max(result$ci_upper) + 1),
+      xaxt = 'n', xlab = '', ylab = "Risque relatif",
+      main = "RR avec IC 95%",
+      pch = 19, cex = 2, col = "#ef4444")
> arrows(1, result$ci_lower, 1, result$ci_upper, 
+        angle = 90, code = 3, length = 0.1, col = "#ef4444")
> abline(h = 1, lty = 2, col = "gray")`;

        setExecutionTime(1000);
        setState(prev => ({
          ...prev,
          output: ` Simulation d'exécution démarrée à ${new Date().toLocaleTimeString()}\n${'-'.repeat(50)}\n` +
                  simulatedOutput +
                  `\n${'-'.repeat(50)}\n Simulation terminée en 1000ms\n\n${prev.output}`
        }));
      }
    } catch (error: any) {
      const endTime = Date.now();
      setExecutionTime(endTime - startTime);
      setState(prev => ({
        ...prev,
        output: ` Erreur d'exécution (${endTime - startTime}ms):\n${error.message || error}\n\n${prev.output}`
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadFile = (fileId: string) => {
    const file = state.items[fileId] as WorkspaceFile;
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFolder = async (folderId: string) => {
    const folder = state.items[folderId] as WorkspaceFolder;
    const zip = new JSZip();
    
    const addToZip = (id: string, path: string) => {
      const item = state.items[id];
      if (item.type === 'file') {
        const file = item as WorkspaceFile;
        zip.file(`${path}/${file.name}`, file.code);
      } else {
        const subFolder = item as WorkspaceFolder;
        const newPath = `${path}/${subFolder.name}`;
        subFolder.children.forEach(childId => addToZip(childId, newPath));
      }
    };
    
    folder.children.forEach(childId => addToZip(childId, folder.name));
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folder.name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearOutput = () => {
    setState(prev => ({ ...prev, output: '' }));
  };

  const handleUploadFile = async () => {
    if (!uploadedFile) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const extension = uploadedFile.name.includes('.') 
        ? uploadedFile.name.substring(uploadedFile.name.lastIndexOf('.')).toLowerCase()
        : '';
      
      const language = extension === '.r' ? 'r' : 'other';
      const newId = `file_${Date.now()}`;
      const parentId = state.currentFolderId || 'root';
      
      const newFile: WorkspaceFile = {
        id: newId,
        name: uploadedFile.name,
        language,
        code: content,
        lastModified: new Date(),
        size: content.length,
        type: 'file',
        path: `${parentId === 'root' ? '' : (state.items[parentId] as WorkspaceFolder).path}/${uploadedFile.name}`,
        parentId,
        extension: extension || '.txt'
      };
      
      setState(prev => {
        const parent = prev.items[parentId] as WorkspaceFolder;
        return {
          ...prev,
          items: {
            ...prev.items,
            [newId]: newFile,
            [parentId]: {
              ...parent,
              children: [...parent.children, newId],
              expanded: true
            }
          },
          activeFileId: newId,
          openFiles: [...prev.openFiles, newId]
        };
      });
      
      setShowUploadModal(false);
      setUploadedFile(null);
    };
    
    reader.readAsText(uploadedFile);
  };

  const renderFileTree = (folderId: string, depth = 0) => {
    const folder = state.items[folderId] as WorkspaceFolder;
    
    return (
      <div key={folderId} className="space-y-0.5">
        {/* Dossier */}
        <div
          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
            state.currentFolderId === folderId 
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          onClick={() => setState(prev => ({
            ...prev,
            currentFolderId: folderId,
            items: {
              ...prev.items,
              [folderId]: {
                ...folder,
                expanded: !folder.expanded
              }
            }
          }))}
        >
          <div className="flex items-center flex-1 min-w-0" style={{ paddingLeft: `${depth * 16}px` }}>
            {folder.expanded ? (
              <ChevronDown className="w-3 h-3 mr-1.5 flex-shrink-0 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-3 h-3 mr-1.5 flex-shrink-0 text-gray-500" />
            )}
            {folder.expanded ? (
              <FolderOpen className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500" />
            ) : (
              <FolderClosed className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500" />
            )}
            <span className="text-sm font-medium truncate">{folder.name}</span>
            <Badge variant="outline" className="ml-2 text-xs py-0 h-4">
              {folder.children.length}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
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
                Télécharger (ZIP)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setItemToDelete(folderId);
                  setShowDeleteConfirm(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contenu du dossier */}
        {folder.expanded && folder.children.map(childId => {
          const child = state.items[childId];
          if (child.type === 'folder') {
            return renderFileTree(childId, depth + 1);
          } else {
            const file = child as WorkspaceFile;
            const isActive = state.activeFileId === childId;
            
            return (
              <ContextMenu key={childId}>
                <ContextMenuTrigger asChild>
                  <div
                    className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleSelectFile(childId)}
                    style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {getFileIcon(file.extension)}
                      <span className="ml-2 text-sm truncate">{file.name}</span>
                      {file.isDirty && (
                        <span className="ml-2 w-2 h-2 rounded-full bg-yellow-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(childId);
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Télécharger</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                  <ContextMenuItem 
                    onClick={() => {
                      setItemToDelete(childId);
                      setShowDeleteConfirm(true);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          }
        })}
      </div>
    );
  };

  // Statistiques du workspace
  const stats = {
    totalFiles: Object.values(state.items).filter(item => item.type === 'file').length,
    totalFolders: Object.values(state.items).filter(item => item.type === 'folder').length - 1,
    totalLines: activeFile ? activeFile.code.split('\n').length : 0,
    totalSize: Object.values(state.items)
      .filter(item => item.type === 'file')
      .reduce((sum, file) => sum + (file as WorkspaceFile).size, 0)
  };

  return (
    <div className={`flex flex-col h-screen bg-background ${state.theme}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/')}
            className="gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Retour
          </Button>
          
          <div className="flex items-center space-x-3">
           
            <div>
              <h1 className="font-bold text-lg">Epi WorkSpace</h1>
              <p className="text-xs text-muted-foreground">
                Editeur de Code R
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 border-r">
            <Switch 
              checked={state.autoRun} 
              onCheckedChange={(checked) => setState(prev => ({ ...prev, autoRun: checked }))}
              id="auto-run"
            />
            <Label htmlFor="auto-run" className="text-sm cursor-pointer">
              Auto-run R
            </Label>
          </div>
          
          {activeFile && activeFile.language === 'r' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRunCode}
                disabled={isRunning}
                className={`
                  h-7 px-2 flex items-center gap-1.5 rounded-none 
                  hover:text-[#89d185] 
                  
                  ${isRunning ? 'cursor-wait opacity-70' : 'cursor-pointer'}
                `}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#3794ff]" />
                ) : (
                  <Play className="w-4 h-4 text-[#89d185]" />
                )}
                <span className=" text-sm tracking-tight">
                  {isRunning ? 'Exécution...' : 'Exécuter'}
                </span>
              </Button>
            )}

          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setState(prev => ({ 
              ...prev, 
              theme: prev.theme === 'light' ? 'dark' : 'light' 
            }))}
          >
            {state.theme === 'light' ? '🌙' : '☀️'}
          </Button>
          
         
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 border-r flex flex-col bg-card">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center">
                  <FolderTree className="w-4 h-4 mr-2" />
                  Explorateur
                </h3>
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreateFileModal(true)}
                          className="h-7 w-7 p-0"
                        >
                          <FilePlus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Nouveau fichier</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreateFolderModal(true)}
                          className="h-7 w-7 p-0"
                        >
                          <FolderPlus className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Nouveau dossier</TooltipContent>
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
                      <TooltipContent>Uploader</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {renderFileTree('root')}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Fichiers:</span>
                  <span className="font-medium">{stats.totalFiles}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dossiers:</span>
                  <span className="font-medium">{stats.totalFolders}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Taille:</span>
                  <span className="font-medium">
                    {(stats.totalSize / 1024).toFixed(1)} KB
                  </span>
                </div>
               
              </div>
            </div>
          </div>
        )}
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File Tabs */}
          {openFiles.length > 0 && (
            <div className="border-b">
              <div className="flex items-center px-2">
                <ScrollArea className="flex-1" orientation="horizontal">
                  <div className="flex">
                    {openFiles.map((file) => {
                      const isActive = state.activeFileId === file.id;
                      return (
                        <div
                          key={file.id}
                          className={`flex items-center px-3 py-2 border-r text-sm cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-background border-b-2 border-b-blue-500 text-foreground'
                              : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                          }`}
                          onClick={() => handleSelectFile(file.id)}
                        >
                          {getFileIcon(file.extension)}
                          <span className="ml-2 max-w-[150px] truncate">
                            {file.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-5 w-5 p-0 hover:bg-background"
                            onClick={(e) => handleCloseFile(file.id, e)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                
                <div className="flex items-center px-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSidebar(!showSidebar)}
                          className="h-8 w-8 p-0"
                        >
                          {showSidebar ? (
                            <PanelLeftClose className="w-4 h-4" />
                          ) : (
                            <PanelLeftOpen className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {showSidebar ? 'Masquer explorateur' : 'Afficher explorateur'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTerminal(!showTerminal)}
                          className="h-8 w-8 p-0"
                        >
                          {showTerminal ? (
                            <PanelLeftClose className="w-4 h-4 rotate-90" />
                          ) : (
                            <PanelLeftOpen className="w-4 h-4 rotate-90" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {showTerminal ? 'Masquer terminal' : 'Afficher terminal'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          )}
          
          {/* Editor or Empty State */}
          {activeFile ? (
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }>
                <CodeEditor
                  value={activeFile.code}
                  language={activeFile.language}
                  onChange={(value) => {
                    setState(prev => ({
                      ...prev,
                      items: {
                        ...prev.items,
                        [prev.activeFileId!]: {
                          ...(prev.items[prev.activeFileId!] as WorkspaceFile),
                          code: value,
                          lastModified: new Date(),
                          size: value.length,
                          isDirty: true
                        }
                      }
                    }));
                  }}
                  theme={state.theme}
                  onMount={setEditorInstance}
                />
              </Suspense>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center p-8 max-w-md">
                <FileCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun fichier ouvert</h3>
                <p className="text-muted-foreground mb-6">
                  Sélectionnez un fichier dans l'explorateur ou créez un nouveau script R pour commencer.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setShowCreateFileModal(true)}>
                    <FilePlus className="w-4 h-4 mr-2" />
                    Nouveau script R
                  </Button>
                  <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Importer fichier
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Terminal Panel */}
        {showTerminal && (
          <div className="w-96 border-l flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b px-4">
                <TabsList className="w-full">
                  <TabsTrigger value="terminal" className="flex-1">
                    <Terminal className="w-4 h-4 mr-2" />
                    Terminal
                  </TabsTrigger>
                
                  <TabsTrigger value="Graph" className="flex-1">
                    <ChartScatter className="w-4 h-4 mr-2" />
                    Graph
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="terminal" className="flex-1 flex flex-col m-0 p-0">
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-2">

                    {executionTime && (
                      <span className="text-xs text-muted-foreground">
                        {executionTime}ms
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearOutput}
                      className="h-7 text-xs"
                    >
                      <Trash className="w-3 h-3 mr-1" />
                    
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <pre className="font-mono text-sm whitespace-pre-wrap">
                    {state.output || '# Terminal prêt. Exécutez du code R pour voir la sortie.'}
                  </pre>
                  <div ref={outputEndRef} />
                </ScrollArea>
              </TabsContent>
              
           
              
              <TabsContent value="Graph" className="flex-1 m-0 p-4">
                <Alert>
                 
                  <AlertDescription>
                    Vos Graphes créées pendant l'exécution apparaîtront ici.
                  </AlertDescription>
                </Alert>
                
                
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="px-4 py-2 border-t flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {activeFile ? (
              <>
                {getFileIcon(activeFile.extension)}
                <span className="font-medium">{activeFile.name}</span>
                <Badge variant="outline" className="text-xs">
                  {getLanguageName(activeFile.language)}
                </Badge>
              </>
            ) : (
              <span className="text-muted-foreground">Aucun fichier sélectionné</span>
            )}
          </div>
          
          {activeFile && (
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>{activeFile.code.split('\n').length} lignes</span>
              <span>{activeFile.code.length} caractères</span>
              <span>
                Dernière modification : {activeFile.lastModified.toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }).replace(' ', ' à ')}
              </span>

            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4" />
            <span className="text-xs">
              {stats.totalFiles} fichiers • {stats.totalFolders} dossiers
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleDownloadAll}
          >
            <Download className="w-3 h-3 mr-1" />
            Tout exporter 
          </Button>
        </div>
      </footer>
      
      {/* Modals */}
      <Dialog open={showCreateFileModal} onOpenChange={setShowCreateFileModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau fichier</DialogTitle>
            <DialogDescription>
              Créez un nouveau fichier dans le dossier courant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="nom_du_fichier.r"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            />
            <div className="text-xs text-muted-foreground">
              Extension recommandée: .r pour les scripts R
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFileModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFile} disabled={!newItemName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nom du dossier"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newItemName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nouveau nom"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameItem()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleRenameItem} 
              disabled={!newItemName.trim() || !itemToRename}
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Êtes-vous sûr de vouloir supprimer cet élément ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer un fichier</DialogTitle>
            <DialogDescription>
              Sélectionnez un fichier à importer dans votre workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
            />
            {uploadedFile && (
              <div className="text-sm">
                Fichier sélectionné: <span className="font-medium">{uploadedFile.name}</span>
              </div>
            )}
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