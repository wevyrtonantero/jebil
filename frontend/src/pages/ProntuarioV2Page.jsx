import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppIcon from "../components/common/AppIcon";
import { listMotocicletas } from "../services/motocicletaService";
import { getProntuarioMotocicletaV2 } from "../services/ordemServicoV2Service";
import { formatDateLabel, formatPlate, formatTime } from "../utils/formatters";

function formatDateShort(value) {
  if (!value) {
    return "Nao informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTimeShort(value) {
  if (!value) {
    return "Nao informado";
  }

  return `${formatDateShort(value)} ${formatTime(value)}`;
}

function getExecutionLabel(execucao) {
  const names = (execucao?.mecanicos || []).map((mecanico) => mecanico.mecanico_nome).filter(Boolean);

  if (names.length) {
    return names.join(", ");
  }

  return execucao?.mecanico_principal_nome || "Nao informado";
}

function buildHistorico(ordensServico = []) {
  return ordensServico.map((ordem) => ({
    id: ordem.id,
    dataEntrada: ordem.aberta_em,
    dataSaida: ordem.pronta_retirada_em || ordem.finalizada_em || ordem.atualizado_em,
    servicos: ordem.items.map((item) => {
      const execucao = (ordem.execucoes || []).find((current) => Number(current.item_ordem_servico_id) === Number(item.id));

      return {
        id: item.id,
        descricao: item.descricao,
        executadoPor: getExecutionLabel(execucao),
        observacao: execucao?.descricao_execucao || item.observacoes || "",
        dataServico: item.concluido_em || item.iniciado_em || item.atualizado_em || ordem.atualizado_em,
      };
    }),
  }));
}

function ProntuarioV2Page() {
  const [searchParams] = useSearchParams();
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prontuario, setProntuario] = useState(null);
  const [autoSearchPlate, setAutoSearchPlate] = useState("");

  const historico = useMemo(() => buildHistorico(prontuario?.ordens_servico || []), [prontuario]);

  async function handleSearch() {
    setLoading(true);
    setError("");
    setProntuario(null);

    try {
      const response = await listMotocicletas({ placa, limit: 1, ativo: true });
      const moto = response.data?.[0];

      if (!moto) {
        setError("Nenhuma motocicleta encontrada para esta placa.");
        return;
      }

      const data = await getProntuarioMotocicletaV2(moto.id);
      setProntuario(data);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel carregar o prontuario V2.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const placaFromQuery = formatPlate(searchParams.get("placa") || "");

    if (!placaFromQuery) {
      return;
    }

    setPlaca(placaFromQuery);
    setAutoSearchPlate(placaFromQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!autoSearchPlate || autoSearchPlate !== placa) {
      return;
    }

    void handleSearch().finally(() => {
      setAutoSearchPlate("");
    });
  }, [autoSearchPlate, placa]);

  return (
    <section className="page-section prontuario-clean-page">
      <div className="panel-card prontuario-clean-card">
        <div className="workspace-heading">
          <div className="title-with-icon">
            <span className="title-icon">
              <AppIcon name="motorcycle" />
            </span>
            <div>
              <p className="eyebrow">Prontuario</p>
              <h2>Historico da motocicleta</h2>
              <p className="subtitle">Busque pela placa para ver entrada, saida, servicos realizados e quem executou cada um.</p>
            </div>
          </div>
        </div>

        <div className="field-grid two-up">
          <label className="field-label">
            Placa
            <input value={placa} placeholder="ABC1D23" onChange={(event) => setPlaca(formatPlate(event.target.value))} />
          </label>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={handleSearch} disabled={loading || !placa}>
              {loading ? "Buscando..." : "Abrir prontuario"}
            </button>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {prontuario ? (
          <div className="modal-stack">
            <div className="prontuario-summary-grid">
              <article className="detail-row">
                <strong>Nome</strong>
                <p>{prontuario.cliente_nome}</p>
              </article>
              <article className="detail-row">
                <strong>Modelo</strong>
                <p>{prontuario.motocicleta_marca} {prontuario.motocicleta_modelo}</p>
              </article>
              <article className="detail-row">
                <strong>Placa</strong>
                <p>{prontuario.motocicleta_placa}</p>
              </article>
            </div>

            <div className="table-list">
              {historico.map((registro, index) => (
                <article className="row-card prontuario-history-card" key={registro.id}>
                  <div className="prontuario-history-header">
                    <div>
                      <strong>{formatDateLabel(registro.dataEntrada || new Date())}</strong>
                      <p>Entrada: {formatDateTimeShort(registro.dataEntrada)}</p>
                      <p>Saida: {formatDateTimeShort(registro.dataSaida)}</p>
                    </div>
                    <span className="prontuario-history-count">{registro.servicos.length} servico(s)</span>
                  </div>

                  <div className="prontuario-service-list">
                    {registro.servicos.map((servico) => (
                      <article className="detail-row prontuario-service-row" key={`${registro.id}-${servico.id}`}>
                        <div>
                          <strong>{servico.descricao}</strong>
                          <p>Data e hora: {formatDateTimeShort(servico.dataServico)}</p>
                          <p>Executado por: {servico.executadoPor}</p>
                          {servico.observacao ? <small>Observacao: {servico.observacao}</small> : null}
                        </div>
                      </article>
                    ))}
                  </div>

                  {index < historico.length - 1 ? <div className="prontuario-history-divider" /> : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ProntuarioV2Page;
