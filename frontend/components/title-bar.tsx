"use client";
import { API_URL } from "@/lib/config";

import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Moon,
  Sun,
  Palette,
  Check,
  Plus,
  Copy,
  Monitor,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { applyColorTheme } from "@/lib/color-themes";
import { useAppTabs } from "./AppTabsContext";

// ─── Définition des palettes de couleur ───────────────────────────────────────
const COLOR_PALETTES = [
  { id: "nebula", label: "Nebula", description: "Indigo & Corail" },
  { id: "sakura", label: "Sakura", description: "Rose & Magenta" },
  { id: "arctic", label: "Arctic", description: "Marine & Ambre" },
  { id: "rose", label: "Rosé", description: "Blush poudré" },
  { id: "jade", label: "Jade", description: "Teal & Sauge" },
  { id: "dune", label: "Dune", description: "Sable & Océan" },
  { id: "orchid", label: "Orchid", description: "Lavande & Rose" },
  { id: "void", label: "Void", description: "Violet & Indigo" },
  { id: "obsidian", label: "Obsidian", description: "Neutre chaud" },
  { id: "aurora", label: "Aurora", description: "Bleu & Aqua" },
  { id: "prism", label: "Prism", description: "Multichrome" },
  { id: "khaki", label: "Khaki", description: "Olive & Or" },
  { id: "slate", label: "Slate", description: "Acier & Argent" },
  { id: "marine", label: "Marine", description: "Pétrole & Cyan" },
  { id: "abyss", label: "Abyss", description: "Nuit & Teal" },
  { id: "eclipse", label: "Eclipse", description: "Cobalt & Électrique" },
  { id: "dusk", label: "Dusk", description: "Graphite & Or" },
] as const;

type PaletteId = (typeof COLOR_PALETTES)[number]["id"] | null;

// ─── Hook : gestion du thème de couleur via styles inline ─────────────────────
// Utilise element.style.setProperty() → spécificité inline → toujours prioritaire
// sur :root et .dark, quelle que soit la compilation Tailwind.
function useColorTheme() {
  const { resolvedTheme } = useTheme();
  const [colorTheme, setColorThemeState] = useState<PaletteId>(null);

  // Initialisation depuis localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem("color-theme") as PaletteId;
    if (saved) {
      setColorThemeState(saved);
    }
  }, []);

  // Ré-applique le thème quand la palette OU le mode clair/sombre change
  useEffect(() => {
    if (resolvedTheme === undefined) return; // SSR : attendre l'hydratation
    applyColorTheme(colorTheme, resolvedTheme === "dark");
  }, [colorTheme, resolvedTheme]);

  const setColorTheme = useCallback((id: PaletteId) => {
    setColorThemeState(id);
    if (id) {
      localStorage.setItem("color-theme", id);
    } else {
      localStorage.removeItem("color-theme");
    }
  }, []);

  return { colorTheme, setColorTheme };
}

