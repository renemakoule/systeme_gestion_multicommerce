"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { ShoppingCart, Wallet, Package, User as UserIcon } from "lucide-react";
import { useDashboard } from "../DashboardContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function ActivityWidget() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshTrigger } = useDashboard();

  const fetchActivities = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const res = await fetch(`${API_URL}/stats/activity?company_id=${companyId}`);
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error("Error fetching activity logs", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const isInitial = activities.length === 0;
    fetchActivities(!isInitial);
  }, [refreshTrigger]);

  if (loading) {
     return <div className="p-4 text-center text-[10px] uppercase opacity-40">Chargement...</div>;
  }

  return (
    <div className="p-4 rounded-[3px] border border-border/20 bg-muted/10 space-y-4">
      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 flex justify-between items-center">
         Dernières Activités
         <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-accent)] animate-pulse" />
      </p>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-[9px] text-muted-foreground italic py-4 text-center">Aucune activité récente</p>
        ) : activities.map((act) => (
          <div key={act.id} className="flex gap-3 items-start border-b border-border/5 pb-2 last:border-0 last:pb-0 group">
            <div className="mt-1">
               {act.type === "sale" ? (
                  <ShoppingCart size={10} className="text-[var(--success)]" />
               ) : act.type === "stock" ? (
                  <Package size={10} className="text-[var(--info)]" />
               ) : (
                  <Wallet size={10} className="text-destructive" />
               )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[9px] font-bold leading-tight truncate group-hover:text-[var(--primary-accent)] transition-colors">{act.title}</p>
              <p className="text-[7px] text-muted-foreground uppercase">
                 {formatDistanceToNow(new Date(act.time), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
