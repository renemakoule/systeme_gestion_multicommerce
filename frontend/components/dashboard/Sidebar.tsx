"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getDashboardMenu,
  MenuItem,
  Role,
  ShopType,
} from "@/lib/dashboard-config";
import { ChevronLeft, ChevronRight, LogOut, Palette } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import { useAppTabs } from "@/components/AppTabsContext";
import { useRouter } from "next/navigation";

interface SidebarProps {
  role: Role;
  shopType: ShopType;
  activeOption: string;
  onOptionClick: (optionId: string) => void;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  role,
  shopType,
  activeOption,
  onOptionClick,
  isSidebarCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { openTab, activeTabId, isElectron } = useAppTabs();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isInTab = searchParams?.get("isTab") === "true";
  
  const [activeMenuId, setActiveMenuId] = useState("dashboard");
  const [isHovered, setIsHovered] = useState(false);
  const { accentColor, setAccentColor, company } = useDashboard();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("user-logged-in"));
    router.push("/");
  };

  const themes = [
    { id: "violet", color: "#e188ff" },
    { id: "emerald", color: "#10b981" },
    { id: "blue", color: "#3b82f6" },
    { id: "gold", color: "#f59e0b" },
  ] as const;

  const menus = getDashboardMenu(role, shopType, [], company?.name);
  const currentMenu = menus.find((m) => m.id === activeMenuId) || menus[0];

  // Quand on collapse, on reset le hover
  React.useEffect(() => {
    if (isSidebarCollapsed) setIsHovered(false);
  }, [isSidebarCollapsed]);

  return (
    // Le conteneur est transparent — c'est le layout qui gère la largeur et overflow
    <div className="relative h-full flex w-full">
      {/* ── 1ère COLONNE : ICONES ── */}
      <div
        onMouseEnter={() => !isSidebarCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "flex flex-col h-full bg-background border-r border-border/20 transition-all duration-300 z-20 shrink-0",
          // Quand sidebar ouverte et hovered → s'élargit légèrement pour montrer les labels
          !isSidebarCollapsed && isHovered ? "w-[160px]" : "w-[60px]",
        )}
      >
        {/* LOGO / ENTREPRISE */}
        <div className="p-4 mb-4 flex justify-start pl-4 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0 overflow-hidden">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-background font-black text-xs uppercase">
                {company?.name?.[0] || "G"}
              </span>
            )}
          </div>
          <AnimatePresence>
            {!isSidebarCollapsed && isHovered && (
              <motion.span
                key="company-name"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="ml-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap self-center overflow-hidden text-ellipsis"
              >
                {company?.name || "Chargement..."}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* MENU ICONS */}
        <div className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          {menus.map((menu) => {
            const Icon = menu.icon;
            const isActive = activeMenuId === menu.id;
            return (
              <button
                key={menu.id}
                onClick={() => setActiveMenuId(menu.id)}
                className={cn(
                  "w-full flex items-center rounded-[3px] p-2 transition-all group overflow-hidden",
                  isActive
                    ? "bg-accent/40 text-[var(--primary-accent)]"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <AnimatePresence>
                  {!isSidebarCollapsed && isHovered && (
                    <motion.span
                      key={`label-${menu.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="ml-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                    >
                      {menu.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {/* THEME PICKER & LOGOUT */}
        <div className="p-2 space-y-3">
          <AnimatePresence>
            {!isSidebarCollapsed && isHovered && (
              <motion.div
                key="theme-picker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-between items-center px-1"
              >
                <div className="flex gap-1.5">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAccentColor(t.id)}
                      className={cn(
                        "w-3 h-3 rounded-full border border-border/40 transition-transform active:scale-90",
                        accentColor === t.id
                          ? "scale-125 ring-1 ring-[var(--primary-accent)]/50 ring-offset-1 ring-offset-background"
                          : "",
                      )}
                      style={{ backgroundColor: t.color }}
                    />
                  ))}
                </div>
                <Palette
                  size={10}
                  className="text-muted-foreground opacity-40"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleLogout}
            className="w-full flex items-center rounded-[3px] p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all overflow-hidden"
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <LogOut size={16} />
            </div>
            <AnimatePresence>
              {!isSidebarCollapsed && isHovered && (
                <motion.span
                  key="logout-label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                >
                  Quitter
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* ── 2ème COLONNE : OPTIONS (s'anime en glissement) ── */}
      <AnimatePresence initial={false}>
        {!isSidebarCollapsed && (
          <motion.div
            key="sidebar-options"
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="flex-1 flex flex-col bg-background/20 overflow-hidden"
            style={{ minWidth: 0 }}
          >
            <div className="p-5 border-b border-border/20 shrink-0">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {currentMenu?.label}
              </h3>
            </div>
            <div className="flex-1 p-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
              {currentMenu?.options.map((option) => {
                const isActive = (isElectron && !isInTab) ? activeTabId === option.id : activeOption === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (isElectron && !isInTab) {
                        openTab(option.id, option.label, `/dashboard?module=${option.id}`);
                      } else {
                        // Navigation locale dans l'onglet : on met à jour l'URL
                        router.push(`/dashboard?module=${option.id}&isTab=true`);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center rounded-[3px] px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                      isActive
                        ? "bg-accent/30 text-[var(--primary-accent)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOUTON TOGGLE (positionné à droite de la 1ère colonne) ── */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border/40 flex items-center justify-center z-30 hover:bg-accent transition-all shadow-sm"
      >
        {isSidebarCollapsed ? (
          <ChevronRight size={12} />
        ) : (
          <ChevronLeft size={12} />
        )}
      </button>
    </div>
  );
}
