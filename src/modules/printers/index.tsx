import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileBarChart2,
  HardDrive,
  LayoutDashboard,
  ListFilter,
  Printer as PrinterIcon,
  Play,
  RefreshCw,
  Search,
  ServerOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import { createPrinterApi } from "./api";
import {
  availability,
  currentMonth,
  formatDate,
  formatRaw,
  lifeCounter,
  monthLabel,
  printerName,
  stateLabel,
} from "./format";
import type { Printer, PrinterEvent } from "./types";
import "./styles.css";

interface ModuleContextValue {
  basePath: string;
  api: ReturnType<typeof createPrinterApi>;
  apiBasePath: string;
}

const ModuleContext = createContext<ModuleContextValue | null>(null);

function useModule() {
  const value = useContext(ModuleContext);
  if (!value) throw new Error("PrinterModule não foi montado.");
  return value;
}

export interface PrinterModuleProps {
  basePath?: string;
  apiBasePath?: string;
  embedded?: boolean;
}

/** Monte em uma rota com `/*`, por exemplo `/impressoras/*`. */
export function PrinterModule({
  basePath = "/impressoras",
  apiBasePath = "/api",
  embedded = false,
}: PrinterModuleProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
      }),
  );
  const normalizedBase = basePath.replace(/\/$/, "") || "/";
  const value = useMemo(
    () => ({
      basePath: normalizedBase,
      apiBasePath,
      api: createPrinterApi(apiBasePath),
    }),
    [normalizedBase, apiBasePath],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ModuleContext.Provider value={value}>
        <div className="printer-module">
          <ModuleShell embedded={embedded}>
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="lista" element={<PrinterListPage />} />
              <Route path="lista/:id" element={<PrinterDetailPage />} />
              <Route path="relatorios" element={<ReportPage />} />
            </Routes>
          </ModuleShell>
        </div>
      </ModuleContext.Provider>
    </QueryClientProvider>
  );
}

