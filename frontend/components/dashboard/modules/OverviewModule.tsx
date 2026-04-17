"use client";
import { API_URL } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users as UsersIcon,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Wallet,
  Package,
  PackageCheck,
  PackageX,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Utensils,
  X,
  Megaphone,
} from "lucide-react";

import { getSystemNames } from "@/lib/system-names";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";

// ─────────────────────────────────────────────────
// VUE D'ENSEMBLE — MAGASINIER (stock uniquement)
// ─────────────────────────────────────────────────
function WarehouseOverview({ companyId }: { companyId: number }) {
  const [stockStats, setStockStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { refreshTrigger, shopType } = useDashboard();
  const names = getSystemNames(shopType);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");


  const PERIODS = [
    { id: "daily",   label: "Aujourd'hui" },
    { id: "weekly",  label: "Semaine" },
    { id: "monthly", label: "Mois" },
    { id: "yearly",  label: "Année" },
  ] as const;

  useEffect(() => {
    const fetch_ = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products/stock-stats?company_id=${companyId}&period=${period}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setStockStats(await res.json());
      } catch (err) {
        console.error("WarehouseOverview fetch error", err);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    const isInitial = !stockStats;
    fetch_(isInitial);
  }, [companyId, period, refreshTrigger]);

  const periodLabel = PERIODS.find(p => p.id === period)?.label ?? "Aujourd'hui";
  const entryVal  = (stockStats?.entries?.[period] ?? 0).toLocaleString();
  const exitVal   = (stockStats?.exits?.[period]   ?? 0).toLocaleString();

  const kpis = [
    {
      label: "Produits en Stock",
      value: stockStats?.in_stock_count ?? "—",
      icon: PackageCheck,
      color: "text-[var(--success)]",
      border: "hover:border-[var(--success)]/30",
      badge: "text-[var(--success)]",
      positive: true,
    },
    {
      label: "Produits Épuisés",
      value: stockStats?.out_stock_count ?? "—",
      icon: PackageX,
      color: "text-destructive",
      border: "hover:border-destructive/30",
      badge: "text-destructive",
      positive: false,
    },
    {
      label: `Entrées (${periodLabel})`,
      value: `${entryVal} unités`,
      icon: ArrowDownToLine,
      color: "text-[var(--warning)]",
      border: "hover:border-[var(--warning)]/30",
      badge: "text-[var(--warning)]",
      positive: true,
    },
    {
      label: `Sorties (${periodLabel})`,
      value: `${exitVal} unités`,
      icon: ArrowUpFromLine,
      color: "text-[var(--info)]",
      border: "hover:border-[var(--info)]/30",
      badge: "text-[var(--info)]",
      positive: true,
    },
  ];

  // Barres pour top sorties
  const topOutData = stockStats?.top_out ?? [];
  const topConsumedData = stockStats?.top_consumed ?? [];

  return (
    <div className={cn("space-y-6 transition-all duration-500", loading ? "opacity-40 blur-[1px]" : "")}>
      {/* PÉRIODE SÉLECTEUR */}
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Période sélectionnée : <span className="text-[var(--primary-accent)]">{periodLabel}</span>
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

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn(
              "p-4 rounded-[3px] border border-border/20 bg-background transition-all group",
              kpi.border
            )}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 rounded-[3px] bg-muted/20">
                <kpi.icon size={14} className={kpi.color} />
              </div>
              <div className={cn("flex items-center text-[8px] font-bold uppercase", kpi.badge)}>
                {kpi.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                Live
              </div>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">{kpi.label}</p>
            <h3 className={cn("text-sm font-black tracking-tight", kpi.color)}>{kpi.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* RÉSUMÉ ENTRÉES/SORTIES PAR PÉRIODE */}
      <div className="grid grid-cols-2 gap-4">
        {/* Entrées */}
        <div className="p-5 rounded-[3px] border border-[var(--warning)]/15 bg-[var(--warning)]/5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownToLine size={13} className="text-[var(--warning)]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--warning)]">Entrées {names.inventory}</span>
          </div>
          <div className="space-y-2">
            {([
              { label: "Aujourd'hui", key: "daily" },
              { label: "Semaine",     key: "weekly" },
              { label: "Mois",        key: "monthly" },
              { label: "Année",       key: "yearly" },
            ] as const).map(({ label, key }) => (
              <div
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "flex justify-between items-center px-2 py-1.5 rounded-[3px] cursor-pointer transition-all",
                  period === key ? "bg-[var(--warning)]/15 border border-[var(--warning)]/30" : "hover:bg-[var(--warning)]/5"
                )}
              >
                <span className={cn("text-[9px] uppercase font-bold", period === key ? "text-[var(--warning)]" : "text-muted-foreground")}>
                  {label}
                </span>
                <span className={cn("text-[10px] font-black", period === key ? "text-[var(--warning)]" : "text-muted-foreground/50")}>
                  {(stockStats?.entries?.[key] ?? 0).toLocaleString()} ut.
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sorties */}
        <div className="p-5 rounded-[3px] border border-[var(--info)]/15 bg-[var(--info)]/5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpFromLine size={13} className="text-[var(--info)]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--info)]">Sorties {names.inventory}</span>
          </div>
          <div className="space-y-2">
            {([
              { label: "Aujourd'hui", key: "daily" },
              { label: "Semaine",     key: "weekly" },
              { label: "Mois",        key: "monthly" },
              { label: "Année",       key: "yearly" },
            ] as const).map(({ label, key }) => (
              <div
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "flex justify-between items-center px-2 py-1.5 rounded-[3px] cursor-pointer transition-all",
                  period === key ? "bg-[var(--info)]/15 border border-[var(--info)]/30" : "hover:bg-[var(--info)]/5"
                )}
              >
                <span className={cn("text-[9px] uppercase font-bold", period === key ? "text-[var(--info)]" : "text-muted-foreground")}>
                  {label}
                </span>
                <span className={cn("text-[10px] font-black", period === key ? "text-[var(--info)]" : "text-muted-foreground/50")}>
                  {(stockStats?.exits?.[key] ?? 0).toLocaleString()} ut.
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP PRODUITS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top entrées */}
        <div className="border border-border/20 rounded-[3px] bg-background p-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-[var(--warning)] mb-3">Top Entrées {names.inventory}</p>
          {topOutData.length === 0 && topConsumedData.length === 0 && (stockStats?.top_in ?? []).length === 0
            ? <p className="text-[9px] text-muted-foreground/30 uppercase text-center py-4">Aucune donnée</p>
            : (stockStats?.top_in ?? []).map((item: any, idx: number) => {
                const max = stockStats?.top_in?.[0]?.qty || 1;
                return (
                  <div key={item.name} className="mb-2">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] font-bold truncate">{item.name}</span>
                      <span className="text-[9px] text-[var(--warning)] font-black ml-2 shrink-0">{item.qty}</span>
                    </div>
                    <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.qty / max) * 100}%` }}
                        transition={{ delay: idx * 0.08 }}
                        className="h-full bg-[var(--warning)]/50 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Top sorties */}
        <div className="border border-border/20 rounded-[3px] bg-background p-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-[var(--info)] mb-3">Top Sorties {names.inventory}</p>
          {(stockStats?.top_out ?? []).length === 0
            ? <p className="text-[9px] text-muted-foreground/30 uppercase text-center py-4">Aucune donnée</p>
            : (stockStats?.top_out ?? []).map((item: any, idx: number) => {
                const max = stockStats?.top_out?.[0]?.qty || 1;
                return (
                  <div key={item.name} className="mb-2">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] font-bold truncate">{item.name}</span>
                      <span className="text-[9px] text-[var(--info)] font-black ml-2 shrink-0">{item.qty}</span>
                    </div>
                    <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.qty / max) * 100}%` }}
                        transition={{ delay: idx * 0.08 }}
                        className="h-full bg-[var(--info)]/50 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Top consommés clients */}
        <div className="border border-border/20 rounded-[3px] bg-background p-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-[var(--success)] mb-3">Top Consommés Clients</p>
          {(stockStats?.top_consumed ?? []).length === 0
            ? <p className="text-[9px] text-muted-foreground/30 uppercase text-center py-4">Aucune donnée</p>
            : (stockStats?.top_consumed ?? []).map((item: any, idx: number) => {
                const max = stockStats?.top_consumed?.[0]?.qty || 1;
                return (
                  <div key={item.name} className="mb-2">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] font-bold truncate">{item.name}</span>
                      <span className="text-[9px] text-[var(--success)] font-black ml-2 shrink-0">{item.qty}</span>
                    </div>
                    <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.qty / max) * 100}%` }}
                        transition={{ delay: idx * 0.08 }}
                        className="h-full bg-[var(--success)]/50 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* PRODUITS ÉPUISÉS (Masqué pour restaurant) */}
      {shopType !== 'restaurant' && (stockStats?.out_stock ?? []).length > 0 && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-[3px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} className="text-destructive" />
            <span className="text-[9px] font-black uppercase tracking-widest text-destructive">
              Produits épuisés ({stockStats.out_stock_count})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(stockStats.out_stock ?? []).map((p: any) => (
              <span key={p.id} className="px-2 py-1 bg-destructive/10 border border-destructive/20 rounded-[3px] text-[8px] font-bold uppercase text-destructive">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// MODULE PRINCIPAL : OverviewModule
// ─────────────────────────────────────────────────
export function OverviewModule() {
  const { refreshTrigger, shopType, lastSystemMessageId } = useDashboard();
  const names = getSystemNames(shopType);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("gerant");
  const [companyId, setCompanyId] = useState(1);
  const [period, setPeriod] = useState("daily");
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);

  const fetchBroadcast = async (cid: number) => {
    try {
      const res = await fetch(`${API_URL}/companies/${cid}/broadcast/active`);
      if (res.ok) {
        const data = await res.json();
        setActiveBroadcast(data.message);
      }
    } catch (err) {}
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const cid = userData.company_id || 1;
    setCompanyId(cid);
    fetchBroadcast(cid);
  }, []);

  // Déclencheur temps réel via WebSocket pour les messages
  useEffect(() => {
    if (lastSystemMessageId && companyId) {
      fetchBroadcast(companyId);
    }
  }, [lastSystemMessageId, companyId]);

  useEffect(() => {
    const fetchOverview = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const cid = userData.company_id || 1;
        setCompanyId(cid);
        setRole(userData.role || "gerant");

        const res = await fetch(`${API_URL}/stats/overview?company_id=${cid}&period=${period}`);
        const data = await res.json();
        setStats(data && !data.detail ? data : null);
      } catch (err) {
        console.error("Failed to fetch overview stats", err);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    const isInitial = !stats;
    fetchOverview(isInitial);
  }, [period, refreshTrigger]);

  const getPeriodLabel = () => {
    switch (period) {
      case "weekly": return "Cette Semaine";
      case "monthly": return "Ce Mois";
      case "yearly": return "Cette Année";
      default: return "Aujourd'hui";
    }
  };

  // KPIs non-magasinier
  const totalExpenses = stats?.total_expenses || 0;
  const caToday = stats?.ca_today || 0;
  const netBalance = caToday - totalExpenses;

  const kpiData = role === "comptable" ? [
    { label: `Chiffre d'Affaires (${getPeriodLabel()})`, value: `${caToday.toLocaleString()} CFA`, growth: stats?.growth || "0%", icon: TrendingUp, positive: !stats?.growth?.includes("-") },
    { label: `Total Dépenses (${getPeriodLabel()})`, value: `${totalExpenses.toLocaleString()} CFA`, growth: "Aujourd'hui", icon: TrendingDown, positive: false },
    { label: `Balance Nette (${getPeriodLabel()})`, value: `${netBalance.toLocaleString()} CFA`, growth: "Aujourd'hui", icon: Wallet, positive: netBalance >= 0 },
    { label: `Transactions (${getPeriodLabel()})`, value: (stats?.clients_today || 0).toString(), growth: "Live", icon: ShoppingBag, positive: true },
  ] : [
    { label: `Chiffre d'Affaires (${getPeriodLabel()})`, value: `${caToday.toLocaleString()} CFA`, growth: stats?.growth || "0%", icon: TrendingUp, positive: !stats?.growth?.includes("-") },
    { label: shopType === 'restaurant' ? `Commandes (${getPeriodLabel()})` : `Clients (${getPeriodLabel()})`, value: (stats?.clients_today || 0).toString(), growth: "Aujourd'hui", icon: shopType === 'restaurant' ? Utensils : UsersIcon, positive: true },
    ...(shopType !== 'restaurant' ? [{ label: "Alertes Stocks", value: (stats?.stock_alerts || 0).toString(), growth: stats?.stock_alerts > 0 ? "Action Requise" : "Correct", icon: AlertTriangle, positive: stats?.stock_alerts === 0 }] : []),
    { label: `Transactions (${getPeriodLabel()})`, value: (stats?.clients_today || 0).toString(), growth: "Live", icon: ShoppingBag, positive: true },
  ];

  if (!stats && role !== "magasinier") {
    return <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest opacity-40">Chargement des données...</div>;
  }

  return (
    <div className="h-full space-y-6 animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-muted/10 p-5 rounded-[3px] border border-border/10 mb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {role === "magasinier" && <Package size={16} className="text-[var(--warning)]" />}
            <h2 className={cn("text-sm font-black uppercase tracking-[0.3em]", role === "magasinier" && "text-[var(--warning)]")}>
              {role === "magasinier" ? "Vue d'ensemble — Entrepôt" : "Vue d'ensemble"}
            </h2>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 italic">
            {role === "magasinier"
              ? "Analyse globale des stocks, entrées, sorties et alertes"
              : "Indicateurs clés de performance"}
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

      {/* SYSTEM MESSAGES / BROADCASTS */}
      {activeBroadcast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-[var(--primary-accent-pale)] border border-[var(--primary-accent)]/20 rounded-[3px] overflow-hidden"
        >
          <div className="flex flex-col md:flex-row">
            {activeBroadcast.image_url && (
              <div className="w-full md:w-48 h-32 md:h-auto shrink-0 bg-zinc-100">
                <img 
                  src={`${activeBroadcast.image_url.startsWith('http') ? '' : API_URL.replace('/api', '')}${activeBroadcast.image_url}`} 
                  alt="Broadcast" 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
            <div className="flex-1 p-5 pr-12">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone size={14} className="text-[var(--primary-accent)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary-accent)]">Annonce Technique</span>
              </div>
              <h4 className="text-sm font-black uppercase tracking-tight mb-2 tracking-widest">{activeBroadcast.title}</h4>
              <p className="text-[11px] leading-relaxed text-foreground/80 font-medium whitespace-pre-wrap">
                {activeBroadcast.content}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveBroadcast(null)}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/50 rounded transition-colors text-zinc-500"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* CONTENU SELON LE RÔLE */}
      {role === "magasinier" ? (
        <WarehouseOverview companyId={companyId} />
      ) : (
        <div className={cn("space-y-6 transition-all duration-500", loading ? "opacity-30 scale-[0.99] blur-[2px]" : "opacity-100 scale-100 blur-0")}>
          {/* KPI GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiData.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-[3px] border border-border/20 bg-background hover:border-[var(--primary-accent)]/30 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-[3px] bg-muted/20 group-hover:bg-[var(--primary-accent-pale)] transition-colors">
                    <stat.icon size={14} className={cn("transition-colors", stat.label === "Alertes Stocks" && stats?.stock_alerts > 0 ? "text-destructive" : "text-muted-foreground group-hover:text-[var(--primary-accent)]")} />
                  </div>
                  <div className={cn("flex items-center text-[8px] font-bold uppercase", stat.positive ? "text-[var(--success)]" : "text-destructive")}>
                    {stat.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {stat.growth}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">{stat.label}</p>
                  <h3 className="text-sm font-bold tracking-tight">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-6 rounded-[3px] border border-border/10 bg-background/40 min-h-[350px]">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Évolution du Chiffre d'Affaires (7J)</h4>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chart_data}>
                    <defs>
                      <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--chart-tooltip-bg)", border: "1px solid var(--chart-tooltip-border)", borderRadius: "4px", fontSize: "10px" }} />
                    <Area type="monotone" dataKey="ca" stroke="var(--primary-accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorCa)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-[3px] border border-border/10 bg-background/40 min-h-[350px]">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-6">Volume de Ventes</h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "var(--primary-accent-pale)" }} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "10px" }} />
                    <Bar dataKey="sales" fill="var(--primary-accent)" radius={[2, 2, 0, 0]} barSize={12} />
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
