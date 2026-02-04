"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User,
  Maximize2, 
  Minimize2,
  GripVertical,
  Trash2,
  Clock,
  Sparkles,
  Copy,
  Loader2,
  Globe,
  Mic,
  Paperclip,
  ChevronUp,
  Brain,
  Calculator,
  FileText,
  MessageSquare,
  Settings,
  CheckCircle,
  FileCode,
  Search,
  Download,
  Upload,
  History,
  BookOpen,
  Database,
  PieChart,
  BarChart3,
  LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  reasoning?: string;
  sources?: { title: string; url: string }[];
}

interface ChatbotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  position?: 'right' | 'left';
}

// Données initiales pour la conversation
const initialMessages: Message[] = [
  {
    id: '1',
    content: "Comment calculer un risque relatif en épidémiologie ?",
    sender: 'user',
    timestamp: new Date(Date.now() - 7200000),
  },
  {
    id: '2',
    content: `# Risque Relatif en Épidémiologie

## Définition
Le **risque relatif (RR)** mesure l'association entre une exposition et une maladie. Il compare le risque de maladie chez les exposés au risque chez les non-exposés.

## Formule
\`\`\`
RR = (a / (a + b)) / (c / (c + d))
\`\`\`

## Exemple
Tableau 2×2 pour le tabagisme et le cancer du poumon :

|            | Cancer | Pas Cancer | Total |
|------------|--------|------------|-------|
| Fumeurs    | 70     | 30         | 100   |
| Non-fumeurs| 30     | 70         | 100   |

**Calcul :**
- Risque chez les fumeurs = 70/100 = 0.70
- Risque chez les non-fumeurs = 30/100 = 0.30
- **RR = 0.70 / 0.30 = 2.33**

## Interprétation
- **RR = 1** : Pas d'association
- **RR > 1** : Risque accru (association positive)
- **RR < 1** : Risque réduit (effet protecteur)`,
    sender: 'assistant',
    timestamp: new Date(Date.now() - 3600000),
    reasoning: "L'utilisateur demande une explication sur le calcul du risque relatif en épidémiologie. Je vais fournir une définition claire, la formule, un exemple concret et interpréter les résultats.",
    sources: [
      { title: "Guide des mesures de risque", url: "/docs/epidemiology/risk-measures" },
      { title: "Calcul du risque relatif", url: "/docs/statistics/relative-risk" }
    ]
  },
];



const mockResponses = [
  "J'ai analysé votre question sur les données épidémiologiques. Voici une explication détaillée basée sur les meilleures pratiques actuelles...",
  "Très bonne question ! En épidémiologie, ce concept est fondamental. Voici comment l'aborder...",
  "Je comprends votre besoin d'analyse. Voici une méthodologie éprouvée pour traiter ce type de données...",
  "Excellent sujet ! L'approche recommandée consiste à suivre ces étapes...",
  "Cette question touche à un aspect important de l'analyse statistique. Voici ce que je recommande...",
];

