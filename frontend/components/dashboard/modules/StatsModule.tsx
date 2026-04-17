"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Users, ShoppingBag,
  ArrowUpRight, ArrowDownRight, PieChart as PieIcon, BarChart3, Activity,
  Package, PackageCheck, PackageX, ArrowDownToLine, ArrowUpFromLine, AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Gold
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
  "#6366f1", // Indigo
];

// ──────────────────────────────────────────
// STATS STOCK — MAGASINIER
// ──────────────────────────────────────────
function WarehouseStats({ companyId }: { companyId: number }) {
  const [stockStats, setStockStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  const PERIODS = [
    { id: "daily",   label: "Aujourd'hui" },
    { id: "weekly",  label: "Semaine" },
    { id: "monthly", label: "Mois" },
    { id: "yearly",  label: "Année" },
  ] as const;

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products/stock-stats?company_id=${companyId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStockStats(await res.json());
      } catch (err) {
        console.error("WarehouseStats fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [companyId]);

  const entries = stockStats?.entries ?? {};
  const exits = stockStats?.exits ?? {};
  const periodLabel = PERIODS.find(p => p.id === period)?.label ?? "Aujourd'hui";

  // Données graphique comparaison entrées/sorties par période
  const flowData = [
    { name: "Aujourd'hui", entrées: entries.daily ?? 0,   sorties: exits.daily ?? 0,   active: period === "daily" },
    { name: "Semaine",     entrées: entries.weekly ?? 0,  sorties: exits.weekly ?? 0,  active: period === "weekly" },
    { name: "Mois",        entrées: entries.monthly ?? 0, sorties: exits.monthly ?? 0, active: period === "monthly" },
    { name: "Année",       entrées: entries.yearly ?? 0,  sorties: exits.yearly ?? 0,  active: period === "yearly" },
  ];

  // Pie chart stock vs épuisés
  const stockPieData = [
    { name: "En stock", value: stockStats?.in_stock_count ?? 0 },
    { name: "Épuisés",  value: stockStats?.out_stock_count ?? 0 },
  ];

  const kpis = [
    { label: "Produits en Stock",              value: stockStats?.in_stock_count ?? "—",                    icon: PackageCheck,    color: "text-[var(--success)]",   accent: "var(--success)" },
    { label: "Produits Épuisés",              value: stockStats?.out_stock_count ?? "—",                   icon: PackageX,        color: "text-destructive",         accent: "var(--destructive)" },
    { label: `Entrées (${periodLabel})`,       value: `${(entries[period] ?? 0).toLocaleString()} ut.`,    icon: ArrowDownToLine, color: "text-[var(--warning)]",   accent: "var(--warning)" },
    { label: `Sorties (${periodLabel})`,        value: `${(exits[period] ?? 0).toLocaleString()} ut.`,      icon: ArrowUpFromLine, color: "text-[var(--info)]",      accent: "var(--info)" },
    { label: `Entrées (cette année)`,          value: `${(entries.yearly ?? 0).toLocaleString()} ut.`,     icon: ArrowDownToLine, color: "text-[var(--warning)]",   accent: "var(--warning)" },
    { label: `Sorties (cette année)`,           value: `${(exits.yearly ?? 0).toLocaleString()} ut.`,       icon: ArrowUpFromLine, color: "text-[var(--info)]",      accent: "var(--info)" },
  ];

  return (
    <div className={cn("space-y-6 transition-all duration-500", loading ? "opacity-40 blur-[1px]" : "")}>
      {/* SÉLECTEUR DE PÉRIODE */}
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Période : <span className="text-[var(--warning)]">{periodLabel}</span>
        </p>
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "px-2.5 py-1 rounded-[3px] text-[9px] font-bold uppercase tracking-widest transition-all",
                period === p.id
                  ? "bg-[var(--warning)] text-[var(--warning-foreground)]"
                  : "bg-muted/40 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="p-4 rounded-[3px] border border-border/20 bg-background hover:border-[var(--primary-accent)]/20 transition-all"
          >
            <kpi.icon size={13} className={cn("mb-2", kpi.color)} />
            <p className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50 leading-tight mb-1">{kpi.label}</p>
            <h3 className={cn("text-[11px] font-black tracking-tight", kpi.color)}>{kpi.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-6 rounded-[3px] border border-border/10 bg-background/40 h-[320px] flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={13} className="text-muted-foreground/40" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Flux Entrées vs Sorties par Période
            </h4>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} />
                <Tooltip
                  cursor={{ fill: "var(--primary-accent-pale)" }}
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: "10px" }}
                />
                <Bar dataKey="entrées" fill="var(--warning)" radius={[2, 2, 0, 0]} barSize={18} />
                <Bar dataKey="sorties" fill="var(--info)" radius={[2, 2, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-[3px] border border-border/10 bg-background/40 h-[320px] flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <PieIcon size={13} className="text-muted-foreground/40" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">État du Stock Global</h4>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={6}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: "10px" }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// MODULE PRINCIPAL : StatsModule
// ──────────────────────────────────────────
export function StatsModule() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("gerant");
  const [companyId, setCompanyId] = useState(1);
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const cid = userData.company_id || 1;
        setCompanyId(cid);
        setRole(userData.role || "gerant");
        const res = await fetch(`${API_URL}/stats/overview?company_id=${cid}&period=${period}`);
        const data = await res.json();
        if (data && !data.detail) setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  if (!stats && role !== "magasinier") {
    return <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.4em] opacity-40">Analyse des données en cours...</div>;
  }

  const categoryData = stats?.by_category ?? [];
  const hourlyData = stats?.hourly_data ?? [];
  const totalExpenses = stats?.total_expenses ?? 0;
  const caToday = stats?.ca_today ?? 0;
  const netBalance = caToday - totalExpenses;

  const getPeriodLabel = () => {
    switch (period) {
      case "weekly": return "Cette Semaine";
      case "monthly": return "Ce Mois";
      case "yearly": return "Cette Année";
      default: return "Aujourd'hui";
    }
  };

  const kpis = role === "comptable" ? [
    { label: `Recettes (${getPeriodLabel()})`,  value: caToday.toLocaleString() + " CFA",                                  icon: TrendingUp,  delta: stats?.ca_delta ?? "+0%",      positive: stats?.ca_delta?.startsWith("+") },
    { label: `Dépenses (${getPeriodLabel()})`,  value: totalExpenses.toLocaleString() + " CFA",                            icon: TrendingDown, delta: "Aujourd'hui",                  positive: false },
    { label: `Balance Nette (${getPeriodLabel()})`,   value: netBalance.toLocaleString() + " CFA",                               icon: Wallet,      delta: "Aujourd'hui",                  positive: netBalance >= 0 },
    { label: `Marge Estimée`,     value: caToday > 0 ? Math.round((netBalance/caToday)*100) + "%" : "0%",   icon: Activity,    delta: "ROI",                      positive: netBalance > 0 },
  ] : [
    { label: `Chiffre d'Affaires`,                value: (stats?.ca_today ?? 0).toLocaleString() + " CFA",                   icon: TrendingUp,  delta: stats?.ca_delta ?? "+0%",       positive: stats?.ca_delta?.startsWith("+") },
    { label: `Trafic Clients`,                    value: (stats?.clients_today ?? 0),                                        icon: Users,       delta: stats?.clients_delta ?? "+0%",  positive: stats?.clients_delta?.startsWith("+") },
    { label: `Panier Moyen`,                      value: Math.round(stats?.basket_today ?? 0).toLocaleString() + " CFA",     icon: ShoppingBag, delta: stats?.basket_delta ?? "+0%",   positive: stats?.basket_delta?.startsWith("+") },
    { label: `Articles / Vente`,                  value: (stats?.items_today ?? 0).toFixed(1),                             icon: Activity,    delta: stats?.items_delta ?? "+0%",    positive: stats?.items_delta?.startsWith("+") },
  ];

  return (
    <div className="h-full space-y-8 animate-in fade-in duration-700 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-muted/10 p-5 rounded-[3px] border border-border/10 mb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {role === "magasinier" && <Package size={16} className="text-[var(--warning)]" />}
            <h2 className={cn("text-sm font-black uppercase tracking-[0.3em]", role === "magasinier" && "text-[var(--warning)]")}>
              {role === "magasinier" ? "Statistiques — Stock" : "Analyses Statistiques"}
            </h2>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 italic">
            Visualisation des indicateurs de performance
          </p>
        </div>
        {role !== "magasinier" && (
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase font-bold text-muted-foreground/40 mb-1">Période</span>
            <div className="flex gap-1">
              {[
                { id: "daily", label: "Aujourd'hui" },
                { id: "weekly", label: "Semaine" },
                { id: "monthly", label: "Mois" },
                { id: "yearly", label: "Année" },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    "px-2 py-1 rounded-[3px] text-[9px] font-bold uppercase tracking-widest transition-all",
                    period === p.id ? "bg-foreground text-background" : "bg-muted text-foreground/70 hover:bg-muted/80"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONTENU SELON LE RÔLE */}
      {role === "magasinier" ? (
        <WarehouseStats companyId={companyId} />
      ) : (
        <div className={cn("space-y-8 transition-all duration-500", loading ? "opacity-30 blur-[2px]" : "opacity-100 blur-0")}>
          {/* KPI GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <div key={kpi.label} className="p-5 rounded-[3px] border border-border/10 bg-background/40 hover:border-[var(--primary-accent)]/20 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-[3px] bg-muted/20 group-hover:bg-[var(--primary-accent-pale)] transition-colors">
                    <kpi.icon size={14} className="text-muted-foreground group-hover:text-[var(--primary-accent)]" />
                  </div>
                  <div className={cn("flex items-center gap-1 text-[8px] font-black", kpi.positive ? "text-[var(--success)]" : "text-destructive")}>
                    {kpi.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {kpi.delta}
                  </div>
                </div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">{kpi.label}</p>
                <h3 className="text-sm font-bold tracking-tight">{kpi.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution Hebdomadaire */}
            <div className="p-6 rounded-[3px] border border-border/10 bg-background/20 h-[350px] flex flex-col">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2 mb-6">
                <BarChart3 size={12} /> Évolution de l'activité
              </h4>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chart_data}>
                    <defs>
                      <linearGradient id="colorStat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: "10px" }} />
                    <Area type="monotone" dataKey="ca" stroke="var(--primary-accent)" fillOpacity={1} fill="url(#colorStat)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Repartition Catégorie */}
            <div className="p-6 rounded-[3px] border border-border/10 bg-background/20 h-[350px] flex flex-col">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2 mb-6">
                <PieIcon size={12} /> Répartition par Catégorie
              </h4>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                      {categoryData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: "10px" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Affluence Horaire */}
            <div className="lg:col-span-2 p-6 rounded-[3px] border border-border/10 bg-background/20 h-[320px] flex flex-col">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2 mb-6">
                <Activity size={12} /> Affluence Horaire Moyenne
              </h4>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "var(--primary-accent-pale)" }} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: "10px" }} />
                    <Bar dataKey="sales" fill="var(--primary-accent)" radius={[2, 2, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
