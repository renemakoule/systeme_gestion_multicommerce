"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  Calendar,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCcw,
  User as UserIcon,
  Tag,
  Clock,
  FileText,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Layers,
  Layout,
  BarChart3,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface LogEntry {
  id: number;
  product_name: string;
  category_name: string;
  user_name: string;
  change_qty: number;
  type: string;
  reason: string;
  timestamp: string;
}

export function InventoryLogsModule() {
  const { user, refreshTrigger } = useDashboard();
  const companyId = user?.company_id || 1;
  
  const [activeTab, setActiveTab] = useState<"history" | "summary" | "forecasts">("history");
  const [loading, setLoading] = useState(true);
  
  // Navigation & Filters
  const [period, setPeriod] = useState("daily");
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState(""); // Restored
  const [endDate, setEndDate] = useState("");     // Restored
  
  // Data
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cid = user?.company_id || 1;

      // 1. Logs History (with offset or custom dates)
      let logsUrl = `${API}/products/logs?company_id=${cid}`;
      if (startDate || endDate) {
        if (startDate) logsUrl += `&start_date=${startDate}`;
        if (endDate) logsUrl += `&end_date=${endDate}`;
      } else {
        logsUrl += `&period=${period}&offset=${offset}`;
      }

      const logsRes = await fetch(logsUrl);
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }

      // 2. Summary Data
      if (activeTab === "summary") {
        const granularity = period === "daily" ? "weekly" : period;
        const sumRes = await fetch(`${API}/products/logs/summary-by-period?company_id=${cid}&granularity=${granularity}&limit=12`);
        if (sumRes.ok) {
            const data = await sumRes.json();
            setSummaryData(data.periods || []);
        }
      }

      // 3. Forecasts
      if (activeTab === "forecasts") {
        const gran = period === "daily" ? "weekly" : period;
        const fRes = await fetch(`${API}/previsions/inventory?company_id=${cid}&granularity=${gran}&history_periods=12&future_periods=3`);
        if (fRes.ok) {
            setForecastData(await fRes.json());
        }
      }

    } catch (err) {
      console.error("Failed to fetch inventory analytics", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, period, offset, activeTab, refreshTrigger, user?.company_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIn = filteredLogs.filter(l => l.type === "IN").reduce((acc, curr) => acc + curr.change_qty, 0);
  const totalOut = Math.abs(filteredLogs.filter(l => l.type === "OUT").reduce((acc, curr) => acc + curr.change_qty, 0));

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 overflow-hidden pb-4">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/10 p-4 rounded-[3px] border border-border/10 text-foreground">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[var(--primary-accent)]" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">Analyse des Stocks</h2>
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { id: "history", label: "Mouvements", icon: RefreshCcw },
              { id: "summary", label: "Analyse", icon: BarChart3 },
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
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-[3px]" onClick={() => setOffset(prev => prev + 1)}>
              <ChevronLeft size={14} />
            </Button>
            <span className="text-[9px] font-black uppercase tracking-widest min-w-[100px] text-center bg-muted/30 py-1 rounded-[3px]">
              {getPeriodRangeLabel()}
            </span>
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-[3px]" disabled={offset === 0} onClick={() => setOffset(prev => Math.max(0, prev - 1))}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] z-50">
               <div className="flex flex-col items-center gap-2">
                  <RefreshCcw className="w-8 h-8 text-[var(--primary-accent)] animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Chargement...</p>
               </div>
            </div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                  <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col justify-between border-l-4 border-l-[var(--success)]">
                    <p className="text-[8px] font-bold uppercase text-muted-foreground/40">Entrées de stock</p>
                    <h3 className="text-sm font-black text-[var(--success)]">+{totalIn.toLocaleString()} Unités</h3>
                  </div>
                  <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col justify-between border-l-4 border-l-red-500">
                    <p className="text-[8px] font-bold uppercase text-muted-foreground/40">Sorties de stock</p>
                    <h3 className="text-sm font-black text-red-500">-{totalOut.toLocaleString()} Unités</h3>
                  </div>
               </div>

               <div className="flex-1 flex flex-col border border-border/20 rounded-[3px] bg-background/40 overflow-hidden">
                <div className="p-3 border-b border-border/20 bg-muted/10 flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex flex-1 gap-2 items-center">
                        <div className="relative flex-1 max-w-xs">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="RECHERCHER PRODUIT..." className="h-7 text-[9px] pl-8 uppercase font-bold tracking-widest bg-background" />
                        </div>
                        {/* Custom Date Filters */}
                        <div className="flex items-center gap-1">
                            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setOffset(0); }} className="h-7 bg-background border border-border/20 rounded-[3px] px-2 text-[8px] font-black uppercase" />
                            <span className="text-[8px] font-black opacity-20">À</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-7 bg-background border border-border/20 rounded-[3px] px-2 text-[8px] font-black uppercase" />
                            {(startDate || endDate) && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setStartDate(""); setEndDate(""); }}>
                                    <X size={12} />
                                </Button>
                            )}
                        </div>
                    </div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-7 bg-background border border-border/20 rounded-[3px] px-2 text-[8px] font-black uppercase tracking-widest">
                        <option value="ALL">TOUS TYPES</option>
                        <option value="IN">ENTRÉES (IN)</option>
                        <option value="OUT">SORTIES (OUT)</option>
                    </select>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/10">
                      <tr>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Date</th>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Produit</th>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Type</th>
                        <th className="p-3 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.id} onClick={() => setSelectedLog(log)} className="border-b border-border/5 hover:bg-muted/5 transition-all cursor-pointer group">
                          <td className="p-3">
                            <span className="text-[10px] font-bold block">{new Date(log.timestamp).toLocaleDateString()}</span>
                            <span className="text-[8px] opacity-40 block">{new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className="p-3">
                            <p className="text-[10px] font-black text-foreground/80 uppercase truncate max-w-[150px]">{log.product_name}</p>
                            <span className="text-[7px] text-muted-foreground/40 font-black uppercase">{log.category_name}</span>
                          </td>
                          <td className="p-3">
                            <span className={cn(
                                "px-2 py-0.5 rounded-[2px] text-[7px] font-black border uppercase tracking-widest",
                                log.type === 'IN' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                                {log.type}
                            </span>
                          </td>
                          <td className={cn("p-3 text-right font-black text-[10px]", log.change_qty > 0 ? "text-emerald-500" : "text-red-500")}>
                            {log.change_qty > 0 ? "+" : ""}{log.change_qty.toLocaleString()}
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
            <motion.div key="summary" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-0">
                    <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest">Volume Entrées / Sorties</h3>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summaryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <YAxis fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px'}} />
                                    <Legend wrapperStyle={{paddingTop: '10px', fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase'}} />
                                    <Bar name="Entrées" dataKey="in" fill="rgba(16, 185, 129, 0.6)" radius={[2,2,0,0]} />
                                    <Bar name="Sorties" dataKey="out" fill="rgba(239, 68, 68, 0.6)" radius={[2,2,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="p-4 rounded-[3px] border border-border/20 bg-background flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest">Fréquence des mouvements</h3>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={summaryData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <YAxis fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                    <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '3px'}} />
                                    <Line type="monotone" name="Nb d'opérations" dataKey="count" stroke="var(--primary-accent)" strokeWidth={3} dot={{r: 4, fill: 'var(--primary-accent)'}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </motion.div>
          )}

          {activeTab === "forecasts" && forecastData && (
             <motion.div key="forecasts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col space-y-4">
                <div className="p-6 rounded-[3px] border border-border/20 bg-[var(--primary-accent)]/5 flex justify-between items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-[var(--primary-accent)]" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Optimisation des Stocks</p>
                        </div>
                        <h4 className="text-xl font-black uppercase italic">Prévision de Consommation</h4>
                        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">Anticipation des sorties de stock ({forecastData.algorithm})</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black opacity-40 uppercase mb-1">Précision estimée</p>
                        <span className="text-2xl font-black tabular-nums">92%</span>
                    </div>
                </div>

                <div className="flex-1 bg-background border border-border/20 rounded-[3px] p-4 flex flex-col">
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                ...forecastData.historical.map((h: any) => ({ label: h.label, actual: h.consumption })),
                                ...forecastData.forecasts.map((f: any) => ({ label: f.label, project: f.projected_consumption, min: f.min, max: f.max }))
                            ]}>
                                <defs>
                                    <linearGradient id="inventoryGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="label" fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                <YAxis fontSize={8} fontWeight="bold" tick={{fill: 'rgba(255,255,255,0.4)'}} />
                                <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid var(--primary-accent)'}} />
                                <Area type="monotone" dataKey="actual" stroke="rgba(255,255,255,0.4)" strokeWidth={2} fill="transparent" name="RÉEL" />
                                <Area type="monotone" dataKey="project" stroke="var(--primary-accent)" strokeWidth={4} strokeDasharray="5 5" fill="url(#inventoryGrad)" name="PROJECTION" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    {forecastData.forecasts.map((f: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-[3px] border border-border/10 bg-muted/5">
                            <p className="text-[7px] font-black opacity-30 uppercase mb-1">{f.label}</p>
                            <h5 className="text-[11px] font-black text-[var(--primary-accent)]">-{f.projected_consumption.toLocaleString()} Unités</h5>
                        </div>
                    ))}
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DETAIL MODAL (minimal copy from original) */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-background border border-border/20 rounded-[3px] shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <h3 className="text-sm font-black uppercase tracking-widest">{selectedLog.product_name}</h3>
                    <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[8px] font-black opacity-40 uppercase">Utilisateur</span>
                        <p className="text-[10px] font-bold uppercase">{selectedLog.user_name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <span className="text-[8px] font-black opacity-40 uppercase">Mouvement</span>
                        <p className={cn("text-sm font-black", selectedLog.change_qty > 0 ? "text-emerald-500" : "text-red-500")}>
                            {selectedLog.change_qty > 0 ? "+" : ""}{selectedLog.change_qty}
                        </p>
                    </div>
                </div>
                <div className="p-3 bg-muted/20 rounded-[3px] italic text-[10px] font-bold opacity-60">
                    "{selectedLog.reason || "Aucun motif spécifié"}"
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
