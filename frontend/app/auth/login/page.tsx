"use client";
import { API_URL } from "@/lib/config";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Lock,
  Store,
  ChevronLeft,
  Settings2,
  UserPlus,
  CheckCircle2,
  Layers,
  ChefHat,
  Truck,
  Calculator,
  UserCheck,
  Eye,
  EyeOff,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  ClipboardList,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AuthView = "login" | "signup" | "onboarding";

const SHOP_TYPES = [
  { label: "Boutique", value: "boutique" },
  { label: "Supermarché", value: "supermarche" },
  { label: "Quincaillerie", value: "quincaillerie" },
  { label: "Pharmacie", value: "pharmacie" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Autre", value: "autre" },
];

const AVAILABLE_ROLES = [
  {
    id: "gerant",
    label: "Gérant",
    icon: UserCheck,
    description: "Accès total",
  },
  {
    id: "caisse",
    label: "Caissier",
    icon: Calculator,
    description: "Ventes & Encaissement",
  },
  {
    id: "magasinier",
    label: "Magasinier",
    icon: Layers,
    description: "Stocks & Inventaire",
  },
  {
    id: "comptable",
    label: "Comptable",
    icon: Calculator,
    description: "Finance & Bilan",
  },
  { id: "livreur", label: "Livreur", icon: Truck, description: "Logistique" },
];

const AVAILABLE_MODULES = [
  { id: "sales", label: "Ventes & Commandes", icon: ShoppingCart },
  { id: "inventory", label: "Gestion des Stocks", icon: Package },
  { id: "pos", label: "Caisse / Point de Vente", icon: Receipt },
  { id: "finance", label: "Comptabilité & Bilan", icon: Wallet },
  { id: "history", label: "Traçabilité & Logs", icon: ClipboardList },
  { id: "users", label: "Gestion du Personnel", icon: Users },
];

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form States
  const [loginMode, setLoginMode] = useState<"admin" | "staff">("admin");
  const [establishment, setEstablishment] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [registeredCompanyId, setRegisteredCompanyId] = useState<number | null>(
    null,
  );

  const [shopType, setShopType] = useState("");
  const [customShopType, setCustomShopType] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["gerant"]);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "dashboard",
    "settings",
    "sales",
    "inventory",
    "pos",
    "finance",
    "history",
    "users",
  ]);

  // Safe navigation for Electron
  const safeNavigate = (path: string) => {
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      // On enlève le / initial s'il existe
      const cleanPath = path.startsWith("/") ? path.substring(1) : path;
      // On calcule le retour à la racine depuis /auth/login (profondeur 2)
      window.location.href = `../../${cleanPath}/index.html`;
    } else {
      window.location.href = path;
    }
  };

  // Auto-redirect if already logged in
  React.useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      safeNavigate("/dashboard");
    }
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Pour les clients en mode "staff", on autorise un mot de passe vide ou identique au username
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          establishment,
          username: loginMode === "admin" ? "" : username,
          password: loginMode === "admin" ? password : password || username,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur de connexion");

      // Store token & user info
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.dispatchEvent(new Event("user-logged-in"));

      // Redirect based on role
      if (data.user.role === "client") {
        const orderPath = `/ordering?companyId=${data.user.company_id}&table=${data.user.table_number}`;
        safeNavigate(orderPath);
      } else {
        safeNavigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);
    setError("");
    setSuggestions([]);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: establishment, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (
          data.detail &&
          typeof data.detail === "object" &&
          data.detail.suggestions
        ) {
          setSuggestions(data.detail.suggestions);
          throw new Error(data.detail.message || "Ce nom est déjà pris");
        }
        throw new Error(data.detail || "Erreur d'inscription");
      }

      setRegisteredCompanyId(data.company_id);
      setRegisteredUser(data);
      setView("onboarding");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingFinalize = async () => {
    setIsLoading(true);
    setError("");
    try {
      const finalType = shopType === "autre" ? customShopType : shopType;
      const res = await fetch(`${API_URL}/auth/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: registeredCompanyId,
          type: finalType,
          roles: selectedRoles,
          modules: selectedModules,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur onboarding");

      // After onboarding, go to login or auto-login
      setView("login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    if (roleId === "gerant") return; // Gérant is mandatory
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId],
    );
  };

  const containerVariants = {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-background">
      {/* --- BACKGROUND ANIMATED LINES --- */}
      <div className="absolute left-[5%] lg:left-[10%] top-0 h-full w-[1px] bg-border/40 overflow-hidden">
        <motion.div
          initial={{ top: "-20%" }}
          animate={{ top: "120%" }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "linear",
            delay: 1,
          }}
          className="absolute left-0 w-full h-24 bg-linear-to-b from-transparent via-[#e188ff] to-transparent"
        />
      </div>
      <div className="absolute right-[5%] lg:right-[10%] top-0 h-full w-[1px] bg-border/40 overflow-hidden">
        <motion.div
          initial={{ top: "-20%" }}
          animate={{ top: "120%" }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "linear",
            delay: 3,
          }}
          className="absolute left-0 w-full h-24 bg-linear-to-b from-transparent via-[#e188ff] to-transparent"
        />
      </div>

      {/* --- BACK BUTTON --- */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-8 left-[7%] lg:left-[12%]"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            view === "login"
              ? safeNavigate("/")
              : setView(view === "onboarding" ? "signup" : "login")
          }
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={14} />
          <span className="text-[10px] uppercase tracking-widest font-bold">
            {view === "login" ? "Retour" : "Précédent"}
          </span>
        </Button>
      </motion.div>

      {/* --- AUTH CARD --- */}
      <div className="z-10 w-full max-w-[360px] px-6">
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div
              key="login"
              variants={containerVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8 text-center">
                <span className="text-[8px] uppercase tracking-[0.5em] text-muted-foreground mb-3 block">
                  Authentification
                </span>
                <h1 className="text-xl font-light tracking-tight text-foreground">
                  Accès{" "}
                  <span className="font-bold text-muted-foreground/80">
                    Système
                  </span>
                </h1>
              </div>

              {/* LOGIN MODE TABS */}
              <div className="flex p-1 bg-muted/20 rounded-[4px] mb-6 border border-border/10">
                <button
                  onClick={() => setLoginMode("admin")}
                  className={cn(
                    "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[3px] transition-all",
                    loginMode === "admin"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground/40 hover:text-muted-foreground",
                  )}
                >
                  Gérant
                </button>
                <button
                  onClick={() => setLoginMode("staff")}
                  className={cn(
                    "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-[3px] transition-all",
                    loginMode === "staff"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground/40 hover:text-muted-foreground",
                  )}
                >
                  Collaborateur
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-establishment"
                    className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground/60"
                  >
                    <Store size={10} /> Établissement
                  </Label>
                  <Input
                    id="login-establishment"
                    placeholder="Nom de votre commerce"
                    className="h-10 rounded-[3px] bg-background/40 border-border/20 text-xs"
                    value={establishment}
                    onChange={(e) => setEstablishment(e.target.value)}
                  />
                </div>
                <AnimatePresence mode="wait">
                  {loginMode === "staff" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label
                        htmlFor="login-username"
                        className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground/60"
                      >
                        Matricule / Identifiant
                      </Label>
                      <Input
                        id="login-username"
                        placeholder="Ex: caisse_01, jean_p"
                        className="h-10 rounded-[3px] bg-background/40 border-border/20 text-xs"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-password"
                    className="text-[10px] uppercase font-bold text-muted-foreground/60"
                  >
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-10 rounded-[3px] bg-background/40 border-border/20 text-xs pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-[10px] text-destructive text-center">
                    {error}
                  </p>
                )}
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 gap-2"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {isLoading ? "Chargement..." : "Connexion"}
                  </span>
                  <ArrowRight size={14} />
                </Button>
                <div className="pt-4 text-center">
                  <p className="text-[9px] text-muted-foreground">
                    Nouvel établissement ? <br />
                    <button
                      onClick={() => setView("signup")}
                      className="text-foreground hover:text-[#e188ff] font-bold uppercase tracking-tighter transition-colors"
                    >
                      Créer un compte
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === "signup" && (
            <motion.div
              key="signup"
              variants={containerVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8 text-center">
                <span className="text-[8px] uppercase tracking-[0.5em] text-[#e188ff] mb-3 block">
                  Étape 1/2
                </span>
                <h1 className="text-xl font-light tracking-tight text-foreground">
                  Nouveau{" "}
                  <span className="font-bold text-muted-foreground/80">
                    Compte
                  </span>
                </h1>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-establishment">
                    Nom de l'établissement
                  </Label>
                  <Input
                    id="signup-establishment"
                    placeholder="Ex: Supermarché Central"
                    value={establishment}
                    onChange={(e) => {
                      setEstablishment(e.target.value);
                      if (suggestions.length > 0) setSuggestions([]);
                    }}
                  />
                </div>

                {/* SUGGESTIONS LIST */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2 p-3 bg-[#e188ff]/5 border border-[#e188ff]/20 rounded-[3px]"
                    >
                      <p className="text-[8px] uppercase font-bold text-[#e188ff] tracking-widest">
                        Suggestions disponibles :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setEstablishment(s);
                              setSuggestions([]);
                              setError("");
                            }}
                            className="px-2 py-1 text-[9px] bg-background border border-border/40 hover:border-[#e188ff] hover:text-[#e188ff] rounded-[3px] transition-all cursor-pointer font-medium"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">
                    Définir un Mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-[10px] text-destructive text-center">
                    {error}
                  </p>
                )}
                <Button
                  onClick={handleSignup}
                  disabled={isLoading}
                  className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 gap-2"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {isLoading ? "Validation..." : "Suivant"}
                  </span>
                  <ArrowRight size={14} />
                </Button>
                <div className="pt-4 text-center">
                  <p className="text-[9px] text-muted-foreground">
                    Déjà un compte ? <br />
                    <button
                      onClick={() => setView("login")}
                      className="text-foreground hover:text-[#e188ff] font-bold uppercase tracking-tighter transition-colors"
                    >
                      Se connecter
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === "onboarding" && (
            <motion.div
              key="onboarding"
              variants={containerVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 text-center">
                <span className="text-[8px] uppercase tracking-[0.5em] text-[#e188ff] mb-3 block">
                  Étape 2/2
                </span>
                <h1 className="text-xl font-light tracking-tight text-foreground">
                  Configuration{" "}
                  <span className="font-bold text-muted-foreground/80">
                    Initiale
                  </span>
                </h1>
              </div>

              <div className="space-y-5">
                {/* SHOP TYPE */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Type d'Établissement
                  </Label>
                  <Select
                    options={SHOP_TYPES}
                    value={shopType}
                    onChange={setShopType}
                    placeholder="Sélectionnez le type..."
                  />
                  {shopType === "autre" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Input
                        placeholder="Précisez le type (ex: Quincaillerie...)"
                        value={customShopType}
                        onChange={(e) => setCustomShopType(e.target.value)}
                        className="mt-2"
                      />
                    </motion.div>
                  )}
                </div>

                {/* ROLES SELECTOR */}
                {/* ROLES SELECTOR */}
                <div className="space-y-3">
                  <Label className="flex items-center justify-between">
                    <span>Types d'Utilisateurs</span>
                    <span className="text-[8px] opacity-40 uppercase tracking-tighter">
                      Sélection Multiple
                    </span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_ROLES.map((role) => {
                      const isSelected = selectedRoles.includes(role.id);
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={cn(
                            "flex flex-col items-start gap-1 rounded-[4px] border p-2 text-left transition-all",
                            isSelected
                              ? "border-[#e188ff] bg-[#e188ff]/5"
                              : "border-border bg-muted/20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100",
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <Icon
                              size={12}
                              className={
                                isSelected
                                  ? "text-[#e188ff]"
                                  : "text-muted-foreground"
                              }
                            />
                            {isSelected && (
                              <CheckCircle2
                                size={10}
                                className="text-[#e188ff]"
                              />
                            )}
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-tight">
                            {role.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MODULES SELECTOR (Only for Autre) */}
                {shopType === "autre" && (
                  <div className="space-y-3 pt-2 border-t border-border/10">
                    <Label className="flex items-center justify-between font-bold text-[10px] uppercase tracking-widest text-[#e188ff]">
                      Fonctionnalités à Activer
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_MODULES.map((mod) => (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModule(mod.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-[4px] border p-2 text-left transition-all",
                            selectedModules.includes(mod.id)
                              ? "border-[#e188ff] bg-[#e188ff]/5"
                              : "border-border bg-muted/20 grayscale opacity-60",
                          )}
                        >
                          <mod.icon
                            size={12}
                            className={
                              selectedModules.includes(mod.id)
                                ? "text-[#e188ff]"
                                : "text-muted-foreground"
                            }
                          />
                          <span className="text-[8px] font-bold uppercase tracking-tight">
                            {mod.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleOnboardingFinalize}
                  disabled={isLoading}
                  className="w-full h-9 bg-foreground text-background hover:bg-foreground/90 gap-2 mt-4 shadow-lg shadow-[#e188ff]/10"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {isLoading ? "Finalisation..." : "Terminer"}
                  </span>
                  <UserPlus size={14} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- FOOTER --- */}
      <div className="absolute bottom-6 left-0 w-full text-center z-20">
        <div className="w-full h-[1px] bg-border/20 mb-4" />
        <p className="text-[8px] font-black tracking-[0.4em] text-muted-foreground/30">
          ©{new Date().getFullYear()}.CM | Powered by GAS
        </p>
      </div>

      {/* --- FOOTER LINE --- */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-border/40 overflow-hidden">
        <motion.div
          initial={{ left: "-20%" }}
          animate={{ left: "120%" }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
            delay: 2,
          }}
          className="absolute top-0 w-24 h-full bg-linear-to-r from-transparent via-[#e188ff] to-transparent"
        />
      </div>
    </div>
  );
}
