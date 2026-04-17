"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  CheckCircle,
  XSquare,
  ExternalLink,
  ChevronRight,
  Monitor,
  Calendar,
  Lock,
  Loader2,
  Star,
  Send,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  Bell,
  X,
  Volume2,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

export default function SuperAdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Formulaire d'activation
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [duration, setDuration] = useState(30);
  const [maxDevices, setMaxDevices] = useState(1);
  const [ratingEnabled, setRatingEnabled] = useState(false);
  const [ratingInterval, setRatingInterval] = useState("monthly");
  const [utcOffset, setUtcOffset] = useState(1);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // --- BROADCAST CENTER ---
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTargetId, setBroadcastTargetId] = useState<number | null>(
    null,
  ); // null = All
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastImage, setBroadcastImage] = useState<string | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [msgToDelete, setMsgToDelete] = useState<number | null>(null);

  // --- NOTIFICATIONS CENTER ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    // Request Push Permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const token = localStorage.getItem("superadmin_token");
    const userStr = localStorage.getItem("superadmin_user");

    if (!token) {
      router.push("/superadmin/login");
    } else {
      setIsAuthorized(true);
      if (userStr) setAdminUser(JSON.parse(userStr));
      fetchClients(token);
      fetchNotifications(token);

      // --- WEBSOCKET REAL-TIME (Improved with Auto-reconnect) ---
      let ws: WebSocket;
      let reconnectInterval: any;

      const connectWS = () => {
        ws = new WebSocket(
          `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
            window.location.hostname
          }:8001/ws`,
        );

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === "NEW_CLIENT" || data.type === "NEW_RATING") {
              fetchClients(token);
              fetchNotifications(token);
              
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              audio.play().catch(() => {});

              const isNotActive = document.hidden || !document.hasFocus();
              if (isNotActive && Notification.permission === "granted") {
                const title = data.type === "NEW_CLIENT" ? "Nouveau Client 🚀" : "Nouvel Avis Client ⭐";
                const body = data.type === "NEW_CLIENT" 
                  ? `L'entreprise ${data.company.name} vient de s'inscrire.` 
                  : `${data.company_name} a donné une note de ${data.stars}/5.`;
                
                new Notification(title, { 
                  body, 
                  icon: "/favicon.ico",
                  badge: "/favicon.ico",
                  tag: data.type // Évite d'empiler trop de notifs du même type
                });
              }

              setMessage({
                text: data.type === "NEW_CLIENT" 
                  ? `NOUVELLE INSCRIPTION : ${data.company.name}` 
                  : `AVIS REÇU : ${data.company_name} (${data.stars}/5 ⭐)`,
                type: "success",
              });
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          console.log("WebSocket closed, attempting reconnect...");
          reconnectInterval = setTimeout(connectWS, 3000); // Reconnect after 3s
        };

        ws.onerror = () => ws.close();
      };

      connectWS();

      return () => {
        if (ws) ws.close();
        if (reconnectInterval) clearTimeout(reconnectInterval);
      };
    }
  }, [router]);

  const fetchClients = async (token?: string) => {
    const activeToken = token || localStorage.getItem("superadmin_token");
    if (!activeToken) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/superadmin/clients/`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        setClients(await res.json());
      } else if (res.status === 401) {
        handleLogout(true);
      }
    } catch (err) {
      setMessage({ text: "Erreur de connexion serveur", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (token?: string) => {
    const activeToken = token || localStorage.getItem("superadmin_token");
    if (!activeToken) return;
    try {
      const res = await fetch(`${API_URL}/superadmin/notifications`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch (err) {}
  };

  const handleMarkRead = async (id: number) => {
    const token = localStorage.getItem("superadmin_token");
    try {
      const res = await fetch(
        `${API_URL}/superadmin/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) fetchNotifications(token!);
    } catch (err) {}
  };

  const handleDeleteNotification = async (id: number) => {
    const token = localStorage.getItem("superadmin_token");
    try {
      const res = await fetch(`${API_URL}/superadmin/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchNotifications(token!);
    } catch (err) {}
  };

  const handleLogout = (expired = false) => {
    localStorage.removeItem("superadmin_token");
    localStorage.removeItem("superadmin_user");
    router.push(`/superadmin/login${expired ? "?expired=true" : ""}`);
  };

  const handleActivate = async () => {
    if (!selectedClientId) return;
    const token = localStorage.getItem("superadmin_token");
    setConfirmLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/superadmin/clients/${selectedClientId}/activate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            duration_days: duration,
            max_devices: maxDevices,
            rating_prompt_enabled: ratingEnabled,
            rating_prompt_interval: ratingInterval,
            utc_offset: utcOffset,
          }),
        },
      );
      if (res.ok) {
        setMessage({
          text: "Licence mise à jour avec succès",
          type: "success",
        });
        setSelectedClientId(null);
        fetchClients();
      }
    } catch (err) {
      setMessage({ text: "Erreur lors de l'activation", type: "error" });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleBlock = async (id: number) => {
    if (!confirm("Voulez-vous vraiment bloquer l'accès à ce client ?")) return;
    try {
      const token = localStorage.getItem("superadmin_token");
      const res = await fetch(`${API_URL}/superadmin/clients/${id}/block`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchClients();
    } catch (err) {
      console.error("Failed to block client:", err);
    }
  };

  const fetchMessages = async () => {
    const token = localStorage.getItem("superadmin_token");
    try {
      const res = await fetch(`${API_URL}/superadmin/broadcast/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSentMessages(await res.json());
    } catch (err) {}
  };

  useEffect(() => {
    if (isAuthorized) fetchMessages();
  }, [isAuthorized]);

  const handleSendSatisfaction = async (clientId: number | null) => {
    const token = localStorage.getItem("superadmin_token");
    setBroadcastLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/superadmin/broadcast/satisfaction${clientId ? `?company_id=${clientId}` : ""}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        setMessage({
          text: "Demande de satisfaction envoyée",
          type: "success",
        });
        setShowBroadcastModal(false);
      }
    } catch (err) {
      setMessage({ text: "Erreur d'envoi", type: "error" });
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!broadcastTitle || !broadcastContent) return;
    const token = localStorage.getItem("superadmin_token");
    setBroadcastLoading(true);
    try {
      const res = await fetch(`${API_URL}/superadmin/broadcast/message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_id: broadcastTargetId,
          title: broadcastTitle,
          content: broadcastContent,
          image_base64: broadcastImage,
        }),
      });
      if (res.ok) {
        setMessage({ text: "Message envoyé avec succès", type: "success" });
        setBroadcastTitle("");
        setBroadcastContent("");
        setBroadcastImage(null);
        setShowBroadcastModal(false);
        fetchMessages();
      }
    } catch (err) {
      setMessage({ text: "Erreur d'envoi du message", type: "error" });
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm("Voulez-vous supprimer ce message ?")) return;

    const token = localStorage.getItem("superadmin_token");
    try {
      const res = await fetch(`${API_URL}/superadmin/broadcast/message/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchMessages();
        setMessage({ text: "Message supprimé avec succès", type: "success" });
      } else {
        setMessage({ text: "Erreur lors de la suppression", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Erreur réseau lors de la suppression", type: "error" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBroadcastImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!isAuthorized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 p-6 text-white font-mono">
        <Loader2
          className="animate-spin text-[var(--primary-accent)]"
          size={32}
        />
      </div>
    );
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-zinc-900/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--primary-accent)] text-white rounded-lg flex items-center justify-center font-black italic">
            G
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight">
              Master Server
            </span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
              GAS Technical Panel v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-800/50 rounded-full border border-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
              Status: Online
            </span>
          </div>

          <div className="h-8 w-px bg-white/5 mx-2" />

          {/* Notification Center */}
          <button
            onClick={() => setShowNotifPanel(true)}
            className="relative p-2 hover:bg-white/5 rounded-[3px] transition-colors group"
          >
            <Bell size={18} className="text-zinc-400 group-hover:text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[8px] font-black italic rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-lg">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setBroadcastTargetId(null);
              setShowBroadcastModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[3px] border border-white/5 transition-colors"
          >
            <Send size={14} className="text-[var(--primary-accent)]" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Broadcast Global
            </span>
          </button>

          <button
            onClick={() => handleLogout()}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <XSquare size={18} className="text-zinc-400 hover:text-red-400" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Total Clients",
              val: clients.length,
              icon: Users,
              color: "blue",
            },
            {
              label: "En Attente",
              val: clients.filter((c) => c.license_status === "pending").length,
              icon: Clock,
              color: "amber",
            },
            {
              label: "Actifs",
              val: clients.filter((c) => c.license_status === "active").length,
              icon: CheckCircle,
              color: "emerald",
            },
            {
              label: "Bloqués",
              val: clients.filter((c) => c.license_status === "locked").length,
              icon: ShieldAlert,
              color: "red",
            },
          ].map((st, i) => (
            <div
              key={i}
              className="bg-zinc-900/50 border border-white/5 p-4 rounded-[3px] flex items-center justify-between shadow-sm"
            >
              <div className="space-y-1">
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  {st.label}
                </p>
                <p className="text-xl font-black">{st.val}</p>
              </div>
              <div
                className={`w-8 h-8 rounded-[3px] bg-${st.color}-500/10 flex items-center justify-center text-${st.color}-500 border border-${st.color}-500/20`}
              >
                <st.icon size={16} />
              </div>
            </div>
          ))}
        </div>

        {/* Table Search */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            size={14}
          />
          <input
            placeholder="RECHERCHER UN ÉTABLISSEMENT..."
            className="w-full h-10 bg-zinc-900/50 border border-white/5 rounded-[3px] pl-10 pr-4 text-[10px] font-bold tracking-widest uppercase outline-none focus:border-white/10 transition-all font-mono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Clients Table */}
        <div className="flex-1 overflow-y-auto rounded-[3px] border border-white/5 bg-zinc-900/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-900/50 sticky top-0 z-10">
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  ID
                </th>
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Créé le
                </th>
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Statut Licence
                </th>
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Expiration
                </th>
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Caisses
                </th>
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Satisfaction
                </th>
                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-3 text-[10px] font-mono text-zinc-500 italic">
                    #{c.id}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {c.name}
                      </span>
                      <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest italic opacity-60">
                        {c.type} / {c.phone || "---"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[10px] text-zinc-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-[3px] text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1.5
                      ${c.license_status === "active" ? "bg-emerald-500/10 text-emerald-500" : c.license_status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${c.license_status === "active" ? "bg-emerald-500" : c.license_status === "pending" ? "bg-amber-500" : "bg-red-500"}`}
                      />
                      {c.license_status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[10px] font-bold">
                    {c.license_expiry
                      ? new Date(c.license_expiry).toLocaleDateString()
                      : "---"}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Monitor size={12} className="opacity-40" />
                      <span className="text-[10px] font-black">
                        MAX {c.max_devices}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={10}
                          className={
                            star <= (c.rating || 0)
                              ? "text-amber-500 fill-amber-500"
                              : "text-zinc-800"
                          }
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedClientId(c.id)}
                        className="p-1.5 bg-white text-black rounded-[3px] hover:scale-110 transition-transform shadow-lg"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setBroadcastTargetId(c.id);
                          setShowBroadcastModal(true);
                        }}
                        className="p-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-[3px] hover:bg-blue-500 hover:text-white transition-all"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => handleBlock(c.id)}
                        className="p-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[3px] hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Lock size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Activation Modal */}
      <AnimatePresence>
        {selectedClientId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[3px] p-8 shadow-2xl relative"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-[0.2em]">
                      Activation
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      Configuration de la boutique #{selectedClientId}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const client = clients.find(c => c.id === selectedClientId);
                      if (client) {
                        setUtcOffset(client.utc_offset || 1);
                        setDuration(30);
                        setMaxDevices(client.max_devices || 1);
                        setRatingEnabled(client.rating_prompt_enabled || false);
                        setRatingInterval(client.rating_prompt_interval || "monthly");
                      }
                      setSelectedClientId(null);
                    }}
                    className="p-2 hover:bg-white/5 rounded-[3px]"
                  >
                    <XSquare size={16} />
                  </button>
                </div>
                {/* Form Content (Duration, Max Devices, Rating) */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Durée de Licence
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full h-10 bg-zinc-800 border border-white/5 rounded-[3px] px-4 text-[10px] font-black uppercase outline-none"
                    >
                      <option value={5}>5 Jours (Test)</option>
                      <option value={14}>2 semaines (Test)</option>
                      <option value={30}>30 Jours (1 Mois)</option>
                      <option value={90}>3 Mois</option>
                      <option value={180}>6 Mois</option>
                      <option value={365}>1 An</option>
                      <option value={3650}>Illimité</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Nombre de Caisses Max
                    </label>
                    <div className="flex items-center gap-4">
                      {[1, 2, 3, 5, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setMaxDevices(n)}
                          className={`flex-1 h-10 rounded-[3px] text-[10px] font-black transition-all border ${maxDevices === n ? "bg-white text-black border-white shadow-lg" : "bg-transparent border-white/10 hover:border-white/30"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                      Fuseau Horaire (UTC Offset)
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-zinc-500" />
                      <select
                        value={utcOffset}
                        onChange={(e) => setUtcOffset(parseInt(e.target.value))}
                        className="flex-1 h-10 bg-zinc-800 border border-white/5 rounded-[3px] px-4 text-[10px] font-black uppercase outline-none focus:border-[var(--primary-accent)]/40"
                      >
                        {Array.from({ length: 25 }, (_, i) => i - 12).map((off) => (
                          <option key={off} value={off}>
                            UTC {off >= 0 ? `+${off}` : off} 
                            {off === 1 ? " (Afrique Centrale/Paris)" : ""}
                            {off === 0 ? " (GMT/UTC)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        Module Satisfaction
                      </label>
                      <button
                        onClick={() => setRatingEnabled(!ratingEnabled)}
                        className={`px-3 py-1 rounded-[3px] text-[8px] font-black uppercase tracking-widest transition-all ${ratingEnabled ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-white/5"}`}
                      >
                        {ratingEnabled ? "Activé" : "Désactivé"}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  disabled={confirmLoading}
                  onClick={handleActivate}
                  className="w-full h-12 bg-[var(--primary-accent)] text-white font-black uppercase tracking-widest text-[10px] rounded-[3px] shadow-xl shadow-[var(--primary-accent)]/20 flex items-center justify-center gap-3"
                >
                  {confirmLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Confirmer & Débloquer <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl w-full bg-zinc-900 border border-white/10 rounded-[3px] flex h-[600px] shadow-2xl overflow-hidden"
            >
              <div className="flex-1 p-8 border-r border-white/5 flex flex-col space-y-6 overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase tracking-[0.2em]">
                      Broadcast
                    </h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      Destination :{" "}
                      {broadcastTargetId
                        ? `Client #${broadcastTargetId}`
                        : "TOUS LES CLIENTS"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSendSatisfaction(broadcastTargetId)}
                    disabled={broadcastLoading}
                    className="h-24 rounded-[3px] border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <Star
                      size={20}
                      className="text-amber-500 group-hover:scale-110 transition-transform"
                    />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Demander Avis
                    </span>
                  </button>
                  <div className="h-24 rounded-[3px] border border-zinc-800 bg-zinc-800/20 flex flex-col items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                    <Clock size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      Autre Action
                    </span>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Envoyer un Message
                  </p>
                  <input
                    placeholder="TITRE DU MESSAGE"
                    className="w-full h-10 bg-zinc-800 border border-white/5 rounded-[3px] px-4 text-[10px] font-black uppercase outline-none focus:border-white/20"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                  />
                  <textarea
                    placeholder="CONTENU DU MESSAGE SOURCE..."
                    className="w-full h-32 bg-zinc-800 border border-white/5 rounded-[3px] p-4 text-[10px] font-bold uppercase outline-none focus:border-white/20 resize-none"
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                  />
                  <div className="flex gap-4">
                    <label className="flex-1 h-10 bg-zinc-800 border border-white/5 hover:border-white/20 rounded-[3px] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <ImageIcon size={14} className="text-zinc-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        Initialiser Image
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                    {broadcastImage && (
                      <div className="relative w-10 h-10 rounded-[3px] overflow-hidden border border-white/10 shrink-0">
                        <img
                          src={broadcastImage}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setBroadcastImage(null)}
                          className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                        >
                          <XSquare size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={
                      broadcastLoading || !broadcastTitle || !broadcastContent
                    }
                    className="w-full h-12 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-[3px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-50"
                  >
                    {broadcastLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        Envoyer le Message <Send size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="w-[300px] bg-zinc-950 p-8 flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Historique
                  </h4>
                  <button
                    onClick={() => setShowBroadcastModal(false)}
                    className="text-zinc-600 hover:text-white transition-colors"
                  >
                    <XSquare size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {sentMessages.length === 0 ? (
                    <p className="text-[9px] text-zinc-800 italic text-center pt-20 font-black uppercase tracking-widest">
                      Aucun message
                    </p>
                  ) : (
                    sentMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 bg-zinc-900 border border-white/5 rounded-[3px] space-y-2 group"
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-[10px] font-black text-[var(--primary-accent)] truncate uppercase">
                            {msg.title}
                          </p>
                          {msgToDelete === msg.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="px-2 py-0.5 bg-red-500 text-white text-[7px] font-black uppercase rounded-[2px] animate-pulse"
                              >
                                OUI
                              </button>
                              <button
                                onClick={() => setMsgToDelete(null)}
                                className="p-1 text-zinc-500 hover:text-white transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-500 line-clamp-2 leading-relaxed uppercase font-bold text-[8px]">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[7px] text-zinc-700 font-bold uppercase tracking-widest italic">
                            {new Date(msg.created_at).toLocaleDateString()}
                          </span>
                          <span
                            className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-[2px] ${msg.company_id ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500 font-black"}`}
                          >
                            {msg.company_id ? "Direct" : "Global"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Panel (Sliding Overlay) */}
      <AnimatePresence>
        {showNotifPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifPanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
            />
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="fixed right-0 top-0 bottom-0 w-[350px] bg-zinc-900 border-l border-white/5 shadow-2xl z-[151] flex flex-col"
            >
              <div className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-[var(--primary-accent)]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                    Flux Technique
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifPanel(false)}
                  className="p-2 hover:bg-white/5 rounded-[3px] text-zinc-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-20">
                    <Volume2 size={32} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                      Aucune Alerte
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-[3px] border relative group transition-all ${notif.is_read ? "bg-zinc-900/50 border-white/5 opacity-60 grayscale-[0.5]" : "bg-zinc-800 border-[var(--primary-accent)]/20 shadow-lg shadow-black/20"}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[2px] ${notif.type === "NEW_CLIENT" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}
                        >
                          {notif.type === "NEW_CLIENT"
                            ? "Inscription"
                            : "Avis Client"}
                        </span>
                        <div className="flex items-center gap-1">
                          {!notif.is_read && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="p-1 hover:bg-white/10 rounded text-emerald-500 transition-colors"
                              title="Marquer lu"
                            >
                              <CheckCircle size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notif.id)}
                            className="p-1 hover:bg-red-500/10 rounded text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest mb-1">
                        {notif.title}
                      </h5>
                      <p className="text-[9px] text-zinc-400 font-bold leading-relaxed italic">
                        {notif.content}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <span className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                        <ChevronRight size={10} className="text-zinc-700" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Master Notifications (Toast) */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            onClick={() => setMessage(null)}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-[3px] shadow-2xl flex items-center gap-3 cursor-pointer z-[200] border-2 ${message.type === "success" ? "bg-zinc-900 border-emerald-500 text-emerald-500" : "bg-zinc-900 border-red-500 text-red-500"}`}
          >
            {message.type === "success" ? (
              <CheckCircle size={20} className="animate-pulse" />
            ) : (
              <ShieldAlert size={20} />
            )}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {message.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
