"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Truck, PackageCheck, Repeat, ClipboardList, Search, Plus, ArrowRight, User, Calendar, CheckCircle2, ChevronRight, History } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function LogisticsModule() {
  const [activeTab, setActiveTab] = useState("arrivals");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const companyId = userData.company_id || 1;
        const res = await fetch(`${API_URL}/products/logs?company_id=${companyId}`);
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching logistics logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // On filtre par type pour les arrivages (IN)
  const arrivals = logs.filter(l => l.type === "IN");
  const moves = logs.filter(l => l.type !== "IN");

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden pb-10">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
         <div className="flex flex-col gap-1">
            <h2 className="text-sm font-black uppercase tracking-[0.3em]">Logistique & Entrepôt</h2>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60">Gestion des flux de marchandises et réapprovisionnements</p>
         </div>
         <Button className="h-10 px-6 rounded-[3px] bg-[var(--primary-accent)] text-white hover:bg-[var(--primary-accent)]/80 font-black text-[10px] uppercase tracking-widest gap-2">
            <Plus size={14} /> Nouvel Arrivage
         </Button>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-4 border-b border-border/10">
         {[
           { id: "arrivals", label: "Arrivages Fournisseurs", icon: Truck },
           { id: "moves", label: "Mouvements Internes", icon: Repeat },
           { id: "logs", label: "Journal de Stock", icon: History },
         ].map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={cn(
               "flex items-center gap-2 pb-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all relative",
               activeTab === tab.id ? "text-[var(--primary-accent)]" : "text-muted-foreground/40 hover:text-foreground"
             )}
           >
             <tab.icon size={12} />
             {tab.label}
             {activeTab === tab.id && (
               <motion.div layoutId="logistics-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-accent)]" />
             )}
           </button>
         ))}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         {activeTab === "arrivals" && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
               <div className="flex gap-4">
                  <div className="relative flex-1 max-w-[300px]">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
                     <Input placeholder="Rechercher un bon..." className="pl-10 h-9 rounded-[3px] text-[10px] bg-background/20" />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  {arrivals.map((arr) => (
                     <div key={arr.id} className="p-4 rounded-[3px] border border-border/10 bg-background/20 flex items-center justify-between group hover:border-[var(--primary-accent)]/20 transition-all cursor-pointer">
                        <div className="flex items-center gap-6">
                           <div className="w-10 h-10 rounded-[3px] bg-muted/20 flex items-center justify-center text-muted-foreground group-hover:text-[var(--primary-accent)] group-hover:bg-[var(--primary-accent-pale)] transition-all">
                              <Truck size={18} />
                           </div>
                           <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-black uppercase tracking-widest">{arr.id}</span>
                              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">{arr.supplier} • {arr.items} Articles</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-10">
                           <div className="text-right">
                              <p className="text-[10px] font-black">{arr.total}</p>
                              <p className="text-[8px] opacity-40 uppercase font-black">{arr.date}</p>
                           </div>
                           <div className={cn(
                              "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                              arr.status === "Reçu" ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                           )}>
                              {arr.status}
                           </div>
                           <ChevronRight size={16} className="text-muted-foreground/20 group-hover:text-foreground" />
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {activeTab === "moves" && (
            <div className="flex flex-col items-center justify-center h-[300px] opacity-20 text-center gap-4 animate-in fade-in">
               <Repeat size={48} />
               <p className="text-[9px] font-black uppercase tracking-[0.4em]">Section de transferts inter-dépôts</p>
            </div>
         )}

         {activeTab === "logs" && (
            <div className="flex flex-col items-center justify-center h-[300px] opacity-20 text-center gap-4 animate-in fade-in">
               <ClipboardList size={48} />
               <p className="text-[9px] font-black uppercase tracking-[0.4em]">Journal détaillé des mouvements</p>
            </div>
         )}
      </div>
    </div>
  );
}
