"use client";

import React from "react";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Utensils } from "lucide-react";
import { OverviewModule } from "@/components/dashboard/modules/OverviewModule";
import { InventoryModule } from "@/components/dashboard/modules/InventoryModule";
import { CategoriesModule } from "@/components/dashboard/modules/CategoriesModule";
import { POSModule } from "@/components/dashboard/modules/POSModule";
import { StaffModule } from "@/components/dashboard/modules/StaffModule";
import { ExpensesModule } from "@/components/dashboard/modules/ExpensesModule";
import { IncomeModule } from "@/components/dashboard/modules/IncomeModule";
import { BalanceModule } from "@/components/dashboard/modules/BalanceModule";
import { BudgetsModule } from "@/components/dashboard/modules/BudgetsModule";
import { SuppliersModule } from "@/components/dashboard/modules/SuppliersModule";
import { FinanceHistoryModule } from "@/components/dashboard/modules/FinanceHistoryModule";

import { StatsModule } from "@/components/dashboard/modules/StatsModule";
import { HistoryModule } from "@/components/dashboard/modules/HistoryModule";
import { ReportsModule } from "@/components/dashboard/modules/ReportsModule";
import { RolesModule } from "@/components/dashboard/modules/RolesModule";
import { SettingsModule } from "@/components/dashboard/modules/SettingsModule";
import { ShopModule } from "@/components/dashboard/modules/ShopModule";
import { TaxesUnitsModule } from "@/components/dashboard/modules/TaxesUnitsModule";
import { LogisticsModule } from "@/components/dashboard/modules/LogisticsModule";
import { CloseModule } from "@/components/dashboard/modules/CloseModule";
import { ReceiveModule } from "@/components/dashboard/modules/ReceiveModule";
import { MovementsModule } from "@/components/dashboard/modules/MovementsModule";
import { StockReportsModule } from "@/components/dashboard/modules/StockReportsModule";
import { InventoryLogsModule } from "@/components/dashboard/modules/InventoryLogsModule";
import { RestaurantPOS } from "@/components/dashboard/modules/RestaurantPOS";

// Composant de remplacement pour les fonctionnalités en cours de développement
const PlaceholderModule = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50 animate-in fade-in duration-700">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/20">
      <div className="w-8 h-8 rounded-full border-2 border-dashed border-primary animate-spin" />
    </div>
    <div className="text-center">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Module {title}</h3>
      <p className="text-[8px] uppercase tracking-widest">Données en attente ou module en cours de développement</p>
    </div>
  </div>
);

function DashboardContent() {
  // Dispatcher pour afficher le bon module
  const renderModule = (option: string) => {
    switch (option) {
      case "overview":
        return <OverviewModule />;
      
      // STOCKS / INVENTAIRE
      case "items":
      case "inventory":
        return <InventoryModule />;
      case "categories":
        return <CategoriesModule />;
      case "suppliers":
        return <SuppliersModule />;
      
      // VENTES / CAISSE
      case "sell":
      case "pos":
        return <POSModule />;
      case "restaurant-orders":
        return <RestaurantPOS />;
      case "history":
        return <HistoryModule />;
      case "close":
        return <CloseModule />;

      // PERSONNEL
      case "staff":
        return <StaffModule />;
      case "roles":
        return <RolesModule />;
      
      // FINANCE
      case "expenses":
        return <ExpensesModule />;
      case "income":
        return <IncomeModule />;
      case "balance":
        return <BalanceModule />;
      case "budgets":
        return <BudgetsModule />;
      case "finance-history":
        return <FinanceHistoryModule />;
      case "reports":
        return <ReportsModule />;
      
      // STATISTIQUES
      case "stats":
        return <StatsModule />;

      // LOGISTIQUE / MAGASINIER / ANALYSE
      case "stock-stats":
      case "slow-moving":
      case "receive":
      case "move":
      case "logistics":
      case "stock-history":
      case "stock-logs":
        return <LogisticsModule />;

      // RÉGLAGES
      case "shop":
      case "taxes":
      case "settings":
        return <SettingsModule />;
      default:
        return <PlaceholderModule title={option} />;
    }
  };

  const { 
    activeOption: contextOption, 
    newOrderEvent, 
    clearNewOrderEvent, 
    setActiveOption,
  } = useDashboard();
  
  const [moduleParam, setModuleParam] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setModuleParam(params.get("module"));
    } catch {}
  }, []);
  
  // Priorité au paramètre d'URL (pour les iframes des onglets)
  const activeOption = moduleParam || contextOption;

  // Synchronisation du paramètre d'URL avec le contexte local
  // pour que la Sidebar sélectionne le bon élément au chargement de l'onglet
  React.useEffect(() => {
    if (moduleParam && moduleParam !== contextOption) {
      setActiveOption(moduleParam);
    }
  }, [moduleParam, setActiveOption, contextOption]);

  return (
    <div className="h-full relative overflow-hidden">
      {/* NOTIFICATION FLOTTANTE TEMPS RÉEL */}
      <AnimatePresence>
        {newOrderEvent && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-[999] flex justify-center pointer-events-none"
          >
            <div className="bg-card/90 backdrop-blur-xl border border-[var(--primary-accent)]/30 p-2 pl-4 pr-2 rounded-[3px] shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center gap-6 pointer-events-auto min-w-[320px]">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] rounded-[3px] flex items-center justify-center animate-pulse">
                     <Utensils size={16} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary-accent)]">Nouvelle Commande</span>
                     <span className="text-[11px] font-bold text-foreground">Table {newOrderEvent.table_number} • {newOrderEvent.total_amount?.toLocaleString()} CFA</span>
                  </div>
               </div>
               
               <div className="flex gap-2">
                  <button 
                    onClick={() => {
                        setActiveOption("restaurant-orders");
                        clearNewOrderEvent();
                    }}
                    className="px-4 py-2 bg-[var(--primary-accent)] text-white text-[9px] font-black uppercase tracking-widest rounded-[3px] hover:opacity-90 transition-all"
                  >
                    Voir
                  </button>
                  <button 
                    onClick={clearNewOrderEvent}
                    className="p-2 text-muted-foreground/40 hover:text-foreground transition-all"
                  >
                    <X size={14} />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-full">
        {renderModule(activeOption)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
