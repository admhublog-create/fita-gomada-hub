export const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const kg = (v: number | null | undefined) =>
  v == null
    ? "—"
    : `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(v))} kg`;

export const int = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR").format(Number(v));

/** "2026-09-19" -> "19/09/2026" (sem fuso) */
export const dateBR = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const dateTimeBR = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/** Data de hoje em ISO (YYYY-MM-DD) no fuso local */
export const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(m) - 1]}/${y}`;
};

export const monthLabelLong = (key: string) => {
  const [y, m] = key.split("-");
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${names[Number(m) - 1]} de ${y}`;
};

/** Converte rolos em "X caixas + Y rolos" */
export const boxesAndRolls = (rolls: number, perBox: number) => {
  const boxes = Math.floor(rolls / perBox);
  const loose = rolls % perBox;
  return { boxes, loose, label: `${boxes} cx + ${loose} rolo${loose === 1 ? "" : "s"}` };
};