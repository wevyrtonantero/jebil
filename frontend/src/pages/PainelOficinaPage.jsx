import { useEffect, useMemo, useState } from "react";
import { getPainelOficina } from "../services/painelService";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import AppIcon from "../components/common/AppIcon";
import StatusBadge from "../components/common/StatusBadge";
import { formatDateLabel, formatTime } from "../utils/formatters";

function PainelOficinaPage() {
  const [data, setData] = useState({
    fila: [],
    em_servico: [],
    pode_retirar: [],
    ultimos_finalizados: [],
    atualizado_em: "",
  });
  const [now, setNow] = useState(new Date());

  async function loadData() {
    const response = await getPainelOficina();
    setData(response);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData().catch(() => {});
    }, 0);

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  useRealtimeRefresh(loadData);

  const fila = useMemo(() => data.fila.slice(0, 5), [data.fila]);
  const emServico = useMemo(() => data.em_servico.slice(0, 5), [data.em_servico]);
  const podeRetirar = useMemo(() => data.pode_retirar.slice(0, 5), [data.pode_retirar]);
  const finalizados = useMemo(() => data.ultimos_finalizados.slice(0, 3), [data.ultimos_finalizados]);

  return (
    <section className="monitor-shell static-monitor">
      <header className="monitor-header">
        <div>
          <h1>Oficina administrativa</h1>
          <p className="subtitle">Fila enxuta, mecanicos em atendimento e liberacoes prontas.</p>
        </div>
        <div className="monitor-clock">
          <strong>{formatTime(now)}</strong>
          <span>{formatDateLabel(now)}</span>
        </div>
      </header>

      <div className="monitor-columns compact-monitor-columns">
        <article className="monitor-card compact-monitor-card">
          <div className="monitor-title">
            <span className="monitor-title-icon">
              <AppIcon name="drag" size={22} />
            </span>
            <div>
              <h2>Fila ({data.fila.length})</h2>
              <p>Mostra ate 5 itens</p>
            </div>
          </div>
          <div className="monitor-list compact-monitor-list">
            {fila.map((item) => (
              <article className="monitor-item compact-monitor-item" key={item.id}>
                <strong>{item.cliente_nome}</strong>
                <p>
                  {item.motocicleta_modelo}
                  {item.motocicleta_placa ? ` • ${item.motocicleta_placa}` : ""}
                </p>
                <small>{item.problema_servico}</small>
              </article>
            ))}
            {fila.length === 0 ? <div className="monitor-empty">Nenhum item aguardando.</div> : null}
          </div>
        </article>

        <article className="monitor-card compact-monitor-card">
          <div className="monitor-title">
            <span className="monitor-title-icon">
              <AppIcon name="mechanic" size={22} />
            </span>
            <div>
              <h2>Em servico ({data.em_servico.length})</h2>
              <p>Leitura separada por mecanico e cliente</p>
            </div>
          </div>
          <div className="monitor-list compact-monitor-list">
            {emServico.map((item) => (
              <article className="monitor-item compact-monitor-item" key={item.id}>
                <div className="mecanico-line">
                  {item.mecanico_foto_url ? (
                    <img className="avatar avatar-sm" src={item.mecanico_foto_url} alt={item.mecanico_nome || "Mecanico"} />
                  ) : (
                    <div className="avatar-fallback avatar-sm">{(item.mecanico_nome || "E").slice(0, 1)}</div>
                  )}
                  <div>
                    <strong>{item.mecanico_nome || "Equipe da oficina"}</strong>
                    <p className="monitor-secondary-name">Cliente: {item.cliente_nome}</p>
                    <small>{item.motocicleta_modelo}</small>
                  </div>
                </div>
                <StatusBadge tone={item.status === "AGUARDANDO_PECAS" ? "warning" : item.status === "SAIDA_PARA_TESTE" ? "test" : "info"}>
                  {item.status === "AGUARDANDO_PECAS" ? "Aguardando peca" : item.status === "SAIDA_PARA_TESTE" ? "Saida para teste" : "Em andamento"}
                </StatusBadge>
              </article>
            ))}
            {emServico.length === 0 ? <div className="monitor-empty">Nenhum atendimento em execucao.</div> : null}
          </div>
        </article>

        <article className="monitor-card compact-monitor-card">
          <div className="monitor-title">
            <span className="monitor-title-icon">
              <AppIcon name="check" size={22} />
            </span>
            <div>
              <h2>Prontas ({data.pode_retirar.length})</h2>
              <p>Retiradas ja liberadas</p>
            </div>
          </div>
          <div className="monitor-list compact-monitor-list">
            {podeRetirar.map((item) => (
              <article className="monitor-item compact-monitor-item" key={item.id}>
                <strong>{item.motocicleta_modelo}</strong>
                <p className="monitor-secondary-name">{item.cliente_nome}</p>
                <StatusBadge tone="success">Pronta</StatusBadge>
              </article>
            ))}
            {podeRetirar.length === 0 ? <div className="monitor-empty">Nenhum servico pronto agora.</div> : null}
          </div>
        </article>
      </div>

      <div className="monitor-footer-strip compact-monitor-footer">
        <article className="monitor-compact">
          <strong>Ultimas finalizadas</strong>
          <p>Atualizado em {data.atualizado_em || "--"}</p>
        </article>
        {finalizados.map((item) => (
          <article className="monitor-compact" key={item.id}>
            <strong>{item.cliente_nome}</strong>
            <p>{item.motocicleta_modelo}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PainelOficinaPage;
