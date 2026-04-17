"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { applyColorTheme } from "@/lib/color-themes";

/**
 * Ce composant gère la synchronisation du thème entre la fenêtre parente (Electron)
 * et les diffèrentes iframes (onglets).
 */
export function ThemeSync() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      // 1. Synchronisation Mode Sombre / Clair
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue);
      }
      
      // 2. Synchronisation Palettes de Couleurs (OKLCH)
      if (e.key === "color-theme") {
        // resolvedTheme est prioritaire, mais on vérifie localStorage si non résolu
        const isDark = resolvedTheme 
          ? resolvedTheme === "dark" 
          : localStorage.getItem("theme") === "dark";
        applyColorTheme(e.newValue, isDark);
      }
    };

    // Application initiale robuste au montage
    const savedPalette = localStorage.getItem("color-theme");
    const initialIsDark = resolvedTheme 
      ? resolvedTheme === "dark" 
      : localStorage.getItem("theme") === "dark";
    
    if (savedPalette) {
      applyColorTheme(savedPalette, initialIsDark);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [setTheme, resolvedTheme]);

  // Ré-appliquer la palette si resolvedTheme change (passage manuel light/dark)
  useEffect(() => {
    if (resolvedTheme) {
      const savedPalette = localStorage.getItem("color-theme");
      applyColorTheme(savedPalette, resolvedTheme === "dark");
    }
  }, [resolvedTheme]);

  return null;
}