function ModuleShell({
  children,
  embedded,
}: {
  children: ReactNode;
  embedded: boolean;
}) {
  const { basePath } = useModule();
  if (embedded)
    return <main className="content embedded-content">{children}</main>;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          className="brand"
          to={basePath}
          aria-label="Ir para o painel de impressoras"
        >
          <span className="brand-mark">
            <PrinterIcon size={22} strokeWidth={2.2} />
          </span>
          <span>
            <strong>impressoras</strong>
            <small>Central de operação</small>
          </span>
        </Link>
        <div className="nav-label">MENU PRINCIPAL</div>
        <nav className="side-nav" aria-label="Navegação do módulo">
          <NavLink end to={basePath}>
            <LayoutDashboard size={19} /> Visão geral
          </NavLink>
          <NavLink to={`${basePath}/lista`}>
            <PrinterIcon size={19} /> Impressoras
          </NavLink>
          <NavLink to={`${basePath}/relatorios`}>
            <FileBarChart2 size={19} /> Relatório mensal
          </NavLink>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-info">
          <span className="sidebar-info-icon">
            <Activity size={18} />
          </span>
          <div>
            <strong>Monitoramento ativo</strong>
            <p>Status atualizado automaticamente a cada 30 segundos.</p>
          </div>
        </div>
        <div className="sidebar-footer">
          MÓDULO DE IMPRESSORAS <span>v0.1</span>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-title">
            <span className="mobile-logo">
              <PrinterIcon size={19} />
            </span>{" "}
            Ambiente local <ChevronRight size={15} /> Impressoras
          </div>
          <ConnectionStatus />
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function ConnectionStatus() {
  const { apiBasePath } = useModule();
  const health = useQuery({
    queryKey: ["printers", apiBasePath, "health"],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${apiBasePath.replace(/\/$/, "")}/health`, {
        signal,
      });
      if (!response.ok) throw new Error("API indisponível");
      return response.json() as Promise<{ status: string; database: string }>;
    },
    refetchInterval: 30_000,
    retry: false,
  });
  return (
    <div
      className={`connection ${health.isSuccess ? "connected" : health.isError ? "disconnected" : ""}`}
    >
      <span className="connection-dot" />{" "}
      {health.isSuccess
        ? "API conectada"
        : health.isError
          ? "API indisponível"
          : "Verificando API"}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ online }: { online: boolean | null | undefined }) {
  const status = availability(online);
  return (
    <span className={`status-badge ${status.tone}`}>
      <span />
      {status.label}
    </span>
  );
}

function QueryState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: Error | null;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="state-panel">
        <span className="spinner" />
        <strong>Carregando dados</strong>
        <p>Consultando o módulo de impressoras...</p>
      </div>
    );
  if (error)
    return (
      <div className="state-panel">
        <ServerOff size={30} />
        <strong>Não foi possível carregar os dados</strong>
        <p>{error.message}</p>
        <button className="button secondary" onClick={retry}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      </div>
    );
  return <>{children}</>;
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PrinterTable({
  printers,
  compact = false,
}: {
  printers: Printer[];
  compact?: boolean;
}) {
  const { basePath } = useModule();
  if (printers.length === 0)
    return (
      <div className="empty-inline">
        <PrinterIcon size={28} />
        <strong>Nenhuma impressora encontrada</strong>
        <p>Os equipamentos cadastrados aparecerão aqui.</p>
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>IMPRESSORA</th>
            <th>STATUS</th>
            <th>ESTADO / VISOR</th>
            <th>ÚLTIMO SUCESSO</th>
            <th className="number-cell">CONTADOR ATUAL</th>
            <th aria-label="Abrir detalhe" />
          </tr>
        </thead>
        <tbody>
          {printers.map((printer) => (
            <tr key={printer.id}>
              <td>
                <Link
                  className="printer-cell"
                  to={`${basePath}/lista/${printer.id}`}
                >
                  <span className="printer-icon">
                    <PrinterIcon size={20} />
                  </span>
                  <span>
                    <strong>{printerName(printer)}</strong>
                    <small>{printer.ip}</small>
                  </span>
                </Link>
              </td>
              <td>
                <StatusBadge online={printer.status?.online} />
              </td>
              <td>
                <span className="table-primary">
                  {stateLabel(printer.status?.printerState)}
                </span>
                <span className="table-secondary truncate">
                  {printer.status?.display || "Sem mensagem no visor"}
                </span>
              </td>
              <td className="muted-cell">
                {formatDate(printer.status?.lastSuccess)}
              </td>
              <td className="number-cell strong-cell">
                {formatRaw(lifeCounter(printer.status?.counters)?.valueRaw)}
              </td>
              <td>
                <Link
                  className="row-link"
                  to={`${basePath}/lista/${printer.id}`}
                  aria-label={`Abrir ${printer.ip}`}
                >
                  <ChevronRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {compact && printers.length > 5 && (
        <div className="table-footer">
          <Link to={`${basePath}/lista`}>
            Ver todas as impressoras <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}

function DashboardPage() {
  const { api, apiBasePath, basePath } = useModule();
  const queryClient = useQueryClient();
  const [manualPoll, setManualPoll] = useState<{
    running: boolean;
    completed: number;
    total: number;
    succeeded: number;
    failedIps: string[];
  } | null>(null);
  const month = currentMonth();
  const summary = useQuery({
    queryKey: ["printers", apiBasePath, "summary", month],
    queryFn: ({ signal }) => api.summary(month, signal),
    refetchInterval: 300_000,
  });
  const printers = useQuery({
    queryKey: ["printers", apiBasePath, "list"],
    queryFn: ({ signal }) => api.printers(signal),
    refetchInterval: 30_000,
  });
  const loading = summary.isPending || printers.isPending;
  const error = summary.error || printers.error;

  async function collectNow() {
    if (manualPoll?.running) return;
    const targets = printers.data?.filter((printer) => printer.enabled) ?? [];
    if (targets.length === 0) return;

    let completed = 0;
    let succeeded = 0;
    const failedIps: string[] = [];
    setManualPoll({
      running: true,
      completed,
      total: targets.length,
      succeeded,
      failedIps: [],
    });

    await Promise.all(
      targets.map(async (printer) => {
        let fastOk = false;
        let normalOk = false;
        try {
          fastOk = (await api.poll(printer.id, "FAST")).success;
        } catch {
          // Ainda tenta a leitura de contador quando a leitura de estado falha.
        }
        try {
          normalOk = (await api.poll(printer.id, "NORMAL")).success;
        } catch {
          // A falha desta impressora aparece no resultado da operação.
        }
        if (fastOk && normalOk) succeeded++;
        else failedIps.push(printer.ip);
        completed++;
        setManualPoll({
          running: true,
          completed,
          total: targets.length,
          succeeded,
          failedIps: [...failedIps],
        });
      }),
    );

    await queryClient.invalidateQueries({
      queryKey: ["printers", apiBasePath],
    });
    setManualPoll({
      running: false,
      completed,
      total: targets.length,
      succeeded,
      failedIps: [...failedIps],
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="PAINEL DE CONTROLE"
        title="Visão geral"
        description="Acompanhe a disponibilidade e os contadores dos equipamentos em tempo real."
        action={
          <div className="heading-actions">
            <button
              className="button primary"
              onClick={() => void collectNow()}
              disabled={
                manualPoll?.running ||
                !printers.data?.some((printer) => printer.enabled)
              }
              title="Consulta estado e contador das impressoras ativas"
            >
              {manualPoll?.running ? (
                <RefreshCw size={16} className="spin-icon" />
              ) : (
                <Play size={16} />
              )}
              {manualPoll?.running ? "Coletando..." : "Coletar agora"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                void summary.refetch();
                void printers.refetch();
              }}
              disabled={manualPoll?.running}
            >
              <RefreshCw size={16} /> Atualizar tela
            </button>
          </div>
        }
      />
      {manualPoll && (
        <div
          className={`manual-poll-feedback ${manualPoll.running ? "running" : manualPoll.failedIps.length ? "partial" : "done"}`}
          role="status"
          aria-live="polite"
        >
          <Activity size={18} />
          <span>
            {manualPoll.running
              ? `Coletando estado e contador: ${manualPoll.completed} de ${manualPoll.total} impressoras concluídas.`
              : `Coleta concluída: ${manualPoll.succeeded} com sucesso, ${manualPoll.failedIps.length} com falha.`}
            {!manualPoll.running &&
              manualPoll.failedIps.length > 0 &&
              ` Verifique: ${manualPoll.failedIps.join(", ")}.`}
          </span>
        </div>
      )}
      <QueryState
        loading={loading}
        error={error}
        retry={() => {
          void summary.refetch();
          void printers.refetch();
        }}
      >
        {summary.data && printers.data && (
          <>
            <div className="month-strip">
              <CalendarDays size={17} /> Resumo de{" "}
              <strong>{monthLabel(month)}</strong>
              <span>Horário de referência: São Paulo</span>
            </div>
            <div className="stat-grid">
              <StatCard
                icon={<PrinterIcon />}
                label="Total de impressoras"
                value={summary.data.printers.total.toString()}
                note="Equipamentos cadastrados"
                tone="violet"
              />
              <StatCard
                icon={<Wifi />}
                label="Online"
                value={summary.data.printers.online.toString()}
                note="Respondendo às coletas"
                tone="green"
              />
              <StatCard
                icon={<WifiOff />}
                label="Offline"
                value={summary.data.printers.offline.toString()}
                note="Após 3 falhas consecutivas"
                tone="red"
              />
              <StatCard
                icon={<CircleHelp />}
                label="Sem confirmação"
                value={summary.data.printers.unknown.toString()}
                note="Aguardando leitura conclusiva"
                tone="amber"
              />
            </div>
            <div className="highlight-card">
              <div className="highlight-symbol">
                <Activity size={25} />
              </div>
              <div>
                <span>AUMENTO DO CONTADOR NO MÊS</span>
                <div className="highlight-value">
                  {formatRaw(summary.data.monthlyTotalRaw)}
                </div>
                <p>Variação acumulada do contador SNMP · {monthLabel(month)}</p>
              </div>
              <Link to={`${basePath}/relatorios`}>
                Ver relatório <ArrowRight size={17} />
              </Link>
            </div>
            <section className="card table-card">
              <SectionHeader
                title="Impressoras"
                subtitle="Estado mais recente de cada equipamento"
                action={
                  <Link className="text-link" to={`${basePath}/lista`}>
                    Ver lista completa <ArrowRight size={16} />
                  </Link>
                }
              />
              <PrinterTable printers={printers.data.slice(0, 5)} compact />
            </section>
            <p className="footnote">
              O contador representa aumentos nas leituras SNMP. A unidade física
              ainda está em validação.
            </p>
          </>
        )}
      </QueryState>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function PrinterListPage() {
  const { api, apiBasePath } = useModule();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const printers = useQuery({
    queryKey: ["printers", apiBasePath, "list"],
    queryFn: ({ signal }) => api.printers(signal),
    refetchInterval: 30_000,
  });
  const list =
    printers.data?.filter((printer) => {
      const matchesText = `${printer.description || ""} ${printer.ip}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR"));
      return (
        matchesText &&
        (filter === "all" ||
          availability(printer.status?.online).tone === filter)
      );
    }) || [];
  return (
    <>
      <PageHeading
        eyebrow="EQUIPAMENTOS"
        title="Impressoras"
        description="Consulte o estado atual e acesse o histórico de cada equipamento."
        action={
          <button
            className="button secondary"
            onClick={() => void printers.refetch()}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      <QueryState
        loading={printers.isPending}
        error={printers.error}
        retry={() => void printers.refetch()}
      >
        <section className="card table-card">
          <div className="list-toolbar">
            <div>
              <h2>Todos os equipamentos</h2>
              <p>{printers.data?.length || 0} impressoras cadastradas</p>
            </div>
            <div className="list-controls">
              <label className="search-box">
                <Search size={17} />
                <input
                  aria-label="Buscar impressora"
                  placeholder="Buscar por modelo ou IP"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="filter-box">
                <ListFilter size={17} />
                <select
                  aria-label="Filtrar por status"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">Todos os status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="unknown">Desconhecida</option>
                </select>
              </label>
            </div>
          </div>
          {list.length ? (
            <PrinterTable printers={list} />
          ) : (
            <div className="empty-inline">
              <Search size={28} />
              <strong>Nenhum resultado</strong>
              <p>Altere a busca ou o filtro para encontrar impressoras.</p>
            </div>
          )}
        </section>
      </QueryState>
    </>
  );
}

function PrinterDetailPage() {
  const { id } = useParams();
  const { api, apiBasePath, basePath } = useModule();
  const month = currentMonth();
  const printer = useQuery({
    queryKey: ["printers", apiBasePath, "detail", id],
    queryFn: ({ signal }) => api.printer(id!, signal),
    enabled: !!id,
    refetchInterval: 30_000,
  });
  const metrics = useQuery({
    queryKey: ["printers", apiBasePath, "metrics", id, month],
    queryFn: ({ signal }) => api.metrics(id!, month, signal),
    enabled: !!id,
    refetchInterval: 300_000,
  });
  const events = useQuery({
    queryKey: ["printers", apiBasePath, "events", id],
    queryFn: ({ signal }) => api.events(id!, signal),
    enabled: !!id,
    refetchInterval: 30_000,
  });
  const p = printer.data;
  const counter = lifeCounter(p?.status?.counters);
  const recent =
    metrics.data?.items
      .map((item) => ({ ...item, counter: lifeCounter(item.values.counters) }))
      .filter((item) => item.counter)
      .slice(0, 10) || [];
  const sortedEvents = [...(events.data || [])].sort(
    (a, b) =>
      eventPriority(a) - eventPriority(b) ||
      b.timestamp.localeCompare(a.timestamp),
  );
  return (
    <>
      <Link className="back-link" to={`${basePath}/lista`}>
        <ArrowLeft size={16} /> Voltar para impressoras
      </Link>
      <PageHeading
        eyebrow="DETALHES DO EQUIPAMENTO"
        title={p ? printerName(p) : "Impressora"}
        description={
          p
            ? `Endereço IP ${p.ip} · Histórico e leituras recentes`
            : "Carregando informações do equipamento"
        }
        action={
          <button
            className="button secondary"
            onClick={() => {
              void printer.refetch();
              void metrics.refetch();
              void events.refetch();
            }}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      <QueryState
        loading={printer.isPending}
        error={printer.error}
        retry={() => void printer.refetch()}
      >
        {p && (
          <>
            <div className="detail-hero">
              <div className="detail-hero-main">
                <span className="hero-printer">
                  <PrinterIcon size={28} />
                </span>
                <div>
                  <div className="detail-top">
                    <StatusBadge online={p.status?.online} />
                    <span className="detail-dot">·</span>
                    <span>
                      {p.enabled
                        ? "Monitoramento ativo"
                        : "Monitoramento desativado"}
                    </span>
                  </div>
                  <h2>{stateLabel(p.status?.printerState)}</h2>
                  <p>
                    {p.status?.display ||
                      "Nenhuma mensagem disponível no visor."}
                  </p>
                </div>
              </div>
              <div className="detail-counter">
                <span>CONTADOR ATUAL</span>
                <strong>{formatRaw(counter?.valueRaw)}</strong>
                <small>Leitura bruta · índice 1.1</small>
              </div>
            </div>
            <div className="detail-grid">
              <section className="card info-card">
                <SectionHeader
                  title="Última atividade"
                  subtitle="Horários exibidos no fuso do seu dispositivo"
                />
                <div className="info-list">
                  <InfoRow
                    label="Última coleta"
                    value={formatDate(p.status?.lastPoll)}
                  />
                  <InfoRow
                    label="Último sucesso"
                    value={formatDate(p.status?.lastSuccess)}
                  />
                  <InfoRow
                    label="Última falha"
                    value={formatDate(p.status?.lastFailure)}
                  />
                  <InfoRow
                    label="Última mudança"
                    value={formatDate(p.status?.lastChange)}
                  />
                </div>
                {p.status?.lastError && (
                  <div className="notice">
                    <CircleHelp size={17} />
                    <span>{p.status.lastError}</span>
                  </div>
                )}
              </section>
              <section className="card info-card">
                <SectionHeader
                  title="Suprimentos"
                  subtitle="Valores brutos informados pela impressora"
                />
                {p.status?.supplies?.length ? (
                  <div className="supply-list">
                    {p.status.supplies.map((supply) => (
                      <div key={supply.index}>
                        <span>
                          <strong>
                            {supply.description || `Suprimento ${supply.index}`}
                          </strong>
                          <small>Índice {supply.index}</small>
                        </span>
                        <span className="supply-raw">
                          Nível: {supply.levelRaw ?? "—"}{" "}
                          <small>
                            Capacidade: {supply.maxCapacityRaw ?? "—"}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small-empty">Sem leitura de suprimentos.</div>
                )}
                <p className="card-note">
                  Níveis negativos ou especiais não representam porcentagens.
                </p>
              </section>
            </div>
            <div className="detail-grid lower">
              <section className="card info-card">
                <SectionHeader
                  title="Leituras do contador"
                  subtitle={`Até 10 das 100 amostras mais recentes de ${monthLabel(month)}`}
                />
                {metrics.isPending ? (
                  <div className="small-empty">Carregando leituras...</div>
                ) : metrics.error ? (
                  <div className="small-empty">
                    Falha ao carregar leituras.{" "}
                    <button
                      className="inline-button"
                      onClick={() => void metrics.refetch()}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : recent.length ? (
                  <div className="reading-list">
                    {recent.map((item) => (
                      <div key={item.id}>
                        <span className="reading-icon">
                          <HardDrive size={16} />
                        </span>
                        <span>
                          <strong>{formatRaw(item.counter?.valueRaw)}</strong>
                          <small>{formatDate(item.timestamp)}</small>
                        </span>
                        <span className="reading-delta">
                          {item.counter?.deltaStatus === "valid"
                            ? `+${formatRaw(item.counter.deltaRaw)}`
                            : item.counter?.deltaStatus === "baseline"
                              ? "Base"
                              : item.counter?.deltaStatus === "decreased"
                                ? "Reinício"
                                : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small-empty">
                    Nenhuma leitura registrada neste mês.
                  </div>
                )}
              </section>
              <section className="card info-card">
                <SectionHeader
                  title="Eventos recentes"
                  subtitle="Disponibilidade e estado aparecem primeiro"
                />
                {events.isPending ? (
                  <div className="small-empty">Carregando eventos...</div>
                ) : events.error ? (
                  <div className="small-empty">
                    Falha ao carregar eventos.{" "}
                    <button
                      className="inline-button"
                      onClick={() => void events.refetch()}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : sortedEvents.length ? (
                  <div className="event-list">
                    {sortedEvents.slice(0, 10).map((event) => (
                      <div key={event.id}>
                        <span
                          className={`event-icon ${event.changes.online !== undefined ? "important" : ""}`}
                        >
                          <Clock3 size={15} />
                        </span>
                        <span>
                          <strong>{eventDescription(event)}</strong>
                          <small>{formatDate(event.timestamp)}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small-empty">Nenhum evento registrado.</div>
                )}
              </section>
            </div>
            <p className="footnote">
              O histórico de leituras mostra as 100 amostras mais recentes do
              mês; a API ainda não oferece paginação completa.
            </p>
          </>
        )}
      </QueryState>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function eventPriority(event: PrinterEvent): number {
  return event.changes.online !== undefined
    ? 0
    : event.changes.printerState !== undefined
      ? 1
      : 2;
}
function eventDescription(event: PrinterEvent): string {
  if (event.changes.online)
    return event.changes.online.new === true
      ? "Impressora ficou online"
      : event.changes.online.new === false
        ? "Impressora ficou offline"
        : "Disponibilidade alterada";
  if (event.changes.printerState)
    return `Estado: ${stateLabel(String(event.changes.printerState.new || ""))}`;
  if (event.changes.display)
    return `Visor: ${String(event.changes.display.new || "sem mensagem")}`;
  return "Estado atualizado";
}

function ReportPage() {
  const { api, apiBasePath, basePath } = useModule();
  const [month, setMonth] = useState(currentMonth);
  const report = useQuery({
    queryKey: ["printers", apiBasePath, "report", month],
    queryFn: ({ signal }) => api.report(month, signal),
    enabled: /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
    refetchInterval: 300_000,
  });
  const printers = useQuery({
    queryKey: ["printers", apiBasePath, "list"],
    queryFn: ({ signal }) => api.printers(signal),
    refetchInterval: 30_000,
  });
  const names = new Map(printers.data?.map((p) => [p.id, printerName(p)]));
  return (
    <>
      <PageHeading
        eyebrow="ANÁLISE MENSAL"
        title="Relatório mensal"
        description="Acompanhe a variação do contador de cada impressora ao longo do mês."
        action={
          <button
            className="button secondary"
            onClick={() => void report.refetch()}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      <div className="report-filter">
        <div>
          <CalendarDays size={19} />
          <span>Período do relatório</span>
        </div>
        <input
          type="month"
          aria-label="Mês do relatório"
          min="2026-10"
          max={currentMonth()}
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>
      {!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? (
        <div className="state-panel">
          <CircleHelp size={30} />
          <strong>Selecione um mês válido</strong>
        </div>
      ) : (
        <QueryState
          loading={report.isPending}
          error={report.error}
          retry={() => void report.refetch()}
        >
          {report.data && (
            <>
              <div className="report-summary">
                <div>
                  <span>
                    CONTADOR ACUMULADO · {monthLabel(month).toUpperCase()}
                  </span>
                  <strong>{formatRaw(report.data.totalRaw)}</strong>
                  <p>Soma dos aumentos detectados durante o mês selecionado</p>
                </div>
                <span className="report-summary-icon">
                  <FileBarChart2 size={29} />
                </span>
              </div>
              <section className="card table-card">
                <SectionHeader
                  title="Por impressora"
                  subtitle={`${report.data.printers.length} equipamentos no relatório`}
                />
                {report.data.printers.length ? (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>IMPRESSORA</th>
                          <th>STATUS ATUAL</th>
                          <th className="number-cell">AUMENTO NO MÊS</th>
                          <th className="number-cell">LEITURAS</th>
                          <th className="number-cell">REINÍCIOS</th>
                          <th>ÚLTIMA LEITURA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.data.printers.map((row) => (
                          <tr key={row.printerId}>
                            <td>
                              <Link
                                className="printer-cell"
                                to={`${basePath}/lista/${row.printerId}`}
                              >
                                <span className="printer-icon">
                                  <PrinterIcon size={20} />
                                </span>
                                <span>
                                  <strong>
                                    {names.get(row.printerId) ||
                                      `Impressora ${row.ip}`}
                                  </strong>
                                  <small>{row.ip}</small>
                                </span>
                              </Link>
                            </td>
                            <td>
                              <StatusBadge online={row.online} />
                            </td>
                            <td className="number-cell strong-cell">
                              {formatRaw(row.totalRaw)}
                            </td>
                            <td className="number-cell">{row.sampleCount}</td>
                            <td className="number-cell">{row.resets}</td>
                            <td className="muted-cell">
                              {formatDate(row.lastReadingAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-inline">
                    <PrinterIcon size={28} />
                    <strong>Sem equipamentos no relatório</strong>
                    <p>As impressoras cadastradas aparecerão aqui.</p>
                  </div>
                )}
              </section>
              <div className="report-explainer">
                <CheckCircle2 size={19} />
                <p>
                  A primeira leitura serve como base. Quedas do contador são
                  registradas como reinícios e não entram na soma. Cada aumento
                  é atribuído ao mês da leitura que o detectou.
                </p>
              </div>
              <p className="footnote">
                O contador é um valor SNMP bruto; sua equivalência em folhas
                físicas ainda está em validação. Histórico automático disponível
                desde 28/10/2026.
              </p>
            </>
          )}
        </QueryState>
      )}
    </>
  );
}
