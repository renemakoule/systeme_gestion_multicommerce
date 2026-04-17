"use client";
import { API_URL } from "@/lib/config";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TicketTemplate } from "@/components/dashboard/TicketTemplate";
import { Loader2, AlertCircle, ShoppingBag } from "lucide-react";

function TicketContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [ticketData, setTicketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(`${API_URL}/sales/ticket/${id}`);
        if (!res.ok) {
          throw new Error("Ticket introuvable ou expiré");
        }
        const data = await res.json();
        setTicketData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTicket();
    } else {
        setLoading(false);
        setError("Aucun identifiant de ticket fourni");
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-sm font-medium uppercase tracking-widest animate-pulse">
          Chargement de votre e-ticket...
        </p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Oups !</h1>
        <p className="text-slate-500 max-w-xs mx-auto mb-6">
          {error || "Nous n'avons pas pu trouver ce ticket."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-full hover:shadow-lg transition-all"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Formatting items for TicketTemplate
  const formattedItems = ticketData.items.map((item: any) => ({
    name: item.product_name,
    qty: item.quantity,
    price: item.unit_price,
    total: item.total,
  }));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-[72mm] bg-white shadow-2xl rounded-sm overflow-hidden transform transition-all hover:scale-[1.01]">
        {/* Animated Header for Web View */}
        <div className="bg-slate-900 text-white p-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
            E-Ticket Officiel
          </h2>
          <p className="text-[8px] font-medium opacity-40 mt-1 uppercase tracking-wider">
            Certifié par GAS Systeme
          </p>
        </div>

        <div className="p-1">
          <TicketTemplate
            companyName={ticketData.company_name || "Établissement"}
            logoUrl={ticketData.logo_url}
            ticketNumber={ticketData.ticket_number || `#${id}`}
            date={new Date(ticketData.timestamp).toLocaleString("fr-FR")}
            items={formattedItems}
            total={ticketData.total_amount}
            attributes={{
              payment_method: ticketData.payment_method,
              cashier_name: ticketData.user_name,
              table_number: ticketData.table_number,
              cash_received: ticketData.cash_received,
            }}
          />
        </div>

        {/* Action Buttons for User */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-2">
          <button
            onClick={() => window.print()}
            className="w-full py-3 bg-white border border-slate-200 text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            Télécharger en PDF
          </button>
          <p className="text-center text-[7px] text-slate-400 font-medium uppercase tracking-tight py-2">
            Merci pour votre visite !
          </p>
        </div>
      </div>

      {/* Decorative dots for "ticket" feel */}
      <div className="w-full max-w-[72mm] flex justify-between px-2 -mt-1 opacity-20">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-slate-300" />
        ))}
      </div>

      <footer className="mt-12 text-center space-y-1">
        <p className="text-[7px] text-slate-300 font-medium lowercase">
          Powered By GAS
        </p>
      </footer>
    </div>
  );
}

export default function PublicTicketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-sm font-medium uppercase tracking-widest">Chargement...</p>
      </div>
    }>
      <TicketContent />
    </Suspense>
  );
}
