import { useCallback, useEffect, useMemo, useState } from "react";
import { listOperacionalV2 } from "../services/ordemServicoV2Service";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";

function getResumoItens(ordem) {
  return (ordem.items || [])
    .filter((item) => !["CONCLUIDO", "CANCELADO"].includes(item.status_item) && item.descricao !== "Diagnostico inicial")
    .map((item) => item.descricao)
    .filter(Boolean)
    .join(" | ");
}

function getItensPlanejados(ordem) {
  return (ordem.items || []).filter((item) => item.descricao && item.descricao !== "Diagnostico inicial");
}

function parseSystemDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const dateFromNumber = new Date(value);
    return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/i,
  );

  if (match) {
    const [, year, month, day, hours = "00", minutes = "00", seconds = "00"] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
      0,
    );
  }

  const fallbackDate = new Date(normalizedValue);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

function getActivePartPreviews(ordem) {
  return (ordem.previsoes_pecas || [])
    .filter((previsao) => previsao.status_previsao === "ATIVA")
    .sort((left, right) => {
      const leftTs = parseSystemDate(left.previsao_chegada)?.getTime() || Number.MAX_SAFE_INTEGER;
      const rightTs = parseSystemDate(right.previsao_chegada)?.getTime() || Number.MAX_SAFE_INTEGER;
      return leftTs - rightTs;
    });
}

