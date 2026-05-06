"use client";

import { useState, useEffect } from 'react';

export function useWorkspaceSync() {
  const [workspaceData, setWorkspaceData] = useState<any>(null);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'openepi_workspace') {
        setWorkspaceData(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'OPENEPI_WORKSPACE_UPDATE') {
        setWorkspaceData(e.data.payload);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const sendToWorkspace = (code: string, language: 'r' | 'python' | 'javascript') => {
    const data = { code, language };
    localStorage.setItem('openepi_workspace', JSON.stringify(data));
    
    // Ouvrir ou mettre à jour le workspace
    window.postMessage({ 
      type: 'OPENEPI_WORKSPACE_UPDATE', 
      payload: data 
    }, '*');
    
    return '/workspace';
  };

  return { workspaceData, sendToWorkspace };
}