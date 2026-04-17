"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Trash2, Printer, CheckCircle2, User, CreditCard, X, Plus, Minus, Banknote, Phone, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TicketTemplate } from "../TicketTemplate";
import { useDashboard } from "../DashboardContext";
import { getSystemNames } from "@/lib/system-names";

export function POSModule() {
  const { shopType, refreshTrigger, company } = useDashboard();
  const names = getSystemNames(shopType);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastTicket, setLastTicket] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"method" | "cash">("method");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  
  const ticketRef = React.useRef<HTMLDivElement>(null);

  const fetchProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const res = await fetch(`${API_URL}/products/?company_id=${companyId}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching products for POS", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const isInitial = products.length === 0;
    fetchProducts(!isInitial);
  }, [refreshTrigger]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const change = (parseFloat(cashReceived) || 0) - total;

  const handleProcessSale = async (methodOverride?: string) => {
    if (cart.length === 0) return;
    
    const finalMethod = methodOverride || selectedMethod;
    
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      const userId = userData.id;

      console.log("POS: Attempting sale with userData:", userData);

      if (!userId) {
        alert(`Erreur d'identification : l'utilisateur "${userData.name || userData.username || 'Inconnu'}" n'a pas d'ID de session (ID actuel: ${userId}). Veuillez vous déconnecter et vous reconnecter.`);
        return;
      }

      const res = await fetch(`${API_URL}/sales/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          user_id: userId,
          items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, qty: item.qty })),
          total_amount: total,
          payment_method: finalMethod
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastTicket({
          number: data.ticket_number,
          items: [...cart],
          total: total,
          date: new Date().toLocaleString("fr-FR"),
          companyName: userData.company_name || "Mon Établissement",
          payment_method: finalMethod,
          cashier_name: userData.name || userData.username,
          cash_received: finalMethod === "cash" ? parseFloat(cashReceived) || 0 : 0,
        });
        setCart([]);
        setIsPaymentOpen(false);
        setCashReceived("");
        setPaymentStep("method");
        fetchProducts(); 
      }
    } catch (err) {
      console.error("Error processing sale", err);
    }
  };

  const handlePrint = () => {
    if (!lastTicket) return;
    
    // Création d'une fenêtre d'impression temporaire
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (printWindow && ticketRef.current) {
      const content = ticketRef.current.innerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Impression Ticket ${lastTicket.number}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: monospace; }
              @media print {
                @page { margin: 0; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex gap-6 h-full animate-in fade-in duration-500 overflow-hidden">
      {/* SELECTION AREA (Left) */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
          <Input 
             placeholder={shopType === 'restaurant' ? "Rechercher un plat..." : "Scanner un code-barres ou rechercher un article..."} 
             className="pl-10 h-10 text-[11px] bg-background border-border/20 rounded-[3px]"
             value={search}
             onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* PRODUCT GRID */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-y-auto pr-2 custom-scrollbar">
           {loading ? (
             <div className="col-span-full pt-10 text-center text-[10px] uppercase opacity-40">Chargement du catalogue...</div>
           ) : filteredProducts.map((p) => (
             <button 
               key={p.id}
               onClick={() => addToCart(p)}
               className="p-3 border border-border/10 bg-background hover:bg-accent/40 rounded-[3px] text-left space-y-2 transition-all active:scale-[0.98] group"
             >
                <div className="w-full aspect-square bg-muted/20 rounded-[3px] flex items-center justify-center relative overflow-hidden">
                   {p.image_url ? (
                     <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                   ) : (
                     <ShoppingCart size={16} className="text-muted-foreground/10 group-hover:text-[var(--primary-accent)] transition-colors" />
                   )}
                   <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-background/70 backdrop-blur-sm rounded-[3px] text-[7px] font-bold uppercase transition-colors">
                      Stock: {p.quantity}
                   </div>
                </div>
                <div className="space-y-0.5">
                   <p className="text-[9px] font-bold uppercase truncate leading-tight">{p.name}</p>
                   <p className="text-[10px] font-black text-[var(--primary-accent)]">{(p.price || 0).toLocaleString()} CFA</p>
                </div>
             </button>
           ))}
        </div>
      </div>

      {/* CART AREA (Right) */}
      <div className="w-[320px] flex flex-col bg-muted/10 border border-border/20 rounded-[3px] overflow-hidden">
         <div className="p-4 border-b border-border/20 bg-background/40 flex justify-between items-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
               <ShoppingCart size={12} /> Panier Actuel
            </h3>
            <span className="text-[8px] bg-[var(--primary-accent-pale)] text-[var(--primary-accent)] px-1.5 py-0.5 rounded-[3px] font-bold">{cart.length}</span>
         </div>

         {/* CART ITEMS */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 gap-2">
                 <ShoppingCart size={32} />
                 <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Panier Vide</span>
              </div>
            ) : cart.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-[10px] bg-background p-2 rounded-[3px] border border-border/10">
                 <div className="flex flex-col gap-1 w-full">
                    <span className="font-bold leading-tight truncate">{item.name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2 bg-muted/40 rounded-[3px] p-0.5">
                        <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-muted/60 rounded-[2px]"><Minus size={10}/></button>
                        <span className="min-w-[15px] text-center font-bold">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-muted/60 rounded-[2px]"><Plus size={10}/></button>
                      </div>
                      <span className="font-bold text-[var(--primary-accent)]">{((item.price || 0) * (item.qty || 0)).toLocaleString()}</span>
                    </div>
                 </div>
                 <button onClick={() => removeFromCart(item.id)} className="ml-2 text-destructive/40 hover:text-destructive">
                    <X size={12} />
                 </button>
              </div>
            ))}
         </div>

         {/* TOTAL & ACTIONS */}
         <div className="p-4 bg-background border-t border-border/20 space-y-4">
            <div className="space-y-1.5 pt-2 border-t border-border/10">
               <div className="flex justify-between text-[9px] uppercase font-bold text-muted-foreground/60">
                  <span>Sous-total</span>
                  <span>{(total || 0).toLocaleString()} CFA</span>
               </div>
               <div className="flex justify-between text-base font-black tracking-tight text-foreground">
                  <span>TOTAL</span>
                  <span className="text-[var(--primary-accent)]">{(total || 0).toLocaleString()} CFA</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <Button 
                variant="ghost" 
                onClick={handlePrint}
                disabled={!lastTicket}
                className={cn(
                  "h-9 rounded-[3px] border border-border/20 text-[9px] uppercase font-bold tracking-widest gap-2",
                  lastTicket && "border-[var(--primary-accent)] text-[var(--primary-accent)] bg-[var(--primary-accent-pale)]"
                )}
               >
                  <Printer size={12} /> {lastTicket ? "Imprimer " + lastTicket.number : "Ticket"}
               </Button>
                <Button 
                 onClick={() => setIsPaymentOpen(true)}
                 disabled={cart.length === 0}
                 className="h-9 rounded-[3px] bg-foreground text-background hover:bg-foreground/90 text-[9px] uppercase font-bold tracking-widest gap-2 shadow-xl shadow-[var(--primary-accent-pale)]"
                >
                   <CreditCard size={12} /> Payé
                </Button>
            </div>
         </div>
      </div>

      {/* PAYMENT MODAL OVERLAY */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-[400px] bg-background border border-border/20 rounded-[3px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              {/* MODAL HEADER */}
              <div className="p-4 border-b border-border/20 flex justify-between items-center bg-muted/10">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Finaliser {shopType === 'restaurant' ? 'la Commande' : 'la Vente'}</h3>
                 <button onClick={() => setIsPaymentOpen(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                    <X size={16} />
                 </button>
              </div>

              {/* STEP 1: SELECT METHOD */}
              {paymentStep === "method" && (
                <div className="p-6 space-y-6">
                   <div className="space-y-4">
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 text-center">Choisir un moyen de paiement</p>
                      <div className="grid grid-cols-1 gap-3">
                         <button 
                           onClick={() => {
                             setSelectedMethod("cash");
                             setPaymentStep("cash");
                           }}
                           className="flex items-center gap-4 p-4 border border-border/10 bg-muted/5 hover:bg-muted/20 hover:border-border/30 rounded-[3px] transition-all group"
                         >
                            <div className="w-10 h-10 rounded-[3px] bg-background/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                               <Banknote className="text-[var(--success)]" size={20} />
                            </div>
                            <div className="text-left">
                               <p className="text-[10px] font-black uppercase">Paiement en espèces</p>
                               <p className="text-[8px] opacity-40">Règlement direct (Tiroir-caisse)</p>
                            </div>
                            <ArrowRight size={14} className="ml-auto opacity-20" />
                         </button>

                         <button 
                           disabled 
                           className="flex items-center gap-4 p-4 border border-border/5 bg-muted/5 opacity-50 cursor-not-allowed rounded-[3px]"
                         >
                            <div className="w-10 h-10 rounded-[3px] bg-background/60 flex items-center justify-center">
                               <Phone className="text-[var(--primary-accent)]" size={20} />
                            </div>
                            <div className="text-left">
                               <p className="text-[10px] font-black uppercase">Mobile Money (Bientôt)</p>
                               <p className="text-[8px] opacity-40">Orange / MTN / Moov...</p>
                            </div>
                         </button>

                         <button 
                           disabled 
                           className="flex items-center gap-4 p-4 border border-border/5 bg-muted/5 opacity-50 cursor-not-allowed rounded-[3px]"
                         >
                            <div className="w-10 h-10 rounded-[3px] bg-background/60 flex items-center justify-center">
                               <CreditCard className="text-[var(--info)]" size={20} />
                            </div>
                            <div className="text-left">
                               <p className="text-[10px] font-black uppercase">Paiement Bancaire (Bientôt)</p>
                               <p className="text-[8px] opacity-40">Visa / Mastercard / TPE</p>
                            </div>
                         </button>
                      </div>
                   </div>
                </div>
              )}

              {/* STEP 2: CASH RECONCILIATION */}
              {paymentStep === "cash" && (
                <div className="p-6 space-y-6">
                   <div className="p-4 bg-muted/10 rounded-[3px] border border-border/10 space-y-2">
                       <div className="flex justify-between items-center opacity-40 text-[9px] uppercase font-bold tracking-widest">
                          <span>A Régler</span>
                          <ShoppingCart size={12} />
                       </div>
                       <h4 className="text-2xl font-black tracking-tight text-center">
                          {total.toLocaleString()} <span className="text-[10px] font-medium opacity-40 uppercase">CFA</span>
                       </h4>
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[8px] font-bold uppercase tracking-widest opacity-40">Montant reçu du client</label>
                         <Input 
                           autoFocus
                           type="number"
                           placeholder="0.00"
                           value={cashReceived}
                           onChange={e => setCashReceived(e.target.value)}
                           className="h-12 text-2xl font-black bg-muted/5 border-border/20 text-center rounded-[3px] placeholder:opacity-5 focus:ring-[var(--primary-accent)]/20 shadow-inner"
                         />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-background border border-border/10">
                         <div className="space-y-0.5">
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Montant à rendre</span>
                            <div className={cn(
                              "text-sm font-black",
                              change < 0 ? "text-destructive" : "text-[var(--primary-accent)]"
                            )}>
                               {change < 0 ? "Manquant: " : ""}{Math.abs(change).toLocaleString()} CFA
                            </div>
                         </div>
                         {change >= 0 && cashReceived && (
                           <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-[3px]">
                              <CheckCircle2 size={12} /> Pret
                           </div>
                         )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                         <Button 
                           variant="outline" 
                           onClick={() => setPaymentStep("method")}
                           className="h-10 rounded-[3px] text-[9px] font-black uppercase tracking-widest border-border/20"
                         >
                            Retour
                         </Button>
                         <Button 
                           disabled={!cashReceived || change < 0}
                           onClick={() => handleProcessSale()}
                           className="h-10 rounded-[3px] bg-foreground text-background hover:bg-foreground/90 text-[9px] font-black uppercase tracking-widest gap-2 shadow-xl shadow-foreground/10"
                         >
                            Confirmer <CheckCircle2 size={12} />
                         </Button>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* HIDDEN TICKET FOR PRINTING */}
      <div className="hidden">
         {lastTicket && (
            <TicketTemplate 
              ref={ticketRef}
              companyName={lastTicket.companyName}
              logoUrl={company?.logo_url}
              shopType={shopType}
              ticketNumber={lastTicket.number}
              date={lastTicket.date}
              items={lastTicket.items}
              total={lastTicket.total}
              attributes={{
                payment_method: lastTicket.payment_method,
                cashier_name: lastTicket.cashier_name,
                cash_received: lastTicket.cash_received || undefined,
              }}
            />
         )}
      </div>
    </div>
  );
}
