import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Modal from "../components/common/Modal";
import AppIcon from "../components/common/AppIcon";
import StatusBadge from "../components/common/StatusBadge";
import {
  finalizarCadastroFotosV2,
  listOrdensServicoV2,
  registrarComunicacaoWhatsAppV2,
  uploadFotosEntradaV2,
} from "../services/ordemServicoV2Service";

function RecepcaoFotosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const photoInputRef = useRef(null);
  const [ordens, setOrdens] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function loadOrdens() {
    const data = await listOrdensServicoV2();
    setOrdens(data);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrdens().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const ordensPendentes = ordens.filter((ordem) => !ordem.cadastro_fotos_finalizado);

  useEffect(() => {
    const ordemId = Number(searchParams.get("ordemId"));

    if (!ordemId || !ordensPendentes.length || selectedOrder) {
      return;
    }

    const ordem = ordensPendentes.find((item) => Number(item.id) === ordemId);

    if (ordem) {
      openPhotoFlow(ordem);
    }
  }, [ordensPendentes, searchParams, selectedOrder]);

  function openPhotoFlow(ordem) {
    setSelectedOrder(ordem);
    setPendingFiles([]);
    setFeedback("");
    window.setTimeout(() => {
      photoInputRef.current?.click();
    }, 50);
  }

  function appendFotos(files) {
    setPendingFiles((current) => [...current, ...files]);
  }

  function removeFoto(index) {
    setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleEnviarFotos() {
    if (!selectedOrder || !pendingFiles.length) {
      setFeedback("Selecione pelo menos uma foto para enviar.");
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      const bundle = await uploadFotosEntradaV2(selectedOrder.id, pendingFiles);
      const nextCount = bundle.fotos_entrada?.length || 0;

      setFeedback(`Fotos enviadas com sucesso. Total atual: ${nextCount}.`);
      setPendingFiles([]);
      await loadOrdens();
      setSelectedOrder((current) => (current ? { ...current, fotos_entrada_count: nextCount } : current));
    } catch (requestError) {
      setFeedback(requestError?.response?.data?.message || "Nao foi possivel enviar as fotos.");
    } finally {
      setBusy(false);
    }
  }

  function buildClienteWhatsappMessage(ordem) {
    const motoIdentificacao = [
      ordem.motocicleta_marca,
      ordem.motocicleta_modelo,
      ordem.motocicleta_ano,
      ordem.motocicleta_placa,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return [
      `Ola, ${ordem.cliente_nome}.`,
      "Muito obrigado pela preferencia e pela confianca em nosso atendimento.",
      `Entraremos em contato o mais breve possivel para encaminhar o orcamento da sua motocicleta ${motoIdentificacao}.`,
      "As fotos da moto registradas no ato da entrega seguem abaixo para seu acompanhamento.",
      ordem.buscar_moto && ordem.endereco_retirada ? `Tambem registramos a solicitacao de busca da moto no endereco informado: ${ordem.endereco_retirada}.` : null,
      "Caso opte por nao realizar o servico, podera ser cobrado o valor referente a analise de diagnostico.",
      "Permanecemos a disposicao.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function handleWhatsAppCliente() {
    if (!selectedOrder?.cliente_telefone) {
      setFeedback("Nao ha telefone do cliente cadastrado para este envio.");
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      let ordemAtual = selectedOrder;

      if (pendingFiles.length) {
        const bundle = await uploadFotosEntradaV2(selectedOrder.id, pendingFiles);
        ordemAtual = {
          ...selectedOrder,
          fotos_entrada_count: bundle.fotos_entrada?.length || selectedOrder.fotos_entrada_count || 0,
        };
        setSelectedOrder(ordemAtual);
        setPendingFiles([]);
        await loadOrdens();
      }

      const mensagemPreparada = buildClienteWhatsappMessage(ordemAtual);
      const filesToShare = [...pendingFiles];

      await registrarComunicacaoWhatsAppV2(ordemAtual.id, {
        tipo_comunicacao: "RECEPCAO_CLIENTE",
        destinatario: ordemAtual.cliente_telefone,
        finalidade: "Envio de fotos da moto no ato da entrega.",
        mensagem_preparada: mensagemPreparada,
        status_registro: "WHATSAPP_ABERTO",
      });

      const canUseNativeShare =
        filesToShare.length > 0 &&
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: filesToShare });

      if (canUseNativeShare) {
        await navigator.share({
          text: mensagemPreparada,
          files: filesToShare,
          title: `Fotos da moto - ${ordemAtual.cliente_nome}`,
        });
        setFeedback("Compartilhamento aberto. Escolha o WhatsApp no celular para enviar as fotos e a mensagem.");
      } else {
        const digits = String(ordemAtual.cliente_telefone || "").replace(/\D/g, "");

        window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");
        setFeedback("WhatsApp aberto com a mensagem pronta. As fotos podem precisar ser anexadas manualmente no aparelho.");
      }
    } catch (requestError) {
      if (requestError?.name === "AbortError") {
        setFeedback("Compartilhamento cancelado.");
      } else {
        setFeedback(requestError?.response?.data?.message || "Nao foi possivel preparar o envio para o cliente.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleFinalizarCadastro() {
    if (!selectedOrder) {
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      await finalizarCadastroFotosV2(selectedOrder.id);
      setSelectedOrder(null);
      setPendingFiles([]);
      setSearchParams({});
      await loadOrdens();
      navigate("/oficina");
    } catch (requestError) {
      setFeedback(requestError?.response?.data?.message || "Nao foi possivel finalizar o cadastro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-section foto-flow-page">
      <div className="workspace-card foto-flow-hero">
        <div className="title-with-icon">
          <span className="title-icon">
            <AppIcon name="camera" />
          </span>
          <div>
            <p className="eyebrow">Recepcao</p>
            <h2>Fila de fotos</h2>
            <p className="subtitle">Toque no card do cliente para abrir a camera e registrar as fotos da moto.</p>
          </div>
        </div>
      </div>

      <div className="foto-flow-grid">
        {ordensPendentes.map((ordem) => (
          <button key={ordem.id} type="button" className="foto-flow-card" onClick={() => openPhotoFlow(ordem)}>
            <div className="foto-flow-card-top">
              <div>
                <strong>{ordem.cliente_nome}</strong>
                <p>{ordem.motocicleta_placa || "Placa nao informada"}</p>
              </div>
              <StatusBadge tone={Number(ordem.fotos_entrada_count || 0) > 0 ? "info" : "warning"}>
                {ordem.fotos_entrada_count || 0} foto(s)
              </StatusBadge>
            </div>
            <div className="foto-flow-card-body">
              <small>
                {ordem.motocicleta_marca} {ordem.motocicleta_modelo}
                {ordem.motocicleta_ano ? ` ${ordem.motocicleta_ano}` : ""}
              </small>
              <span className="foto-flow-card-action">
                <AppIcon name="camera" size={16} />
                Abrir camera
              </span>
            </div>
          </button>
        ))}

        {ordensPendentes.length === 0 ? (
          <div className="empty-state">Nenhum cadastro aguardando fotos neste momento.</div>
        ) : null}
      </div>

      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => !busy && setSelectedOrder(null)}
        title={selectedOrder?.cliente_nome || "Registrar fotos"}
        subtitle={selectedOrder ? `${selectedOrder.motocicleta_placa || "Sem placa"} · ${selectedOrder.motocicleta_modelo}` : ""}
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setSelectedOrder(null)} disabled={busy}>
              Fechar
            </button>
            <button type="button" className="ghost-button recepcao-whatsapp-action" onClick={handleWhatsAppCliente} disabled={busy}>
              <AppIcon name="whatsapp" size={18} />
              WhatsApp cliente
            </button>
            <button type="button" className="ghost-button" onClick={handleFinalizarCadastro} disabled={busy}>
              Finalizar cadastro
            </button>
            <button type="button" className="primary-button" onClick={handleEnviarFotos} disabled={busy || !pendingFiles.length}>
              {busy ? "Enviando..." : "Enviar fotos"}
            </button>
          </>
        }
      >
        <input
          ref={photoInputRef}
          className="sr-only-file-input"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(event) => {
            appendFotos(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />

        <button type="button" className="photo-capture-button photo-capture-button-large" onClick={() => photoInputRef.current?.click()}>
          <span className="photo-capture-plus">+</span>
          <span className="photo-capture-copy">
            <strong>Tirar ou adicionar fotos</strong>
            <small>Use a camera do celular ou escolha imagens da galeria.</small>
          </span>
        </button>

        <div className="detail-row">
          <strong>Situacao atual</strong>
          <p>{selectedOrder ? `${selectedOrder.fotos_entrada_count || 0} foto(s) ja registradas para esta moto.` : ""}</p>
        </div>

        {pendingFiles.length ? (
          <div className="photo-queue">
            {pendingFiles.map((file, index) => (
              <div className="photo-chip" key={`${file.name}-${file.size}-${index}`}>
                <span>{file.name}</span>
                <button type="button" onClick={() => removeFoto(index)} aria-label={`Remover ${file.name}`}>
                  <AppIcon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {feedback ? <p className="field-note">{feedback}</p> : null}
      </Modal>
    </section>
  );
}

export default RecepcaoFotosPage;
