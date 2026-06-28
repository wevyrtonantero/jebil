import { useEffect, useState } from "react";
import { getRelatorioAtendimentos } from "../services/relatorioService";
import { listMecanicos } from "../services/mecanicoService";
import StatusBadge from "../components/common/StatusBadge";

function RelatorioPage() {
  const [rows, setRows] = useState([]);
  const [mecanicos, setMecanicos] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    dia: "",
    mes: "",
    data_inicio: "",
    data_fim: "",
    status: "",
    mecanico_id: "",
    situacao_pagamento: "",
    numero_os: "",
  });

  async function loadReport(currentFilters = filters) {
    setError("");
    const cleanFilters = Object.fromEntries(Object.entries(currentFilters).filter(([, value]) => value !== ""));
    const response = await getRelatorioAtendimentos(cleanFilters);
    setRows(response);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      async function bootstrap() {
        const mecanicosResponse = await listMecanicos();
        setMecanicos(mecanicosResponse);
        const response = await getRelatorioAtendimentos({});
        setRows(response);
      }

      void bootstrap().catch((requestError) => {
        setError(requestError?.response?.data?.message || "Erro ao carregar relatorio.");
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Relatorio</p>
          <h1>Atendimentos</h1>
        </div>
      </div>

      <div className="panel-card form-grid report-filters">
        <input placeholder="Dia (AAAA-MM-DD)" value={filters.dia} onChange={(event) => setFilters({ ...filters, dia: event.target.value })} />
        <input placeholder="Mes (AAAA-MM)" value={filters.mes} onChange={(event) => setFilters({ ...filters, mes: event.target.value })} />
        <input
          placeholder="Data inicial"
          value={filters.data_inicio}
          onChange={(event) => setFilters({ ...filters, data_inicio: event.target.value })}
        />
        <input placeholder="Data final" value={filters.data_fim} onChange={(event) => setFilters({ ...filters, data_fim: event.target.value })} />
        <input placeholder="Numero da OS" value={filters.numero_os} onChange={(event) => setFilters({ ...filters, numero_os: event.target.value })} />
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">Todos os status</option>
          <option value="AGUARDANDO">AGUARDANDO</option>
          <option value="EM_SERVICO">EM_SERVICO</option>
          <option value="AGUARDANDO_PECAS">AGUARDANDO_PECAS</option>
          <option value="SAIDA_PARA_TESTE">SAIDA_PARA_TESTE</option>
          <option value="SERVICO_CONCLUIDO">SERVICO_CONCLUIDO</option>
          <option value="PODE_RETIRAR">PODE_RETIRAR</option>
          <option value="FINALIZADO">FINALIZADO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>
        <select value={filters.mecanico_id} onChange={(event) => setFilters({ ...filters, mecanico_id: event.target.value })}>
          <option value="">Todos os mecanicos</option>
          {mecanicos.map((mecanico) => (
            <option key={mecanico.id} value={mecanico.id}>
              {mecanico.nome}
            </option>
          ))}
        </select>
        <select
          value={filters.situacao_pagamento}
          onChange={(event) => setFilters({ ...filters, situacao_pagamento: event.target.value })}
        >
          <option value="">Todo pagamento</option>
          <option value="PENDENTE">PENDENTE</option>
          <option value="PAGO">PAGO</option>
        </select>
        <div className="row-actions">
          <button type="button" className="primary-button" onClick={() => loadReport().catch((requestError) => setError(requestError?.response?.data?.message || "Erro ao carregar relatorio."))}>
            Aplicar filtros
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              const emptyFilters = {
                dia: "",
                mes: "",
                data_inicio: "",
                data_fim: "",
                status: "",
                mecanico_id: "",
                situacao_pagamento: "",
                numero_os: "",
              };
              setFilters(emptyFilters);
              void loadReport(emptyFilters).catch((requestError) => setError(requestError?.response?.data?.message || "Erro ao carregar relatorio."));
            }}
          >
            Limpar
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>

      <div className="panel-card">
        <div className="table-list">
          {rows.map((item) => (
            <article className="row-card" key={item.id}>
              <div>
                <strong>{item.numero_os} • {item.motocicleta_modelo}</strong>
                <p>{item.cliente_nome} • {item.mecanico_nome || "Sem mecanico"}</p>
                <small>{item.problema_servico}</small>
              </div>
              <div className="row-actions stacked">
                <StatusBadge tone="info">{item.status}</StatusBadge>
                <StatusBadge tone={item.situacao_pagamento === "PAGO" ? "success" : "warning"}>
                  {item.situacao_pagamento}
                </StatusBadge>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RelatorioPage;
