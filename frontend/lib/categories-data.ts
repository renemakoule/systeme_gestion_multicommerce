export interface SmartCategory {
  name: string;
  subs?: string[];
}

export const SMART_CATEGORIES: Record<string, SmartCategory[]> = {
  supermarche: [
    { name: "Alimentation Générale", subs: ["Épicerie Sucrée", "Épicerie Salée", "Produits Frais", "Fruits & Légumes", "Boucherie & Poissonnerie"] },
    { name: "Boissons", subs: ["Eaux & Softs", "Vins & Spiritueux", "Boissons Chaudes"] },
    { name: "Hygiène & Soins", subs: ["Soins du Corps", "Hygiène Buccodentaire", "Parfumerie & Cosmétique"] },
    { name: "Entretien Maison", subs: ["Détergents & Lessives", "Ustensiles de Nettoyage"] },
    { name: "Électronique & Électroménager", subs: ["Petit Électroménager", "Gros Électroménager", "Accessoires Numériques"] },
    { name: "Bricolage & Jardin", subs: ["Petit Outillage", "Quincaillerie de base"] },
    { name: "Papeterie & Bureau", subs: ["Fournitures Scolaires", "Papier & Impression"] },
    { name: "Textile & Maison", subs: ["Linge de Maison", "Vêtements de base"] },
  ],
  boutique: [
    { name: "Prêt-à-Porter Homme", subs: ["Chemises & T-shirts", "Pantalons & Shorts", "Costumes & Vestes"] },
    { name: "Prêt-à-Porter Femme", subs: ["Robes & Jupes", "Hauts & Chemisiers", "Pantalons & Jeans"] },
    { name: "Habillement Enfant", subs: ["Nouveau-né & Bébé", "Garçons", "Filles"] },
    { name: "Chaussures", subs: ["Chaussures de ville", "Baskets & Sport", "Sandales & Pantoufles"] },
    { name: "Maroquinerie & Accessoires", subs: ["Sacs & Valises", "Bijoux & Montres", "Ceintures & Lunettes"] },
  ],
  quincaillerie: [
    { name: "Outillage Spécialisé", subs: ["Outillage à main", "Outillage Électroportatif", "Mesure & Traçage"] },
    { name: "Gros Matériaux", subs: ["Ciment, Chaux & Plâtre", "Fer à béton", "Agrégats (Sable, Gravier)"] },
    { name: "Plomberie & Sanitaire", subs: ["Tuyauterie & Raccords", "Robinetterie & Éviers", "WC & Sanitaires"] },
    { name: "Électricité & Éclairage", subs: ["Câbles & Fils", "Tableaux & Disjoncteurs", "Luminaires & Ampoules"] },
    { name: "Peinture & Étanchéité", subs: ["Peintures & Vernis", "Pinceaux & Rouleaux", "Étanchéité"] },
    { name: "Quincaillerie Bâtiment", subs: ["Serrures & Poignées", "Visserie & Boulons"] },
  ],
  restaurant: [
    { name: "Boissons", subs: ["Sodas & Jus", "Vins & Bières", "Café & Thé"] },
    { name: "Entrées", subs: ["Salades", "Soupes & Potages", "Amuse-bouches"] },
    { name: "Plats de Résistance", subs: ["Viandes & Grillades", "Poissons", "Plats Locaux", "Pates & Pizzas"] },
    { name: "Desserts", subs: ["Pâtisseries", "Glaces", "Fruits"] },
    { name: "Petit-Déjeuner", subs: ["Viennoiseries", "Omelettes"] },
  ],
  pharmacie: [
    { name: "Médicaments", subs: ["Antidouleurs", "Antibiotiques", "Dermatologie", "Cardiologie"] },
    { name: "Parapharmacie", subs: ["Soins Visage & Corps", "Dermo-cosmétique", "Hygiène"] },
    { name: "Santé Naturelle", subs: ["Phytothérapie", "Compléments Alimentaires"] },
    { name: "Bébé & Maman", subs: ["Laits & Nutrition", "Hygiène Bébé", "Accessoires"] },
    { name: "Matériel Médical", subs: ["Orthopédie", "Diagnostic", "Premiers Soins"] },
  ],
  autre: [
    { name: "Divers", subs: ["Non Classé"] },
    { name: "Services", subs: ["Main d'oeuvre", "Livraison"] },
  ]
};
