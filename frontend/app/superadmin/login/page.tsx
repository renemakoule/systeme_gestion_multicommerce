"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  User,
  Loader2,
  ArrowRight,
  Server,
  Database,
  Activity,
} from "lucide-react";

export default function SuperAdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();

  // Rediriger si on est déjà connecté
  useEffect(() => {
    const token = localStorage.getItem("superadmin_token");
    if (token) {
      router.push("/superadmin");
    }

    // Check for session expiry
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired") === "true") {
        setSessionExpired(true);
      }
    }
  }, [router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/superadmin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("superadmin_token", data.access_token);
        localStorage.setItem("superadmin_user", JSON.stringify(data.user));
        router.push("/superadmin");
      } else {
        const err = await res.json();
        setError(err.detail || "Identifiants techniques invalides");
      }
    } catch (err) {
      setError("Erreur de connexion au Master Server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center p-6 text-white overflow-hidden font-mono relative">
      {/* Background Grid Accent */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, #333 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Dynamic Background decor - Sharper and static for premium feel */}
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-[-20%] left-[-15%] w-[65%] h-[65%] bg-red-600/10 rounded-full blur-[90px]" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[65%] h-[65%] bg-blue-600/10 rounded-full blur-[90px]" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3px] shadow-2xl space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[3px] flex items-center justify-center mx-auto mb-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-accent)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <ShieldCheck
                  size={36}
                  className="text-[var(--primary-accent)]"
                />
              </div>
              <div className="absolute -top-2 -right-2 bg-[var(--primary-accent)] text-black px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase">
                GAS
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-[0.4em]">
                Master Server
              </h1>
              <div className="flex items-center justify-center gap-4 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                <span className="flex items-center gap-1.5">
                  <Server size={10} /> Node-01
                </span>
                <span className="flex items-center gap-1.5">
                  <Database size={10} /> DB-Core
                </span>
                <span className="flex items-center gap-1.5 text-emerald-500/60">
                  <Activity size={10} /> Active
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--primary-accent)] transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="IDENTIFIANT RÉSEAU"
                  autoComplete="off"
                  className="w-full h-14 bg-white/5 border border-white/5 rounded-[3px] pl-12 pr-4 text-xs font-bold tracking-widest uppercase outline-none focus:border-[var(--primary-accent)]/30 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--primary-accent)] transition-colors"
                  size={16}
                />
                <input
                  type="password"
                  placeholder="CLEF DE SÉCURITÉ"
                  className="w-full h-14 bg-white/5 border border-white/5 rounded-[3px] pl-12 pr-4 text-xs font-bold tracking-widest uppercase outline-none focus:border-[var(--primary-accent)]/30 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <AnimatePresence>
              {(error || sessionExpired) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 border rounded-[3px] flex items-center gap-3 ${
                    sessionExpired 
                      ? "bg-amber-500/10 border-amber-500/20" 
                      : "bg-red-500/10 border-red-500/20"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    sessionExpired ? "bg-amber-500" : "bg-red-500"
                  }`} />
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${
                    sessionExpired ? "text-amber-500" : "text-red-500"
                  }`}>
                    {sessionExpired ? "Votre session a expiré. Veuillez vous reconnecter." : error}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-[3px] hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <span>Accéder à la Console</span>
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          {/* Warning Footer */}
          <div className="pt-4 text-center border-t border-white/5">
            <p className="text-[8px] font-bold text-zinc-600 leading-relaxed uppercase tracking-widest">
              Utilisation strictement réservée à l'équipe technique de
              développement.
              <br />
              Toutes les tentatives de connexion sont enregistrées.
            </p>
          </div>
        </motion.div>

        {/* --- FOOTER --- */}
        <footer className="absolute bottom-6 left-0 w-full z-50">
          <div className="relative w-full h-[1px] bg-white/10 overflow-hidden mb-4">
            <motion.div
              initial={{ left: "-20%" }}
              animate={{ left: "120%" }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 w-24 h-full bg-linear-to-r from-transparent via-[var(--primary-accent)] to-transparent"
            />
          </div>
          <div className="flex justify-center items-center px-4 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.4em] opacity-30">
              ©{new Date().getFullYear()}.CM | Powered By GAS
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
