"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Lecture manuelle des paramètres URL pour éviter useSearchParams()
// qui bloque l'hydratation en mode export statique (file://)
function getSearchParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  } catch {
    return null;
  }
}

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isInFrame, setIsInFrame] = useState(false);

  useEffect(() => {
    const isTabParam = getSearchParam("isTab") === "true";
    setIsInFrame(window.self !== window.top || isTabParam);
  }, []);

  return (
    <main className={cn(
      "flex-1 overflow-hidden",
      !isInFrame && "pt-9"
    )}>
      {children}
    </main>
  );
}
