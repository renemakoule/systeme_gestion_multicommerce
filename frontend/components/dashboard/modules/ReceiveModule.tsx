"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Truck, PackageCheck, ArrowDownToLine, TrendingDown, Package, AlertTriangle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─────────────────────────────
// MODULE RÉCEPTION (entrées stock)
// ─────────────────────────────
export function ReceiveModule() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
        setLogs(Array.isArray(logsData) ? logsData.filter((l: any) => l.type === "IN") : []);
      } catch (err) {
        console.error("ReceiveModule fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [companyId]);

  const filteredLogs = logs.filter(l =>
    l.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.reason?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("h-full flex flex-col space-y-5 animate-in fade-in duration-500 overflow-hidden pb-6", loading && "opacity-60")}>
      {/* HEADER */}
      <div className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 p-5 rounded-[3px]">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">Réception des Stocks</h2>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mt-1">
            Suivi des entrées de marchandises et arrivages fournisseurs
          </p>
        </div>
        <Button className="h-9 px-5 rounded-[3px] bg-amber-500 text-black hover:bg-amber-400 font-black text-[10px] uppercase tracking-widest gap-2">
          <Plus size={13} /> Nouvel Arrivage
        </Button>
      </div>

      {/* KPI CARTES — ENTRÉES PAR PÉRIODE */}
      <div className="shrink-0">
        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Entrées en stock</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Aujourd'hui", key: "daily",   icon: ArrowDownToLine },
            { label: "Cette Semaine", key: "weekly",  icon: ArrowDownToLine },
            { label: "Ce Mois",       key: "monthly", icon: ArrowDownToLine },
            { label: "Cette Année",   key: "yearly",  icon: ArrowDownToLine },
          ].map(({ label, key, icon: Icon }) => (
            <div key={key} className="p-4 rounded-[3px] border border-border/20 bg-background hover:border-amber-500/30 transition-all">
              <div className="flex justify-between items-center text-muted-foreground/30 mb-2">
                <Icon size={13} />
              </div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</p>
              <h3 className="text-sm font-black text-amber-500 mt-0.5">
                {stats ? (stats.entries?.[key] ?? 0).toLocaleString() : "—"} <span className="text-[9px] font-bold opacity-60">unités</span>
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* DEUX COLONNES : stock présent + top entrées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        {/* Produits en stock */}
        <div className="border border-border/20 rounded-[3px] bg-background overflow-hidden">
          <div className="p-3 border-b border-border/10 bg-emerald-500/5 flex items-center gap-2">
            <PackageCheck size={12} className="text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
              En stock ({stats?.in_stock_count ?? "—"})
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto custom-scrollbar">
            {stats?.in_stock?.length === 0 && (
              <p className="text-center py-6 text-[9px] text-muted-foreground/40 uppercase tracking-widest">Aucun produit</p>
            )}
            {(stats?.in_stock ?? []).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center px-3 py-2 border-b border-border/5 hover:bg-muted/5">
                <span className="text-[10px] font-bold truncate mr-2">{p.name}</span>
                <span className={cn("text-[9px] font-black shrink-0", p.quantity <= p.min_threshold ? "text-orange-500" : "text-emerald-500")}>
                  {p.quantity} {p.unit}
                  {p.quantity <= p.min_threshold && <AlertTriangle size={10} className="inline ml-1" />}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 produits les plus reçus */}
        <div className="border border-border/20 rounded-[3px] bg-background overflow-hidden">
          <div className="p-3 border-b border-border/10 bg-amber-500/5 flex items-center gap-2">
            <TrendingDown size={12} className="text-amber-500 rotate-180" />
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Top Entrées (tous temps)</span>
          </div>
          <div className="p-3 space-y-2">
            {(stats?.top_in ?? []).length === 0 && (
              <p className="text-center py-4 text-[9px] text-muted-foreground/40 uppercase tracking-widest">Aucune donnée</p>
            )}
            {(stats?.top_in ?? []).map((item: any, idx: number) => {
              const max = stats?.top_in?.[0]?.qty || 1;
              return (
                <div key={item.name} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[9px] font-bold uppercase">{item.name}</span>
                    <span className="text-[9px] text-amber-500 font-black">{item.qty} unités</span>
                  </div>
                  <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.qty / max) * 100}%` }}
                      transition={{ delay: idx * 0.08 }}
                      className="h-full bg-amber-500/60 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* JOURNAL DES ARRIVAGES */}
      <div className="border border-border/20 rounded-[3px] bg-background flex flex-col flex-1 min-h-0">
        <div className="p-3 border-b border-border/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={12} className="text-muted-foreground/40" />
            <span className="text-[9px] font-black uppercase tracking-widest">Journal des Arrivages</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={11} />
            <Input
              placeholder="Rechercher..."
              className="pl-7 h-7 text-[10px] rounded-[3px] w-44 bg-muted/10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/10">
              <tr>
                {["Produit", "Quantité", "Motif", "Date"].map(h => (
                  <th key={h} className="p-3 text-[8px] uppercase font-bold text-muted-foreground/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-[9px] text-muted-foreground/30 uppercase tracking-widest">
                  Aucun arrivage enregistré
                </td></tr>
              ) : filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-border/5 hover:bg-muted/5 transition-colors">
                  <td className="p-3 text-[10px] font-bold">{log.product_name}</td>
                  <td className="p-3 text-[10px] font-black text-amber-500">+{log.change_qty}</td>
                  <td className="p-3 text-[9px] text-muted-foreground">{log.reason || "—"}</td>
                  <td className="p-3 text-[9px] text-muted-foreground/60">
                    {new Date(log.timestamp).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
