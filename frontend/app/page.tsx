"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Cpu, ShieldCheck, Globe, Loader2 } from "lucide-react";

export default function WelcomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [year, setYear] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setYear(new Date().getFullYear().toString());
  }, []);

  const handleStartSystem = async () => {
    setIsLoading(true);
    // Simulation d'une initialisation système pour l'effet premium
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    // Détection de l'environnement Electron de production (file://)
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      window.location.href = "auth/login/index.html";
    } else {
      window.location.href = "/auth/login";
    }
  };

  return (
    // On remplace bg-zinc-950 par bg-background
    // On ajoute transition-colors pour un effet fluide lors du changement
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-background transition-colors duration-500">
      {/* --- STRUCTURE DES TRAITS RESPONSIVE --- */}
      {/* Utilisation de border-border (variable CSS) au lieu de zinc-900 */}
      <div className="absolute left-[5%] lg:left-[10%] top-0 h-full w-[1px] bg-border/40 overflow-hidden">
        <motion.div
          initial={{ top: "-20%" }}
          animate={{ top: "120%" }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "linear",
            delay: 1,
          }}
          className="absolute left-0 w-full h-24 bg-linear-to-b from-transparent via-[var(--primary-accent)] to-transparent"
        />
      </div>
      <div className="absolute right-[5%] lg:right-[10%] top-0 h-full w-[1px] bg-border/40 overflow-hidden">
        <motion.div
          initial={{ top: "-20%" }}
          animate={{ top: "120%" }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "linear",
            delay: 3,
          }}
          className="absolute left-0 w-full h-24 bg-linear-to-b from-transparent via-[var(--primary-accent)] to-transparent"
        />
      </div>
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border/40 overflow-hidden">
        <motion.div
          initial={{ left: "-20%" }}
          animate={{ left: "120%" }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 w-24 h-full bg-linear-to-r from-transparent via-[var(--primary-accent)] to-transparent"
        />
      </div>

      {/* --- CONTENU CENTRAL --- */}
      <div
        className="z-10 flex flex-col items-center text-center px-4"
        style={{
          animation: "fadeInUp 0.6s ease-out forwards",
        }}
      >
        <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.5em] text-muted-foreground mb-4">
          Core Engine
        </span>

        {/* text-foreground s'adapte automatiquement au noir ou blanc */}
        <h1 className="text-2xl sm:text-3xl font-light tracking-tighter text-foreground mb-2">
          Gestion
          <span className="font-bold text-muted-foreground/80">Expert</span>
        </h1>

        <p className="max-w-[240px] sm:max-w-[280px] text-[9px] sm:text-[10px] leading-relaxed text-muted-foreground mb-8 tracking-wide">
          Solution d'administration intelligente pour environnements commerciaux
          hybrides.
        </p>

        {/* Bouton utilisant les couleurs de thème */}
        <div className="no-drag-region">
          <button
            onClick={handleStartSystem}
            disabled={isLoading}
            className={`rounded-[4px] group relative flex items-center gap-3 border border-border bg-accent/20 px-4 sm:px-5 py-2 transition-all active:scale-95 ${
              isLoading
                ? "cursor-not-allowed opacity-70"
                : "hover:bg-foreground hover:text-background"
            }`}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-3"
                >
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-[10px] sm:text-[9px] font-bold uppercase tracking-widest">
                    Initialisation...
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-[10px] sm:text-[9px] font-bold uppercase tracking-widest">
                    Démarrer le système
                  </span>
                  <ArrowRight
                    size={12}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* --- FOOTER RESPONSIVE --- */}
      <footer className="absolute bottom-0 left-0 w-full">
        <div className="relative w-full h-[1px] bg-border/40 overflow-hidden">
          <motion.div
            initial={{ left: "-20%" }}
            animate={{ left: "120%" }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear",
              delay: 2,
            }}
            className="absolute top-0 w-24 h-full bg-linear-to-r from-transparent via-[var(--primary-accent)] to-transparent"
          />
        </div>
        <div className="flex justify-center items-center py-4 px-4 text-center">
          <p className="text-[7px] sm:text-[8px] uppercase tracking-[0.2em] sm:tracking-[0.4em] text-muted-foreground">
            ©{year || "2026"}.CM
            <span className="mx-2 sm:mx-4 text-border">|</span>Powered By GAS
          </p>
        </div>
      </footer>
    </div>
  );
}
