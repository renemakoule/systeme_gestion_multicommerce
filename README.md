# GASNexus — Système de Gestion Multi-Établissements

> **Global All Services Management System** — Une solution de gestion professionnelle complète pour boutiques, restaurants et commerces. Application desktop multi-plateforme avec synchronisation cloud, temps réel et intelligence artificielle intégrée.

---

## Table des Matières

1. [Présentation](#1-présentation)
2. [Architecture Technique](#2-architecture-technique)
3. [Structure du Projet](#3-structure-du-projet)
4. [Fonctionnalités Détaillées](#4-fonctionnalités-détaillées)
   - [4.1 Authentification & Onboarding](#41-authentification--onboarding)
   - [4.2 Point de Vente (POS) — Mode Boutique](#42-point-de-vente-pos--mode-boutique)
   - [4.3 Point de Vente — Mode Restaurant](#43-point-de-vente--mode-restaurant)
   - [4.4 Gestion des Stocks & Inventaire](#44-gestion-des-stocks--inventaire)
   - [4.5 Finance & Comptabilité](#45-finance--comptabilité)
   - [4.6 Statistiques & Analyses](#46-statistiques--analyses)
   - [4.7 Prévisions Intelligentes (IA)](#47-prévisions-intelligentes-ia)
   - [4.8 Logistique & Fournisseurs](#48-logistique--fournisseurs)
   - [4.9 Gestion des Utilisateurs & Rôles (RBAC)](#49-gestion-des-utilisateurs--rôles-rbac)
   - [4.10 Paramètres de l'Établissement](#410-paramètres-de-létablissement)
   - [4.11 Rapports & Exports](#411-rapports--exports)
   - [4.12 SuperAdmin — Panneau de Contrôle Global](#412-superadmin--panneau-de-contrôle-global)
   - [4.13 Synchronisation Cloud](#413-synchronisation-cloud)
   - [4.14 Temps Réel (WebSockets)](#414-temps-réel-websockets)
5. [Interface Utilisateur](#5-interface-utilisateur)
6. [Installation & Configuration](#6-installation--configuration)
7. [Démarrage de l'Application](#7-démarrage-de-lapplication)
8. [Variables d'Environnement](#8-variables-denvironnement)
9. [API Backend — Référence des Endpoints](#9-api-backend--référence-des-endpoints)
10. [Sécurité](#10-sécurité)

---

## 1. Présentation

**GASNexus** est une application de gestion commerciale desktop conçue pour les établissements professionnels en Afrique et dans les marchés émergents. Elle couvre l'intégralité du cycle d'exploitation d'un commerce :

- **Caisse (POS)** avec impression de tickets et QR codes
- **Gestion complète des stocks** avec alertes et logs d'audit
- **Module Restaurant** avec gestion de tables, sessions de repas et commandes en temps réel
- **Comptabilité simplifiée** (revenus, dépenses, budgets, bilan)
- **Prévisions économiques** basées sur un algorithme de Moyenne Mobile Pondérée (WMA)
- **Panneau SuperAdmin** pour la gestion centralisée des licences clients
- **Synchronisation automatique** vers un cloud PostgreSQL (Neon.tech)

L'application fonctionne **hors ligne** (SQLite local) avec synchronisation périodique vers le cloud. Elle peut être déployée en **application desktop** via Electron ou utilisée directement dans un navigateur web.

---

## 2. Architecture Technique

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELECTRON SHELL                           │
│  main.js : Lance le backend Python et charge le frontend Next   │
│  - Titre bar personnalisée (Windows titleBarStyle: hidden)      │
│  - Multi-fenêtres avec isolation de session (partitions)        │
│  - Auto-updater intégré (electron-updater)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
┌─────────▼──────────┐   ┌──────────▼──────────────┐
│   FRONTEND         │   │   BACKEND               │
│   Next.js 16       │   │   FastAPI + Uvicorn      │
│   React 19         │   │   Port 8001              │
│   TypeScript       │   │   Python 3.10+           │
│   Tailwind CSS v4  │   │                         │
│   Recharts         │   │   SQLModel (ORM)         │
│   Framer Motion    │◄──►   SQLite (local DB)      │
│   jsPDF + XLSX     │   │   PostgreSQL Neon (cloud)│
│   Radix UI         │   │                         │
│   Shadcn/ui        │   │   JWT Auth               │
│   Lucide Icons     │   │   WebSockets             │
└────────────────────┘   └──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   NEON.TECH (PostgreSQL)     │
                    │   Cloud Sync automatique     │
                    │   Toutes les 2 minutes       │
                    │   Cycle massif: 30 jours     │
                    └─────────────────────────────┘
```

### Stack Technologique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Shell Desktop | Electron | 41.x |
| Frontend Framework | Next.js | 16.2.1 |
| UI Library | React | 19.x |
| Langage Frontend | TypeScript | 5.x |
| CSS | Tailwind CSS | 4.x |
| Animations | Framer Motion | 12.x |
| Graphiques | Recharts | 3.x |
| Export PDF | jsPDF + jspdf-autotable | 4.x |
| Export Excel | XLSX | 0.18.x |
| Icônes | Lucide React | 1.x |
| Backend Framework | FastAPI | 0.115.x |
| ORM | SQLModel | 0.0.22 |
| Serveur ASGI | Uvicorn | 0.31.x |
| DB Locale | SQLite | — |
| DB Cloud | PostgreSQL (Neon.tech) | — |
| Authentification | JWT (python-jose) | — |
| Hachage | Bcrypt (passlib) | — |

---

## 3. Structure du Projet

```
systeme_gestion_market/
│
├── main.js                   # Point d'entrée Electron (root)
├── preload.js                # Preload script Electron (root)
├── package.json              # Dépendances Electron
│
├── backend/
│   ├── main.py               # Application FastAPI + WebSocket + Auth
│   ├── run_api.py            # Script de lancement Uvicorn
│   ├── requirements.txt      # Dépendances Python
│   ├── .env                  # Variables d'environnement (non versionné)
│   ├── systeme_gestion.db    # Base de données SQLite locale
│   │
│   ├── database/
│   │   ├── db.py             # Configuration SQLite + Neon (cloud_engine)
│   │   └── models.py         # Tous les modèles SQLModel
│   │
│   ├── routers/
│   │   ├── products.py       # CRUD produits, catégories, images
│   │   ├── sales.py          # Ventes, tickets, historique
│   │   ├── stats.py          # Statistiques & KPIs
│   │   ├── expenses.py       # Dépenses
│   │   ├── reports.py        # Génération rapports PDF/Excel
│   │   ├── suppliers.py      # Fournisseurs
│   │   ├── budgets.py        # Budgets
│   │   ├── forecasts.py      # Prévisions IA (WMA)
│   │   ├── restaurant.py     # Tables, sessions repas, commandes
│   │   ├── company.py        # Paramètres entreprise, logo
│   │   ├── users.py          # Gestion utilisateurs
│   │   ├── roles.py          # Rôles et permissions (RBAC)
│   │   └── superadmin.py     # Panneau admin global, licences, broadcast
│   │
│   └── services/
│       ├── auth.py           # JWT, hachage de mots de passe
│       ├── websocket.py      # Gestionnaire de connexions WebSocket
│       ├── cloud_sync.py     # Sync bidirectionnelle SQLite ↔ Neon
│       └── time_utils.py     # Utilitaires fuseau horaire (UTC offset)
│
└── frontend/
    ├── app/                  # Pages Next.js (App Router)
    │   ├── layout.tsx        # Layout racine avec ThemeProvider
    │   ├── page.tsx          # Page principale (dashboard)
    │   ├── login/            # Page de connexion
    │   ├── register/         # Page d'inscription
    │   ├── onboarding/       # Configuration initiale post-inscription
    │   ├── digital-menu/     # Menu digital public (clients restaurant)
    │   ├── order/            # Interface de commande client (self-service)
    │   └── superadmin/       # Panneau SuperAdmin (login + dashboard)
    │
    ├── components/
    │   ├── title-bar.tsx     # Barre de titre Electron personnalisée
    │   ├── AppTabsContext.tsx # Gestion multi-onglets
    │   ├── AppTabsLayout.tsx  # Layout avec onglets persistants
    │   │
    │   └── dashboard/
    │       ├── DashboardContext.tsx    # Context global (company, user, modules)
    │       ├── DashboardLayout.tsx    # Layout sidebar + contenu
    │       └── modules/               # Tous les modules fonctionnels
    │           ├── OverviewModule.tsx  # Tableau de bord principal
    │           ├── POSModule.tsx       # Caisse / Point de Vente boutique
    │           ├── RestaurantPOS.tsx   # Interface POS restaurant
    │           ├── HistoryModule.tsx   # Historique des ventes
    │           ├── InventoryModule.tsx # Gestion des stocks
    │           ├── InventoryLogsModule.tsx # Journal d'inventaire
    │           ├── CategoriesModule.tsx    # Catégories & Unités & Taxes
    │           ├── TaxesUnitsModule.tsx    # Gestion taxes et unités
    │           ├── SuppliersModule.tsx     # Fournisseurs
    │           ├── LogisticsModule.tsx     # Logistique entrante
    │           ├── ReceiveModule.tsx       # Réception de marchandises
    │           ├── MovementsModule.tsx     # Mouvements de stock
    │           ├── StockReportsModule.tsx  # Rapports de stock
    │           ├── ExpensesModule.tsx      # Dépenses
    │           ├── BudgetsModule.tsx       # Budgets
    │           ├── BalanceModule.tsx       # Bilan financier
    │           ├── FinanceHistoryModule.tsx # Historique financier
    │           ├── CloseModule.tsx          # Fermeture de caisse (Z-Report)
    │           ├── IncomeModule.tsx         # Revenus
    │           ├── StatsModule.tsx          # Statistiques & graphiques
    │           ├── ReportsModule.tsx        # Exports et rapports
    │           ├── RolesModule.tsx          # Rôles & droits
    │           ├── StaffModule.tsx          # Gestion du personnel
    │           ├── SettingsModule.tsx       # Paramètres avancés
    │           └── ShopModule.tsx           # Identité & modules boutique
    │
    ├── electron/
    │   ├── client.js         # Electron client (fenêtre caisse)
    │   ├── master.js         # Electron master (fenêtre principale)
    │   └── preload.js        # Preload script frontend
    │
    └── lib/
        └── config.ts         # Configuration API_URL
```

---

## 4. Fonctionnalités Détaillées

### 4.1 Authentification & Onboarding

#### Inscription d'un Établissement
- Création d'un compte via `/auth/register`
- Le **nom commercial** devient l'identifiant de l'établissement
- Un **matricule administrateur** est automatiquement dérivé du nom (ex: `ma_boutique`)
- Vérification d'unicité du nom **ET** du matricule avant création
- Si conflit : génération automatique de **3 suggestions de noms** disponibles (algorithme intelligent avec préfixes/suffixes valorisants)
- Création atomique : Entreprise + Utilisateur gérant en une seule transaction
- Notification automatique au SuperAdmin lors de chaque nouvelle inscription
- Push immédiat vers le cloud pour validation de la licence

#### Onboarding Post-Inscription
- Sélection du **type d'établissement** (boutique, restaurant, etc.)
- Activation des **modules fonctionnels** selon les besoins (Ventes, Stock, POS, Finance, Traçabilité, Personnel)
- La configuration des modules est stockée dans `enabled_modules` et filtre la navigation sidebar

#### Connexion
- Connexion par : **Nom de l'établissement** + **Matricule** + **Mot de passe**
- Le gérant peut se connecter sans matricule (connexion par rôle `gerant`)
- Génération d'un **JWT Bearer Token** avec expiration configurable
- **Connexion Client Restaurant** : Un client peut se connecter avec son code d'accès de session de table (token temporaire 4h, rôle `client`)

#### Gestion des Sessions Multi-Fenêtres (Electron)
- Chaque nouvelle fenêtre Electron reçoit une **partition de session unique** (`persist:session-TIMESTAMP`)
- Permet à plusieurs caisses de fonctionner simultanément, chacune connectée avec un compte différent, sans interférence de cookies/localStorage

---

### 4.2 Point de Vente (POS) — Mode Boutique

Accessible via **Caisse / Point de Vente** dans la sidebar.

#### Catalogue Produits
- Affichage de tous les produits actifs de l'entreprise avec image, nom, prix et stock disponible
- **Recherche en temps réel** par nom de produit
- **Filtrage par catégorie** via des onglets horizontaux
- Les produits avec stock épuisé sont automatiquement signalés

#### Constitution d'une Vente
- Ajout de produits au panier via un **clic simple**
- Modification de la **quantité** directement dans le panier (boutons + / -)
- Suppression d'un article du panier
- Champ **Remise** en pourcentage ou en montant fixe applicable à la vente entière
- Calcul automatique du **sous-total**, de la **taxe** (selon taux configuré) et du **total TTC**

#### Validation & Paiement
- Sélection du **mode de paiement** : Espèces, Mobile Money ou Carte
- Calcul automatique de la **monnaie à rendre** pour un paiement en espèces
- Vente validée → stock décrémenté automatiquement + `InventoryLog` de type `OUT` créé
- Option d'**annulation de vente** avec remise en stock (log de type `IN`)

#### Tickets de Caisse
- Génération d'un ticket imprimable au format HTML avec :
  - Logo et nom de l'établissement
  - Numéro de ticket unique (format `TKT-XXXXX`)
  - Liste des articles avec quantités et prix unitaires
  - Sous-total, remise, taxe, total
  - Mode de paiement
  - **QR Code SVG dynamique** pointant vers la page de reçu public
- Impression via l'API `window.print()` du navigateur ou Electron

---

### 4.3 Point de Vente — Mode Restaurant

Accessible via le module **RestaurantPOS**. Disponible uniquement si le type d'établissement est `restaurant`.

#### Gestion des Tables
- Vue cartographique de toutes les tables du restaurant
- Chaque table affiche son **statut** : Libre, Occupée, En attente de service
- Création et configuration des tables depuis le backend

#### Sessions de Repas (Dining Sessions)
- Ouverture d'une **session de repas** pour une table avec :
  - Nom du client (optionnel)
  - Code d'accès unique généré automatiquement
- Le code d'accès permet au client de se connecter à l'**interface de commande self-service**

#### Commandes Client Self-Service
- Page `/order` accessible depuis l'appareil du client (tablette, smartphone)
- Affichage du **menu digital** avec photos des plats, descriptions et prix
- Le client compose sa commande et la soumet
- La commande apparaît **instantanément** sur l'interface du staff (WebSocket)
- **Alerte sonore et visuelle** sur le dashboard du personnel lors d'une nouvelle commande

#### Gestion des Commandes (Staff)
- Liste de toutes les commandes en cours par table
- Validation d'une commande (statut `validated`) → notification client
- Marquage "Servi" (statut `completed`) → notification client
- Vue en temps réel sans rechargement de page

#### Interface de Commande Publique (Digital Menu)
- Page `/digital-menu` : Menu en lecture seule, accessible publiquement via QR code
- Affichage des produits par catégorie avec images

---

### 4.4 Gestion des Stocks & Inventaire

#### Catalogue Produits (`InventoryModule`)
- Création, modification et suppression de produits
- Champs : Nom, Description, Prix de vente, Prix d'achat, Catégorie, Fournisseur, Unité, Taxe associée, Stock actuel, Stock minimum (seuil d'alerte)
- **Upload d'image** produit (stocké en `backend/static/uploads/products/`)
- Affichage de l'image dans le POS et le menu digital
- Alerte visuelle lorsque le stock passe sous le seuil minimum
- Filtrage par catégorie, fournisseur ou statut de stock

#### Catégories (`CategoriesModule`)
- Création de catégories avec icône emoji, couleur personnalisée
- Support de **catégories parentes/enfants** (hiérarchie 2 niveaux)
- Les catégories structurent le catalogue produits et le menu digital

#### Taxes & Unités (`TaxesUnitsModule`)
- Création de taxes avec nom et taux en pourcentage (ex: TVA 18%)
- Assignation d'une taxe par défaut à un produit
- Gestion des unités de mesure (kg, litre, pièce, carton, etc.)

#### Journal d'Inventaire (`InventoryLogsModule`)
- Historique complet de tous les mouvements de stock (entrées/sorties)
- Chaque log contient : date, produit, type (`IN`/`OUT`/`ADJUST`), quantité, utilisateur responsable, motif
- Filtrage par date, type de mouvement, produit ou utilisateur
- Export Excel du journal

#### Mouvements de Stock (`MovementsModule`)
- Saisie manuelle d'un ajustement de stock (correction d'inventaire)
- Saisie d'une entrée de stock manuelle (approvisionnement hors commande fournisseur)

#### Rapports de Stock (`StockReportsModule`)
- Vue synthétique de l'état du stock avec valeur totale estimée
- Identification des produits en rupture ou proches du seuil
- Rapport de rotation des stocks sur une période
- Export PDF et Excel du rapport

---

### 4.5 Finance & Comptabilité

#### Revenus (`IncomeModule`)
- Vue agrégée des revenus issus des ventes sur une période sélectionnée
- Comparaison avec la période précédente

#### Dépenses (`ExpensesModule`)
- Enregistrement des dépenses opérationnelles avec : montant, catégorie, description, date, justificatif (optionnel)
- Liste filtrée par date et catégorie
- Calcul du total des dépenses sur la période

#### Budgets (`BudgetsModule`)
- Création de budgets par catégorie et par période (mensuel, trimestriel, annuel)
- Suivi en temps réel du budget consommé vs alloué
- Alerte visuelle lorsque le budget est dépassé
- Barre de progression par budget

#### Bilan Financier (`BalanceModule`)
- Vue synthétique **Revenus − Dépenses = Profit Net**
- Graphique d'évolution du profit sur les 12 derniers mois
- Indicateurs : Marge nette, Ratio dépenses/revenus

#### Historique Financier (`FinanceHistoryModule`)
- Journal complet de toutes les transactions (ventes + dépenses)
- Filtres combinés : période, type de transaction, montant min/max
- Export Excel

#### Fermeture de Caisse / Z-Report (`CloseModule`)
- Totalisation de toutes les ventes de la journée en cours
- Détail par mode de paiement (Espèces / Mobile Money / Carte)
- Nombre de transactions, montant total, remises accordées
- Génération d'un **rapport de clôture PDF**
- Historique des clôtures précédentes

---

### 4.6 Statistiques & Analyses

Module **Statistiques** (`StatsModule`) — tableau de bord analytique avancé.

#### KPIs Principaux
- **Chiffre d'Affaires** (jour, semaine, mois, année)
- **Nombre de ventes** sur la période
- **Panier moyen** par transaction
- **Taux d'annulation** des ventes
- **Bénéfice net** (CA − Dépenses)
- **Croissance** par rapport à la période précédente (%)

#### Graphiques
- **Courbe d'évolution du CA** (journalière, hebdomadaire, mensuelle, annuelle)
- **Graphique en barres** des ventes par catégorie de produits
- **Répartition des paiements** (camembert : espèces / mobile money / carte)
- **Top produits** vendus (volume + CA généré)
- **Top vendeurs** (classement des caissiers par CA)
- **Heatmap des horaires** de pointe de vente

#### Filtres Avancés
- Sélection de la période d'analyse
- Filtrage par vendeur utilisateur
- Granularité : jour / semaine / mois / année

---

### 4.7 Prévisions Intelligentes (IA)

Module de prévision basé sur l'**Algorithme WMA (Weighted Moving Average — Moyenne Mobile Pondérée)**.

> Les périodes récentes ont un poids plus élevé que les périodes anciennes, rendant les prévisions plus réactives aux tendances actuelles.

#### Prévisions des Ventes (`/previsions/data`)
- Analyse des **N dernières périodes** (semaines, mois, années)
- Génération de **M prévisions futures** avec :
  - Valeur projetée du CA
  - Intervalle de confiance (min / max) basé sur l'écart-type
- **Indice de fiabilité** (0-100%) calculé selon la volatilité des données
- Affichage : périodes analysées, algorithme utilisé

#### Prévisions Financières (`/previsions/finances`)
- Projection du **profit net futur** (Revenus − Dépenses)
- Historique complet revenus vs dépenses par période
- Prévision avec intervalles min/max

#### Prévisions de Stock (`/previsions/inventory`)
- Analyse de la **consommation historique** des produits (logs `OUT`)
- Prévision de la **consommation future** pour anticiper les réapprovisionnements
- Aide à la planification des commandes fournisseurs

#### Paramètres Configurables
- Granularité : `weekly` / `monthly` / `yearly`
- Nombre de périodes historiques à analyser (défaut : 12)
- Nombre de périodes futures à projeter (défaut : 3)
- Filtrage par utilisateur pour les prévisions de ventes

---

### 4.8 Logistique & Fournisseurs

#### Fournisseurs (`SuppliersModule`)
- Création et gestion de la fiche fournisseur : Nom, contact, téléphone, email, adresse
- Assignation d'un fournisseur à des produits du catalogue

#### Réception de Marchandises (`ReceiveModule`)
- Enregistrement d'une réception de commande fournisseur
- Sélection du fournisseur et des produits reçus avec quantités
- Mise à jour automatique du stock à la réception
- Création automatique d'un `InventoryLog` de type `IN`

#### Logistique (`LogisticsModule`)
- Vue d'ensemble des flux logistiques entrants
- Historique des réceptions par fournisseur et par produit

---

### 4.9 Gestion des Utilisateurs & Rôles (RBAC)

#### Personnel (`StaffModule`)
- Création de comptes employés avec : Nom complet, Matricule unique, Mot de passe, Rôle assigné
- Modification et désactivation de comptes
- Chaque employé est rattaché à l'entreprise (isolation multi-tenant)
- Historique des ventes par caissier

#### Rôles & Permissions (`RolesModule`)
- Système RBAC (Role-Based Access Control) avec rôles prédéfinis :
  - `gerant` : Accès complet à tous les modules
  - `caissier` : Accès au POS et à l'historique de ses propres ventes
  - `stock` : Accès à l'inventaire et aux mouvements de stock
  - `comptable` : Accès aux modules Finance et Rapports
  - Rôles personnalisables par l'administrateur
- Configuration granulaire des permissions par module et par action (lecture, création, modification, suppression)

---

### 4.10 Paramètres de l'Établissement

#### Identité Boutique (`ShopModule`)
- Modification du **Nom Commercial**
- Mise à jour des coordonnées : Téléphone, Email, Adresse physique
- **Upload du Logo** (format carré recommandé 1:1)
  - Le logo apparaît dans la sidebar, sur les tickets imprimés et rapports PDF
  - Fallback automatique sur les initiales du nom si aucun logo n'est défini
- Configuration du **secteur d'activité** (type)
- **Activation/Désactivation des modules** disponibles :
  - Ventes & Commandes
  - Gestion des Stocks
  - Caisse / Point de Vente
  - Comptabilité & Bilan
  - Traçabilité & Logs
  - Gestion du Personnel
- Les modules désactivés disparaissent de la navigation sidebar en temps réel

#### Paramètres Avancés (`SettingsModule`)
- Configuration du **fuseau horaire** (UTC offset)
- Configuration du **taux de taxe par défaut**
- Configuration de la **devise** affichée
- Paramètres d'affichage et de localisation

---

### 4.11 Rapports & Exports

Module **Rapports** (`ReportsModule`) — Génération de documents professionnels.

#### Formats d'Export Disponibles
- **PDF** : Via jsPDF + jspdf-autotable (frontend) ou ReportLab (backend)
- **Excel (XLSX)** : Via la librairie XLSX

#### Rapports Disponibles
| Rapport | Description | Format |
|---------|-------------|--------|
| Rapport de Ventes | Détail de toutes les ventes sur une période | PDF / Excel |
| Rapport de Stock | État complet du stock avec valeurs | PDF / Excel |
| Rapport Financier | Revenus, dépenses, profit net | PDF |
| Z-Report (Clôture) | Récapitulatif de fin de journée | PDF |
| Rapport Fournisseurs | Liste des fournisseurs et achats | Excel |
| Historique Inventaire | Journal complet des mouvements | Excel |

#### Tickets de Reçu Publics
- Chaque ticket de vente génère un **QR Code** pointant vers une URL publique
- La page `/receipt/[ticket_id]` affiche le reçu en ligne, consultable sans connexion
- Le reçu contient les informations complètes de la transaction

---

### 4.12 SuperAdmin — Panneau de Contrôle Global

Accessible via `/superadmin` — réservé à l'équipe technique GAS.

#### Authentification SuperAdmin
- Compte technique distinct avec identifiants séparés (`/superadmin/login`)
- JWT dédié `superadmin_token`

#### Tableau de Bord
- **KPIs globaux** : Total clients, En attente de validation, Actifs, Bloqués
- **Barre de recherche** de clients par nom d'établissement
- Tableau complet de tous les clients inscrits avec :
  - ID, Nom, Type d'établissement, Date de création
  - Statut de licence (`pending` / `active` / `locked`)
  - Date d'expiration de la licence
  - Nombre de caisses autorisées (max_devices)
  - Note de satisfaction (étoiles 1-5)

#### Gestion des Licences
- **Activation d'une licence client** avec configuration :
  - Durée : 5 jours (test) / 2 semaines / 30 jours / 3 mois / 6 mois / 1 an / Illimité
  - Nombre de caisses autorisées : 1, 2, 3, 5 ou 10
  - Fuseau horaire (UTC offset de -12 à +12)
  - Activation du module de satisfaction client (avis)
  - Fréquence des demandes d'avis (mensuelle, hebdomadaire, etc.)
- **Blocage d'un client** (licence `locked`) → refus immédiat de connexion
- Toutes les modifications de licence sont synchronisées vers le client via le cycle cloud

#### Centre de Diffusion (Broadcast)
- **Message individuel** : Envoyer un message à un client spécifique
- **Broadcast global** : Envoyer un message à TOUS les clients simultanément
- Chaque message peut contenir : Titre, Corps du message, Image (base64)
- **Demande d'avis de satisfaction** : Déclenche une popup de notation chez le client cible
- Historique des messages envoyés avec option de suppression
- La suppression d'un message sur le cloud le supprime localement chez le client au prochain cycle de sync

#### Centre de Notifications
- Liste de toutes les **notifications techniques** reçues :
  - Nouvelles inscriptions (`NEW_CLIENT`)
  - Nouveaux avis clients (`NEW_RATING`)
- Marquage comme lu / suppression de notifications
- **Compteur de non-lus** en temps réel sur l'icône cloche

#### Temps Réel SuperAdmin
- Connexion WebSocket au backend avec **reconnexion automatique** (retry toutes les 3 secondes)
- Réception immédiate des événements :
  - Nouvelle inscription → son d'alerte + notification push navigateur + bannière
  - Nouvel avis reçu → son d'alerte + notification push + bannière
- Notifications push navigateur (si permission accordée) même si l'onglet est en arrière-plan

---

### 4.13 Synchronisation Cloud

Le service `cloud_sync.py` gère la synchronisation bidirectionnelle entre la base SQLite locale et une base PostgreSQL hébergée sur **Neon.tech**.

#### Principe de Fonctionnement
1. **Cycle toutes les 2 minutes** : vérification de la connectivité internet
2. Si connecté, exécution de `perform_sync()` pour chaque entreprise locale
3. **Cycle massif tous les 30 jours** : synchronisation complète de toutes les données

#### Synchronisation Bidirectionnelle (Entreprise)
- **PUSH (Local → Cloud)** : Nom, type, adresse, téléphone, email
- **PULL (Cloud → Local)** : Statut licence, expiration, nombre de caisses, devise, taux de taxe, fuseau horaire, paramètres satisfaction

#### Tables Synchronisées (en ordre de dépendances)
1. SuperAdmins (global)
2. Entreprises (Company)
3. Utilisateurs (User)
4. Catégories (Category) — avec relations parent/enfant
5. Fournisseurs (Supplier)
6. Produits (Product) — avec liens catégorie et fournisseur
7. Tables Restaurant (RestaurantTable)
8. Sessions de Repas (DiningSession)
9. Ventes (Sale) — avec liens utilisateur et session
10. Détails de Vente (SaleItem) — avec liens vente et produit
11. Tickets (Ticket)
12. Logs d'Inventaire (InventoryLog)
13. Dépenses (Expense)
14. Budgets (Budget)
15. Permissions de Rôles (RolePermission)
16. Historiques de Rapports (ReportHistory)
17. Messages Système (SystemMessage) — Push + Pull
18. Notifications Techniques (TechnicalNotification)

#### Gestion des IDs en Cloud
- Chaque enregistrement local reçoit un **ID global unique** en cloud :
  `cloud_id = (company_id × 10_000_000) + local_id`
- Garantit l'unicité entre les données de différentes entreprises sur la base cloud partagée

#### Messages Système (Communication SuperAdmin → Client)
- Les messages créés par le SuperAdmin sur le cloud sont **rapatriés localement** à chaque cycle
- Les messages supprimés sur le cloud sont **automatiquement effacés** localement
- Le client voit les messages dans son dashboard sans aucune action manuelle

#### Rapport d'Intégrité
- À chaque cycle massif, un rapport est affiché dans les logs :
  - Comparaison du nombre d'enregistrements Local vs Cloud pour chaque table
  - Détection des enregistrements manquants

#### Push d'Inscription Immédiat
- Lors de chaque nouvelle inscription (`/auth/register`), un push immédiat vers Neon est déclenché en tâche de fond (sans attendre le cycle de 2 minutes)
- Une `TechnicalNotification` est créée sur le cloud pour alerter le SuperAdmin

---

### 4.14 Temps Réel (WebSockets)

#### Backend — Gestionnaire WebSocket
- Endpoint : `ws://localhost:8001/ws`
- Le `ConnectionManager` (singleton dans `services/websocket.py`) gère toutes les connexions actives
- **Broadcast automatique** déclenché par des hooks SQLAlchemy (`after_insert`, `after_update`, `after_delete`) sur les modèles vitaux :
  - Sale, Expense, Product, InventoryLog, Category, Supplier, Budget, Company, SystemMessage

#### Frontend — Client WebSocket
- Connexion établie au montage du dashboard
- **Reconnexion automatique** avec backoff (retry après 3 secondes en cas de déconnexion)
- Types de messages gérés :
  - `"refresh"` → Rechargement des données affichées
  - `"new_order"` → Alerte nouvelle commande restaurant (son + toast)
  - `"order_updated"` → Mise à jour du statut d'une commande
  - `"NEW_CLIENT"` → Nouvelle inscription (SuperAdmin)
  - `"NEW_RATING"` → Nouvel avis satisfaction (SuperAdmin)
  - `"satisfaction_request"` → Popup de notation (Client)
  - Messages de diffusion SuperAdmin → popup in-app

#### Barre de Titre Personnalisée (Electron IPC)
- La barre de titre Windows native est masquée (`titleBarStyle: 'hidden'`)
- Un composant React (`TitleBar`) reproduit les boutons de contrôle de fenêtre
- La couleur de la barre de titre se synchronise avec le thème actif via `ipcRenderer.send('sync-titlebar', { bg, fg })`

---

## 5. Interface Utilisateur

### Thème & Design
- **Dark mode par défaut** avec support du Light mode (next-themes)
- Palette de couleurs : violet/indigo comme couleur d'accent principale
- Design system : Shadcn/ui + Radix UI primitives
- Typographie : **Geist Sans** + **Geist Mono** (Google Fonts via Next.js)
- Animations : Framer Motion pour les transitions de pages et modales

### Navigation
- **Sidebar fixe** avec icônes et labels, filtrée selon les modules activés
- **Système multi-onglets** (`AppTabsContext`) : possibilité d'ouvrir plusieurs modules simultanément dans des onglets persistants
- Navigation préservée lors des changements d'onglets (pas de rechargement)

### Fenêtres Electron
- Fenêtre principale (master) : Dashboard complet
- Fenêtres secondaires (client) : Interface caisse isolée
- Chaque fenêtre est indépendante avec sa propre session de connexion

---

## 6. Installation & Configuration

### Prérequis

| Outil | Version Minimale |
|-------|-----------------|
| Node.js | 18.x LTS |
| Python | 3.10+ |
| npm | 9.x |
| pip | 23.x |

### 6.1 Configuration du Backend

```bash
# 1. Se positionner dans le dossier backend
cd backend

# 2. Créer un environnement virtuel Python
python -m venv venv

# 3. Activer l'environnement (Windows)
venv\Scripts\activate

# 4. Installer les dépendances Python
pip install -r requirements.txt

# 5. Configurer les variables d'environnement
# Créer le fichier backend/.env (voir section 8)
```

### 6.2 Configuration du Frontend

```bash
# Se positionner dans le dossier frontend
cd frontend

# Installer les dépendances Node.js
npm install
```

### 6.3 Configuration du Projet Electron (Racine)

```bash
# Se positionner à la racine du projet
cd systeme_gestion_market

# Installer les dépendances Electron
npm install
```

---

## 7. Démarrage de l'Application

### Mode Développement

Lancer les trois processus en parallèle :

**Terminal 1 — Backend FastAPI :**
```bash
cd backend
venv\Scripts\activate
python run_api.py
# ou
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

**Terminal 2 — Frontend Next.js :**
```bash
cd frontend
npm run dev
# Accessible sur http://localhost:3000
```

**Terminal 3 — Application Electron :**
```bash
# Fenêtre principale (dashboard avec gestion complète)
cd frontend
npm run nexus:master

# OU Fenêtre caisse isolée
npm run nexus:client
```

> En mode développement, Electron charge automatiquement `http://localhost:3000`

### Mode Production

```bash
# 1. Build du frontend Next.js
cd frontend
npm run build
# Génère le dossier frontend/out/

# 2. Package de l'application Electron
npm run electron-build  # (via electron-builder)
# Génère un .exe portable dans frontend/dist/
```

> En production, Electron charge directement les fichiers statiques depuis `frontend/out/index.html`

### Accès aux Interfaces

| Interface | URL |
|-----------|-----|
| Dashboard Principal | `http://localhost:3000` (dev) |
| API Backend | `http://localhost:8001` |
| Documentation API | `http://localhost:8001/docs` |
| Interface SuperAdmin | `http://localhost:3000/superadmin` |
| Menu Digital Public | `http://localhost:3000/digital-menu?company_id=X` |
| Interface Commande | `http://localhost:3000/order?company_id=X` |
| Reçu Public | `http://localhost:3000/receipt/[ticket_id]` |

---

## 8. Variables d'Environnement

### Backend — `backend/.env`

```env
# URL de connexion à la base cloud PostgreSQL (Neon.tech)
# Optionnel — La sync cloud est désactivée si non défini
CLOUD_DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# Clé secrète pour la signature des tokens JWT
SECRET_KEY=votre_cle_secrete_tres_longue_et_aleatoire

# Algorithme JWT (HS256 recommandé)
ALGORITHM=HS256

# Durée d'expiration du token en minutes (défaut: 480 = 8h)
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Frontend — `frontend/.env.local`

```env
# URL de l'API backend (utilisée par tous les composants frontend)
NEXT_PUBLIC_API_URL=http://localhost:8001
```

---

## 9. API Backend — Référence des Endpoints

Le backend expose ses endpoints via FastAPI. La documentation interactive complète est disponible sur `http://localhost:8001/docs`.

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/register` | Inscription d'un nouvel établissement |
| POST | `/auth/login` | Connexion (retourne JWT) |
| POST | `/auth/onboarding` | Configuration post-inscription |

### Entreprises

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/companies/{id}` | Récupérer les informations d'une entreprise |
| PUT | `/companies/{id}` | Modifier les informations |
| POST | `/companies/{id}/logo` | Uploader le logo |

### Produits & Catalogue

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/products/` | Liste des produits |
| POST | `/products/` | Créer un produit |
| PUT | `/products/{id}` | Modifier un produit |
| DELETE | `/products/{id}` | Supprimer un produit |
| POST | `/products/{id}/image` | Uploader une image produit |
| GET | `/categories/` | Liste des catégories |
| POST | `/categories/` | Créer une catégorie |

### Ventes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/sales/` | Historique des ventes |
| POST | `/sales/` | Créer une vente |
| POST | `/sales/{id}/cancel` | Annuler une vente |
| GET | `/tickets/{id}` | Récupérer un ticket |

### Statistiques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/stats/overview` | KPIs principaux |
| GET | `/stats/sales-over-time` | Évolution temporelle |
| GET | `/stats/top-products` | Produits les plus vendus |
| GET | `/stats/by-category` | Ventilation par catégorie |
| GET | `/stats/by-user` | Performance par vendeur |

### Prévisions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/previsions/data` | Prévisions de ventes (WMA) |
| GET | `/previsions/finances` | Prévisions financières |
| GET | `/previsions/inventory` | Prévisions de consommation |

### Finance

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/expenses/` | Liste des dépenses |
| POST | `/expenses/` | Créer une dépense |
| GET | `/budgets/` | Liste des budgets |
| POST | `/budgets/` | Créer un budget |

### Restaurant

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/restaurant/tables` | Liste des tables |
| POST | `/restaurant/tables` | Créer une table |
| POST | `/restaurant/sessions` | Ouvrir une session de repas |
| POST | `/restaurant/orders` | Soumettre une commande |
| PATCH | `/restaurant/orders/{id}/validate` | Valider une commande |
| PATCH | `/restaurant/orders/{id}/serve` | Marquer comme servi |

### SuperAdmin

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/superadmin/clients/` | Liste de tous les clients |
| POST | `/superadmin/clients/{id}/activate` | Activer/prolonger une licence |
| POST | `/superadmin/clients/{id}/block` | Bloquer un client |
| GET | `/superadmin/notifications` | Notifications techniques |
| PATCH | `/superadmin/notifications/{id}/read` | Marquer comme lu |
| POST | `/superadmin/broadcast/message` | Envoyer un message broadcast |
| DELETE | `/superadmin/broadcast/message/{id}` | Supprimer un message |
| POST | `/superadmin/broadcast/satisfaction` | Déclencher demande d'avis |

### WebSocket

| Protocole | Endpoint | Description |
|-----------|----------|-------------|
| WS | `/ws` | Connexion temps réel unique |

---

## 10. Sécurité

### Authentification
- Tous les tokens sont des **JWT signés** avec l'algorithme HS256
- Les mots de passe sont hachés avec **Bcrypt** (via passlib) avant stockage
- Les tokens expirent automatiquement (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)

### Isolation Multi-Tenant
- Chaque requête API inclut le `company_id` qui filtre strictement les données
- Il est impossible pour un utilisateur d'accéder aux données d'une autre entreprise
- Les sessions Electron sont isolées via des **partitions dédiées** par fenêtre

### Licences
- Le statut de licence (`pending`, `active`, `locked`) est contrôlé exclusivement par le SuperAdmin
- Un établissement avec licence `locked` ou `pending` ne peut pas accéder aux fonctionnalités
- La vérification s'effectue à chaque connexion et à chaque cycle de synchronisation cloud

### CORS
- Le backend autorise toutes les origines (`allow_origins=["*"]`) en développement
- ⚠️ **À restreindre** aux domaines autorisés en production

### Fichiers Statiques
- Les images uploadées (logos, photos produits) sont servies depuis `backend/static/uploads/`
- Les logos introuvables retournent une **image GIF transparente 1×1** au lieu d'une erreur 404, évitant le spam de logs

---

## Licence

Ce projet est une propriété privée de **GAS (Global All Services)**. Tous droits réservés.

---

*README généré le 17 Avril 2026 — GASNexus v2.0*
