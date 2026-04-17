import { 
  Package, 
  Utensils, 
  Stethoscope, 
  HardHat, 
  Store,
  PenTool,
  ShoppingCart,
  Receipt,
  LayoutDashboard
} from "lucide-react";

export type ShopType = "boutique" | "supermarche" | "quincaillerie" | "pharmacie" | "restaurant" | "autre";

interface SystemNaming {
  sales: string;
  inventory: string;
  items: string;
  inventoryIcon: any;
  overviewTitle: string;
  posTitle: string;
  shopLabel: string;
}

const NAMING_MAP: Record<ShopType, SystemNaming> = {
  boutique: {
    sales: "Ventes",
    inventory: "Stocks",
    items: "Articles",
    inventoryIcon: Package,
    overviewTitle: "Vue d'ensemble",
    posTitle: "Caisse",
    shopLabel: "Boutique"
  },
  supermarche: {
    sales: "Ventes",
    inventory: "Rayons",
    items: "Produits",
    inventoryIcon: Store,
    overviewTitle: "Performance Magasin",
    posTitle: "Caisse",
    shopLabel: "Supermarché"
  },
  quincaillerie: {
    sales: "Ventes",
    inventory: "Matériaux",
    items: "Articles",
    inventoryIcon: HardHat,
    overviewTitle: "Gestion de l'Entrepôt",
    posTitle: "Caisse",
    shopLabel: "Quincaillerie"
  },
  pharmacie: {
    sales: "Ventes",
    inventory: "Officine",
    items: "Médicaments",
    inventoryIcon: Stethoscope,
    overviewTitle: "Suivi Pharmacie",
    posTitle: "Caisse",
    shopLabel: "Pharmacie"
  },
  restaurant: {
    sales: "Commandes",
    inventory: "Cuisine",
    items: "Plats",
    inventoryIcon: Utensils,
    overviewTitle: "Vue d'ensemble Restaurant",
    posTitle: "Service / Caisse",
    shopLabel: "Restaurant"
  },
  autre: {
    sales: "Activité",
    inventory: "Gestion",
    items: "Éléments",
    inventoryIcon: PenTool,
    overviewTitle: "Mon Dashboard",
    posTitle: "Opérations",
    shopLabel: "Établissement"
  }
};

export const getSystemNames = (type: ShopType): SystemNaming => {
  return NAMING_MAP[type] || NAMING_MAP.boutique;
};
