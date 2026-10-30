export interface CounterReading {
  oid?: string;
  index: string;
  valueRaw: string;
  unitCodeRaw?: string;
  unitLabel?: string;
  deltaStatus?: string;
  deltaRaw?: string;
  intervalStart?: string;
}

export interface SupplyReading {
  index: string;
  description?: string;
  levelRaw?: string;
  maxCapacityRaw?: string;
  unitCodeRaw?: string;
}

export interface PrinterStatus {
  online: boolean | null;
  printerState: string | null;
  display: string | null;
  lastPoll: string | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  lastChange: string | null;
  lastError: string | null;
  counters: CounterReading[] | null;
  supplies: SupplyReading[] | null;
}

export interface Printer {
  id: string;
  ip: string;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  status: PrinterStatus | null;
}

export interface DashboardSummary {
  month: string;
  printers: { total: number; online: number; offline: number; unknown: number };
  monthlyTotalRaw: string;
  timezone: string;
  attribution: string;
}

export interface MonthlyPrinterRow {
  printerId: string;
  ip: string;
  online: boolean | null;
  totalRaw: string;
  sampleCount: number;
  resets: number;
  firstReadingAt: string | null;
  lastReadingAt: string | null;
  lastValueRaw: string | null;
  unitCodeRaw: string | null;
}

export interface MonthlyReport {
  month: string;
  timezone: string;
  attribution: string;
  counterOid: string;
  totalRaw: string;
  printers: MonthlyPrinterRow[];
}

export interface MetricItem {
  id: string;
  timestamp: string;
  values: { counters?: CounterReading[] };
}

export interface PrinterMetrics {
  printer: { id: string; ip: string };
  month: string | null;
  items: MetricItem[];
}

export interface PrinterEvent {
  id: string;
  printerId: string;
  timestamp: string;
  type: string;
  changes: Record<
    string,
    { old: string | boolean | null; new: string | boolean | null }
  >;
}
