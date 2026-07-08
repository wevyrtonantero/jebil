import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Modal from "../components/common/Modal";
import AppIcon from "../components/common/AppIcon";
import SignaturePad from "../components/common/SignaturePad";
import StatusBadge from "../components/common/StatusBadge";
import {
  finalizarCadastroFotosV2,
  generateAssinaturaRecebimentoPdfV2,
  getOrdemServicoV2,
  listOrdensServicoV2,
  registrarAssinaturaRecebimentoV2,
  registrarComunicacaoWhatsAppV2,
  uploadFotosEntradaV2,
} from "../services/ordemServicoV2Service";

function formatDateTime(value) {
  if (!value) {
    return "Nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getApiOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3333/api";
  return apiUrl.replace(/\/api\/?$/, "");
}

function getPublicAssetUrl(path = "") {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${getApiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildReceiptContractData(ordem, signedAt = new Date()) {
  if (!ordem) {
    return {
      titulo: "Termo de recebimento das fotos da motocicleta",
      subtitulo: "",
      campos: [],
      clausulas: [],
      dataAceite: "Nao informado",
    };
  }

  const motoIdentificacao = [
    ordem.motocicleta_marca,
    ordem.motocicleta_modelo,
    ordem.motocicleta_ano,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    titulo: "Termo de recebimento das fotos da motocicleta",
    subtitulo: "Documento de aceite digital realizado no tablet durante a recepcao da motocicleta.",
    campos: [
      { label: "Cliente", value: ordem.cliente_nome || "Nao informado" },
      { label: "Telefone", value: ordem.cliente_telefone || "Nao informado" },
      { label: "Motocicleta", value: `${motoIdentificacao || "Nao informada"} - ${ordem.motocicleta_placa || "Sem placa"}` },
      { label: "Numero da OS", value: ordem.numero_os || "Nao informada" },
      { label: "Data do aceite", value: formatDateTime(signedAt) },
    ],
    clausulas: [
      "Declaro que recebi no WhatsApp as fotos de entrada da motocicleta acima descrita.",
      "Declaro estar ciente de que a oficina podera realizar analise tecnica, diagnostico e elaboracao de orcamento conforme a necessidade do atendimento.",
      "Declaro ainda estar ciente de que podera haver cobranca referente ao diagnostico e/ou elaboracao do orcamento, conforme avaliacao do servico executado.",
    ],
    dataAceite: formatDateTime(signedAt),
  };
}

function buildWhatsappReceiptExcerpt(ordem) {
  const receipt = ordem?.assinatura_recebimento;
  const pdfUrl = getPublicAssetUrl(receipt?.pdf_url);

  if (!receipt) {
    return "";
  }

  return [
    "",
    "Resumo do aceite registrado:",
    `OS ${receipt.numero_os || ordem.numero_os}`,
    `Assinado em ${formatDateTime(receipt.assinado_em)}`,
    pdfUrl ? `PDF do contrato: ${pdfUrl}` : null,
    "Cliente ciente do recebimento das fotos e da possivel cobranca de diagnostico/orcamento.",
  ]
    .filter(Boolean)
    .join("\n");
}

function RecepcaoFotosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const photoInputRef = useRef(null);
  const [ordens, setOrdens] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signatureSavedAt, setSignatureSavedAt] = useState(null);
  const [receiptChecks, setReceiptChecks] = useState({
    recebeuFotosWhatsapp: true,
    cientePossivelCobranca: true,
  });

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
      setSearchParams({}, { replace: true });
    }
  }, [ordensPendentes, searchParams, selectedOrder, setSearchParams]);

  useEffect(() => {
    if (!selectedOrder?.id) {
      return;
    }

    let cancelled = false;

    async function loadSelectedOrderDetails() {
      setDetailsLoading(true);

      try {
        const data = await getOrdemServicoV2(selectedOrder.id);

        if (cancelled) {
          return;
        }

        setSelectedOrder((current) => (current && Number(current.id) === Number(data.id) ? data : current));
        setSignatureDataUrl(data.assinatura_recebimento?.assinatura_data_url || "");
        setSignatureSavedAt(data.assinatura_recebimento?.assinado_em || null);
        setReceiptChecks({
          recebeuFotosWhatsapp: data.assinatura_recebimento?.recebeu_fotos_whatsapp ?? true,
          cientePossivelCobranca: data.assinatura_recebimento?.ciente_possivel_cobranca ?? true,
        });
      } catch {
        if (!cancelled) {
          setFeedback("Nao foi possivel carregar os detalhes completos desta OS.");
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    }

    void loadSelectedOrderDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedOrder?.id]);

  function closePhotoFlow() {
    setSelectedOrder(null);
    setPendingFiles([]);
    setFeedback("");
    setSignatureDataUrl("");
    setSignatureSavedAt(null);
    setReceiptChecks({
      recebeuFotosWhatsapp: true,
      cientePossivelCobranca: true,
    });

    if (searchParams.get("ordemId")) {
      setSearchParams({}, { replace: true });
    }
  }

  function openPhotoFlow(ordem) {
    setSelectedOrder(ordem);
    setPendingFiles([]);
    setFeedback("");
    setSignatureDataUrl(ordem.assinatura_recebimento?.assinatura_data_url || "");
    setSignatureSavedAt(ordem.assinatura_recebimento?.assinado_em || null);
    setReceiptChecks({
      recebeuFotosWhatsapp: ordem.assinatura_recebimento?.recebeu_fotos_whatsapp ?? true,
      cientePossivelCobranca: ordem.assinatura_recebimento?.ciente_possivel_cobranca ?? true,
    });
  }

  function handleOpenSystemPhotos() {
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
      setSelectedOrder(bundle);
      setSignatureDataUrl(bundle.assinatura_recebimento?.assinatura_data_url || signatureDataUrl);
      setSignatureSavedAt(bundle.assinatura_recebimento?.assinado_em || signatureSavedAt);
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
      buildWhatsappReceiptExcerpt(ordem),
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
      const mensagemPreparada = buildClienteWhatsappMessage(selectedOrder);

      await registrarComunicacaoWhatsAppV2(selectedOrder.id, {
        tipo_comunicacao: "RECEPCAO_CLIENTE",
        destinatario: selectedOrder.cliente_telefone,
        finalidade: "Envio de fotos da moto no ato da entrega.",
        mensagem_preparada: mensagemPreparada,
        status_registro: "WHATSAPP_ABERTO",
      });

      const digits = String(selectedOrder.cliente_telefone || "").replace(/\D/g, "");

      window.open(`https://wa.me/55${digits}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");
      setFeedback("WhatsApp aberto com a mensagem pronta. Tire e envie as fotos por la, depois volte para registrar as fotos da OS no sistema.");
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

  async function handleSalvarAssinatura() {
    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.assinatura_recebimento) {
      setFeedback("Esta assinatura ja foi salva e nao pode mais ser alterada.");
      return;
    }

    if (!signatureDataUrl) {
      setFeedback("Colete a assinatura do cliente no campo abaixo antes de salvar.");
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      const bundle = await registrarAssinaturaRecebimentoV2(selectedOrder.id, {
        assinatura_data_url: signatureDataUrl,
        recebeu_fotos_whatsapp: receiptChecks.recebeuFotosWhatsapp,
        ciente_possivel_cobranca: receiptChecks.cientePossivelCobranca,
      });

      setSelectedOrder(bundle);
      setSignatureDataUrl(bundle.assinatura_recebimento?.assinatura_data_url || signatureDataUrl);
      setSignatureSavedAt(bundle.assinatura_recebimento?.assinado_em || new Date().toISOString());
      await loadOrdens();
      setFeedback(bundle.pdf_warning || "Assinatura do cliente registrada na OS com sucesso. PDF do contrato gerado.");
    } catch (requestError) {
      setFeedback(requestError?.response?.data?.message || "Nao foi possivel registrar a assinatura do cliente.");
    } finally {
      setBusy(false);
    }
  }

  function handleLimparAssinatura() {
    if (selectedOrder?.assinatura_recebimento) {
      setFeedback("Esta assinatura ja foi salva e nao pode mais ser alterada.");
      return;
    }

    setSignatureDataUrl("");
    setSignatureSavedAt(null);
    setFeedback("");
  }

  async function handleOpenContratoPdf() {
    if (!selectedOrder?.assinatura_recebimento) {
      setFeedback("Ainda nao ha contrato assinado para esta OS.");
      return;
    }

    let currentOrder = selectedOrder;
    let pdfUrl = getPublicAssetUrl(currentOrder.assinatura_recebimento?.pdf_url);

    if (!pdfUrl) {
      setBusy(true);
      setFeedback("");

      try {
        const bundle = await generateAssinaturaRecebimentoPdfV2(selectedOrder.id);
        currentOrder = bundle;
        setSelectedOrder(bundle);
        await loadOrdens();
        pdfUrl = getPublicAssetUrl(bundle.assinatura_recebimento?.pdf_url);
      } catch (requestError) {
        setFeedback(requestError?.response?.data?.message || "Nao foi possivel gerar o PDF do contrato.");
        return;
      } finally {
        setBusy(false);
      }
    }

    if (!pdfUrl) {
      setFeedback("O PDF do contrato ainda nao esta disponivel para esta OS.");
      return;
    }

    window.open(pdfUrl, "_blank", "noopener,noreferrer");
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
      navigate("/recepcao");
    } catch (requestError) {
      setFeedback(requestError?.response?.data?.message || "Nao foi possivel finalizar o cadastro.");
    } finally {
      setBusy(false);
    }
  }

  const contractData = buildReceiptContractData(selectedOrder, signatureSavedAt || new Date());
  const isSignatureLocked = Boolean(selectedOrder?.assinatura_recebimento);

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
        onClose={() => !busy && closePhotoFlow()}
        title={selectedOrder?.cliente_nome || "Registrar fotos"}
        subtitle={selectedOrder ? `${selectedOrder.motocicleta_placa || "Sem placa"} · ${selectedOrder.motocicleta_modelo}` : ""}
        actions={
          <>
            <button type="button" className="ghost-button" onClick={closePhotoFlow} disabled={busy}>
              <AppIcon name="close" size={16} />
              Fechar
            </button>
            <button type="button" className="ghost-button" onClick={handleFinalizarCadastro} disabled={busy}>
              <AppIcon name="check" size={16} />
              Finalizar cadastro
            </button>
            <button type="button" className="primary-button" onClick={handleEnviarFotos} disabled={busy || detailsLoading || !pendingFiles.length}>
              <AppIcon name="send" size={16} />
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

        <div className="foto-flow-modal-actions">
          <button type="button" className="foto-flow-modal-action is-whatsapp" onClick={handleWhatsAppCliente} disabled={busy || detailsLoading}>
            <span className="foto-flow-modal-action-icon">
              <AppIcon name="whatsapp" size={22} />
            </span>
            <span className="foto-flow-modal-action-copy">
              <strong>WhatsApp cliente</strong>
              <small>Abre a mensagem pronta para voce tirar e enviar as fotos direto no WhatsApp.</small>
            </span>
          </button>

          <button type="button" className="foto-flow-modal-action is-camera" onClick={handleOpenSystemPhotos} disabled={busy || detailsLoading}>
            <span className="foto-flow-modal-action-icon">
              <AppIcon name="camera" size={22} />
            </span>
            <span className="foto-flow-modal-action-copy">
              <strong>Fotos da OS</strong>
              <small>Depois registre no sistema as fotos internas da entrada da moto.</small>
            </span>
          </button>
        </div>

        <div className="workspace-card foto-flow-signature-shell">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Aceite digital</p>
              <h2>Contrato de recebimento</h2>
              <p className="subtitle">Organize o aceite do cliente no tablet com os dados da OS, as condicoes do atendimento e a assinatura eletronicamente registrada.</p>
            </div>
            {selectedOrder?.assinatura_recebimento ? (
              <span className="summary-pill strong">Assinado</span>
            ) : (
              <span className="summary-pill">Pendente</span>
            )}
          </div>

          <div className="foto-flow-contract">
            <div className="foto-flow-contract-header">
              <div>
                <p className="eyebrow">Documento</p>
                <h3>{contractData.titulo}</h3>
                <p>{contractData.subtitulo}</p>
              </div>
              <div className="foto-flow-contract-stamp">
                <span>Status</span>
                <strong>{selectedOrder?.assinatura_recebimento ? "Assinado" : "Aguardando assinatura"}</strong>
              </div>
            </div>

            <div className="foto-flow-contract-meta">
              {contractData.campos.map((campo) => (
                <article className="foto-flow-contract-meta-card" key={campo.label}>
                  <span>{campo.label}</span>
                  <strong>{campo.value}</strong>
                </article>
              ))}
            </div>

            <div className="foto-flow-contract-body">
              <div className="foto-flow-contract-clause">
                <span>Declaracoes do cliente</span>
                <ol className="foto-flow-contract-list">
                  {contractData.clausulas.map((clausula) => (
                    <li key={clausula}>{clausula}</li>
                  ))}
                </ol>
              </div>

              <div className="foto-flow-contract-clause">
                <span>Confirmacoes registradas no atendimento</span>
                <div className="foto-flow-contract-checks">
                  <label className="checkbox-row foto-flow-checkbox is-contract">
                    <input
                      type="checkbox"
                      checked={receiptChecks.recebeuFotosWhatsapp}
                      onChange={(event) =>
                        setReceiptChecks((current) => ({
                          ...current,
                          recebeuFotosWhatsapp: event.target.checked,
                        }))
                      }
                      disabled={busy || detailsLoading || isSignatureLocked}
                    />
                    <span>Cliente confirma que recebeu as fotos no WhatsApp.</span>
                  </label>

                  <label className="checkbox-row foto-flow-checkbox is-contract">
                    <input
                      type="checkbox"
                      checked={receiptChecks.cientePossivelCobranca}
                      onChange={(event) =>
                        setReceiptChecks((current) => ({
                          ...current,
                          cientePossivelCobranca: event.target.checked,
                        }))
                      }
                      disabled={busy || detailsLoading || isSignatureLocked}
                    />
                    <span>Cliente esta ciente de possivel cobranca de diagnostico e/ou orcamento.</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="foto-flow-contract-signature">
              <div className="foto-flow-signature-panel">
                <strong className="foto-flow-section-label">Assinatura eletronica do cliente</strong>
                <p className="foto-flow-signature-copy">
                  {isSignatureLocked
                    ? "Contrato ja assinado e bloqueado para alteracoes."
                    : "O cliente pode assinar com o dedo diretamente no tablet. A assinatura fica anexada a esta OS."}
                </p>
                <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} disabled={busy || detailsLoading || isSignatureLocked} />
              </div>

              <div className="foto-flow-signature-panel is-side">
                <div className="detail-row foto-flow-signature-status">
                  <strong>Status do aceite</strong>
                  <p>
                    {selectedOrder?.assinatura_recebimento
                      ? `Assinatura registrada em ${formatDateTime(selectedOrder.assinatura_recebimento.assinado_em)} e bloqueada para alteracoes.`
                      : "Ainda nao ha assinatura registrada nesta OS."}
                  </p>
                </div>

                <div className="detail-row foto-flow-signature-status">
                  <strong>Validade do registro</strong>
                  <p>
                    Este aceite digital fica salvo no historico da OS, aparece no prontuario da motocicleta
                    {selectedOrder?.assinatura_recebimento?.pdf_url ? " e possui PDF gerado automaticamente." : " e aguardara o PDF assim que o contrato for salvo."}
                  </p>
                </div>

                <div className="button-row foto-flow-signature-actions">
                  <button type="button" className="ghost-button" onClick={handleLimparAssinatura} disabled={busy || detailsLoading || isSignatureLocked}>
                    <AppIcon name="trash" size={16} />
                    Limpar assinatura
                  </button>
                  <button type="button" className="primary-button" onClick={() => void handleSalvarAssinatura()} disabled={busy || detailsLoading || isSignatureLocked}>
                    <AppIcon name="pencil" size={16} />
                    {isSignatureLocked ? "Contrato bloqueado" : "Salvar contrato"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void handleOpenContratoPdf()}
                    disabled={busy || detailsLoading || !selectedOrder?.assinatura_recebimento}
                  >
                    <AppIcon name="printer" size={16} />
                    {selectedOrder?.assinatura_recebimento?.pdf_url ? "Abrir PDF" : "Gerar PDF"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-row">
          <strong>Situacao atual</strong>
          <p>
            {detailsLoading
              ? "Carregando detalhes completos da OS..."
              : selectedOrder
                ? `${selectedOrder.fotos_entrada_count || 0} foto(s) ja registradas para esta moto.`
                : ""}
          </p>
        </div>

        <div className="detail-row">
          <strong>Fluxo sugerido</strong>
          <p>1. Abra o WhatsApp do cliente. 2. Envie as fotos por la. 3. Volte e registre as fotos da OS. 4. Finalize o cadastro.</p>
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
