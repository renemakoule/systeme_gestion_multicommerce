"use client";
import { API_URL, WS_URL } from "@/lib/config";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Role, ShopType } from "@/lib/dashboard-config";

type ThemeColor = "violet" | "emerald" | "blue" | "gold";

interface DashboardContextType {
  role: Role;
  shopType: ShopType;
  activeOption: string;
  accentColor: ThemeColor;
  enabledModules: string[];
  company: any;
  user: any;
  setRole: (role: Role) => void;
  setShopType: (type: ShopType) => void;
  setActiveOption: (option: string) => void;
  setAccentColor: (color: ThemeColor) => void;
  refreshCompany: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  newOrderEvent: any;
  clearNewOrderEvent: () => void;
  setEnabledModules: (modules: string[]) => void;
  realtimeSatisfactionSignal: number;
  lastSystemMessageId: number | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("gerant");
  const [shopType, setShopType] = useState<ShopType>("boutique");
  const [activeOption, setActiveOption] = useState("overview");
  const [accentColor, setAccentColor] = useState<ThemeColor>("violet");
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [newOrderEvent, setNewOrderEvent] = useState<any>(null);
  const [realtimeSatisfactionSignal, setRealtimeSatisfactionSignal] = useState(0);
  const [lastSystemMessageId, setLastSystemMessageId] = useState<number | null>(null);

  const clearNewOrderEvent = () => setNewOrderEvent(null);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const fetchCompany = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (!storedUser.company_id) return;

      const res = await fetch(
        `${API_URL}/companies/${storedUser.company_id}`,
      );
      const data = await res.json();
      setCompany(data);
      setUser(storedUser);
      if (storedUser.role) setRole(storedUser.role);

      // Mise à jour dynamique du type et des modules
      if (data.type) setShopType(data.type);
      if (data.enabled_modules) {
        setEnabledModules(data.enabled_modules.split(","));
      } else {
        // Par défaut si non spécifié (cas ancienne installation)
        setEnabledModules([
          "dashboard",
          "sales",
          "inventory",
          "finance",
          "users",
          "settings",
          "pos",
          "history",
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch company info", err);
    }
  };

  // Interceptor Fetch pour des logs Frontend globaux
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).__fetchPatched) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const res = await originalFetch(...args);
          if (!res.ok) {
            console.error(`[API ERROR] ${res.status} ${res.statusText} on ${String(args[0])}`);
            try {
              const text = await res.clone().text();
              console.error(`[API ERROR DETAILS]`, text);
            } catch (e) {}
          }
          return res;
        } catch (err: any) {
          console.error(`[NETWORK ERROR] Echec d'accès à ${String(args[0])} :`, err.message);
          throw err;
        }
      };
      (window as any).__fetchPatched = true;
    }
  }, []);

  useEffect(() => {
    fetchCompany();

    // Chargement du thème initial
    const savedTheme = localStorage.getItem("dashboard-theme") as ThemeColor;
    if (savedTheme) setAccentColor(savedTheme);
  }, []);

  // Synchronisation Temps Réel via WebSocket (Trigger DB)
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWS = () => {
      try {
        socket = new WebSocket(WS_URL);

        socket.onmessage = async (event) => {
          try {
            // Handle simple "refresh" string (compatibilité)
            if (event.data === "refresh") {
              triggerRefresh();
              return;
            }

            // Analyse JSON pour les messages techniques
            const data = JSON.parse(event.data);
            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
            const myCompanyId = storedUser.company_id;

            // 1. Refresh global
            if (data.type === "refresh") {
              triggerRefresh();
            }

            // 2. Demande de satisfaction temps réel
            if (data.type === "SATISFACTION_PROMPT") {
              if (data.company_id === null || Number(data.company_id) === Number(myCompanyId)) {
                setRealtimeSatisfactionSignal(prev => prev + 1);
              }
            }

            // 3. Message système / Annonce
            if (data.type === "SYSTEM_MESSAGE" || data.type === "DELETE_SYSTEM_MESSAGE") {
              if (data.company_id === null || Number(data.company_id) === Number(myCompanyId)) {
                setLastSystemMessageId(data.msg_id);
              }
            }

            // Logique restaurant existante
            if (data.type === "new_order" || data.type === "refresh") {
              const isAdminOrCashier = storedUser.role === "gerant" || storedUser.role === "caisse";
              if (isAdminOrCashier) {
                // Forcer le rafraîchissement des listes (RestaurantPOS, etc)
                triggerRefresh();

                if (data.type === "new_order") {
                  // Alert Sonore
                  const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                  audio.play().catch(() => {});

                  try {
                    const res = await fetch(
                      `${API_URL}/restaurant/orders?company_id=${storedUser.company_id}&status=pending`,
                    );
                    const orders = await res.json();
                    if (orders && orders.length > 0) {
                      const latestOrder = orders[0];
                      setLastOrderId((prev) => {
                        if (!prev || latestOrder.id > prev) {
                          setNewOrderEvent(latestOrder);
                          return latestOrder.id;
                        }
                        return prev;
                      });
                    }
                  } catch (e) {}
                }
              }
            }
          } catch (err) {
            // Si ce n'est pas du JSON, on ignore ou on traite comme refresh
          }
        };

        socket.onclose = () => {
          reconnectTimeout = setTimeout(connectWS, 2000);
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWS, 2000);
      }
    };

    connectWS();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Synchronisation du thème avec le DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", accentColor);
    localStorage.setItem("dashboard-theme", accentColor);
  }, [accentColor]);

  // Notifications Push Natives
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (
      newOrderEvent &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("Nouvelle Commande !", {
        body: `Table ${newOrderEvent.table_number} • ${newOrderEvent.total_amount?.toLocaleString()} CFA`,
        icon: "/favicon.ico", // ou une icône de plat
      });
    }
  }, [newOrderEvent]);

  return (
    <DashboardContext.Provider
      value={{
        role,
        shopType,
        activeOption,
        accentColor,
        enabledModules,
        company,
        user,
        setRole,
        setShopType,
        setActiveOption,
        setAccentColor,
        setEnabledModules,
        refreshCompany: fetchCompany,
        refreshTrigger,
        triggerRefresh,
        newOrderEvent,
        clearNewOrderEvent,
        realtimeSatisfactionSignal,
        lastSystemMessageId,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
