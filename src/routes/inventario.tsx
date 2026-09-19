import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Field, TableSkeleton, ErrorState, EmptyState, ConfirmDelete, Spinner } from "@/components/hub/ui";
import { useStock, useInvalidateStock, type Inventory } from "@/lib/stock";
import { dateBR, dateTimeBR, todayISO, int } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventário — Fita Gomada HUB" },
      { name: "description", content: "Contagem física de caixas e rolos avulsos de fita gomada, com cálculo de divergência e histórico de inventários." },
      { property: "og:title", content: "Inventário — Fita Gomada HUB" },
      { property: "og:description", content: "Contagem física e divergências do estoque de fita gomada." },
    ],
  }),
  component: InventarioPage,
});

function InventarioPage() {
  const stock = useStock();
  const invalidate = useInvalidateStock();
  const perBox = stock.settings?.rolls_per_box ?? 15;
  const [date, setDate] = useState(todayISO());
  const [boxes, setBoxes] = useState("");
  const [loose, setLoose] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ date?: string; boxes?: string; loose?: string }>({});
  const [toDelete, setToDelete] = useState<Inventory | null>(null);

  const counted = Number(boxes || 0) * perBox + Number(loose || 0);
  const systemBefore = stock.balance;
  const diff = counted - systemBefore;

  const save = useMutation({
    mutationFn: async () => {
      const errs: typeof errors = {};
      if (!date) errs.date = "Informe a data.";
      const b = Number(boxes || 0), l = Number(loose || 0);
      if (!Number.isInteger(b) || b < 0) errs.boxes = "Inteiro ≥ 0.";
      if (!Number.isInteger(l) || l < 0) errs.loose = "Inteiro ≥ 0.";
      if (boxes === "" && loose === "") errs.boxes = "Informe a contagem (pode ser 0).";
      setErrors(errs);
      if (Object.keys(errs).length) throw new Error("Corrija os campos destacados.");
      const r = await supabase.from("inventories").insert({
        inventory_date: date,
        boxes: b,
        loose_rolls: l,
        counted_rolls: counted,
        system_balance_before: systemBefore,
        difference: diff,
        notes: notes.trim() || null,
      });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      toast.success(`Inventário registrado. Novo saldo de referência: ${counted} rolos (dif. ${diff > 0 ? "+" : ""}${diff}).`);
      setBoxes(""); setLoose(""); setNotes(""); setErrors({});
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await supabase.from("inventories").delete().eq("id", id);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => { toast.success("Inventário excluído. Saldo recalculado."); setToDelete(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Inventário"
        description="A contagem física passa a ser a nova referência do estoque. Movimentos posteriores somam/subtraem a partir dela; o histórico é preservado."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
        <Section title="Registrar contagem" description={`1 caixa = ${perBox} rolos`}>
          <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <Field label="Data da contagem" error={errors.date}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Caixas físicas" error={errors.boxes}>
                <Input type="number" min={0} step={1} inputMode="numeric" value={boxes} onChange={(e) => setBoxes(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Rolos avulsos" error={errors.loose}>
                <Input type="number" min={0} step={1} inputMode="numeric" value={loose} onChange={(e) => setLoose(e.target.value)} placeholder="0" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3 text-center">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Contado</div>
                <div className="num text-xl font-semibold">{counted}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sistema antes</div>
                <div className="num text-xl font-semibold">{stock.isLoading ? "…" : systemBefore}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Diferença</div>
                <div className={`num text-xl font-semibold ${diff < 0 ? "text-destructive" : diff > 0 ? "text-success" : ""}`}>
                  {stock.isLoading ? "…" : `${diff > 0 ? "+" : ""}${diff}`}
                </div>
              </div>
            </div>
            <Field label="Observação">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Quem conferiu, motivo da divergência…" />
            </Field>
            <Button type="submit" className="w-full" disabled={save.isPending || stock.isLoading}>
              {save.isPending ? <Spinner /> : <ClipboardCheck />} Registrar inventário
            </Button>
          </form>
        </Section>

        <Section title="Histórico de inventários" description="O mais recente (por data) é a referência atual do saldo.">
          {stock.isLoading ? (
            <TableSkeleton />
          ) : stock.error ? (
            <ErrorState error={stock.error} />
          ) : !stock.inventories.length ? (
            <EmptyState>Nenhum inventário registrado.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Caixas</TableHead>
                    <TableHead className="text-right">Avulsos</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Sistema antes</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Obs.</TableHead>
                    <TableHead className="no-print w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.inventories.map((i) => {
                    const isRef = stock.baseline?.id === i.id;
                    return (
                      <TableRow key={i.id} className={isRef ? "bg-accent/40" : ""}>
                        <TableCell className="whitespace-nowrap">
                          <div className="num">{dateBR(i.inventory_date)}</div>
                          <div className="text-[11px] text-muted-foreground">{isRef ? "Referência atual" : `registrado ${dateTimeBR(i.created_at)}`}</div>
                        </TableCell>
                        <TableCell className="num text-right">{int(i.boxes)}</TableCell>
                        <TableCell className="num text-right">{int(i.loose_rolls)}</TableCell>
                        <TableCell className="num text-right font-semibold">{int(i.counted_rolls)}</TableCell>
                        <TableCell className="num text-right">{int(i.system_balance_before)}</TableCell>
                        <TableCell className={`num text-right font-semibold ${i.difference < 0 ? "text-destructive" : i.difference > 0 ? "text-success" : ""}`}>
                          {i.difference > 0 ? "+" : ""}{i.difference}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">{i.notes ?? "—"}</TableCell>
                        <TableCell className="no-print">
                          <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => setToDelete(i)}><Trash2 className="text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
        title="Excluir inventário?"
        description={toDelete ? `O inventário de ${dateBR(toDelete.inventory_date)} (${toDelete.counted_rolls} rolos) será removido e o saldo passará a usar a referência anterior.` : ""}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}