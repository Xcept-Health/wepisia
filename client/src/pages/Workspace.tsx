"use client";

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Code, 
  Play, 
  Save, 
  Download, 
  Upload, 
  Copy, 
  Terminal, 
  BarChart3,
  Braces,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  Settings,
  BookOpen,
  Bot,
  Share2,
  FileCode,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CodeEditor from '@/components/CodeEditor/CodeEditor';
import ChatbotMini from '@/components/Chatbot/ChatbotMini';

interface WorkspaceState {
  code: string;
  language: 'python' | 'r' | 'javascript';
  output: string;
  variables: Record<string, any>;
}

export default function WorkspacePage() {
  const [location, setLocation] = useLocation();
  const [state, setState] = useState<WorkspaceState>({
    code: '# Bienvenue dans l\'atelier d\'analyse OpenEPI\n# Vous pouvez écrire du code R ou Python ici\n\n# Exemple : Calcul de risque relatif\ncalculate_rr <- function(a, b, c, d) {\n  risk_exposed <- a / (a + b)\n  risk_unexposed <- c / (c + d)\n  return(risk_exposed / risk_unexposed)\n}\n\n# Test avec des données d\'exemple\nrr <- calculate_rr(70, 30, 30, 70)\nprint(paste("Risque relatif:", round(rr, 2)))',
    language: 'r',
    output: '',
    variables: {}
  });

  const [activeTab, setActiveTab] = useState('editor');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Récupérer le code depuis l'URL ou le localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    const langFromUrl = params.get('lang') as WorkspaceState['language'];
    
    if (codeFromUrl) {
      setState(prev => ({
        ...prev,
        code: decodeURIComponent(codeFromUrl),
        language: langFromUrl || 'r'
      }));
    } else {
      const saved = localStorage.getItem('openepi_workspace');
      if (saved) {
        setState(JSON.parse(saved));
      }
    }
  }, []);

  // Sauvegarder automatiquement
  useEffect(() => {
    localStorage.setItem('openepi_workspace', JSON.stringify(state));
  }, [state]);

  const handleCodeChange = (value: string) => {
    setState(prev => ({ ...prev, code: value }));
  };

  const handleLanguageChange = (lang: WorkspaceState['language']) => {
    setState(prev => ({ ...prev, language: lang }));
  };

  const handleRunCode = async () => {
    setState(prev => ({ ...prev, output: 'Exécution en cours...' }));
    
    // Simulation d'exécution (à remplacer par un appel API réel)
    setTimeout(() => {
      const mockOutput = `> calculate_rr(70, 30, 30, 70)\n[1] "Risque relatif: 2.33"\n\n> # Variables disponibles dans l'environnement:\n> ls()\n[1] "calculate_rr" "rr"\n\n> rr\n[1] 2.333333`;
      
      setState(prev => ({ 
        ...prev, 
        output: mockOutput,
        variables: {
          calculate_rr: 'function',
          rr: 2.333333
        }
      }));
    }, 1500);
  };

  const handleSave = () => {
    const blob = new Blob([state.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openepi_analysis.${state.language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportNotebook = () => {
    const notebook = {
      cells: [
        {
          cell_type: 'code',
          source: state.code.split('\n'),
          metadata: {},
          outputs: state.output ? [{
            output_type: 'execute_result',
            data: {
              'text/plain': [state.output]
            }
          }] : []
        }
      ],
      metadata: {
        language: state.language,
        created: new Date().toISOString()
      }
    };
    
    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openepi_notebook.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToChatbot = () => {
    // Stocker le code pour le chatbot
    localStorage.setItem('chatbot_pending_code', JSON.stringify({
      code: state.code,
      language: state.language
    }));
    
    // Rediriger vers la page d'accueil avec le chatbot ouvert
    setLocation('/?chatbot=open&tab=code');
  };

  return (
    <div className={`flex flex-col h-screen bg-gray-50 dark:bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Retour
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Atelier d'Analyse OpenEPI</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Environnement de programmation pour analyses épidémiologiques
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChatbotOpen(!isChatbotOpen)}
                  className={isChatbotOpen ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                >
                  <Bot className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assistant IA</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? "Quitter le plein écran" : "Plein écran"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Barre d'outils */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Langage :</span>
              <div className="flex space-x-1">
                {(['r', 'python', 'javascript'] as const).map((lang) => (
                  <Button
                    key={lang}
                    variant={state.language === lang ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleLanguageChange(lang)}
                    className="text-xs capitalize"
                  >
                    {lang === 'r' ? 'R' : lang === 'python' ? 'Python' : 'JavaScript'}
                  </Button>
                ))}
              </div>
            </div>

            <Badge variant="outline" className="font-normal">
              <FileCode className="w-3 h-3 mr-1" />
              {state.language === 'r' ? 'R' : state.language === 'python' ? 'Python' : 'JS'}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToChatbot}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Partager avec l'Assistant
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Envoyer ce code au chatbot pour discussion</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleRunCode}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              Exécuter
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Éditeur et sorties */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="px-6 pt-3 bg-transparent border-b border-gray-200 dark:border-gray-800">
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Braces className="w-4 h-4" />
                Éditeur
              </TabsTrigger>
              <TabsTrigger value="output" className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Sortie
                {state.output && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1">
                    {state.output.split('\n').length} lignes
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="variables" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Variables
                {Object.keys(state.variables).length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1">
                    {Object.keys(state.variables).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="flex-1 p-0 m-0 overflow-hidden">
              <CodeEditor
                value={state.code}
                language={state.language}
                onChange={handleCodeChange}
                height="100%"
              />
            </TabsContent>

            <TabsContent value="output" className="flex-1 p-0 m-0">
              <ScrollArea className="h-full p-6">
                <div className="font-mono text-sm whitespace-pre-wrap bg-gray-900 text-gray-100 p-4 rounded-lg">
                  {state.output || "Exécutez du code pour voir la sortie ici..."}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="variables" className="flex-1 p-0 m-0">
              <ScrollArea className="h-full p-6">
                {Object.keys(state.variables).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(state.variables).map(([key, value]) => (
                      <Card key={key}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <code className="font-bold text-blue-600 dark:text-blue-400">{key}</code>
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                {typeof value}
                              </span>
                            </div>
                            <div className="font-mono">
                              {typeof value === 'function' ? 'function' : JSON.stringify(value, null, 2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune variable définie. Exécutez du code pour voir les variables ici.</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Panneau latéral avec le chatbot */}
        {isChatbotOpen && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <ChatbotMini onClose={() => setIsChatbotOpen(false)} />
          </div>
        )}
      </div>

      {/* Footer avec actions rapides */}
      <footer className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportNotebook}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter en .ipynb
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, code: '', output: '' }))}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Nouveau
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Créer un nouveau script</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {state.code.length} caractères • {state.code.split('\n').length} lignes
          </div>
        </div>
      </footer>
    </div>
  );
}