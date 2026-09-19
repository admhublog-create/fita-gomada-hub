import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Boxes, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ClipboardCheck, FileBarChart2, Settings, Menu, X, PackageOpen } from "lucide-react";
import { useState, type ReactNode } from "react";

const NAV = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/entradas", label: "Entradas", icon: ArrowDownToLine },
  { to: "/retiradas", label: "Retiradas", icon: ArrowUpFromLine },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
  { to: "/inventario", label: "Inventário", icon: ClipboardCheck },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function Brand() {
 return <div className="px-5 pt-6 pb-5">
   <div className="flex items-center gap-3">
    <div className="brand-mark"><PackageOpen className="h-5 w-5"/></div>
    <div><div className="text-[15px] font-bold text-white">Fita Gomada</div><div className="text-[10px] uppercase tracking-[.24em] text-white/45">HUB • Operacional</div></div>
   </div>
 </div>
}
function NavLinks({onNavigate}:{onNavigate?:()=>void}) {
 return <nav className="flex flex-col gap-1.5 px-3">{NAV.map(({to,label,icon:Icon})=>
  <Link key={to} to={to} onClick={onNavigate} activeOptions={{exact:to==="/"}}
   className="nav-item"
   activeProps={{className:"nav-item nav-item-active"}}>
   <Icon className="h-[17px] w-[17px]"/><span>{label}</span>
  </Link>)}</nav>
}
export function AppShell({children}:{children:ReactNode}) {
 const [open,setOpen]=useState(false);
 const pathname=useRouterState({select:s=>s.location.pathname});
 const current=NAV.find(n=>n.to==="/"?pathname==="/":pathname.startsWith(n.to));
 return <div className="min-h-screen">
  <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col sidebar-panel lg:flex">
   <Brand/><NavLinks/>
   <div className="mx-4 mt-auto mb-5 rounded-xl border border-white/8 bg-white/[.04] px-3 py-3 text-[10px] leading-4 text-white/45">
    Controle operacional HUB<br/><span className="text-white/70">1 caixa = 15 rolos</span>
   </div>
  </aside>
  {open&&<div className="no-print fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)}/><aside className="sidebar-panel absolute inset-y-0 left-0 flex w-72 flex-col shadow-2xl"><div className="flex items-center justify-between pr-3"><Brand/><button className="p-2 text-white" onClick={()=>setOpen(false)}><X className="h-5 w-5"/></button></div><NavLinks onNavigate={()=>setOpen(false)}/></aside></div>}
  <div className="lg:pl-[232px]">
   <header className="no-print sticky top-0 z-20 flex h-16 items-center border-b border-black/[.05] bg-white/80 px-5 backdrop-blur-xl lg:px-10">
    <button className="mr-3 rounded-lg p-2 hover:bg-black/5 lg:hidden" onClick={()=>setOpen(true)}><Menu className="h-5 w-5"/></button>
    <div><div className="text-[11px] font-medium uppercase tracking-[.16em] text-muted-foreground">Fita Gomada HUB</div><div className="text-sm font-semibold">{current?.label??"Página"}</div></div>
    <div className="ml-auto hidden items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs text-muted-foreground shadow-sm sm:flex"><span className="h-2 w-2 rounded-full bg-success"></span>Sistema operacional</div>
   </header>
   <main className="print-area mx-auto w-full max-w-[1380px] px-5 py-7 lg:px-10 lg:py-9">{children}</main>
  </div>
 </div>
}