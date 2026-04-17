"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Truck, Plus, Phone, Mail, MapPin, Search, Trash2, X, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: ""
  });

  const fetchData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const res = await fetch(`${API_URL}/suppliers/?company_id=${companyId}`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSupplier = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      
      const res = await fetch(`${API_URL}/suppliers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSupplier, company_id: companyId }),
      });
      
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewSupplier({ name: "", contact_name: "", email: "", phone: "", address: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Error adding supplier", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    try {
      await fetch(`${API_URL}/suppliers/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Error deleting supplier", err);
    }
  };

  return (
    <div className="h-full space-y-6 flex flex-col animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="flex justify-between items-center bg-muted/10 p-4 rounded-[3px] border border-border/10">
        <div className="flex flex-col">
            <h2 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
               <Truck size={14} className="text-[var(--primary-accent)]" /> Gestion des Fournisseurs
            </h2>
            <p className="text-[8px] text-muted-foreground/60 uppercase tracking-tighter">Répertoire de vos partenaires et approvisionneurs</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          size="sm" 
          className="h-8 gap-2 bg-[var(--primary-accent)] text-white hover:bg-[var(--primary-accent)]/90 rounded-[3px]"
        >
          <Plus size={12} /> <span className="text-[10px] font-bold uppercase tracking-widest">Nouveau Fournisseur</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
           <div className="col-span-full pt-10 text-center text-[10px] uppercase opacity-40">Chargement...</div>
        ) : suppliers.length === 0 ? (
           <div className="col-span-full pt-10 text-center text-[10px] uppercase opacity-20 italic">Aucun fournisseur enregistré</div>
        ) : suppliers.map((s) => (
          <div key={s.id} className="p-4 rounded-[3px] border border-border/20 bg-background hover:border-[var(--primary-accent)]/30 transition-all group relative">
             <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-[3px] bg-[var(--primary-accent-pale)] flex items-center justify-center text-[var(--primary-accent)] font-bold uppercase">
                   {s.name.substring(0, 2)}
                </div>
                <button onClick={() => handleDelete(s.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-destructive hover:bg-destructive/10 rounded-[3px] transition-all">
                   <Trash2 size={12} />
                </button>
             </div>

             <h4 className="text-[11px] font-bold text-foreground/80 mb-1">{s.name}</h4>
             <p className="text-[9px] text-muted-foreground/60 uppercase font-bold mb-4">{s.contact_name || "Contact non spécifié"}</p>

             <div className="space-y-2 border-t border-border/5 pt-3">
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80">
                   <Phone size={10} className="text-[var(--primary-accent)] opacity-60" />
                   <span>{s.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80">
                   <Mail size={10} className="text-[var(--primary-accent)] opacity-60" />
                   <span className="truncate">{s.email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80">
                   <MapPin size={10} className="text-[var(--primary-accent)] opacity-60" />
                   <span className="truncate">{s.address || "N/A"}</span>
                </div>
             </div>
          </div>
        ))}
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
               <h3 className="text-[10px] font-bold uppercase tracking-widest border-b border-border/10 pb-3">Nouveau Fournisseur</h3>
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">Nom de la Société</Label>
                    <Input className="h-8 rounded-[3px] text-xs" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Téléphone</Label>
                      <Input className="h-8 rounded-[3px] text-xs" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Email</Label>
                      <Input className="h-8 rounded-[3px] text-xs" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                    </div>
                  </div>
               </div>
               <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-8 rounded-[3px] text-[10px] uppercase font-bold">Annuler</Button>
                  <Button onClick={handleAddSupplier} className="flex-1 h-8 bg-foreground text-background hover:bg-foreground/90 rounded-[3px] text-[10px] uppercase font-bold gap-2">
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
