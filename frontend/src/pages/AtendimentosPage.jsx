import { useEffect, useState } from "react";
import {
  cancelarAtendimento,
  confirmarPagamento,
  confirmarRetirada,
  liberarRetirada,
  listAtendimentos,
  listHistorico,
} from "../services/atendimentoService";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import StatusBadge from "../components/common/StatusBadge";

function AtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  async function load() {
    const data = await listAtendimentos();
    setAtendimentos(data);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useRealtimeRefresh(load);

  async function handleHistorico(id) {
    setSelectedId(id);
    const data = await listHistorico(id);
    setHistorico(data);
  }

  return (
    <section className="page-section two-column">
      <div className="panel-card">
        <div className="page-header compact">
          <div>
            <p className="eyebrow">Atendimentos</p>
            <h1>Lista geral</h1>
          </div>
        </div>
        <div className="table-list">
          {atendimentos.map((item) => (
            <article className="row-card" key={item.id}>
              <div>
                <strong>{item.numero_os} • {item.motocicleta_modelo}</strong>
                <p>{item.cliente_nome} • {item.problema_servico}</p>
              </div>
              <div className="row-actions stacked">
                <StatusBadge tone={item.situacao_pagamento === "PAGO" ? "success" : "warning"}>{item.situacao_pagamento}</StatusBadge>
                <StatusBadge tone="info">{item.status}</StatusBadge>
                <button type="button" className="ghost-button" onClick={() => handleHistorico(item.id)}>
                  Historico
                </button>
                {item.situacao_pagamento === "PENDENTE" ? (
                  <button type="button" className="ghost-button" onClick={() => confirmarPagamento(item.id).then(load)}>
                    Confirmar pagamento
                  </button>
                ) : null}
                {item.status === "SERVICO_CONCLUIDO" && item.situacao_pagamento === "PAGO" ? (
                  <button type="button" className="ghost-button" onClick={() => liberarRetirada(item.id).then(load)}>
                    Liberar retirada
                  </button>
                ) : null}
                {item.status === "PODE_RETIRAR" ? (
                  <button type="button" className="ghost-button" onClick={() => confirmarRetirada(item.id).then(load)}>
                    Confirmar retirada
                  </button>
                ) : null}
                {item.status !== "FINALIZADO" && item.status !== "CANCELADO" ? (
                  <button
                    type="button"
                    className="ghost-button danger"
                    onClick={() => cancelarAtendimento(item.id, "Cancelado manualmente pelo operador.").then(load)}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="panel-card">
        <div className="page-header compact">
          <div>
            <p className="eyebrow">Historico</p>
            <h1>{selectedId ? `Atendimento #${selectedId}` : "Selecione um atendimento"}</h1>
          </div>
        </div>
        <div className="timeline">
          {historico.map((item) => (
            <article className="timeline-item" key={item.id}>
              <strong>{item.acao}</strong>
              <p>{item.observacao || "Sem observacao"}</p>
              <small>{item.usuario_nome || "Sistema"} • {item.criado_em}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AtendimentosPage;
