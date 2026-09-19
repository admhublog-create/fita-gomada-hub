import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  ClipboardCheck,
  FileBarChart2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Resumo", icon: LayoutDashboard },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/entradas", label: "Entradas", icon: ArrowDownToLine },
  { to: "/retiradas", label: "Retiradas", icon: ArrowUpFromLine },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/inventario", label: "Inventário", icon: ClipboardCheck },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg shadow">
        FG
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-sidebar-accent-foreground tracking-tight">Fita Gomada</div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/70">HUB Operacional</div>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === "/" }}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{
            className: "bg-sidebar-primary/20 text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary",
          }}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa (desktop) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <NavLinks />
        <div className="mt-auto px-5 py-4 text-[11px] text-sidebar-foreground/50">
          1 caixa = rolos conforme Configurações · Datas pt-BR · Valores em BRL
        </div>
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                aria-label="Fechar menu"
                className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-8">
          <button
            aria-label="Abrir menu"
            className="rounded-md p-2 hover:bg-accent lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm text-muted-foreground">
            Fita Gomada HUB <span className="mx-1.5">/</span>
            <span className="font-medium text-foreground">{current?.label ?? "Página"}</span>
          </div>
        </header>
        <main className={cn("print-area mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8")}>{children}</main>
      </div>
    </div>
  );
}