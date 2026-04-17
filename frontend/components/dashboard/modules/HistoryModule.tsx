"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Receipt, ChevronRight, ArrowDown, Printer,
  BarChart3, TrendingUp, ChevronLeft, ChevronRight as ChevronRightIcon,
  Calendar, Clock, AlertCircle, Sparkles, RefreshCw,
  TrendingDown, Minus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { TicketTemplate } from "../TicketTemplate";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
  ComposedChart, Legend
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────
type TabId = "history" | "summary" | "forecasts";
type PeriodId = "daily" | "weekly" | "monthly" | "yearly" | "all";
type Granularity = "weekly" | "monthly" | "yearly";

const PERIOD_LABELS: Record<PeriodId, string> = {
  daily:   "Jour",
  weekly:  "Semaine",
  monthly: "Mois",
  yearly:  "Année",
  all:     "Tout",
};

const GRANULARITY_LABELS: Record<Granularity, string> = {
  weekly:  "Hebdomadaire",
  monthly: "Mensuel",
  yearly:  "Annuel",
};

const fmt = (n: number) => n.toLocaleString("fr-FR");
const API = `${API_URL}`;

// ─── Custom Tooltip Recharts ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border/20 rounded-[3px] p-3 shadow-xl text-[10px] min-w-[140px]">
      <p className="font-black uppercase tracking-widest text-muted-foreground/60 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name} : {fmt(p.value)} CFA
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ONGLET 1 — HISTORIQUE DES VENTES
// ═══════════════════════════════════════════════════════════════════════════
function HistoryTab() {
  const { user, shopType, company } = useDashboard();
  const [sales, setSales]             = useState<any[]>([]);
  const [period, setPeriod]           = useState<PeriodId>("daily");
  const [offset, setOffset]           = useState(0);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [selectedSale, setSelectedSale]   = useState<any>(null);
  const [saleDetails, setSaleDetails]     = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [cancelling, setCancelling]       = useState(false);

  const ticketRef = React.useRef<HTMLDivElement>(null);

  const PER_PAGE = 50;

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const companyId = user?.company_id || 1;
      let url = `${API}/sales/?company_id=${companyId}&period=${period}&offset=${offset}`;
      if (user?.role === "caisse") url += `&user_id=${user.id}`;
      const res  = await fetch(url);
      const data = await res.json();
      setSales(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      console.error("Error fetching sales", err);
    } finally {
      setLoading(false);
    }
  }, [user, period, offset]);

  const fetchSaleDetails = async (saleId: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API}/sales/${saleId}`);
      if (res.ok) setSaleDetails(await res.json());
    } catch (err) {
      console.error("Error fetching sale details", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectSale = (sale: any) => {
    setSelectedSale(sale);
    setSaleDetails(null);
    fetchSaleDetails(sale.id);
  };

  const handleCancelSale = async (saleId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette vente ? Cette action est irréversible et remettra les produits en stock.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API}/sales/${saleId}/cancel`, { method: "POST" });
      if (res.ok) {
        alert("Vente annulée avec succès");
        fetchSales();
        setSelectedSale(null);
        setSaleDetails(null);
      } else {
        const err = await res.json();
        alert(err.detail || "Erreur lors de l'annulation");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => { fetchSales(); }, [fetchSales]);
  // Reset offset when period changes
  useEffect(() => { setOffset(0); }, [period]);

  const handlePrintReceipt = () => {
    if (!selectedSale || !saleDetails) return;
    // Small delay to let the hidden ticket render
    setTimeout(() => {
      if (!ticketRef.current) return;
      const printWindow = window.open('', '_blank', 'width=350,height=600');
      if (printWindow) {
        const content = ticketRef.current.innerHTML;
        printWindow.document.write(`
          <html>
            <head>
              <title>Reçu Vente #${selectedSale.id}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: monospace; }
                @media print {
                  @page { margin: 0; }
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>${content}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }, 100);
  };

  const filtered = sales.filter(s =>
    s.id.toString().includes(search) ||
    (s.payment_method && s.payment_method.toLowerCase().includes(search.toLowerCase())) ||
    (s.user_name && s.user_name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalCA        = sales.filter(s => s.status === "completed").reduce((a, s) => a + s.total_amount, 0);
  const totalCancelled = sales.filter(s => s.status === "cancelled").length;

  // Label periode active
  const periodLabel = (() => {
    if (period === "all") return "Toutes les ventes";
    if (offset === 0) {
      const now: Record<PeriodId, string> = {
        daily:   "Aujourd'hui",
        weekly:  "Cette semaine",
        monthly: "Ce mois",
        yearly:  "Cette année",
        all:     "Tout",
      };
      return now[period];
    }
    const names: Record<PeriodId, string> = {
      daily:   `Il y a ${offset} jour${offset > 1 ? "s" : ""}`,
      weekly:  `Il y a ${offset} semaine${offset > 1 ? "s" : ""}`,
      monthly: `Il y a ${offset} mois`,
      yearly:  `Il y a ${offset} an${offset > 1 ? "s" : ""}`,
      all:     "Tout",
    };
    return names[period];
  })();

  const maxOffset: Record<PeriodId, number> = {
    daily:   30, weekly: 12, monthly: 24, yearly: 5, all: 0,
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">

      {/* ── BARRE DE NAVIGATION TEMPORELLE ── */}
      <div className="flex flex-col gap-2 shrink-0">
        {/* Niveau 1 : type de période */}
        <div className="flex items-center gap-1 p-1 bg-muted/20 border border-border/10 rounded-[3px] w-fit">
          {(["daily","weekly","monthly","yearly","all"] as PeriodId[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[2px] transition-all",
                period === p
                  ? "bg-foreground text-background shadow-lg"
                  : "text-muted-foreground hover:bg-muted/30"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Niveau 2 : navigation offset (sauf "all") */}
        {period !== "all" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(o => Math.min(maxOffset[period], o + 1))}
              disabled={offset >= maxOffset[period]}
              className="w-7 h-7 rounded-[2px] border border-border/10 flex items-center justify-center text-muted-foreground hover:bg-muted/30 disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={12} />
            </button>

            {/* Boutons "périodes récentes" */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {Array.from({ length: Math.min(6, maxOffset[period] + 1) }, (_, i) => i).map(i => (
                <button
                  key={i}
                  onClick={() => setOffset(i)}
                  className={cn(
                    "px-3 py-1 text-[8px] font-black uppercase tracking-wider rounded-[2px] border whitespace-nowrap transition-all",
                    offset === i
                      ? "bg-[var(--primary-accent)] text-white border-[var(--primary-accent)] shadow-md"
                      : "border-border/10 text-muted-foreground hover:border-[var(--primary-accent)]/30 hover:text-foreground"
                  )}
                >
                  {i === 0
                    ? period === "daily"   ? "Aujourd'hui"
                    : period === "weekly"  ? "Cette semaine"
                    : period === "monthly" ? "Ce mois"
                    :                        "Cette année"
                    : period === "daily"   ? `-${i}j`
                    : period === "weekly"  ? `-${i}sem`
                    : period === "monthly" ? `-${i}m`
                    :                        `-${i}an`}
                </button>
              ))}
              {offset >= 6 && (
                <span className="px-3 py-1 text-[8px] font-black uppercase tracking-wider rounded-[2px] border bg-[var(--primary-accent)] text-white border-[var(--primary-accent)] shadow-md whitespace-nowrap">
                  -{offset}{period === "daily" ? "j" : period === "weekly" ? "sem" : period === "monthly" ? "m" : "an"}
                </span>
              )}
            </div>

            <button
              onClick={() => setOffset(o => Math.max(0, o - 1))}
              disabled={offset === 0}
              className="w-7 h-7 rounded-[2px] border border-border/10 flex items-center justify-center text-muted-foreground hover:bg-muted/30 disabled:opacity-20 transition-all"
            >
              <ChevronRightIcon size={12} />
            </button>

            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 ml-2 border-l border-border/10 pl-3">
              {periodLabel}
            </span>
          </div>
        )}
      </div>

      {/* ── KPI MINI-CARDS ── */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {[
          { label: shopType === 'restaurant' ? "CA Restaurant" : "CA Période", value: `${fmt(totalCA)} CFA`, sub: `${sales.filter(s=>s.status==="completed").length} notes`, color: "text-emerald-500" },
          { label: "Annulations", value: totalCancelled.toString(), sub: "ventes annulées", color: "text-destructive" },
          { label: "Panier moyen", value: sales.filter(s=>s.status==="completed").length > 0 ? `${fmt(Math.round(totalCA / sales.filter(s=>s.status==="completed").length))} CFA` : "—", sub: "par commande", color: "text-[var(--primary-accent)]" },
        ].map(card => (
          <div key={card.label} className="p-3 rounded-[3px] bg-background/30 border border-border/10 flex flex-col gap-0.5">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">{card.label}</p>
            <p className={cn("text-[13px] font-black tracking-tight", card.color)}>{card.value}</p>
            <p className="text-[8px] text-muted-foreground/40">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── BARRE DE RECHERCHE ── */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={13} />
          <Input
            placeholder="Rechercher par ID, vendeur ou paiement..."
            className="pl-10 h-9 text-[10px] bg-background border-border/20 rounded-[3px]"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSales}
          className="h-9 aspect-square p-0 border border-border/10 rounded-[3px]">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Liste */}
        <div className="flex-1 flex flex-col min-h-0 border border-border/10 rounded-[3px] bg-background/20">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/20">
                <tr>
                  <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 w-[60px] whitespace-nowrap">ID</th>
                  <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">Date & Heure</th>
                  <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">{shopType === 'restaurant' ? 'Serveur' : 'Vendeur'}</th>
                  <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 text-right whitespace-nowrap">Montant</th>
                  <th className="px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 text-center whitespace-nowrap">{shopType === 'restaurant' ? 'Table' : 'Statut'}</th>
                  <th className="px-2 w-[25px]" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-20 text-center text-[10px] uppercase opacity-40 animate-pulse">Chargement...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center text-[10px] uppercase opacity-20">Aucune transaction pour cette période</td></tr>
                ) : paginated.map(sale => (
                  <tr
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className={cn(
                      "border-b border-border/5 hover:bg-muted/5 transition-all cursor-pointer group",
                      selectedSale?.id === sale.id && "bg-[var(--primary-accent-pale)] border-[var(--primary-accent)]/20",
                      sale.status === "cancelled" && "opacity-40 grayscale"
                    )}
                  >
                    <td className="px-2 py-1.5 font-mono text-[8px] font-bold whitespace-nowrap">#{sale.id}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-col whitespace-nowrap">
                        <span className="text-[9px] font-bold">{new Date(sale.timestamp).toLocaleDateString("fr-FR")}</span>
                        <span className="text-[7px] opacity-40 uppercase">{new Date(sale.timestamp).toLocaleTimeString("fr-FR")}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-4 h-4 rounded-full bg-muted/40 flex items-center justify-center text-[6px] font-black uppercase">
                          {(sale.user_name || "A")[0]}
                        </div>
                        <span className="text-[8px] font-bold">{sale.user_name || "Admin"}</span>
                      </div>
                    </td>
                    <td className={cn("px-2 py-1.5 text-right font-black text-[10px] whitespace-nowrap",
                      sale.status === "cancelled" ? "text-destructive line-through" : "text-emerald-500"
                    )}>
                      {(sale.status === "cancelled" ? -sale.total_amount : sale.total_amount || 0).toLocaleString("fr-FR")} <span className="text-[7px]">CFA</span>
                    </td>
                    <td className="px-2 py-1.5 text-center whitespace-nowrap">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-[2px] text-[7px] font-black uppercase tracking-widest border",
                        sale.status === "cancelled"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : shopType === 'restaurant' 
                            ? "bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] border-[var(--primary-accent)]/20"
                            : "bg-muted/30 text-foreground border-border/10"
                      )}>
                        {sale.status === "cancelled" ? "Annulée" : shopType === 'restaurant' ? `Table ${sale.table_number || '?'}` : sale.payment_method}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground/20 group-hover:text-foreground">
                      <ChevronRight size={11} className={cn("transition-transform", selectedSale?.id === sale.id && "rotate-90")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-border/10 p-2 flex items-center justify-between shrink-0">
              <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wider">
                {filtered.length} résultats · Page {page}/{totalPages}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-6 h-6 rounded-[2px] border border-border/10 text-[9px] flex items-center justify-center disabled:opacity-30 hover:bg-muted/20">
                  <ChevronLeft size={11} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-6 h-6 rounded-[2px] border border-border/10 text-[9px] flex items-center justify-center disabled:opacity-30 hover:bg-muted/20">
                  <ChevronRightIcon size={11} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panneau détail */}
        <div className="w-[340px] flex flex-col bg-muted/5 border border-border/10 rounded-[3px] overflow-hidden shrink-0">
          <div className="p-3 border-b border-border/10 bg-background/40 flex justify-between items-center shrink-0">
            <h3 className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              <Receipt size={13} className="text-[var(--primary-accent)]" /> Détails de la vente
            </h3>
          </div>

          {selectedSale ? (
            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-4">
              {/* Header */}
              <div className="relative p-5 bg-background/40 border border-border/10 rounded-[3px] flex flex-col items-center text-center space-y-2">
                {selectedSale.status === "cancelled" && (
                  <div className="absolute top-3 right-3 -rotate-12 border-2 border-destructive text-destructive px-2 py-0.5 text-[9px] font-black rounded uppercase">Annulée</div>
                )}
                <div className="w-10 h-10 rounded-full bg-[var(--primary-accent-pale)] flex items-center justify-center text-[var(--primary-accent)]">
                  <Receipt size={20} />
                </div>
                <h4 className={cn("text-2xl font-black tracking-tighter", selectedSale.status === "cancelled" && "text-destructive line-through")}>
                  {fmt(selectedSale.total_amount || 0)} <span className="text-xs">CFA</span>
                </h4>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Vente #{selectedSale.id}</p>
                <div className="flex gap-2">
                  <span className={cn("px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest border",
                    selectedSale.status === "cancelled"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  )}>
                    {selectedSale.status === "cancelled" ? "Annulée" : "Validée"}
                  </span>
                  <span className="px-3 py-1 bg-muted/30 border border-border/10 rounded-full text-[7px] font-black uppercase tracking-widest">
                    {shopType === 'restaurant' ? `Table ${selectedSale.table_number}` : selectedSale.payment_method}
                  </span>
                  {shopType === 'restaurant' && selectedSale.session_id && (
                    <span className="px-3 py-1 bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] border border-[var(--primary-accent)]/20 rounded-full text-[7px] font-black uppercase tracking-widest">
                      Code: {String(selectedSale.session_id).split('-')[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Vendeur", value: selectedSale.user_name || "Admin" },
                  { label: "Date", value: new Date(selectedSale.timestamp).toLocaleDateString("fr-FR") },
                  { label: "Heure", value: new Date(selectedSale.timestamp).toLocaleTimeString("fr-FR") },
                  { label: "Référence", value: `#${selectedSale.id}` },
                ].map(info => (
                  <div key={info.label} className="p-2.5 rounded-[3px] bg-background/40 border border-border/10">
                    <p className="text-[7px] font-black uppercase text-muted-foreground/40 mb-0.5">{info.label}</p>
                    <p className="text-[9px] font-bold uppercase truncate">{info.value}</p>
                  </div>
                ))}
              </div>

              {/* Articles */}
              <div className="space-y-1.5">
                <p className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] px-1">Articles</p>
                <div className="border border-border/10 rounded-[3px] bg-background/20 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/30 border-b border-border/10">
                      <tr>
                        <th className="p-1.5 text-[7px] font-black uppercase opacity-60">Produit</th>
                        <th className="p-1.5 text-[7px] font-black uppercase opacity-60 text-right">Qté</th>
                        <th className="p-1.5 text-[7px] font-black uppercase opacity-60 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingDetails ? (
                        <tr><td colSpan={3} className="p-4 text-center text-[8px] uppercase opacity-40 animate-pulse">Chargement...</td></tr>
                      ) : saleDetails?.items?.length > 0 ? (
                        saleDetails.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-border/5 last:border-0 hover:bg-muted/5">
                            <td className="p-1.5">
                              <p className="text-[9px] font-bold leading-tight">{item.product_name}</p>
                              <p className="text-[6px] opacity-40 uppercase">{fmt(item.unit_price)} CFA</p>
                            </td>
                            <td className="p-1.5 text-right"><span className="text-[9px] font-bold">x{item.quantity}</span></td>
                            <td className="p-1.5 text-right"><span className="text-[9px] font-black">{fmt(item.total || 0)}</span></td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="p-4 text-center text-[8px] uppercase opacity-20">Aucun article</td></tr>
                      )}
                    </tbody>
                    <tfoot className="bg-muted/40 border-t border-border/10">
                      <tr>
                        <td className="p-2 text-[10px] font-black uppercase">TOTAL</td>
                        <td colSpan={2} className="p-2 text-right">
                          <span className={cn("text-[12px] font-black", selectedSale.status === "cancelled" ? "text-destructive line-through" : "text-emerald-500")}>
                            {fmt(selectedSale.total_amount)} CFA
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handlePrintReceipt}
                  disabled={!saleDetails || loadingDetails}
                  className="w-full h-9 rounded-[3px] bg-foreground text-background hover:bg-foreground/90 font-black text-[9px] uppercase tracking-widest gap-2 disabled:opacity-40"
                >
                  <Printer size={13} /> {loadingDetails ? "Chargement..." : "Imprimer Reçu"}
                </Button>
                {user?.role === "gerant" && selectedSale.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    disabled={cancelling}
                    onClick={() => handleCancelSale(selectedSale.id)}
                    className="w-full h-9 rounded-[3px] border-destructive/20 text-destructive hover:bg-destructive hover:text-white font-black text-[9px] uppercase tracking-widest gap-2 transition-all"
                  >
                    {cancelling ? "Annulation..." : "Annuler la vente"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-10 text-center gap-4">
              <Receipt size={70} strokeWidth={1} />
              <p className="text-[9px] font-black uppercase tracking-[0.4em]">Sélectionnez une transaction<br />pour voir le détail complet</p>
            </div>
          )}
        </div>
      </div>

      {/* HIDDEN TICKET FOR PRINTING */}
      <div className="hidden">
        {selectedSale && saleDetails && (
          <TicketTemplate
            ref={ticketRef}
            companyName={user?.company_name || "Mon Établissement"}
            logoUrl={company?.logo_url}
            shopType={shopType}
            ticketNumber={`#${selectedSale.id}`}
            date={new Date(selectedSale.timestamp).toLocaleString("fr-FR")}
            items={(saleDetails.items || []).map((item: any) => ({
              name: item.product_name,
              qty: item.quantity,
              price: item.unit_price,
              total: item.total
            }))}
            total={selectedSale.total_amount}
            attributes={{
              table_number: selectedSale.table_number,
              payment_method: selectedSale.payment_method,
              cashier_name: selectedSale.user_name,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ONGLET 2 — RÉSUMÉ PAR PÉRIODE
// ═══════════════════════════════════════════════════════════════════════════
function SummaryTab() {
  const { user } = useDashboard();
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const LIMITS: Record<Granularity, number> = { weekly: 12, monthly: 12, yearly: 6 };

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const cid   = user?.company_id || 1;
      const limit = LIMITS[granularity];
      let url     = `${API}/sales/summary-by-period?company_id=${cid}&granularity=${granularity}&limit=${limit}`;
      if (user?.role === "caisse") url += `&user_id=${user.id}`;
      const res   = await fetch(url);
      const json  = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        console.error("Summary error:", json);
        setData(null);
      }
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user, granularity]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const periods = data?.periods || [];
  const totalCA        = periods.reduce((a: number, p: any) => a + p.ca, 0);
  const bestPeriod     = periods.reduce((best: any, p: any) => (!best || p.ca > best.ca) ? p : best, null);
  const avgCA          = periods.length > 0 ? totalCA / periods.length : 0;

  // Tendance : comparaison des 2 moitiés
  const half = Math.floor(periods.length / 2);
  const firstHalfAvg  = half > 0 ? periods.slice(0, half).reduce((a: number, p: any) => a + p.ca, 0) / half : 0;
  const secondHalfAvg = half > 0 ? periods.slice(half).reduce((a: number, p: any) => a + p.ca, 0) / (periods.length - half) : 0;
  const trend = secondHalfAvg > firstHalfAvg ? "up" : secondHalfAvg < firstHalfAvg ? "down" : "stable";

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">

      {/* En-tête */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 p-1 bg-muted/20 border border-border/10 rounded-[3px]">
          {(["weekly","monthly","yearly"] as Granularity[]).map(g => (
            <button key={g} onClick={() => setGranularity(g)}
              className={cn("px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[2px] transition-all",
                granularity === g ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:bg-muted/30"
              )}>
              {GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSummary}
          className="h-8 aspect-square p-0 border border-border/10 rounded-[3px]">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center opacity-30">
          <div className="text-[11px] font-black uppercase tracking-widest animate-pulse">Chargement...</div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-2 shrink-0">
            {[
              { label: "CA Total", value: `${fmt(totalCA)} CFA`, sub: `sur ${periods.length} périodes`, icon: "💰", color: "text-emerald-500" },
              { label: "Moyenne", value: `${fmt(Math.round(avgCA))} CFA`, sub: "par période", icon: "📊", color: "text-[var(--primary-accent)]" },
              { label: "Meilleure", value: bestPeriod?.label || "—", sub: bestPeriod ? `${fmt(bestPeriod.ca)} CFA` : "", icon: "🏆", color: "text-amber-500" },
              {
                label: "Tendance",
                value: trend === "up" ? "↑ Hausse" : trend === "down" ? "↓ Baisse" : "→ Stable",
                sub: "sur la période",
                icon: trend === "up" ? "📈" : trend === "down" ? "📉" : "📊",
                color: trend === "up" ? "text-emerald-500" : trend === "down" ? "text-destructive" : "text-muted-foreground"
              },
            ].map(card => (
              <div key={card.label} className="p-3 rounded-[3px] bg-background/30 border border-border/10">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">{card.label}</p>
                <p className={cn("text-[12px] font-black", card.color)}>{card.value}</p>
                <p className="text-[8px] text-muted-foreground/40 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Graphique barres */}
          <div className="flex-1 border border-border/10 rounded-[3px] bg-background/20 p-4 flex flex-col min-h-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3 shrink-0">
              CA par {GRANULARITY_LABELS[granularity].toLowerCase()}
            </p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={periods} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fontWeight: 700, textAnchor: "end" }}
                    angle={-30} interval={0} stroke="transparent" />
                  <YAxis tick={{ fontSize: 8 }} stroke="transparent"
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={avgCA} stroke="var(--primary-accent)" strokeDasharray="4 2" strokeOpacity={0.5} />
                  <Bar dataKey="ca" name="CA" fill="var(--primary-accent)" opacity={0.85} radius={[2,2,0,0]} />
                  <Line dataKey="ca" name="Tendance" type="monotone" stroke="var(--primary-accent)"
                    strokeWidth={2} dot={false} strokeOpacity={0.4} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau des périodes */}
          <div className="border border-border/10 rounded-[3px] bg-background/20 overflow-hidden shrink-0" style={{ maxHeight: "200px" }}>
            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: "200px" }}>
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-background/95 backdrop-blur border-b border-border/20">
                  <tr>
                    {["Période","CA","Ventes","Annulations","Panier Moyen"].map(h => (
                      <th key={h} className="p-2.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...periods].reverse().map((p: any, i: number) => {
                    const panier = p.nb_ventes > 0 ? Math.round(p.ca / p.nb_ventes) : 0;
                    return (
                      <tr key={i} className="border-b border-border/5 hover:bg-muted/5 transition-all">
                        <td className="p-2.5 text-[9px] font-bold">{p.label}</td>
                        <td className="p-2.5 text-[10px] font-black text-emerald-500">{fmt(p.ca)} <span className="text-[7px]">CFA</span></td>
                        <td className="p-2.5 text-[9px] font-bold">{p.nb_ventes}</td>
                        <td className="p-2.5">
                          <span className={cn("text-[9px] font-bold", p.annulations > 0 ? "text-destructive" : "text-muted-foreground/40")}>
                            {p.annulations}
                          </span>
                        </td>
                        <td className="p-2.5 text-[9px] font-bold text-[var(--primary-accent)]">{panier > 0 ? `${fmt(panier)} CFA` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ONGLET 3 — PRÉVISIONS
// ═══════════════════════════════════════════════════════════════════════════
function ForecastsTab() {
  const { user } = useDashboard();
  const [granularity, setGranularity]   = useState<Granularity>("monthly");
  const [futurePeriods, setFuturePeriods] = useState(3);
  const [data, setData]                 = useState<any>(null);
  const [loading, setLoading]           = useState(true);

  const fetchForecasts = useCallback(async () => {
    setLoading(true);
    try {
      const cid = user?.company_id || 1;
      // Diagnostic global
      const apiTestRes = await fetch(`${API}/api-test`).catch(() => null);
      if (apiTestRes) {
        const testData = await apiTestRes.json();
        console.log("API Test Result:", testData);
      }

      // Diagnostic des routes
      const debugRes = await fetch(`${API}/debug-routes`).catch(() => null);
      if (debugRes) {
        const debugData = await debugRes.json();
        console.log("Registered Routes:", debugData.routes);
      }

      // Test de connexion (Debug)
      const pingRes = await fetch(`${API}/previsions/ping`).catch(() => null);
      if (pingRes) console.log("Forecast Ping Status:", pingRes.status);

      let url = `${API}/previsions/data?company_id=${cid}&granularity=${granularity}&history_periods=12&future_periods=${futurePeriods}`;
      if (user?.role === "caisse") url += `&user_id=${user.id}`;
      const res  = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const text = await res.text();
        console.error(`Forecast error (${res.status}):`, text);
        setData(null);
      }
    } catch (err) {
      console.error("Forecast fetch error:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user, granularity, futurePeriods]);

  useEffect(() => { fetchForecasts(); }, [fetchForecasts]);

  // Combiner données historiques + prévisions pour le graphique
  const chartData = (data?.historical && data?.forecasts) ? [
    ...data.historical.map((h: any) => ({
      label:    h.label,
      ca:       h.ca,
      forecast: null,
      min:      null,
      max:      null,
      type:     "historical",
    })),
    ...data.forecasts.map((f: any) => ({
      label:    f.label,
      ca:       null,
      forecast: f.projected_ca,
      min:      f.min,
      max:      f.max,
      type:     "forecast",
    })),
  ] : [];

  const reliability = data?.reliability || 0;
  const reliabilityColor =
    reliability >= 70 ? "text-emerald-500" :
    reliability >= 40 ? "text-amber-500"   :
                        "text-destructive";

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">

      {/* En-tête */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-muted/20 border border-border/10 rounded-[3px]">
            {(["weekly","monthly","yearly"] as Granularity[]).map(g => (
              <button key={g} onClick={() => setGranularity(g)}
                className={cn("px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[2px] transition-all",
                  granularity === g ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:bg-muted/30"
                )}>
                {GRANULARITY_LABELS[g]}
              </button>
            ))}
          </div>
          {/* Nb de périodes */}
          <div className="flex items-center gap-1 p-1 bg-muted/20 border border-border/10 rounded-[3px]">
            {[1,2,3,4,6].map(n => (
              <button key={n} onClick={() => setFuturePeriods(n)}
                className={cn("px-3 py-1.5 text-[9px] font-black rounded-[2px] transition-all",
                  futurePeriods === n ? "bg-[var(--primary-accent)] text-white shadow" : "text-muted-foreground hover:bg-muted/30"
                )}>
                +{n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-border/10 bg-background/30">
            <Sparkles size={11} className={reliabilityColor} />
            <span className={cn("text-[9px] font-black uppercase tracking-wider", reliabilityColor)}>
              {reliability}% fiabilité
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchForecasts}
            className="h-8 aspect-square p-0 border border-border/10 rounded-[3px]">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center opacity-30">
          <div className="text-[11px] font-black uppercase tracking-widest animate-pulse">Calcul des prévisions...</div>
        </div>
      ) : !data?.periods_analyzed ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-3">
          <AlertCircle size={56} strokeWidth={1} />
          <p className="text-[10px] font-black uppercase tracking-widest text-center">
            Pas assez de données historiques<br />pour générer des prévisions
          </p>
        </div>
      ) : (
        <>
          {/* Cards prévisions */}
          <div className={cn("grid gap-2 shrink-0", futurePeriods <= 3 ? "grid-cols-3" : "grid-cols-6")}>
            {data?.forecasts?.map((f: any, i: number) => {
              const growth = (data?.historical?.length || 0) > 0
                ? ((f.projected_ca - data.historical[data.historical.length - 1]?.ca) / (data.historical[data.historical.length - 1]?.ca || 1)) * 100
                : 0;
              return (
                <div key={i} className="p-4 rounded-[3px] border border-[var(--primary-accent)]/20 bg-[var(--primary-accent-pale)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/60">{f.label}</span>
                    <Sparkles size={10} className="text-[var(--primary-accent)] opacity-60" />
                  </div>
                  <p className="text-[15px] font-black text-[var(--primary-accent)] leading-tight">
                    {fmt(f.projected_ca)} <span className="text-[8px]">CFA</span>
                  </p>
                  <div className="flex items-center gap-1">
                    {growth >= 0
                      ? <TrendingUp size={9} className="text-emerald-500" />
                      : <TrendingDown size={9} className="text-destructive" />}
                    <span className={cn("text-[8px] font-bold", growth >= 0 ? "text-emerald-500" : "text-destructive")}>
                      {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[7px] text-muted-foreground/40 font-bold">
                    [{fmt(f.min)} — {fmt(f.max)}]
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graphique combiné */}
          <div className="flex-1 border border-border/10 rounded-[3px] bg-background/20 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                Historique & Prévisions — {GRANULARITY_LABELS[granularity]}
              </p>
              <div className="flex items-center gap-3 text-[7px] font-black uppercase tracking-wider text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-2 rounded-[1px] bg-[var(--primary-accent)] opacity-70" /> Réel
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0 border-t-2 border-dashed border-amber-500" /> Prévision
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 7, fontWeight: 700, textAnchor: "end" }}
                    angle={-30} interval={0} stroke="transparent" />
                  <YAxis tick={{ fontSize: 8 }} stroke="transparent"
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />

                  {/* Zone de confiance (min–max) */}
                  <Area dataKey="max" name="Max" fill="rgba(245,158,11,0.08)" stroke="none" />
                  <Area dataKey="min" name="Min" fill="var(--background)" stroke="none" />

                  {/* CA historique */}
                  <Bar dataKey="ca" name="CA Réel" fill="var(--primary-accent)" opacity={0.85} radius={[2,2,0,0]} />

                  {/* Prévisions */}
                  <Bar dataKey="forecast" name="Prévision" fill="rgba(245,158,11,0.6)"
                    radius={[2,2,0,0]} strokeDasharray="4 2" />

                  <Line dataKey="forecast" name="Proj." type="monotone"
                    stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3"
                    dot={{ fill: "#f59e0b", r: 3, strokeWidth: 0 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Note méthodologie */}
          <div className="flex items-center gap-2 p-2.5 rounded-[3px] border border-border/10 bg-muted/10 shrink-0">
            <AlertCircle size={11} className="text-muted-foreground/40 shrink-0" />
            <p className="text-[8px] text-muted-foreground/40 font-medium">
              Prévisions calculées par Moyenne Mobile Pondérée (WMA) sur {data?.periods_analyzed || 0} période(s) historique(s).
              L&apos;intervalle [min–max] représente ±1 écart-type. Score de fiabilité : {reliability}%.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export function HistoryModule() {
  const [activeTab, setActiveTab] = useState<TabId>("history");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "history",   label: "Historique des ventes", icon: <Receipt size={13} /> },
    { id: "summary",   label: "Résumé par période",    icon: <BarChart3 size={13} /> },
    { id: "forecasts", label: "Prévisions",            icon: <TrendingUp size={13} /> },
  ];

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500 overflow-hidden">

      {/* ONGLETS */}
      <div className="flex items-center gap-1 p-1 bg-muted/20 border border-border/10 rounded-[3px] w-fit shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[2px] transition-all",
              activeTab === tab.id
                ? "bg-foreground text-background shadow-lg"
                : "text-muted-foreground hover:bg-muted/30"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENU */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "history"   && <HistoryTab />}
        {activeTab === "summary"   && <SummaryTab />}
        {activeTab === "forecasts" && <ForecastsTab />}
      </div>
    </div>
  );
}
