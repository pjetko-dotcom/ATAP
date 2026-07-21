import { useState, useEffect } from 'react';

export interface Analysis {
  id: string;
  name: string;
  systemType: string;
  asvsLevel: string;
  businessOwners: string;
  createdAt: string;
  status: string;
}

const STORAGE_KEY = 'atap_analyses';

export function useAnalyses() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setAnalyses(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored analyses');
      }
    } else {
      // Initialize with a mock if empty
      const initial: Analysis[] = [{
        id: "1",
        name: "Retail Banking API v2.4",
        systemType: "api",
        asvsLevel: "2",
        businessOwners: "team@example.com",
        createdAt: new Date().toISOString(),
        status: "Draft"
      }];
      setAnalyses(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
  }, []);

  const saveAnalysis = (analysis: Omit<Analysis, 'id' | 'createdAt' | 'status'>) => {
    const newAnalysis: Analysis = {
      ...analysis,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'Draft'
    };
    const updated = [...analyses, newAnalysis];
    setAnalyses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newAnalysis;
  };

  const deleteAnalysis = (id: string) => {
    const updated = analyses.filter(a => a.id !== id);
    setAnalyses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { analyses, saveAnalysis, deleteAnalysis };
}
