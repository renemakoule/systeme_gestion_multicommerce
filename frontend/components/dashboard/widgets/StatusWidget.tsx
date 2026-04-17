"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Clock, Server, CloudOff } from "lucide-react";
import { useDashboard } from "../DashboardContext";
import { cn } from "@/lib/utils";

export function StatusWidget() {
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<"online" | "offline">("online");

  const { refreshTrigger } = useDashboard();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    const checkServer = async () => {
       try {
          const res = await fetch(`${API_URL}/stats/overview?company_id=1`);
          setStatus(res.ok ? "online" : "offline");
       } catch {
          setStatus("offline");
       }
    };

    checkServer();
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkServer = async () => {
       try {
          const res = await fetch(`${API_URL}/stats/overview?company_id=1`);
          setStatus(res.ok ? "online" : "offline");
       } catch {
          setStatus("offline");
       }
    };
    checkServer();
  }, [refreshTrigger]);

  return (
    <div className="flex justify-between items-center bg-muted/20 p-3 rounded-[3px] border border-border/20">
      <div className="flex items-center gap-3">
        <Clock size={12} className="text-muted-foreground opacity-40" />
        <span className="text-[10px] font-bold uppercase tracking-widest">{time}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn(
           "w-1.5 h-1.5 rounded-full transition-all duration-500",
           status === "online" ? "bg-(--success) animate-pulse shadow-[0_0_8px_var(--success-pale)]" : "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]"
        )} />
        <span className={cn(
           "text-[8px] font-bold uppercase tracking-widest",
           status === "online" ? "text-(--success)" : "text-destructive"
        )}>
           {status === "online" ? "En ligne" : "Hors ligne"}
        </span>
      </div>
    </div>
  );
}
