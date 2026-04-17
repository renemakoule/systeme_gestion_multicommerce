"use client";
import { API_URL } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { Landmark, Hash, Save, CheckCircle2, DollarSign, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export function TaxesUnitsModule() {
  const { company, refreshCompany } = useDashboard();
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [units, setUnits] = useState<string[]>(["Pce", "Kg", "Litre", "Carton", "Sac", "Mètre"]);

  useEffect(() => {
    if (company) setFormData({ ...company });
  }, [company]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_URL}/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsSaved(true);
        refreshCompany();
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update taxes/units settings", err);
    }
  };

  if (!formData)
    return (
      <div className="h-full flex items-center justify-center opacity-40 uppercase text-[10px] tracking-widest leading-loose">
        Initialisation de la configuration financière...
      </div>
    );

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex justify-between items-center mb-8 border-b border-border/10 pb-6">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Taxes & Unités de Mesure</h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Gestion fiscale et paramètres logistiques de stock</p>
        </div>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {isSaved && (
              <span className="flex items-center gap-2 text-(--success) text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={14} /> Données Synchronisées
              </span>
            )}
          </AnimatePresence>
          <Button
            onClick={handleSave}
            className="h-10 px-8 rounded-[3px] bg-foreground text-background hover:bg-foreground/90 font-black text-[10px] uppercase tracking-widest"
          >
            <Save size={14} className="mr-2" /> Enregistrer la Configuration
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar lg:max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* SECTION TAXES */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-(--success)/80 mb-4 flex items-center gap-2">
               <Landmark size={12} /> Régime Fiscal (TVA)
            </h3>
            <div className="bg-muted/5 p-6 rounded-[3px] border border-border/10 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Taux de Taxe (%)</Label>
                <div className="flex items-center gap-3">
                   <div className="flex-1 relative">
                      <Input
                        type="number"
                        className="h-11 rounded-[3px] bg-background/40 border-border/20 text-xs font-bold"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">%</div>
                   </div>
                   <div className="text-[10px] font-black uppercase tracking-tighter opacity-40 px-3 py-1 bg-muted/20 border border-border/10 rounded-[2px]">TVA</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Devise du Système</Label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={12} />
                   <Input
                     className="pl-10 h-11 rounded-[3px] bg-background/40 border-border/20 text-xs font-bold"
                     value={formData.currency || "FCFA"}
                     onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                   />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION UNITÉS */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-(--success)/80 mb-4 flex items-center gap-2">
               <Hash size={12} /> Unités de Stock
            </h3>
            <div className="grid grid-cols-2 gap-3">
               {units.map((unit, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/5 border border-border/5 rounded-[3px] group hover:border-(--success)/20 transition-all">
                     <span className="text-[10px] font-bold uppercase tracking-widest">{unit}</span>
                     <button className="text-muted-foreground/20 group-hover:text-destructive transition-all">
                        <Trash2 size={12} />
                     </button>
                  </div>
               ))}
               <button className="flex items-center justify-center gap-2 p-3 border border-dashed border-border/20 rounded-[3px] text-[8px] font-black uppercase opacity-40 hover:opacity-100 hover:border-(--success)/40 transition-all">
                  <Plus size={10} /> Ajouter Unité
               </button>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-(--success)/5 border border-(--success)/10 rounded-[3px]">
           <h5 className="text-[10px] font-black uppercase text-(--success) tracking-widest mb-2 flex items-center gap-2">
              Note de Calcul
           </h5>
           <p className="text-[9px] text-muted-foreground font-bold italic leading-relaxed">
             Le taux de TVA configuré ici s'appliquera automatiquement à tous les rapports de vente et influencera le calcul de vos marges. Le symbole de devise sera utilisé dans toute l'interface.
           </p>
        </div>
      </div>
    </div>
  );
}
