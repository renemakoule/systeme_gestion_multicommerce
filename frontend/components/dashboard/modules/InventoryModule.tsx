"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreVertical, Package, ChevronRight, AlertTriangle, Trash2, X, Check, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";
import { getSystemNames } from "@/lib/system-names";

export function InventoryModule() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [lastUpdatedId, setLastUpdatedId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { refreshTrigger, shopType } = useDashboard();
  const names = getSystemNames(shopType);
  
  // Product State for Form
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    price: 0,
    cost_price: 0,
    quantity: 0,
    unit: "unite",
    category_id: null as number | null,
    supplier_id: null as number | null,
    min_threshold: 5,
    attributes: "{}",
    image_url: null as string | null
  });

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      
      const [prodRes, catRes, supRes] = await Promise.all([
        fetch(`${API_URL}/products/?company_id=${companyId}`),
        fetch(`${API_URL}/products/categories?company_id=${companyId}`),
        fetch(`${API_URL}/suppliers/?company_id=${companyId}`)
      ]);
      
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      const supData = await supRes.json();
      
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (err) {
      console.error("Error fetching products", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const isInitial = products.length === 0;
    fetchData(!isInitial);
  }, [refreshTrigger]);

  const handleSaveProduct = async () => {
    setIsSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      
      const url = editingProduct 
        ? `${API_URL}/products/${editingProduct.id}?user_id=${userData.id}`
        : `${API_URL}/products/?user_id=${userData.id}`;
      
      const method = editingProduct ? "PUT" : "POST";
      
      const payload = editingProduct 
        ? productForm 
        : { ...productForm, company_id: companyId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const updatedProduct = await res.json();
        setIsModalOpen(false);
        resetForm();
        setLastUpdatedId(updatedProduct.id);
        
        // Mise à jour optimiste et rafraîchissement
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        fetchData(); 

        setTimeout(() => setLastUpdatedId(null), 2000);
      }
    } catch (err) {
      console.error("Error saving product", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm({...productForm, image_url: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet article ? Cette action est irréversible.")) return;
    try {
      await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Error deleting product", err);
    }
  };

  const resetForm = () => {
    setProductForm({ name: "", sku: "", price: 0, cost_price: 0, quantity: 0, unit: "unite", category_id: null, supplier_id: null, min_threshold: 5, attributes: "{}", image_url: null });
    setEditingProduct(null);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku || "",
      price: product.price,
      cost_price: product.cost_price || 0,
      quantity: product.quantity,
      unit: product.unit || "unite",
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      min_threshold: product.min_threshold || 5,
      attributes: product.attributes || "{}",
      image_url: product.image_url || null
    });
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesAlert = !showAlertsOnly || (p.quantity <= p.min_threshold);
    return matchesSearch && matchesAlert;
  });

  return (
    <div className="h-full space-y-6 flex flex-col animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center bg-muted/10 p-4 rounded-[3px] border border-border/10">
        <div className="flex gap-4 items-center">
            <h2 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
               <names.inventoryIcon size={14} className="text-[var(--primary-accent)]" /> {names.inventory} & {names.items}
            </h2>
            <div className="h-4 w-[1px] bg-border/20" />
            {shopType !== 'restaurant' && (
              <button 
                onClick={() => setShowAlertsOnly(!showAlertsOnly)}
                className={cn(
                  "px-2 py-1 rounded-[3px] text-[8px] font-bold uppercase tracking-widest transition-all gap-2 flex items-center",
                  showAlertsOnly ? "bg-destructive text-white shadow-lg shadow-destructive/20" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                 <AlertTriangle size={10} /> {showAlertsOnly ? "Voir Tout" : `Alertes (${products.filter(p => p.quantity <= p.min_threshold).length})`}
              </button>
            )}
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
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            size="sm" 
            className="h-8 gap-2 bg-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/80 text-white rounded-[3px]"
          >
            <Plus size={12} /> <span className="text-[10px] font-bold uppercase tracking-widest">Nouveau/elle {names.items.slice(0, -1)}</span>
          </Button>
        </div>
      </div>

      {/* PRODUCT TABLE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar border border-border/20 rounded-[3px] bg-background/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/30 bg-muted/10 sticky top-0 bg-background">
              <th className="p-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{names.items.slice(0, -1)}</th>
              <th className="p-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Catégorie</th>
              <th className="p-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Prix Unit.</th>
              <th className="p-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{names.inventory}</th>
              <th className="p-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 w-[80px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="overflow-y-auto">
            {loading ? (
               <tr><td colSpan={5} className="p-10 text-center text-[10px] uppercase opacity-40">Chargement...</td></tr>
            ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-[10px] uppercase opacity-40">Aucun article trouvé</td></tr>
            ) : filteredProducts.map((p) => (
              <motion.tr 
                key={p.id} 
                animate={{ 
                  backgroundColor: lastUpdatedId === p.id 
                    ? "rgba(225, 136, 255, 0.15)" // Couleur de flash (accent)
                    : (p.quantity <= p.min_threshold && shopType !== 'restaurant')
                      ? "rgba(239, 68, 68, 0.05)" 
                      : "transparent"
                }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "border-b border-border/5 hover:bg-muted/5 transition-all group"
                )}
              >
                 <td className="p-3">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-foreground/80">{p.name}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] text-muted-foreground/60 font-mono italic">{p.sku || "-"}</span>
                          {shopType === 'pharmacie' && p.attributes && JSON.parse(p.attributes).expiry && (
                            <span className={cn(
                              "text-[7px] px-1 py-0.5 rounded-[2px] font-bold uppercase",
                              new Date(JSON.parse(p.attributes).expiry) < new Date() ? "bg-destructive/20 text-destructive" : "bg-orange-500/20 text-orange-500"
                            )}>
                              Exp: {JSON.parse(p.attributes).expiry}
                            </span>
                          )}
                       </div>
                    </div>
                 </td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 bg-muted/30 rounded-[3px] text-[8px] font-bold uppercase">
                      {categories.find(c => c.id === p.category_id)?.name || "Général"}
                    </span>
                  </td>
                 <td className="p-3 text-[10px] font-bold">
                    {(p.price || 0).toLocaleString()} CFA
                 </td>
                 <td className="p-3">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          p.quantity <= p.min_threshold && shopType !== 'restaurant' ? "bg-destructive animate-pulse" : "bg-emerald-500"
                       )} />
                       <span className={cn(
                          "text-[10px] font-bold",
                          p.quantity <= p.min_threshold && shopType !== 'restaurant' ? "text-destructive" : "text-foreground/80"
                       )}>
                        {shopType === 'restaurant' 
                          ? (p.quantity > 0 ? "Disponible" : "Épuisé")
                          : `${p.quantity} ${p.unit}`
                        }
                       </span>
                    </div>
                 </td>
                 <td className="p-3 text-right flex gap-1 justify-end">
                    <button 
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-[3px] hover:bg-muted/20 text-muted-foreground/60 hover:text-foreground transition-all"
                    >
                      <Pencil size={12} /> 
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-[3px] hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                 </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (ADD/EDIT) PREMIUM */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.98, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.98, y: 10 }}
               className="w-full max-w-[420px] bg-card border border-border/10 rounded-[3px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
            >
               {/* Modal Header */}
               <div className="relative px-6 py-5 border-b border-border/10 bg-muted/5">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">
                      {editingProduct ? `Modifier l'élément` : shopType === 'restaurant' ? 'Ajouter un Plat' : `Nouvel Article`}
                    </h3>
                    <p className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-medium">
                      {shopType === 'restaurant' ? 'Menu Digital' : 'Gestion de Stock'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="absolute top-5 right-5 p-1.5 rounded-[3px] hover:bg-muted/20 text-muted-foreground/40 hover:text-foreground transition-all"
                  >
                    <X size={14} />
                  </button>
               </div>

               {/* Modal Body */}
               <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar bg-card/50">
                  {/* IMAGE UPLOAD ZONE */}
                  <div className="flex justify-center pb-2">
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-24 h-24 rounded-[3px] border border-dashed border-border/20 bg-muted/5 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-[var(--primary-accent)]/30 group-hover:bg-muted/10">
                        {productForm.image_url ? (
                          <img src={productForm.image_url} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <>
                            <Plus size={16} className="text-muted-foreground/40 mb-1" />
                            <span className="text-[8px] uppercase tracking-tighter text-muted-foreground/40 font-bold">Image</span>
                          </>
                        )}
                      </div>
                      {productForm.image_url && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductForm({...productForm, image_url: null});
                          }}
                          className="absolute -top-1 -right-1 z-20 bg-destructive text-white p-0.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section Nom & Catégorie */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Désignation</Label>
                      <Input 
                        className="h-10 bg-muted/5 border-border/10 rounded-[3px] text-[11px] font-medium placeholder:text-muted-foreground/20 focus:border-[var(--primary-accent)]/50 focus:bg-muted/10 transition-all" 
                        value={productForm.name}
                        onChange={e => setProductForm({...productForm, name: e.target.value})}
                        placeholder={shopType === 'restaurant' ? 'ex: Burger Gourmet au Bacon...' : 'ex: Clavier Mécanique RGB...'}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Catégorie</Label>
                        <select 
                          className="w-full h-10 bg-muted/5 border border-border/10 rounded-[3px] px-3 text-[11px] text-foreground outline-none focus:border-[var(--primary-accent)]/50 focus:bg-muted/10 transition-all appearance-none cursor-pointer"
                          value={productForm.category_id || ""}
                          onChange={e => setProductForm({...productForm, category_id: e.target.value ? parseInt(e.target.value) : null})}
                        >
                           <option value="" className="bg-background">Choisir...</option>
                           {categories.map(c => <option key={c.id} value={c.id} className="bg-background">{c.name}</option>)}
                        </select>
                      </div>

                      {shopType !== 'restaurant' ? (
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Référence (SKU)</Label>
                          <Input 
                            className="h-10 bg-muted/5 border-border/10 rounded-[3px] text-[11px] font-mono" 
                            value={productForm.sku}
                            onChange={e => setProductForm({...productForm, sku: e.target.value})}
                            placeholder="REF-000"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Prix (CFA)</Label>
                          <Input 
                            type="number"
                            className="h-10 bg-muted/5 border-[var(--primary-accent)]/20 text-[var(--primary-accent)] font-black rounded-[3px] text-[12px]" 
                            value={productForm.price === 0 ? "" : productForm.price}
                            onChange={e => setProductForm({...productForm, price: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Spécifique (Prix/Stock) */}
                  {shopType !== 'restaurant' && (
                    <div className="pt-4 border-t border-border/5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Prix d'Achat</Label>
                          <Input 
                            type="number"
                            className="h-10 bg-muted/5 border-border/10 rounded-[3px] text-[11px]" 
                            value={productForm.cost_price === 0 ? "" : productForm.cost_price}
                            onChange={e => setProductForm({...productForm, cost_price: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Prix de Vente</Label>
                          <Input 
                            type="number"
                            className="h-10 bg-muted/5 border-[var(--primary-accent)]/20 text-[var(--primary-accent)] font-black rounded-[3px] text-[12px]" 
                            value={productForm.price === 0 ? "" : productForm.price}
                            onChange={e => setProductForm({...productForm, price: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Quantité</Label>
                          <Input 
                            type="number"
                            className="h-10 bg-muted/5 border-border/10 rounded-[3px] text-[11px] font-bold" 
                            value={productForm.quantity === 0 ? "" : productForm.quantity}
                            onChange={e => setProductForm({...productForm, quantity: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Unité</Label>
                          <Input 
                            className="h-10 bg-muted/5 border-border/10 rounded-[3px] text-[11px]" 
                            value={productForm.unit}
                            onChange={e => setProductForm({...productForm, unit: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground/70">Seuil Alerte</Label>
                          <Input 
                            type="number"
                            className="h-10 bg-muted/5 border-border/10 rounded-[3px] text-[11px] text-orange-500" 
                            value={productForm.min_threshold === 0 ? "" : productForm.min_threshold}
                            onChange={e => setProductForm({...productForm, min_threshold: e.target.value === "" ? 0 : parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Métadonnées (Pharmacie) */}
                  {shopType === 'pharmacie' && (
                    <div className="p-3 bg-[var(--primary-accent)]/5 border border-[var(--primary-accent)]/10 rounded-[3px] grid grid-cols-2 gap-3">
                       <div className="space-y-2">
                          <Label className="text-[8px] uppercase font-black tracking-widest text-[var(--primary-accent)]/70">Numéro de Lot</Label>
                          <Input 
                            className="h-8 bg-background border-border/10 rounded-[3px] text-[10px]" 
                            value={JSON.parse(productForm.attributes).batch || ""}
                            onChange={e => {
                              const meta = JSON.parse(productForm.attributes);
                              meta.batch = e.target.value;
                              setProductForm({...productForm, attributes: JSON.stringify(meta)});
                            }}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[8px] uppercase font-black tracking-widest text-[var(--primary-accent)]/70">Expiration</Label>
                          <Input 
                            type="date"
                            className="h-8 bg-background border-border/10 rounded-[3px] text-[10px]" 
                            value={JSON.parse(productForm.attributes).expiry || ""}
                            onChange={e => {
                              const meta = JSON.parse(productForm.attributes);
                              meta.expiry = e.target.value;
                              setProductForm({...productForm, attributes: JSON.stringify(meta)});
                            }}
                          />
                       </div>
                    </div>
                  )}
               </div>

               {/* Modal Footer */}
               <div className="px-6 py-5 bg-muted/5 border-t border-border/10 flex gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 h-10 rounded-[3px] text-[10px] uppercase font-black tracking-widest hover:bg-muted/10"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSaveProduct} 
                    disabled={isSaving}
                    className="flex-[1.5] h-10 bg-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/80 text-white rounded-[3px] text-[10px] uppercase font-black tracking-widest gap-2 shadow-lg shadow-[var(--primary-accent)]/20 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} /> 
                    )}
                    {isSaving ? "Traitement..." : editingProduct ? "Enregistrer" : shopType === 'restaurant' ? "Ajouter le plat" : "Créer l'élément"}
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
