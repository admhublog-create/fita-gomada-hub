import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, Section, TableSkeleton, ErrorState, EmptyState, LevelBadge } from "@/components/hub/ui";
import { useStock, stockLevel } from "@/lib/stock";
import { dateBR, int, boxesAndRolls } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Fita Gomada HUB" },
      { name: "description", content: "Movimentações, saldo em rolos e equivalência em caixas do estoque de fita gomada." },
      { property: "og:title", content: "Estoque — Fita Gomada HUB" },
      { property: "og:description", content: "Movimentações e saldo do estoque de fita gomada." },
    ],
  }),
  component: EstoquePage,
});

function EstoquePage() {
  const stock = useStock();
  const perBox = stock.settings?.rolls_per_box ?? 15;
  const eq = boxesAndRolls(stock.balance, perBox);
  const level = stockLevel(stock.balance, stock.settings);
  const rows = [...stock.timeline].reverse();

  if (stock.error) return <ErrorState error={stock.error} />;

  return (
    <div>
      <PageHeader
        title="Estoque"
        description={`Saldo calculado a partir do último inventário + entradas posteriores − retiradas posteriores. Regra: 1 caixa = ${perBox} rolos.`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo atual" tone="primary" value={stock.isLoading ? "…" : `${int(stock.balance)} rolos`} hint={<span className="flex items-center gap-2">{eq.label} <LevelBadge level={level} /></span>} />
        <StatCard label="Caixas fechadas" value={stock.isLoading ? "…" : int(eq.boxes)} hint={`${perBox} rolos por caixa`} />
        <StatCard label="Rolos avulsos" value={stock.isLoading ? "…" : int(eq.loose)} />
        <StatCard
          label="Referência (inventário)"
          value={stock.isLoading ? "…" : stock.baseline ? `${int(stock.baseline.counted_rolls)} rolos` : "—"}
          hint={stock.baseline ? `em ${dateBR(stock.baseline.inventory_date)} · +${stock.entriesAfter} entradas · −${stock.withdrawalsAfter} retiradas` : "Nenhum inventário"}
        />
      </div>

      <div className="mt-6">
        <Section title="Movimentações" description="Histórico completo. Linhas anteriores ao último inventário são mantidas como histórico e não afetam o saldo atual.">
          {stock.isLoading ? (
            <TableSkeleton rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState>Nenhuma movimentação registrada.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Rolos</TableHead>
                    <TableHead className="text-right">Saldo após</TableHead>
                    <TableHead className="text-right">Equivalência</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m) => {
                    const e = boxesAndRolls(m.running, perBox);
                    return (
                      <TableRow key={m.id} className={m.afterBaseline || m.kind === "inventario" ? "" : "opacity-60"}>
                        <TableCell className="num whitespace-nowrap">{dateBR(m.date)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              m.kind === "entrada"
                                ? "rounded bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                                : m.kind === "retirada"
                                  ? "rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                                  : "rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                            }
                          >
                            {m.kind === "inventario" ? "Inventário" : m.kind === "entrada" ? "Entrada" : "Retirada"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>{m.description}</div>
                          {m.detail && <div className="text-xs text-muted-foreground">{m.detail}</div>}
                        </TableCell>
                        <TableCell className="num text-right font-medium">
                          {m.kind === "inventario" ? `= ${m.qty}` : m.qty > 0 ? `+${m.qty}` : m.qty}
                        </TableCell>
                        <TableCell className="num text-right font-semibold">{m.running}</TableCell>
                        <TableCell className="num text-right text-muted-foreground">{e.label}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.kind === "inventario" ? "Referência" : m.afterBaseline ? "Conta no saldo" : "Histórico"}
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
    </div>
  );
}