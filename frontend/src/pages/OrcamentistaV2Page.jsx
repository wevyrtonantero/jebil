import { useEffect, useMemo, useState } from "react";
import AppIcon from "../components/common/AppIcon";
import Modal from "../components/common/Modal";
import StatusBadge from "../components/common/StatusBadge";
import {
  createOrcamentoV2,
  getOrdemServicoV2,
  listItemSuggestionsV2,
  listOrdensServicoV2,
  registrarPrevisaoPecaV2,
  registrarComunicacaoWhatsAppV2,
  retomarItemDaPecaV2,
  updateItemAutorizacaoV2,
  updateOrcamentoStatusV2,
  uploadOrcamentoPdfV2,
} from "../services/ordemServicoV2Service";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { resolveApiOrigin } from "../utils/apiUrls";

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
    valor_total: "",
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
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return (Number(digits) / 100).toFixed(2);
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatCurrencyDisplay(value) {
  if (String(value ?? "").trim() === "") {
    return "";
  }

  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function resolveOrderItemUnitValue(item) {
  const valorTotal = Number(item.valor_total || 0);
  const quantidade = Number(item.quantidade || 1);
  const valorUnitario = Number(item.valor_unitario || 0);

  if (valorUnitario > 0) {
    return valorUnitario;
  }

  if (quantidade > 0 && valorTotal > 0) {
    return valorTotal / quantidade;
  }

  return 0;
}

function resolveWhatsappNumber(value = "") {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return digits.startsWith("55") ? digits : `55${digits}`;
}

function getApiOrigin() {
  return resolveApiOrigin();
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

function hasDiagnosticoPendente(ordem) {
  return (ordem?.items || []).some((item) => ["AGUARDANDO_DIAGNOSTICO", "EM_DIAGNOSTICO"].includes(item.status_item));
}

function isAtendimentoRapido(order) {
  if (order?.legado_atendimento_id) {
    return true;
  }

  const itensValidos = (order?.items || []).filter((item) => item.status_item !== "CANCELADO");

  return (
    !String(order?.queixa_principal || "").trim() &&
    itensValidos.length > 0 &&
    itensValidos.every((item) => Boolean(item.execucao_direta) && !Boolean(item.exige_diagnostico))
  );
}

function getDraftableOrderItems(order) {
  return (order?.items || []).filter((item) => item.descricao && item.descricao !== "Diagnostico inicial" && ["AGUARDANDO_ORCAMENTO", "AGUARDANDO_AUTORIZACAO", "PRONTO_PARA_EXECUTAR"].includes(item.status_item));
}

function getClientRequestedItems(order) {
  return (order?.items || [])
    .filter((item) => item.descricao && item.descricao !== "Diagnostico inicial")
    .filter((item) => item.status_item !== "CANCELADO")
    .filter((item) => item.origem === "SOLICITADO_CLIENTE");
}

function getFallbackOrderValue(order) {
  return getDraftableOrderItems(order).reduce((total, item) => total + Number(item.valor_total || 0), 0);
}

function buildExternalBudgetItems(order, totalValue) {
  const draftItems = getDraftableOrderItems(order);
  const safeTotal = Number(totalValue || 0);

  if (!draftItems.length) {
    return [
      {
        item_ordem_servico_id: null,
        descricao: "Orcamento externo",
        quantidade: 1,
        valor_peca: safeTotal,
        valor_mao_obra: 0,
        valor_total: safeTotal,
        observacao: "PDF do orcamento anexado pelo orcamentista.",
        origem: "INCLUIDO_ORCAMENTISTA",
        autorizacao_status: "AGUARDANDO_RESPOSTA",
      },
    ];
  }

  return draftItems.map((item, index) => ({
    item_ordem_servico_id: item.id,
    descricao: item.descricao || "Item do orcamento externo",
    quantidade: Number(item.quantidade || 1),
    valor_peca: index === 0 ? safeTotal : 0,
    valor_mao_obra: 0,
    valor_total: index === 0 ? safeTotal : 0,
    observacao: index === 0 ? "Valor total conforme PDF do orcamento externo." : "Item tecnico vinculado ao orcamento externo.",
    origem: item.origem || "ORDEM_SERVICO",
    autorizacao_status: item.autorizacao_status || "AGUARDANDO_RESPOSTA",
  }));
}

function getDisplayedBudgetNumber(order) {
  return formatExternalNumber(getLatestOrcamento(order)?.numero_externo) || "Sem numero";
}

function ExternalBudgetLink({ orcamento, fallback = "Sem numero" }) {
  const number = formatExternalNumber(orcamento?.numero_externo) || fallback;
  const pdfUrl = getPublicAssetUrl(orcamento?.pdf_url);

  if (!pdfUrl) {
    return number;
  }

  return (
    <a className="external-budget-link" href={pdfUrl} target="_blank" rel="noreferrer">
      {number}
    </a>
  );
}

function getDisplayedBudgetTotal(order) {
  const latestOrcamento = getLatestOrcamento(order);

  if (latestOrcamento) {
    return Number(latestOrcamento.valor_total || 0);
  }

  return getFallbackOrderValue(order);
}

function getLatestBudgetStatus(order) {
  return getLatestOrcamento(order)?.status_orcamento || "RASCUNHO";
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

function formatElapsedTime(value, nowTs) {
  if (!value) {
    return "Agora";
  }

  const parsedDate = parseSystemDate(value);
  const startedAt = parsedDate?.getTime();

  if (!startedAt || Number.isNaN(startedAt)) {
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

  const date = parseSystemDate(value);

  if (!date || Number.isNaN(date.getTime())) {
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

  const date = parseSystemDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function formatDateTimeInput(value = "") {
  if (!value) {
    return "";
  }

  const date = parseSystemDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getAuthorizationItems(order) {
  const latestOrcamento = getLatestOrcamento(order);
  const orderItems = (order?.items || []).filter((item) => item.descricao && item.descricao !== "Diagnostico inicial" && item.status_item !== "CANCELADO");
  const usedOrderItemIds = new Set();

  return (latestOrcamento?.items || [])
    .filter((item) => item.descricao)
    .map((item, index) => {
      const normalizedDescricao = String(item.descricao || "").trim().toLowerCase();
      const linkedOrderItem =
        orderItems.find((orderItem) => {
          const matches = Number(orderItem.id) === Number(item.item_ordem_servico_id);
          if (matches && !usedOrderItemIds.has(orderItem.id)) {
            usedOrderItemIds.add(orderItem.id);
            return true;
          }

          return false;
        }) ||
        orderItems.find((orderItem) => {
          const matches = String(orderItem.descricao || "").trim().toLowerCase() === normalizedDescricao;
          if (matches && !usedOrderItemIds.has(orderItem.id)) {
            usedOrderItemIds.add(orderItem.id);
            return true;
          }

          return false;
        }) ||
        orderItems.find((orderItem) => {
          const orderDescricao = String(orderItem.descricao || "").trim().toLowerCase();
          const matches = orderDescricao.includes(normalizedDescricao) || normalizedDescricao.includes(orderDescricao);
          if (matches && !usedOrderItemIds.has(orderItem.id)) {
            usedOrderItemIds.add(orderItem.id);
            return true;
          }

          return false;
        }) ||
        orderItems.find((orderItem, orderIndex) => {
          const matches = orderIndex === index;
          if (matches && !usedOrderItemIds.has(orderItem.id)) {
            usedOrderItemIds.add(orderItem.id);
            return true;
          }

          return false;
        }) ||
        null;

      return {
        item_id: linkedOrderItem?.id || (item.item_ordem_servico_id ? Number(item.item_ordem_servico_id) : null),
        descricao: item.descricao,
        descricao_peca: item.descricao,
        previsao_chegada: formatDateTimeInput(linkedOrderItem?.previsao_peca_atual || ""),
        observacao: item.observacao || "",
        tem_peca: linkedOrderItem?.status_item === "AGUARDANDO_PECA" ? false : true,
      };
    })
    .filter((item) => item.item_id);
}

function getActivePartPreviews(order) {
  const activePreviews = (order?.previsoes_pecas || [])
    .filter((previsao) => previsao.status_previsao === "ATIVA")
    .sort((left, right) => {
      const leftTs = parseSystemDate(left.previsao_chegada)?.getTime() || Number.MAX_SAFE_INTEGER;
      const rightTs = parseSystemDate(right.previsao_chegada)?.getTime() || Number.MAX_SAFE_INTEGER;
      return leftTs - rightTs;
    });

  if (activePreviews.length) {
    return activePreviews;
  }

  return (order?.items || [])
    .filter((item) => item.status_item === "AGUARDANDO_PECA")
    .map((item) => ({
      id: `fallback-${item.id}`,
      item_ordem_servico_id: item.id,
      descricao_peca: item.descricao,
      previsao_chegada: item.previsao_peca_atual,
      observacao: item.observacoes || null,
      status_previsao: "ATIVA",
    }));
}

function hasAguardandoPeca(order) {
  return getActivePartPreviews(order).length > 0;
}

function getApprovedOrderPhase(order) {
  if (hasAguardandoPeca(order)) {
    return "Aguardando pecas";
  }

  if ((order.items || []).some((item) => item.status_item === "EM_EXECUCAO")) {
    return "Em execucao";
  }

  if ((order.items || []).some((item) => item.status_item === "CONCLUIDO")) {
    return "Servico em andamento";
  }

  if ((order.items || []).some((item) => item.status_item === "PRONTO_PARA_EXECUTAR")) {
    return "Na fila da oficina";
  }

  return "Aprovado";
}

function formatDateTimeCompact(value = "") {
  if (!value) {
    return "Sem prazo";
  }

  const date = parseSystemDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "Sem prazo";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReadyTime(value) {
  if (!value) {
    return "Agora";
  }

  const date = parseSystemDate(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "Agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCountdown(value = "", nowTs) {
  if (!value) {
    return "Sem prazo";
  }

  const targetTs = parseSystemDate(value)?.getTime();

  if (!targetTs || Number.isNaN(targetTs)) {
    return "Sem prazo";
  }

  const diffMs = targetTs - nowTs;

  if (diffMs <= 0) {
    return "Vencido";
  }

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

function buildWhatsappTextoOrcamento(ordem, orcamento) {
  const items = (orcamento?.items || [])
    .map((item) => `- ${item.descricao}: ${item.quantidade} x R$ ${formatCurrencyDisplay(item.valor_peca || item.valor_total || 0)} = R$ ${formatCurrencyDisplay(item.valor_total || 0)}`)
    .join("\n");

  return [
    `Ola, ${ordem?.cliente_nome || "cliente"}.`,
    `Seu orcamento da moto ${ordem?.motocicleta_modelo || ""} ${ordem?.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}`.trim(),
    ordem?.data_prometida ? `Prazo de entrega: ${formatDateLabel(ordem.data_prometida)}` : null,
    "",
    items || "Sem itens detalhados.",
    "",
    `Total: R$ ${formatCurrencyDisplay(orcamento?.valor_total || 0)}`,
    orcamento?.observacoes ? `Observacoes: ${orcamento.observacoes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildWhatsappPdfMessage(ordem, orcamento) {
  const pdfLink = getPublicAssetUrl(orcamento?.pdf_url);

  return [
    `Ola, ${ordem?.cliente_nome || "cliente"}.`,
    `Segue o PDF do orcamento da moto ${ordem?.motocicleta_modelo || ""} ${ordem?.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}.`.trim(),
    ordem?.data_prometida ? `Prazo de entrega: ${formatDateLabel(ordem.data_prometida)}` : null,
    pdfLink ? `PDF: ${pdfLink}` : null,
    "",
    "Estamos a disposicao para qualquer duvida.",
    "Aguardamos sua autorizacao para iniciar a execucao do servico.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildReadyWhatsappMessage(ordem) {
  const moto = [
    ordem?.motocicleta_marca,
    ordem?.motocicleta_modelo,
    ordem?.motocicleta_ano,
    ordem?.motocicleta_placa,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [
    `Ola, ${ordem?.cliente_nome || "cliente"}.`,
    `Sua motocicleta ${moto} esta pronta para retirada.`,
    "Horario de atendimento: seg. a sex. 07:00-20:00 | sab. 08:00-13:00 | dom. fechado.",
    "Estamos a disposicao.",
  ].join("\n");
}

function buildDiagnosticAuthorizationWhatsappMessage(ordem) {
  const moto = [ordem?.motocicleta_modelo, ordem?.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : null]
    .filter(Boolean)
    .join(" ");

  return [
    `Ola, ${ordem?.cliente_nome || "cliente"}.`,
    `Para concluirmos o diagnostico da sua moto ${moto || ""}, precisamos da sua autorizacao para abrir o motor e verificar os componentes internos.`.trim(),
    "Podemos prosseguir com essa etapa? Aguardamos sua confirmacao antes de continuar.",
    "Importante: caso o servico nao seja autorizado, sera cobrado o valor referente ao diagnostico realizado.",
    "Jebil Motos.",
  ].join("\n");
}

function OrcamentistaV2Page() {
  const [ordens, setOrdens] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sendChoiceOpen, setSendChoiceOpen] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const [partsControlOpen, setPartsControlOpen] = useState(false);
  const [authorizationLoading, setAuthorizationLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [orcamentoForm, setOrcamentoForm] = useState(initialOrcamentoForm);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [authorizationItems, setAuthorizationItems] = useState([]);
  const [partsControlOrder, setPartsControlOrder] = useState(null);
  const [partsControlItems, setPartsControlItems] = useState([]);
  const [pendingSendPayload, setPendingSendPayload] = useState(null);
  const [readyActionId, setReadyActionId] = useState(null);
  const [diagnosticWhatsappActionId, setDiagnosticWhatsappActionId] = useState(null);
  const [orcamentoPdfFile, setOrcamentoPdfFile] = useState(null);

  async function loadOrdens() {
    const data = await listOrdensServicoV2();
    const ordensFiltradas = data.filter((ordem) =>
      [
        "ABERTA",
        "EM_DIAGNOSTICO",
        "EM_ORCAMENTO",
        "AGUARDANDO_CLIENTE",
        "AGUARDANDO_PECA",
        "EM_EXECUCAO",
        "PARCIALMENTE_CONCLUIDA",
        "PRONTA_PARA_RETIRADA",
        "ARQUIVADA",
      ].includes(ordem.status_geral),
    );

    const ordensDetalhadas = await Promise.all(
      ordensFiltradas.map(async (ordem) => {
        try {
          return await getOrdemServicoV2(ordem.id);
        } catch {
          return ordem;
        }
      }),
    );

    setOrdens(ordensDetalhadas.filter((ordem) => !isAtendimentoRapido(ordem)));
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
    () => Number(orcamentoForm.valor_total || 0),
    [orcamentoForm.valor_total],
  );

  const ordensPendentes = useMemo(
    () =>
      ordens.filter((ordem) => {
        if (ordem.status_geral === "PRONTA_PARA_RETIRADA") {
          return false;
        }

        const latestOrcamento = getLatestOrcamento(ordem);

        if (!latestOrcamento) {
          return true;
        }

        return ["RASCUNHO", "PENDENTE_ENVIO", "PARCIAL", "RECUSADO"].includes(latestOrcamento.status_orcamento);
      }),
    [ordens],
  );

  const ordensEnviadas = useMemo(
    () =>
      ordens
        .filter((ordem) => ordem.status_geral !== "PRONTA_PARA_RETIRADA" && getLatestBudgetStatus(ordem) === "ENVIADO")
        .sort((left, right) => {
          const leftDate = parseSystemDate(getLatestOrcamento(left)?.enviado_cliente_em)?.getTime() || 0;
          const rightDate = parseSystemDate(getLatestOrcamento(right)?.enviado_cliente_em)?.getTime() || 0;
          return rightDate - leftDate;
        }),
    [ordens],
  );

  const ordensAprovadas = useMemo(
    () =>
      ordens
        .filter((ordem) => ordem.status_geral !== "PRONTA_PARA_RETIRADA" && getLatestBudgetStatus(ordem) === "APROVADO")
        .sort((left, right) => {
          const leftDate = parseSystemDate(getLatestOrcamento(left)?.atualizado_em || left.atualizado_em)?.getTime() || 0;
          const rightDate = parseSystemDate(getLatestOrcamento(right)?.atualizado_em || right.atualizado_em)?.getTime() || 0;
          return rightDate - leftDate;
        }),
    [ordens],
  );

  const ordensAguardandoPecas = useMemo(
    () =>
      ordens
        .filter((ordem) => ordem.status_geral !== "PRONTA_PARA_RETIRADA" && hasAguardandoPeca(ordem))
        .sort((left, right) => {
          const leftTime = parseSystemDate(getActivePartPreviews(left)[0]?.previsao_chegada)?.getTime() || Number.MAX_SAFE_INTEGER;
          const rightTime = parseSystemDate(getActivePartPreviews(right)[0]?.previsao_chegada)?.getTime() || Number.MAX_SAFE_INTEGER;
          return leftTime - rightTime;
        }),
    [ordens],
  );

  const ordensAguardandoRetirada = useMemo(
    () =>
      ordens
        .filter((ordem) => ordem.status_geral === "PRONTA_PARA_RETIRADA")
        .sort((left, right) => {
          const leftDate = parseSystemDate(left.pronta_retirada_em || left.atualizado_em)?.getTime() || 0;
          const rightDate = parseSystemDate(right.pronta_retirada_em || right.atualizado_em)?.getTime() || 0;
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

    if (hasDiagnosticoPendente(detail)) {
      setError("Esta OS ainda nao pode gerar orcamento: o diagnostico do mecanico ainda nao foi concluido.");
      setDetailOpen(false);
      return;
    }

    const latestOrcamento = getLatestOrcamento(detail);
    setSelectedOrder(detail);
    setOrcamentoPdfFile(null);
    setOrcamentoForm({
      numero_externo: latestOrcamento?.numero_externo || "",
      valor_total: latestOrcamento ? toMoney(latestOrcamento.valor_total || 0) : toMoney(getFallbackOrderValue(detail)),
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
        : getDraftableOrderItems(detail).map((item) =>
              createOrcamentoItem({
                item_ordem_servico_id: item.id,
                descricao: item.descricao,
                quantidade: String(item.quantidade || 1),
                valor_unitario: toMoney(resolveOrderItemUnitValue(item)),
                valor_total: toMoney(item.valor_total || 0),
                observacao: item.observacoes || "",
                origem: item.origem || "ORDEM_SERVICO",
                autorizacao_status: item.autorizacao_status || "AGUARDANDO_RESPOSTA",
              }),
            ),
    });
    setDetailOpen(true);
  }

  async function openAuthorizationFlow(ordemId) {
    setError("");
    setAuthorizationItems([]);
    setAuthorizationOpen(true);
    setAuthorizationLoading(true);

    try {
      let detail = await getOrdemServicoV2(ordemId);
      let authorizationList = getAuthorizationItems(detail);
      let latestOrcamento = getLatestOrcamento(detail);

      if (!authorizationList.length && latestOrcamento?.items?.length) {
        await createOrcamentoV2(ordemId, {
          numero_externo: latestOrcamento.numero_externo,
          data_prometida: detail.data_prometida || null,
          observacoes: latestOrcamento.observacoes || "",
          status_orcamento: latestOrcamento.status_orcamento || "ENVIADO",
          items: latestOrcamento.items.map((item) => ({
            item_ordem_servico_id: item.item_ordem_servico_id || null,
            descricao: item.descricao,
            quantidade: Number(item.quantidade || 1),
            valor_peca: Number(item.valor_peca || 0),
            valor_mao_obra: Number(item.valor_mao_obra || 0),
            valor_total: Number(item.valor_total || 0),
            observacao: item.observacao || null,
            origem: item.origem || "INCLUIDO_ORCAMENTISTA",
            autorizacao_status: item.autorizacao_status || "AGUARDANDO_RESPOSTA",
          })),
        });

        detail = await getOrdemServicoV2(ordemId);
        latestOrcamento = getLatestOrcamento(detail);
        authorizationList = getAuthorizationItems(detail);
      }

      setSelectedOrder(detail);
      setAuthorizationItems(authorizationList);

      if (!authorizationList.length) {
        setError("Nao encontrei itens para autorizar neste orcamento.");
      }
    } catch (requestError) {
      setAuthorizationOpen(false);
      setError(requestError?.response?.data?.message || "Nao foi possivel abrir a autorizacao.");
    } finally {
      setAuthorizationLoading(false);
    }
  }

  async function openPartsControl(ordemId) {
    setError("");
    const detail = await getOrdemServicoV2(ordemId);
    const activeParts = getActivePartPreviews(detail);

    setPartsControlOrder(detail);
    setPartsControlItems(
      activeParts.map((part) => ({
        preview_id: part.id,
        item_id: part.item_ordem_servico_id,
        descricao_peca: part.descricao_peca,
        previsao_chegada: formatDateTimeInput(part.previsao_chegada || ""),
        observacao: part.observacao || "",
      })),
    );
    setPartsControlOpen(true);
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

  function selectOrcamentoPdf(file) {
    if (!file) {
      return;
    }

    if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) {
      setError("Anexe somente arquivo PDF.");
      return;
    }

    setError("");
    setOrcamentoPdfFile(file);
  }

  function handlePdfDrop(event) {
    event.preventDefault();
    selectOrcamentoPdf(Array.from(event.dataTransfer.files || [])[0]);
  }

  async function handleCreateOrcamento() {
    if (!selectedOrder) {
      return;
    }

    const valorTotalExterno = Number(orcamentoForm.valor_total || 0);
    const latestOrcamento = getLatestOrcamento(selectedOrder);

    if (!Number.isFinite(valorTotalExterno) || valorTotalExterno < 0) {
      setError("Informe um valor total valido para o orcamento.");
      return;
    }

    if (!orcamentoPdfFile && !latestOrcamento?.pdf_url) {
      setError("Anexe o PDF do orcamento para enviar ao cliente.");
      return;
    }

    const orderSnapshot = selectedOrder;
    setBusy(true);
    setError("");

    try {
      const response = await createOrcamentoV2(selectedOrder.id, {
        numero_externo: orcamentoForm.numero_externo,
        data_prometida: orcamentoForm.data_prometida || null,
        observacoes: orcamentoForm.observacoes,
        status_orcamento: orcamentoForm.status_orcamento,
        items: buildExternalBudgetItems(selectedOrder, valorTotalExterno),
      });

      let orcamentoSalvo = response?.orcamento;

      if (!orcamentoSalvo?.id) {
        throw new Error("Orcamento salvo sem identificador para envio.");
      }

      if (orcamentoPdfFile) {
        const uploadResponse = await uploadOrcamentoPdfV2(orcamentoSalvo.id, orcamentoPdfFile);
        orcamentoSalvo = uploadResponse?.orcamento || orcamentoSalvo;
      }

      await loadOrdens();
      setPendingSendPayload({
        order: orderSnapshot,
        orcamento: orcamentoSalvo,
      });
      setDetailOpen(false);
      setSendChoiceOpen(true);
      setFeedback("Orcamento externo salvo. Escolha como enviar o PDF anexado ao cliente.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Nao foi possivel criar o orcamento.");
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

  function updateAuthorizationItem(itemId, field, value) {
    setAuthorizationItems((current) =>
      current.map((item) => {
        if (item.item_id !== itemId) {
          return item;
        }

        if (field === "tem_peca") {
          return {
            ...item,
            tem_peca: value,
            previsao_chegada: value ? "" : item.previsao_chegada,
            observacao: value ? "" : item.observacao,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  }

  function handleMarkAllAuthorizationAsAvailable() {
    setAuthorizationItems((current) =>
      current.map((item) => ({
        ...item,
        tem_peca: true,
        previsao_chegada: "",
        observacao: "",
      })),
    );
  }

  async function handleConfirmarAutorizacao() {
    if (!selectedOrder) {
      return;
    }

    if (!authorizationItems.length) {
      setError("Nao ha itens do orcamento para enviar para a oficina.");
      return;
    }

    const itemComPrazoInvalido = authorizationItems.find((item) => !item.tem_peca && !item.previsao_chegada);

    if (itemComPrazoInvalido) {
      setError(`Informe a data e hora da peca para ${itemComPrazoInvalido.descricao}.`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const latestOrcamento = getLatestOrcamento(selectedOrder);

      for (const item of authorizationItems) {
        await updateItemAutorizacaoV2(selectedOrder.id, item.item_id, "AUTORIZADO");

        if (!item.tem_peca) {
          await registrarPrevisaoPecaV2(selectedOrder.id, item.item_id, {
            descricao_peca: item.descricao_peca.trim() || item.descricao,
            previsao_chegada: item.previsao_chegada,
            observacao: item.observacao.trim() || null,
          });
        }
      }

      if (latestOrcamento?.id) {
        await updateOrcamentoStatusV2(latestOrcamento.id, {
          status_orcamento: "APROVADO",
        });
      }

      await loadOrdens();
      setAuthorizationOpen(false);
      setSelectedOrder(null);
      setAuthorizationItems([]);
      setFeedback(
        authorizationItems.every((item) => item.tem_peca)
          ? "Autorizacao registrada e moto enviada para a fila da oficina."
          : "Autorizacao registrada e moto enviada para aguardando pecas.",
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel confirmar a autorizacao.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSalvarPrevisoesPeca() {
    if (!partsControlOrder || !partsControlItems.length) {
      return;
    }

    const invalidItem = partsControlItems.find((item) => !item.previsao_chegada);

    if (invalidItem) {
      setError(`Informe a data e hora para ${invalidItem.descricao_peca}.`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      for (const item of partsControlItems) {
        await registrarPrevisaoPecaV2(partsControlOrder.id, item.item_id, {
          descricao_peca: item.descricao_peca,
          previsao_chegada: item.previsao_chegada,
          observacao: item.observacao || null,
        });
      }

      await loadOrdens();
      setPartsControlOpen(false);
      setPartsControlOrder(null);
      setPartsControlItems([]);
      setFeedback("Previsao de peca atualizada.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel atualizar a previsao das pecas.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmarChegadaPeca(itemId) {
    if (!partsControlOrder) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await retomarItemDaPecaV2(partsControlOrder.id, itemId, {
        status_destino: "PRONTO_PARA_EXECUTAR",
        observacao: "Peca recebida pelo orcamentista.",
      });

      const detail = await getOrdemServicoV2(partsControlOrder.id);
      const activeParts = getActivePartPreviews(detail);

      await loadOrdens();

      if (!activeParts.length) {
        setPartsControlOpen(false);
        setPartsControlOrder(null);
        setPartsControlItems([]);
        setFeedback("Todas as pecas chegaram e a moto voltou para a fila da oficina.");
        return;
      }

      setPartsControlOrder(detail);
      setPartsControlItems(
        activeParts.map((part) => ({
          preview_id: part.id,
          item_id: part.item_ordem_servico_id,
          descricao_peca: part.descricao_peca,
          previsao_chegada: formatDateTimeInput(part.previsao_chegada || ""),
          observacao: part.observacao || "",
        })),
      );
      setFeedback("Peca recebida e lista atualizada.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel confirmar a chegada da peca.");
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

  async function enviarOrcamentoPorWhatsappPdf(ordem, orcamento) {
    const whatsappNumber = resolveWhatsappNumber(ordem?.cliente_telefone);

    if (!whatsappNumber) {
      throw new Error("Nao ha telefone do cliente para enviar o orcamento.");
    }

    if (!orcamento?.pdf_url) {
      throw new Error("Anexe o PDF do orcamento antes de enviar ao cliente.");
    }

    const mensagemPreparada = buildWhatsappPdfMessage(ordem, orcamento);
    await marcarOrcamentoComoEnviado(orcamento.id, mensagemPreparada);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");

    return orcamento;
  }

  function closeSendChoice() {
    setSendChoiceOpen(false);
    setPendingSendPayload(null);
    setSelectedOrder(null);
  }

  async function handleSendChoiceText() {
    const payload = pendingSendPayload;

    if (!payload) {
      return;
    }

    const whatsappNumber = resolveWhatsappNumber(payload.order?.cliente_telefone);

    if (!whatsappNumber) {
      setError("Nao ha telefone do cliente para enviar o orcamento.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const mensagemPreparada = buildWhatsappTextoOrcamento(payload.order, payload.orcamento);
      await marcarOrcamentoComoEnviado(payload.orcamento.id, mensagemPreparada);
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");
      await loadOrdens();
      closeSendChoice();
      setFeedback("Orcamento enviado por texto e movido para enviados.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Nao foi possivel enviar o orcamento em texto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendChoicePdf() {
    const payload = pendingSendPayload;

    if (!payload) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await enviarOrcamentoPorWhatsappPdf(payload.order, payload.orcamento);
      await loadOrdens();
      closeSendChoice();
      setFeedback("Orcamento enviado com PDF e movido para enviados.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Nao foi possivel enviar o orcamento em PDF.");
    } finally {
      setBusy(false);
    }
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

    setBusy(true);
    setError("");

    try {
      await enviarOrcamentoPorWhatsappPdf(selectedOrder, orcamento);
      await loadOrdens();
      setDetailOpen(false);
      setSelectedOrder(null);
      setFeedback("Orcamento enviado com PDF e movido para enviados.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Nao foi possivel enviar o orcamento em PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAbrirPdf(orcamento) {
    setBusy(true);
    setError("");

    try {
      const pdfUrl = getPublicAssetUrl(orcamento?.pdf_url);

      if (!pdfUrl) {
        setError("Este orcamento ainda nao possui PDF anexado.");
        return;
      }

      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel abrir o PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNotifyReadyForPickup(ordem) {
    const whatsappNumber = resolveWhatsappNumber(ordem?.cliente_telefone);

    if (!whatsappNumber) {
      setError("Nao ha telefone do cliente para avisar a retirada.");
      return;
    }

    setReadyActionId(ordem.id);
    setError("");
    setFeedback("");

    try {
      const mensagemPreparada = buildReadyWhatsappMessage(ordem);
      await registrarComunicacaoWhatsAppV2(ordem.id, {
        tipo_comunicacao: "SERVICO_FINALIZADO",
        destinatario: ordem.cliente_telefone,
        finalidade: "Aviso de motocicleta pronta para retirada.",
        mensagem_preparada: mensagemPreparada,
        status_registro: "WHATSAPP_ABERTO",
      });

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");
      await loadOrdens();
      setFeedback(`Cliente avisado sobre a retirada de ${ordem.motocicleta_placa || ordem.motocicleta_modelo}.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel preparar o WhatsApp de retirada.");
    } finally {
      setReadyActionId(null);
    }
  }

  async function handleDiagnosticAuthorizationWhatsapp(ordem) {
    const whatsappNumber = resolveWhatsappNumber(ordem?.cliente_telefone);

    if (!whatsappNumber) {
      setError(`O cliente ${ordem?.cliente_nome || "selecionado"} nao possui telefone cadastrado.`);
      setFeedback("");
      return;
    }

    setDiagnosticWhatsappActionId(ordem.id);
    setError("");
    setFeedback("");

    try {
      const mensagemPreparada = buildDiagnosticAuthorizationWhatsappMessage(ordem);
      const diagnostico = getLatestDiagnostico(ordem);

      await registrarComunicacaoWhatsAppV2(ordem.id, {
        tipo_comunicacao: "ORCAMENTISTA_CLIENTE",
        destinatario: ordem.cliente_telefone,
        finalidade: "Solicitacao de autorizacao para abertura do motor durante o diagnostico.",
        mensagem_preparada: mensagemPreparada,
        diagnostico_id: diagnostico?.id || undefined,
        status_registro: "WHATSAPP_ABERTO",
      });

      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");
      setFeedback(`WhatsApp de ${ordem.cliente_nome} aberto com o pedido de autorizacao.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel abrir o WhatsApp para solicitar a autorizacao.");
    } finally {
      setDiagnosticWhatsappActionId(null);
    }
  }

  return (
    <section className="page-section">
      <div className="panel-card orcamento-page-shell">
        <div className="orcamento-page-header">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Orcamentista</p>
              <h2>Organizacao comercial</h2>
              <p className="subtitle">Visualize o funil completo de montagem, envio, aprovacao e acompanhamento de pecas.</p>
            </div>
          </div>

          <div className="orcamento-overview-grid">
            <article className="orcamento-overview-card">
              <span>Pendentes</span>
              <strong>{ordensPendentes.length}</strong>
              <small>Precisam montar ou revisar</small>
            </article>
            <article className="orcamento-overview-card">
              <span>Enviados</span>
              <strong>{ordensEnviadas.length}</strong>
              <small>Aguardando resposta do cliente</small>
            </article>
            <article className="orcamento-overview-card">
              <span>Aprovados</span>
              <strong>{ordensAprovadas.length}</strong>
              <small>Ja seguiram para oficina</small>
            </article>
            <article className="orcamento-overview-card">
              <span>Pecas</span>
              <strong>{ordensAguardandoPecas.length}</strong>
              <small>Com prazo de chegada em aberto</small>
            </article>
            <article className="orcamento-overview-card">
              <span>Retirada</span>
              <strong>{ordensAguardandoRetirada.length}</strong>
              <small>Motos prontas para avisar</small>
            </article>
          </div>
        </div>

        {error || feedback ? (
          <div className="orcamento-feedback-stack">
            {error ? <p className="form-error">{error}</p> : null}
            {feedback ? <p className="field-note orcamento-feedback-note">{feedback}</p> : null}
          </div>
        ) : null}

        <div className="orcamento-board">
          <div className="workspace-stack">
            <div className="table-list orcamento-section">
              <div className="orcamento-section-header">
                <div>
                  <p className="eyebrow">Pendentes</p>
                  <h2>Para montar ou enviar</h2>
                </div>
                <span className="orcamento-section-count">{ordensPendentes.length}</span>
              </div>

              {ordensPendentes.map((ordem) => {
                const diagnosticoPendente = hasDiagnosticoPendente(ordem);
                const latestOrcamento = getLatestOrcamento(ordem);

                return (
                  <article className={`row-card orcamento-card orcamento-pendente-card ${diagnosticoPendente ? "is-blocked" : ""}`} key={ordem.id}>
                    <div className="orcamento-card-main">
                      <strong>{ordem.cliente_nome}</strong>
                      <p>
                        {ordem.motocicleta_modelo} {ordem.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}
                      </p>
                      <small>{diagnosticoPendente ? "Aguardando diagnostico do mecanico para liberar o orcamento." : "Pronto para montar proposta comercial."}</small>
                    </div>

                    <div className="orcamento-pendente-side">
                      <div className="orcamento-pendente-meta">
                        <strong>
                          <ExternalBudgetLink orcamento={latestOrcamento} fallback={getDisplayedBudgetNumber(ordem)} />
                        </strong>
                        <span>R$ {formatCurrencyDisplay(getDisplayedBudgetTotal(ordem))}</span>
                      </div>

                      {diagnosticoPendente ? (
                        <button
                          type="button"
                          className="icon-button recepcao-whatsapp-action orcamento-diagnostic-whatsapp"
                          onClick={() => void handleDiagnosticAuthorizationWhatsapp(ordem)}
                          disabled={diagnosticWhatsappActionId === ordem.id || !resolveWhatsappNumber(ordem.cliente_telefone)}
                          aria-label={`Pedir autorizacao de diagnostico a ${ordem.cliente_nome} pelo WhatsApp`}
                          title={
                            resolveWhatsappNumber(ordem.cliente_telefone)
                              ? "Pedir autorizacao para abrir o motor pelo WhatsApp"
                              : "Cliente sem telefone cadastrado"
                          }
                        >
                          <AppIcon name="whatsapp" size={18} />
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="icon-button orcamento-pendente-edit"
                        onClick={() => openOrderDetail(ordem.id)}
                        aria-label={`Editar orcamento de ${ordem.cliente_nome}`}
                        title={diagnosticoPendente ? "Diagnostico do mecanico ainda nao concluido" : "Editar orcamento"}
                        disabled={diagnosticoPendente}
                      >
                        <AppIcon name="pencil" size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
              {ordensPendentes.length === 0 ? <div className="empty-state">Nenhuma ordem pendente de tratamento comercial.</div> : null}
            </div>

            <div className="table-list orcamento-section">
              <div className="orcamento-section-header">
                <div>
                  <p className="eyebrow">Aprovados</p>
                  <h2>Orcamentos aprovados</h2>
                </div>
                <span className="orcamento-section-count">{ordensAprovadas.length}</span>
              </div>

              {ordensAprovadas.map((ordem) => {
                const latestOrcamento = getLatestOrcamento(ordem);

                return (
                  <article className="row-card orcamento-card orcamento-card-approved" key={`approved-${ordem.id}`}>
                    <div className="orcamento-card-main">
                      <strong>{ordem.cliente_nome}</strong>
                      <p>
                        {ordem.motocicleta_modelo} {ordem.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}
                      </p>
                      <small>
                        <ExternalBudgetLink orcamento={latestOrcamento} />
                      </small>
                    </div>
                    <div className="orcamento-pendente-side">
                      <div className="orcamento-pendente-meta">
                        <span>{getApprovedOrderPhase(ordem)}</span>
                        <StatusBadge tone={getStatusTone("APROVADO")}>APROVADO</StatusBadge>
                      </div>
                      <button
                        type="button"
                        className="icon-button orcamento-sent-icon-button"
                        onClick={() => openOrderDetail(ordem.id)}
                        aria-label={`Abrir orcamento aprovado de ${ordem.cliente_nome}`}
                        title="Abrir"
                      >
                        <AppIcon name="pencil" size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
              {ordensAprovadas.length === 0 ? <div className="empty-state">Nenhum orcamento aprovado no momento.</div> : null}
            </div>
          </div>

          <div className="workspace-stack">
            <div className="table-list orcamento-section">
              <div className="orcamento-section-header">
                <div>
                  <p className="eyebrow">Enviados</p>
                  <h2>Orcamentos enviados</h2>
                </div>
                <span className="orcamento-section-count">{ordensEnviadas.length}</span>
              </div>

              {ordensEnviadas.map((ordem) => {
                const latestOrcamento = getLatestOrcamento(ordem);

                return (
                  <article className="row-card orcamento-card orcamento-card-sent" key={`sent-${ordem.id}`}>
                    <div className="orcamento-card-main">
                      <strong>{ordem.cliente_nome}</strong>
                      <p>
                        {ordem.motocicleta_modelo} {ordem.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}
                      </p>
                      <small>
                        <ExternalBudgetLink orcamento={latestOrcamento} /> - enviado ha{" "}
                        {formatElapsedTime(latestOrcamento?.enviado_cliente_em, clockNow)}
                      </small>
                    </div>
                    <div className="row-actions stacked">
                      <button
                        type="button"
                        className="icon-button success-button orcamento-sent-icon-button"
                        onClick={() => void openAuthorizationFlow(ordem.id)}
                        aria-label={`Autorizar orcamento de ${ordem.cliente_nome}`}
                        title="Autorizar"
                      >
                        <AppIcon name="check" size={18} />
                      </button>
                      <button
                        type="button"
                        className="icon-button orcamento-sent-icon-button"
                        onClick={() => openOrderDetail(ordem.id)}
                        aria-label={`Abrir orcamento de ${ordem.cliente_nome}`}
                        title="Abrir"
                      >
                        <AppIcon name="pencil" size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
              {ordensEnviadas.length === 0 ? <div className="empty-state">Nenhum orcamento enviado no momento.</div> : null}
            </div>

            <div className="table-list orcamento-section orcamento-ready-section">
              <div className="orcamento-section-header">
                <div>
                  <p className="eyebrow">Retirada</p>
                  <h2>Aguardando retirada</h2>
                </div>
                <span className="orcamento-section-count">{ordensAguardandoRetirada.length}</span>
              </div>

              <div className="recepcao-ready-list">
                {ordensAguardandoRetirada.map((ordem) => {
                  const externalNumber = formatExternalNumber(ordem.numero_externo);
                  const budgetPdfUrl = getPublicAssetUrl(ordem.orcamento_pdf_url);
                  const totalAmount = Number(ordem.valor_total_ordem || 0);
                  const clienteAvisado = Boolean(ordem.cliente_avisado_retirada);

                  return (
                    <article className={`recepcao-ready-card orcamento-ready-card ${clienteAvisado ? "is-notified" : ""}`} key={`ready-${ordem.id}`}>
                      <div className="recepcao-ready-copy">
                        <strong>{ordem.cliente_nome}</strong>
                        <p>
                          {ordem.motocicleta_modelo}
                          {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                          {externalNumber ? " | " : ""}
                          {externalNumber && budgetPdfUrl ? (
                            <a className="external-budget-link" href={budgetPdfUrl} target="_blank" rel="noreferrer">
                              {externalNumber}
                            </a>
                          ) : externalNumber}
                        </p>
                        <div className="recepcao-ready-meta">
                          <small>Pronta desde {formatReadyTime(ordem.pronta_retirada_em || ordem.atualizado_em)}</small>
                          <strong className="recepcao-payment-amount">Total R$ {formatCurrencyDisplay(totalAmount)}</strong>
                        </div>
                      </div>
                      <div className="recepcao-ready-actions">
                        {clienteAvisado ? (
                          <span className="orcamento-ready-notified" title="Cliente ja avisado">
                            <AppIcon name="user" size={18} />
                            Avisado
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="icon-button recepcao-whatsapp-action"
                          onClick={() => void handleNotifyReadyForPickup(ordem)}
                          disabled={readyActionId === ordem.id || clienteAvisado}
                          aria-label="Avisar cliente pelo WhatsApp"
                          title={clienteAvisado ? "Cliente ja avisado" : "Avisar cliente pelo WhatsApp"}
                        >
                          <AppIcon name="whatsapp" size={18} />
                        </button>
                      </div>
                    </article>
                  );
                })}
                {ordensAguardandoRetirada.length === 0 ? <div className="empty-state">Nenhuma moto aguardando retirada.</div> : null}
              </div>
            </div>

            <div className="table-list orcamento-section orcamento-parts-panel">
              <div className="orcamento-section-header">
                <div>
                  <p className="eyebrow">Pecas</p>
                  <h2>Aguardando pecas</h2>
                </div>
                <span className="orcamento-section-count">{ordensAguardandoPecas.length}</span>
              </div>

              {ordensAguardandoPecas.map((ordem) => {
                const activeParts = getActivePartPreviews(ordem);

                return (
                  <article className="row-card orcamento-card orcamento-part-card" key={`parts-${ordem.id}`}>
                    <div className="orcamento-part-card-copy">
                      <strong>{ordem.cliente_nome}</strong>
                      <p>
                        {ordem.motocicleta_modelo} {ordem.motocicleta_placa ? `- ${ordem.motocicleta_placa}` : ""}
                      </p>
                      <div className="orcamento-part-lines">
                        {activeParts.map((part) => (
                          <div className="orcamento-part-line" key={`${ordem.id}-${part.id}`}>
                            <span>{part.descricao_peca}</span>
                            <small>{formatDateTimeCompact(part.previsao_chegada)}</small>
                            <strong>{formatCountdown(part.previsao_chegada, clockNow)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="row-actions stacked">
                      <button
                        type="button"
                        className="icon-button orcamento-sent-icon-button"
                        onClick={() => void openPartsControl(ordem.id)}
                        aria-label={`Atualizar previsao de pecas de ${ordem.cliente_nome}`}
                        title="Atualizar prazo"
                      >
                        <AppIcon name="clock" size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
              {ordensAguardandoPecas.length === 0 ? <div className="empty-state">Nenhuma moto aguardando pecas no momento.</div> : null}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={authorizationOpen}
        onClose={() => setAuthorizationOpen(false)}
        title={selectedOrder ? `Autorizacao - ${selectedOrder.cliente_nome}` : "Autorizacao"}
        subtitle={selectedOrder ? `${selectedOrder.motocicleta_modelo} - ${selectedOrder.motocicleta_placa || "Sem placa"}` : ""}
        size="large"
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setAuthorizationOpen(false)} disabled={busy}>
              Fechar
            </button>
            <button type="button" className="primary-button" onClick={() => void handleConfirmarAutorizacao()} disabled={busy}>
              Enviar para oficina
            </button>
          </>
        }
      >
        {selectedOrder || authorizationLoading ? (
          <div className="modal-stack">
            {authorizationLoading ? <div className="empty-state">Carregando itens do orcamento...</div> : null}
            {!authorizationLoading && authorizationItems.length ? (
              <div className="auth-modal-toolbar">
                <span className="badge badge-info">{authorizationItems.length} item(ns)</span>
                <button
                  type="button"
                  className="icon-button success-button"
                  onClick={handleMarkAllAuthorizationAsAvailable}
                  title="Tem tudo"
                  aria-label="Marcar todos os itens como disponiveis"
                >
                  <AppIcon name="check" size={18} />
                </button>
              </div>
            ) : null}
            {!authorizationLoading
              ? authorizationItems.map((item) => (
                  <article className={`auth-item-compact ${item.tem_peca ? "is-available" : "is-waiting-part"}`} key={`auth-${item.item_id}`}>
                    <div className="auth-item-compact-head">
                      <strong>{item.descricao}</strong>
                      <div className="auth-item-icon-row">
                        <button
                          type="button"
                          className={`icon-button auth-choice-icon is-available ${item.tem_peca ? "active" : ""}`}
                          onClick={() => updateAuthorizationItem(item.item_id, "tem_peca", true)}
                          title="Tem peca"
                          aria-label={`Marcar ${item.descricao} com peca disponivel`}
                        >
                          <AppIcon name="check" size={18} />
                        </button>
                        <button
                          type="button"
                          className={`icon-button auth-choice-icon is-waiting ${!item.tem_peca ? "active" : ""}`}
                          onClick={() => updateAuthorizationItem(item.item_id, "tem_peca", false)}
                          title="Nao tem peca"
                          aria-label={`Marcar ${item.descricao} sem peca disponivel`}
                        >
                          <AppIcon name="clock" size={18} />
                        </button>
                      </div>
                    </div>

                    {!item.tem_peca ? (
                      <div className="auth-item-inline-fields">
                        <label className="field-label">
                          <input
                            type="datetime-local"
                            value={item.previsao_chegada}
                            onChange={(event) => updateAuthorizationItem(item.item_id, "previsao_chegada", event.target.value)}
                          />
                        </label>
                      </div>
                    ) : null}
                  </article>
                ))
              : null}
            {!authorizationLoading && !authorizationItems.length ? <div className="empty-state">Nenhum item encontrado para autorizacao.</div> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={partsControlOpen}
        onClose={() => setPartsControlOpen(false)}
        title={partsControlOrder ? `Pecas - ${partsControlOrder.cliente_nome}` : "Pecas"}
        subtitle={partsControlOrder ? `${partsControlOrder.motocicleta_modelo} - ${partsControlOrder.motocicleta_placa || "Sem placa"}` : ""}
        size="large"
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setPartsControlOpen(false)} disabled={busy}>
              Fechar
            </button>
            <button type="button" className="primary-button" onClick={() => void handleSalvarPrevisoesPeca()} disabled={busy}>
              Salvar prazo
            </button>
          </>
        }
      >
        <div className="modal-stack">
          {partsControlItems.map((item) => (
            <article className="auth-item-compact is-waiting-part" key={`part-control-${item.item_id}`}>
              <div className="auth-item-compact-head">
                <strong>{item.descricao_peca}</strong>
                <div className="auth-item-icon-row">
                  <span className="badge badge-warning">{formatCountdown(item.previsao_chegada, clockNow)}</span>
                  <button
                    type="button"
                    className="icon-button success-button"
                    onClick={() => void handleConfirmarChegadaPeca(item.item_id)}
                    title="Peca chegou"
                    aria-label={`Confirmar chegada da peca ${item.descricao_peca}`}
                    disabled={busy}
                  >
                    <AppIcon name="check" size={18} />
                  </button>
                </div>
              </div>
              <div className="auth-item-fields">
                <label className="field-label">
                  Data e hora
                  <input
                    type="datetime-local"
                    value={item.previsao_chegada}
                    onChange={(event) =>
                      setPartsControlItems((current) =>
                        current.map((entry) =>
                          entry.item_id === item.item_id ? { ...entry, previsao_chegada: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            </article>
          ))}
          {!partsControlItems.length ? <div className="empty-state">Nenhuma peca pendente para ajustar.</div> : null}
        </div>
      </Modal>

      <Modal
        open={sendChoiceOpen}
        onClose={closeSendChoice}
        title="Escolher envio"
        subtitle={pendingSendPayload?.order ? `${pendingSendPayload.order.cliente_nome} - ${pendingSendPayload.order.motocicleta_modelo}` : ""}
        size="small"
        actions={
          <button type="button" className="ghost-button" onClick={closeSendChoice} disabled={busy}>
            Fechar
          </button>
        }
      >
        <div className="selection-grid">
          <button type="button" className="selection-card" onClick={() => void handleSendChoicePdf()} disabled={busy}>
            <strong>
              <AppIcon name="printer" size={18} /> PDF
            </strong>
            <p>Envia o PDF anexado no orcamento externo pelo WhatsApp.</p>
          </button>
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        closeOnBackdrop={false}
        title={selectedOrder ? selectedOrder.cliente_nome : "Orcamento"}
        subtitle={
          selectedOrder
            ? `${selectedOrder.motocicleta_placa || "Sem placa"} - ${selectedOrder.motocicleta_modelo || "Sem modelo"} - ${selectedOrder.motocicleta_cor || "Sem cor"} - ${selectedOrder.motocicleta_ano || "Ano nao informado"}`
            : ""
        }
        size="large"
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setDetailOpen(false)} disabled={busy}>
              Fechar
            </button>
            <div className="orcamento-total-footer">
              <span>Total</span>
              <strong>R$ {formatCurrencyDisplay(totalOrcamento)}</strong>
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={
                busy ||
                !isExternalNumberValid(orcamentoForm.numero_externo) ||
                !String(orcamentoForm.valor_total || "").trim() ||
                (!orcamentoPdfFile && !getLatestOrcamento(selectedOrder || {})?.pdf_url)
              }
              onClick={() => void handleCreateOrcamento()}
            >
              {busy ? "Salvando..." : "Salvar orcamento"}
            </button>
          </>
        }
      >
        {selectedOrder ? (
          <div className="modal-stack">
            {error ? <p className="form-error">{error}</p> : null}
            {feedback ? <p className="field-note">{feedback}</p> : null}
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
                      <p className="preserve-lines">{diagnosticoAtual?.causa_identificada || diagnosticoAtual?.descricao_tecnica || "-"}</p>
                    </div>
                    <div>
                      <span>Pecas</span>
                      <p className="preserve-lines">{diagnosticoAtual?.pecas_sugeridas_resumo || "-"}</p>
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
                  <div className="requested-items-panel orcamento-requested-items">
                    <strong>Itens solicitados pelo cliente</strong>
                    {getClientRequestedItems(selectedOrder).length ? (
                      <div className="requested-items-list">
                        {getClientRequestedItems(selectedOrder).map((item) => (
                          <div className="requested-item-row" key={item.id}>
                            <span>{item.descricao}</span>
                            <small>Qtd {Number(item.quantidade || 1)}</small>
                            <strong>R$ {formatCurrencyDisplay(item.valor_total || 0)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Nenhum item informado na recepcao.</p>
                    )}
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
              <label className={`field-label required-budget-field ${isExternalNumberValid(orcamentoForm.numero_externo) ? "is-valid" : "is-invalid"}`}>
                Numero externo *
                <input
                  value={orcamentoForm.numero_externo}
                  placeholder="#12345"
                  onChange={(event) => setOrcamentoForm((current) => ({ ...current, numero_externo: formatExternalNumber(event.target.value) }))}
                />
              </label>
              <label className={`field-label required-budget-field ${String(orcamentoForm.valor_total || "").trim() ? "is-valid" : "is-invalid"}`}>
                Valor total *
                <input
                  value={formatCurrencyDisplay(orcamentoForm.valor_total)}
                  placeholder="0,00"
                  inputMode="decimal"
                  onChange={(event) => setOrcamentoForm((current) => ({ ...current, valor_total: normalizeCurrencyInput(event.target.value) }))}
                />
              </label>
            </div>

            <label
              className={`orcamento-pdf-dropzone ${orcamentoPdfFile || getLatestOrcamento(selectedOrder)?.pdf_url ? "has-file" : ""}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handlePdfDrop}
            >
              <input
                className="sr-only-file-input"
                type="file"
                accept="application/pdf"
                onChange={(event) => selectOrcamentoPdf(event.target.files?.[0])}
              />
              <span className="orcamento-pdf-icon">
                <AppIcon name="printer" size={24} />
              </span>
              <strong>{orcamentoPdfFile ? orcamentoPdfFile.name : getLatestOrcamento(selectedOrder)?.pdf_url ? "PDF ja anexado" : "Anexar PDF do orcamento"}</strong>
              <small>Arraste o PDF aqui ou clique para selecionar o arquivo gerado no outro sistema.</small>
            </label>

            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Fechamento</p>
                <h2>Observacoes</h2>
              </div>
            </div>

            <label className="field-label">
              <textarea
                value={orcamentoForm.observacoes}
                onChange={(event) => setOrcamentoForm((current) => ({ ...current, observacoes: event.target.value }))}
                placeholder="Observacao final do orcamento"
              />
            </label>

            {getLatestOrcamento(selectedOrder) ? (
              <article className="row-card">
                <div>
                  <strong>
                    <ExternalBudgetLink orcamento={getLatestOrcamento(selectedOrder)} />
                  </strong>
                  <p>R$ {formatCurrencyDisplay(getLatestOrcamento(selectedOrder)?.valor_total || 0)}</p>
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
