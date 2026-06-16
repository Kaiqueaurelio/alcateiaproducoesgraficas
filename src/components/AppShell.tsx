import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BarChart3,
  ChevronRight,
  ClipboardList,
  Cog,
  FileText,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth, ROLE_LABEL, type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  section: "Visão geral" | "Operação" | "Financeiro" | "Administração";
  roles?: AppRole[];
};

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    description: "Indicadores do negócio",
    icon: LayoutDashboard,
    section: "Visão geral",
  },
  {
    to: "/clients",
    label: "Clientes",
    description: "Cadastro e relacionamento",
    icon: Users,
    section: "Operação",
    roles: ["administrador", "atendente"],
  },
  {
    to: "/quotes",
    label: "Orçamentos",
    description: "Propostas comerciais",
    icon: FileText,
    section: "Operação",
    roles: ["administrador", "atendente"],
  },
  {
    to: "/orders",
    label: "Ordens de Serviço",
    description: "Pedidos e prazos",
    icon: ClipboardList,
    section: "Operação",
    roles: ["administrador", "atendente", "producao", "financeiro"],
  },
  {
    to: "/production",
    label: "Produção",
    description: "Etapas e responsáveis",
    icon: Kanban,
    section: "Operação",
    roles: ["administrador", "atendente", "producao"],
  },
  {
    to: "/pdv",
    label: "Caixa / PDV",
    description: "Venda rápida e saldo do dia",
    icon: ShoppingCart,
    section: "Financeiro",
    roles: ["administrador", "financeiro", "vendedor"],
  },
  {
    to: "/receivables",
    label: "Contas a Receber",
    description: "Cobranças e vencimentos",
    icon: Receipt,
    section: "Financeiro",
    roles: ["administrador", "financeiro", "atendente"],
  },
  {
    to: "/services",
    label: "Serviços",
    description: "Catálogo e preços",
    icon: Package,
    section: "Administração",
    roles: ["administrador", "atendente"],
  },
  {
    to: "/settings",
    label: "Configurações",
    description: "Empresa e preferências",
    icon: Settings,
    section: "Administração",
    roles: ["administrador"],
  },
  {
    to: "/users",
    label: "Usuários",
    description: "Gerenciar cargos e acessos",
    icon: Users,
    section: "Administração",
    roles: ["administrador"],
  },
  {
    to: "/ella",
    label: "Ella Ribeiro",
    description: "Assistente de IA para gestão",
    icon: Sparkles,
    section: "Administração",
    roles: ["administrador"],
  },
];

