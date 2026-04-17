import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  BarChart3, 
  Receipt, 
  ClipboardList, 
  Truck, 
  Wallet,
  Utensils,
  Stethoscope,
  PenTool
} from "lucide-react";
import { getSystemNames } from "./system-names";

export type Role = "gerant" | "caisse" | "magasinier" | "comptable" | "livreur";
export type ShopType = "boutique" | "supermarche" | "quincaillerie" | "pharmacie" | "restaurant" | "autre";

export interface MenuItem {
  id: string;
  label: string;
  icon: any;
  requiredPermission?: string;
  options: { id: string; label: string; path: string; requiredPermission?: string }[];
}

export const getDashboardMenu = (role: Role, shopType: ShopType, enabledModules: string[] = [], companyName?: string): MenuItem[] => {
  const names = getSystemNames(shopType);
  const menus: MenuItem[] = [];

  // Common Menu for all roles
  menus.push({
    id: "dashboard",
    label: "Tableau de Bord",
    icon: LayoutDashboard,
    options: [
      { id: "overview", label: "Vue d'ensemble", path: "/dashboard", requiredPermission: "view_overview" },
      { id: "stats", label: "Statistiques", path: "/dashboard/stats", requiredPermission: "view_stats" },
    ],
  });

  // Role Based Menus
  if (role === "gerant") {
    menus.push({
      id: "sales",
      label: names.sales,
      icon: ShoppingCart,
      requiredPermission: "view_history",
      options: [
        { id: "history", label: "Historique", path: "/dashboard/sales/history", requiredPermission: "view_history" },
        { id: "reports", label: "Rapports", path: "/dashboard/sales/reports", requiredPermission: "view_reports" },
      ],
    });

    menus.push({
      id: "inventory",
      label: names.inventory,
      icon: names.inventoryIcon,
      requiredPermission: "view_stock",
      options: [
        { id: "items", label: names.items, path: "/dashboard/inventory/items", requiredPermission: "view_stock" },
        { id: "categories", label: "Catégories", path: "/dashboard/inventory/categories", requiredPermission: "edit_stock" },
        { id: "suppliers", label: "Fournisseurs", path: "/dashboard/inventory/suppliers", requiredPermission: "view_stock" },
      ],
    });

    menus.push({
      id: "finance",
      label: "Finance",
      icon: Wallet,
      requiredPermission: "view_balance",
      options: [
        { id: "expenses", label: "Dépenses", path: "/dashboard/finance/expenses", requiredPermission: "view_reports" },
        { id: "income", label: "Recettes", path: "/dashboard/finance/income", requiredPermission: "view_reports" },
        { id: "balance", label: "Bilan", path: "/dashboard/finance/balance", requiredPermission: "view_balance" },
        { id: "budgets", label: "Budgets & Alertes", path: "/dashboard/finance/budgets", requiredPermission: "view_balance" },
        { id: "finance-history", label: "Historique", path: "/dashboard/finance/history", requiredPermission: "view_reports" },
      ],
    });

    menus.push({
      id: "users",
      label: "Utilisateurs",
      icon: Users,
      requiredPermission: "manage_users",
      options: [
        { id: "staff", label: "Personnel", path: "/dashboard/users/staff", requiredPermission: "manage_users" },
        { id: "roles", label: "Rôles & Droits", path: "/dashboard/users/roles", requiredPermission: "edit_roles" },
      ],
    });

    menus.push({
      id: "settings",
      label: "Paramètres",
      icon: Settings,
      options: [
        { id: "shop", label: names.shopLabel, path: "/dashboard/settings/shop" },
        { id: "taxes", label: "Taxes & Unités", path: "/dashboard/settings/taxes" },
      ],
    });

    menus.push({
      id: "history",
      label: "Traçabilité",
      icon: ClipboardList,
      options: [
        { id: "stock-history", label: "Historique", path: "/dashboard/history/stock" },
        { id: "stock-logs", label: "Logs Temps Réel", path: "/dashboard/history/logs" },
      ],
    });
    menus.push({
      id: "pos",
      label: "Caisse",
      icon: Receipt,
      requiredPermission: "create_sale",
      options: [
        ...(shopType !== "restaurant" ? [{ id: "sell", label: "Nouvelle Vente", path: "/dashboard/pos/sell", requiredPermission: "create_sale" }] : []),
        ...(shopType === "restaurant" ? [{ id: "restaurant-orders", label: "Commandes Tables", path: "/dashboard/pos/restaurant", requiredPermission: "create_sale" }] : []),
        { id: "history", label: shopType === "restaurant" ? "Historique des Commandes" : "Historique de vente", path: "/dashboard/pos/history", requiredPermission: "view_history" },
        ...(shopType !== "restaurant" ? [{ id: "close", label: "Clôture", path: "/dashboard/pos/close", requiredPermission: "view_overview" }] : []),
      ],
    });
  }

  if (role === "caisse") {
    menus.push({
      id: "pos",
      label: "Caisse",
      icon: Receipt,
      requiredPermission: "create_sale",
      options: [
        ...(shopType !== "restaurant" ? [{ id: "sell", label: "Nouvelle Vente", path: "/dashboard/pos/sell", requiredPermission: "create_sale" }] : []),
        ...(shopType === "restaurant" ? [{ id: "restaurant-orders", label: "Commandes Tables", path: "/dashboard/pos/restaurant", requiredPermission: "create_sale" }] : []),
        { id: "history", label: shopType === "restaurant" ? "Historique des Commandes" : "Historique de vente", path: "/dashboard/pos/history", requiredPermission: "view_history" },
        ...(shopType !== "restaurant" ? [{ id: "close", label: "Clôture", path: "/dashboard/pos/close", requiredPermission: "view_overview" }] : []),
      ],
    });
  }

  if (role === "magasinier") {
    menus.push({
      id: "inventory",
      label: names.inventory,
      icon: names.inventoryIcon,
      requiredPermission: "view_stock",
      options: [
        { id: "items", label: names.items, path: "/dashboard/inventory/items", requiredPermission: "view_stock" },
        { id: "categories", label: "Catégories", path: "/dashboard/inventory/categories", requiredPermission: "edit_stock" },
        { id: "suppliers", label: "Fournisseurs", path: "/dashboard/inventory/suppliers", requiredPermission: "view_stock" },
      ],
    });

    menus.push({
      id: "stock-reports",
      label: "Stock & Analyse",
      icon: BarChart3,
      requiredPermission: "view_reports",
      options: [
        { id: "stock-stats", label: "Mouvements", path: "/dashboard/stock/stats", requiredPermission: "view_reports" },
        { id: "slow-moving", label: "Produits Dormants", path: "/dashboard/stock/slow", requiredPermission: "view_reports" },
      ],
    });

    menus.push({
      id: "history",
      label: "Traçabilité",
      icon: ClipboardList,
      options: [
        { id: "stock-history", label: "Historique", path: "/dashboard/history/stock" },
        { id: "stock-logs", label: "Logs Temps Réel", path: "/dashboard/history/logs" },
      ],
    });
  }

  if (role === "comptable") {
    menus.push({
      id: "finance",
      label: "Finance",
      icon: Wallet,
      requiredPermission: "view_reports",
      options: [
        { id: "expenses", label: "Dépenses", path: "/dashboard/finance/expenses", requiredPermission: "view_reports" },
        { id: "income", label: "Recettes", path: "/dashboard/finance/income", requiredPermission: "view_reports" },
        { id: "balance", label: "Bilan", path: "/dashboard/finance/balance", requiredPermission: "view_balance" },
        { id: "budgets", label: "Budgets & Alertes", path: "/dashboard/finance/budgets", requiredPermission: "view_balance" },
        { id: "finance-history", label: "Historique", path: "/dashboard/finance/history", requiredPermission: "view_reports" },
      ],
    });
  }

  if (role === "livreur") {
    menus.push({
      id: "logistics",
      label: "Livraisons",
      icon: Truck,
      options: [
        { id: "pending", label: "En cours", path: "/dashboard/logistics/pending" },
        { id: "done", label: "Terminées", path: "/dashboard/logistics/done" },
      ],
    });
  }

  // Filtrage par modules activés (si spécifié)
  if (enabledModules.length > 0) {
    return menus.filter(m => enabledModules.includes(m.id) || m.id === "dashboard" || m.id === "settings");
  }

  return menus;
};
