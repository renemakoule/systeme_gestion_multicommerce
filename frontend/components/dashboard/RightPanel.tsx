"use client";

import React from "react";
import { Info, ChevronRight } from "lucide-react";
import { Role, ShopType } from "@/lib/dashboard-config";
import { StatusWidget } from "./widgets/StatusWidget";
import { PerformanceWidget } from "./widgets/PerformanceWidget";
import { ActivityWidget } from "./widgets/ActivityWidget";
import { cn } from "@/lib/utils";

interface RightPanelProps {
  role: Role;
  shopType: ShopType;
}

export function RightPanel({ role, shopType }: RightPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background/30 p-5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto custom-scrollbar">
      {/* STATUS & TIME */}
      <StatusWidget />

      {/* DYNAMIC WIDGETS SECTION */}
      <div className="space-y-6">
        <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 border-b border-border/10 pb-2">
          Indicateurs Clés
        </h4>

        {/* Modular Performance Widget */}
        <PerformanceWidget role={role} />

        {/* Modular Activity Feed */}
        <ActivityWidget />
      </div>

      {/* QUICK ACTIONS & HELP */}
      <div className="mt-auto space-y-4 border-t border-border/10 pt-6">
        <button className="w-full flex items-center justify-between p-3 rounded-[3px] border border-border/20 bg-background hover:bg-accent/20 transition-all group">
          <div className="flex items-center gap-3">
            <Info
              size={12}
              className="text-muted-foreground group-hover:text-[var(--primary-accent)]"
            />
            <span className="text-[8px] font-bold uppercase tracking-widest">
              Centre d'Aide & Tutoriels
            </span>
          </div>
          <ChevronRight size={10} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