function formatDateTimeLabel(value = "") {
  if (!value) {
    return "Sem previsao";
  }

  const date = parseSystemDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "Sem previsao";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(value = "", nowTs) {
  if (!value) {
    return "Sem contagem";
  }

  const targetTs = parseSystemDate(value)?.getTime();

  if (!targetTs || Number.isNaN(targetTs)) {
    return "Sem contagem";
  }

  const diffMs = targetTs - nowTs;

  if (diffMs <= 0) {
    return "Prazo vencido";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes}min`;
}

function getNomeCurto(nome = "") {
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);

  if (partes.length <= 2) {
    return partes.join(" ");
  }

  return `${partes[0]} ${partes[1]}`;
}

function isServicoRapido(ordem) {
  return !String(ordem.queixa_principal || "").trim();
}

function isAguardandoDiagnostico(ordem) {
  return (ordem.items || []).some((item) => ["AGUARDANDO_DIAGNOSTICO", "EM_DIAGNOSTICO"].includes(item.status_item));
}

function podeEntrarNaOficina(ordem) {
  return isServicoRapido(ordem) || ordem.cadastro_fotos_finalizado;
}

function isAtendimentoPrioritario(ordem) {
  return ["URGENTE", "ALTA"].includes(ordem.prioridade_agregada);
}

function isAguardandoAutorizacao(ordem) {
  const latestOrcamento = [...(ordem.orcamentos || [])].sort((left, right) => Number(right.id) - Number(left.id))[0] || null;
  const hasWaitingAuthorizationItem = (ordem.items || []).some((item) => item.status_item === "AGUARDANDO_AUTORIZACAO");
  return hasWaitingAuthorizationItem && ["RASCUNHO", "PENDENTE_ENVIO", "ENVIADO", "PARCIAL"].includes(latestOrcamento?.status_orcamento || "RASCUNHO");
}

function OficinaAdminPage() {
  const [ordens, setOrdens] = useState([]);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const loadOrdens = useCallback(async () => {
    const data = await listOperacionalV2(50);
    setOrdens(data);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrdens().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOrdens]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadOrdens().catch(() => {});
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [loadOrdens]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useRealtimeRefresh(loadOrdens);

  const aguardandoDiagnostico = useMemo(
    () => ordens.filter((ordem) => !isServicoRapido(ordem) && podeEntrarNaOficina(ordem) && isAguardandoDiagnostico(ordem)),
    [ordens],
  );

  const aguardandoDiagnosticoIds = useMemo(() => new Set(aguardandoDiagnostico.map((ordem) => ordem.id)), [aguardandoDiagnostico]);

  const aguardandoPecas = useMemo(
    () =>
      ordens.filter(
        (ordem) => podeEntrarNaOficina(ordem) && !aguardandoDiagnosticoIds.has(ordem.id) && (ordem.items || []).some((item) => item.status_item === "AGUARDANDO_PECA"),
      ),
    [aguardandoDiagnosticoIds, ordens],
  );

  const aguardandoPecasIds = useMemo(() => new Set(aguardandoPecas.map((ordem) => ordem.id)), [aguardandoPecas]);

  const aguardandoAutorizacao = useMemo(
    () =>
      ordens.filter(
        (ordem) =>
          podeEntrarNaOficina(ordem) &&
          !aguardandoDiagnosticoIds.has(ordem.id) &&
          !aguardandoPecasIds.has(ordem.id) &&
          isAguardandoAutorizacao(ordem),
      ),
    [aguardandoDiagnosticoIds, aguardandoPecasIds, ordens],
  );

  const aguardandoAutorizacaoIds = useMemo(() => new Set(aguardandoAutorizacao.map((ordem) => ordem.id)), [aguardandoAutorizacao]);

  const motosEmExecucao = useMemo(
    () =>
      ordens.filter(
        (ordem) =>
          podeEntrarNaOficina(ordem) &&
          !aguardandoDiagnosticoIds.has(ordem.id) &&
          !aguardandoPecasIds.has(ordem.id) &&
          !aguardandoAutorizacaoIds.has(ordem.id) &&
          (ordem.items || []).some((item) => item.status_item === "EM_EXECUCAO"),
      ),
    [aguardandoAutorizacaoIds, aguardandoDiagnosticoIds, aguardandoPecasIds, ordens],
  );

  const motosEmExecucaoIds = useMemo(() => new Set(motosEmExecucao.map((ordem) => ordem.id)), [motosEmExecucao]);

  const filaAtendimento = useMemo(
    () =>
      ordens.filter(
        (ordem) =>
          podeEntrarNaOficina(ordem) &&
          !aguardandoDiagnosticoIds.has(ordem.id) &&
          !aguardandoPecasIds.has(ordem.id) &&
          !aguardandoAutorizacaoIds.has(ordem.id) &&
          !motosEmExecucaoIds.has(ordem.id) &&
          (ordem.items || []).some((item) => item.status_item === "PRONTO_PARA_EXECUTAR"),
      ),
    [aguardandoAutorizacaoIds, aguardandoDiagnosticoIds, aguardandoPecasIds, motosEmExecucaoIds, ordens],
  );

  return (
    <section className="page-section workshop-tv-page">
      <div className="office-grid compact-layout">
        <div className="board-column workshop-diagnostico-column">
          <div className="board-title">
            <div>
              <h2>Aguardando diagnostico</h2>
            </div>
            <div className="queue-summary">
              <span className="summary-pill strong">{aguardandoDiagnostico.length}</span>
            </div>
          </div>

          <div className="office-queue-list">
            {aguardandoDiagnostico.map((ordem) => (
              <article className="queue-card office-queue-card" key={ordem.id}>
                <div className="office-queue-head">
                  <div className="office-queue-identification">
                    <div>
                      <strong>{getNomeCurto(ordem.cliente_nome)}</strong>
                      <p>
                        {ordem.motocicleta_modelo}
                        {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="office-queue-tools">
                    {isAtendimentoPrioritario(ordem) ? <span className="office-priority-pill">Prioritario</span> : null}
                  </div>
                </div>

                <small>{ordem.queixa_principal}</small>
                {getItensPlanejados(ordem).length ? (
                  <div className="office-item-inline-list">
                    {getItensPlanejados(ordem).map((item) => (
                      <span className="office-item-inline" key={item.id}>
                        <span className={item.pagamento_status === "PAGO" ? "money-paid" : "money-pending"}>$</span>
                        <span>{item.descricao}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {aguardandoDiagnostico.length === 0 ? <div className="empty-state">Nenhum cliente aguardando diagnostico.</div> : null}
          </div>
        </div>

        <div className="board-column workshop-atendimento-column">
          <div className="board-title">
            <div>
              <h2>Fila de atendimento</h2>
            </div>
            <div className="queue-summary">
              <span className="summary-pill strong">{filaAtendimento.length}</span>
            </div>
          </div>

          <div className="office-queue-list">
            {filaAtendimento.map((ordem) => (
              <article className="queue-card office-queue-card" key={ordem.id}>
                <div className="office-queue-head">
                  <div className="office-queue-identification">
                    <div>
                      <strong>{getNomeCurto(ordem.cliente_nome)}</strong>
                      <p>
                        {ordem.motocicleta_modelo}
                        {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="office-queue-tools">
                    {isAtendimentoPrioritario(ordem) ? <span className="office-priority-pill">Prioritario</span> : null}
                  </div>
                </div>

                <small>{getResumoItens(ordem) || "Sem itens informados."}</small>
              </article>
            ))}
            {filaAtendimento.length === 0 ? <div className="empty-state">Nenhuma moto aguardando atendimento.</div> : null}
          </div>
        </div>

        <div className="board-column workshop-pecas-column">
          <div className="board-title">
            <div>
              <h2>Aguardando pecas</h2>
            </div>
            <div className="queue-summary">
              <span className="summary-pill strong">{aguardandoPecas.length}</span>
            </div>
          </div>

          <div className="office-queue-list">
            {aguardandoPecas.map((ordem) => {
              const previsoesAtivas = getActivePartPreviews(ordem);
              const proximaPrevisao = previsoesAtivas[0] || null;

              return (
                <article className="queue-card office-queue-card" key={ordem.id}>
                  <div className="office-queue-head">
                    <div className="office-queue-identification">
                      <div>
                        <strong>{getNomeCurto(ordem.cliente_nome)}</strong>
                        <p>
                          {ordem.motocicleta_modelo}
                          {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="office-queue-tools">
                      {isAtendimentoPrioritario(ordem) ? <span className="office-priority-pill">Prioritario</span> : null}
                    </div>
                  </div>

                  {previsoesAtivas.length ? (
                    <div className="office-part-list">
                      {previsoesAtivas.map((previsao) => (
                        <div className="office-part-line" key={previsao.id}>
                          <span>{previsao.descricao_peca}</span>
                          <small>{formatDateTimeLabel(previsao.previsao_chegada)}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <small>{getResumoItens(ordem) || "Sem itens informados."}</small>
                  )}

                  {proximaPrevisao?.previsao_chegada ? (
                    <div className="office-part-countdown">
                      <span>Chegada prevista</span>
                      <strong>{formatCountdown(proximaPrevisao.previsao_chegada, clockNow)}</strong>
                    </div>
                  ) : null}
                </article>
              );
            })}
            {aguardandoPecas.length === 0 ? <div className="empty-state">Nenhuma moto aguardando pecas.</div> : null}
          </div>
        </div>

        <div className="board-column workshop-autorizacao-column">
          <div className="board-title">
            <div>
              <h2>Aguardando autorizacao</h2>
            </div>
            <div className="queue-summary">
              <span className="summary-pill strong">{aguardandoAutorizacao.length}</span>
            </div>
          </div>

          <div className="office-queue-list">
            {aguardandoAutorizacao.map((ordem) => (
              <article className="queue-card office-queue-card" key={ordem.id}>
                <div className="office-queue-head">
                  <div className="office-queue-identification">
                    <div>
                      <strong>{getNomeCurto(ordem.cliente_nome)}</strong>
                      <p>
                        {ordem.motocicleta_modelo}
                        {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="office-queue-tools">
                    {isAtendimentoPrioritario(ordem) ? <span className="office-priority-pill">Prioritario</span> : null}
                  </div>
                </div>

                <small>{getResumoItens(ordem) || "Aguardando retorno do cliente."}</small>
              </article>
            ))}
            {aguardandoAutorizacao.length === 0 ? <div className="empty-state">Nenhuma moto aguardando autorizacao.</div> : null}
          </div>
        </div>

        <div className="board-column workshop-execucao-column">
          <div className="board-title">
            <div>
              <h2>Motos em execucao</h2>
            </div>
            <div className="queue-summary">
              <span className="summary-pill strong">{motosEmExecucao.length}</span>
            </div>
          </div>

          <div className="office-queue-list">
            {motosEmExecucao.map((ordem) => (
              <article className="queue-card office-queue-card office-execucao-card" key={ordem.id}>
                <div className="office-queue-head">
                  <div className="office-queue-identification">
                    <div>
                      <strong>{getNomeCurto(ordem.cliente_nome)}</strong>
                      <p>
                        {ordem.motocicleta_modelo}
                        {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="office-queue-tools">
                    {isAtendimentoPrioritario(ordem) ? <span className="office-priority-pill">Prioritario</span> : null}
                  </div>
                </div>

                <small>{getResumoItens(ordem) || "Sem itens informados."}</small>
              </article>
            ))}
            {motosEmExecucao.length === 0 ? <div className="empty-state">Nenhuma moto em execucao agora.</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default OficinaAdminPage;
