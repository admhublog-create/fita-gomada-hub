import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Field, TableSkeleton, ErrorState, EmptyState, ConfirmDelete, Spinner } from "@/components/hub/ui";
import { useEntries, useSettings, useInvalidateStock, type Entry } from "@/lib/stock";
import { dateBR, todayISO, int } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/entradas")({
  head: () => ({
    meta: [
      { title: "Entradas — Fita Gomada HUB" },
      { name: "description", content: "Registro de entradas de fita gomada no estoque: caixas, rolos avulsos, fornecedor e documento." },
      { property: "og:title", content: "Entradas — Fita Gomada HUB" },
      { property: "og:description", content: "Registro de entradas de fita gomada." },
    ],
  }),
  component: EntradasPage,
});

type FormState = { entry_date: string; boxes: string; loose_rolls: string; supplier: string; document: string; notes: string };
const empty = (): FormState => ({ entry_date: todayISO(), boxes: "", loose_rolls: "", supplier: "", document: "", notes: "" });

function validate(f: FormState) {
  const errs: Partial<Record<keyof FormState, string>> = {};
  if (!f.entry_date) errs.entry_date = "Informe a data.";
  const b = Number(f.boxes || 0), l = Number(f.loose_rolls || 0);
  if (!Number.isInteger(b) || b < 0) errs.boxes = "Número inteiro ≥ 0.";
  if (!Number.isInteger(l) || l < 0) errs.loose_rolls = "Número inteiro ≥ 0.";
  if (b === 0 && l === 0) errs.boxes = "Informe ao menos 1 caixa ou 1 rolo.";
  return errs;
}

function EntradasPage() {
  const entries = useEntries();
  const settings = useSettings();
  const invalidate = useInvalidateStock();
  const perBox = settings.data?.rolls_per_box ?? 15;
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [toDelete, setToDelete] = useState<Entry | null>(null);
  const total = Number(form.boxes || 0) * perBox + Number(form.loose_rolls || 0);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const errs = validate(form);
      setErrors(errs);
      if (Object.keys(errs).length) throw new Error("Corrija os campos destacados.");
      const payload = {
        entry_date: form.entry_date,
        boxes: Number(form.boxes || 0),
        loose_rolls: Number(form.loose_rolls || 0),
        total_rolls: total,
        supplier: form.supplier.trim() || null,
        document: form.document.trim() || null,
        notes: form.notes.trim() || null,
      };
      const r = editing
        ? await supabase.from("entries").update(payload).eq("id", editing.id)
        : await supabase.from("entries").insert(payload);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      toast.success(editing ? "Entrada atualizada." : `Entrada registrada: +${total} rolos no estoque.`);
      setForm(empty());
      setEditing(null);
      setErrors({});
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await supabase.from("entries").delete().eq("id", id);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      toast.success("Entrada excluída.");
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (e: Entry) => {
    setEditing(e);
    setForm({
      entry_date: e.entry_date,
      boxes: String(e.boxes),
      loose_rolls: String(e.loose_rolls),
      supplier: e.supplier ?? "",
      document: e.document ?? "",
      notes: e.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <PageHeader title="Entradas" description="Cada entrada aumenta o saldo do estoque. Compras (financeiro) não geram entrada automaticamente." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <Section title={editing ? "Editar entrada" : "Nova entrada"} description={`1 caixa = ${perBox} rolos`}>
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Data" error={errors.entry_date}>
              <Input type="date" value={form.entry_date} onChange={set("entry_date")} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Caixas" error={errors.boxes}>
                <Input type="number" min={0} step={1} inputMode="numeric" value={form.boxes} onChange={set("boxes")} placeholder="0" />
              </Field>
              <Field label="Rolos avulsos" error={errors.loose_rolls}>
                <Input type="number" min={0} step={1} inputMode="numeric" value={form.loose_rolls} onChange={set("loose_rolls")} placeholder="0" />
              </Field>
            </div>
            <div className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
              Total: <strong className="num">{total}</strong> rolos
            </div>
            <Field label="Fornecedor">
              <Input value={form.supplier} onChange={set("supplier")} placeholder="Ex.: ALLTAPE" />
            </Field>
            <Field label="Documento">
              <Input value={form.document} onChange={set("document")} placeholder="NF / Orçamento" />
            </Field>
            <Field label="Observação">
              <Textarea value={form.notes} onChange={set("notes")} rows={2} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending} className="flex-1">
                {save.isPending ? <Spinner /> : <Plus />} {editing ? "Salvar alterações" : "Registrar entrada"}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(empty()); setErrors({}); }}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Section>

        <Section title="Histórico de entradas" description={`${entries.data?.length ?? 0} registro(s)`}>
          {entries.isLoading ? (
            <TableSkeleton />
          ) : entries.error ? (
            <ErrorState error={entries.error} />
          ) : !entries.data?.length ? (
            <EmptyState>Nenhuma entrada registrada ainda.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Caixas</TableHead>
                    <TableHead className="text-right">Avulsos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Obs.</TableHead>
                    <TableHead className="no-print w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.data.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="num whitespace-nowrap">{dateBR(e.entry_date)}</TableCell>
                      <TableCell className="num text-right">{int(e.boxes)}</TableCell>
                      <TableCell className="num text-right">{int(e.loose_rolls)}</TableCell>
                      <TableCell className="num text-right font-semibold text-success">+{int(e.total_rolls)}</TableCell>
                      <TableCell>{e.supplier ?? "—"}</TableCell>
                      <TableCell>{e.document ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{e.notes ?? "—"}</TableCell>
                      <TableCell className="no-print">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => startEdit(e)}><Pencil /></Button>
                          <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setToDelete(e)}><Trash2 className="text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Section>
      </div>

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        loading={del.isPending}
        title="Excluir entrada?"
        description={toDelete ? `A entrada de ${dateBR(toDelete.entry_date)} (+${toDelete.total_rolls} rolos) será removida e o saldo recalculado.` : ""}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}