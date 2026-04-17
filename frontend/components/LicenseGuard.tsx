"use client";

import React, { useEffect, useState } from "react";
import { useDashboard } from "./dashboard/DashboardContext";
import { API_URL } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  PhoneCall,
  Loader2,
  Lock,
  Mail,
  Clock,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";

interface LicenseInfo {
  status: "pending" | "active" | "locked";
  expiry: string | null;
  max_devices: number;
  is_device_authorized: boolean;
}

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>("");
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // 1. Gérer ou récupérer l'ID unique de l'appareil
    let id = localStorage.getItem("device_uuid");
    if (!id) {
      id =
        "dev-" +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      localStorage.setItem("device_uuid", id);
    }
    setDeviceId(id);

    // 2. Vérifier la licence
    const checkLicense = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        if (!userData.company_id) {
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API_URL}/companies/${userData.company_id}?device_id=${id}`,
        );
        if (res.ok) {
          const company = await res.json();

          // Logique de validation locale du device
          const devices = JSON.parse(company.device_uuids || "[]");
          const isAuthorized =
            devices.includes(id) || devices.length < company.max_devices;

          // Si pas encore autorisé mais qu'il reste de la place, on l'ajoute côté serveur (automatique pour le premier device)
          if (!devices.includes(id) && devices.length < company.max_devices) {
            // On pourrait faire un appel API ici pour enregistrer le device
            await fetch(`${API_URL}/companies/${userData.company_id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                device_uuids: JSON.stringify([...devices, id]),
              }),
            });
          }

          setLicense({
            status: company.license_status,
            expiry: company.license_expiry,
            max_devices: company.max_devices,
            is_device_authorized: isAuthorized || devices.includes(id),
          });
        }
      } catch (err) {
        console.error("License check failed", err);
      } finally {
        setLoading(false);
      }
    };

    checkLicense();

    // --- WEBSOCKET REAL-TIME (New) ---
    const ws = new WebSocket(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        window.location.hostname
      }:8001/ws`,
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const userData = JSON.parse(localStorage.getItem("user") || "{}");

        if (
          data.type === "LICENSE_UPDATED" &&
          Number(data.company_id) === Number(userData.company_id)
        ) {
          console.log("WebSocket event received: LICENSE_UPDATED for this company");
          if (data.status === "active") {
            setShowWelcome(true);
            // On attend que l'animation de bienvenue se joue avant de rafraîchir
            setTimeout(() => {
              checkLicense();
              setShowWelcome(false);
            }, 3000);
          } else {
            checkLicense();
          }
        }
      } catch (e) {}
    };

    // Re-tenter toutes les 30 minutes (fallback)
    const interval = setInterval(checkLicense, 30 * 60 * 1000);
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2
          className="animate-spin text-[var(--primary-accent)]"
          size={30}
        />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">
          Vérification de la licence...
        </span>
      </div>
    );
  }

  // Si pas de licence trouvée (ex: pas connecté), on laisse passer
  if (!license) return <>{children}</>;

  const isExpired = license.expiry && new Date(license.expiry) < new Date();
  const isLocked = license.status === "locked" || isExpired;
  const isPending = license.status === "pending";
  const isMaxDevices = !license.is_device_authorized;

  if (isPending || isLocked || isMaxDevices) {
    return (
      <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center p-6 text-white overflow-hidden relative">
        {/* Background Decor - Sharper and static for premium feel */}
        <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-red-600/20 rounded-full blur-[90px]" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[90px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[3px] shadow-2xl text-center space-y-6 z-10"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-[3px] bg-white/5 border border-white/10 flex items-center justify-center">
              {showWelcome ? (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-500"
                  >
                    <CheckCircle size={32} />
                  </motion.div>
                </div>
              ) : isPending ? (
                <Clock className="text-amber-400" size={32} />
              ) : isMaxDevices ? (
                <Smartphone className="text-orange-400" size={32} />
              ) : (
                <ShieldAlert className="text-red-500" size={32} />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">
              {showWelcome
                ? "Licence Activée !"
                : isPending
                  ? "Validation en cours"
                  : isMaxDevices
                    ? "Limite d'appareils atteinte"
                    : "Système Verrouillé"}
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed px-4">
              {showWelcome
                ? "Félicitations ! Votre accès a été validé. Bienvenue sur votre plateforme de gestion GAS. Préparation de votre espace..."
                : isPending
                  ? "Votre inscription a bien été reçue. Un technicien doit valider votre compte avant que vous ne puissiez accéder au tableau de bord."
                  : isMaxDevices
                    ? `Votre abonnement actuel est limité à ${license.max_devices} appareil(s). Cette machine n'est pas autorisée.`
                    : isExpired
                      ? "Votre période d'abonnement est arrivée à expiration. Veuillez renouveler votre licence pour continuer."
                      : "Votre accès a été suspendu par l'équipe technique. Veuillez les contacter pour plus d'informations."}
            </p>
          </div>

          <div className="pt-4 space-y-4">
            <div className="p-5 bg-white/5 rounded-[3px] border border-white/5 space-y-5">
              <div className="text-center">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
                  Assistance Technique
                </span>
              </div>

              <div className="space-y-3">
                {/* Phone */}
                <div className="flex items-center justify-center gap-3 text-sm font-black text-[var(--primary-accent)]">
                  <PhoneCall size={16} />
                  <span className="tracking-widest underline decoration-2 underline-offset-4">
                    +237 690 67 53 09
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-zinc-300">
                  <Mail size={14} className="text-zinc-500" />
                  <span className="tracking-widest opacity-80 lowercase">
                    globals.all.services@gmail.com
                  </span>
                </div>
              </div>

              <div className="h-[1px] w-full bg-white/5 mx-auto" />

              {/* Socials - SVGs officiels pour un rendu premium et sans erreurs */}
              <div className="flex items-center justify-center gap-6 pt-1">
                {[
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    ),
                    color: "hover:text-[#1877F2]",
                    label: "Facebook",
                    href: "https://facebook.com",
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    ),
                    color: "hover:text-[#E4405F]",
                    label: "Instagram",
                    href: "https://instagram.com",
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
                      </svg>
                    ),
                    color: "hover:text-[#0A66C2]",
                    label: "LinkedIn",
                    href: "https://linkedin.com",
                  },
                  {
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14Z" />
                      </svg>
                    ),
                    color: "hover:text-white",
                    label: "TikTok",
                    href: "https://tiktok.com",
                  },
                ].map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-zinc-500 transition-all transform hover:scale-110 ${social.color}`}
                    title={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-[3px] hover:bg-zinc-200 transition-colors"
            >
              Actualiser le statut
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                window.location.href = "/auth/login";
              }}
              className="text-[9px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity underline underline-offset-4"
            >
              Se déconnecter
            </button>
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
    );
  }

  return <>{children}</>;
}
