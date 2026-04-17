"use client";

import React, { useRef, useEffect } from "react";
import {
  X,
  Home,
  Lock,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  ClipboardList,
  Users,
} from "lucide-react";
import { useAppTabs } from "./AppTabsContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Reorder } from "framer-motion";

// Helper pour obtenir l'icône de l'onglet
const getTabIcon = (id: string, label: string) => {
  if (id === "home") return <Home size={12} />;
  if (id.startsWith("login")) return <Lock size={12} />;

  // Dashboard Modules mapping
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("vente") || id === "sales")
    return <ShoppingCart size={12} />;
  if (lowerLabel.includes("inventaire") || id === "inventory")
    return <Package size={12} />;
  if (lowerLabel.includes("caisse") || id === "pos")
    return <Receipt size={12} />;
  if (lowerLabel.includes("compta") || id === "finance")
    return <Wallet size={12} />;
  if (lowerLabel.includes("traçabilité") || id === "history")
    return <ClipboardList size={12} />;
  if (lowerLabel.includes("personnel") || id === "users")
    return <Users size={12} />;
  if (lowerLabel.includes("bord") || id === "dashboard")
    return <LayoutDashboard size={12} />;
  if (lowerLabel.includes("réglage") || id === "settings")
    return <Settings size={12} />;

  return <LayoutDashboard size={12} />;
};

export function TabBar() {
  const { tabs, activeTabId, openTab, closeTab, isElectron, setTabs } =
    useAppTabs();
  const scrollContainerRef = useRef<HTMLUListElement>(null);

  // Faire défiler l'onglet actif dans la vue s'il est hors champ
  useEffect(() => {
    const activeElement = scrollContainerRef.current?.querySelector(
      `[data-tab-id="${activeTabId}"]`,
    );
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTabId]);

  if (!isElectron || tabs.length <= 1) return null;

  return (
    <div className="relative group flex items-center h-9 bg-muted/20 border-b border-border/50 select-none">
      <div className="flex-1 flex items-center overflow-hidden h-full">
        {/* Reorderable Tab Group */}
        <Reorder.Group
          axis="x"
          values={tabs}
          onReorder={setTabs}
          ref={scrollContainerRef}
          className="flex items-center h-full overflow-x-auto no-scrollbar scroll-smooth w-full"
        >
          <AnimatePresence initial={false}>
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <Reorder.Item
                  key={tab.id}
                  value={tab}
                  data-tab-id={tab.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className={cn(
                    "relative flex items-center h-full min-w-[120px] max-w-[200px] px-3 border-r border-border/50 cursor-pointer transition-colors duration-150 shrink-0 group/tab",
                    isActive
                      ? "bg-background text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "bg-transparent text-muted-foreground/60 hover:bg-muted/30 hover:text-muted-foreground",
                  )}
                  onPointerDown={() => openTab(tab.id, tab.label, tab.url)}
                >
                  {/* Accent supérieur VS Code */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabTopBorder"
                      className="absolute top-0 left-0 right-0 h-[1px] bg-[var(--primary-accent)]"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}

                  {/* Icône de l'onglet */}
                  <div
                    className={cn(
                      "mr-2 transition-colors",
                      isActive
                        ? "text-[var(--primary-accent)]"
                        : "text-muted-foreground/40",
                    )}
                  >
                    {getTabIcon(tab.id, tab.label)}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1",
                      isActive ? "font-bold" : "font-medium",
                    )}
                  >
                    {tab.label}
                  </span>

                  {/* Bouton Fermer */}
                  {tab.id !== "home" && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className={cn(
                        "ml-2 p-0.5 rounded-[2px] transition-all",
                        isActive
                          ? "opacity-60 hover:opacity-100 hover:bg-muted"
                          : "opacity-0 group-hover/tab:opacity-100 hover:bg-muted",
                      )}
                    >
                      <X size={12} />
                    </button>
                  )}
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
