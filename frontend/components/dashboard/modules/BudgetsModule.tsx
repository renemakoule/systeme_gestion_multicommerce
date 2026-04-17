"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { BarChart, PieChart, X, Check, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { 
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const EXPENSE_CATEGORIES = ["Stock", "Loyer", "Salaires", "Énergie", "Autre"];
const COLORS = ['#e188ff', '#8884d8', '#82ca9d', '#ffc658'];

export function BudgetsModule() {
  const { user } = useDashboard();
  const companyId = user?.company_id || 1;
  const [budgets, setBudgets] = useState<any[]>([]);
  const [spentData, setSpentData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const fetchData = async () => {
    try {
      const [budRes, statusRes] = await Promise.all([
        fetch(`${API_URL}/budgets/?company_id=${companyId}&month=${selectedMonth}&year=${selectedYear}`),
        fetch(`${API_URL}/budgets/status?company_id=${companyId}&month=${selectedMonth}&year=${selectedYear}`)
      ]);
      
      const buds = await budRes.json();
      const status = await statusRes.json();
      
      setBudgets(Array.isArray(buds) ? buds : []);
      setSpentData(status || {});
    } catch (err) {
      console.error("Error fetching budget data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, companyId]);

  if (loading) return <div className="text-center p-20 opacity-40 uppercase text-[10px] tracking-widest">Chargement des budgets...</div>;

  const pieData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: spentData[cat] || 0
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-8 flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="flex justify-between items-center bg-muted/10 p-4 rounded-[3px] border border-border/10">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-black uppercase tracking-[0.3em]">Budgets & Alertes</h2>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Définissez vos plafonds et suivez votre consommation</p>
        </div>
        <div className="flex gap-2">
           <select 
             value={selectedMonth}
             onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
             className="bg-background border border-border/20 p-2 text-[10px] uppercase font-bold outline-none rounded-[3px]"
           >
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
           </select>
           <Button 
             onClick={() => setIsEditModalOpen(true)}
             size="sm" 
             className="h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-[3px]"
           >
             <BarChart size={12} /> <span className="text-[10px] font-bold uppercase tracking-widest">Définir les Plafonds</span>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* PROGRESS BARS */}
         <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-4 flex items-center gap-2">
              <AlertCircle size={12} /> État de consommation par catégorie
            </h3>
            
            <div className="space-y-6">
               {EXPENSE_CATEGORIES.map(cat => {
                  const budget = budgets.find(b => b.category === cat)?.amount || 0;
                  const spent = spentData[cat] || 0;
                  const percent = budget > 0 ? (spent / budget) * 100 : 0;
                  const isCritical = percent >= 80;
                  const isExceeded = percent > 100;

                  return (
                     <div key={cat} className="space-y-2">
                        <div className="flex justify-between items-end">
                           <div>
                              <span className="text-[10px] font-black uppercase tracking-tight block">{cat}</span>
                              <span className="text-[8px] opacity-40 uppercase font-bold">
                                {spent.toLocaleString()} / {budget > 0 ? `${budget.toLocaleString()} CFA` : "Non défini"}
                              </span>
                           </div>
                           <span className={cn(
                             "text-[10px] font-black",
                             isExceeded ? "text-destructive" : isCritical ? "text-orange-500" : "text-muted-foreground"
                           )}>
                             {Math.round(percent)}%
                           </span>
                        </div>
                        <div className="h-2 w-full bg-muted/20 rounded-full overflow-hidden border border-border/5">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, percent)}%` }}
                              className={cn(
                                "h-full transition-colors",
                                isExceeded ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.3)]" : 
                                isCritical ? "bg-orange-500" : "bg-[var(--primary-accent)]"
                              )}
                           />
                        </div>
                        {isExceeded && (
                          <p className="text-[7px] text-destructive font-black uppercase tracking-tighter animate-pulse">
                            Dépassement de {(spent - budget).toLocaleString()} CFA
                          </p>
                        )}
                     </div>
                  )
               })}
            </div>
         </div>

         {/* PIE CHART & LEGEND */}
         <div className="flex flex-col gap-6">
            <div className="p-6 rounded-[3px] border border-border/20 bg-background/40 flex-1 flex flex-col items-center justify-center min-h-[300px]">
               <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-8 self-start">Répartition Budgétaire</h4>
               
               {pieData.length > 0 ? (
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={pieData}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#000', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            fontSize: '10px',
                            borderRadius: '3px',
                            fontWeight: 'bold'
                          }} 
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-3">
                    <PieChart size={40} strokeWidth={1} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Aucun budget défini</p>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-4 w-full mt-6">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{d.name}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-4 rounded-[3px] bg-blue-500/5 border border-blue-500/10 flex gap-3">
               <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
               <p className="text-[9px] text-blue-500/80 leading-relaxed font-bold uppercase tracking-wide">
                 Les alertes s'activent automatiquement dès que vous atteignez 80% d'un plafond budgétaire.
               </p>
            </div>
         </div>
      </div>

      {/* EDIT BUDGET MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm px-10">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-md bg-background border border-border/20 p-6 rounded-[3px] shadow-2xl space-y-6"
            >
               <div className="flex justify-between items-center pb-3 border-b border-border/10">
                  <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest">Définir les Plafonds Mensuels</h3>
                    <p className="text-[8px] text-muted-foreground uppercase">{months[selectedMonth-1]} {selectedYear}</p>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
               </div>
               
               <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {EXPENSE_CATEGORIES.map(cat => (
                     <div key={cat} className="flex items-center justify-between gap-4 p-2 rounded-[3px] hover:bg-muted/10 transition-all">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground w-20">{cat}</Label>
                        <Input 
                           type="number"
                           placeholder="0 CFA"
                           defaultValue={budgets.find(b => b.category === cat)?.amount || ""}
                           onBlur={async (e) => {
                              const amount = parseFloat(e.target.value);
                              if (isNaN(amount)) return;
                              await fetch(`${API_URL}/budgets/`, {
                                 method: "POST",
                                 headers: { "Content-Type": "application/json" },
                                 body: JSON.stringify({ 
                                    company_id: companyId, 
                                    category: cat, 
                                    amount, 
                                    month: selectedMonth, 
                                    year: selectedYear 
                                 }),
                              });
                              fetchData();
                           }}
                           className="h-8 rounded-[3px] text-xs font-bold w-40 text-right pr-4"
                        />
                     </div>
                  ))}
               </div>

               <div className="pt-2">
                  <Button onClick={() => setIsEditModalOpen(false)} className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 rounded-[3px] text-[10px] font-bold uppercase tracking-widest gap-2">
                    <Check size={14} /> Terminer la configuration
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
