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
       
          {/* Bouton principal */}
          <Button
            onClick={onClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={`
              h-16 w-16 rounded-full shadow-xl transition-all duration-300
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
              <X className="w-7 h-7 text-white relative z-10" />
            ) : (
              <>
                <MessageCircle className="w-7 h-7 text-white relative z-10" />
               
              </>
            )}
          </Button>
        </div>
      </div>

   
    </>
  );
}