"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { TrendingUp, Users, ShoppingBag, Receipt, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";

export function IncomeModule() {
  const { user } = useDashboard();
  const companyId = user?.company_id || 1;
  const [sales, setSales] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("daily");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/stats/overview?company_id=${companyId}&period=${period}`),
        fetch(`${API_URL}/sales/?company_id=${companyId}&period=${period}`)
      ]);
      
      const statsData = await statsRes.json();
      const salesData = await salesRes.json();
      
      setStats(statsData);
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (err) {
      console.error("Error fetching income data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, period]);

  if (!stats) return <div className="text-center p-20 opacity-40 uppercase text-[10px] tracking-widest text-[var(--primary-accent)]">Chargement des recettes...</div>;

  const getPeriodLabel = () => {
      switch (period) {
          case "weekly": return "Cette Semaine";
          case "monthly": return "Ce Mois";
          case "yearly": return "Cette Année";
          default: return "Aujourd'hui";
      }
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500 overflow-hidden pb-4">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-[var(--success)]/5 p-5 rounded-[3px] border border-[var(--success)]/10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--success)]">Gestion des Recettes</h2>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 italic">Suivez vos entrées de fonds et performances de vente</p>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase font-bold text-muted-foreground/40 mb-1">Période</span>
            <div className="flex gap-1">
                {[
                  { id: "daily", label: "Aujourd'hui" },
                  { id: "weekly", label: "Semaine" },
                  { id: "monthly", label: "Mois" },
                  { id: "yearly", label: "Année" }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={cn(
                      "px-2 py-1 rounded-[3px] text-[9px] font-bold uppercase tracking-widest transition-all",
                      period === p.id 
                        ? "bg-[var(--success)] text-background" 
                        : "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
            </div>
        </div>
      </div>

      <div className={cn("space-y-6 transition-opacity duration-500 flex flex-col flex-1 min-h-0", loading ? "opacity-40 scale-[0.99]" : "opacity-100 scale-100")}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {[
          { label: `Chiffre d'Affaires (${getPeriodLabel()})`, value: `${(stats.ca_today || 0).toLocaleString()} CFA`, delta: stats.ca_delta, color: "text-[var(--success)]", icon: TrendingUp },
          { label: `Clients (${getPeriodLabel()})`, value: `${(stats.clients_today || 0)}`, delta: stats.clients_delta, color: "text-[var(--info)]", icon: Users },
          { label: "Panier Moyen", value: `${(Math.round(stats.basket_today || 0)).toLocaleString()} CFA`, delta: stats.basket_delta, color: "text-[var(--warning)]", icon: ShoppingBag },
        ].map((item) => (
          <div key={item.label} className="p-5 rounded-[3px] border border-border/20 bg-background group hover:border-[var(--success)]/20 transition-all">
             <div className="flex justify-between items-center text-muted-foreground/40 mb-2">
                <item.icon size={14} />
                <span className={cn("text-[8px] font-bold", item.delta?.startsWith("+") ? "text-[var(--success)]" : "text-destructive")}>
                    {item.delta}
                </span>
             </div>
             <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">{item.label}</p>
                <h3 className={cn("text-sm font-bold tracking-tight", item.color)}>{item.value}</h3>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-background border border-border/20 rounded-[3px] flex flex-col overflow-hidden flex-1 min-h-0">
         <div className="p-4 border-b border-border/20 bg-emerald-500/5 font-bold text-[10px] uppercase tracking-widest flex justify-between items-center shrink-0">
            Dernières Ventes Encaissées
            <span className="text-[8px] opacity-40 uppercase">Journal des recettes ({getPeriodLabel()})</span>
         </div>
         <div className="flex-1 overflow-y-auto pb-4 pr-2 custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/10">
                  <tr>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground">ID Vente</th>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground">Caissier</th>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground">Mode</th>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground">Montant</th>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground w-[40px]"></th>
                  </tr>
               </thead>
               <tbody>
                  {sales.length === 0 ? (
                     <tr><td colSpan={5} className="p-10 text-center text-[10px] opacity-20 uppercase tracking-widest">Aucune vente enregistrée</td></tr>
                  ) : sales.map((sale) => (
                     <tr key={sale.id} className="border-b border-border/5 hover:bg-[var(--success)]/5 transition-colors group">
                        <td className="p-3 font-mono text-[9px] font-bold text-[var(--success)]/70">#{10000 + sale.id}</td>
                        <td className="p-3 text-[10px] uppercase font-bold text-muted-foreground">{sale.user_name || "Système"}</td>
                        <td className="p-3">
                           <span className="px-1.5 py-0.5 bg-muted/30 rounded-[3px] text-[8px] font-bold uppercase">{sale.payment_method || "CASH"}</span>
                        </td>
                        <td className="p-3 text-[10px] font-bold text-[var(--success)]">+{(sale.total_amount || 0).toLocaleString()} CFA</td>
                        <td className="p-3 text-right">
                           <div className="flex justify-end">
                              <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-40" />
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
      </div>
    </div>
  );
}