export function ChatbotSidebar({
  isOpen,
  onClose,
  width,
  onWidthChange,
  position = 'right'
}: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'settings'>('chat');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, width: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const minWidth = 420;
  const maxWidth = 800;
  const expandedWidth = 600;

  // Auto-scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input quand la sidebar s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Gestion du redimensionnement
  const handleDragStart = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, width };
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const delta = position === 'right' 
      ? dragStartRef.current.x - e.clientX
      : e.clientX - dragStartRef.current.x;
    
    let newWidth = dragStartRef.current.width + delta;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    onWidthChange(newWidth);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, position]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulation de réponse IA avec raisonnement
    setTimeout(() => {
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: randomResponse + "\n\n**Exemple pratique :**\n\n```javascript\n// Calcul du risque relatif\nconst calculateRR = (a, b, c, d) => {\n  const riskExposed = a / (a + b);\n  const riskUnexposed = c / (c + d);\n  return riskExposed / riskUnexposed;\n};\n\n// Exemple d'utilisation\nconst rr = calculateRR(70, 30, 30, 70); // RR = 2.33\nconsole.log(`Risque relatif: ${rr.toFixed(2)}`);\n```",
        sender: 'assistant',
        timestamp: new Date(),
        reasoning: "L'utilisateur a posé une question sur l'analyse épidémiologique. Je fournis une réponse détaillée avec un exemple de code pour illustrer le calcul.",
        sources: [
          { title: "Guide OpenEPI - Analyses", url: "/docs/analyses" },
          { title: "Référence statistique", url: "/docs/statistics" }
        ]
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 2000);
  }, [input]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        sender: 'assistant',
        timestamp: new Date(),
        reasoning: "Nouvelle conversation démarrée. Je propose une assistance pour les analyses épidémiologiques.",
        sources: [
          { title: "Documentation OpenEPI", url: "/docs" },
          { title: "Guide des analyses", url: "/docs/analyses" }
        ]
      }
    ]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // Vous pourriez ajouter un toast ici
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
      />

      {/* Sidebar Chatbot */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 h-screen z-50 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-all duration-300 ${
          position === 'right' ? 'right-0' : 'left-0'
        }`}
        style={{ width: isExpanded ? expandedWidth : width }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
     
          </div>
          
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="hidden lg:flex"
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isExpanded ? "Réduire" : "Étendre"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col h-full">
          <TabsList className="grid grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="w-3 h-3 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="models" className="text-xs">
              <Brain className="w-3 h-3 mr-2" />
              Outils
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="w-3 h-3 mr-2" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab - Structure corrigée */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 p-0 overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col">
            
              {/* Conversation avec scroll */}
              <ScrollArea className="flex-1 px-4 pb-2">
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <Card className={`max-w-[85%] ${
                        message.sender === 'user' 
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800' 
                          : 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border-gray-200 dark:border-gray-700'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              {message.sender === 'assistant' ? (
                                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                  <Bot className="w-3.5 h-3.5 text-white" />
                                </div>
                              ) : (
                                <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                                  <User className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                              <span className="text-xs font-semibold">
                                {message.sender === 'assistant' ? 'Assistant OpenEPI' : 'Vous'}
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>{formatTime(message.timestamp)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleCopy(message.content)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap markdown-content">
                              {message.content}
                            </div>
                          </div>

                          {message.reasoning && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Brain className="w-3 h-3 mr-2" />
                                Raisonnement de l'IA
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{message.reasoning}</p>
                            </div>
                          )}

                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <BookOpen className="w-3 h-3 mr-2" />
                                Sources
                              </div>
                              <div className="space-y-1">
                                {message.sources.map((source, idx) => (
                                  <a
                                    key={idx}
                                    href={source.url}
                                    className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <FileText className="w-3 h-3 mr-2" />
                                    {source.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border-gray-200 dark:border-gray-700">
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                              <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                L'assistant réfléchit...
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Progress value={75} className="h-1" />
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              Analyse en cours...
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input area - maintenant fixé en bas */}
            <div className=" px-2 py-4 bg-white dark:bg-gray-900">
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl  overflow-hidden">
                <div className="relative p-2">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Écrivez votre message ici... (Vous pouvez inclure des formules, des données, ou poser des questions complexes)"
                    className="min-h-[100px] max-h-[200px] resize-none border border-dark-300 bg-transparent pt-2 focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 p-2"
                    rows={3}
                    maxLength={4000}
                  />
                  
                  <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow"
                            onClick={() => document.getElementById('file-upload')?.click()}
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Joindre un fichier</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUseMicrophone(!useMicrophone)}
                            className={`h-8 w-8 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow ${
                              useMicrophone ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : ''
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{useMicrophone ? 'Microphone activé' : 'Activer microphone'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUseWebSearch(!useWebSearch)}
                            className={`h-8 w-8 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow ${
                              useWebSearch ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' : ''
                            }`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{useWebSearch ? 'Recherche web activée' : 'Activer recherche web'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      {isTyping ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                

                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept=".csv,.xlsx,.json,.pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      console.log('Fichiers joints:', files);
                    }
                  }}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="models" className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Outils d'analyse
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto p-3 flex flex-col items-center justify-center text-center">
                    <Calculator className="w-5 h-5 mb-2 text-blue-500" />
                    <span className="text-xs font-medium">Calcul statistique</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-3 flex flex-col items-center justify-center text-center">
                    <BarChart3 className="w-5 h-5 mb-2 text-green-500" />
                    <span className="text-xs font-medium">Visualisation</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-3 flex flex-col items-center justify-center text-center">
                    <Database className="w-5 h-5 mb-2 text-purple-500" />
                    <span className="text-xs font-medium">Analyse données</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-3 flex flex-col items-center justify-center text-center">
                    <FileCode className="w-5 h-5 mb-2 text-orange-500" />
                    <span className="text-xs font-medium">Code R/Python</span>
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Modèles disponibles
                </h4>
                <div className="space-y-2">
                  {[
                    { name: "GPT-4", description: "Analyse avancée", icon: Brain },
                    { name: "Claude 3", description: "Raisonnement complexe", icon: Sparkles },
                    { name: "OpenEPI Expert", description: "Spécialisé épidémiologie", icon: BookOpen },
                  ].map((model, idx) => {
                    const Icon = model.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      >
                        <Icon className="w-4 h-4 mr-3 text-blue-500" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {model.description}
                          </div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Paramètres du chat
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="web-search" className="text-sm">Recherche web</Label>
                    <Switch
                      id="web-search"
                      checked={useWebSearch}
                      onCheckedChange={setUseWebSearch}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="microphone" className="text-sm">Activer microphone</Label>
                    <Switch
                      id="microphone"
                      checked={useMicrophone}
                      onCheckedChange={setUseMicrophone}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="attachments" className="text-sm">Autoriser pièces jointes</Label>
                    <Switch id="attachments" defaultChecked />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Interface
                </h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? <Minimize2 className="w-3 h-3 mr-2" /> : <Maximize2 className="w-3 h-3 mr-2" />}
                    {isExpanded ? "Mode normal" : "Mode étendu"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={handleClearChat}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Effacer l'historique
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Handle de redimensionnement */}
        <div
          className={`absolute top-0 bottom-0 w-3 cursor-col-resize group hover:bg-blue-400/20 transition-colors ${
            position === 'right' ? '-left-1.5' : '-right-1.5'
          }`}
          onMouseDown={handleDragStart}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-400 transition-colors" />
          <GripVertical className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </>
  );
}