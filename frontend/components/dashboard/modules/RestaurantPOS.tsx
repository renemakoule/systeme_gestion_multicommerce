"use client";
import { API_URL } from "@/lib/config";

import React, { useState, useEffect, useRef } from "react";
import { Utensils, CheckCircle2, Clock, MapPin, Printer, ChevronRight, X, AlertCircle, UserPlus, LogOut, QrCode, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDashboard } from "../DashboardContext";
import { TicketTemplate } from "../TicketTemplate";
import { cn } from "@/lib/utils";

export function RestaurantPOS() {
  const [view, setView] = useState<"orders" | "tables">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [lastTicket, setLastTicket] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState<any>(null); // Table object
  const [clientName, setClientName] = useState("");
  
  const ticketRef = useRef<any>(null);
  const { refreshTrigger, shopType, company } = useDashboard();

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const companyId = userData.company_id || 1;
      
      if (view === "orders") {
        const response = await fetch(`${API_URL}/restaurant/orders?company_id=${companyId}`);
        const data = await response.json();
        setOrders(data);
      } else {
        const [tableRes, sessionRes] = await Promise.all([
           fetch(`${API_URL}/restaurant/tables?company_id=${companyId}`),
           fetch(`${API_URL}/restaurant/orders?company_id=${companyId}`)
        ]);
        
        let tData = await tableRes.json().catch(() => []);
        setTables(Array.isArray(tData) ? tData : []);

        const sRes = await fetch(`${API_URL}/restaurant/sessions?company_id=${companyId}`);
        const sData = await sRes.json().catch(() => []);
        setActiveSessions(sData);
      }
    } catch (error) {
       console.error("Error fetching restaurant data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
     try {
       const userData = JSON.parse(localStorage.getItem("user") || "{}");
       const nextNumber = tables.length > 0 
         ? (Math.max(...tables.map(t => parseInt(t.number) || 0)) + 1).toString()
         : "1";
         
       const response = await fetch(`${API_URL}/restaurant/tables`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            company_id: userData.company_id,
            number: nextNumber
         })
       });
       if (response.ok) fetchData();
     } catch (error) {
        alert("Erreur lors de l'ajout de la table");
     }
  };

  const handleDeleteTable = async (tableId: number) => {
     if (!confirm("Supprimer cette table ?")) return;
     try {
       const response = await fetch(`${API_URL}/restaurant/tables/${tableId}`, {
         method: "DELETE"
       });
       if (response.ok) fetchData();
     } catch (error) {
        alert("Erreur lors de la suppression");
     }
  };

  const handleCreateSession = async () => {
    if (!showAssignModal) return;
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await fetch(`${API_URL}/restaurant/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: userData.company_id,
          table_number: showAssignModal.number,
          client_name: clientName
        })
      });
      if (response.ok) {
        setShowAssignModal(null);
        setClientName("");
        fetchData();
      }
    } catch (error) {
      alert("Erreur lors de l'ouverture de la table");
    }
  };

  const handleCloseSession = async (sessionId: number) => {
    try {
      const response = await fetch(`${API_URL}/restaurant/sessions/${sessionId}/close`, {
        method: "PATCH"
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      alert("Erreur lors de la fermeture de session");
    }
  };

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const response = await fetch(`${API_URL}/restaurant/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, user_id: userData.id })
      });
      
      if (response.ok) {
        if (status === "validated") {
          const userData = JSON.parse(localStorage.getItem("user") || "{}");
          const order = orders.find(o => o.id === orderId);
          setLastTicket({
            companyName: company?.name || userData.company_name || "Restaurant",
            logoUrl: company?.logo_url,
            shopType: shopType,
            number: "T-" + orderId,
            date: new Date().toLocaleString(),
            items: order.items.map((i: any) => ({ name: i.product_name, price: i.price, qty: i.qty, total: i.price * i.qty })),
            total: order.total_amount,
            attributes: { table_number: order.table_number }
          });
          setTimeout(() => { if (ticketRef.current) window.print(); }, 500);
        }
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const fetchOrders = () => { setView("orders"); fetchData(); };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "validated": return "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20";
      case "preparing": return "bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] border-[var(--primary-accent)]/20";
      case "served": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border/10";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "À Valider";
      case "validated": return "Validée";
      case "preparing": return "En Cuisine";
      case "served": return "Servie";
      default: return status;
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col p-2">
      <div className="flex items-center justify-between">
         <div className="space-y-0.5">
            <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
               <Utensils size={18} className="text-[var(--primary-accent)]" /> 
               {view === "orders" ? "Commandes" : "Gestion des Tables"}
            </h2>
            <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.2em] px-0.5">
              {view === "orders" ? "Suivi en temps réel" : "Occupation & Clients"}
            </p>
         </div>
         <div className="flex items-center gap-1.5 p-1 bg-muted/5 rounded-[3px] border border-border/5">
            <Button 
              variant={view === "orders" ? "default" : "ghost"} 
              onClick={() => setView("orders")}
              className={cn("h-7 text-[8px] font-black uppercase tracking-widest px-3 rounded-[3px]", view === "orders" && "bg-white text-black shadow-none")}
            >
              Commandes
            </Button>
            <Button 
              variant={view === "tables" ? "default" : "ghost"}
              onClick={() => setView("tables")}
              className={cn("h-7 text-[8px] font-black uppercase tracking-widest px-3 rounded-[3px]", view === "tables" && "bg-white text-black shadow-none")}
            >
              Tables & Clients
            </Button>
            {view === "tables" && (
              <Button onClick={handleAddTable} className="h-7 w-7 p-0 bg-[var(--primary-accent)] hover:opacity-80 rounded-[3px] text-white">
                 <Plus size={14} />
              </Button>
            )}
            <div className="w-px h-3 bg-border/20 mx-1" />
            <Button variant="ghost" onClick={fetchData} className="h-7 w-7 p-0 opacity-40 hover:opacity-100 hover:bg-transparent">
               <Clock size={14} />
            </Button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "orders" ? (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full"
            >
               <div className="space-y-2 overflow-y-auto no-scrollbar pr-2">
                 {orders.length === 0 && !loading && (
                   <div className="h-32 flex flex-col items-center justify-center border border-dashed border-border/10 rounded-[3px] opacity-20">
                      <Clock size={24} />
                      <p className="text-[8px] font-black uppercase mt-2 tracking-widest">Aucue commande</p>
                   </div>
                 )}

                 {orders.map(order => (
                   <div 
                     key={order.id}
                     onClick={() => setSelectedOrder(order)}
                     className={cn(
                       "p-3 bg-muted/5 border border-border/10 rounded-[3px] cursor-pointer hover:border-[var(--primary-accent)]/50 transition-all group relative",
                       selectedOrder?.id === order.id && "border-[var(--primary-accent)] bg-[var(--primary-accent)]/5"
                     )}
                   >
                     <div className="flex items-start justify-between">
                       <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-tighter">Table {order.table_number}</span>
                             <Badge className={cn("text-[7px] h-4 font-black px-1.5 uppercase rounded-[2px] border", getStatusColor(order.status))}>
                               {getStatusLabel(order.status)}
                             </Badge>
                          </div>
                          <p className="text-[8px] opacity-30 font-bold uppercase tracking-widest">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[11px] font-black">{order.total_amount.toLocaleString()} CFA</p>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="bg-muted/5 border border-border/10 rounded-[3px] flex flex-col overflow-hidden">
                 {selectedOrder ? (
                   <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-border/5 bg-background/20 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-[3px] bg-[var(--primary-accent)]/10 flex items-center justify-center text-[var(--primary-accent)] font-black text-xs border border-[var(--primary-accent)]/20">
                              {selectedOrder.table_number}
                           </div>
                           <div>
                             <h3 className="text-xs font-black tracking-tight uppercase">Table {selectedOrder.table_number}</h3>
                             <p className="text-[8px] opacity-30 font-bold tracking-widest uppercase">ID #{selectedOrder.id}</p>
                           </div>
                         </div>
                         <Badge className={cn("text-[7px] font-black px-2 py-0.5 uppercase rounded-[2px] border", getStatusColor(selectedOrder.status))}>
                           {getStatusLabel(selectedOrder.status)}
                         </Badge>
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-2">
                         {selectedOrder.items?.map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between items-center py-1.5 border-b border-border/5 last:border-0 opacity-80 hover:opacity-100">
                             <div className="flex items-center gap-3 text-[10px]">
                                <span className="w-4 text-center font-black text-[var(--primary-accent)]">{item.qty}x</span>
                                <span className="font-bold">{item.product_name}</span>
                             </div>
                             <span className="text-[9px] font-black">{(item.qty * item.price).toLocaleString()}</span>
                           </div>
                         ))}
                      </div>
                      <div className="p-4 bg-background/20 border-t border-border/10 space-y-3">
                         <div className="flex justify-between items-center text-[11px] font-black uppercase">
                           <span className="opacity-30 tracking-[0.2em] text-[8px]">TOTAL</span>
                           <span>{selectedOrder.total_amount.toLocaleString()} CFA</span>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                           {selectedOrder.status === "pending" && <Button onClick={() => handleUpdateStatus(selectedOrder.id, "validated")} className="col-span-2 h-9 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-[8px] tracking-widest rounded-[3px]">Valider & Imprimer</Button>}
                           {selectedOrder.status === "validated" && <Button onClick={() => handleUpdateStatus(selectedOrder.id, "preparing")} className="col-span-2 h-9 bg-[var(--primary-accent)] text-white font-black uppercase text-[8px] tracking-widest rounded-[3px]">En Cuisine</Button>}
                           {selectedOrder.status === "preparing" && <Button onClick={() => handleUpdateStatus(selectedOrder.id, "served")} className="col-span-2 h-9 bg-blue-500 text-white font-black uppercase text-[8px] tracking-widest rounded-[3px]">Marquer Servie</Button>}
                           {selectedOrder.status === "served" && <Button onClick={() => handleUpdateStatus(selectedOrder.id, "completed")} className="col-span-2 h-9 bg-[var(--success)] text-white font-black uppercase text-[8px] tracking-widest rounded-[3px]">Payer & Clôturer</Button>}
                           <Button variant="outline" onClick={() => handleUpdateStatus(selectedOrder.id, "cancelled")} className="h-8 text-[7px] font-black uppercase rounded-[3px] border-destructive/20 text-destructive">Annuler</Button>
                           <Button 
                             variant="outline" 
                             className="h-8 text-[7px] font-black uppercase rounded-[3px]" 
                             onClick={() => { 
                               setLastTicket({ 
                                 companyName: company?.name || "Restaurant", 
                                 logoUrl: company?.logo_url,
                                 shopType: shopType,
                                 number: "T-" + selectedOrder.id, 
                                 date: new Date().toLocaleString(), 
                                 items: selectedOrder.items.map((i: any) => ({ name: i.product_name, price: i.price, qty: i.qty, total: i.price * i.qty })), 
                                 total: selectedOrder.total_amount,
                                 attributes: { table_number: selectedOrder.table_number }
                               }); 
                               setTimeout(() => window.print(), 500); 
                             }}
                           >
                             Facture <Printer size={12} />
                           </Button>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-10 text-center grayscale">
                      <Utensils size={32} className="mb-2" />
                      <p className="text-[8px] font-black uppercase tracking-widest">Aucune sélection</p>
                   </div>
                 )}
               </div>
            </motion.div>
          ) : (
            <motion.div 
              key="tables"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 overflow-y-auto no-scrollbar pb-10"
            >
               {Array.isArray(tables) && tables.map((table, idx) => {
                 const session = activeSessions.find(s => s.table_number === table.number && s.is_active);
                 return (
                    <div 
                      key={idx}
                      className={cn(
                        "p-4 rounded-[3px] border transition-all duration-300 relative group aspect-video flex flex-col items-center justify-center",
                        session 
                          ? "bg-[var(--primary-accent)]/5 border-[var(--primary-accent)]/30" 
                          : "bg-muted/5 border-border/10 hover:border-border/30 shadow-sm"
                      )}
                    >
                       <div className={cn(
                         "w-7 h-7 rounded-[3px] flex items-center justify-center mb-1 text-xs font-black",
                         session ? "bg-[var(--primary-accent)] text-white" : "bg-muted/10 text-muted-foreground border border-border/10"
                       )}>
                          {table.number}
                       </div>
                       
                       <div className="text-center">
                          {session ? (
                             <Badge variant="outline" className="text-[7px] border-[var(--primary-accent)]/20 text-[var(--primary-accent)] bg-transparent rounded-[2px] h-3.5 uppercase px-1">
                                {session.access_code}
                             </Badge>
                          ) : (
                             <p className="text-[7px] font-black opacity-20 uppercase tracking-[0.2em]">LIBRE</p>
                          )}
                       </div>

                       <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                         {!session && (
                           <button onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }} className="p-1 hover:bg-destructive/10 text-destructive rounded-[2px]">
                              <Trash2 size={10} />
                           </button>
                         )}
                       </div>

                       <div className="mt-2 flex gap-1">
                         {session ? (
                           <button onClick={() => handleCloseSession(session.id)} className="h-5 w-5 rounded-[2px] bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-colors border border-destructive/20">
                              <LogOut size={10} />
                           </button>
                         ) : (
                           <button onClick={() => setShowAssignModal(table)} className="h-5 w-5 rounded-[2px] bg-foreground text-background flex items-center justify-center hover:scale-110 shadow-lg shadow-black/10">
                              <Plus size={10} />
                           </button>
                         )}
                       </div>
                    </div>
                 );
               })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/60 backdrop-blur-[2px]">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[280px] bg-background border border-border/10 rounded-[3px] p-6 shadow-2xl"
            >
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Ouvrir Table {showAssignModal.number}</h3>
                  <button onClick={() => setShowAssignModal(null)} className="h-4 w-4 opacity-30 hover:opacity-100"><X size={14}/></button>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[8px] font-black uppercase tracking-widest opacity-30">Client Name</label>
                     <Input 
                        autoFocus
                        placeholder="Ex: M. Jean"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="h-9 bg-muted/5 border-border/10 rounded-[3px] text-[10px] font-bold"
                     />
                  </div>
                  <Button 
                    onClick={handleCreateSession}
                    className="w-full h-9 bg-[var(--primary-accent)] text-white font-black uppercase text-[8px] tracking-[0.2em] rounded-[3px]"
                  >
                     Générer Code
                  </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="hidden printable-area">
          {lastTicket && (
             <TicketTemplate 
               ref={ticketRef}
               companyName={lastTicket.companyName}
               logoUrl={lastTicket.logoUrl}
               shopType={lastTicket.shopType}
               ticketNumber={lastTicket.number}
               date={lastTicket.date}
               items={lastTicket.items}
               total={lastTicket.total}
               attributes={lastTicket.attributes}
             />
          )}
      </div>
    </div>
  );
}
