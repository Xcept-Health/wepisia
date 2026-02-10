"use client";

import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  User, 
  Code, 
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatbotMiniProps {
  onClose: () => void;
}

export default function ChatbotMini({ onClose }: ChatbotMiniProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Je suis votre assistant pour l'atelier d'analyse. Je peux vous aider avec votre code, expliquer des concepts, ou générer des exemples.",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simuler une réponse IA
    setTimeout(() => {
      const responses = [
        "Je peux vous aider à optimiser ce code. Avez-vous besoin d'explications sur une fonction particulière ?",
        "Voulez-vous que je génère un exemple similaire avec des données d'épidémiologie ?",
        "Ce script peut être amélioré pour être plus efficace. Je peux vous montrer comment.",
        "Je peux vous expliquer le calcul statistique impliqué dans votre code.",
        "Voulez-vous exporter ce code vers un notebook Jupyter ?"
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[Math.floor(Math.random() * responses.length)],
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Vérifier s'il y a du code en attente depuis l'éditeur
  useEffect(() => {
    const pendingCode = localStorage.getItem('chatbot_pending_code');
    if (pendingCode) {
      const { code, language } = JSON.parse(pendingCode);
      
      const codeMessage: Message = {
        id: 'pending-code',
        content: `J'ai reçu du code ${language.toUpperCase()} depuis l'éditeur :\n\n\`\`\`${language}\n${code.substring(0, 200)}${code.length > 200 ? '...' : ''}\n\`\`\`\n\nComment puis-je vous aider avec ce code ?`,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [prev[0], codeMessage]);
      localStorage.removeItem('chatbot_pending_code');
    }
  }, []);

  const handleInsertExample = () => {
    const exampleCode = `# Exemple : Analyse de survie (Kaplan-Meier)
library(survival)

# Données d'exemple
time <- c(6, 7, 10, 15, 19, 25, 32, 35, 40)
status <- c(1, 1, 0, 1, 0, 1, 1, 0, 1)
group <- c("A", "A", "A", "B", "B", "B", "A", "B", "A")

# Créer l'objet survie
surv_obj <- Surv(time, status)

# Ajuster le modèle Kaplan-Meier
km_fit <- survfit(surv_obj ~ group)

# Résumé
summary(km_fit)

# Test du log-rank
survdiff(surv_obj ~ group)`;

    setInput(`Pouvez-vous m'expliquer cette analyse de survie ?\n\n${exampleCode}`);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Assistant Code</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Connecté à l'éditeur</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-[85%] ${
                message.sender === 'user' 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {message.sender === 'assistant' ? (
                      <Bot className="w-3 h-3 text-blue-500" />
                    ) : (
                      <User className="w-3 h-3 text-green-500" />
                    )}
                    <span className="text-xs font-medium">
                      {message.sender === 'assistant' ? 'Assistant' : 'Vous'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      L'assistant réfléchit...
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Actions rapides */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInsertExample}
            className="text-xs h-7"
          >
            <Code className="w-3 h-3 mr-1" />
            Exemple
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const code = localStorage.getItem('openepi_workspace');
              if (code) {
                const { code: savedCode } = JSON.parse(code);
                setInput(`Pouvez-vous m'aider à améliorer ce code ?\n\n${savedCode.substring(0, 100)}...`);
              }
            }}
            className="text-xs h-7"
          >
            <Copy className="w-3 h-3 mr-1" />
            Code actuel
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Posez une question sur votre code..."
            className="min-h-[60px] pr-12 text-sm"
            rows={2}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 bottom-2 h-7 w-7 p-0"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}