export const TitleBar = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const {
    openTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isRightPanelCollapsed,
    setIsRightPanelCollapsed,
  } = useAppTabs();

  const searchParams = useSearchParams();
  const isTabParam = searchParams.get("isTab") === "true";
  const [isInFrame, setIsInFrame] = useState(isTabParam);

  const mainMenus = ["Edit", "View"];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B (ou Cmd+B) -> Toggle Left Sidebar
      // Ctrl+Alt+B -> Toggle Right Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        if (e.altKey) {
          e.preventDefault();
          setIsRightPanelCollapsed((v) => !v);
        } else {
          e.preventDefault();
          setIsSidebarCollapsed((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsSidebarCollapsed, setIsRightPanelCollapsed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsInFrame(window.self !== window.top || isTabParam);
    }
  }, [isTabParam]);

  // Fonction de conversion robuste RGB(A) vers HEX (6 chiffres uniquement)
  const toHex = (color: string) => {
    const rgba = color.match(/\d+/g);
    if (!rgba || rgba.length < 3) return null;

    const r = parseInt(rgba[0]);
    const g = parseInt(rgba[1]);
    const b = parseInt(rgba[2]);

    // Formatage strict en #RRGGBB
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  };

  useEffect(() => {
    const syncWithElectron = () => {
      // Un délai un peu plus long pour laisser Next.js injecter les styles
      setTimeout(() => {
        const styles = getComputedStyle(document.body);

        // On récupère les couleurs réelles
        const rawBg = styles.backgroundColor;
        const rawFg = styles.color;

        const hexBg = toHex(rawBg);
        const hexFg = toHex(rawFg);

        // On n'envoie que si les deux couleurs sont validées en HEX
        if (window.electronAPI && hexBg && hexFg) {
          window.electronAPI.syncTitleBar({
            bg: hexBg,
            fg: hexFg,
          });
        }
      }, 300);
    };

    syncWithElectron();
  }, [resolvedTheme, colorTheme]);

  if (isInFrame) return null;

  return (
    <header className="drag-region fixed top-0 left-0 z-[100] flex h-9 w-full items-center bg-background border-b border-border/50 px-3 transition-colors duration-500">
      <div className="no-drag-region flex items-center h-full">
        <div className="flex items-center gap-2 mr-4 shrink-0">
          <img
            src="/logo_premium.png"
            alt="Logo"
            className="h-5 w-5 object-contain"
          />
        </div>

        <nav className="flex items-center gap-1">
          {/* Menu Fichier spécifique */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded-[3px] cursor-default outline-none">
                File
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-48 bg-popover/95 backdrop-blur-md border-border shadow-2xl p-1 no-drag-region rounded-[3px]"
            >
              <DropdownMenuItem
                onClick={() => {
                  const user = localStorage.getItem("user");
                  const url = user ? "/dashboard" : "/auth/login";
                  openTab(`tab-${Date.now()}`, "SESSION", url);
                }}
                className="text-[10px] py-2 flex items-center gap-2 cursor-default outline-none rounded-[3px]"
              >
                <Plus size={12} className="text-muted-foreground" />
                <span>Nouvel Onglet</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.electronAPI?.createNewWindow()}
                className="text-[10px] py-2 flex items-center gap-2 cursor-default outline-none rounded-[3px]"
              >
                <Monitor size={12} className="text-muted-foreground" />
                <span>Nouvelle Fenêtre</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {mainMenus.map((m) => (
            <button
              key={m}
              className="px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded-[3px] cursor-default outline-none"
            >
              {m}
            </button>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded-[3px] cursor-default outline-none">
                Window
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-48 bg-popover/95 backdrop-blur-md border-border shadow-2xl p-1 no-drag-region rounded-[3px]"
            >
              {/* ── Sous-menu Themes ── */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-[11px] py-2 flex items-center gap-2 cursor-default outline-none rounded-[3px]">
                  <Palette size={14} className="text-muted-foreground" />
                  <span>Themes</span>
                </DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent
                    sideOffset={10}
                    className="w-44 bg-popover/95 backdrop-blur-md border-border shadow-xl p-1 rounded-[3px] max-h-[70vh] overflow-y-auto"
                  >
                    {/* Mode clair / sombre */}
                    <DropdownMenuItem
                      id="theme-light"
                      onClick={() => setTheme("light")}
                      className="text-[10px] py-1.5 flex items-center gap-2 cursor-default outline-none rounded-[3px]"
                    >
                      <Sun size={12} />
                      <span className="flex-1">Clair</span>
                      {theme === "light" && (
                        <Check size={10} className="opacity-60" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      id="theme-dark"
                      onClick={() => setTheme("dark")}
                      className="text-[10px] py-1.5 flex items-center gap-2 cursor-default outline-none rounded-[3px]"
                    >
                      <Moon size={12} />
                      <span className="flex-1">Sombre</span>
                      {theme === "dark" && (
                        <Check size={10} className="opacity-60" />
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 opacity-30" />

                    {/* Palettes de couleur */}
                    <p className="px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Palettes
                    </p>

                    {/* Option "Défaut" pour réinitialiser */}
                    <DropdownMenuItem
                      id="theme-palette-default"
                      onClick={() => setColorTheme(null)}
                      className="text-[10px] py-1.5 flex items-center gap-2 cursor-default outline-none rounded-[3px]"
                    >
                      <span className="w-3 h-3 rounded-[2px] shrink-0 border border-border bg-gradient-to-br from-muted to-background" />
                      <span className="flex-1">Défaut</span>
                      {!colorTheme && (
                        <Check size={10} className="opacity-60" />
                      )}
                    </DropdownMenuItem>

                    {COLOR_PALETTES.map((palette) => (
                      <DropdownMenuItem
                        key={palette.id}
                        id={`theme-palette-${palette.id}`}
                        onClick={() => setColorTheme(palette.id)}
                        className="text-[10px] py-1.5 flex items-center gap-2 cursor-default outline-none rounded-[3px]"
                        title={palette.description}
                      >
                        <PalettePreview paletteId={palette.id} />
                        <span className="flex-1">{palette.label}</span>
                        {colorTheme === palette.id && (
                          <Check size={10} className="opacity-60 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem className="text-[11px] py-2 cursor-default outline-none rounded-[3px]">
                Full Screen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button className="px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded-[3px] cursor-default outline-none">
            Help
          </button>
        </nav>
      </div>

      <div className="flex-grow flex justify-center items-center h-full drag-region">
        <CompanyTitleDisplay />
      </div>

      {/* ICONES DE TOGGLE SIDEBAR / RIGHT PANEL */}
      <div className="flex items-center gap-1.5 mr-4 no-drag-region">
        <button
          onClick={() => setIsSidebarCollapsed((v) => !v)}
          className={`p-1.5 rounded-[3px] text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-all ${isSidebarCollapsed ? "opacity-50" : "opacity-100"}`}
          title="Toggle Primary Side Bar (Ctrl+B)"
        >
          <PanelLeft size={14} />
        </button>
        <button
          onClick={() => setIsRightPanelCollapsed((v) => !v)}
          className={`p-1.5 rounded-[3px] text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-all ${isRightPanelCollapsed ? "opacity-50" : "opacity-100"}`}
          title="Toggle Agent (Ctrl+Alt+B)"
        >
          <PanelRight size={14} />
        </button>
      </div>

      {/* USER PROFILE BADGE (droite de la barre) */}
      <UserProfileBadge />

      <div className="w-[110px] h-full shrink-0" />
    </header>
  );
};

// ─── Petite pastille colorée représentant chaque palette ──────────────────────
const PALETTE_PREVIEW_COLORS: Record<string, [string, string, string]> = {
  nebula: ["#3b3bcc", "#f87171", "#4ade80"],
  sakura: ["#f43f5e", "#d946ef", "#fb923c"],
  arctic: ["#1e3a5f", "#f59e0b", "#94a3b8"],
  rose: ["#fda4af", "#fecdd3", "#fb7185"],
  jade: ["#0d9488", "#16a34a", "#6366f1"],
  dune: ["#1e3a5f", "#d4a96a", "#64748b"],
  orchid: ["#e879a0", "#c084fc", "#f9a8d4"],
  void: ["#6d28d9", "#4f46e5", "#7c3aed"],
  obsidian: ["#a8a29e", "#d6d3d1", "#c4b5a5"],
  aurora: ["#3b82f6", "#10b981", "#8b5cf6"],
  prism: ["#3b82f6", "#10b981", "#7c3aed"],
  khaki: ["#4b5320", "#d4a017", "#7c6400"],
  slate: ["#64748b", "#94a3b8", "#475569"],
  marine: ["#0c4a6e", "#06b6d4", "#0284c7"],
  abyss: ["#172554", "#0891b2", "#1d4ed8"],
  eclipse: ["#1e3a8a", "#67e8f9", "#3b82f6"],
  dusk: ["#374151", "#ca8a04", "#6b7280"],
};

function PalettePreview({ paletteId }: { paletteId: string }) {
  const colors = PALETTE_PREVIEW_COLORS[paletteId] ?? ["#888", "#aaa", "#ccc"];
  return (
    <span className="flex gap-0.5 shrink-0">
      {colors.map((c, i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-[2px]"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant séparé : Badge + panneau profil utilisateur connecté
// ─────────────────────────────────────────────────────────────
function UserProfileBadge() {
  const [user, setUser] = React.useState<any>(null);
  const [permissions, setPermissions] = React.useState<any[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Lecture de l'utilisateur en session (localStorage)
  // + écoute des changements pour détecter la connexion en temps réel
  React.useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem("user");
        setUser(stored ? JSON.parse(stored) : null);
      } catch {}
    };

    // Chargement initial
    loadUser();

    // Écoute les changements localStorage depuis un autre onglet
    window.addEventListener("storage", loadUser);

    // Écoute l'événement custom déclenché par la page de login (même onglet)
    window.addEventListener("user-logged-in", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("user-logged-in", loadUser);
    };
  }, []);

  // Fermer le panneau si clic en dehors
  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // Fetch permissions à la première ouverture
  const handleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (!next || !user || permissions.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/roles/permissions?company_id=${user.company_id}&role=${user.role}`,
      );
      const data = await res.json();
      setPermissions(Array.isArray(data) ? data : []);
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // Initiales de l'utilisateur
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Couleur badge selon le rôle
  const roleColors: Record<string, string> = {
    gerant:
      "bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] border-[var(--primary-accent)]/30",
    caisse:
      "bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30",
    magasinier:
      "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30",
    comptable: "bg-[var(--info)]/20 text-[var(--info)] border-[var(--info)]/30",
  };
  const roleColor =
    roleColors[user.role] ?? "bg-muted text-muted-foreground border-border";

  // Permissions groupées par module
  const byModule = permissions.reduce((acc: Record<string, any[]>, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div
      className="relative no-drag-region flex items-center mr-2"
      ref={panelRef}
    >
      {/* -------- AVATAR CLIQUABLE -------- */}
      <button
        id="user-profile-trigger"
        onClick={handleOpen}
        className="flex items-center gap-2 px-2 py-1 rounded-[3px] hover:bg-accent/60 transition-all group"
      >
        {/* Avatar initiales */}
        <div className="w-5 h-5 rounded-full bg-[var(--primary-accent)]/20 border border-[var(--primary-accent)]/40 flex items-center justify-center shrink-0">
          <span className="text-[8px] font-black text-[var(--primary-accent)] uppercase">
            {initials}
          </span>
        </div>

        {/* Nom + rôle */}
        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/80 group-hover:text-foreground transition-colors">
            {user.name?.split(" ")[0] || "Utilisateur"}
          </span>
          <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
            {user.role || "—"}
          </span>
        </div>

        {/* Indicateur "en ligne" */}
        <div
          className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shrink-0"
          title="En ligne"
        />
      </button>

      {/* -------- PANNEAU PROFIL -------- */}
      {isOpen && (
        <div
          id="user-profile-panel"
          className="absolute top-full right-0 mt-2 w-72 bg-popover/98 backdrop-blur-md border border-border/50 shadow-2xl rounded-[4px] overflow-hidden z-[200]"
          style={{ animation: "profileFadeIn 0.15s ease" }}
        >
          {/* Header carte */}
          <div className="p-4 bg-[var(--primary-accent)]/5 border-b border-border/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-accent)]/20 border-2 border-[var(--primary-accent)]/40 flex items-center justify-center shrink-0">
              <span className="text-sm font-black text-[var(--primary-accent)] uppercase">
                {initials}
              </span>
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-black uppercase tracking-widest text-foreground truncate">
                {user.name || "Inconnu"}
              </span>
              <span className="text-[9px] text-muted-foreground truncate">
                @{user.username || "—"}
              </span>
              <span
                className={`self-start px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-[3px] border ${roleColor}`}
              >
                {user.role || "—"}
              </span>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span className="text-[8px] text-muted-foreground">Actif</span>
              </div>
              {/* <span className="text-[8px] text-muted-foreground">
                ID #{user.id}
              </span> */}
            </div>
          </div>

          {/* Informations utilisateur */}
          <div className="p-3 border-b border-border/20 space-y-1.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
              Informations
            </p>
            {[
              { label: "Établissement", value: `${user.company_name}` },
              {
                label: "Statut",
                value: user.is_active !== false ? "Actif" : "Inactif",
              },
              { label: "Rôle système", value: user.role },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {label}
                </span>
                <span className="text-[9px] font-bold text-foreground uppercase">
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Droits d'accès */}
          <div className="p-3 max-h-52 overflow-y-auto custom-scrollbar">
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
              Droits d'accès
            </p>

            {loading ? (
              <div className="text-center py-4 text-[9px] text-muted-foreground opacity-50 uppercase tracking-widest">
                Chargement...
              </div>
            ) : Object.keys(byModule).length === 0 ? (
              <div className="text-center py-4 text-[9px] text-muted-foreground opacity-40 uppercase tracking-widest">
                Aucune permission définie
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byModule).map(([module, perms]) => (
                  <div key={module}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--primary-accent)]/70 mb-1.5">
                      {module}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(perms as any[]).map((p: any) => (
                        <span
                          key={p.id}
                          className={`px-1.5 py-0.5 text-[7px] font-bold uppercase rounded-[3px] border ${
                            p.is_enabled
                              ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20"
                              : "bg-muted/30 text-muted-foreground/50 border-border/20 line-through"
                          }`}
                        >
                          {p.permission}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant : Titre central (Type et Nom de l'établissement)
// ─────────────────────────────────────────────────────────────
function CompanyTitleDisplay() {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem("user");
        setUser(stored ? JSON.parse(stored) : null);
      } catch {}
    };

    loadUser();
    window.addEventListener("storage", loadUser);
    window.addEventListener("user-logged-in", loadUser);
    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("user-logged-in", loadUser);
    };
  }, []);

  if (!user || (!user.company_name && !user.company_type)) return null;

  const cType = user.company_type || "Boutique";

  return (
    <div className="flex items-center gap-2 pointer-events-none opacity-90 drop-shadow-sm">
      <span className="px-2 py-0.5 rounded-[3px] bg-accent/50 text-[9px] font-black tracking-[0.2em] border border-border/40 text-[var(--primary-accent)]">
        {cType} - {user.company_name || ""}
      </span>
    </div>
  );
}
