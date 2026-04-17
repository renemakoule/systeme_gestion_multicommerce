"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  ClipboardList,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

const API = `${API_URL}`;

export function FinanceHistoryModule() {
  const { user, refreshTrigger } = useDashboard();
  const companyId = user?.company_id || 1;
  const [activeTab, setActiveTab] = useState<"history" | "summary" | "forecasts">("history");
  const [loading, setLoading] = useState(true);
  
  // Navigation
  const [period, setPeriod] = useState("daily");
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  
  // Data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cid = user?.company_id || 1;

      // 1. Transaction History (with offset)
      // On récupère ventes et dépenses pour la période
      const [salesRes, expRes] = await Promise.all([
        fetch(`${API}/sales/?company_id=${cid}&period=${period}&offset=${offset}`),
        fetch(`${API}/expenses/?company_id=${cid}&period=${period}&offset=${offset}`)
      ]);

      const salesData = await salesRes.json();
      const expData = await expRes.json();

      const combined = [
        ...(Array.isArray(salesData) ? salesData.map((s: any) => ({
          ...s,
          type: "income",
          display_amount: s.total_amount,
          display_date: s.timestamp,
          display_category: "VENTE",
          display_description: `Vente #${10000 + s.id} - ${s.payment_method || "CASH"}`
        })) : []),
        ...(Array.isArray(expData) ? expData.map((e: any) => ({
          ...e,
          type: "expense",
          display_amount: -e.amount,
          display_date: e.date || e.timestamp,
          display_category: e.category.toUpperCase(),
          display_description: e.description
        })) : [])
      ];

      combined.sort((a, b) => new Date(b.display_date).getTime() - new Date(a.display_date).getTime());
      setTransactions(combined);

      // 2. Summary Data (for charts)
      if (activeTab === "summary") {
        const granularity = period === "daily" ? "weekly" : period; // Si on est en vue jour, on montre la semaine dans le graphe
        const [sumSalesRes, sumExpRes] = await Promise.all([
            fetch(`${API}/sales/summary-by-period?company_id=${cid}&granularity=${granularity === "daily" ? "weekly" : granularity}&limit=12`),
            fetch(`${API}/expenses/summary-by-period?company_id=${cid}&granularity=${granularity === "daily" ? "weekly" : granularity}&limit=12`)
        ]);
        const sSales = await sumSalesRes.json();
        const sExp = await sumExpRes.json();

        // Fusionner les données de résumé
        const combinedSummary = sSales.periods?.map((p: any, idx: number) => ({
            label: p.label,
            income: p.ca || 0,
            expenses: sExp.periods?.[idx]?.amount || 0,
            profit: (p.ca || 0) - (sExp.periods?.[idx]?.amount || 0)
        })) || [];
        setSummaryData(combinedSummary);
      }

      // 3. Forecast Data
      if (activeTab === "forecasts") {
        const fRes = await fetch(`${API}/previsions/finances?company_id=${cid}&granularity=${period === 'daily' ? 'weekly' : period}&history_periods=12&future_periods=3`);
        if (fRes.ok) {
            setForecastData(await fRes.json());
        }
      }

    } catch (err) {
      console.error("Error fetching finance analytics", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, period, offset, activeTab, refreshTrigger, user?.company_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Labels
  const getPeriodRangeLabel = () => {
    if (offset === 0) {
      switch (period) {
        case "weekly": return "Cette Semaine";
        case "monthly": return "Ce Mois";
        case "yearly": return "Cette Année";
        default: return "Aujourd'hui";
      }
    } else {
      switch (period) {
        case "weekly": return `Il y a ${offset} semaine(s)`;
        case "monthly": return `Il y a ${offset} mois`;
        case "yearly": return `Il y a ${offset} an(s)`;
        default: return `Il y a ${offset} jour(s)`;
      }
    }
  };

  const totalIncome = transactions.filter(t => t.type === "income").reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(t => 
    t.display_description?.toLowerCase().includes(search.toLowerCase()) ||
    t.display_category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden pb-4">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/10 p-4 rounded-[3px] border border-border/10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[var(--primary-accent)]" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">Analyse Financière</h2>
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { id: "history", label: "Historique", icon: ClipboardList },
              { id: "summary", label: "Résumé", icon: BarChart3 },
              { id: "forecasts", label: "Prévisions", icon: Sparkles },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all",
                  activeTab === tab.id 
                    ? "border-[var(--primary-accent)] text-foreground" 
                    : "border-transparent text-muted-foreground/40 hover:text-muted-foreground"
                )}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1 bg-background/50 p-1 rounded-[3px] border border-border/10">
            {["daily", "weekly", "monthly", "yearly"].map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setOffset(0); }}
                className={cn(
                  "px-3 py-1 rounded-[2px] text-[8px] font-bold uppercase tracking-widest transition-all",
                  period === p ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/30"
                )}
              >
                {p === "daily" ? "Jour" : p === "weekly" ? "Sem" : p === "monthly" ? "Mois" : "An"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-[3px]" 
                onClick={() => setOffset(prev => prev + 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-[9px] font-black uppercase tracking-widest min-w-[100px] text-center bg-muted/30 py-1 rounded-[3px]">
              {getPeriodRangeLabel()}
            </span>
            <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 rounded-[3px]"
                disabled={offset === 0}
                onClick={() => setOffset(prev => Math.max(0, prev - 1))}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
               key="loading"
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] z-50"
            >
               <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Synchronisation...</p>
               </div>
            </motion.div>
          ) : null}

          {activeTab === "history" && (
            <motion.div 
              key="history-tab"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col space-y-4"
            >
              {/* KPI MINI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col justify-between">
                  <div className="flex justify-between items-center text-emerald-500 mb-1">
                    <TrendingUp size={14} />
                    <span className="text-[8px] font-black">REVENUS</span>
                  </div>
                  <h3 className="text-sm font-black text-emerald-500">+{totalIncome.toLocaleString()} CFA</h3>
                </div>
                <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col justify-between">
                  <div className="flex justify-between items-center text-destructive mb-1">
                    <TrendingDown size={14} />
                    <span className="text-[8px] font-black">DÉPENSES</span>
                  </div>
                  <h3 className="text-sm font-black text-destructive">-{totalExpense.toLocaleString()} CFA</h3>
                </div>
                <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col justify-between border-l-4 border-l-[var(--primary-accent)]">
                  <div className="flex justify-between items-center text-[var(--primary-accent)] mb-1">
                    <Wallet size={14} />
                    <span className="text-[8px] font-black text-muted-foreground/60">FLUX NET</span>
                  </div>
                  <h3 className={cn("text-sm font-black", netProfit >= 0 ? "text-emerald-500" : "text-destructive")}>
                    {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()} CFA
                  </h3>
                </div>
              </div>

              {/* TABLE */}
              <div className="flex-1 flex flex-col border border-border/20 rounded-[3px] bg-background/40 overflow-hidden">
                <div className="p-3 border-b border-border/20 bg-muted/10 flex justify-between items-center">
                    <div className="relative w-64">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                        <Input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="RECHERCHER..." 
                            className="h-7 text-[9px] pl-8 uppercase font-bold tracking-widest bg-background"
                        />
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase">{filteredTransactions.length} LOGS</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/10">
                      <tr>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Date</th>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Catégorie</th>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Désignation</th>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((t, idx) => (
                        <tr key={`${t.type}-${t.id}`} className="border-b border-border/5 hover:bg-muted/5 transition-all">
                          <td className="p-3">
                            <span className="text-[10px] font-bold block">{new Date(t.display_date).toLocaleDateString()}</span>
                            <span className="text-[8px] opacity-40 block">{new Date(t.display_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="p-3">
                            <span className={cn(
                                "px-2 py-0.5 rounded-[2px] text-[7px] font-black border uppercase tracking-widest",
                                t.type === 'income' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
                            )}>
                                {t.display_category}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="text-[10px] font-bold uppercase truncate max-w-[200px]">{t.display_description}</p>
                          </td>
                          <td className={cn("p-3 text-right font-black text-[10px]", t.type === 'income' ? "text-emerald-500" : "text-destructive")}>
                            {t.display_amount.toLocaleString()} CFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "summary" && (
            <motion.div 
               key="summary-tab"
               initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
               className="h-full flex flex-col space-y-4"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-0">
                    {/* CHART 1: INCOME VS EXPENSE */}
                    <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={14} className="text-[var(--primary-accent)]" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest">Flux Entrées / Sorties</h3>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summaryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <YAxis fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px'}}
                                        labelStyle={{fontSize: '9px', fontWeight: 'bold', marginBottom: '4px'}}
                                        itemStyle={{fontSize: '10px', fontWeight: 'bold'}}
                                    />
                                    <Legend wrapperStyle={{paddingTop: '10px', fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase'}} />
                                    <Bar name="Revenus" dataKey="income" fill="rgba(16, 185, 129, 0.6)" radius={[2,2,0,0]} />
                                    <Bar name="Dépenses" dataKey="expenses" fill="rgba(239, 68, 68, 0.6)" radius={[2,2,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* CHART 2: NET PROFIT TREND */}
                    <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <LineChartIcon size={14} className="text-emerald-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest">Évolution du Bénéfice Net</h3>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={summaryData}>
                                    <defs>
                                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <YAxis fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px'}}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="profit" 
                                        stroke="#10b981" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#profitGrad)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </motion.div>
          )}

          {activeTab === "forecasts" && forecastData && (
             <motion.div 
                key="forecasts-tab"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="h-full flex flex-col space-y-4"
             >
                <div className="p-6 rounded-[3px] border border-border/20 bg-[var(--primary-accent)]/5 flex justify-between items-center relative overflow-hidden group">
                    <div className="space-y-1 relative z-10">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-[var(--primary-accent)]" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Algorithme Prédictif WMA</p>
                        </div>
                        <h4 className="text-xl font-black uppercase italic">Projection Financière</h4>
                        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">Analyse basée sur les {forecastData.historical?.length} dernières périodes ({period})</p>
                    </div>
                    <div className="text-right relative z-10">
                        <p className="text-[8px] font-black opacity-40 uppercase mb-1">Confiance Algorithmique</p>
                        <div className="flex items-center gap-3">
                           <span className="text-2xl font-black tabular-nums">85%</span>
                           <div className="w-24 h-2 bg-muted rounded-full overflow-hidden flex border border-border/10">
                              <div className="h-full bg-[var(--primary-accent)]" style={{width: '85%'}} />
                           </div>
                        </div>
                    </div>
                    <Sparkles size={120} className="absolute -right-10 -bottom-10 opacity-5 text-[var(--primary-accent)] group-hover:scale-110 transition-transform" />
                </div>

                <div className="flex-1 bg-background border border-border/20 rounded-[3px] p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Bénéfice Net Projeté (Moyenne Mobile Pondérée)</p>
                    </div>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                ...forecastData.historical.map((h: any) => ({ label: h.label, actual: h.profit })),
                                ...forecastData.forecasts.map((f: any) => ({ label: f.label, project: f.projected_profit, min: f.min, max: f.max }))
                            ]}>
                                <defs>
                                    <linearGradient id="forecastProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="label" fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                <YAxis fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#000', border: '1px solid var(--primary-accent)'}}
                                    itemStyle={{fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black'}}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="actual" 
                                    stroke="rgba(255,255,255,0.4)" 
                                    strokeWidth={2}
                                    fill="transparent"
                                    name="RÉEL"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="project" 
                                    stroke="var(--primary-accent)" 
                                    strokeWidth={4}
                                    strokeDasharray="5 5"
                                    fill="url(#forecastProfit)"
                                    name="PRÉVISION"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="max" 
                                    stroke="transparent" 
                                    fill="rgba(255,255,255,0.05)"
                                    name="MAX POSSIBLE"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="min" 
                                    stroke="transparent" 
                                    fill="rgba(255,255,255,0.05)"
                                    name="MIN POSSIBLE"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 shrink-0">
                    {forecastData.forecasts.map((f: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-[3px] border border-border/10 bg-muted/5 flex flex-col justify-center">
                            <p className="text-[7px] font-black opacity-30 uppercase mb-1">{f.label}</p>
                            <h5 className="text-[11px] font-black text-[var(--primary-accent)]">+{f.projected_profit.toLocaleString()} CFA</h5>
                            <p className="text-[7px] font-bold opacity-40 uppercase">Confiance: ±{(f.max - f.projected_profit).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
