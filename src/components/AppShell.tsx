import type { ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, FileText, ClipboardList, Kanban, Wallet,
  Receipt, Package, Settings, LogOut, Menu,
} from "lucide-react";
import { useAuth, ROLE_LABEL, type AppRole } from "@/lib/auth";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV: { to: string; label: string; icon: any; roles?: AppRole[] }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clientes", icon: Users, roles: ["administrador", "atendente"] },
  { to: "/quotes", label: "Orçamentos", icon: FileText, roles: ["administrador", "atendente"] },
  { to: "/orders", label: "Ordens de Serviço", icon: ClipboardList, roles: ["administrador", "atendente", "producao", "financeiro"] },
  { to: "/production", label: "Produção", icon: Kanban, roles: ["administrador", "atendente", "producao"] },
  { to: "/cash", label: "Caixa", icon: Wallet, roles: ["administrador", "financeiro"] },
  { to: "/receivables", label: "Contas a Receber", icon: Receipt, roles: ["administrador", "financeiro", "atendente"] },
  { to: "/services", label: "Serviços", icon: Package, roles: ["administrador", "atendente"] },
  { to: "/settings", label: "Configurações", icon: Settings, roles: ["administrador"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.roles || isAdmin || n.roles.some((r) => roles.includes(r)));

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center font-bold text-gold-foreground">A</div>
            <div>
              <div className="font-bold text-sidebar-foreground">Alcateia</div>
              <div className="text-[10px] uppercase tracking-wider text-gold">Gestão</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors",
                  active
                    ? "bg-gold text-gold-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/70 mb-2 px-2">
            <div className="font-medium text-sidebar-foreground truncate">{user?.email}</div>
            <div>{roles.map((r) => ROLE_LABEL[r]).join(", ") || "Sem papel"}</div>
          </div>
          <button
            onClick={async () => { await signOut(); nav({ to: "/auth" }); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-30 md:hidden" />}

      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 sticky top-0 z-20">
          <button className="md:hidden mr-2" onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
          <div className="font-semibold text-primary">{currentTitle(path)}</div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function currentTitle(p: string) {
  const m = NAV.find((n) => p === n.to || (n.to !== "/dashboard" && p.startsWith(n.to)));
  return m?.label ?? "Alcateia Gestão";
}