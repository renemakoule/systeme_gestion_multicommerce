"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { 
  Calculator, 
  Clock, 
  ArrowRight, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Banknote, 
  CreditCard, 
  Receipt,
  Printer,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SessionSummary {
  total_sales: number;
  sale_count: number;
  payment_breakdown: { method: string; amount: number }[];
  recent_transactions: { id: number; amount: number; method: string; time: string }[];
  start_time: string;
}

export function CloseModule() {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashCounted, setCashCounted] = useState<string>("");
  const [isClosing, setIsClosing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchSummary = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const userId = userData.id;

      if (!userId) return;

      const res = await fetch(`${API_URL}/sales/session-summary?company_id=${companyId}&user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error fetching session summary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const cashExpected = summary?.payment_breakdown.find(p => p.method === "cash")?.amount || 0;
  const discrepancy = (parseFloat(cashCounted) || 0) - cashExpected;

  const handleCloseSession = () => {
    setIsClosing(true);
    // Simuler une clôture (Dans un vrai système, on enverrait ceci au backend pour marquer les ventes comme clôturées)
    setTimeout(() => {
      setIsClosing(false);
      setShowSuccess(true);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center opacity-30 animate-pulse">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em]">Calcul de la session...</div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center space-y-6 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-[var(--primary-accent-pale)] flex items-center justify-center border border-[var(--primary-accent)]/20 shadow-2xl shadow-[var(--primary-accent-pale)]">
           <CheckCircle2 size={32} className="text-[var(--primary-accent)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-tight">Caisse Clôturée</h2>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground max-w-[250px] mx-auto">
            Le rapport Z a été généré et les données de session ont été archivées avec succès.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="h-10 px-8 rounded-[3px] text-[10px] font-black uppercase tracking-widest border-border/20"
        >
          <Printer size={14} className="mr-2" /> Imprimer Rapport Z
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-700 overflow-y-auto pr-2 custom-scrollbar pb-10">
      
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 bg-muted/10 border border-border/20 rounded-[3px] space-y-2">
          <div className="flex justify-between items-center opacity-40">
            <span className="text-[9px] font-bold uppercase tracking-widest">Total Ventes</span>
            <Receipt size={14} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tighter">{(summary?.total_sales || 0).toLocaleString()} <span className="text-[10px] font-medium opacity-40">CFA</span></h3>
            <p className="text-[7px] uppercase tracking-widest text-[var(--primary-accent)] font-bold">Session démarrée à {summary?.start_time}</p>
          </div>
        </div>

        <div className="p-4 bg-muted/10 border border-border/20 rounded-[3px] space-y-2">
          <div className="flex justify-between items-center opacity-40">
            <span className="text-[9px] font-bold uppercase tracking-widest">Espèces Attendues</span>
            <Banknote size={14} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tighter">{cashExpected.toLocaleString()} <span className="text-[10px] font-medium opacity-40">CFA</span></h3>
            <p className="text-[7px] uppercase tracking-widest opacity-40 font-bold">Basé sur {summary?.sale_count} transactions</p>
          </div>
        </div>

        <div className="p-4 bg-muted/10 border border-border/20 rounded-[3px] space-y-2">
          <div className="flex justify-between items-center opacity-40">
            <span className="text-[9px] font-bold uppercase tracking-widest">Mode CB / Mobile</span>
            <CreditCard size={14} />
          </div>
          <div className="space-y-1">
             <h3 className="text-xl font-black tracking-tighter">{(summary?.total_sales || 0 - cashExpected).toLocaleString()} <span className="text-[10px] font-medium opacity-40">CFA</span></h3>
             <div className="flex gap-2">
               {summary?.payment_breakdown.filter(p => p.method !== "cash").map(p => (
                 <span key={p.method} className="text-[6px] bg-background/40 px-1.5 py-0.5 rounded-[2px] uppercase font-black">{p.method}: {p.amount.toLocaleString()}</span>
               ))}
               {summary?.payment_breakdown.filter(p => p.method !== "cash").length === 0 && (
                 <span className="text-[7px] opacity-20 uppercase font-black">Aucune transaction électronique</span>
               )}
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
        
        {/* RECONCILIATION AREA */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
           <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                 <Calculator size={14} /> Réconciliation du Tiroir-Caisse
              </h4>
              <p className="text-[9px] text-muted-foreground uppercase leading-relaxed max-w-sm">
                 Veuillez compter physiquement les espèces présentes dans votre tiroir et saisir le montant total ci-dessous.
              </p>
           </div>

           <div className="flex flex-col space-y-4 bg-muted/5 p-4 rounded-[3px] border border-border/10">
              <div className="space-y-2">
                 <label className="text-[8px] font-bold uppercase tracking-widest opacity-40">Montant compté (CFA)</label>
                 <Input 
                   type="number"
                   placeholder="0.00"
                   value={cashCounted}
                   onChange={e => setCashCounted(e.target.value)}
                   className="h-12 text-2xl font-black bg-background border-border/20 text-center rounded-[3px] placeholder:opacity-10 focus:ring-[var(--primary-accent)]/20"
                 />
              </div>

              <div className="flex items-center justify-between p-4 bg-background/40 rounded-[3px] border border-border/10">
                 <div className="space-y-0.5">
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Écart de caisse</span>
                    <div className={cn(
                      "text-sm font-black",
                      discrepancy === 0 && "text-foreground",
                      discrepancy > 0 && "text-[var(--success)]",
                      discrepancy < 0 && "text-destructive"
                    )}>
                       {discrepancy > 0 ? "+" : ""}{discrepancy.toLocaleString()} CFA
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    {discrepancy === 0 ? (
                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 rounded-[3px]">
                         <CheckCircle2 size={12} /> Équilibre Parfait
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-[3px]",
                        discrepancy > 0 ? "text-[var(--warning)] bg-[var(--warning)]/10" : "text-destructive bg-destructive/10"
                      )}>
                         <AlertCircle size={12} /> {discrepancy > 0 ? "Surplus détecté" : "Déficit détecté"}
                      </div>
                    )}
                 </div>
              </div>

              <Button 
                disabled={!cashCounted || isClosing}
                onClick={handleCloseSession}
                className={cn(
                  "h-10 rounded-[3px] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  "bg-foreground text-background hover:bg-foreground/90 shadow-2xl shadow-foreground/5"
                )}
              >
                {isClosing ? "Traitement..." : "Finaliser la Clôture de Journée"}
                {!isClosing && <ArrowRight size={14} className="ml-2" />}
              </Button>
           </div>
        </div>

        {/* RECENT SALES */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
           <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                 <History size={14} /> Activité de Session
              </h4>
              <span className="text-[8px] bg-muted/40 px-2 py-0.5 rounded-full font-bold opacity-40 uppercase">Dernières 10 ventes</span>
           </div>

           <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {summary?.recent_transactions.map((t) => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-muted/5 border border-border/10 rounded-[3px] group hover:bg-muted/10 transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[3px] bg-background/40 flex items-center justify-center">
                         {t.method === "cash" ? <Banknote size={14} className="opacity-40" /> : <CreditCard size={14} className="opacity-40 text-[var(--primary-accent)]" />}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black tracking-tight">{t.amount.toLocaleString()} CFA</span>
                         <span className="text-[7px] uppercase font-bold opacity-30">Transaction #{t.id}</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] font-black opacity-40">{t.time}</span>
                      <span className="text-[6px] uppercase font-bold px-1 py-0.5 bg-[var(--success)]/10 text-[var(--success)] rounded-[2px]">Succès</span>
                   </div>
                </div>
              ))}

              {summary?.recent_transactions.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-4 pt-12">
                   <Receipt size={64} strokeWidth={1} />
                   <p className="text-[10px] font-black uppercase tracking-[0.4em]">Aucune Vente</p>
                </div>
              )}
           </div>
        </div>

      </div>

    </div>
  );
}
