"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  BarChart3, Package, ArrowDownToLine, ArrowUpFromLine, 
  AlertTriangle, Clock, Search, Filter, TrendingUp, TrendingDown,
  ChevronRight, Calendar, Wallet, ShoppingCart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDashboard } from "../DashboardContext";

const COLORS = ["#e188ff", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#6366f1"];

export function StockReportsModule() {
  const { activeOption } = useDashboard();
  const [stockStats, setStockStats] = useState<any>(null);
  const [slowMoving, setSlowMoving] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [companyId, setCompanyId] = useState<number>(1);
  const [searchMove, setSearchMove] = useState("");
  const [searchSlow, setSearchSlow] = useState("");

  const PERIODS = [
    { id: "daily",   label: "Aujourd'hui" },
    { id: "weekly",  label: "Semaine" },
    { id: "monthly", label: "Mois" },
    { id: "yearly",  label: "Année" },
  ] as const;

  const fetchData = async () => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const cid = userData.company_id || 1;
      setCompanyId(cid);

      const [statsRes, slowRes] = await Promise.all([
        fetch(`${API_URL}/products/stock-stats?company_id=${cid}&period=${period}`),
        fetch(`${API_URL}/products/slow-moving?company_id=${cid}&days=30`)
      ]);

      if (statsRes.ok) setStockStats(await statsRes.json());
      if (slowRes.ok) setSlowMoving(await slowRes.json());
    } catch (err) {
      console.error("Error fetching stock reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const entries = stockStats?.entries ?? {};
  const exits = stockStats?.exits ?? {};
  const periodLabel = PERIODS.find(p => p.id === period)?.label ?? "Aujourd'hui";

  const topIn = stockStats?.top_in ?? [];
  const topOut = stockStats?.top_out ?? [];
  const movements = stockStats?.product_movements ?? [];

  // Filtrage des données
  const filteredMovements = movements.filter((m: any) => 
    m.name.toLowerCase().includes(searchMove.toLowerCase())
  );
  
  const filteredSlow = slowMoving.filter((p: any) => 
    p.name.toLowerCase().includes(searchSlow.toLowerCase())
  );

  const isSlowView = activeOption === "slow-moving";

  return (
    <div className="h-full space-y-8 animate-in fade-in duration-700 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-muted/10 p-5 rounded-[3px] border border-border/10">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <BarChart3 size={16} className="text-[var(--primary-accent)]" /> 
            {isSlowView ? "Analyse des Produits Dormants" : "Rapports & Mouvements de Stock"}
          </h2>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 italic">
            {isSlowView 
              ? "Identification des articles à rotation nulle ou très faible" 
              : "Tableau de bord global des flux et valorisation du stock"}
          </p>
        </div>
        {!isSlowView && (
          <div className="flex gap-1 bg-background/50 p-1 rounded-[3px] border border-border/10">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  "px-3 py-1.5 rounded-[2px] text-[9px] font-bold uppercase tracking-widest transition-all",
                  period === p.id 
                    ? "bg-[var(--primary-accent)] text-white shadow-lg shadow-[var(--primary-accent)]/20" 
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isSlowView ? (
          <motion.div 
            key="stats-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* KPI CARDS - VALORISATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-[3px] border border-border/10 bg-background/40 relative overflow-hidden group">
                 <div className="absolute -right-2 -top-2 opacity-10 group-hover:rotate-12 transition-transform">
                    <Wallet size={60} className="text-[var(--warning)]" />
                 </div>
                 <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Valeur Totale (ACHAT)</p>
                 <h3 className="text-xl font-black text-[var(--warning)]">
                   {(stockStats?.total_cost_value || 0).toLocaleString()} <span className="text-[10px] font-bold">CFA</span>
                 </h3>
                 <p className="mt-2 text-[7px] uppercase font-bold text-muted-foreground/50 tracking-tighter italic">Basé sur le prix de revient</p>
              </div>

              <div className="p-5 rounded-[3px] border border-border/10 bg-background/40 relative overflow-hidden group border-b-[var(--primary-accent)]/30 border-b-2">
                 <div className="absolute -right-2 -top-2 opacity-10 group-hover:rotate-12 transition-transform text-[var(--primary-accent)]">
                    <ShoppingCart size={60} />
                 </div>
                 <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Valeur Totale (VENTE)</p>
                 <h3 className="text-xl font-black text-[var(--primary-accent)]">
                   {(stockStats?.total_retail_value || 0).toLocaleString()} <span className="text-[10px] font-bold">CFA</span>
                 </h3>
                 <p className="mt-2 text-[7px] uppercase font-bold text-muted-foreground/50 tracking-tighter italic">Valeur marchande potentielle</p>
              </div>

              <div className="p-5 rounded-[3px] border border-border/10 bg-background/40 relative overflow-hidden group">
                 <div className="absolute -right-2 -top-2 opacity-10 group-hover:rotate-12 transition-transform">
                    <Package size={60} className="text-[var(--success)]" />
                 </div>
                 <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Stock Total Général</p>
                 <h3 className="text-xl font-black text-[var(--success)]">
                   {(stockStats?.total_qty || 0).toLocaleString()} <span className="text-[10px] font-bold">UNITÉS</span>
                 </h3>
                 <p className="mt-2 text-[7px] uppercase font-bold text-muted-foreground/50 tracking-tighter italic">Cumul de tous les articles</p>
              </div>

              <div className="p-5 rounded-[3px] border border-border/10 bg-background/40 relative overflow-hidden group">
                 <div className="absolute -right-2 -top-2 opacity-10 group-hover:rotate-12 transition-transform">
                    <TrendingUp size={60} className="text-[#10b981]" />
                 </div>
                 <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Marge Potentielle Brute</p>
                 <h3 className="text-xl font-black text-[#10b981]">
                   {((stockStats?.total_retail_value || 0) - (stockStats?.total_cost_value || 0)).toLocaleString()} <span className="text-[10px] font-bold">CFA</span>
                 </h3>
                 <p className="mt-2 text-[7px] uppercase font-bold text-muted-foreground/50 tracking-tighter italic">Bénéfice estimé sur stock</p>
              </div>
            </div>

            {/* FLUX CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="p-6 rounded-[3px] border border-border/10 bg-background/20 h-[350px] flex flex-col">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-6 flex items-center gap-2">
                    <ArrowDownToLine size={12} className="text-[var(--warning)]" /> Top Réceptions (IN)
                  </h4>
                  <div className="flex-1 w-full space-y-4 overflow-y-auto custom-scrollbar pr-2">
                     {topIn.length === 0 ? (
                       <div className="h-full flex items-center justify-center text-[9px] uppercase opacity-30 italic">Aucun mouvement d'entrée</div>
                     ) : topIn.map((item: any, i: number) => (
                       <div key={i}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold uppercase">{item.name}</span>
                            <span className="text-[10px] font-black text-[var(--warning)]">{item.qty} ut.</span>
                          </div>
                          <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(item.qty / (topIn[0]?.qty || 1)) * 100}%` }} className="h-full bg-[var(--warning)]" />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
               <div className="p-6 rounded-[3px] border border-border/10 bg-background/20 h-[350px] flex flex-col">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-6 flex items-center gap-2">
                    <ArrowUpFromLine size={12} className="text-[var(--info)]" /> Top Ventes/Sorties (OUT)
                  </h4>
                  <div className="flex-1 w-full space-y-4 overflow-y-auto custom-scrollbar pr-2">
                     {topOut.length === 0 ? (
                       <div className="h-full flex items-center justify-center text-[9px] uppercase opacity-30 italic">Aucun mouvement de sortie</div>
                     ) : topOut.map((item: any, i: number) => (
                       <div key={i}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold uppercase">{item.name}</span>
                            <span className="text-[10px] font-black text-[var(--info)]">{item.qty} ut.</span>
                          </div>
                          <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(item.qty / (topOut[0]?.qty || 1)) * 100}%` }} className="h-full bg-[var(--info)]" />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* DETAILED PER-PRODUCT MOVEMENTS */}
            <div className="p-6 rounded-[3px] border border-border/10 bg-background/20 space-y-6">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <Filter size={14} className="text-muted-foreground" />
                     <h4 className="text-[11px] font-black uppercase tracking-widest">Détail des Mouvements par Produit</h4>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={12} />
                    <input 
                      className="w-full bg-background/40 border border-border/20 rounded-[3px] pl-8 pr-4 py-1.5 text-[10px] focus:outline-none focus:border-[var(--primary-accent)]/50 transition-all"
                      placeholder="rechercher un article..."
                      value={searchMove}
                      onChange={(e) => setSearchMove(e.target.value)}
                    />
                  </div>
               </div>
               
               <div className="overflow-x-auto border border-border/10 rounded-[3px]">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                     <thead>
                        <tr className="bg-muted/10 border-b border-border/10">
                           <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Produit</th>
                           <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Catégorie</th>
                           <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">Total Entrées</th>
                           <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">Total Sorties</th>
                           <th className="p-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Stock Actuel</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border/5">
                        {filteredMovements.map((m: any) => (
                           <tr key={m.id} className="hover:bg-muted/5 transition-colors group">
                              <td className="p-4 text-[10px] font-black uppercase tracking-tight">{m.name}</td>
                              <td className="p-4">
                                 <span className="px-1.5 py-0.5 bg-muted rounded-[2px] text-[8px] font-bold uppercase opacity-60 group-hover:opacity-100 transition-opacity">
                                    {m.category}
                                 </span>
                              </td>
                              <td className="p-4 text-[10px] font-bold text-center text-[var(--warning)]">
                                 {m.total_in.toLocaleString()} {m.unit}
                              </td>
                              <td className="p-4 text-[10px] font-bold text-center text-[var(--info)]">
                                 {m.total_out.toLocaleString()} {m.unit}
                              </td>
                              <td className="p-4 text-[10px] font-black text-right tabular-nums">
                                 <span className={cn(m.current_qty <= 0 ? "text-destructive" : "text-[var(--success)]")}>
                                    {m.current_qty.toLocaleString()} {m.unit}
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="slow-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
             <div className="flex border-l-4 border-destructive bg-destructive/5 p-6 rounded-[3px] gap-4 items-start">
                <Clock className="text-destructive mt-1 shrink-0" size={24} />
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-destructive mb-1">Focus Produits Dormants</h3>
                   <p className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-relaxed max-w-2xl">
                      Ces articles n'ont enregistré aucune sortie (vente ou mouvement) au cours des 30 derniers jours.
                      Une rotation lente pénalise votre trésorerie et occupe de l'espace inutilement.
                   </p>
                </div>
             </div>

             <div className="p-6 rounded-[3px] border border-border/10 bg-background/20 space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                     <AlertTriangle size={14} className="text-destructive" /> Liste des produits à rotation nulle
                  </h4>
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
                    <input 
                      className="w-full bg-background border border-border/20 rounded-[3px] pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-destructive/50 transition-all"
                      placeholder="Filtrer..."
                      value={searchSlow}
                      onChange={(e) => setSearchSlow(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {filteredSlow.map((p: any) => (
                      <div key={p.id} className="p-4 rounded-[3px] border border-border/10 bg-background/60 hover:border-destructive/40 transition-all group">
                         <div className="flex justify-between items-start mb-3">
                            <span className="text-[11px] font-black uppercase tracking-tight leading-tight max-w-[70%]">{p.name}</span>
                            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-[8px] font-bold rounded-full uppercase">Statique</span>
                         </div>
                         <div className="flex justify-between items-center pt-3 border-t border-border/5">
                            <div className="flex flex-col">
                               <span className="text-[8px] uppercase font-bold text-muted-foreground/40">Stock actuel</span>
                               <span className="text-[10px] font-black">{p.quantity} {p.unit}</span>
                            </div>
                            <div className="flex flex-col items-end">
                               <span className="text-[8px] uppercase font-bold text-muted-foreground/40">Valeur d'achat</span>
                               <span className="text-[10px] font-black text-[var(--warning)]">{(p.price * 0.8).toLocaleString()} CFA</span>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
