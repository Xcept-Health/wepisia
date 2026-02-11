"use client";

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils"; // Utilitaire standard shadcn pour les classes

interface ChatbotToggleProps {
  onClick: () => void;
  isActive: boolean;
  notificationCount?: number;
}

export function ChatbotToggle({ onClick, isActive, notificationCount = 0 }: ChatbotToggleProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Animation de pulsation élégante quand il y a des notifications
  useEffect(() => {
    if (notificationCount > 0 && !isActive) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [notificationCount, isActive]);

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
      
      {/* Tooltip flottant style "Message IA" */}
      {notificationCount > 0 && !isActive && (
        <div className="animate-bounce-in bg-white dark:bg-card border border-border px-4 py-2 rounded-2xl shadow-2xl mb-2 relative glass max-w-[200px]">
           <p className="text-xs font-medium text-foreground leading-tight">
             Besoin d'aide ? J'ai {notificationCount} réponse{notificationCount > 1 ? 's' : ''} pour vous.
           </p>
           {/* Petite flèche du tooltip */}
           <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-card border-r border-b border-border rotate-45" />
        </div>
      )}

      <div className="relative group">
        {/* Anneau d'animation extérieur (Pulse) */}
        {isPulsing && (
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        )}

        <Button
          onClick={onClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={cn(
            "relative h-16 w-16 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 ease-in-out border overflow-hidden",
            isActive 
              ? "bg-destructive text-destructive-foreground rotate-90 scale-110 border-transparent" 
              : "bg-background glass hover:bg-background/90 border-border text-foreground hover:shadow-primary/20 hover:scale-105"
          )}
        >
          {/* Effet de brillance AI (Shimmer) au survol */}
          {!isActive && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          )}

          {isActive ? (
            <X className="w-6 h-6 transition-transform duration-500 group-hover:rotate-90" />
          ) : (
            <div className="relative">
              <MessageCircle className={cn(
                "w-7 h-7 transition-all duration-300",
                showTooltip ? "opacity-0 scale-50" : "opacity-100 scale-100"
              )} />
              <Bot className={cn(
                "w-7 h-7 absolute inset-0 transition-all duration-300",
                showTooltip ? "opacity-100 scale-110 text-primary" : "opacity-0 scale-50"
              )} />
              
              {/* Point de notification chic */}
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-background"></span>
                </span>
              )}
            </div>
          )}
        </Button>

        {/* Petit badge Sparkles pour l'aspect "Innovative/IA" */}
        {!isActive && (
          <div className="absolute -top-1 -left-1 bg-primary text-primary-foreground p-1 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300">
            <Sparkles className="w-3 h-3 fill-current" />
          </div>
        )}
      </div>
    </div>
  );
}