const SECTIONS: NavItem["section"][] = ["Visão geral", "Operação", "Financeiro", "Administração"];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("alcateia_sidebar_collapsed");
    return saved ? saved === "1" : true;
  });
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const items = useMemo(
    () =>
      NAV.filter(
        (item) => !item.roles || isAdmin || item.roles.some((role) => roles.includes(role)),
      ),
    [isAdmin, roles],
  );
  const results = search.trim()
    ? items.filter((item) =>
        `${item.label} ${item.description}`
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")),
      )
    : [];
  const title = currentTitle(path);
  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "A";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-2xl transition-[width,transform] duration-300 md:translate-x-0",
          collapsed ? "w-72 md:w-20" : "w-72",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="app-grid-pattern border-b border-white/10 px-4 py-4">
          <button
            type="button"
            onClick={() =>
              setCollapsed((value) => {
                const next = !value;
                localStorage.setItem("alcateia_sidebar_collapsed", next ? "1" : "0");
                return next;
              })
            }
            className="mb-3 hidden w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/15 hover:text-white md:flex"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <>
                <PanelLeftOpen className="h-4 w-4" />
                <span className="sr-only">Expandir menu</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Recolher menu
              </>
            )}
          </button>
          <div className="flex items-center justify-between gap-3">
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-2 ring-brand-yellow/70",
                collapsed ? "h-28 md:hidden" : "h-28",
              )}
            >
              <img
                src="/brand/alcateia-logo.png"
                alt="Logo da Alcateia's Produções Gráficas"
                className="h-full max-h-24 w-full object-contain"
              />
            </div>
            <div
              className={cn(
                "hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white p-1 shadow-lg ring-2 ring-brand-yellow/70",
                collapsed && "md:grid",
              )}
            >
              <img
                src="/brand/alcateia-symbol.png"
                alt="Símbolo da Alcateia's"
                className="h-full w-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className={cn(
              "mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5",
              collapsed && "md:hidden",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-yellow">
              Central de operações
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/65">
              Do briefing à entrega, tudo em um só lugar.
            </p>
          </div>
        </div>

        <nav className="app-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {SECTIONS.map((section) => {
            const sectionItems = items.filter((item) => item.section === section);
            if (!sectionItems.length) return null;
            return (
              <div key={section} className="mb-5">
                <p
                  className={cn(
                    "mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35",
                    collapsed && "md:hidden",
                  )}
                >
                  {section}
                </p>
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const active =
                      path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                          active
                            ? "bg-brand-yellow font-bold text-brand-blue shadow-lg shadow-black/10"
                            : "text-white/72 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                            active ? "bg-brand-blue/10" : "bg-white/7 group-hover:bg-white/12",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:hidden")}>
                          {item.label}
                        </span>
                        {active && (
                          <ChevronRight
                            className={cn("h-4 w-4 shrink-0", collapsed && "md:hidden")}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 bg-black/10 p-3">
          <button
            type="button"
            onClick={() =>
              setCollapsed((value) => {
                const next = !value;
                localStorage.setItem("alcateia_sidebar_collapsed", next ? "1" : "0");
                return next;
              })
            }
            className="mb-2 hidden w-full items-center justify-center gap-2 rounded-xl bg-white/8 px-3 py-2 text-sm font-bold text-white/75 hover:bg-white/12 hover:text-white md:flex"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>Recolher menu</span>
              </>
            )}
          </button>
          <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-extrabold text-brand-blue">
              {userInitial}
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
              <div className="truncate text-xs font-semibold text-white">{user?.email}</div>
              <div className="truncate text-[11px] text-white/50">
                {roles.map((role) => ROLE_LABEL[role]).join(", ") || "Sem papel"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-4 w-4" />{" "}
            <span className={cn(collapsed && "md:hidden")}>Sair da conta</span>
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-brand-blue/55 backdrop-blur-sm md:hidden"
          aria-label="Fechar menu"
        />
      )}

      <div
        className={cn(
          "flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden transition-[margin] duration-300",
          collapsed ? "md:ml-20" : "md:ml-72",
        )}
      >
        <div className="hidden h-8 items-center justify-between bg-brand-blue px-6 text-[11px] font-medium text-white/70 lg:flex">
          <span>Produção gráfica organizada do briefing à entrega</span>
          <span className="font-semibold text-brand-yellow">Alcateia's Produções Gráficas</span>
        </div>

        <header className="sticky top-0 z-20 border-b border-border/80 bg-white/92 px-3 backdrop-blur-xl md:px-4 lg:top-0">
          <div className="flex h-[72px] items-center gap-3">
            {isAdmin && (
              <Link
                to="/ella"
                className="hidden h-11 shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-extrabold text-brand-blue hover:bg-blue-100 xl:inline-flex"
              >
                <Sparkles className="h-4 w-4" /> Perguntar à Ella
              </Link>
            )}

            <button
              type="button"
              className="rounded-xl border border-border bg-white p-2.5 text-brand-blue shadow-sm md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 lg:flex-none lg:min-w-44">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-brand-orange sm:block">
                Central de gestão
              </p>
              <h1 className="truncate text-lg font-extrabold text-brand-blue sm:text-xl">
                {title}
              </h1>
            </div>

            <div className="relative ml-auto hidden w-full max-w-xl lg:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Buscar clientes, pedidos ou áreas..."
                className="h-11 w-full rounded-xl border border-border bg-muted/45 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-brand-yellow focus:bg-white focus:ring-4 focus:ring-brand-yellow/15"
                aria-label="Buscar no sistema"
              />
              {searchFocused && search.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-[var(--shadow-lg)]">
                  {results.length ? (
                    results.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setSearch("")}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-blue/8 text-brand-blue">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-foreground">
                              {item.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                      Nenhuma área encontrada.
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="relative hidden rounded-xl border border-border bg-white p-2.5 text-brand-blue shadow-sm transition-colors hover:bg-muted sm:block"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-orange ring-2 ring-white" />
            </button>

            <Link
              to="/orders"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-yellow px-3.5 text-sm font-extrabold text-brand-blue shadow-md transition-all hover:-translate-y-0.5 hover:brightness-105 hover:shadow-lg sm:px-5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova OS</span>
            </Link>
          </div>
        </header>

        <main className="app-page min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function currentTitle(path: string) {
  const match = NAV.find(
    (item) => path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to)),
  );
  return match?.label ?? "Alcateia's Gestão";
}
