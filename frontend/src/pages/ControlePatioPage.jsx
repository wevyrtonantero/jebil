import { useCallback, useEffect, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { listOperacionalV2, reordenarControlePatioV2 } from "../services/ordemServicoV2Service";
import { selectDiagnosticPatioQueue, selectPatioQueue, sortPatioQueue } from "../utils/patioQueue";

const queueOptions = {
  atendimento: {
    title: "Fila de atendimento",
    description: "Defina a sequencia manual da Fila de atendimento.",
    empty: "Nenhuma moto esta na Fila de atendimento agora.",
  },
  diagnostico: {
    title: "Aguardando diagnostico",
    description: "Defina a prioridade das motos que aguardam diagnostico do mecanico.",
    empty: "Nenhuma moto esta aguardando diagnostico agora.",
  },
};

function getServiceSummary(ordem) {
  return (ordem.items || [])
    .filter((item) => !["CANCELADO", "CONCLUIDO"].includes(item.status_item) && item.descricao !== "Diagnostico inicial")
    .map((item) => item.descricao)
    .filter(Boolean)
    .join(" | ");
}

function ControlePatioPage() {
  const [activeQueueKey, setActiveQueueKey] = useState("atendimento");
  const [queues, setQueues] = useState({ atendimento: [], diagnostico: [] });
  const [draggedId, setDraggedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const activeQueueConfig = queueOptions[activeQueueKey];
  const queue = queues[activeQueueKey] || [];

  const loadQueue = useCallback(async () => {
    try {
      const ordens = await listOperacionalV2(100);
      setQueues({
        atendimento: sortPatioQueue(selectPatioQueue(ordens)),
        diagnostico: sortPatioQueue(selectDiagnosticPatioQueue(ordens)),
      });
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel carregar o controle do patio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQueue();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadQueue]);

  useEffect(() => {
    function refreshPatioControl() {
      void loadQueue();
    }

    window.addEventListener("jebil:controle-patio-refresh", refreshPatioControl);

    return () => window.removeEventListener("jebil:controle-patio-refresh", refreshPatioControl);
  }, [loadQueue]);

  useRealtimeRefresh(loadQueue);

  async function saveQueue(nextQueue) {
    const nextQueues = {
      ...queues,
      [activeQueueKey]: nextQueue,
    };
    const orderedIds = [
      ...nextQueues[activeQueueKey].map((ordem) => ordem.id),
      ...Object.entries(nextQueues)
        .filter(([key]) => key !== activeQueueKey)
        .flatMap(([, value]) => value.map((ordem) => ordem.id)),
    ];

    setQueues(nextQueues);
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await reordenarControlePatioV2(orderedIds);
      setQueues((current) => {
        let position = 1;
        const updated = {};

        for (const [key, value] of Object.entries({ ...current, [activeQueueKey]: nextQueue })) {
          updated[key] = value.map((ordem) => ({ ...ordem, ordem_patio: position++ }));
        }

        return updated;
      });
      setFeedback(`Ordem de ${activeQueueConfig.title} atualizada.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel salvar a ordem da fila.");
      await loadQueue();
    } finally {
      setSaving(false);
    }
  }

  function moveOrder(index, direction) {
    const targetIndex = index + direction;

    if (saving || targetIndex < 0 || targetIndex >= queue.length) {
      return;
    }

    const nextQueue = [...queue];
    [nextQueue[index], nextQueue[targetIndex]] = [nextQueue[targetIndex], nextQueue[index]];
    void saveQueue(nextQueue);
  }

  function dropOrder(event, targetId) {
    event.preventDefault();

    if (saving || !draggedId || Number(draggedId) === Number(targetId)) {
      setDraggedId(null);
      return;
    }

    const draggedOrder = queue.find((ordem) => Number(ordem.id) === Number(draggedId));
    const remainingQueue = queue.filter((ordem) => Number(ordem.id) !== Number(draggedId));
    const targetIndex = remainingQueue.findIndex((ordem) => Number(ordem.id) === Number(targetId));

    if (!draggedOrder || targetIndex < 0) {
      setDraggedId(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY > bounds.top + bounds.height / 2;
    const insertionIndex = targetIndex + (insertAfter ? 1 : 0);
    remainingQueue.splice(insertionIndex, 0, draggedOrder);
    setDraggedId(null);
    void saveQueue(remainingQueue);
  }

  function changeQueue(nextQueueKey) {
    if (saving || nextQueueKey === activeQueueKey) {
      return;
    }

    setActiveQueueKey(nextQueueKey);
    setDraggedId(null);
    setFeedback("");
    setError("");
  }

  return (
    <section className="page-section patio-page">
      <div className="patio-toolbar">
        <div className="patio-mode-switch" role="tablist" aria-label="Escolher fila do patio">
          {Object.entries(queueOptions).map(([key, option]) => (
            <button
              key={key}
              type="button"
              className={`patio-mode-button ${activeQueueKey === key ? "active" : ""}`}
              onClick={() => changeQueue(key)}
              disabled={saving}
              role="tab"
              aria-selected={activeQueueKey === key}
            >
              <span>{option.title}</span>
              <strong>{queues[key]?.length || 0}</strong>
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="success-message">{feedback}</p> : null}

      {loading ? <div className="empty-state">Carregando fila do patio...</div> : null}
      {!loading && queue.length === 0 ? <div className="empty-state">{activeQueueConfig.empty}</div> : null}

      {!loading && queue.length > 0 ? (
        <div className={`patio-list ${saving ? "is-saving" : ""}`}>
          {queue.map((ordem, index) => (
            <article
              key={ordem.id}
              className={`patio-card ${Number(draggedId) === Number(ordem.id) ? "is-dragging" : ""}`}
              draggable={!saving}
              onDragStart={() => setDraggedId(ordem.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropOrder(event, ordem.id)}
            >
              <div className="patio-position">{index + 1}</div>
              <div className="patio-drag-handle" aria-hidden="true">
                <AppIcon name="drag" size={24} />
              </div>
              <div className="patio-card-copy">
                <strong>{ordem.cliente_nome || "Cliente nao informado"}</strong>
                <p>
                  <span>
                    {ordem.motocicleta_modelo || "Moto"}
                    {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                  </span>
                  {ordem.motocicleta_cor ? <em>{ordem.motocicleta_cor}</em> : null}
                </p>
                <small>{getServiceSummary(ordem) || ordem.queixa_principal || "Servico nao informado"}</small>
              </div>
              <div className="patio-card-actions">
                <button type="button" className="ghost-button" onClick={() => moveOrder(index, -1)} disabled={saving || index === 0}>
                  Subir
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => moveOrder(index, 1)}
                  disabled={saving || index === queue.length - 1}
                >
                  Descer
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default ControlePatioPage;
