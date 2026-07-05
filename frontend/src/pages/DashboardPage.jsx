import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { listMecanicos } from "../services/mecanicoService";
import { listOperacionalV2 } from "../services/ordemServicoV2Service";

function isServicoRapido(ordem) {
  return !String(ordem?.queixa_principal || "").trim();
}

function podeEntrarNaOficina(ordem) {
  return isServicoRapido(ordem) || ordem?.cadastro_fotos_finalizado;
}

function isAguardandoDiagnostico(ordem) {
  return (ordem?.items || []).some((item) => ["AGUARDANDO_DIAGNOSTICO", "EM_DIAGNOSTICO"].includes(item.status_item));
}

function isAguardandoAutorizacao(ordem) {
  const latestOrcamento = [...(ordem?.orcamentos || [])].sort((left, right) => Number(right.id) - Number(left.id))[0] || null;
  const hasWaitingAuthorizationItem = (ordem?.items || []).some((item) =>
    ["AGUARDANDO_AUTORIZACAO", "AGUARDANDO_ORCAMENTO"].includes(item.status_item),
  );

  return hasWaitingAuthorizationItem && ["RASCUNHO", "PENDENTE_ENVIO", "ENVIADO", "PARCIAL"].includes(latestOrcamento?.status_orcamento || "RASCUNHO");
}

function getResumoItens(ordem) {
  return (ordem?.items || [])
    .filter((item) => !["CONCLUIDO", "CANCELADO"].includes(item.status_item) && item.descricao !== "Diagnostico inicial")
    .map((item) => item.descricao)
    .filter(Boolean)
    .slice(0, 3)
    .join(" • ");
}

