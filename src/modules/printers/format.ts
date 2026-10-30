import type { CounterReading, Printer } from "./types";

export function currentMonth(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, number - 1, 1)));
}

export function formatRaw(value: string | null | undefined): string {
  if (value == null || !/^\d+$/.test(value)) return "—";
  return BigInt(value).toLocaleString("pt-BR");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function stateLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    idle: "Pronta",
    printing: "Imprimindo",
    warmup: "Aquecendo",
    unknown: "Desconhecido",
  };
  return value ? labels[value.toLowerCase()] || value : "Sem leitura";
}

export function availability(value: boolean | null | undefined): {
  label: string;
  tone: string;
} {
  if (value === true) return { label: "Online", tone: "online" };
  if (value === false) return { label: "Offline", tone: "offline" };
  return { label: "Desconhecida", tone: "unknown" };
}

export function lifeCounter(
  counters: CounterReading[] | null | undefined,
): CounterReading | undefined {
  return (
    counters?.find(
      (counter) =>
        counter.index === "1.1" &&
        counter.oid?.startsWith("1.3.6.1.2.1.43.10.2.1.4"),
    ) ?? counters?.find((counter) => counter.index === "1.1" && !counter.oid)
  );
}

export function printerName(
  printer: Pick<Printer, "description" | "ip">,
): string {
  return printer.description?.trim() || `Impressora ${printer.ip}`;
}
