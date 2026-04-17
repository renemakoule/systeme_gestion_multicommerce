"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Scale, TrendingUp, TrendingDown, Wallet, PieChart, Info, ArrowRight, Target } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";

export function BalanceModule() {
  const { user } = useDashboard();
  const companyId = user?.company_id || 1;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("daily");

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch(`${API_URL}/stats/overview?company_id=${companyId}&period=${period}`);
      const stats = await statsRes.json();
      
      const totalExpenses = stats.total_expenses || 0;
      const totalIncome = stats.ca_today || 0;
      
      setData({
        income: totalIncome,
        expenses: totalExpenses,
        net: totalIncome - totalExpenses,
        stats: stats
      });
    } catch (err) {
      console.error("Error fetching balance data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, period]);

  if (!data) return <div className="text-center p-20 opacity-40 uppercase text-[10px] tracking-widest text-violet-500 font-bold animate-pulse">Synchronisation du bilan en cours...</div>;

  const salesByCat = data.stats.by_category || [];
  const expsByCat = data.stats.expenses_by_category || [];

  const getPeriodLabel = () => {
      switch (period) {
          case "weekly": return "Cette Semaine";
          case "monthly": return "Ce Mois";
          case "yearly": return "Cette Année";
          default: return "Aujourd'hui";
      }
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-700 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-violet-500/5 p-5 rounded-[3px] border border-violet-500/10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-violet-500" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-violet-500">Tableau de Bord Financier</h2>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 italic">Données synchronisées en temps réel avec la base de données</p>
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
                        ? "bg-violet-500 text-background" 
                        : "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
            </div>
        </div>
      </div>

      <div className={cn("space-y-6 transition-all duration-500", loading ? "opacity-30 scale-[0.99] blur-[2px]" : "opacity-100 scale-100 blur-0")}>
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-[3px] border border-border/20 bg-background group hover:border-[var(--primary-accent)]/30 transition-all relative overflow-hidden">
             <div className="flex justify-between items-center text-muted-foreground/40 mb-3">
                <TrendingUp size={12} className="text-[var(--primary-accent)]" />
                <span className="text-[7px] font-black uppercase text-muted-foreground/40 italic">Ventes</span>
             </div>
             <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Chiffre d'Affaires</p>
                <h3 className="text-sm font-black tracking-tight text-[var(--primary-accent)]">+{data.income.toLocaleString()} <span className="text-[9px]">CFA</span></h3>
             </div>
          </div>

          <div className="p-4 rounded-[3px] border border-border/20 bg-background group hover:border-orange-500/30 transition-all relative overflow-hidden">
             <div className="flex justify-between items-center text-muted-foreground/40 mb-3">
                <Target size={12} className="text-orange-500" />
                <span className="text-[7px] font-black uppercase text-muted-foreground/40 italic">Logistique</span>
             </div>
             <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Investissement Stock</p>
                <h3 className="text-sm font-black tracking-tight text-orange-500">{(data.stats.total_procurement || 0).toLocaleString()} <span className="text-[9px]">CFA</span></h3>
             </div>
          </div>

          <div className="p-4 rounded-[3px] border border-border/20 bg-background group hover:border-emerald-500/30 transition-all relative overflow-hidden ring-1 ring-emerald-500/5">
             <div className="flex justify-between items-center text-muted-foreground/40 mb-3">
                <TrendingUp size={12} className="text-emerald-500" />
                <span className="text-[7px] font-black uppercase text-muted-foreground/40 italic">Rentabilité</span>
             </div>
             <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Gain Brut (Bénéfice)</p>
                <h3 className="text-sm font-black tracking-tight text-emerald-500">+{ (data.stats.total_gain || 0).toLocaleString() } <span className="text-[9px]">CFA</span></h3>
             </div>
          </div>

          <div className="p-4 rounded-[3px] border border-border/20 bg-background group hover:border-destructive/30 transition-all relative overflow-hidden">
             <div className="flex justify-between items-center text-muted-foreground/40 mb-3">
                <TrendingDown size={12} className="text-destructive" />
                <span className="text-[7px] font-black uppercase text-muted-foreground/40 italic">Charges</span>
             </div>
             <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Dépenses Autres</p>
                <h3 className="text-sm font-black tracking-tight text-destructive">-{data.expenses.toLocaleString()} <span className="text-[9px]">CFA</span></h3>
             </div>
          </div>
      </div>

      {/* ANALYTICAL TABLE SECTION */}
      <div className="bg-background border border-border/20 rounded-[3px] overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-border/20 bg-muted/5 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2">
                <PieChart size={14} className="text-violet-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Analyse de Performance par Catégorie</h3>
             </div>
             <span className="text-[8px] font-bold uppercase text-muted-foreground/40">Détail des marges marchandes</span>
          </div>
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-muted/10 border-b border-border/10">
                   <tr>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Catégorie</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Investi (Stock)</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Ventes (CA)</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Gain Net</th>
                      <th className="p-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">Marge (%)</th>
                   </tr>
                </thead>
                <tbody>
                   {(data.stats.metrics_by_category || []).length > 0 ? (data.stats.metrics_by_category.map((cat: any) => (
                      <tr key={cat.name} className="border-b border-border/5 hover:bg-muted/5 transition-colors">
                         <td className="p-3 text-[10px] font-bold uppercase tracking-tighter text-foreground/80">{cat.name}</td>
                         <td className="p-3 text-[10px] text-orange-500 font-bold text-right">{ (cat.procurement || 0).toLocaleString() } CFA</td>
                         <td className="p-3 text-[10px] font-bold text-right">{cat.revenue.toLocaleString()} CFA</td>
                         <td className="p-3 text-[10px] font-bold text-emerald-500 text-right">+{cat.gain.toLocaleString()} CFA</td>
                         <td className="p-3 text-center">
                            <span className={cn(
                                "px-2 py-0.5 rounded-[30px] text-[8px] font-black",
                                cat.margin > 20 ? "bg-emerald-500/10 text-emerald-500" : cat.margin > 10 ? "bg-orange-500/10 text-orange-500" : "bg-destructive/10 text-destructive"
                            )}>
                                {cat.margin}%
                            </span>
                         </td>
                      </tr>
                   ))) : (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-[10px] uppercase opacity-20 font-black tracking-widest">
                            Données analytiques indisponibles
                        </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
      </div>

      {/* INVESTMENT VS REVENUE SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-background border border-border/20 rounded-[3px] p-6 space-y-4 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Scale size={80} />
             </div>
             <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-500">
                <Wallet size={14} /> Solde de Trésorerie
             </h3>
             <div className="space-y-4">
                 <div className="flex justify-between items-end border-b border-border/5 pb-2">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Cash-In Total</span>
                    <span className="text-xs font-black text-emerald-500">+{data.income.toLocaleString()} CFA</span>
                 </div>
                 <div className="flex justify-between items-end border-b border-border/5 pb-2">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Achat Stock (Sortie)</span>
                    <span className="text-xs font-black text-orange-500">-{ (data.stats.total_procurement || 0).toLocaleString() } CFA</span>
                 </div>
                 <div className="flex justify-between items-end border-b border-border/5 pb-2">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Charges (Sortie)</span>
                    <span className="text-xs font-black text-destructive">-{data.expenses.toLocaleString()} CFA</span>
                 </div>
                 <div className="flex justify-between items-end pt-2">
                    <span className="text-[10px] font-black uppercase text-violet-500">Solde Net Période</span>
                    <span className={cn("text-sm font-black", (data.income - data.stats.total_procurement - data.expenses) >= 0 ? "text-violet-500" : "text-destructive")}>
                        { (data.income - data.stats.total_procurement - data.expenses).toLocaleString() } CFA
                    </span>
                 </div>
             </div>
          </div>

          <div className="bg-background border border-border/20 rounded-[3px] p-6 space-y-4 shadow-sm border-l-4 border-l-emerald-500 relative">
             <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                <TrendingUp size={14} /> Performance & Marges
             </h3>
             <div className="flex-1 flex flex-col justify-center space-y-6">
                <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/5 rounded-[3px] border border-emerald-500/10">
                    <span className="text-[8px] font-black uppercase text-muted-foreground/60 mb-1">Marge Bénéficiaire Moyenne</span>
                    <span className="text-2xl font-black text-emerald-600">
                        {data.income > 0 ? Math.round(((data.stats.total_gain || 0) / data.income) * 100) : 0}%
                    </span>
                    <p className="text-[8px] text-muted-foreground mt-2 text-center max-w-[200px] leading-relaxed italic">
                        Ce ratio indique que pour chaque vente, votre bénéfice brut moyen est de {data.income > 0 ? Math.round(((data.stats.total_gain || 0) / data.income) * 100) : 0}%.
                    </p>
                </div>
             </div>
          </div>
      </div>
    </div>
  </div>
  );
}
