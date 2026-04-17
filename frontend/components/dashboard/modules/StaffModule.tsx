"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { UserPlus, UserCheck, Shield, Mail, Phone, Calendar, MoreVertical, Trash2, X, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboard } from "../DashboardContext";

export function StaffModule() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { refreshTrigger } = useDashboard();

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    username: "",
    password_hash: "",
    role: "caisse"
  });

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const res = await fetch(`${API_URL}/users/?company_id=${companyId}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const isInitial = users.length === 0;
    fetchUsers(!isInitial);
  }, [refreshTrigger]);

  const handleOpenAdd = () => {
    setFormData({ id: null, name: "", username: "", password_hash: "", role: "caisse" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setFormData({ ...user, password_hash: "" }); // Ne pas pré-remplir le password hash
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      
      const url = isEditing ? `${API_URL}/users/${formData.id}` : `${API_URL}/users/`;
      const method = isEditing ? "PUT" : "POST";
      
      const payload = isEditing 
        ? { name: formData.name, username: formData.username, role: formData.role, password_hash: formData.password_hash || undefined } 
        : { ...formData, company_id: companyId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      console.error("Error saving user", err);
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await fetch(`${API_URL}/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      fetchUsers();
    } catch (err) {
      console.error("Error toggling status", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce membre du personnel ?")) return;
    try {
      await fetch(`${API_URL}/users/${id}`, { method: "DELETE" });
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user", err);
    }
  };

  return (
    <div className="h-full space-y-6 flex flex-col animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center bg-muted/10 p-4 rounded-[3px] border border-border/10">
        <div className="flex flex-col">
            <h2 className="text-[11px] font-bold uppercase tracking-widest">Équipe & Personnel</h2>
            <p className="text-[8px] text-muted-foreground/60 uppercase tracking-tighter">Gérez les accès et les rôles de vos collaborateurs</p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          size="sm" 
          className="h-8 gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-[3px]"
        >
          <UserPlus size={12} /> <span className="text-[10px] font-bold uppercase tracking-widest">Ajouter un Membre</span>
        </Button>
      </div>

      {/* STAFF CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
           <div className="col-span-full pt-10 text-center text-[10px] uppercase opacity-40 tracking-[0.4em]">Chargement des membres...</div>
        ) : users.map((member) => (
          <div key={member.id} className={cn(
            "p-4 rounded-[3px] border transition-all group relative overflow-hidden",
            member.is_active ? "bg-background border-border/20 hover:border-[var(--primary-accent)]/30" : "bg-muted/5 border-border/10 opacity-60"
          )}>
             
             <div className={cn(
                "absolute top-0 right-0 px-2 py-0.5 text-[7px] font-bold uppercase tracking-tighter rounded-bl-[3px]",
                member.is_active ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--warning)]/10 text-[var(--warning)]"
             )}>
                {member.is_active ? "actif" : "inactif"}
             </div>

             <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-[3px] bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-[var(--primary-accent-pale)] group-hover:text-[var(--primary-accent)] transition-colors font-bold uppercase tracking-tighter">
                   {member.name.substring(0, 2)}
                </div>
                <div className="flex flex-col">
                   <h4 className="text-[11px] font-bold text-foreground/80 leading-tight">{member.name}</h4>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Shield size={10} className="text-[var(--primary-accent)]" />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">{member.role}</span>
                   </div>
                </div>
             </div>

             <div className="space-y-1 mb-4 border-l-2 border-border/10 pl-3">
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80">
                   <span className="opacity-40 uppercase font-bold">Pseudo:</span>
                   <span>{member.username}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80">
                   <span className="opacity-40 uppercase font-bold">Matricule:</span>
                   <span className="font-mono">{member.role.substring(0, 2).toUpperCase()}_{member.id.toString().padStart(3, '0')}</span>
                </div>
             </div>

             <div className="flex gap-2 pt-3 border-t border-border/10">
                <Button 
                  onClick={() => handleOpenEdit(member)}
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 h-7 text-[8px] font-bold uppercase hover:bg-muted/50 border border-border/10 rounded-[3px]"
                >
                   Modifier
                </Button>
                
                <button 
                  onClick={() => handleToggleStatus(member)}
                  title={member.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                  className={cn(
                    "px-2 rounded-[3px] transition-colors border border-border/10",
                    member.is_active ? "text-[var(--warning)]/60 hover:text-[var(--warning)] hover:bg-[var(--warning)]/5" : "text-[var(--success)]/60 hover:text-[var(--success)] hover:bg-[var(--success)]/5 shadow-[inset_0_0_10px_var(--success-pale)]"
                  )}
                >
                   {member.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>

                <button 
                  onClick={() => handleDelete(member.id)}
                  className="px-2 rounded-[3px] hover:bg-destructive/10 text-destructive/40 hover:text-destructive transition-colors border border-border/10"
                >
                   <Trash2 size={12} />
                </button>
             </div>
          </div>
        ))}
      </div>

       {/* ADD/EDIT STAFF MODAL */}
       <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-sm bg-background border border-border/20 p-6 rounded-[3px] shadow-2xl space-y-5"
            >
               <div className="flex justify-between items-center pb-3 border-b border-border/10">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">
                    {isEditing ? "Modifier Collaborateur" : "Nouveau Collaborateur"}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">Nom Complet</Label>
                    <Input 
                      className="h-8 rounded-[3px] text-xs" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground">Matricule / Connexion</Label>
                  <Input
                    className="h-8 rounded-[3px] text-xs"
                    placeholder="Ex: caisse_01"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                    {isEditing ? "Nouveau Mot de passe (Laisser vide pour ne pas changer)" : "Mot de passe initial"}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="h-8 rounded-[3px] text-xs pr-10"
                      placeholder={isEditing ? "Inchangé" : "••••••••"}
                      value={formData.password_hash}
                      onChange={(e) => setFormData({...formData, password_hash: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground">Rôle / Accès</Label>
                  <select 
                    className="w-full h-8 bg-muted/20 border border-border/20 rounded-[3px] px-2 text-xs text-foreground outline-none focus:border-[var(--primary-accent)]"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                     <option value="caisse">Caissier</option>
                     <option value="magasinier">Magasinier</option>
                     <option value="comptable">Comptable</option>
                     <option value="gerant">Gérant</option>
                  </select>
                </div>
               </div>

               <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-8 rounded-[3px] text-[10px] uppercase font-bold">Annuler</Button>
                  <Button onClick={handleSubmit} className="flex-1 h-8 bg-foreground text-background hover:bg-foreground/90 rounded-[3px] text-[10px] uppercase font-bold gap-2">
                    <Check size={14} /> {isEditing ? "Enregistrer" : "Ajouter"}
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
