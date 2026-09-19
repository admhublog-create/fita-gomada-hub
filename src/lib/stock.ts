import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Settings = Tables<"settings">;
export type Purchase = Tables<"purchases">;
export type Entry = Tables<"entries">;
export type Withdrawal = Tables<"withdrawals">;
export type Inventory = Tables<"inventories">;

export const keys = {
  settings: ["settings"] as const,
  purchases: ["purchases"] as const,
  entries: ["entries"] as const,
  withdrawals: ["withdrawals"] as const,
  inventories: ["inventories"] as const,
};

const throwIf = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: async () =>
      throwIf(await supabase.from("settings").select("*").eq("id", 1).single()),
  });
}
export function usePurchases() {
  return useQuery({
    queryKey: keys.purchases,
    queryFn: async () =>
      throwIf(
        await supabase
          .from("purchases")
          .select("*")
          .order("purchase_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ),
  });
}
export function useEntries() {
  return useQuery({
    queryKey: keys.entries,
    queryFn: async () =>
      throwIf(
        await supabase
          .from("entries")
          .select("*")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ),
  });
}
export function useWithdrawals() {
  return useQuery({
    queryKey: keys.withdrawals,
    queryFn: async () =>
      throwIf(
        await supabase
          .from("withdrawals")
          .select("*")
          .order("withdrawal_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ),
  });
}
export function useInventories() {
  return useQuery({
    queryKey: keys.inventories,
    queryFn: async () =>
      throwIf(
        await supabase
          .from("inventories")
          .select("*")
          .order("inventory_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useInvalidateStock() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.entries });
    qc.invalidateQueries({ queryKey: keys.withdrawals });
    qc.invalidateQueries({ queryKey: keys.inventories });
    qc.invalidateQueries({ queryKey: keys.purchases });
    qc.invalidateQueries({ queryKey: keys.settings });
  };
}

/* ---------- Cálculo de saldo / linha do tempo ---------- */

export type Movement = {
  id: string;
  kind: "inventario" | "entrada" | "retirada";
  date: string;
  createdAt: string;
  qty: number; // positivo p/ entrada, negativo p/ retirada, contagem p/ inventário
  running: number;
  afterBaseline: boolean;
  description: string;
  detail: string;
};

export function buildTimeline(inventories: Inventory[], entries: Entry[], withdrawals: Withdrawal[]) {
  type Ev = Omit<Movement, "running" | "afterBaseline">;
  const evs: Ev[] = [
    ...inventories.map((i) => ({
      id: i.id,
      kind: "inventario" as const,
      date: i.inventory_date,
      createdAt: i.created_at,
      qty: i.counted_rolls,
      description: "Inventário (nova referência)",
      detail: `${i.boxes} cx + ${i.loose_rolls} avulsos · sistema antes ${i.system_balance_before} · dif. ${i.difference > 0 ? "+" : ""}${i.difference}`,
    })),
    ...entries.map((e) => ({
      id: e.id,
      kind: "entrada" as const,
      date: e.entry_date,
      createdAt: e.created_at,
      qty: e.total_rolls,
      description: `Entrada${e.supplier ? ` · ${e.supplier}` : ""}`,
      detail: `${e.boxes} cx + ${e.loose_rolls} avulsos${e.document ? ` · ${e.document}` : ""}`,
    })),
    ...withdrawals.map((w) => ({
      id: w.id,
      kind: "retirada" as const,
      date: w.withdrawal_date,
      createdAt: w.created_at,
      qty: -w.rolls,
      description: `Retirada · ${w.responsible}`,
      detail: w.notes ?? "",
    })),
  ];
  evs.sort((a, b) =>
    a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date),
  );
  // índice do último inventário
  let lastInvIdx = -1;
  evs.forEach((e, i) => {
    if (e.kind === "inventario") lastInvIdx = i;
  });
  let running = 0;
  const timeline: Movement[] = evs.map((e, i) => {
    if (e.kind === "inventario") running = e.qty;
    else running += e.qty;
    return { ...e, running, afterBaseline: i > lastInvIdx };
  });
  const lastInvId = lastInvIdx >= 0 ? evs[lastInvIdx]?.id : undefined;
  const baseline = lastInvId ? (inventories.find((x) => x.id === lastInvId) ?? null) : null;
  const entriesAfter = timeline.filter((m) => m.kind === "entrada" && m.afterBaseline).reduce((s, m) => s + m.qty, 0);
  const withdrawalsAfter = timeline
    .filter((m) => m.kind === "retirada" && m.afterBaseline)
    .reduce((s, m) => s + Math.abs(m.qty), 0);
  return { timeline, baseline, balance: running, entriesAfter, withdrawalsAfter };
}

export function useStock() {
  const settings = useSettings();
  const inv = useInventories();
  const ent = useEntries();
  const wd = useWithdrawals();
  const isLoading = settings.isLoading || inv.isLoading || ent.isLoading || wd.isLoading;
  const error = settings.error || inv.error || ent.error || wd.error;
  const data =
    inv.data && ent.data && wd.data ? buildTimeline(inv.data, ent.data, wd.data) : null;
  return {
    isLoading,
    error,
    settings: settings.data ?? null,
    inventories: inv.data ?? [],
    entries: ent.data ?? [],
    withdrawals: wd.data ?? [],
    ...(data ?? { timeline: [], baseline: null, balance: 0, entriesAfter: 0, withdrawalsAfter: 0 }),
  };
}

export type StockLevel = "ok" | "baixo" | "critico";
export function stockLevel(balance: number, s: Settings | null): StockLevel {
  if (!s) return "ok";
  if (balance <= s.alert_critical_rolls) return "critico";
  if (balance <= s.alert_low_rolls) return "baixo";
  return "ok";
}