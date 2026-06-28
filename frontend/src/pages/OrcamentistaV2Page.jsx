import { useEffect, useMemo, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import Modal from "../components/common/Modal";
import StatusBadge from "../components/common/StatusBadge";
import {
  createOrcamentoV2,
  generateOrcamentoPdfV2,
  getOrdemServicoV2,
  listItemSuggestionsV2,
  listOrdensServicoV2,
  registrarComunicacaoWhatsAppV2,
  updateItemAutorizacaoV2,
  updateOrcamentoStatusV2,
} from "../services/ordemServicoV2Service";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";

function getStatusTone(status) {
  if (["APROVADO", "AUTORIZADO", "PRONTO_PARA_EXECUTAR", "CONCLUIDO"].includes(status)) {
    return "success";
  }

  if (["RECUSADO", "NAO_AUTORIZADO", "CANCELADO"].includes(status)) {
    return "danger";
  }

  if (["PENDENTE_ENVIO", "ENVIADO", "AGUARDANDO_AUTORIZACAO", "AGUARDANDO_RESPOSTA", "PARCIAL", "AGUARDANDO_ORCAMENTO"].includes(status)) {
    return "warning";
  }

  return "info";
}

function initialOrcamentoForm() {
  return {
    numero_externo: "",
    data_prometida: "",
    observacoes: "",
    status_orcamento: "RASCUNHO",
    items: [],
  };
}

function createOrcamentoItem(base = {}) {
  return {
    item_ordem_servico_id: base.item_ordem_servico_id || null,
    descricao: base.descricao || "",
    quantidade: base.quantidade || "1",
    valor_unitario: base.valor_unitario || "0.00",
    valor_total: base.valor_total || "0.00",
    observacao: base.observacao || "",
    origem: base.origem || "ORDEM_SERVICO",
    autorizacao_status: base.autorizacao_status || "AGUARDANDO_RESPOSTA",
  };
}

function formatExternalNumber(value = "") {
  const normalized = String(value || "").replace(/^#+/, "").trimStart();
  return normalized ? `#${normalized}` : "";
}

function isExternalNumberValid(value = "") {
  return /^#.+$/.test(String(value || "").trim());
}

function normalizeCurrencyInput(value) {
  const normalized = String(value || "").replace(",", ".");
  return normalized.replace(/[^\d.]/g, "");
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function resolveWhatsappNumber(value = "") {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.startsWith("55") ? digits : `55${digits}`;
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

function getLatestOrcamento(ordem) {
  return [...(ordem.orcamentos || [])].sort((left, right) => {
    if (left.versao_numero !== right.versao_numero) {
      return Number(right.versao_numero) - Number(left.versao_numero);
    }

    return Number(right.id) - Number(left.id);
  })[0] || null;
}

function getLatestDiagnostico(ordem) {
  return [...(ordem.diagnosticos || [])].sort((left, right) => Number(right.id) - Number(left.id))[0] || null;
}

function formatElapsedTime(value, nowTs) {
  if (!value) {
    return "Agora";
  }

  const startedAt = new Date(value).getTime();

  if (Number.isNaN(startedAt)) {
    return "Agora";
  }

  const diffMs = Math.max(0, nowTs - startedAt);
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatDateInput(value = "") {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateLabel(value = "") {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function buildWhatsappTextoOrcamento(ordem, orcamento) {
  const items = (orcamento?.items || [])
    .map((item) => `- ${item.descricao}: ${item.quantidade} x R$ ${toMoney(item.valor_peca || item.valor_total || 0)} = R$ ${toMoney(item.valor_total || 0)}`)
    .join("\n");

  return [
    `Ola, ${ordem?.cliente_nome || "cliente"}.`,
    `Seu orcamento da moto ${ordem?.motocicleta_modelo || ""} ${ordem?.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}`.trim(),
    ordem?.data_prometida ? `Prazo de entrega: ${formatDateLabel(ordem.data_prometida)}` : null,
    "",
    items || "Sem itens detalhados.",
    "",
    `Total: R$ ${toMoney(orcamento?.valor_total || 0)}`,
    orcamento?.observacoes ? `Observacoes: ${orcamento.observacoes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWhatsappPdfMessage(ordem, orcamento) {
  const pdfLink = getPublicAssetUrl(orcamento?.pdf_url);

  return [
    `Ola, ${ordem?.cliente_nome || "cliente"}.`,
    `Segue o PDF do orcamento da moto ${ordem?.motocicleta_modelo || ""} ${ordem?.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}`.trim(),
    ordem?.data_prometida ? `Prazo de entrega: ${formatDateLabel(ordem.data_prometida)}` : null,
    pdfLink ? `PDF: ${pdfLink}` : null,
    `Total: R$ ${toMoney(orcamento?.valor_total || 0)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function OrcamentistaV2Page() {
  const [ordens, setOrdens] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [orcamentoForm, setOrcamentoForm] = useState(initialOrcamentoForm);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [itemSuggestions, setItemSuggestions] = useState([]);

  async function loadOrdens() {
    const data = await listOrdensServicoV2();
    setOrdens(
      data.filter((ordem) =>
        ["EM_DIAGNOSTICO", "EM_ORCAMENTO", "AGUARDANDO_CLIENTE", "EM_EXECUCAO", "ARQUIVADA"].includes(ordem.status_geral),
      ),
    );
  }

  async function loadItemSuggestions(query = "") {
    const data = await listItemSuggestionsV2(query, 30);
    setItemSuggestions(data);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrdens().catch(() => {});
      void loadItemSuggestions().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useRealtimeRefresh(loadOrdens);

  const totalOrcamento = useMemo(
    () => orcamentoForm.items.reduce((acc, item) => acc + Number(item.valor_total || 0), 0),
    [orcamentoForm.items],
  );

  const ordensPendentes = useMemo(
    () =>
      ordens.filter((ordem) => {
        const latestOrcamento = getLatestOrcamento(ordem);
        return !latestOrcamento || latestOrcamento.status_orcamento !== "ENVIADO";
      }),
    [ordens],
  );

  const ordensEnviadas = useMemo(
    () =>
      ordens
        .filter((ordem) => getLatestOrcamento(ordem)?.status_orcamento === "ENVIADO")
        .sort((left, right) => {
          const leftDate = new Date(getLatestOrcamento(left)?.enviado_cliente_em || 0).getTime();
          const rightDate = new Date(getLatestOrcamento(right)?.enviado_cliente_em || 0).getTime();
          return rightDate - leftDate;
        }),
    [ordens],
  );

  async function refreshSelectedOrder(ordemId) {
    const detail = await getOrdemServicoV2(ordemId);
    setSelectedOrder(detail);
    await loadOrdens();
  }

  async function openOrderDetail(ordemId) {
    setError("");
    const detail = await getOrdemServicoV2(ordemId);
    const latestOrcamento = getLatestOrcamento(detail);
    setSelectedOrder(detail);
    setOrcamentoForm({
      numero_externo: latestOrcamento?.numero_externo || "",
      data_prometida: formatDateInput(detail.data_prometida),
      observacoes: latestOrcamento?.observacoes || "",
      status_orcamento: "RASCUNHO",
      items: latestOrcamento?.items?.length
        ? latestOrcamento.items.map((item) =>
            createOrcamentoItem({
              item_ordem_servico_id: item.item_ordem_servico_id,
              descricao: item.descricao,
              quantidade: String(item.quantidade || 1),
              valor_unitario: toMoney(item.valor_peca || 0),
              valor_total: toMoney(item.valor_total || 0),
              observacao: item.observacao || "",
              origem: item.origem || "ORDEM_SERVICO",
              autorizacao_status: item.autorizacao_status || "AGUARDANDO_RESPOSTA",
            }),
          )
        : detail.items
            .filter((item) => ["AGUARDANDO_ORCAMENTO", "AGUARDANDO_AUTORIZACAO", "PRONTO_PARA_EXECUTAR"].includes(item.status_item))
            .map((item) =>
              createOrcamentoItem({
                item_ordem_servico_id: item.id,
                descricao: item.descricao,
                quantidade: "1",
                valor_unitario: "0.00",
                valor_total: "0.00",
                observacao: "",
                origem: item.origem || "ORDEM_SERVICO",
                autorizacao_status: item.autorizacao_status || "AGUARDANDO_RESPOSTA",
              }),
            ),
    });
    setDetailOpen(true);
  }

  function updateOrcamentoItem(index, field, value) {
    setOrcamentoForm((current) => {
      const items = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const updated = {
          ...item,
          [field]: value,
        };

        if (field === "quantidade" || field === "valor_unitario") {
          updated.valor_total = toMoney(Number(updated.quantidade || 0) * Number(updated.valor_unitario || 0));
        }

        return updated;
      });

      return {
        ...current,
        items,
      };
    });
  }

  function removeOrcamentoItem(index) {
    setOrcamentoForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function addLooseOrcamentoItem() {
    setOrcamentoForm((current) => ({
      ...current,
      items: [
        ...current.items,
        createOrcamentoItem({ origem: "AVULSO" }),
      ],
    }));
  }

  async function handleCreateOrcamento() {
    if (!selectedOrder) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await createOrcamentoV2(selectedOrder.id, {
        numero_externo: orcamentoForm.numero_externo,
        data_prometida: orcamentoForm.data_prometida || null,
        observacoes: orcamentoForm.observacoes,
        status_orcamento: orcamentoForm.status_orcamento,
        items: orcamentoForm.items.map((item) => ({
          item_ordem_servico_id: item.item_ordem_servico_id || null,
          descricao: item.descricao,
          quantidade: Number(item.quantidade || 1),
          valor_peca: Number(item.valor_unitario || 0),
          valor_mao_obra: 0,
          valor_total: Number(item.valor_total || 0),
          observacao: item.observacao || null,
          origem: item.origem || null,
          autorizacao_status: item.autorizacao_status,
        })),
      });

      await refreshSelectedOrder(selectedOrder.id);
      setFeedback("Orcamento salvo com sucesso e PDF gerado na pasta.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel criar o orcamento.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusOrcamento(orcamentoId, statusOrcamento) {
    if (!selectedOrder) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await updateOrcamentoStatusV2(orcamentoId, {
        status_orcamento: statusOrcamento,
      });

      if (statusOrcamento === "ENVIADO") {
        await registrarComunicacaoWhatsAppV2(selectedOrder.id, {
          tipo_comunicacao: "ORCAMENTISTA_CLIENTE",
          destinatario: selectedOrder.cliente_telefone || "cliente",
          finalidade: "Aviso de orcamento pronto para envio manual.",
          mensagem_preparada: `Ola, seu orcamento da OS ${selectedOrder.numero_os} esta pronto para analise.`,
          orcamento_id: orcamentoId,
          status_registro: "WHATSAPP_ABERTO",
        });
      }

      await refreshSelectedOrder(selectedOrder.id);
      setFeedback(`Orcamento atualizado para ${statusOrcamento}.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel atualizar o status do orcamento.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAutorizarItem(itemId, status) {
    if (!selectedOrder) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await updateItemAutorizacaoV2(selectedOrder.id, itemId, status);
      await refreshSelectedOrder(selectedOrder.id);
      setFeedback(`Item atualizado para ${status}.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel atualizar a autorizacao.");
    } finally {
      setBusy(false);
    }
  }

  async function marcarOrcamentoComoEnviado(orcamentoId, mensagemPreparada) {
    await registrarComunicacaoWhatsAppV2(selectedOrder.id, {
      tipo_comunicacao: "ORCAMENTISTA_CLIENTE",
      destinatario: selectedOrder.cliente_telefone || "cliente",
      finalidade: "Envio de orcamento ao cliente pelo WhatsApp.",
      mensagem_preparada: mensagemPreparada,
      orcamento_id: orcamentoId,
      status_registro: "WHATSAPP_ABERTO",
    });

    await updateOrcamentoStatusV2(orcamentoId, {
      status_orcamento: "ENVIADO",
    });
  }

  async function handleEnviarTextoWhatsApp(orcamento) {
    if (!selectedOrder) {
      return;
    }

    const whatsappNumber = resolveWhatsappNumber(selectedOrder.cliente_telefone);

    if (!whatsappNumber) {
      setError("Nao ha telefone do cliente para enviar o orcamento.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const mensagemPreparada = buildWhatsappTextoOrcamento(selectedOrder, orcamento);
      await marcarOrcamentoComoEnviado(orcamento.id, mensagemPreparada);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");
      await loadOrdens();
      setDetailOpen(false);
      setSelectedOrder(null);
      setFeedback("Orcamento enviado por texto e movido para enviados.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel enviar o orcamento em texto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnviarPdfWhatsApp(orcamento) {
    if (!selectedOrder) {
      return;
    }

    const whatsappNumber = resolveWhatsappNumber(selectedOrder.cliente_telefone);

    if (!whatsappNumber) {
      setError("Nao ha telefone do cliente para enviar o orcamento.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const pdfData = await generateOrcamentoPdfV2(orcamento.id);
      const orcamentoAtualizado = pdfData?.orcamento || orcamento;

      const mensagemPreparada = buildWhatsappPdfMessage(selectedOrder, orcamentoAtualizado);
      await marcarOrcamentoComoEnviado(orcamento.id, mensagemPreparada);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");
      await loadOrdens();
      setDetailOpen(false);
      setSelectedOrder(null);
      setFeedback("Orcamento enviado com PDF e movido para enviados.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel enviar o orcamento em PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAbrirPdf(orcamento) {
    setBusy(true);
    setError("");

    try {
      const pdfData = await generateOrcamentoPdfV2(orcamento.id);
      const pdfUrl = getPublicAssetUrl(pdfData?.orcamento?.pdf_url);

      if (!pdfUrl) {
        setError("Nao foi possivel gerar o PDF deste orcamento.");
        return;
      }

      await refreshSelectedOrder(selectedOrder.id);
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel abrir o PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-section">
      <div className="panel-card">
        {error ? <p className="form-error">{error}</p> : null}
        {feedback ? <p className="field-note">{feedback}</p> : null}

        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Orcamentista</p>
            <h2>Organizacao comercial</h2>
            <p className="subtitle">Separe o que ainda precisa montar do que ja foi enviado ao cliente.</p>
          </div>
        </div>

        <div className="section-grid">
          <div className="table-list">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Pendentes</p>
                <h2>Para montar ou enviar</h2>
              </div>
            </div>

            {ordensPendentes.map((ordem) => (
              <article className="row-card" key={ordem.id}>
                <div>
                  <strong>{ordem.cliente_nome}</strong>
                  <p>
                    {ordem.motocicleta_modelo} {ordem.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}
                  </p>
                </div>
                <div className="row-actions stacked">
                  <button type="button" className="ghost-button" onClick={() => openOrderDetail(ordem.id)}>
                    Finalizar orcamento
                  </button>
                </div>
              </article>
            ))}
            {ordensPendentes.length === 0 ? <div className="empty-state">Nenhuma ordem pendente de tratamento comercial.</div> : null}
          </div>

          <div className="table-list">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Enviados</p>
                <h2>Orcamentos enviados</h2>
              </div>
            </div>

            {ordensEnviadas.map((ordem) => {
              const latestOrcamento = getLatestOrcamento(ordem);

              return (
                <article className="row-card" key={`sent-${ordem.id}`}>
                  <div>
                    <strong>{ordem.cliente_nome}</strong>
                    <p>
                      {ordem.motocicleta_modelo} {ordem.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}
                    </p>
                    <small>{latestOrcamento?.numero_externo || "Sem numero"} - enviado ha {formatElapsedTime(latestOrcamento?.enviado_cliente_em, clockNow)}</small>
                  </div>
                  <div className="row-actions stacked">
                    <StatusBadge tone={getStatusTone(latestOrcamento?.status_orcamento || "ENVIADO")}>
                      {latestOrcamento?.status_orcamento || "ENVIADO"}
                    </StatusBadge>
                    <button type="button" className="ghost-button" onClick={() => openOrderDetail(ordem.id)}>
                      Abrir
                    </button>
                  </div>
                </article>
              );
            })}
            {ordensEnviadas.length === 0 ? <div className="empty-state">Nenhum orcamento enviado no momento.</div> : null}
          </div>
        </div>
      </div>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        closeOnBackdrop={false}
        title={selectedOrder ? selectedOrder.cliente_nome : "Orcamento V2"}
        subtitle={
          selectedOrder
            ? `${selectedOrder.motocicleta_placa || "Sem placa"} - ${selectedOrder.motocicleta_modelo || "Sem modelo"} - ${selectedOrder.motocicleta_cor || "Sem cor"}`
            : ""
        }
        size="large"
      >
        {selectedOrder ? (
          <div className="modal-stack">
            <datalist id="orcamento-item-options">
              {itemSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
            {(() => {
              const diagnosticoAtual = getLatestDiagnostico(selectedOrder);

              return (
                <section className="orcamento-resumo-hero">
                  <div className="orcamento-resumo-grid">
                    <div>
                      <span>Queixa</span>
                      <p>{selectedOrder.queixa_principal || "-"}</p>
                    </div>
                    <div>
                      <span>Diagnostico</span>
                      <p>{diagnosticoAtual?.causa_identificada || diagnosticoAtual?.descricao_tecnica || "-"}</p>
                    </div>
                    <div>
                      <span>Pecas</span>
                      <p>{diagnosticoAtual?.pecas_sugeridas_resumo || "-"}</p>
                    </div>
                    <div>
                      <span>Mecanico</span>
                      <p>{diagnosticoAtual?.mecanico_principal_nome || "-"}</p>
                    </div>
                    <div>
                      <span>Prazo</span>
                      <p>{selectedOrder.data_prometida ? formatDateLabel(selectedOrder.data_prometida) : "-"}</p>
                    </div>
                  </div>
                </section>
              );
            })()}

            <div className="workspace-heading">
              <div>
                <h2>Montagem comercial</h2>
              </div>
            </div>

            <div className="field-grid two-up">
              <label className="field-label">
                Numero externo
                <input
                  value={orcamentoForm.numero_externo}
                  placeholder="#12345"
                  onChange={(event) => setOrcamentoForm((current) => ({ ...current, numero_externo: formatExternalNumber(event.target.value) }))}
                />
              </label>
              <label className="field-label">
                Prazo de entrega
                <input
                  type="datetime-local"
                  value={orcamentoForm.data_prometida}
                  onChange={(event) => setOrcamentoForm((current) => ({ ...current, data_prometida: event.target.value }))}
                />
              </label>
            </div>

            <div className="modal-stack">
              {orcamentoForm.items.map((item, index) => (
                <div className="service-line orcamento-service-line" key={`orc-item-${index}`}>
                  <span className="service-line-index">{String(index + 1).padStart(2, "0")}</span>
                  <input
                    className="service-line-input"
                    list="orcamento-item-options"
                    value={item.descricao}
                    placeholder="Nome da peca ou servico"
                    onFocus={() => {
                      void loadItemSuggestions(item.descricao).catch(() => {});
                    }}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      updateOrcamentoItem(index, "descricao", nextValue);
                      if (!nextValue || nextValue.length >= 2) {
                        void loadItemSuggestions(nextValue).catch(() => {});
                      }
                    }}
                  />
                  <input
                    value={item.quantidade}
                    placeholder="Qtd"
                    onChange={(event) => updateOrcamentoItem(index, "quantidade", event.target.value.replace(/\D/g, ""))}
                  />
                  <input
                    value={item.valor_unitario}
                    placeholder="Unit."
                    onChange={(event) => updateOrcamentoItem(index, "valor_unitario", normalizeCurrencyInput(event.target.value))}
                  />
                  <input
                    value={item.valor_total}
                    placeholder="Total"
                    readOnly
                  />
                  <button type="button" className="icon-button danger-card-button inline-delete-button" onClick={() => removeOrcamentoItem(index)}>
                    <AppIcon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Fechamento</p>
                <h2>Observacoes</h2>
              </div>
              <button type="button" className="icon-button add-line-toolbar-button" onClick={addLooseOrcamentoItem} aria-label="Adicionar item avulso">
                <AppIcon name="plus" size={16} />
              </button>
            </div>

            <label className="field-label">
              <textarea
                value={orcamentoForm.observacoes}
                onChange={(event) => setOrcamentoForm((current) => ({ ...current, observacoes: event.target.value }))}
                placeholder="Observacao final do orcamento"
              />
            </label>

            <div className="button-row">
              <div className="orcamento-total-footer">
                <span>Total</span>
                <strong>R$ {toMoney(totalOrcamento)}</strong>
              </div>
              <button type="button" className="primary-button" disabled={busy || !isExternalNumberValid(orcamentoForm.numero_externo)} onClick={handleCreateOrcamento}>
                Finalizar orcamento
              </button>
            </div>

            {getLatestOrcamento(selectedOrder) ? (
              <article className="row-card">
                <div>
                  <strong>{getLatestOrcamento(selectedOrder)?.numero_externo}</strong>
                  <p>R$ {toMoney(getLatestOrcamento(selectedOrder)?.valor_total || 0)}</p>
                  <small>{getLatestOrcamento(selectedOrder)?.status_orcamento === "ENVIADO" ? "ENVIADO" : "RASCUNHO"}</small>
                </div>
                <div className="row-actions stacked">
                  <StatusBadge tone={getStatusTone(getLatestOrcamento(selectedOrder)?.status_orcamento === "ENVIADO" ? "ENVIADO" : "RASCUNHO")}>
                    {getLatestOrcamento(selectedOrder)?.status_orcamento === "ENVIADO" ? "ENVIADO" : "RASCUNHO"}
                  </StatusBadge>
                  <div className="button-row">
                    {getLatestOrcamento(selectedOrder) ? (
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={busy}
                        onClick={() => void handleAbrirPdf(getLatestOrcamento(selectedOrder))}
                      >
                        Abrir PDF
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={busy || !getLatestOrcamento(selectedOrder)?.pdf_url}
                      onClick={() => void handleEnviarPdfWhatsApp(getLatestOrcamento(selectedOrder))}
                    >
                      WhatsApp PDF
                    </button>
                    <button type="button" className="ghost-button" disabled={busy} onClick={() => void handleEnviarTextoWhatsApp(getLatestOrcamento(selectedOrder))}>
                      WhatsApp texto
                    </button>
                  </div>
                </div>
              </article>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

export default OrcamentistaV2Page;
