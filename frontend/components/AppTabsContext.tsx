"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  url: string; // Ajout de l'URL pour gérer les redirections intelligentes
}

interface AppTabsContextType {
  tabs: Tab[];
  activeTabId: string;
  isElectron: boolean;
  openTab: (id: string, label: string, url: string) => void;
  closeTab: (id: string) => void;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  isRightPanelCollapsed: boolean;
  setIsRightPanelCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const AppTabsContext = createContext<AppTabsContextType | undefined>(undefined);

export function AppTabsProvider({ children }: { children: ReactNode }) {
  const [isElectron, setIsElectron] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([{ id: "home", label: "CORE", url: "/" }]);
  const [activeTabId, setActiveTabId] = useState("home");
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsedState] = useState(false);

  useEffect(() => {
    // Initial Load
    try {
      const s = localStorage.getItem("sidebar_collapsed");
      if (s) setIsSidebarCollapsedState(s === "true");
      const r = localStorage.getItem("rightpanel_collapsed");
      if (r) setIsRightPanelCollapsedState(r === "true");
    } catch {}

    // Listen to changes from other frames/windows
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sidebar_collapsed") setIsSidebarCollapsedState(e.newValue === "true");
      if (e.key === "rightpanel_collapsed") setIsRightPanelCollapsedState(e.newValue === "true");
    };
    
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setIsSidebarCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsSidebarCollapsedState(prev => {
      const next = typeof value === "function" ? value(prev) : value;
      try { localStorage.setItem("sidebar_collapsed", next ? "true" : "false"); } catch {}
      return next;
    });
  };

  const setIsRightPanelCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsRightPanelCollapsedState(prev => {
      const next = typeof value === "function" ? value(prev) : value;
      try { localStorage.setItem("rightpanel_collapsed", next ? "true" : "false"); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && 
      (!!window.electronAPI || navigator.userAgent.toLowerCase().includes('electron'));
    setIsElectron(isDesktop);
  }, []);

  const openTab = (id: string, label: string, url: string) => {
    if (!isElectron) {
      // Sur le web, on pourrait rediriger ou ne rien faire, mais ici on va juste changer l'actif
      // pour rester cohérent si on simule des onglets web.
      setActiveTabId(id);
      return;
    }

    setTabs((prev) => {
      // Si l'ID exact existe déjà (ex: module dashboard unique), on ne fait que switcher
      if (prev.find((t) => t.id === id)) return prev;

      // Limite de 10 onglets
      if (prev.length >= 10) return prev;

      // Gestion dynamique du nom (ex: SESSION, SESSION (2), ...)
      let finalLabel = label;
      let count = 1;
      const existingLabels = prev.map(t => t.label);

      while (existingLabels.includes(finalLabel)) {
        count++;
        finalLabel = `${label} (${count})`;
      }

      return [...prev, { id, label: finalLabel, url }];
    });
    setActiveTabId(id);
  };

  const closeTab = (id: string) => {
    if (id === "home") return; // On ne ferme pas l'onglet principal

    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      return newTabs;
    });
  };

  return (
    <AppTabsContext.Provider value={{ 
      tabs, activeTabId, isElectron, openTab, closeTab, setActiveTabId, setTabs,
      isSidebarCollapsed, setIsSidebarCollapsed,
      isRightPanelCollapsed, setIsRightPanelCollapsed
    }}>
      {children}
    </AppTabsContext.Provider>
  );
}

export function useAppTabs() {
  const context = useContext(AppTabsContext);
  if (!context) {
    throw new Error("useAppTabs must be used within an AppTabsProvider");
  }
  return context;
}
