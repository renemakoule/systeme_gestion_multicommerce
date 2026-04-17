"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Plus, Search, Trash2, X, Check, Tag, Pencil, ChevronRight, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SMART_CATEGORIES } from "@/lib/categories-data";

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  company_id: number;
}

export function CategoriesModule() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [shopType, setShopType] = useState<string>("boutique");
  
  const [newCategory, setNewCategory] = useState<{
    name: string;
    parent_id: number | null;
  }>({
    name: "",
    parent_id: null
  });

  const fetchData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      setShopType(userData.company_type || "boutique");
      
      const res = await fetch(`${API_URL}/products/categories?company_id=${companyId}`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching categories", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAutoImport = async () => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const smartPacks = SMART_CATEGORIES[shopType] || SMART_CATEGORIES["autre"];
      
      // Map current categories to avoid duplicates (case insensitive)
      const existingNames = new Set(categories.map(c => c.name.toLowerCase()));

      for (const pack of smartPacks) {
        let parentId: number | null = null;
        
        // 1. Check if parent category exists, otherwise create it
        const existingParent = categories.find(c => c.name.toLowerCase() === pack.name.toLowerCase() && !c.parent_id);
        
        if (existingParent) {
          parentId = existingParent.id;
        } else if (!existingNames.has(pack.name.toLowerCase())) {
          const res = await fetch(`${API_URL}/products/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: pack.name, company_id: companyId, parent_id: null })
          });
          if (res.ok) {
            const created: Category = await res.json();
            parentId = created.id;
            // Add to current local set to avoid double creation in this loop
            existingNames.add(pack.name.toLowerCase());
          }
        } else {
           // It exists but might not have been caught by ID (local state lag)
           // We'll skip for now or rely on the next fetch
        }

        // 2. Handle subcategories
        if (parentId && pack.subs) {
          for (const subName of pack.subs) {
            const alreadyHasSub = categories.some(c => c.name.toLowerCase() === subName.toLowerCase() && c.parent_id === parentId);
            
            if (!alreadyHasSub) {
              await fetch(`${API_URL}/products/categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: subName, company_id: companyId, parent_id: parentId })
              });
            }
          }
        }
      }
      
      await fetchData();
    } catch (err) {
      console.error("Error importing categories", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      
      const url = editingCategory 
        ? `${API_URL}/products/categories/${editingCategory.id}`
        : `${API_URL}/products/categories`;
      
      const method = editingCategory ? "PUT" : "POST";
      
      const body = editingCategory 
        ? { name: newCategory.name, parent_id: newCategory.parent_id } 
        : { ...newCategory, company_id: companyId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingCategory(null);
        setNewCategory({ name: "", parent_id: null });
        fetchData();
      }
    } catch (err) {
      console.error("Error saving category", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette catégorie ? Cela n'effacera pas les produits associés mais ils n'auron plus de catégorie.")) return;
    try {
      await fetch(`${API_URL}/products/categories/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Error deleting category", err);
    }
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategory({ name: cat.name, parent_id: cat.parent_id });
    setIsModalOpen(true);
  };

  // Logic to render hierarchy
  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubCategories = (parentId: number) => categories.filter(c => c.parent_id === parentId);

  const filteredParents = parentCategories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    getSubCategories(c.id).some(s => s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="h-full space-y-6 flex flex-col animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="flex justify-between items-center bg-muted/10 p-4 rounded-[3px] border border-border/10">
        <div className="flex gap-4 items-center">
            <h2 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
               <Layers size={14} className="text-[var(--primary-accent)]" /> Architecture des Catégories
            </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative max-w-[200px] w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={12} />
            <Input 
              placeholder="Rechercher..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-[10px] bg-background border-border/20 rounded-[3px]" 
            />
          </div>
          
          <Button 
            variant="outline"
            onClick={handleAutoImport}
            disabled={loading}
            className="h-8 gap-2 border-dashed border-[var(--primary-accent)]/30 text-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/10 rounded-[3px] group"
          >
             <Check size={12} className={cn(loading && "animate-spin")} /> 
             <span className="text-[10px] font-bold uppercase tracking-widest">Configurer Pack {shopType}</span>
          </Button>

          <Button 
            onClick={() => { setEditingCategory(null); setNewCategory({name: "", parent_id: null}); setIsModalOpen(true); }}
            size="sm" 
            className="h-8 gap-2 bg-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/80 text-white rounded-[3px]"
          >
            <Plus size={12} /> <span className="text-[10px] font-bold uppercase tracking-widest">Nouvelle Catégorie</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar border border-border/20 rounded-[3px] bg-background/40">
        {loading && categories.length === 0 ? (
             <div className="p-10 text-center text-[10px] uppercase opacity-40 italic">Initialisation du système intelligent...</div>
        ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center border border-dashed border-border/40 animate-pulse">
                 <Layers size={32} className="text-muted-foreground/20" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-2">Aucune catégorie détectée</h3>
                <p className="text-[9px] text-muted-foreground/60 uppercase font-bold leading-relaxed">
                   Souhaitez-vous que l'IA implémente automatiquement l'architecture de catégories pour votre <span className="text-[var(--primary-accent)]">{shopType}</span> ?
                </p>
              </div>
              <Button onClick={handleAutoImport} className="bg-foreground text-background hover:bg-foreground/90 h-9 px-6 rounded-[3px] text-[10px] font-black uppercase tracking-widest gap-2">
                 Démarrer l'implémentation intelligente
              </Button>
            </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredParents.map((parent) => (
              <div key={parent.id} className="space-y-1">
                {/* PARENT ROW */}
                <div className="flex items-center justify-between p-3 bg-muted/5 rounded-[3px] border border-border/5 hover:border-[var(--primary-accent)]/20 transition-all group">
                   <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-[3px] bg-[var(--primary-accent)]/10 flex items-center justify-center">
                         <Tag size={12} className="text-[var(--primary-accent)]" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight text-foreground/80">{parent.name}</span>
                   </div>
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(parent)} className="p-1.5 hover:bg-muted/20 rounded-[2px] text-muted-foreground"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(parent.id)} className="p-1.5 hover:bg-destructive/10 rounded-[2px] text-destructive/60 hover:text-destructive"><Trash2 size={12} /></button>
                   </div>
                </div>

                {/* CHILDREN ROWS */}
                <div className="ml-8 space-y-1 border-l border-border/10 pl-4">
                   {getSubCategories(parent.id).map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-2 hover:bg-muted/5 rounded-[2px] group/sub">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                            <span className="text-[10px] font-bold text-muted-foreground group-hover/sub:text-foreground transition-colors">{sub.name}</span>
                         </div>
                         <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(sub)} className="p-1 hover:bg-muted/20 rounded-[2px] text-muted-foreground/50"><Pencil size={10} /></button>
                            <button onClick={() => handleDelete(sub.id)} className="p-1 hover:bg-destructive/10 rounded-[2px] text-destructive/40 hover:text-destructive"><Trash2 size={10} /></button>
                         </div>
                      </div>
                   ))}
                   <button 
                    onClick={() => { setEditingCategory(null); setNewCategory({name: "", parent_id: parent.id}); setIsModalOpen(true); }}
                    className="flex items-center gap-2 p-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-[var(--primary-accent)] transition-colors"
                   >
                     <Plus size={10} /> Ajouter une sous-catégorie
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-sm bg-background border border-border/20 p-6 rounded-[3px] shadow-2xl space-y-6"
            >
               <div className="flex justify-between items-center pb-4 border-b border-border/10">
                  <h3 className="text-sm font-bold uppercase tracking-widest">
                    {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nom</Label>
                    <Input 
                      className="h-9 rounded-[3px] text-xs" 
                      value={newCategory.name}
                      onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                      placeholder="Ex: Électronique, Alimentation..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Catégorie Parente (Optionnel)</Label>
                    <select 
                      className="w-full h-9 bg-background border border-border/20 rounded-[3px] px-3 text-xs focus:outline-none focus:border-[var(--primary-accent)]"
                      value={newCategory.parent_id || ""}
                      onChange={e => setNewCategory({...newCategory, parent_id: e.target.value ? parseInt(e.target.value) : null})}
                    >
                       <option value="">-- Aucune (Catégorie Principale) --</option>
                       {parentCategories.filter(p => !editingCategory || p.id !== editingCategory.id).map(p => (
                         <option key={p.id} value={p.id}>{p.name}</option>
                       ))}
                    </select>
                  </div>
               </div>

               <div className="flex gap-2 pt-4">
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-9 rounded-[3px] text-[10px] uppercase font-bold">Annuler</Button>
                  <Button onClick={handleSave} className="flex-1 h-9 bg-foreground text-background hover:bg-foreground/90 rounded-[3px] text-[10px] uppercase font-bold gap-2">
                    <Check size={14} /> Confirmer
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
