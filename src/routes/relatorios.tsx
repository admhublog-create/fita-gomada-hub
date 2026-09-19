import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader, Section, StatCard, TableSkeleton, ErrorState, EmptyState, Field } from "@/components/hub/ui";
import { useStock, usePurchases } from "@/lib/stock";
import { brl, kg, dateBR, int, monthKey, monthLabel, todayISO, boxesAndRolls } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Fita Gomada HUB" },
      { name: "description", content: "Relatórios de compras, entradas, retiradas, consumo por responsável, inventários e indicadores do estoque de fita gomada." },
      { property: "og:title", content: "Relatórios — Fita Gomada HUB" },
      { property: "og:description", content: "Relatórios e indicadores do estoque de fita gomada." },
    ],
  }),
  component: RelatoriosPage,
});

function firstDayOfYear() {
  return `${todayISO().slice(0, 4)}-01-01`;
}

function RelatoriosPage() {
  const stock = useStock();
  const purchases = usePurchases();
  const [from, setFrom] = useState(firstDayOfYear());
  const [to, setTo] = useState(todayISO());
  const [month, setMonth] = useState("");
  const perBox = stock.settings?.rolls_per_box ?? 15;

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const applyMonth = (m: string) => {
    setMonth(m);
    if (!m) return;
    const [y, mm] = m.split("-").map(Number);
    const last = new Date(y!, mm!, 0).getDate();
    setFrom(`${m}-01`);
    setTo(`${m}-${String(last).padStart(2, "0")}`);
  };

  const data = useMemo(() => {
    const pur = (purchases.data ?? []).filter((p) => inRange(p.purchase_date));
    const ent = stock.entries.filter((e) => inRange(e.entry_date));
    const wd = stock.withdrawals.filter((w) => inRange(w.withdrawal_date));
    const inv = stock.inventories.filter((i) => inRange(i.inventory_date));

    const byMonth = new Map<string, { value: number; kg: number; count: number; rolls: number }>();
    for (const p of pur) {
      const k = monthKey(p.purchase_date);
      const cur = byMonth.get(k) ?? { value: 0, kg: 0, count: 0, rolls: 0 };
      cur.value += Number(p.total_value); cur.kg += Number(p.weight_kg ?? 0); cur.count += 1; cur.rolls += p.rolls ?? 0;
      byMonth.set(k, cur);
    }
    const movByMonth = new Map<string, { in: number; out: number }>();
    for (const e of ent) { const k = monthKey(e.entry_date); const c = movByMonth.get(k) ?? { in: 0, out: 0 }; c.in += e.total_rolls; movByMonth.set(k, c); }
    for (const w of wd) { const k = monthKey(w.withdrawal_date); const c = movByMonth.get(k) ?? { in: 0, out: 0 }; c.out += w.rolls; movByMonth.set(k, c); }

    const byResp = new Map<string, { rolls: number; count: number }>();
    for (const w of wd) { const c = byResp.get(w.responsible) ?? { rolls: 0, count: 0 }; c.rolls += w.rolls; c.count += 1; byResp.set(w.responsible, c); }

    const totalValue = pur.reduce((s, p) => s + Number(p.total_value), 0);
    const totalKg = pur.reduce((s, p) => s + Number(p.weight_kg ?? 0), 0);
    const totalIn = ent.reduce((s, e) => s + e.total_rolls, 0);
    const totalOut = wd.reduce((s, w) => s + w.rolls, 0);
    const months = new Set([...ent.map((e) => monthKey(e.entry_date)), ...wd.map((w) => monthKey(w.withdrawal_date))]).size || 1;

    return {
      pur, ent, wd, inv,
      byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)),
      movByMonth: [...movByMonth.entries()].sort(([a], [b]) => a.localeCompare(b)),
      byResp: [...byResp.entries()].sort((a, b) => b[1].rolls - a[1].rolls),
      totalValue, totalKg, totalIn, totalOut,
      avgOutPerMonth: totalOut / months,
      costPerKg: totalKg > 0 ? totalValue / totalKg : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases.data, stock.entries, stock.withdrawals, stock.inventories, from, to]);

  const loading = stock.isLoading || purchases.isLoading;
  const error = stock.error || purchases.error;
  const eq = boxesAndRolls(stock.balance, perBox);

  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Filtre por período ou mês e imprima / salve em PDF."
        actions={<Button onClick={() => window.print()}><Printer /> Imprimir / Salvar PDF</Button>}
      />

      <div className="no-print card-elevated mb-6 grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
        <Field label="Mês">
          <Input type="month" value={month} onChange={(e) => applyMonth(e.target.value)} />
        </Field>
        <Field label="De">
          <Input type="date" value={from} onChange={(e) => { setMonth(""); setFrom(e.target.value); }} />
        </Field>
        <Field label="Até">
          <Input type="date" value={to} onChange={(e) => { setMonth(""); setTo(e.target.value); }} />
        </Field>
        <div className="flex items-end gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { setMonth(""); setFrom(firstDayOfYear()); setTo(todayISO()); }}>Ano atual</Button>
          <Button variant="outline" className="flex-1" onClick={() => { setMonth(""); setFrom(""); setTo(""); }}>Tudo</Button>
        </div>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="text-2xl font-bold">Fita Gomada HUB — Relatório</div>
        <div className="text-sm">
          Período: {from ? dateBR(from) : "início"} a {to ? dateBR(to) : "hoje"} · Emitido em {new Date().toLocaleString("pt-BR")}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Estoque atual" tone="primary" value={`${int(stock.balance)} rolos`} hint={eq.label} />
            <StatCard label="Entradas no período" value={`+${int(data.totalIn)}`} hint={`${data.ent.length} lançamento(s)`} />
            <StatCard label="Retiradas no período" value={`−${int(data.totalOut)}`} hint={`média ${data.avgOutPerMonth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} rolos/mês`} />
            <StatCard label="Compras no período" value={brl(data.totalValue)} hint={`${kg(data.totalKg)} · ${brl(data.costPerKg)}/kg`} />
          </div>

          <Section title="Compras por mês">
            {data.byMonth.length === 0 ? <EmptyState>Sem compras no período.</EmptyState> : (
              <Table>
                <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead className="text-right">Compras</TableHead><TableHead className="text-right">Peso</TableHead><TableHead className="text-right">Rolos</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.byMonth.map(([k, v]) => (
                    <TableRow key={k}><TableCell className="font-medium">{monthLabel(k)}</TableCell><TableCell className="num text-right">{v.count}</TableCell><TableCell className="num text-right">{kg(v.kg)}</TableCell><TableCell className="num text-right">{v.rolls || "n/i"}</TableCell><TableCell className="num text-right font-semibold">{brl(v.value)}</TableCell></TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold"><TableCell>Total</TableCell><TableCell className="num text-right">{data.pur.length}</TableCell><TableCell className="num text-right">{kg(data.totalKg)}</TableCell><TableCell className="num text-right">{int(data.pur.reduce((s, p) => s + (p.rolls ?? 0), 0))}</TableCell><TableCell className="num text-right">{brl(data.totalValue)}</TableCell></TableRow>
                </TableBody>
              </Table>
            )}
          </Section>

          <Section title="Entradas e retiradas por mês">
            {data.movByMonth.length === 0 ? <EmptyState>Sem movimentações no período.</EmptyState> : (
              <Table>
                <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead className="text-right">Entradas</TableHead><TableHead className="text-right">Retiradas</TableHead><TableHead className="text-right">Líquido</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.movByMonth.map(([k, v]) => (
                    <TableRow key={k}><TableCell className="font-medium">{monthLabel(k)}</TableCell><TableCell className="num text-right text-success">+{v.in}</TableCell><TableCell className="num text-right text-destructive">−{v.out}</TableCell><TableCell className="num text-right font-semibold">{v.in - v.out > 0 ? "+" : ""}{v.in - v.out}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Section title="Consumo por responsável">
              {data.byResp.length === 0 ? <EmptyState>Sem retiradas no período.</EmptyState> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Responsável</TableHead><TableHead className="text-right">Retiradas</TableHead><TableHead className="text-right">Rolos</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.byResp.map(([name, v]) => (
                      <TableRow key={name}><TableCell className="font-medium">{name}</TableCell><TableCell className="num text-right">{v.count}</TableCell><TableCell className="num text-right font-semibold">{v.rolls}</TableCell><TableCell className="num text-right">{data.totalOut ? ((v.rolls / data.totalOut) * 100).toFixed(1) : "0"}%</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>

            <Section title="Inventários e divergências">
              {data.inv.length === 0 ? <EmptyState>Sem inventários no período.</EmptyState> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Contado</TableHead><TableHead className="text-right">Sistema</TableHead><TableHead className="text-right">Diferença</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.inv.map((i) => (
                      <TableRow key={i.id}><TableCell className="num">{dateBR(i.inventory_date)}</TableCell><TableCell className="num text-right">{i.counted_rolls}</TableCell><TableCell className="num text-right">{i.system_balance_before}</TableCell><TableCell className={`num text-right font-semibold ${i.difference < 0 ? "text-destructive" : i.difference > 0 ? "text-success" : ""}`}>{i.difference > 0 ? "+" : ""}{i.difference}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          </div>

          <Section title="Detalhamento de entradas">
            {data.ent.length === 0 ? <EmptyState>Sem entradas no período.</EmptyState> : (
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Caixas</TableHead><TableHead className="text-right">Avulsos</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Fornecedor</TableHead><TableHead>Documento</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.ent.map((e) => (
                    <TableRow key={e.id}><TableCell className="num">{dateBR(e.entry_date)}</TableCell><TableCell className="num text-right">{e.boxes}</TableCell><TableCell className="num text-right">{e.loose_rolls}</TableCell><TableCell className="num text-right font-semibold">+{e.total_rolls}</TableCell><TableCell>{e.supplier ?? "—"}</TableCell><TableCell>{e.document ?? "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          <Section title="Detalhamento de retiradas">
            {data.wd.length === 0 ? <EmptyState>Sem retiradas no período.</EmptyState> : (
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Rolos</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.wd.map((w) => (
                    <TableRow key={w.id}><TableCell className="num">{dateBR(w.withdrawal_date)}</TableCell><TableCell>{w.responsible}</TableCell><TableCell className="num text-right font-semibold">−{w.rolls}</TableCell><TableCell className="text-muted-foreground">{w.notes ?? "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          <Section title="Detalhamento de compras">
            {data.pur.length === 0 ? <EmptyState>Sem compras no período.</EmptyState> : (
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead className="text-right">Peso</TableHead><TableHead className="text-right">Cx</TableHead><TableHead className="text-right">Rolos</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Documento</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...data.pur].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date)).map((p) => (
                    <TableRow key={p.id}><TableCell className="num">{dateBR(p.purchase_date)}</TableCell><TableCell>{p.product}</TableCell><TableCell className="num text-right">{kg(p.weight_kg)}</TableCell><TableCell className="num text-right">{p.boxes ?? "n/i"}</TableCell><TableCell className="num text-right">{p.rolls ?? "n/i"}</TableCell><TableCell className="num text-right font-semibold">{brl(p.total_value)}</TableCell><TableCell>{p.document ?? "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}