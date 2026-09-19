import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, ArrowUpFromLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Field, TableSkeleton, ErrorState, EmptyState, ConfirmDelete, Spinner } from "@/components/hub/ui";
import { useStock, useInvalidateStock, type Withdrawal } from "@/lib/stock";
import { dateBR, todayISO, int, boxesAndRolls } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/retiradas")({
  head: () => ({
    meta: [
      { title: "Retiradas — Fita Gomada HUB" },
      { name: "description", content: "Registro de retiradas de rolos de fita gomada por responsável, com bloqueio de saldo negativo." },
      { property: "og:title", content: "Retiradas — Fita Gomada HUB" },
      { property: "og:description", content: "Registro de retiradas de fita gomada." },
    ],
  }),
  component: RetiradasPage,
});

type FormState = { withdrawal_date: string; responsible: string; rolls: string; notes: string };
const empty = (): FormState => ({ withdrawal_date: todayISO(), responsible: "", rolls: "", notes: "" });

function RetiradasPage() {
  const stock = useStock();
  const invalidate = useInvalidateStock();
  const perBox = stock.settings?.rolls_per_box ?? 15;
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<Withdrawal | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [toDelete, setToDelete] = useState<Withdrawal | null>(null);

  // saldo disponível para a operação (ao editar, devolve a quantidade antiga)
  const available = stock.balance + (editing && stock.timeline.find((m) => m.id === editing.id)?.afterBaseline ? editing.rolls : 0);
  const rollsNum = Number(form.rolls || 0);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.withdrawal_date) errs.withdrawal_date = "Informe a data.";
    if (!form.responsible.trim()) errs.responsible = "Informe o responsável.";
    if (!Number.isInteger(rollsNum) || rollsNum <= 0) errs.rolls = "Informe uma quantidade inteira maior que zero.";
    else if (rollsNum > available) errs.rolls = `Saldo insuficiente: disponível ${available} rolos.`;
    return errs;
  };

  const save = useMutation({
    mutationFn: async () => {
      const errs = validate();
      setErrors(errs);
      if (Object.keys(errs).length) throw new Error("Corrija os campos destacados.");
      const payload = {
        withdrawal_date: form.withdrawal_date,
        responsible: form.responsible.trim(),
        rolls: rollsNum,
        notes: form.notes.trim() || null,
      };
      const r = editing
        ? await supabase.from("withdrawals").update(payload).eq("id", editing.id)
        : await supabase.from("withdrawals").insert(payload);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      toast.success(editing ? "Retirada atualizada." : `Retirada registrada: −${rollsNum} rolos. Saldo: ${available - rollsNum} rolos.`);
      setForm(empty());
      setEditing(null);
      setErrors({});
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await supabase.from("withdrawals").delete().eq("id", id);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      toast.success("Retirada excluída.");
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (w: Withdrawal) => {
    setEditing(w);
    setForm({ withdrawal_date: w.withdrawal_date, responsible: w.responsible, rolls: String(w.rolls), notes: w.notes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <PageHeader title="Retiradas" description="Cada retirada baixa o saldo. O sistema impede saldo negativo." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <Section
          title={editing ? "Editar retirada" : "Nova retirada"}
          description={stock.isLoading ? "Carregando saldo…" : `Disponível: ${available} rolos (${boxesAndRolls(available, perBox).label})`}
        >
          <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <Field label="Data" error={errors.withdrawal_date}>
              <Input type="date" value={form.withdrawal_date} onChange={set("withdrawal_date")} required />
            </Field>
            <Field label="Responsável" error={errors.responsible}>
              <Input value={form.responsible} onChange={set("responsible")} placeholder="Nome de quem retirou" />
            </Field>
            <Field label="Quantidade de rolos" error={errors.rolls} hint={rollsNum > 0 ? `Saldo após: ${available - rollsNum} rolos` : undefined}>
              <Input type="number" min={1} step={1} inputMode="numeric" value={form.rolls} onChange={set("rolls")} placeholder="0" />
            </Field>
            <Field label="Observação">
              <Textarea value={form.notes} onChange={set("notes")} rows={2} placeholder="Setor, finalidade…" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending || stock.isLoading} className="flex-1">
                {save.isPending ? <Spinner /> : <ArrowUpFromLine />} {editing ? "Salvar alterações" : "Registrar retirada"}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(empty()); setErrors({}); }}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Section>

        <Section title="Histórico de retiradas" description={`${stock.withdrawals.length} registro(s)`}>
          {stock.isLoading ? (
            <TableSkeleton />
          ) : stock.error ? (
            <ErrorState error={stock.error} />
          ) : !stock.withdrawals.length ? (
            <EmptyState>Nenhuma retirada registrada ainda.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Rolos</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="no-print w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="num whitespace-nowrap">{dateBR(w.withdrawal_date)}</TableCell>
                      <TableCell className="font-medium">{w.responsible}</TableCell>
                      <TableCell className="num text-right font-semibold text-destructive">−{int(w.rolls)}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground">{w.notes ?? "—"}</TableCell>
                      <TableCell className="no-print">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => startEdit(w)}><Pencil /></Button>
                          <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setToDelete(w)}><Trash2 className="text-destructive" /></Button>
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
        title="Excluir retirada?"
        description={toDelete ? `A retirada de ${dateBR(toDelete.withdrawal_date)} (${toDelete.rolls} rolos, ${toDelete.responsible}) será removida e o saldo recalculado.` : ""}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}