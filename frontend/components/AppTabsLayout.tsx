"use client";

import React from "react";
import { useAppTabs } from "./AppTabsContext";
import { TabBar } from "./TabBar";
import { motion, AnimatePresence } from "framer-motion";

// Composant pour le module de connexion (simplifié pour l'exemple, ou importé si existant)
import WelcomePage from "@/app/page"; 
// Note: Importer des pages directement peut être complexe à cause des hooks Next.js.
// Une meilleure approche est d'avoir des composants "Module" dédiés.

export function AppTabsLayout({ children }: { children: React.ReactNode }) {
  const { tabs, activeTabId, isElectron } = useAppTabs();

  if (!isElectron) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barre d'onglets globale (sous la TitleBar) */}
      <TabBar />

      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0 h-full w-full"
            style={{ 
              display: activeTabId === tab.id ? "block" : "none",
              zIndex: activeTabId === tab.id ? 10 : 0 
            }}
          >
            {tab.id === "home" ? (
              // L'onglet par défaut affiche le "children" actuel de Next.js
              children
            ) : (
              // Pour tout autre onglet (Login ou Module Dashboard), on utilise une iframe
              // pour garder une isolation propre tout en partageant la session (même origine).
              // Utilisation de l'URL stockée dans l'objet tab
              <iframe 
                src={tab.url.includes('?') ? `${tab.url}&isTab=true` : `${tab.url}?isTab=true`} 
                className="w-full h-full border-none bg-background" 
                title={tab.label}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
