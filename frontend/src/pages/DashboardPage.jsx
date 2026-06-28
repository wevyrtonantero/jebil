import { useEffect, useMemo, useState } from "react";
import { listFila, listAtendimentos } from "../services/atendimentoService";
import { listMecanicos } from "../services/mecanicoService";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import AppIcon from "../components/common/AppIcon";

const monthOptions = [
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Marco" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
];

const analyticsModeOptions = [
  { value: "today", label: "Diario" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensal" },
  { value: "day", label: "Dia especifico" },
];

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfWeek(date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function endOfWeek(date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  return endOfDay(value);
}

function formatInputDate(date) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function formatWeekInput(date) {
  const value = startOfWeek(date);
  const januaryFourth = new Date(value.getFullYear(), 0, 4);
  const januaryWeekStart = startOfWeek(januaryFourth);
  const diffDays = Math.round((value - januaryWeekStart) / 86400000);
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return `${value.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function parseWeekInput(value) {
  if (!value) {
    return new Date();
  }

  const [yearPart, weekPart] = value.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);

  if (!year || !week) {
    return new Date();
  }

  const januaryFourth = new Date(year, 0, 4);
  const weekStart = startOfWeek(januaryFourth);
  weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
  return weekStart;
}

function DashboardPage() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [fila, setFila] = useState([]);
  const [mecanicos, setMecanicos] = useState([]);
  const today = new Date();
  const [analyticsMode, setAnalyticsMode] = useState("month");
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth()));
  const [selectedDate, setSelectedDate] = useState(formatInputDate(today));
  const [selectedWeek, setSelectedWeek] = useState(formatWeekInput(today));

  async function load() {
    const [filaData, atendimentosData, mecanicosData] = await Promise.all([listFila(), listAtendimentos(), listMecanicos({ ativo: true })]);
    setFila(filaData);
    setAtendimentos(atendimentosData);
    setMecanicos(mecanicosData.filter((item) => item.ativo && item.disponivel_hoje));
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useRealtimeRefresh(load);

  const yearOptions = useMemo(() => {
    const years = new Set([today.getFullYear()]);

    atendimentos.forEach((item) => {
      const date = new Date(item.entrada_em || item.criado_em || item.atualizado_em);

      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [atendimentos, today]);

  const analyticsRange = useMemo(() => {
    if (analyticsMode === "today") {
      return {
        label: "Hoje",
        start: startOfDay(today),
        end: endOfDay(today),
      };
    }

    if (analyticsMode === "week") {
      const reference = parseWeekInput(selectedWeek);
      return {
        label: "Semana selecionada",
        start: startOfWeek(reference),
        end: endOfWeek(reference),
      };
    }

    if (analyticsMode === "day") {
      const reference = selectedDate ? new Date(`${selectedDate}T12:00:00`) : today;
      return {
        label: "Dia selecionado",
        start: startOfDay(reference),
        end: endOfDay(reference),
      };
    }

    return {
      label: `${monthOptions.find((item) => item.value === selectedMonth)?.label || "Mes"} de ${selectedYear}`,
      start: new Date(Number(selectedYear), Number(selectedMonth), 1, 0, 0, 0, 0),
      end: new Date(Number(selectedYear), Number(selectedMonth) + 1, 0, 23, 59, 59, 999),
    };
  }, [analyticsMode, selectedDate, selectedMonth, selectedWeek, selectedYear, today]);

  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter((item) => {
      const date = new Date(item.entrada_em || item.criado_em || item.atualizado_em);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return date >= analyticsRange.start && date <= analyticsRange.end;
    });
  }, [analyticsRange.end, analyticsRange.start, atendimentos]);

  const resumo = useMemo(() => {
    const emServicoAgora = atendimentos.filter((item) => ["EM_SERVICO", "AGUARDANDO_PECAS", "SAIDA_PARA_TESTE"].includes(item.status)).length;

    return {
      fila: fila.length,
      emServicoAgora,
    };
  }, [atendimentos, fila]);

  const mecanicosOnline = useMemo(
    () =>
      mecanicos.map((mecanico) => ({
        ...mecanico,
        atendimento: atendimentos.find(
          (item) =>
            item.mecanico_id === mecanico.id &&
            ["EM_SERVICO", "AGUARDANDO_PECAS", "SAIDA_PARA_TESTE"].includes(item.status),
        ),
      })),
    [atendimentos, mecanicos],
  );

  const servicosPorMecanico = useMemo(() => {
    const mapa = new Map();

    atendimentosFiltrados.forEach((item) => {
      if (!item.mecanico_nome) {
        return;
      }

      const atual = mapa.get(item.mecanico_nome) || 0;
      mapa.set(item.mecanico_nome, atual + 1);
    });

    return Array.from(mapa.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [atendimentosFiltrados]);

  const analyticsSummary = useMemo(() => {
    const finalizadas = atendimentosFiltrados.filter((item) => ["SERVICO_CONCLUIDO", "PODE_RETIRAR", "FINALIZADO"].includes(item.status)).length;
    const distribuidas = atendimentosFiltrados.filter((item) => Boolean(item.mecanico_id)).length;
    const destaque = servicosPorMecanico[0];
    const mediaPorMecanico = servicosPorMecanico.length > 0 ? (distribuidas / servicosPorMecanico.length).toFixed(1) : "0.0";

    return {
      finalizadas,
      distribuidas,
      destaqueNome: destaque?.nome || "Sem destaque",
      destaqueTotal: destaque?.total || 0,
      mediaPorMecanico,
      mecanicosComProducao: servicosPorMecanico.length,
    };
  }, [atendimentosFiltrados, servicosPorMecanico]);

  const finalizadasPorMes = useMemo(() => {
    return monthOptions.map((month) => {
      const total = atendimentos.filter((item) => {
        const date = new Date(item.entrada_em || item.criado_em || item.atualizado_em);

        if (Number.isNaN(date.getTime())) {
          return false;
        }

        return (
          date.getFullYear() === Number(selectedYear) &&
          date.getMonth() === Number(month.value) &&
          ["SERVICO_CONCLUIDO", "PODE_RETIRAR", "FINALIZADO"].includes(item.status)
        );
      }).length;

      return {
        ...month,
        total,
      };
    });
  }, [atendimentos, selectedYear]);

  const maxBar = Math.max(...servicosPorMecanico.map((item) => item.total), 1);
  const maxMonthBar = Math.max(...finalizadasPorMes.map((item) => item.total), 1);
  const melhorMes = finalizadasPorMes.reduce((best, current) => (current.total > best.total ? current : best), finalizadasPorMes[0] || { label: "-", total: 0 });

  return (
    <section className="page-section">
      <div className="dashboard-stack">
        <div className="workspace-card">
          <div className="workspace-heading">
            <div className="title-with-icon">
              <span className="title-icon">
                <AppIcon name="board" />
              </span>
              <div>
                <p className="eyebrow">Visao geral</p>
                <h2>Resumo da operacao agora</h2>
                <p className="subtitle">Somente o que esta acontecendo agora na oficina.</p>
              </div>
            </div>
          </div>

          <div className="stats-grid dashboard-live-stats">
            <article className="stat-card">
              <span>Fila</span>
              <strong>{resumo.fila}</strong>
              <p>Motos aguardando distribuicao.</p>
            </article>
            <article className="stat-card">
              <span>Em servico</span>
              <strong>{resumo.emServicoAgora}</strong>
              <p>Motos em execucao na oficina agora.</p>
            </article>
          </div>

          <div className="dashboard-online-grid">
            {mecanicosOnline.map((mecanico) => (
              <article className="dashboard-online-card" key={mecanico.id}>
                <div className="mecanico-line">
                  <img className="avatar" src={mecanico.foto_url} alt={mecanico.nome} />
                  <div>
                    <strong>{mecanico.nome}</strong>
                    <p>{mecanico.atendimento ? "Em atendimento" : "Disponivel para atender"}</p>
                  </div>
                </div>
                <div className={`dashboard-mechanic-indicator ${mecanico.atendimento ? "is-busy" : "is-free"}`}>
                  <span className="dashboard-mechanic-dot" />
                  <AppIcon name={mecanico.atendimento ? "workshop" : "check"} size={14} />
                  <span>{mecanico.atendimento ? "Em atendimento" : "Livre"}</span>
                </div>
              </article>
            ))}
            {mecanicosOnline.length === 0 ? <div className="empty-state">Nenhum mecanico online agora.</div> : null}
          </div>
        </div>

        <div className="workspace-grid dashboard-history-grid">
          <div className="workspace-card">
            <div className="workspace-heading">
              <div className="title-with-icon">
                <span className="title-icon">
                  <AppIcon name="reports" />
                </span>
                <div>
                  <p className="eyebrow">Historico</p>
                  <h2>Produtividade por periodo</h2>
                  <p className="subtitle">Escolha o intervalo e acompanhe finalizados, distribuicao e destaque da equipe.</p>
                </div>
              </div>
            </div>

            <div className="dashboard-period-tabs">
              {analyticsModeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`toggle-chip dashboard-period-chip ${analyticsMode === option.value ? "active" : ""}`}
                  onClick={() => setAnalyticsMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="dashboard-filter-surface">
              <div className="dashboard-filter-bar">
                {analyticsMode === "week" ? (
                  <label className="field-label compact-field">
                    Semana
                    <input type="week" value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)} />
                  </label>
                ) : null}
                {analyticsMode === "month" ? (
                  <div className="dashboard-year-row">
                    {yearOptions.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={`toggle-chip dashboard-year-chip ${selectedYear === String(year) ? "active" : ""}`}
                        onClick={() => setSelectedYear(String(year))}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                ) : null}
                {analyticsMode === "day" ? (
                  <label className="field-label compact-field">
                    Data
                    <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                  </label>
                ) : null}
              </div>

              {analyticsMode === "month" ? (
                <div className="dashboard-month-grid">
                  {monthOptions.map((month) => (
                    <button
                      key={month.value}
                      type="button"
                      className={`toggle-chip dashboard-month-chip ${selectedMonth === month.value ? "active" : ""}`}
                      onClick={() => setSelectedMonth(month.value)}
                    >
                      {month.label.slice(0, 3)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="dashboard-analytics-summary">
              <article className="stat-card">
                <span>Finalizadas no periodo</span>
                <strong>{analyticsSummary.finalizadas}</strong>
                <p>{analyticsRange.label}</p>
              </article>
              <article className="stat-card">
                <span>Distribuidas no periodo</span>
                <strong>{analyticsSummary.distribuidas}</strong>
                <p>Atendimentos que passaram por mecanico.</p>
              </article>
              <article className="stat-card">
                <span>Mecanico destaque</span>
                <strong>{analyticsSummary.destaqueNome}</strong>
                <p>{analyticsSummary.destaqueTotal} atendimento(s) no intervalo.</p>
              </article>
              <article className="stat-card">
                <span>Media por mecanico</span>
                <strong>{analyticsSummary.mediaPorMecanico}</strong>
                <p>{analyticsSummary.mecanicosComProducao} mecanico(s) com producao no periodo.</p>
              </article>
            </div>
          </div>

          <div className="dashboard-insights-stack">
            <div className="workspace-card">
              <div className="workspace-heading">
                <div className="title-with-icon">
                  <span className="title-icon">
                    <AppIcon name="reports" />
                  </span>
                  <div>
                    <p className="eyebrow">Ranking</p>
                    <h2>Servicos por mecanico</h2>
                    <p className="subtitle">{analyticsRange.label}</p>
                  </div>
                </div>
              </div>

              <div className="chart-list">
                {servicosPorMecanico.map((item) => (
                  <article className="chart-row" key={item.nome}>
                    <div className="chart-row-header">
                      <strong>{item.nome}</strong>
                      <span>{item.total}</span>
                    </div>
                    <div className="chart-bar-track">
                      <div className="chart-bar-fill" style={{ width: `${(item.total / maxBar) * 100}%` }} />
                    </div>
                  </article>
                ))}
                {servicosPorMecanico.length === 0 ? <div className="empty-state">Ainda nao ha servicos distribuidos por mecanico.</div> : null}
              </div>
            </div>

            <div className="workspace-card">
              <div className="workspace-heading">
                <div className="title-with-icon">
                  <span className="title-icon">
                    <AppIcon name="reports" />
                  </span>
                  <div>
                    <p className="eyebrow">Tendencia</p>
                    <h2>Finalizadas por mes</h2>
                    <p className="subtitle">Leitura anual para enxergar picos de movimento e sazonalidade.</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-monthly-header">
                <div>
                  <strong>{selectedYear}</strong>
                  <p>Melhor mes: {melhorMes?.label || "-"} • {melhorMes?.total || 0} finalizada(s)</p>
                </div>
              </div>

              <div className="dashboard-month-bars">
                {finalizadasPorMes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`dashboard-month-bar ${selectedMonth === item.value ? "active" : ""}`}
                    onClick={() => {
                      setAnalyticsMode("month");
                      setSelectedMonth(item.value);
                    }}
                    title={`${item.label}: ${item.total} finalizada(s)`}
                  >
                    <span className="dashboard-month-bar-value">{item.total}</span>
                    <span className="dashboard-month-bar-track">
                      <span className="dashboard-month-bar-fill" style={{ height: `${(item.total / maxMonthBar) * 100}%` }} />
                    </span>
                    <span className="dashboard-month-bar-label">{item.label.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
