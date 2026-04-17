"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Repeat, TrendingDown, ShoppingBag, Package, ArrowUpFromLine, Users, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─────────────────────────────────
// MODULE MOUVEMENTS (sorties stock)
// ─────────────────────────────────
export function MovementsModule() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sorties" | "consommes">("sorties");

  const companyId = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").company_id || 1; } catch { return 1; }
  })();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch(`${API_URL}/products/stock-stats?company_id=${companyId}`),
          fetch(`${API_URL}/products/logs?company_id=${companyId}`),
        ]);
        if (!statsRes.ok) {
          const err = await statsRes.json();
          console.error("stock-stats error:", err);
          throw new Error(`stock-stats HTTP ${statsRes.status}`);
        }
        const statsData = await statsRes.json();
        const logsData = await logsRes.json();
        setStats(statsData);
        setLogs(Array.isArray(logsData) ? logsData.filter((l: any) => l.type === "OUT" || l.type === "ADJUSTMENT") : []);
      } catch (err) {
        console.error("MovementsModule fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [companyId]);

  return (
    <div className={cn("h-full flex flex-col space-y-5 animate-in fade-in duration-500 overflow-hidden pb-6", loading && "opacity-60")}>
      {/* HEADER */}
      <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/10 p-5 rounded-[3px]">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Mouvements de Stock</h2>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mt-1">
            Sorties, consommation clients et analyse des flux sortants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[8px] text-muted-foreground/50 uppercase">Produits épuisés</p>
            <p className="text-lg font-black text-destructive">{stats?.out_stock_count ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* KPI SORTIES PAR PÉRIODE */}
      <div className="shrink-0">
        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Sorties de stock (unités)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Aujourd'hui",   key: "daily"   },
            { label: "Cette Semaine", key: "weekly"  },
            { label: "Ce Mois",       key: "monthly" },
            { label: "Cette Année",   key: "yearly"  },
          ].map(({ label, key }) => (
            <div key={key} className="p-4 rounded-[3px] border border-border/20 bg-background hover:border-blue-400/30 transition-all">
              <div className="flex justify-between items-center text-muted-foreground/30 mb-2">
                <ArrowUpFromLine size={13} />
              </div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</p>
              <h3 className="text-sm font-black text-blue-400 mt-0.5">
                {stats ? (stats.exits?.[key] ?? 0).toLocaleString() : "—"} <span className="text-[9px] font-bold opacity-60">unités</span>
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* PRODUITS ÉPUISÉS */}
      {(stats?.out_stock ?? []).length > 0 && (
        <div className="border border-destructive/20 rounded-[3px] bg-destructive/5 shrink-0">
          <div className="p-3 border-b border-destructive/10 flex items-center gap-2">
            <Package size={12} className="text-destructive" />
            <span className="text-[9px] font-black uppercase tracking-widest text-destructive">Produits épuisés</span>
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            {(stats.out_stock ?? []).map((p: any) => (
              <span key={p.id} className="px-2 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-[3px] text-[8px] font-bold uppercase">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TABS : Top Sorties / Top Consommés clients */}
      <div className="flex gap-3 border-b border-border/20 shrink-0">
        {[
          { id: "sorties",    label: "Top Sorties Stock",       icon: TrendingDown },
          { id: "consommes",  label: "Top Consommés Clients",   icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 pb-3 px-1 text-[9px] font-black uppercase tracking-[0.2em] transition-all relative",
              activeTab === tab.id ? "text-blue-400" : "text-muted-foreground/40 hover:text-foreground"
            )}
          >
            <tab.icon size={11} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="movements-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* CONTENU TABS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Graphique barres */}
        <div className="border border-border/20 rounded-[3px] bg-background overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/10 flex items-center gap-2 shrink-0">
            <BarChart3 size={12} className="text-blue-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {activeTab === "sorties" ? "Top 5 Produits Sortis" : "Top 5 Consommés par Clients"}
            </span>
          </div>
          <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            {(() => {
              const data = activeTab === "sorties" ? stats?.top_out : stats?.top_consumed;
              if (!data || data.length === 0) return (
                <p className="text-center py-8 text-[9px] text-muted-foreground/30 uppercase tracking-widest">Aucune donnée</p>
              );
              const max = data[0]?.qty || 1;
              return data.map((item: any, idx: number) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[9px] font-bold uppercase truncate mr-2">{item.name}</span>
                    <span className="text-[9px] text-blue-400 font-black shrink-0">{item.qty} unités</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.qty / max) * 100}%` }}
                      transition={{ delay: idx * 0.09, duration: 0.5 }}
                      className="h-full bg-blue-400/70 rounded-full"
                    />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Journal des sorties */}
        <div className="border border-border/20 rounded-[3px] bg-background overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/10 flex items-center gap-2 shrink-0">
            <Repeat size={12} className="text-muted-foreground/40" />
            <span className="text-[9px] font-black uppercase tracking-widest">Journal des Sorties</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/10">
                <tr>
                  {["Produit", "Qté", "Type", "Date"].map(h => (
                    <th key={h} className="p-3 text-[8px] uppercase font-bold text-muted-foreground/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-[9px] text-muted-foreground/30 uppercase tracking-widest">
                    Aucun mouvement
                  </td></tr>
                ) : logs.slice(0, 30).map(log => (
                  <tr key={log.id} className="border-b border-border/5 hover:bg-muted/5 transition-colors">
                    <td className="p-3 text-[10px] font-bold truncate max-w-[100px]">{log.product_name}</td>
                    <td className="p-3 text-[10px] font-black text-destructive">{log.change_qty}</td>
                    <td className="p-3">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-[3px] text-[7px] font-black uppercase",
                        log.type === "OUT" ? "bg-destructive/10 text-destructive" : "bg-muted/30 text-muted-foreground"
                      )}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3 text-[8px] text-muted-foreground/50">
                      {new Date(log.timestamp).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
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
