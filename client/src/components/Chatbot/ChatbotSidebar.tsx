"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, X, Send, Bot, User, Maximize2, Minimize2,
  GripVertical, Trash2, Clock, Copy, Loader2, Globe, Mic,
  Paperclip, Brain, Calculator, FileText, MessageSquare,
  Settings, FileCode, BookOpen, Database, Presentation, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// --- Interfaces & Types ---
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

export function ChatbotSidebar({
  isOpen,
  onClose,
  width,
  onWidthChange,
  position = 'right'
}: ChatbotSidebarProps) {
  // --- States ---
  const [messages, setMessages] = useState<Message[]>([]); // Initialisation vide pour l'exemple
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [useMicrophone, setUseMicrophone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'settings'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, width: 0 });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const minWidth = 400;
  const maxWidth = 850;
  const expandedWidth = 650;

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen]);

  // --- Handlers ---
  const handleDragStart = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX, width };
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
  };

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    
    // Simulation
    setTimeout(() => {
      setIsTyping(false);
      // Logique de réponse simplifiée pour le design
    }, 1500);
  }, [input]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay Soft */}
      <div 
        // className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Principal */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 h-screen z-50 flex flex-col bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-xl transition-all duration-300 ease-in-out ${
          position === 'right' ? 'right-0' : 'left-0'
        }`}
        style={{ width: isExpanded ? expandedWidth : width }}
      >
        {/* Header Epuré */}
        <div className="flex items-center justify-end px-5 py-4 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8 text-zinc-500">
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-500 hover:text-red-500">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Tabs Modernes */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col h-full overflow-hidden">
          <div className="px-5 pt-4">
            <TabsList className="w-full bg-zinc-100/50 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
              <TabsTrigger value="chat" className="flex-1 rounded-lg text-xs py-2">
                <MessageSquare size={14} className="mr-2" /> Chat
              </TabsTrigger>
              <TabsTrigger value="models" className="flex-1 rounded-lg text-xs py-2">
                <Brain size={14} className="mr-2" /> Outils
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 rounded-lg text-xs py-2">
                <Settings size={14} className="mr-2" /> Réglages
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 pt-2">
            <ScrollArea className="flex-1 px-5">
              <div className="space-y-6 py-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 opacity-40">
                    <div className="p-4 rounded-full bg-zinc-100">
                      <MessageCircle size={32} />
                    </div>
                    <p className="text-sm">Démarrez une nouvelle conversation</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`group relative max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all ${
                      msg.sender === 'user' 
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' 
                        : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800'
                    }`}>
                      {msg.content}
                      <div className={`mt-2 flex items-center gap-2 text-[10px] ${msg.sender === 'user' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <Clock size={10} /> {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex items-center gap-3 text-zinc-500 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                      <Loader2 size={14} className="animate-spin" />
                    </div>
                    <span className="text-xs">L'assistant prépare une réponse...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Zone de saisie flottante */}
            <div className="p-5">
              <div className="relative group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-blue-500/50 transition-all p-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Posez votre question..."
                  className="min-h-[80px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 text-sm py-2 px-3"
                />
                <div className="flex items-center justify-between mt-2 px-2 pb-1">
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      {[
                        { icon: Paperclip, action: () => {}, active: false, label: "Fichier" },
                        { icon: Globe, action: () => setUseWebSearch(!useWebSearch), active: useWebSearch, label: "Web" },
                        { icon: Mic, action: () => setUseMicrophone(!useMicrophone), active: useMicrophone, label: "Vocal" }
                      ].map((tool, i) => (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 rounded-lg ${tool.active ? 'text-blue-600 bg-blue-50' : 'text-zinc-400'}`}
                              onClick={tool.action}
                            >
                              <tool.icon size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>{tool.label}</p></TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                  <Button 
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all transform active:scale-95"
                  >
                    <Send size={16} className="mr-2" /> Envoyer
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Autres onglets (simplifiés pour l'exemple) */}
          <TabsContent value="models" className="p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Outils d'analyse spécialisés</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Calculs', icon: Calculator, color: 'text-blue-500' },
                { label: 'Stats R', icon: FileCode, color: 'text-purple-500' },
                { label: 'Graphiques', icon: Presentation, color: 'text-emerald-500' },
                { label: 'Données', icon: Database, color: 'text-orange-500' }
              ].map((item, idx) => (
                <button key={idx} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 transition-colors group">
                  <item.icon size={24} className={`${item.color} mb-2 group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Resize Handle - Subtil */}
        <div
          className={`absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/30 transition-colors ${
            position === 'right' ? '-left-0.5' : '-right-0.5'
          }`}
          onMouseDown={handleDragStart}
        />
      </div>
    </>
  );
}