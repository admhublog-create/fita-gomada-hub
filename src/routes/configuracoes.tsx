import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Field, TableSkeleton, ErrorState, Spinner } from "@/components/hub/ui";
import { useSettings, useInvalidateStock } from "@/lib/stock";
import { dateTimeBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Fita Gomada HUB" },
      { name: "description", content: "Regra de rolos por caixa e limites de alerta de estoque do Fita Gomada HUB." },
      { property: "og:title", content: "Configurações — Fita Gomada HUB" },
      { property: "og:description", content: "Regras e alertas do estoque de fita gomada." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const settings = useSettings();
  const invalidate = useInvalidateStock();
  const [perBox, setPerBox] = useState("15");
  const [low, setLow] = useState("45");
  const [critical, setCritical] = useState("15");
  const [errors, setErrors] = useState<{ perBox?: string; low?: string; critical?: string }>({});

  useEffect(() => {
    if (settings.data) {
      setPerBox(String(settings.data.rolls_per_box));
      setLow(String(settings.data.alert_low_rolls));
      setCritical(String(settings.data.alert_critical_rolls));
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const p = Number(perBox), l = Number(low), c = Number(critical);
      const errs: typeof errors = {};
      if (!Number.isInteger(p) || p <= 0) errs.perBox = "Inteiro maior que zero.";
      if (!Number.isInteger(l) || l < 0) errs.low = "Inteiro ≥ 0.";
      if (!Number.isInteger(c) || c < 0) errs.critical = "Inteiro ≥ 0.";
      if (!errs.low && !errs.critical && c > l) errs.critical = "O limite crítico deve ser menor ou igual ao limite baixo.";
      setErrors(errs);
      if (Object.keys(errs).length) throw new Error("Corrija os campos destacados.");
      const r = await supabase.from("settings").update({ rolls_per_box: p, alert_low_rolls: l, alert_critical_rolls: c }).eq("id", 1);
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => { toast.success("Configurações salvas."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Configurações" description="Regras de conversão e limites de alerta usados em todo o sistema." />
      <div className="max-w-xl">
        <Section title="Regras e alertas" description={settings.data ? `Última atualização: ${dateTimeBR(settings.data.updated_at)}` : undefined}>
          {settings.isLoading ? (
            <TableSkeleton rows={3} />
          ) : settings.error ? (
            <ErrorState error={settings.error} />
          ) : (
            <form className="space-y-5 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <Field label="Rolos por caixa" error={errors.perBox} hint="Usado para converter caixas em rolos nas entradas, inventários e equivalências. Padrão: 15.">
                <Input type="number" min={1} step={1} value={perBox} onChange={(e) => setPerBox(e.target.value)} />
              </Field>
              <Field label="Alerta de estoque baixo (rolos)" error={errors.low} hint="Saldo igual ou abaixo deste valor exibe alerta amarelo no Resumo.">
                <Input type="number" min={0} step={1} value={low} onChange={(e) => setLow(e.target.value)} />
              </Field>
              <Field label="Alerta de estoque crítico (rolos)" error={errors.critical} hint="Saldo igual ou abaixo deste valor exibe alerta vermelho.">
                <Input type="number" min={0} step={1} value={critical} onChange={(e) => setCritical(e.target.value)} />
              </Field>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? <Spinner /> : <Save />} Salvar configurações</Button>
            </form>
          )}
        </Section>
      </div>
    </div>
  );
}