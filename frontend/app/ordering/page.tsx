"use client";
import { API_URL, WS_URL } from "@/lib/config";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  Utensils,
  Info,
  Send,
  Layers,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


const resolveImageUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("data:")) return url;
  return `${API_URL}${url}`;
};

// COMPOSANT MÉMOÏSÉ POUR LES PERFORMANCES
const ProductCard = React.memo(({ 
  product, 
  inCart, 
  addToCart, 
  removeFromCart 
}: { 
  product: any; 
  inCart: any; 
  addToCart: (product: any) => void; 
  removeFromCart: (productId: number) => void;
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <div className="group relative flex flex-col bg-card/60 border border-border/10 rounded-[3px] hover:border-[var(--primary-accent)]/40 transition-colors overflow-hidden h-full shadow-sm">
      {/* Dish Image - Square Format */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted/20 border-b border-border/5">
        {product.image_url ? (
          <>
            <img
              src={resolveImageUrl(product.image_url)!}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted/20 animate-pulse flex items-center justify-center">
                <Utensils size={18} className="text-muted-foreground/20" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/5 gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-accent)]/5 border border-[var(--primary-accent)]/20 flex items-center justify-center">
              <Utensils
                size={14}
                className="text-[var(--primary-accent)]/40"
              />
            </div>
            <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-20">
              Image non dispo
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2">
          <div className="bg-black/70 border border-white/5 px-2 py-0.5 rounded-full">
            <span className="text-[6px] font-black uppercase tracking-widest text-white/50">
              {product.category_id ? "Direct" : "Special"}
            </span>
          </div>
        </div>
      </div>



      <div className="flex-1 p-4 space-y-3 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-[11px] font-black tracking-tight leading-tight uppercase group-hover:text-[var(--primary-accent)] transition-colors text-foreground">
                {product.name}
              </h3>
              <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">
                {product.unit || "Portion Standard"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-black text-[var(--primary-accent)]">
                {product.price.toLocaleString()}
              </span>
              <span className="block text-[7px] text-muted-foreground font-bold tracking-tighter italic">
                CFA
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          {inCart ? (
            <div className="flex items-center bg-muted/20 border border-border/10 rounded-[3px] p-1 gap-4 w-full justify-between">
              <button
                onClick={() => removeFromCart(product.id)}
                className="w-7 h-7 flex items-center justify-center rounded-[2px] bg-muted/40 border border-border/10 hover:bg-muted/60"
              >
                <Minus size={12} />
              </button>
              <span className="text-[11px] font-black tabular-nums text-foreground">
                {inCart.qty}
              </span>
              <button
                onClick={() => addToCart(product)}
                className="w-7 h-7 flex items-center justify-center rounded-[2px] bg-[var(--primary-accent)] text-white hover:opacity-90"
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              className="w-full flex items-center justify-center gap-2 h-8 bg-muted/20 border border-border/10 rounded-[3px] text-[8px] font-black uppercase tracking-widest hover:bg-[var(--primary-accent)] hover:text-white transition-all text-muted-foreground"
            >
              Ajouter <Plus size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

// COMPOSANTS SKELETON POUR LE CHARGEMENT FLUIDE
const ProductSkeleton = () => (
  <div className="flex flex-col bg-card/40 border border-border/10 rounded-[3px] animate-pulse overflow-hidden h-full">
    <div className="aspect-square w-full bg-muted/20" />
    <div className="p-4 space-y-3">
      <div className="h-3 bg-muted/20 rounded-full w-3/4" />
      <div className="h-2 bg-muted/20 rounded-full w-1/2" />
      <div className="h-8 bg-muted/20 rounded-[3px] w-full mt-4" />
    </div>
  </div>
);

const CategorySkeleton = () => (
  <div className="w-full h-10 bg-muted/10 rounded-[3px] animate-pulse" />
);



function OrderingContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId");
  const table = searchParams.get("table");

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>("pending");
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  // Références pour éviter les closures périmées dans WebSocket
  const lastOrderIdRef = useRef<number | null>(null);
  const sessionInfoRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  
  const filteredProducts = React.useMemo(() => 
    activeCategory
      ? products.filter((p) => p.category_id === activeCategory)
      : products,
    [products, activeCategory]
  );

  const cartMap = React.useMemo(() => {
    const map: Record<number, any> = {};
    cart.forEach(item => {
      map[item.id] = item;
    });
    return map;
  }, [cart]);


  useEffect(() => {
    if (companyId && table) {
      checkAuthAndFetchData();
    }
    // Demander la permission pour les notifications push
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [companyId, table]);

  const checkAuthAndFetchData = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!token || !storedUser || storedUser.role !== "client") {
        window.location.href = "/auth/login";
        return;
      }

      if (
        storedUser.company_id.toString() !== companyId ||
        storedUser.table_number.toString() !== table
      ) {
        window.location.href = "/auth/login";
        return;
      }

      setSessionInfo(storedUser);
      sessionInfoRef.current = storedUser;

      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_URL}/products/?company_id=${companyId}`),
        fetch(`${API_URL}/products/categories?company_id=${companyId}`),
      ]);
      const pData = await prodRes.json();
      const cData = await catRes.json();
      setProducts(pData);
      setCategories(cData);

      // Vérifier s'il y a une commande active pour cette session
      const ordRes = await fetch(
        `${API_URL}/restaurant/orders?company_id=${companyId}&session_id=${storedUser.session_id}`,
      );
      const orders = await ordRes.json();
      if (orders && orders.length > 0) {
        const lastOrder = orders[0]; // Le plus récent
        if (["pending", "validated", "preparing"].includes(lastOrder.status)) {
          setOrdered(true);
          setOrderStatus(lastOrder.status);
          setLastOrderId(lastOrder.id);
          lastOrderIdRef.current = lastOrder.id;
        }
      }
    } catch (error) {
      console.error("Error initializing menu:", error);
    } finally {
      setLoading(false);
    }
  };

  // WEB SOCKET REAL-TIME UPDATE (Modernisé avec Auto-reconnect & Alertes)
  useEffect(() => {
    if (!companyId) return;

    let ws: WebSocket;
    let reconnectTimeout: any;

    const connectWS = () => {
      ws = new WebSocket(WS_URL);

      ws.onmessage = async (event) => {
        try {
          let data: any;
          try {
            data = JSON.parse(event.data);
          } catch (e) {
            // Support du texte brut legacy ("refresh")
            if (event.data === "refresh") {
              checkAuthAndFetchData();
              return;
            }
            return;
          }

          // --- CAS 1 : CHANGEMENT DE STATUT DE COMMANDE ---
          if (data.type === "order_status") {
            const isMyOrder =
              String(data.order_id) === String(lastOrderIdRef.current) ||
              String(data.session_id) === String(sessionInfoRef.current?.session_id);

            if (isMyOrder) {
              setOrderStatus(data.status);

              // Alerte Validation
              if (data.status === "validated") {
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                audio.play().catch(() => {});

                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("Commande Validée ! 🚀", {
                    body: "Votre commande est maintenant en préparation en cuisine.",
                    icon: "/favicon.ico",
                  });
                }
              }

              // Alerte Service (Prêt)
              if (data.status === "served") {
                setOrdered(false);
                setOrderStatus("pending");
                setLastOrderId(null);
                lastOrderIdRef.current = null;
                
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3");
                audio.play().catch(() => {});

                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("Bon appétit ! 🍽️", {
                    body: "Votre commande a été servie. Merci de votre confiance !",
                    icon: "/favicon.ico",
                  });
                }
              }
            }
          }

          // --- CAS 2 : RAFRAÎCHISSEMENT GÉNÉRIQUE ---
          if (data.type === "refresh" || data === "refresh") {
            checkAuthAndFetchData();
          }
        } catch (err) {
          console.error("Erreur traitement WebSocket Client:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket Déconnecté. Reconnexion dans 3s...");
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [companyId]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (!existing) return prev;
      if (existing.qty === 1) {
        return prev.filter((item) => item.id !== productId);
      }
      return prev.map((item) =>
        item.id === productId ? { ...item, qty: item.qty - 1 } : item,
      );
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/restaurant/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: parseInt(companyId!),
          table_number: table,
          session_id: sessionInfo?.session_id,
          items: cart,
          total_amount: total,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setOrdered(true);
        setOrderStatus("pending");
        setLastOrderId(data.order_id);
        lastOrderIdRef.current = data.order_id;
        setCart([]);
      }
    } catch (error) {
      alert("Erreur lors de l'envoi de la commande");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredProducts.length) {
        setVisibleCount((prev) => prev + 20);
      }
    }
  };

  // Réinitialiser le compteur quand on change de catégorie
  useEffect(() => {
    setVisibleCount(20);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  if (loading)

    return (
      <div className="h-full bg-background flex flex-col overflow-hidden">
        {/* Skeleton Header */}
        <div className="h-20 flex-shrink-0 px-6 flex items-center border-b border-border/10">
          <div className="w-10 h-10 bg-muted/20 rounded-[3px] animate-pulse" />
          <div className="ml-4 space-y-2">
            <div className="h-4 bg-muted/20 rounded-full w-32 animate-pulse" />
            <div className="h-2 bg-muted/20 rounded-full w-20 animate-pulse" />
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          <aside className="w-[25%] max-w-[280px] border-r border-border/10 p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => <CategorySkeleton key={i} />)}
          </aside>
          <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3">
             {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <ProductSkeleton key={i} />)}
          </main>
        </div>
      </div>
    );



  if (ordered) {
    const isReady = ["validated", "preparing", "served"].includes(orderStatus);

    return (
      <div className="h-full bg-background flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            isReady
              ? "bg-[var(--primary-accent)]/10 text-[var(--primary-accent)]"
              : "bg-[var(--success)]/10 text-[var(--success)]",
          )}
        >
          {isReady ? (
            <Utensils size={40} className="animate-pulse" />
          ) : (
            <CheckCircle2 size={40} />
          )}
        </div>


        <div className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight text-white uppercase leading-tight">
            {isReady ? "Encours de préparation" : "C'est envoyé !"}
          </h2>
          <div className="flex flex-col gap-2">
            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest max-w-xs mx-auto">
              {isReady
                ? "Vous serez servi dans peu de temps. veuillez patienter s'il vous palit !"
                : `Votre commande pour la Table ${table} est en cours de validation.`}
            </p>
            {isReady && (
              <span className="text-[var(--primary-accent)] text-[8px] font-black uppercase tracking-[0.3em]">
                Service imminent
              </span>

            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => setOrdered(false)}
            className="rounded-[3px] h-10 px-8 border-white/10 bg-white/5 text-[10px] uppercase font-black tracking-widest hover:bg-white/10 transition-all"
          >
            Repasser une commande
          </Button>

          <p className="text-[7px] text-muted-foreground/30 uppercase tracking-widest font-black">
            Commande #{lastOrderId}
          </p>
        </div>
      </div>
    );
  }



  return (
    <div className="h-full flex flex-col bg-background text-foreground font-sans overflow-hidden">
      {/* HEADER */}
      <header className="h-20 flex-shrink-0 flex flex-col justify-center px-6 relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--primary-accent)]/10 rounded-[3px] flex items-center justify-center border border-[var(--primary-accent)]/20 shadow-lg shadow-[var(--primary-accent)]/10">
              <Utensils className="text-[var(--primary-accent)]" size={20} />
            </div>
            <div>
              <h1 className="text-md font-black tracking-tighter uppercase leading-none">
                Menu Digital
              </h1>
              <p className="text-[9px] font-black text-[var(--primary-accent)] uppercase tracking-[0.2em] mt-1">
                Espace Client • Table {table}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 opacity-40">
            <div className="text-right hidden sm:block">
              <p className="text-[8px] font-bold uppercase tracking-widest">
                Connecté
              </p>
              <p className="text-[7px] opacity-60">Mode Commande Directe</p>
            </div>
            <Info size={16} />
          </div>
        </div>
        {/* Horizontal Line */}
        <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-border/10" />
      </header>

      {/* CORE INTERFACE */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT COLUMN: CATEGORIES (25%) */}
        <aside className="w-[25%] max-w-[280px] flex-shrink-0 flex flex-col border-r border-border/10 bg-muted/5">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 px-2">
              Catégories
            </p>

            {/* "Tout" Button */}
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-[3px] transition-all duration-300 text-left group",
                activeCategory === null
                  ? "bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/30 text-[var(--primary-accent)]"
                  : "bg-transparent border border-transparent text-muted-foreground hover:bg-muted/10 hover:text-foreground",
              )}
            >
              <Layers
                size={14}
                className={cn(
                  activeCategory === null
                    ? "text-[var(--primary-accent)]"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Tout le Menu
              </span>
              {activeCategory === null && (
                <div className="ml-auto w-1 h-3 bg-[var(--primary-accent)] rounded-full" />
              )}

            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-3 rounded-[3px] transition-all duration-300 text-left group",
                  activeCategory === cat.id
                    ? "bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/30 text-[var(--primary-accent)]"
                    : "bg-transparent border border-transparent text-muted-foreground hover:bg-muted/10 hover:text-foreground",
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {cat.name}
                </span>
                {activeCategory === cat.id && (
                  <div className="w-1 h-3 bg-[var(--primary-accent)] rounded-full" />
                )}

              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT COLUMN: PRODUCTS (75%) */}
        <main className="flex-1 flex flex-col bg-background/50 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32"
          >
            <div className="mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/30 italic">
                {activeCategory
                  ? categories.find((c) => c.id === activeCategory)?.name
                  : "La Carte Complète"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.slice(0, visibleCount).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  inCart={cartMap[product.id]}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                />
              ))}
            </div>

            {visibleCount < filteredProducts.length && (
              <div className="py-10 flex justify-center">
                 <div className="w-6 h-6 border-2 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="h-[40vh] flex flex-col items-center justify-center opacity-10">
                <Utensils size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">
                  Aucun article disponible
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-12 left-0 right-0 p-4 z-50 flex justify-center pointer-events-none">
          <div className="w-full max-w-lg bg-card border border-border/20 rounded-[3px] p-4 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.3)] pointer-events-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--primary-accent)] text-white rounded-[2px] flex items-center justify-center relative">
                <ShoppingCart size={22} />
                <span className="absolute -top-2 -right-2 bg-foreground text-background text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1 italic">
                    VOTRE PANIER
                  </p>
                  <button
                    onClick={() => setCart([])}
                    className="text-[7px] font-black uppercase tracking-widest text-destructive/40 hover:text-destructive transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={8} /> Tout Vider
                  </button>
                </div>
                <p className="text-lg font-black tracking-tighter text-foreground">
                  {total.toLocaleString()}{" "}
                  <span className="text-[9px] text-muted-foreground font-black">
                    CFA
                  </span>
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="rounded-[3px] h-12 px-8 bg-[var(--primary-accent)] text-white text-[10px] font-black uppercase tracking-[0.2em] gap-3 hover:opacity-90 transition-all group disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  Valider la Commande{" "}
                  <Send
                    size={14}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </Button>
          </div>
        </div>
      )}


      {/* SYSTEM FOOTER */}
      <footer className="h-8 flex-shrink-0 border-t border-border/10 bg-muted/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[var(--primary-accent)] rounded-full animate-pulse shadow-[0_0_8px_var(--primary-accent)]" />
          <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">
            Live Connection Active
          </span>
        </div>
        <div className="flex items-center justify-center">
          <p className="text-[8px] font-black tracking-[0.4em] text-muted-foreground/30">
            ©{new Date().getFullYear()} | Powered by GAS
          </p>
        </div>
        <div className="flex items-center gap-4 text-[7px] font-black uppercase tracking-widest text-muted-foreground/30">
          <span>Table {table}</span>
          <span>
            S-ID: {sessionInfo?.session_id?.toString().slice(-4) || "----"}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function OrderingPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full bg-background flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--primary-accent)] animate-spin" />
        </div>
      }
    >
      <OrderingContent />
    </Suspense>
  );
}
