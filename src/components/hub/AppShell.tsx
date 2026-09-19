import { Link, useRouterState } from "@tanstack/react-router";
import { House, Boxes, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ClipboardCheck, FileBarChart2, Settings, Menu, X, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";

const NAV=[
 {to:"/",label:"Resumo",icon:House},{to:"/estoque",label:"Estoque",icon:Boxes},{to:"/entradas",label:"Entrada de estoque",icon:ArrowDownToLine},{to:"/retiradas",label:"Retiradas",icon:ArrowUpFromLine},{to:"/compras",label:"Compras históricas",icon:ShoppingCart},{to:"/inventario",label:"Inventário",icon:ClipboardCheck},{to:"/relatorios",label:"Relatórios",icon:FileBarChart2},{to:"/configuracoes",label:"Configurações",icon:Settings},
] as const;
function Brand(){return <div className="hub-brand"><div className="hub-wordmark">HUB</div><div className="hub-tagline">BELEZA QUE CONECTA</div><div className="hub-section">CONTROLE OPERACIONAL</div></div>}
function NavLinks({onNavigate}:{onNavigate?:()=>void}){return <nav className="hub-nav">{NAV.map(({to,label,icon:Icon})=><Link key={to} to={to} onClick={onNavigate} activeOptions={{exact:to==="/"}} className="hub-nav-item" activeProps={{className:"hub-nav-item hub-nav-active"}}><Icon className="h-4 w-4"/><span>{label}</span></Link>)}</nav>}
export function AppShell({children}:{children:ReactNode}) {
 const [open,setOpen]=useState(false); const pathname=useRouterState({select:s=>s.location.pathname}); const current=NAV.find(n=>n.to==="/"?pathname==="/":pathname.startsWith(n.to));
 return <div className="min-h-screen bg-background">
  <aside className="no-print hub-sidebar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col lg:flex"><Brand/><NavLinks/><div className="hub-user"><div className="hub-avatar">FG</div><div><b>Fita Gomada HUB</b><small>Administrador</small></div></div><div className="hub-exit"><LogOut className="h-3.5 w-3.5"/> Sistema operacional</div></aside>
  {open&&<div className="no-print fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/30" onClick={()=>setOpen(false)}/><aside className="hub-sidebar absolute inset-y-0 left-0 flex w-72 flex-col"><div className="flex justify-between"><Brand/><button className="mr-3 mt-4 h-9 p-2" onClick={()=>setOpen(false)}><X className="h-5 w-5"/></button></div><NavLinks onNavigate={()=>setOpen(false)}/></aside></div>}
  <div className="lg:pl-[248px]"><header className="no-print hub-header"><button className="mr-3 lg:hidden" onClick={()=>setOpen(true)}><Menu/></button><div><div className="hub-header-title">Controle de Fita Gomada</div><div className="hub-header-sub">Painel administrativo · estoque, consumo e custos em um só lugar.</div></div><div className="hub-motto">ORGANIZAÇÃO<br/>QUE IMPULSIONA<br/>RESULTADOS</div></header><main className="print-area mx-auto w-full max-w-[1400px] px-5 py-5 lg:px-6">{children}</main></div>
 </div>
}