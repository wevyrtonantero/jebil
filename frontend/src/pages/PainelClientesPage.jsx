import { useEffect, useMemo, useRef, useState } from "react";
import { getPainelClientes } from "../services/painelService";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { useSocket } from "../hooks/useSocket";
import AppIcon from "../components/common/AppIcon";
import StatusBadge from "../components/common/StatusBadge";
import { formatDateLabel, formatTime } from "../utils/formatters";

async function ensureAudioContext(audioContextRef) {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtor) {
    return null;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioCtor();
  }

  if (audioContextRef.current.state === "suspended") {
    await audioContextRef.current.resume();
  }

  return audioContextRef.current;
}

async function playReadyAlert(audioContextRef) {
  const context = await ensureAudioContext(audioContextRef);

  if (!context) {
    return false;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(740, context.currentTime);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  gainNode.gain.setValueAtTime(0.001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.55);

  return true;
}

function speakReadyAlert(item) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(`${item.cliente_nome}, ${item.motocicleta_modelo}, pronta para retirada.`);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function PainelClientesPage() {
  const socket = useSocket();
  const [data, setData] = useState({
    fila: [],
    em_andamento: [],
    pode_retirar: [],
    ultimos_finalizados: [],
    atualizado_em: "",
  });
  const [readyHighlight, setReadyHighlight] = useState(null);
  const [now, setNow] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioHint, setAudioHint] = useState("");
  const announcedReadyIds = useRef(new Set());
  const audioContextRef = useRef(null);

  async function enableAudioAlerts() {
    setAudioHint("");

    try {
      await ensureAudioContext(audioContextRef);
      setAudioEnabled(true);

      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance("Som ativado.");
        utterance.lang = "pt-BR";
        utterance.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (_error) {
      setAudioEnabled(false);
      setAudioHint("Clique em ativar som para liberar o audio no navegador.");
    }
  }

  async function loadData() {
    const response = await getPainelClientes();
    setData(response);
  }

  async function announceReadyFromOficina(atendimentoId) {
    const response = await getPainelClientes();
    setData(response);

    const pronto = response.pode_retirar.find((item) => item.id === atendimentoId);

    if (!pronto || announcedReadyIds.current.has(atendimentoId)) {
      return;
    }

    announcedReadyIds.current.add(atendimentoId);
    setReadyHighlight(pronto);

    if (audioEnabled) {
      void playReadyAlert(audioContextRef).catch(() => {
        setAudioEnabled(false);
        setAudioHint("Clique em ativar som para liberar o audio no navegador.");
      });
      speakReadyAlert(pronto);
    }

    window.setTimeout(() => {
      setReadyHighlight((current) => (current?.id === pronto.id ? null : current));
    }, 9000);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData().catch(() => {});
    }, 0);

    const clockInterval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(clockInterval);
    };
  }, []);

  useRealtimeRefresh(loadData);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    function handleServicoConcluido(event) {
      if (!event?.atendimentoId) {
        return;
      }

      void announceReadyFromOficina(event.atendimentoId).catch(() => {});
    }

    socket.on("atendimento:servico_concluido", handleServicoConcluido);

    return () => {
      socket.off("atendimento:servico_concluido", handleServicoConcluido);
    };
  }, [socket, audioEnabled]);

  const fila = useMemo(() => data.fila, [data.fila]);
  const emAndamento = useMemo(() => data.em_andamento, [data.em_andamento]);
  const podeRetirar = useMemo(() => [...data.pode_retirar].reverse(), [data.pode_retirar]);

  return (
    <section className="monitor-shell monitor-public static-monitor">
      <header className="monitor-header">
        <div>
          <h1>Acompanhe seu atendimento</h1>
          <div className="monitor-subline">
            <p className="subtitle">Fila, servicos em andamento e ultimas motos prontas para retirada.</p>
          </div>
        </div>
        <div className="monitor-header-side">
          <button type="button" className={`sound-chip ${audioEnabled ? "active" : ""}`} onClick={() => void enableAudioAlerts()}>
            <AppIcon name="bell" size={16} />
            <span>{audioEnabled ? "Som ativo" : "Ativar som"}</span>
          </button>
          <div className="monitor-clock">
            <strong>{formatTime(now)}</strong>
            <span>{formatDateLabel(now)}</span>
          </div>
        </div>
      </header>

      {audioHint ? <p className="monitor-audio-hint">{audioHint}</p> : null}

      <div className="monitor-columns compact-monitor-columns">
        <article className="monitor-card compact-monitor-card">
          <div className="monitor-title">
            <span className="monitor-title-icon">
              <AppIcon name="clock" size={22} />
            </span>
            <div>
              <h2>Fila ({data.fila.length})</h2>
              <p>Ordem de chegada</p>
            </div>
          </div>
          <div className="monitor-list compact-monitor-list">
            {fila.map((item) => (
              <article className="monitor-line-item" key={item.id}>
                <div>
                  <strong>{item.cliente_nome}</strong>
                  <p>{item.motocicleta_modelo}</p>
                </div>
                <span className="monitor-line-time">Entrada {formatTime(item.entrada_em)}</span>
              </article>
            ))}
            {fila.length === 0 ? <div className="monitor-empty">Nenhuma motocicleta aguardando agora.</div> : null}
          </div>
        </article>

        <article className="monitor-card compact-monitor-card">
          <div className="monitor-title">
            <span className="monitor-title-icon">
              <AppIcon name="workshop" size={22} />
            </span>
            <div>
              <h2>Em andamento ({data.em_andamento.length})</h2>
              <p>Mecanico e cliente bem separados</p>
            </div>
          </div>
          <div className="monitor-list compact-monitor-list">
            {emAndamento.map((item) => (
              <article className="monitor-item compact-monitor-item" key={item.id}>
                <div className="mecanico-line">
                  {item.mecanico_foto_url ? (
                    <img className="avatar avatar-sm" src={item.mecanico_foto_url} alt={item.mecanico_nome || "Equipe"} />
                  ) : (
                    <div className="avatar-fallback avatar-sm">{(item.mecanico_nome || "E").slice(0, 1)}</div>
                  )}
                  <div>
                    <strong>{item.mecanico_nome || "Equipe da oficina"}</strong>
                    <p className="monitor-secondary-name">Cliente: {item.cliente_nome}</p>
                    <small>{item.motocicleta_modelo}</small>
                  </div>
                </div>
                <StatusBadge tone={item.status_publico === "Aguardando pecas" ? "warning" : item.status_publico === "Saida para teste" ? "test" : "info"}>
                  {item.status_publico}
                </StatusBadge>
              </article>
            ))}
            {emAndamento.length === 0 ? <div className="monitor-empty">Nenhum servico em andamento agora.</div> : null}
          </div>
        </article>

        <article className="monitor-card compact-monitor-card">
          <div className="monitor-title">
            <span className="monitor-title-icon">
              <AppIcon name="check" size={22} />
            </span>
            <div>
              <h2>Prontas</h2>
              <p>Entrega liberada</p>
            </div>
          </div>
          <div className="monitor-list compact-monitor-list">
            {podeRetirar.map((item) => (
              <div className="ready-line-item" key={item.id}>
                <div>
                  <strong>{item.motocicleta_modelo}</strong>
                  <p className="monitor-secondary-name">{item.cliente_nome}</p>
                </div>
                <span className="monitor-line-time">Saida {formatTime(item.liberado_retirada_em || item.finalizado_em)}</span>
              </div>
            ))}
            {podeRetirar.length === 0 ? <div className="monitor-empty">Nenhuma motocicleta pronta no momento.</div> : null}
          </div>
        </article>
      </div>

      {readyHighlight ? (
        <div className="ready-overlay" role="alertdialog" aria-live="assertive">
          <div className="ready-overlay-card">
            <p className="eyebrow">Pode retirar</p>
            <h2>{readyHighlight.motocicleta_modelo}</h2>
            <p className="ready-overlay-name">{readyHighlight.cliente_nome}</p>
            <StatusBadge tone="success">Pronta para retirada</StatusBadge>
            <button type="button" className="ghost-button" onClick={() => setReadyHighlight(null)}>
              Fechar aviso
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default PainelClientesPage;
