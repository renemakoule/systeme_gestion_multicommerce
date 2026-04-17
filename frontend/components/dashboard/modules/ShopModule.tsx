"use client";
import { API_URL } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { Store, Mail, Phone, MapPin, Save, CheckCircle2, ShoppingCart, Package, Receipt, Wallet, ClipboardList, Users, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export function ShopModule() {
  const { company, refreshCompany, setEnabledModules } = useDashboard();
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  
  const AVAILABLE_MODULES = [
    { id: "sales", label: "Ventes & Commandes", icon: ShoppingCart },
    { id: "inventory", label: "Gestion des Stocks", icon: Package },
    { id: "pos", label: "Caisse / Point de Vente", icon: Receipt },
    { id: "finance", label: "Comptabilité & Bilan", icon: Wallet },
    { id: "history", label: "Traçabilité & Logs", icon: ClipboardList },
    { id: "users", label: "Gestion du Personnel", icon: Users },
  ];

  useEffect(() => {
    if (company) setFormData({ ...company });
  }, [company]);

  const handleSave = async () => {
    try {
      // Préparer les données pour le backend
      const { enabled_modules, ...rest } = formData;
      const res = await fetch(`${API_URL}/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsSaved(true);
        refreshCompany();
        if (formData.enabled_modules) {
          setEnabledModules(formData.enabled_modules.split(","));
        }
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update shop settings", err);
    }
  };

  const toggleModule = (modId: string) => {
    const current = formData.enabled_modules ? formData.enabled_modules.split(",") : ["dashboard", "settings"];
    let updated;
    if (current.includes(modId)) {
      updated = current.filter((m: string) => m !== modId);
    } else {
      updated = [...current, modId];
    }
    setFormData({ ...formData, enabled_modules: updated.join(",") });
  };

  if (!formData)
    return (
      <div className="h-full flex items-center justify-center opacity-40 uppercase text-[10px] tracking-widest leading-loose">
        Authentification des paramètres boutique...
      </div>
    );

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-500 overflow-hidden">
      <div className="flex justify-between items-center mb-8 border-b border-border/10 pb-6">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Identité de l'Établissement</h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Configuration visuelle et coordonnées commerciales</p>
        </div>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {isSaved && (
              <span className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={14} /> Synchronisé
              </span>
            )}
          </AnimatePresence>
          <Button
            onClick={handleSave}
            className="h-10 px-8 rounded-[3px] bg-foreground text-background hover:bg-foreground/90 font-black text-[10px] uppercase tracking-widest"
          >
            <Save size={14} className="mr-2" /> Mettre à jour la Boutique
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar lg:max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* SECTION IMAGE / LOGO */}
          <div className="col-span-1 md:col-span-2 flex items-center gap-8 bg-muted/5 p-6 rounded-[3px] border border-border/10">
             <div className="w-24 h-24 bg-muted/20 border-2 border-dashed border-border/30 rounded-[3px] flex items-center justify-center text-[10px] font-bold text-muted-foreground text-center p-3 hover:border-violet-500/40 transition-all cursor-pointer">
                LOGO<br/>CLIENT
             </div>
             <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Logo de l'établissement</h4>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-relaxed max-w-sm">
                  Utilisez un format carré (1:1). Ce logo apparaîtra sur vos impressions de tickets et vos rapports PDF.
                </p>
                <Button variant="outline" className="h-7 text-[8px] uppercase font-bold mt-3 px-4 border-border/20">Changer l'image</Button>
             </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500/80 mb-4 flex items-center gap-2">
               <Store size={12} /> Informations Générales
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Nom Commercial</Label>
                <Input
                  className="h-11 rounded-[3px] bg-background/40 border-border/20 text-xs font-bold"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Secteur d'Activité</Label>
                <div className="h-11 rounded-[3px] bg-muted/10 border border-border/10 text-xs font-bold px-4 flex items-center uppercase text-muted-foreground/50">
                  {formData.type || "Boutique standard"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500/80 mb-4 flex items-center gap-2">
               <Phone size={12} /> Contact & Localisation
            </h3>
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Téléphone</Label>
                    <div className="relative">
                       <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={12} />
                       <Input
                         className="pl-10 h-11 rounded-[3px] bg-background/40 border-border/20 text-xs font-bold"
                         value={formData.phone || ""}
                         onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                         placeholder="+221 ..."
                       />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Email</Label>
                    <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={12} />
                       <Input
                         className="pl-10 h-11 rounded-[3px] bg-background/40 border-border/20 text-xs font-bold"
                         value={formData.email || ""}
                         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                         placeholder="contact@shop.com"
                       />
                    </div>
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Adresse Physique</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={12} />
                    <Input
                      className="pl-10 h-11 rounded-[3px] bg-background/40 border-border/20 text-xs font-bold"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ex: Plateau, Rue 12 x 5"
                    />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* SECTION GESTION DES MODULES */}
        <div className="mt-12 bg-muted/5 border border-border/10 rounded-[3px] p-8">
           <div className="mb-6">
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                 <LayoutGrid size={16} className="text-violet-500" /> Gestion des Fonctionnalités
              </h3>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight mt-1">
                Activez ou désactivez les modules selon les besoins de votre commerce (ex: désactiver le Stock pour un service).
              </p>
           </div>

           <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_MODULES.map((mod) => {
                const isActive = (formData.enabled_modules || "").split(",").includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-[4px] border transition-all text-left group",
                      isActive 
                        ? "border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/5" 
                        : "border-border/40 bg-background/40 opacity-50 hover:opacity-100"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-[3px] transition-colors",
                      isActive ? "bg-violet-500 text-white" : "bg-muted/30 text-muted-foreground group-hover:bg-muted"
                    )}>
                      <mod.icon size={14} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-tighter block">{mod.label}</span>
                      <span className={cn("text-[8px] font-bold uppercase tracking-tighter", isActive ? "text-violet-500" : "text-muted-foreground/40")}>
                        {isActive ? "Activé" : "Désactivé"}
                      </span>
                    </div>
                  </button>
                );
              })}
           </div>
        </div>

        <div className="mt-12 p-6 bg-violet-600/5 border border-violet-600/10 rounded-[3px]">
           <h5 className="text-[10px] font-black uppercase text-violet-500 tracking-widest mb-2 flex items-center gap-2">
              Note Professionnelle
           </h5>
           <p className="text-[9px] text-muted-foreground font-bold italic leading-relaxed">
             Les informations saisies ici servent de référence légale pour l'émission de vos factures et tickets. Assurez-vous qu'elles sont exactes avant d'enregistrer.
           </p>
        </div>
      </div>
    </div>
  );
}
