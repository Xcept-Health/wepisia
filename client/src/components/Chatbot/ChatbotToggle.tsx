"use client";

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChatbotToggleProps {
  onClick: () => void;
  isActive: boolean;
  notificationCount?: number;
}

export function ChatbotToggle({ onClick, isActive, notificationCount = 0 }: ChatbotToggleProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showBubble, setShowBubble] = useState(true);

  // Animation de pulsation pour attirer l'attention
  useEffect(() => {
    if (notificationCount > 0 && !isActive) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [notificationCount, isActive]);

  // Cacher la bulle après 5 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBubble(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          {/* Tooltip */}
          {showTooltip && !isActive && (
            <div className="absolute bottom-full right-0 mb-3 w-72 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
              <div className="flex items-start space-x-2">
                
                <div>
                 
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Assistant IA spécialisé en épidémiologie. Posez vos questions sur les analyses statistiques, calculs épidémiologiques et interprétation de données.
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-white dark:bg-gray-800 transform rotate-45 border-r border-b border-gray-200 dark:border-gray-700" />
            </div>
          )}

          {/* Message bulle */}
          {showBubble && !isActive && (
            <div className="absolute bottom-full right-0 mb-3 animate-bounce-in">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center">
                  <Sparkles className="w-3 h-3 mr-2 animate-pulse" />
                  <span>Assistant IA disponible !</span>
                </div>
                <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 transform rotate-45" />
              </div>
            </div>
          )}

          {/* Bouton principal */}
          <Button
            onClick={onClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={`
              h-14 w-14 rounded-full shadow-xl transition-all duration-300
              ${isActive 
                ? 'bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700' 
                : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-800'
              }
              ${isPulsing ? 'animate-pulse ring-4 ring-blue-300 dark:ring-blue-900' : ''}
              transform hover:scale-110 active:scale-95
              relative overflow-hidden
            `}
          >
            {/* Effet de brillance */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            
            {isActive ? (
              <X className="w-6 h-6 text-white relative z-10" />
            ) : (
              <>
                <MessageCircle className="w-6 h-6 text-white relative z-10" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center bg-red-500 text-white text-xs font-bold shadow-lg border-2 border-white dark:border-gray-900">
                    {notificationCount}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}