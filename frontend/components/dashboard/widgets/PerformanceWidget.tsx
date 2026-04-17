"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart, 
  Target, 
  Pizza, 
  CupSoda, 
  Cake, 
  UtensilsCrossed, 
  Beef, 
  Coffee, 
  ChefHat,
  ChevronRight
} from "lucide-react";
import { Role } from "@/lib/dashboard-config";
import { useDashboard } from "../DashboardContext";

interface PerformanceWidgetProps {
  role: Role;
}

// Mapping des icônes par catégorie de restaurant
const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("pizza")) return <Pizza size={12} />;
  if (n.includes("boisson") || n.includes("jus") || n.includes("soda")) return <CupSoda size={12} />;
  if (n.includes("dessert") || n.includes("sucré") || n.includes("gâteau")) return <Cake size={12} />;
  if (n.includes("viande") || n.includes("grillade")) return <Beef size={12} />;
  if (n.includes("café") || n.includes("petit déj")) return <Coffee size={12} />;
  if (n.includes("entrée") || n.includes("salade")) return <UtensilsCrossed size={12} />;
  
  return <ChefHat size={12} />; // Par défaut
};

export function PerformanceWidget({ role }: PerformanceWidgetProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { refreshTrigger } = useDashboard();

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const res = await fetch(`${API_URL}/stats/overview?company_id=${companyId}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching performance stats", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const isInitial = !stats;
    fetchStats(!isInitial);
  }, [refreshTrigger]);

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted/5 border border-border/10 rounded-[3px] animate-pulse h-24" />
        <div className="p-4 bg-muted/5 border border-border/10 rounded-[3px] animate-pulse h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI VENTES (Gérant, Comptable, Caisse) */}
      {(role === "gerant" || role === "comptable" || role === "caisse") && (
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="p-4 rounded-[3px] bg-[var(--primary-accent-pale)] border border-[var(--primary-accent)]/20 space-y-3"
        >
          <div className="flex justify-between items-start">
            <TrendingUp size={14} className="text-[var(--primary-accent)]" />
            <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 rounded-full font-bold">
               {stats.clients_today} CMDs
            </span>
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">CA du Jour</p>
            <h2 className="text-sm font-bold tracking-tight text-foreground">{(stats.ca_today || 0).toLocaleString()} CFA</h2>
          </div>
        </motion.div>
      )}

      {/* VENTES PAR CATÉGORIE (Mode Restaurant) */}
      <div className="p-4 rounded-[3px] bg-muted/5 border border-border/10 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Ventes / Catégorie</p>
          <span className="text-[8px] font-black text-[var(--primary-accent)]">AUJOURD'HUI</span>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
          {stats.by_category && stats.by_category.length > 0 ? (
            stats.by_category.map((cat: any) => (
              <div key={cat.name} className="flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-[2px] bg-muted/20 text-muted-foreground/60 group-hover:text-[var(--primary-accent)] group-hover:bg-[var(--primary-accent-pale)] transition-colors">
                    {getCategoryIcon(cat.name)}
                  </div>
                  <span className="text-[10px] font-bold text-foreground/70 group-hover:text-foreground transition-colors">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-tighter text-muted-foreground group-hover:text-foreground transition-colors">{cat.qty || 0}</span>
                  <ChevronRight size={10} className="text-muted-foreground/20 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-muted-foreground/30 italic text-center py-4">Aucune vente enregistrée</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper pour concaténer les classes (déjà importé dans RightPanel mais ici pour la sécurité du composant isolé)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
