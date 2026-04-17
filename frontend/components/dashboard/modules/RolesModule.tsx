"use client";
import { API_URL } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { Shield, Key, Check, X, UserCheck, AlertTriangle, Lock, Unlock, Eye, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLES_DATA = [
  { id: "gerant",     name: "Gérant",      color: "var(--primary-accent)", desc: "Contrôle total du système, accès financier complet.",   users: 2 },
  { id: "comptable", name: "Comptable",   color: "var(--success)",         desc: "Accès financier, dépenses et rapports uniquement.",  users: 1 },
  { id: "caisse",    name: "Caisse",      color: "var(--info)",            desc: "Ventes, clôture de caisse et stock consultant.",      users: 3 },
  { id: "magasinier",name: "Magasinier", color: "var(--warning)",         desc: "Gestion des stocks et inventaire physique.",          users: 2 }
];

const PERMISSIONS = [
  { module: "Dashboard", rights: ["view_stats", "view_overview"] },
  { module: "Ventes", rights: ["create_sale", "view_history", "cancel_sale"] },
  { module: "Stocks", rights: ["view_stock", "edit_stock", "receive_stock"] },
  { module: "Finance", rights: ["view_balance", "edit_expenses", "view_reports"] },
  { module: "Personnel", rights: ["manage_users", "edit_roles"] },
];

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  caisse: ["create_sale", "view_history", "view_stock", "view_overview"],
  comptable: ["view_stats", "view_overview", "view_reports", "edit_expenses", "view_balance"],
  magasinier: ["view_stock", "edit_stock", "receive_stock", "view_overview"],
};

