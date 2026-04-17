"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, FileText, Plus, Trash2, X, Check, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";

const EXPENSE_CATEGORIES = ["Stock", "Loyer", "Salaires", "Énergie", "Autre"];

export function ExpensesModule() {
  const { user } = useDashboard();
  const companyId = user?.company_id || 1;
  const [expenses, setExpenses] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [period, setPeriod] = useState("daily");

  const [newExpense, setNewExpense] = useState({
    category: "Autre",
    description: "",
    amount: 0
  });

  const fetchData = async () => {
    try {
      const [statsRes, expRes] = await Promise.all([
        fetch(`${API_URL}/stats/overview?company_id=${companyId}&period=${period}`),
        fetch(`${API_URL}/expenses/?company_id=${companyId}&period=${period}`)
      ]);
      
      const stats = await statsRes.json();
      const exps = await expRes.json();
      
      setFinanceData(stats);
      setExpenses(Array.isArray(exps) ? exps : []);
    } catch (err) {
      console.error("Error fetching expense data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, period]);

  const handleAddExpense = async () => {
    try {
      const res = await fetch(`${API_URL}/expenses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newExpense, company_id: companyId }),
      });
      
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewExpense({ category: "Autre", description: "", amount: 0 });
        fetchData();
      }
    } catch (err) {
      console.error("Error adding expense", err);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    try {
      await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Error deleting expense", err);
    }
  };

  if (!financeData) return <div className="text-center p-20 opacity-40 uppercase text-[10px] tracking-widest">Chargement des dépenses...</div>;

  const totalExps = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const getPeriodLabel = () => {
      switch (period) {
          case "weekly": return "Cette Semaine";
          case "monthly": return "Ce Mois";
          case "yearly": return "Cette Année";
          default: return "Aujourd'hui";
      }
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500 overflow-hidden pb-4">
      <div className="flex justify-between items-center bg-muted/10 p-5 rounded-[3px] border border-border/10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">Gestion des Dépenses</h2>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 italic">Enregistrez et suivez vos sorties de fonds</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-4 border-r border-border/20 pr-4">
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
                            ? "bg-foreground text-background" 
                            : "bg-muted text-foreground/70 hover:bg-muted/80"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                </div>
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              size="sm" 
              className="h-8 gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-[3px]"
            >
              <Plus size={12} /> <span className="text-[10px] font-bold uppercase tracking-widest">Nouvelle Dépense</span>
            </Button>
        </div>
      </div>

      <div className={cn("space-y-6 transition-all duration-500 flex flex-col flex-1 min-h-0", loading ? "opacity-30 scale-[0.99] blur-[2px]" : "opacity-100 scale-100 blur-0")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {[
          { label: `Ventes (${getPeriodLabel()})`, value: `${(financeData.ca_today || 0).toLocaleString()} CFA`, color: "text-[var(--primary-accent)]", icon: TrendingUp },
          { label: `Total Dépenses (${getPeriodLabel()})`, value: `${(totalExps || 0).toLocaleString()} CFA`, color: "text-destructive", icon: TrendingDown },
          { label: `Balance Nette (${getPeriodLabel()})`, value: `${((financeData.ca_today || 0) - (totalExps || 0)).toLocaleString()} CFA`, color: "text-emerald-500", icon: Wallet },
        ].map((item) => (
          <div key={item.label} className="p-5 rounded-[3px] border border-border/20 bg-background group hover:border-[var(--primary-accent)]/20 transition-all">
             <div className="flex justify-between items-center text-muted-foreground/40 mb-2">
                <item.icon size={14} />
             </div>
             <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">{item.label}</p>
                <h3 className={cn("text-sm font-bold tracking-tight", item.color)}>{item.value}</h3>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-background border border-border/20 rounded-[3px] flex flex-col overflow-hidden flex-1 min-h-0">
         <div className="p-4 border-b border-border/20 bg-muted/10 font-bold text-[10px] uppercase tracking-widest flex justify-between items-center shrink-0">
            Dernières Opérations
            <span className="text-[8px] opacity-40 uppercase">Journal des dépenses ({getPeriodLabel()})</span>
         </div>
         <div className="flex-1 overflow-y-auto pb-4 pr-2 custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border/10">
                  <tr>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground">Catégorie</th>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground">Description</th>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground">Montant</th>
                     <th className="p-3 text-[9px] uppercase text-muted-foreground w-[40px]"></th>
                  </tr>
               </thead>
               <tbody>
                  {expenses.length === 0 ? (
                     <tr><td colSpan={4} className="p-10 text-center text-[10px] opacity-20 uppercase tracking-widest">Aucune dépense enregistrée</td></tr>
                  ) : expenses.map((exp) => (
                     <tr key={exp.id} className="border-b border-border/5 hover:bg-muted/5 transition-colors group">
                        <td className="p-3">
                           <span className="px-1.5 py-0.5 bg-muted/30 rounded-[3px] text-[8px] font-bold uppercase">{exp.category}</span>
                        </td>
                        <td className="p-3 text-[10px] text-muted-foreground">{exp.description || "-"}</td>
                        <td className="p-3 text-[10px] font-bold text-destructive">-{(exp.amount || 0).toLocaleString()} CFA</td>
                        <td className="p-3">
                           <button onClick={() => handleDeleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded-[2px] transition-all">
                              <Trash2 size={12} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
      </div>

       <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-sm bg-background border border-border/20 p-6 rounded-[3px] shadow-2xl space-y-5"
            >
               <div className="flex justify-between items-center pb-3 border-b border-border/10">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">Enregistrer une dépense</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">Catégorie</Label>
                    <select 
                      className="w-full h-8 bg-muted/20 border border-border/20 rounded-[3px] px-2 text-xs text-foreground outline-none focus:border-[var(--primary-accent)]"
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                    >
                       {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">Description</Label>
                    <Input 
                      className="h-8 rounded-[3px] text-xs" 
                      placeholder="Ex: Facture CIE Mars"
                      value={newExpense.description}
                      onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">Montant (CFA)</Label>
                    <Input 
                      type="number"
                      className="h-8 rounded-[3px] text-xs font-bold" 
                      value={newExpense.amount === 0 ? "" : newExpense.amount}
                      onChange={e => setNewExpense({...newExpense, amount: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                    />
                  </div>
               </div>

               <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-8 rounded-[3px] text-[10px] uppercase font-bold">Annuler</Button>
                  <Button onClick={handleAddExpense} className="flex-1 h-8 bg-foreground text-background hover:bg-foreground/90 rounded-[3px] text-[10px] uppercase font-bold gap-2">
                    <Check size={14} /> Enregistrer
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
