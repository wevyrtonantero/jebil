import { useCallback, useEffect, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { listOperacionalV2, reordenarControlePatioV2 } from "../services/ordemServicoV2Service";
import { selectPatioQueue, sortPatioQueue } from "../utils/patioQueue";

function getServiceSummary(ordem) {
  return (ordem.items || [])
    .filter((item) => !["CANCELADO", "CONCLUIDO"].includes(item.status_item) && item.descricao !== "Diagnostico inicial")
    .map((item) => item.descricao)
    .filter(Boolean)
    .join(" | ");
}

function ControlePatioPage() {
  const [queue, setQueue] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      const ordens = await listOperacionalV2(100);
      setQueue(sortPatioQueue(selectPatioQueue(ordens)));
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

  useRealtimeRefresh(loadQueue);

  async function saveQueue(nextQueue) {
    setQueue(nextQueue);
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await reordenarControlePatioV2(nextQueue.map((ordem) => ordem.id));
      setQueue(nextQueue.map((ordem, index) => ({ ...ordem, ordem_patio: index + 1 })));
      setFeedback("Ordem da fila atualizada.");
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

  return (
    <section className="page-section patio-page">
      <div className="patio-heading">
        <div>
          <p className="eyebrow">Organizacao da oficina</p>
          <h2>Controle de Patio</h2>
          <p>Defina a sequencia manual da Fila de atendimento.</p>
        </div>
        <div className="patio-heading-side">
          <span className="patio-total">{queue.length} {queue.length === 1 ? "moto" : "motos"}</span>
          <button type="button" className="ghost-button" onClick={() => void loadQueue()} disabled={loading || saving}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="patio-instruction">
        <AppIcon name="drag" size={22} />
        <p>Arraste os cards ou use os botoes Subir e Descer. A primeira moto sera a proxima da fila.</p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="success-message">{feedback}</p> : null}

      {loading ? <div className="empty-state">Carregando fila do patio...</div> : null}
      {!loading && queue.length === 0 ? <div className="empty-state">Nenhuma moto esta na Fila de atendimento agora.</div> : null}

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
                  {ordem.motocicleta_modelo || "Moto"}
                  {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
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
