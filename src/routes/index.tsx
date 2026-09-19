import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  Flame,
  Wallet,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { PageHeader, StatCard, Section, TableSkeleton, ErrorState, LevelBadge, EmptyState } from "@/components/hub/ui";
import { useStock, usePurchases, stockLevel } from "@/lib/stock";
import { brl, dateBR, int, boxesAndRolls, monthKey, monthLabelLong, todayISO } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resumo — Fita Gomada HUB" },
      { name: "description", content: "Visão geral do estoque de fita gomada: saldo, entradas, retiradas, consumo e alertas." },
      { property: "og:title", content: "Resumo — Fita Gomada HUB" },
      { property: "og:description", content: "Visão geral do estoque de fita gomada." },
    ],
  }),
  component: ResumoPage,
});

function ResumoPage() {
  const stock = useStock();
  const purchases = usePurchases();
  const perBox = stock.settings?.rolls_per_box ?? 15;
  const eq = boxesAndRolls(stock.balance, perBox);
  const level = stockLevel(stock.balance, stock.settings);
  const thisMonth = monthKey(todayISO());
  const consumoMes = stock.withdrawals
    .filter((w) => monthKey(w.withdrawal_date) === thisMonth)
    .reduce((s, w) => s + w.rolls, 0);
  const entradasMes = stock.entries
    .filter((e) => monthKey(e.entry_date) === thisMonth)
    .reduce((s, e) => s + e.total_rolls, 0);
  const investimento = (purchases.data ?? []).reduce((s, p) => s + Number(p.total_value), 0);
  const kgTotal = (purchases.data ?? []).reduce((s, p) => s + Number(p.weight_kg ?? 0), 0);
  const last = stock.baseline;
  const recent = [...stock.timeline].reverse().slice(0, 8);

  const alerts: { tone: "warning" | "destructive" | "info"; text: string }[] = [];
  if (stock.settings) {
    if (level === "critico")
      alerts.push({ tone: "destructive", text: `Estoque crítico: ${stock.balance} rolos (limite ${stock.settings.alert_critical_rolls}).` });
    else if (level === "baixo")
      alerts.push({ tone: "warning", text: `Estoque baixo: ${stock.balance} rolos (limite ${stock.settings.alert_low_rolls}).` });
  }
  if (last && last.difference !== 0)
    alerts.push({ tone: "info", text: `Último inventário (${dateBR(last.inventory_date)}) registrou divergência de ${last.difference > 0 ? "+" : ""}${last.difference} rolos.` });

  if (stock.error) return <ErrorState error={stock.error} />;

  return (
    <div>
      <PageHeader
        title="Resumo"
        description="Situação atual do estoque de fita gomada e principais indicadores."
        actions={
          <>
            <Button asChild variant="outline"><Link to="/entradas">Nova entrada</Link></Button>
            <Button asChild><Link to="/retiradas">Nova retirada</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estoque atual"
          tone={level === "ok" ? "primary" : level === "baixo" ? "warning" : "destructive"}
          value={stock.isLoading ? "…" : `${int(stock.balance)} rolos`}
          hint={stock.isLoading ? "" : <span className="flex items-center gap-2">{eq.label} <LevelBadge level={level} /></span>}
          icon={<Boxes className="h-4 w-4" />}
        />
        <StatCard
          label="Entradas desde o inventário"
          value={stock.isLoading ? "…" : `+${int(stock.entriesAfter)} rolos`}
          hint={`Este mês: ${int(entradasMes)} rolos`}
          icon={<ArrowDownToLine className="h-4 w-4" />}
        />
        <StatCard
          label="Retiradas desde o inventário"
          value={stock.isLoading ? "…" : `−${int(stock.withdrawalsAfter)} rolos`}
          hint={`Total de ${stock.withdrawals.length} retirada(s) registrada(s)`}
          icon={<ArrowUpFromLine className="h-4 w-4" />}
        />
        <StatCard
          label={`Consumo de ${monthLabelLong(thisMonth).toLowerCase()}`}
          value={stock.isLoading ? "…" : `${int(consumoMes)} rolos`}
          hint={perBox ? `≈ ${(consumoMes / perBox).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} caixas` : ""}
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          label="Investimento histórico"
          value={purchases.isLoading ? "…" : brl(investimento)}
          hint={`${purchases.data?.length ?? 0} compra(s) · ${kgTotal.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} kg`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Último inventário"
          value={stock.isLoading ? "…" : last ? dateBR(last.inventory_date) : "—"}
          hint={last ? `${last.boxes} cx + ${last.loose_rolls} avulsos = ${last.counted_rolls} rolos · dif. ${last.difference > 0 ? "+" : ""}${last.difference}` : "Nenhum inventário registrado"}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <div className="card-elevated p-5 sm:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Alertas</div>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts.length === 0 && (
              <li className="flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" /> Nenhum alerta. Estoque dentro do esperado.</li>
            )}
            {alerts.map((a, i) => (
              <li
                key={i}
                className={
                  a.tone === "destructive"
                    ? "flex items-start gap-2 text-destructive"
                    : a.tone === "warning"
                      ? "flex items-start gap-2 text-warning-foreground"
                      : "flex items-start gap-2 text-info"
                }
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {a.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <Section title="Movimentações recentes" description="Últimos lançamentos com saldo resultante.">
          {stock.isLoading ? (
            <TableSkeleton />
          ) : recent.length === 0 ? (
            <EmptyState>Sem movimentações.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="num">{dateBR(m.date)}</TableCell>
                    <TableCell className="capitalize">{m.kind}</TableCell>
                    <TableCell>
                      <div>{m.description}</div>
                      <div className="text-xs text-muted-foreground">{m.detail}</div>
                    </TableCell>
                    <TableCell className={`num text-right font-medium ${m.kind === "retirada" ? "text-destructive" : m.kind === "entrada" ? "text-success" : ""}`}>
                      {m.kind === "inventario" ? `= ${m.qty}` : m.qty > 0 ? `+${m.qty}` : m.qty}
                    </TableCell>
                    <TableCell className="num text-right font-semibold">{m.running}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>
    </div>
  );
}