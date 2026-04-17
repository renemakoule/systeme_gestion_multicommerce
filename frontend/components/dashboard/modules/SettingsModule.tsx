"use client";
import { API_URL } from "@/lib/config";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Store,
  Hash,
  Landmark,
  Globe,
  Mail,
  Phone,
  MapPin,
  Percent,
  Save,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { getSystemNames } from "@/lib/system-names";

export function SettingsModule() {
  const { company, refreshCompany, activeOption, shopType } = useDashboard();
  const names = getSystemNames(shopType);
  const [activeTab, setActiveTab] = useState(activeOption === "taxes" ? "taxes" : "shop");
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (company) setFormData(company);
  }, [company]);

  useEffect(() => {
    if (activeOption === "taxes" || activeOption === "shop") {
      setActiveTab(activeOption);
    }
  }, [activeOption]);

  const handleSave = async () => {
    try {
      // Nettoyer les données pour éviter d'envoyer created_at si c'est identique ou immuable
      // Le backend gère déjà l'exclusion de id et created_at maintenant.
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
      console.error("Failed to update company settings", err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/companies/${company.id}/logo`, {
        method: "POST",
        body: uploadFormData,
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, logo_url: data.logo_url });
        refreshCompany();
      }
    } catch (err) {
      console.error("Logo upload failed", err);
    }
  };

  if (!formData)
    return (
      <div className="h-full flex items-center justify-center opacity-40 uppercase text-[10px] tracking-widest">
        Chargement des paramètres...
      </div>
    );

  return (
    <div className="h-full flex gap-10 animate-in fade-in duration-500 overflow-hidden pb-10">
      {/* NAVIGATION (Left) */}
      <div className="w-[200px] flex flex-col space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-2 mb-2">
          Configuration
        </h4>
        {[
          { id: "shop", label: names.shopLabel, icon: Store },
          { id: "taxes", label: "Taxes & TVA", icon: Landmark },
          { id: "units", label: "Unités", icon: Hash },
          { id: "system", label: "Système", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-[3px] text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id
                ? "bg-[var(--primary-accent-pale)] text-[var(--primary-accent)] border border-[var(--primary-accent)]/10"
                : "text-muted-foreground hover:bg-muted/10 hover:text-foreground",
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA (Right) */}
      <div className="flex-1 max-w-[800px] flex flex-col bg-background/20 border border-border/10 rounded-[3px] overflow-hidden">
        <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar">
          {activeTab === "shop" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-end border-b border-border/10 pb-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">
                    Identité de l'Établissement
                  </h3>
                  <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tight">
                    Ces informations apparaîtront sur vos tickets de caisse
                  </p>
                </div>
                <div 
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  className="w-16 h-16 bg-muted/10 border-2 border-dashed border-border/20 rounded-[3px] flex items-center justify-center text-[8px] font-bold text-muted-foreground text-center p-0 overflow-hidden hover:border-[var(--primary-accent)]/40 transition-all cursor-pointer relative group"
                >
                  {formData.logo_url ? (
                    <>
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         Modifier
                      </div>
                    </>
                  ) : (
                    <>Logo<br/>(1:1)</>
                  )}
                  <input 
                    id="logo-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Nom Commercial
                  </Label>
                  <Input
                    className="h-10 rounded-[3px] bg-background/40 border-border/20 text-xs"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Type d'Activité
                  </Label>
                  <Input
                    className="h-10 rounded-[3px] bg-background/40 border-border/20 text-xs"
                    value={formData.type || "boutique"}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Email de Contact
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                      size={12}
                    />
                    <Input
                      className="pl-10 h-10 rounded-[3px] bg-background/40 border-border/20 text-xs"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Téléphone
                  </Label>
                  <div className="relative phone-input-container">
                    <PhoneInput
                      international
                      countryCallingCodeEditable={false}
                      defaultCountry="CM"
                      placeholder="Entrez le numéro"
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      className="h-10 rounded-[3px] bg-background/40 border border-border/20 text-xs text-foreground"
                    />
                    <style jsx global>{`
                      .phone-input-container .PhoneInput {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 0 12px;
                        transition: border-color 0.2s;
                      }
                      .phone-input-container .PhoneInput:focus-within {
                        border-color: var(--primary-accent);
                      }
                      .phone-input-container .PhoneInputInput {
                        background: transparent;
                        border: none;
                        outline: none;
                        color: inherit;
                        font-family: inherit;
                        font-size: inherit;
                        width: 100%;
                      }
                      .phone-input-container .PhoneInputCountry {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                      }
                      .phone-input-container .PhoneInputCountrySelect {
                        opacity: 0;
                        position: absolute;
                        width: 40px;
                        height: 100%;
                        cursor: pointer;
                        z-index: 10;
                      }
                      .phone-input-container .PhoneInputCountryIcon {
                        width: 20px;
                        height: 15px;
                        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
                        border-radius: 2px;
                      }
                      .phone-input-container .PhoneInputCountryIcon--square {
                         width: 15px;
                      }
                    `}</style>
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Adresse Physique
                  </Label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                      size={12}
                    />
                    <Input
                      className="pl-10 h-10 rounded-[3px] bg-background/40 border-border/20 text-xs"
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "taxes" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="border-b border-border/10 pb-6">
                <h3 className="text-sm font-black uppercase tracking-widest">
                  Régime Fiscal & TVA
                </h3>
                <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tight">
                  Configuration des taxes applicables aux produits
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-5 rounded-[3px] border border-border/10 bg-background/40 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h5 className="text-[10px] font-black uppercase tracking-widest">
                      TVA Standard (18%)
                    </h5>
                    <p className="text-[8px] text-muted-foreground/60 uppercase font-bold tracking-tighter">
                      Appliquée par défaut à tous les nouveaux produits
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 accent-[var(--primary-accent)]"
                  />
                </div>

                <div className="p-5 rounded-[3px] border border-border/10 bg-background/40 flex items-center justify-between opacity-50">
                  <div className="flex flex-col gap-1">
                    <h5 className="text-[10px] font-black uppercase tracking-widest">
                      Affichage Prix TTC
                    </h5>
                    <p className="text-[8px] text-muted-foreground/60 uppercase font-bold tracking-tighter">
                      Inclure la taxe dans le prix affiché en rayon
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[var(--primary-accent)]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "units" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="border-b border-border/10 pb-6">
                <h3 className="text-sm font-black uppercase tracking-widest">
                  Unités de Mesure
                </h3>
                <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tight">
                  Définissez les unités pour vos stocks
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {["Pce", "Kg", "Litre", "Carton", "Sac", "Mètre"].map(
                  (unit) => (
                    <div
                      key={unit}
                      className="p-4 rounded-[3px] border border-border/10 bg-background/40 flex items-center justify-between group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {unit}
                      </span>
                      <button className="text-muted-foreground/20 group-hover:text-destructive transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ),
                )}
                <button className="p-4 rounded-[3px] border border-dashed border-border/20 text-[8px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:border-[var(--primary-accent)] transition-all">
                  + Ajouter Unité
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-10 border-t border-border/10 mt-auto">
            <div className="text-[9px] font-bold text-muted-foreground">
              Dernière modification : il y a 2 jours
            </div>
            <div className="flex items-center gap-4">
              <AnimatePresence>
                {isSaved && (
                  <span className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2">
                    <CheckCircle2 size={14} /> Modifications Enregistrées
                  </span>
                )}
              </AnimatePresence>
              <Button
                onClick={handleSave}
                className="h-10 px-8 rounded-[3px] bg-foreground text-background hover:bg-foreground/90 font-black text-[10px] uppercase tracking-widest"
              >
                <Save size={14} className="mr-2" /> Enregistrer les Paramètres
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