export function RolesModule() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"roles" | "users">("roles");
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const ROLES_BASE = [
    { id: "gerant",      name: "Gérant",      color: "var(--primary-accent)", desc: "Contrôle total du système, accès financier complet." },
    { id: "comptable",  name: "Comptable",    color: "var(--success)",         desc: "Accès financier, dépenses et rapports uniquement." },
    { id: "caisse",     name: "Caisse",       color: "var(--info)",            desc: "Ventes, clôture de caisse et stock consultant." },
    { id: "magasinier", name: "Magasinier",   color: "var(--warning)",         desc: "Gestion des stocks et inventaire physique." }
  ];

  const fetchUsers = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const res = await fetch(`${API_URL}/users/?company_id=${companyId}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users for roles", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (roleId: string) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const res = await fetch(`${API_URL}/roles/permissions?company_id=${companyId}&role=${roleId}`);
      const data = await res.json();
      
      const map: Record<string, boolean> = {};
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((p: any) => {
          map[p.permission] = p.is_enabled;
        });
      } else {
        // Fallback sur les permissions par défaut si rien en DB
        const defaults = DEFAULT_PERMISSIONS_BY_ROLE[roleId];
        if (defaults) {
          defaults.forEach(p => {
            map[p] = true;
          });
        }
      }
      setPermissionsMap(map);
    } catch (err) {
      console.error("Error fetching permissions", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const rolesWithCounts = ROLES_BASE.map(role => ({
    ...role,
    usersCount: users.filter(u => u.role === role.id).length
  }));

  useEffect(() => {
    if (rolesWithCounts.length > 0 && !selectedRole && viewMode === "roles") {
      setSelectedRole(rolesWithCounts[0]);
    }
  }, [rolesWithCounts, selectedRole, viewMode]);

  useEffect(() => {
    if (selectedRole) {
      fetchPermissions(selectedRole.id);
    }
  }, [selectedRole]);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    const roleObj = ROLES_BASE.find(r => r.id === user.role);
    if (roleObj) setSelectedRole(roleObj);
  };

  const handleTogglePermission = (module: string, right: string) => {
    if (selectedRole?.id === "gerant" || viewMode === "users") return; 
    setPermissionsMap(prev => ({
      ...prev,
      [right]: !prev[right]
    }));
  };

  const handleSavePermissions = async () => {
    if (viewMode === "users") return;
    setSaving(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      
      const permissionsList: any[] = [];
      PERMISSIONS.forEach(section => {
        section.rights.forEach(right => {
          permissionsList.push({
            module: section.module,
            permission: right,
            is_enabled: selectedRole.id === "gerant" ? true : (permissionsMap[right] || false)
          });
        });
      });

      await fetch(`${API_URL}/roles/permissions?company_id=${companyId}&role=${selectedRole.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissionsList),
      });
      
      alert("Permissions enregistrées avec succès !");
    } catch (err) {
      console.error("Error saving permissions", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!selectedRole && viewMode === "roles"))  return <div className="h-full flex items-center justify-center opacity-40 uppercase text-[10px] tracking-widest">Calcul des effectifs...</div>;
  
  return (
    <div className="flex h-full gap-8 p-6 animate-in fade-in duration-500 overflow-hidden">

      <div className="w-[300px] flex flex-col space-y-4">
        {/* VIEW MODE TOGGLE */}
        <div className="flex bg-muted/20 p-1 rounded-sm">
           <button 
             onClick={() => { setViewMode("roles"); setSelectedUser(null); }}
             className={cn("flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-[2px] transition-all", viewMode === "roles" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
           >
              Rôles
           </button>
           <button 
             onClick={() => setViewMode("users")}
             className={cn("flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-[2px] transition-all", viewMode === "users" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
           >
              Collaborateurs
           </button>
        </div>

        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
          {viewMode === "roles" ? "Groupes de Droits" : "Accès Individuels"}
        </h4>

        <div className="flex-1 flex flex-col space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {viewMode === "roles" ? (
            rolesWithCounts.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "p-4 rounded-[3px] border border-border/10 bg-background/20 text-left transition-all hover:bg-muted/5 group relative",
                  selectedRole?.id === role.id && "border-[var(--primary-accent)]/40 bg-[var(--primary-accent)]/5"
                )}
              >
                <div className="flex justify-between items-center mb-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color }} />
                   <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{role.usersCount} Utilisateurs</span>
                </div>
                <h5 className="text-[11px] font-black uppercase tracking-widest mb-1">{role.name}</h5>
                <p className="text-[9px] text-muted-foreground/60 leading-relaxed font-bold">{role.desc}</p>
              </button>
            ))
          ) : (
            users.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelectUser(member)}
                className={cn(
                  "p-3 rounded-[3px] border border-border/10 text-left transition-all hover:bg-muted/5 group relative flex items-center gap-3",
                  selectedUser?.id === member.id && "border-[var(--primary-accent)]/40 bg-[var(--primary-accent)]/5"
                )}
              >
                <div className="w-8 h-8 rounded-[2px] bg-muted/20 flex items-center justify-center text-[9px] font-bold uppercase shrink-0">
                   {member.name.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                   <h5 className="text-[10px] font-bold uppercase truncate">{member.name}</h5>
                   <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[7px] font-bold tracking-tighter uppercase px-1.5 py-0.5 rounded-[1px] bg-muted/30 text-muted-foreground">{member.role}</span>
                      {!member.is_active && <span className="text-[7px] font-bold text-orange-500 uppercase">Inactif</span>}
                   </div>
                </div>
              </button>
            ))
          )}
          
          {viewMode === "roles" && (
            <Button variant="ghost" className="w-full h-12 border-dashed border border-border/20 text-[9px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)]">
               + Nouveau Rôle
            </Button>
          )}
        </div>
      </div>

      {/* PERMISSIONS PANEL (Right) */}
      <div className="flex-1 flex flex-col bg-muted/10 border border-border/10 rounded-[3px] overflow-hidden">
         {!selectedRole ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 space-y-3">
               <UserCheck size={32} />
               <p className="text-[10px] uppercase font-bold tracking-widest">Sélectionner un collaborateur pour voir ses droits</p>
            </div>
         ) : (
            <>
              <div className="p-5 border-b border-border/10 bg-background/40 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[3px] flex items-center justify-center text-white" style={{ backgroundColor: selectedRole.color }}>
                        {viewMode === "users" ? <UserCheck size={16} /> : <Shield size={16} />}
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest">
                          {viewMode === "users" ? `Permissions de ${selectedUser?.name ?? "—"}` : `Permissions : ${selectedRole.name}`}
                        </h3>
                        <p className="text-[8px] text-muted-foreground/60 uppercase font-bold italic">
                          {viewMode === "users" ? `Accès hérités du groupe [${selectedRole.name}]` : `Identifiant système: #${selectedRole.id}`}
                        </p>
                    </div>
                  </div>
                  {viewMode === "roles" && (
                    <Button 
                        onClick={handleSavePermissions}
                        disabled={saving || selectedRole.id === "gerant"}
                        size="sm" 
                        className="h-8 bg-foreground text-background hover:bg-foreground/90 font-black text-[9px] uppercase tracking-widest px-4 rounded-[2px]"
                    >
                      {saving ? "Enregistrement..." : "Enregistrer les Droits"}
                    </Button>
                  )}
                  {viewMode === "users" && (
                    <div className="px-3 py-1 bg-muted/40 border border-border/10 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                       Mode Consultation
                    </div>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className={cn("space-y-8", viewMode === "users" && "opacity-80 pointer-events-none")}>
                    {PERMISSIONS.map((section) => (
                        <div key={section.module} className="space-y-4">
                          <div className="flex items-center gap-4">
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{section.module}</h4>
                              <div className="h-[1px] flex-1 bg-border/20" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {section.rights.map((right) => {
                                const isEnabled = selectedRole.id === "gerant" || !!permissionsMap[right];
                                return (
                                  <label 
                                    key={right} 
                                    onClick={() => handleTogglePermission(section.module, right)}
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-[3px] border transition-all cursor-pointer",
                                      isEnabled ? "bg-background border-[var(--primary-accent)]/20" : "bg-muted/10 border-border/10 opacity-70"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                        {isEnabled ? (
                                          <div className="text-[var(--success)]"><Unlock size={14} /></div>
                                        ) : (
                                          <div className="text-muted-foreground/40"><Lock size={14} /></div>
                                        )}
                                        <span className="text-[10px] font-bold text-foreground/80 lowercase italic opacity-80">{right}</span>
                                    </div>
                                    <input 
                                      type="checkbox" 
                                      checked={isEnabled}
                                      readOnly
                                      className="w-3 h-3 accent-[var(--primary-accent)] rounded-[2px]" 
                                    />
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                    ))}
                  </div>

                  {/* CAUTION SECTION */}
                  <div className="mt-10 p-5 border border-destructive/20 bg-destructive/5 rounded-[3px] flex items-start gap-4">
                    <div className="p-2 bg-destructive/10 text-destructive rounded-[3px]">
                        <AlertTriangle size={18} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase text-destructive tracking-widest">Zone de Danger</h4>
                        <p className="text-[9px] text-muted-foreground font-bold italic leading-relaxed">
                          {viewMode === "users" 
                            ? "Pour modifier ces permissions, veuillez basculer sur la vue 'Rôles' et administrer le groupe d'accès correspondant."
                            : "Modifier les permissions d'un rôle peut impacter l'accès immédiat de vos collaborateurs. Les gérants conservent toujours un accès root non-modifiable."
                          }
                        </p>
                        {viewMode === "roles" && (
                          <button className="text-[9px] text-destructive font-black uppercase tracking-widest flex items-center gap-2 pt-2 hover:underline">
                            Réinitialiser ce rôle <Trash2 size={12} />
                          </button>
                        )}
                    </div>
                  </div>
              </div>
            </>
         )}
      </div>
    </div>
  );
}
