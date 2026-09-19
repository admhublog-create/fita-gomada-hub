import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStock, useInvalidateStock } from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Spinner } from "@/components/hub/ui";
import { todayISO, boxesAndRolls } from "@/lib/format";

export const Route=createFileRoute("/retirada-qr")({component:QrWithdrawal});
function QrWithdrawal(){
 const stock=useStock(), invalidate=useInvalidateStock(); const [name,setName]=useState(""); const [rolls,setRolls]=useState("1"); const [done,setDone]=useState(false);
 const qty=Number(rolls);
 const save=useMutation({mutationFn:async()=>{if(!name.trim())throw new Error("Informe seu nome.");if(!Number.isInteger(qty)||qty<1)throw new Error("Informe a quantidade.");if(qty>stock.balance)throw new Error("Quantidade maior que o estoque disponível.");const r=await supabase.from("withdrawals").insert({withdrawal_date:todayISO(),responsible:name.trim(),rolls:qty,notes:"Retirada registrada via QR Code"});if(r.error)throw new Error(r.error.message)},onSuccess:()=>{invalidate();setDone(true)},onError:(e:Error)=>alert(e.message)});
 if(done)return <div className="qr-page"><div className="qr-card text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-success"/><h1 className="mt-4">Retirada registrada!</h1><p className="mt-2 text-muted-foreground">{qty} rolo(s) retirado(s) por {name}.</p><Button className="mt-6 w-full" onClick={()=>{setDone(false);setName("");setRolls("1")}}>Nova retirada</Button></div></div>;
 return <div className="qr-page"><div className="qr-card"><div className="mb-6 text-center"><div className="qr-logo"><PackageOpen/></div><div className="mt-3 text-xs font-bold tracking-[.2em] text-primary">HUB OPERACIONAL</div><h1 className="mt-2">Retirada de Fita Gomada</h1><p className="text-sm text-muted-foreground">Registre sua retirada de forma rápida.</p></div><div className="mb-5 rounded-xl bg-secondary/60 p-4 text-center"><div className="text-xs uppercase tracking-wider text-muted-foreground">Disponível agora</div><b className="text-2xl">{stock.balance} rolos</b><div className="text-xs text-muted-foreground">{boxesAndRolls(stock.balance,stock.settings?.rolls_per_box??15).label}</div></div><form className="space-y-4" onSubmit={e=>{e.preventDefault();save.mutate()}}><Field label="Seu nome"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Digite seu nome" autoComplete="name"/></Field><Field label="Quantidade de rolos"><Input type="number" min="1" step="1" value={rolls} onChange={e=>setRolls(e.target.value)}/></Field><Button className="h-12 w-full text-base" disabled={save.isPending||stock.isLoading}>{save.isPending?<Spinner/>:"Confirmar retirada"}</Button></form></div></div>
}