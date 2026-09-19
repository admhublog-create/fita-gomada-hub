import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Field, StatCard, TableSkeleton, ErrorState, EmptyState, ConfirmDelete, Spinner } from "@/components/hub/ui";
import { usePurchases, useInvalidateStock, type Purchase } from "@/lib/stock";
import { dateBR, todayISO, brl, kg, int } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/compras")({
  head: () => ({
    meta: [
      { title: "Compras — Fita Gomada HUB" },
      { name: "description", content: "Histórico financeiro de compras de fita gomada: peso, caixas, rolos, valor, fornecedor e documento." },
      { property: "og:title", content: "Compras — Fita Gomada HUB" },
      { property: "og:description", content: "Histórico financeiro de compras de fita gomada." },
    ],
  }),
  component: ComprasPage,
});

type FormState = {
  purchase_date: string; product: string; weight_kg: string; boxes: string; rolls: string;
  total_value: string; supplier: string; document: string; notes: string;
};
const empty = (): FormState => ({
  purchase_date: todayISO(), product: "Fita Gomada com Reforço 70mm SK791", weight_kg: "", boxes: "", rolls: "",
  total_value: "", supplier: "ALLTAPE", document: "", notes: "",
});

const parseNum = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

function ComprasPage() {
  const purchases = usePurchases();
  const invalidate = useInvalidateStock();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [toDelete, setToDelete] = useState<Purchase | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setEditing(null); setForm(empty()); setErrors({}); setOpen(true); };
  const openEdit = (p: Purchase) => {
    setEditing(p);
    setForm({
      purchase_date: p.purchase_date,
      product: p.product,
      weight_kg: p.weight_kg == null ? "" : String(p.weight_kg),
      boxes: p.boxes == null ? "" : String(p.boxes),
      rolls: p.rolls == null ? "" : String(p.rolls),
      total_value: String(p.total_value),
      supplier: p.supplier ?? "",
      document: p.document ?? "",
      notes: p.notes ?? "",
    });
    setErrors({});
    setOpen(true);
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.purchase_date) errs.purchase_date = "Informe a data.";
    if (!form.product.trim()) errs.product = "Informe o produto.";
    const v = parseNum(form.total_value);
    if (!form.total_value || Number.isNaN(v) || v < 0) errs.total_value = "Valor inválido.";
    if (form.weight_kg && (Number.isNaN(parseNum(form.weight_kg)) || parseNum(form.weight_kg) < 0)) errs.weight_kg = "Peso inválido.";
    if (form.boxes && (!Number.isInteger(Number(form.boxes)) || Number(form.boxes) < 0)) errs.boxes = "Inteiro ≥ 0.";
    if (form.rolls && (!Number.isInteger(Number(form.rolls)) || Number(form.rolls) < 0)) errs.rolls = "Inteiro ≥ 0.";
    return errs;
  };

  const save = useMutation({
    mutationFn: async () => {
      const errs = validate();
      setErrors(errs);
      if (Object.keys(errs).length) throw new Error("Corrija os campos destacados.");
      const payload = {
        purchase_date: form.purchase_date,
        product: form.product.trim(),
        weight_kg: form.weight_kg ? parseNum(form.weight_kg) : null,
        boxes: form.boxes ? Number(form.boxes) : null,
        rolls: form.rolls ? Number(form.rolls) : null,
        total_value: parseNum(form.total_value),
        supplier: form.supplier.trim() || null,
        document: form.document.trim() || null,
        notes: form.notes.trim() || null,
      };
      const r = editing
        ? await supabase.from("purchases").update(payload).eq("id", editing.id)
        : await supabase.from("purchases").insert(payload);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      toast.success(editing ? "Compra atualizada." : "Compra cadastrada (não altera o estoque).");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await supabase.from("purchases").delete().eq("id", id);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => { toast.success("Compra excluída."); setToDelete(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = purchases.data ?? [];
  const totalValue = list.reduce((s, p) => s + Number(p.total_value), 0);
  const totalKg = list.reduce((s, p) => s + Number(p.weight_kg ?? 0), 0);
  const totalRolls = list.reduce((s, p) => s + (p.rolls ?? 0), 0);
  const avgKg = totalKg > 0 ? totalValue / totalKg : 0;

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Histórico financeiro. Compras não alteram o estoque operacional — use Entradas para isso."
        actions={<Button onClick={openNew}><Plus /> Nova compra</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Investimento total" tone="primary" value={purchases.isLoading ? "…" : brl(totalValue)} hint={`${list.length} compra(s)`} />
        <StatCard label="Peso total" value={purchases.isLoading ? "…" : kg(totalKg)} />
        <StatCard label="Custo médio por kg" value={purchases.isLoading ? "…" : brl(avgKg)} />
        <StatCard label="Rolos identificados" value={purchases.isLoading ? "…" : int(totalRolls)} hint="Somente compras com rolos informados" />
      </div>

      <div className="mt-6">
        <Section title="Histórico de compras">
          {purchases.isLoading ? (
            <TableSkeleton rows={5} />
          ) : purchases.error ? (
            <ErrorState error={purchases.error} />
          ) : !list.length ? (
            <EmptyState>Nenhuma compra cadastrada.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Peso</TableHead>
                    <TableHead className="text-right">Caixas</TableHead>
                    <TableHead className="text-right">Rolos</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Obs.</TableHead>
                    <TableHead className="no-print w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="num whitespace-nowrap">{dateBR(p.purchase_date)}</TableCell>
                      <TableCell className="font-medium">{p.product}</TableCell>
                      <TableCell className="num text-right">{kg(p.weight_kg)}</TableCell>
                      <TableCell className="num text-right">{p.boxes == null ? <span className="text-muted-foreground">n/i</span> : int(p.boxes)}</TableCell>
                      <TableCell className="num text-right">{p.rolls == null ? <span className="text-muted-foreground">n/i</span> : int(p.rolls)}</TableCell>
                      <TableCell className="num text-right font-semibold">{brl(p.total_value)}</TableCell>
                      <TableCell>{p.supplier ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.document ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{p.notes ?? "—"}</TableCell>
                      <TableCell className="no-print">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEdit(p)}><Pencil /></Button>
                          <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setToDelete(p)}><Trash2 className="text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>Totais</TableCell>
                    <TableCell className="num text-right">{kg(totalKg)}</TableCell>
                    <TableCell className="num text-right">{int(list.reduce((s, p) => s + (p.boxes ?? 0), 0))}</TableCell>
                    <TableCell className="num text-right">{int(totalRolls)}</TableCell>
                    <TableCell className="num text-right">{brl(totalValue)}</TableCell>
                    <TableCell colSpan={4} className="text-xs font-normal text-muted-foreground">n/i = não informado</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </Section>
      </div>

      <Dialog open={open} onOpenChange={(o) => !save.isPending && setOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar compra" : "Nova compra"}</DialogTitle>
            <DialogDescription>Registro financeiro. Não altera o saldo de estoque.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data" error={errors.purchase_date}>
                <Input type="date" value={form.purchase_date} onChange={set("purchase_date")} />
              </Field>
              <Field label="Valor total (R$)" error={errors.total_value}>
                <Input inputMode="decimal" value={form.total_value} onChange={set("total_value")} placeholder="0,00" />
              </Field>
            </div>
            <Field label="Produto" error={errors.product}>
              <Input value={form.product} onChange={set("product")} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Peso (kg)" error={errors.weight_kg}>
                <Input inputMode="decimal" value={form.weight_kg} onChange={set("weight_kg")} placeholder="0,000" />
              </Field>
              <Field label="Caixas" error={errors.boxes} hint="opcional">
                <Input type="number" min={0} step={1} value={form.boxes} onChange={set("boxes")} placeholder="n/i" />
              </Field>
              <Field label="Rolos" error={errors.rolls} hint="opcional">
                <Input type="number" min={0} step={1} value={form.rolls} onChange={set("rolls")} placeholder="n/i" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fornecedor">
                <Input value={form.supplier} onChange={set("supplier")} />
              </Field>
              <Field label="Documento">
                <Input value={form.document} onChange={set("document")} placeholder="NF / Orçamento" />
              </Field>
            </div>
            <Field label="Observação">
              <Textarea value={form.notes} onChange={set("notes")} rows={2} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={save.isPending}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending && <Spinner />} {editing ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        loading={del.isPending}
        title="Excluir compra?"
        description={toDelete ? `A compra de ${dateBR(toDelete.purchase_date)} (${brl(toDelete.total_value)}, ${toDelete.document ?? "sem documento"}) será removida do histórico financeiro.` : ""}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}