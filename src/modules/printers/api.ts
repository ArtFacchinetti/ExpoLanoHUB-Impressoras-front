import type {
  DashboardSummary,
  MonthlyReport,
  Printer,
  PrinterEvent,
  PrinterMetrics,
  PollOutcome,
} from "./types";

async function requestJson<T>(
  basePath: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${basePath.replace(/\/$/, "")}${path}`, options);
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new Error(
      "Não foi possível conectar à API. Verifique se o backend está ativo.",
    );
  }
  if (!response.ok) {
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error;
    } catch {
      /* o proxy pode devolver texto ou HTML */
    }
    throw new Error(message || `Falha na API (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function getJson<T>(basePath: string, path: string, signal?: AbortSignal) {
  return requestJson<T>(basePath, path, { signal });
}

export function createPrinterApi(basePath: string) {
  return {
    summary: (month: string, signal?: AbortSignal) =>
      getJson<DashboardSummary>(
        basePath,
        `/dashboard/summary?month=${encodeURIComponent(month)}`,
        signal,
      ),
    printers: (signal?: AbortSignal) =>
      getJson<Printer[]>(basePath, "/printers/status", signal),
    printer: (id: string, signal?: AbortSignal) =>
      getJson<Printer>(
        basePath,
        `/printers/${encodeURIComponent(id)}/status`,
        signal,
      ),
    metrics: (id: string, month: string, signal?: AbortSignal) =>
      getJson<PrinterMetrics>(
        basePath,
        `/printers/${encodeURIComponent(id)}/metrics?month=${encodeURIComponent(month)}&limit=100`,
        signal,
      ),
    events: (id: string, signal?: AbortSignal) =>
      getJson<PrinterEvent[]>(
        basePath,
        `/printers/events?printerId=${encodeURIComponent(id)}`,
        signal,
      ),
    report: (month: string, signal?: AbortSignal) =>
      getJson<MonthlyReport>(
        basePath,
        `/reports/monthly?month=${encodeURIComponent(month)}`,
        signal,
      ),
    poll: (id: string, level: "FAST" | "NORMAL") =>
      requestJson<PollOutcome>(
        basePath,
        `/printers/${encodeURIComponent(id)}/poll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level }),
        },
      ),
  };
}