function DashboardPage() {
  const [ordens, setOrdens] = useState([]);
  const [mecanicos, setMecanicos] = useState([]);

  const loadDashboard = useCallback(async () => {
    const [ordensData, mecanicosData] = await Promise.all([listOperacionalV2(80), listMecanicos({ ativo: true })]);
    setOrdens(ordensData);
    setMecanicos(mecanicosData);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  useRealtimeRefresh(loadDashboard);

  const resumo = useMemo(() => {
    const ordensElegiveis = ordens.filter((ordem) => podeEntrarNaOficina(ordem));
    const aguardandoDiagnostico = ordensElegiveis.filter((ordem) => !isServicoRapido(ordem) && isAguardandoDiagnostico(ordem));
    const aguardandoDiagnosticoIds = new Set(aguardandoDiagnostico.map((ordem) => ordem.id));

    const aguardandoPecas = ordensElegiveis.filter(
      (ordem) => !aguardandoDiagnosticoIds.has(ordem.id) && (ordem.items || []).some((item) => item.status_item === "AGUARDANDO_PECA"),
    );
    const aguardandoPecasIds = new Set(aguardandoPecas.map((ordem) => ordem.id));

    const aguardandoAutorizacao = ordensElegiveis.filter(
      (ordem) => !aguardandoDiagnosticoIds.has(ordem.id) && !aguardandoPecasIds.has(ordem.id) && isAguardandoAutorizacao(ordem),
    );
    const aguardandoAutorizacaoIds = new Set(aguardandoAutorizacao.map((ordem) => ordem.id));

    const emExecucao = ordensElegiveis.filter(
      (ordem) =>
        !aguardandoDiagnosticoIds.has(ordem.id) &&
        !aguardandoPecasIds.has(ordem.id) &&
        !aguardandoAutorizacaoIds.has(ordem.id) &&
        (ordem.items || []).some((item) => item.status_item === "EM_EXECUCAO"),
    );
    const emExecucaoIds = new Set(emExecucao.map((ordem) => ordem.id));

    const filaAtendimento = ordensElegiveis.filter(
      (ordem) =>
        !aguardandoDiagnosticoIds.has(ordem.id) &&
        !aguardandoPecasIds.has(ordem.id) &&
        !aguardandoAutorizacaoIds.has(ordem.id) &&
        !emExecucaoIds.has(ordem.id) &&
        (ordem.items || []).some((item) => item.status_item === "PRONTO_PARA_EXECUTAR"),
    );

    const prontasRetirada = ordens.filter((ordem) => ordem.status_geral === "PRONTA_PARA_RETIRADA");

    return {
      aguardandoDiagnostico,
      filaAtendimento,
      aguardandoPecas,
      aguardandoAutorizacao,
      emExecucao,
      prontasRetirada,
      ordensAbertas: ordens.filter((ordem) => !["FINALIZADA", "ARQUIVADA", "CANCELADA"].includes(ordem.status_geral)).length,
      mecanicosAtivos: mecanicos.filter((mecanico) => mecanico.ativo).length,
      mecanicosDisponiveis: mecanicos.filter((mecanico) => mecanico.ativo && mecanico.disponivel_hoje).length,
    };
  }, [mecanicos, ordens]);

  const destaques = useMemo(
    () => [
      resumo.aguardandoDiagnostico[0],
      resumo.filaAtendimento[0],
      resumo.emExecucao[0],
      resumo.prontasRetirada[0],
    ].filter(Boolean),
    [resumo],
  );

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
                <h2>Resumo operacional V2</h2>
                <p className="subtitle">Painel consolidado somente com dados do fluxo atual da oficina.</p>
              </div>
            </div>
          </div>

          <div className="stats-grid dashboard-live-stats">
            <article className="stat-card">
              <span>Aguardando diagnostico</span>
              <strong>{resumo.aguardandoDiagnostico.length}</strong>
              <p>Motos aguardando avaliacao tecnica inicial.</p>
            </article>
            <article className="stat-card">
              <span>Fila de atendimento</span>
              <strong>{resumo.filaAtendimento.length}</strong>
              <p>Motos prontas para entrar em execucao.</p>
            </article>
            <article className="stat-card">
              <span>Aguardando pecas</span>
              <strong>{resumo.aguardandoPecas.length}</strong>
              <p>Ordens bloqueadas por previsao de pecas.</p>
            </article>
            <article className="stat-card">
              <span>Aguardando autorizacao</span>
              <strong>{resumo.aguardandoAutorizacao.length}</strong>
              <p>Ordens paradas em aprovacao comercial.</p>
            </article>
            <article className="stat-card">
              <span>Em execucao</span>
              <strong>{resumo.emExecucao.length}</strong>
              <p>Motos com servico sendo executado agora.</p>
            </article>
            <article className="stat-card">
              <span>Prontas para retirada</span>
              <strong>{resumo.prontasRetirada.length}</strong>
              <p>Ordens finalizadas aguardando retirada do cliente.</p>
            </article>
          </div>
        </div>

        <div className="workspace-grid dashboard-history-grid">
          <div className="workspace-card">
            <div className="workspace-heading">
              <div className="title-with-icon">
                <span className="title-icon">
                  <AppIcon name="mechanic" />
                </span>
                <div>
                  <p className="eyebrow">Equipe</p>
                  <h2>Status da operacao</h2>
                  <p className="subtitle">Leitura rapida dos recursos disponiveis no sistema novo.</p>
                </div>
              </div>
            </div>

            <div className="dashboard-analytics-summary">
              <article className="stat-card">
                <span>Ordens abertas</span>
                <strong>{resumo.ordensAbertas}</strong>
                <p>Sem contar arquivadas, canceladas ou finalizadas.</p>
              </article>
              <article className="stat-card">
                <span>Mecanicos ativos</span>
                <strong>{resumo.mecanicosAtivos}</strong>
                <p>Cadastros ativos no sistema.</p>
              </article>
              <article className="stat-card">
                <span>Disponiveis hoje</span>
                <strong>{resumo.mecanicosDisponiveis}</strong>
                <p>Mecanicos marcados como disponiveis no dia.</p>
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
                    <p className="eyebrow">Destaques</p>
                    <h2>Ordens em foco</h2>
                    <p className="subtitle">Primeiras ordens relevantes do fluxo V2.</p>
                  </div>
                </div>
              </div>

              <div className="chart-list">
                {destaques.map((ordem) => (
                  <article className="chart-row" key={ordem.id}>
                    <div className="chart-row-header">
                      <strong>{ordem.numero_os}</strong>
                      <span>{ordem.motocicleta_placa || "Sem placa"}</span>
                    </div>
                    <p>{ordem.cliente_nome || "Cliente nao informado"}</p>
                    <small>{getResumoItens(ordem) || ordem.queixa_principal || "Sem descricao operacional."}</small>
                  </article>
                ))}
                {destaques.length === 0 ? <div className="empty-state">Nenhuma ordem relevante no momento.</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
