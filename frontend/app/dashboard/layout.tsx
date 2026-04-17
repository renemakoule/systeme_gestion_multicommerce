"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { RightPanel } from "@/components/dashboard/RightPanel";
import { cn } from "@/lib/utils";
import { Role, ShopType } from "@/lib/dashboard-config";

import { RefreshCw } from "lucide-react";
import {
  DashboardProvider,
  useDashboard,
} from "@/components/dashboard/DashboardContext";
import { useAppTabs } from "@/components/AppTabsContext";
import { LicenseGuard } from "@/components/LicenseGuard";
import { RatingModal } from "@/components/dashboard/RatingModal";
import { API_URL } from "@/lib/config";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const {
    role,
    setRole,
    shopType,
    setShopType,
    activeOption,
    setActiveOption,
    refreshTrigger,
    triggerRefresh,
    realtimeSatisfactionSignal,
  } = useDashboard();

  const {
    activeTabId,
    tabs,
    isElectron,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isRightPanelCollapsed,
  } = useAppTabs();

  const [showRating, setShowRating] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [initialRating, setInitialRating] = useState(0);

  React.useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsed = JSON.parse(userData);
      setRole(parsed.role as Role);
      setShopType(parsed.company_type as ShopType);
      setCompanyId(parsed.company_id);
    }
  }, [setRole, setShopType]);

  // Vérifier s'il faut afficher le modal de satisfaction
  React.useEffect(() => {
    if (companyId) {
      const checkRatingStatus = async () => {
        try {
          // 1. Vérifier l'intervalle classique
          const res = await fetch(`${API_URL}/companies/${companyId}/rating-status`);
          if (res.ok) {
            const data = await res.json();
            if (data.current_rating !== undefined) setInitialRating(data.current_rating);
            if (data.should_prompt) return setShowRating(true);
          }
          
          // 2. Vérifier le trigger manuel de l'équipe technique
          const resBroadcast = await fetch(`${API_URL}/companies/${companyId}/broadcast/active`);
          if (resBroadcast.ok) {
            const dataB = await resBroadcast.json();
            if (dataB.current_rating !== undefined) setInitialRating(dataB.current_rating);
            if (dataB.satisfaction_prompt) return setShowRating(true);
          }
        } catch (err) {
          console.error("Failed to check rating status:", err);
        }
      };

      
      // Petit délai pour ne pas agresser au chargement
      const timer = setTimeout(checkRatingStatus, 3000);
      return () => clearTimeout(timer);
    }
  }, [companyId]);
  
  // Déclencheur temps réel via WebSocket
  React.useEffect(() => {
    if (realtimeSatisfactionSignal > 0) {
      setShowRating(true);
    }
  }, [realtimeSatisfactionSignal]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR (largeur pilotée par isSidebarCollapsed) ── */}
        <motion.div
          animate={{ width: isSidebarCollapsed ? 60 : 200 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          className="h-full flex-shrink-0 flex flex-col border-r border-border/40 overflow-hidden"
          style={{ minWidth: isSidebarCollapsed ? 60 : 200 }}
        >
          <Sidebar
            role={role}
            shopType={shopType}
            activeOption={activeOption}
            onOptionClick={setActiveOption}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
          />
        </motion.div>

        {/* ── MAIN INTERFACE (flex-1 = prend tout l'espace restant) ── */}
        <main className="flex-1 h-full flex flex-col border-r border-border/40 overflow-hidden min-w-0">
          {/* Breadcrumb */}
          <div className="h-12 border-b border-border/10 flex items-center px-8 bg-background/20 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Gestion
              </span>
              <span className="text-[8px] text-muted-foreground/40">/</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)]">
                {isElectron
                  ? tabs.find((t) => t.id === activeTabId)?.label || activeTabId
                  : activeOption}
              </span>
            </div>
          </div>

          {/* TAB BAR (Désactivé ici car géré globalement dans AppTabsLayout) */}
          {/* <TabBar /> */}

          {/* Content */}
          <div className="flex-1 overflow-hidden p-8 bg-background/5">
            {isElectron ? (
              // En Electron (Multi-tabs) : on évite de démonter le conteneur pour garder l'état
              <div className="h-full">{children}</div>
            ) : (
              // En Web : on garde l'animation de transition classique
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeOption}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL (20%) ── */}
        <motion.div
          initial={false}
          animate={{
            width: isRightPanelCollapsed ? 0 : "20%",
            minWidth: isRightPanelCollapsed ? 0 : 280,
            opacity: isRightPanelCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          className="h-full overflow-hidden shrink-0"
        >
          <RightPanel role={role} shopType={shopType} />
        </motion.div>
      </div>

      <footer className="h-7 border-t border-border/20 grid grid-cols-3 items-center bg-background/50 backdrop-blur-md px-8 z-50">
        {/* Left: Live Sync */}
        <div className="flex items-center gap-2">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--primary-accent)] animate-pulse" />
          <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-[var(--primary-accent)]/70">
            Live Sync
          </span>
        </div>

        {/* Center: Copyright */}
        <div className="flex justify-center flex-1">
          <p className="text-[9px] tracking-[0.4em] text-muted-foreground/60 font-bold whitespace-nowrap">
            ©{new Date().getFullYear()}.CM | Powered by GAS
          </p>
        </div>

        {/* Right: Auto-update button */}
        <div className="flex justify-end">
          <button
            onClick={triggerRefresh}
            className="flex items-center gap-2 group hover:bg-muted/30 px-2 py-0.5 rounded-[2px] transition-all"
            title="Rafraîchir maintenant"
          >
            <motion.div
              animate={{ rotate: refreshTrigger * 360 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <RefreshCw
                size={10}
                className="text-muted-foreground/40 group-hover:text-[var(--primary-accent)] transition-colors"
              />
            </motion.div>
          </button>
        </div>
      </footer>

      {showRating && companyId && (
        <RatingModal 
          companyId={companyId} 
          initialRating={initialRating}
          onClose={() => setShowRating(false)} 
        />
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <LicenseGuard>
        <DashboardContent>{children}</DashboardContent>
      </LicenseGuard>
    </DashboardProvider>
  );
}
