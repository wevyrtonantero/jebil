import { useEffect, useMemo, useState } from "react";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { useAuth } from "../hooks/useAuth";
import Modal from "../components/common/Modal";
import AppIcon from "../components/common/AppIcon";
import { listMecanicos } from "../services/mecanicoService";
import {
  atribuirExecucaoV2,
  concluirDiagnosticoV2,
  createDiagnosticoV2,
  getOrdemServicoV2,
  listOperacionalV2,
  registrarPrevisaoPecaV2,
  registrarComunicacaoWhatsAppV2,
  retomarItemDaPecaV2,
  updateItemStatusV2,
} from "../services/ordemServicoV2Service";
import { formatPlate } from "../utils/formatters";
import { resolveApiOrigin } from "../utils/apiUrls";
import { sortPatioQueue } from "../utils/patioQueue";

const ORCAMENTISTA_WHATSAPP = "+55 11 97454-0115";

const searchScopes = [
  { id: "placa", label: "Buscar por placa", kind: "text" },
  { id: "cliente", label: "Buscar por cliente", kind: "text" },
  { id: "aguardando_diagnostico", label: "Aguardando diagnostico", kind: "queue" },
  { id: "fila_atendimento", label: "Fila de atendimento", kind: "queue" },
  { id: "em_execucao", label: "Motos em execucao", kind: "queue" },
  { id: "aguardando_peca", label: "Aguardando peca", kind: "queue" },
  { id: "motos_prontas", label: "Motos prontas", kind: "queue" },
];

function getMotoColorTheme(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return {
      background: "rgba(126, 183, 255, 0.18)",
      color: "#eef5ff",
      border: "rgba(126, 183, 255, 0.4)",
    };
  }

  const palettes = [
    { match: ["preta", "preto", "black", "grafite"], background: "#2a3145", color: "#f5f7fb", border: "#56627d" },
    { match: ["branca", "branco", "white", "perola", "perola"], background: "#f4f7fb", color: "#10213f", border: "#c8d3e4" },
    { match: ["prata", "silver"], background: "#cfd6e3", color: "#10213f", border: "#a7b3c8" },
    { match: ["cinza", "gray", "grey"], background: "#98a4b8", color: "#10213f", border: "#7d8aa0" },
    { match: ["azul", "blue"], background: "#7eb7ff", color: "#0d2244", border: "#5a96e6" },
    { match: ["vermelha", "vermelho", "red"], background: "#ff8a8a", color: "#4b0f14", border: "#e66d6d" },
    { match: ["verde", "green"], background: "#8be0a6", color: "#133b22", border: "#65bd81" },
    { match: ["amarela", "amarelo", "yellow"], background: "#ffe17a", color: "#4e3900", border: "#e2c257" },
    { match: ["laranja", "orange"], background: "#ffb26b", color: "#4a2100", border: "#ea9341" },
  ];

  const palette = palettes.find((item) => item.match.some((term) => normalized.includes(term)));

  return palette || {
    background: "rgba(126, 183, 255, 0.18)",
    color: "#eef5ff",
    border: "rgba(126, 183, 255, 0.4)",
  };
}

function getNomeCurto(nome = "") {
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);

  if (partes.length <= 2) {
    return partes.join(" ");
  }

  return `${partes[0]} ${partes[1]}`;
}

function getResumoItens(ordem) {
  return (ordem.items || [])
    .filter((item) => !isDiagnosticPlaceholderItem(item))
    .filter((item) => !["CONCLUIDO", "CANCELADO"].includes(item.status_item))
    .map((item) => item.descricao)
    .filter(Boolean)
    .slice(0, 3)
    .join(" | ");
}

function isDiagnosticPlaceholderItem(item) {
  const descricao = String(item?.descricao || "").trim().toLowerCase();
  return descricao === "diagnostico inicial";
}

function matchesQueue(ordem, scopeId) {
  const itemStatuses = (ordem.items || []).map((item) => item.status_item);

  if (scopeId === "aguardando_diagnostico") {
    return ordem.status_geral === "EM_DIAGNOSTICO" || itemStatuses.includes("AGUARDANDO_DIAGNOSTICO");
  }

  if (scopeId === "fila_atendimento") {
    return itemStatuses.includes("PRONTO_PARA_EXECUTAR");
  }

  if (scopeId === "em_execucao") {
    return itemStatuses.includes("EM_EXECUCAO") || ordem.status_geral === "EM_EXECUCAO";
  }

  if (scopeId === "aguardando_peca") {
    return itemStatuses.includes("AGUARDANDO_PECA");
  }

  if (scopeId === "motos_prontas") {
    return ordem.status_geral === "PRONTA_PARA_RETIRADA";
  }

  return false;
}

function isOperationalOrder(ordem) {
  return !["PRONTA_PARA_RETIRADA", "FINALIZADA", "ARQUIVADA", "CANCELADA"].includes(ordem?.status_geral);
}

function getExecucaoForItem(order, itemId) {
  return (order?.execucoes || []).find((execucao) => Number(execucao.item_ordem_servico_id) === Number(itemId)) || null;
}

function getResponsaveisLabel(order, itemId) {
  const execucao = getExecucaoForItem(order, itemId);

  if (!execucao) {
    return "Selecionar mecanicos";
  }

  const names = (execucao.mecanicos || []).map((mecanico) => mecanico.mecanico_nome).filter(Boolean);
  return names.length ? names.join(", ") : execucao.mecanico_principal_nome || "Selecionar mecanicos";
}

function formatExternalNumber(value = "") {
  const normalized = String(value || "").replace(/^#+/, "").trimStart();
  return normalized ? `#${normalized}` : "";
}

function getPublicAssetUrl(path = "") {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const origin = resolveApiOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function getExternalBudgetLink(order) {
  const externalNumber = formatExternalNumber(order?.numero_externo);

  if (!externalNumber) {
    return null;
  }

  return {
    label: externalNumber,
    pdfUrl: getPublicAssetUrl(order?.orcamento_pdf_url),
  };
}

function itemHasResponsibleMechanic(order, itemId) {
  const execucao = getExecucaoForItem(order, itemId);

  if (!execucao) {
    return false;
  }

  return Boolean(execucao.mecanico_principal_id || (execucao.mecanicos || []).some((mecanico) => mecanico.mecanico_id));
}

function getActiveItems(order) {
  return (order?.items || []).filter((item) => !["CONCLUIDO", "CANCELADO"].includes(item.status_item));
}

function getOperationalItems(order) {
  const items = (order?.items || []).filter((item) => !["CANCELADO"].includes(item.status_item));
  const nonDiagnosticItems = items.filter((item) => !isDiagnosticPlaceholderItem(item));
  return nonDiagnosticItems.length ? nonDiagnosticItems : items;
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

function getPendingPaymentTotal(order) {
  return getOperationalItems(order)
    .filter((item) => item.pagamento_status !== "PAGO")
    .reduce((total, item) => total + Number(item.valor_total || 0), 0);
}

function toMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDiagnosticItem(order) {
  return (order?.items || []).find((item) => ["AGUARDANDO_DIAGNOSTICO", "EM_DIAGNOSTICO"].includes(item.status_item)) || null;
}

function getActiveDiagnostic(order) {
  const diagnosticItem = getDiagnosticItem(order);

  if (!diagnosticItem) {
    return null;
  }

  return (
    (order?.diagnosticos || [])
      .filter((diagnostico) => Number(diagnostico.item_diagnostico_id) === Number(diagnosticItem.id))
      .sort((left, right) => Number(right.id) - Number(left.id))[0] || null
  );
}

function isDiagnosticOrder(order) {
  return Boolean(getDiagnosticItem(order));
}

function canFinalizeOrder(order) {
  const activeItems = getOperationalItems(order).filter((item) => item.status_item !== "CONCLUIDO");

  return (
    activeItems.length > 0 &&
    activeItems.every((item) => ["PRONTO_PARA_EXECUTAR", "EM_EXECUCAO"].includes(item.status_item)) &&
    activeItems.every((item) => itemHasResponsibleMechanic(order, item.id))
  );
}

function getFinalizeBlockReason(order) {
  const activeItems = getOperationalItems(order).filter((item) => item.status_item !== "CONCLUIDO");

  if (!activeItems.length) {
    return "Nenhum servico ativo encontrado para finalizar.";
  }

  const blockedItem = activeItems.find((item) => item.status_item !== "EM_EXECUCAO");
  const blockedRealItem = activeItems.find((item) => !["PRONTO_PARA_EXECUTAR", "EM_EXECUCAO"].includes(item.status_item));
  const itemSemMecanico = activeItems.find((item) => !itemHasResponsibleMechanic(order, item.id));

  if (!blockedRealItem) {
    return itemSemMecanico ? `Vincule o mecanico ao servico ${itemSemMecanico.descricao} antes de finalizar.` : "";
  }

  return `${blockedRealItem.descricao} ainda esta em ${getItemStatusLabel(blockedRealItem.status_item).toLowerCase()}.`;
}

function getItemStatusLabel(status = "") {
  const map = {
    AGUARDANDO_DIAGNOSTICO: "Aguardando diagnostico",
    EM_DIAGNOSTICO: "Em diagnostico",
    DIAGNOSTICADO: "Diagnosticado",
    AGUARDANDO_ORCAMENTO: "Aguardando orcamento",
    AGUARDANDO_AUTORIZACAO: "Aguardando autorizacao",
    PRONTO_PARA_EXECUTAR: "Pronto para executar",
    EM_EXECUCAO: "Em execucao",
    AGUARDANDO_PECA: "Aguardando peca",
    CONCLUIDO: "Concluido",
  };

  return map[status] || status;
}

function formatEstimatedServiceTime(periods) {
  const normalizedPeriods = Math.max(1, Number(periods) || 1);
  const fullDays = Math.floor(normalizedPeriods / 2);
  const hasHalfPeriod = normalizedPeriods % 2 === 1;

  if (!fullDays) {
    return "Meio periodo";
  }

  const daysLabel = `${fullDays} ${fullDays === 1 ? "dia" : "dias"}`;
  return hasHalfPeriod ? `${daysLabel} e meio` : daysLabel;
}

function buildDiagnosticoWhatsappMessage(order, diagnosticoTexto, pecasRecomendadas, mecanicoNome, estimatedPeriods) {
  return [
    "Diagnostico concluido para orcamento.",
    `Placa: ${order?.motocicleta_placa || "Nao informada"}`,
    `Modelo: ${order?.motocicleta_marca ? `${order.motocicleta_marca} ` : ""}${order?.motocicleta_modelo || "Nao informado"}`.trim(),
    `Queixa: ${String(order?.queixa_principal || "").trim() || "Nao informada"}`,
    `Defeito encontrado: ${diagnosticoTexto}`,
    pecasRecomendadas ? `Pecas recomendadas: ${pecasRecomendadas}` : null,
    `Tempo estimado do servico: ${formatEstimatedServiceTime(estimatedPeriods)}`,
    `Diagnostico por: ${mecanicoNome}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDateTimeInput(value = "") {
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

function formatDateTimeLabel(value = "") {
  if (!value) {
    return "Sem previsao";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sem previsao";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivePartPreview(order, itemId) {
  return (
    (order?.previsoes_pecas || [])
      .filter((previsao) => Number(previsao.item_ordem_servico_id) === Number(itemId) && previsao.status_previsao === "ATIVA")
      .sort((left, right) => Number(right.id) - Number(left.id))[0] || null
  );
}

function OperacaoV2Page() {
  const { logout } = useAuth();
  const [ordens, setOrdens] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [candidateOrder, setCandidateOrder] = useState(null);
  const [mecanicos, setMecanicos] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mechanicOpen, setMechanicOpen] = useState(false);
  const [partOpen, setPartOpen] = useState(false);
  const [assigningItem, setAssigningItem] = useState(null);
  const [partItem, setPartItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [searchScope, setSearchScope] = useState(null);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [execucaoForm, setExecucaoForm] = useState({
    item_id: "",
    mecanico_principal_id: "",
    mecanicos_auxiliares_ids: [],
    descricao_execucao: "",
  });
  const [diagnosticoForm, setDiagnosticoForm] = useState({
    descricao: "",
    pecas_recomendadas: "",
    mecanico_principal_id: "",
    periodos_estimados: 1,
  });
  const [partForm, setPartForm] = useState({
    descricao_peca: "",
    previsao_chegada: "",
    observacao: "",
  });

  const activeScope = searchScopes.find((item) => item.id === searchScope) || null;

  const filteredOrdens = useMemo(() => {
    if (!activeScope) {
      return [];
    }

    if (activeScope.kind === "queue") {
      const matchingOrders = ordens.filter((ordem) => matchesQueue(ordem, activeScope.id));
      return activeScope.id === "fila_atendimento" ? sortPatioQueue(matchingOrders) : matchingOrders;
    }

    const normalizedValue =
      activeScope.id === "placa"
        ? searchValue.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
        : searchValue.trim().toLowerCase();

    if (!normalizedValue) {
      return [];
    }

    return ordens.filter((ordem) => {
      if (!isOperationalOrder(ordem)) {
        return false;
      }

      if (activeScope.id === "placa") {
        return String(ordem.motocicleta_placa || "")
          .replace(/[^A-Za-z0-9]/g, "")
          .toUpperCase()
          .includes(normalizedValue);
      }

      return String(ordem.cliente_nome || "").toLowerCase().includes(normalizedValue);
    });
  }, [activeScope, ordens, searchValue]);

  async function loadOrdens() {
    const data = await listOperacionalV2(40);
    setOrdens(data);
  }

  async function loadMecanicos() {
    const data = await listMecanicos({ ativo: true });
    setMecanicos(data.filter((mecanico) => mecanico.ativo));
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrdens().catch(() => {});
      void loadMecanicos().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useRealtimeRefresh(loadOrdens);

  function selectScope(scopeId) {
    setSearchScope(scopeId);
    setSearchValue("");
    setError("");
    setScopeMenuOpen(false);
  }

  function handleSelectOrder(ordem) {
    setCandidateOrder(ordem);
    setConfirmOpen(true);
  }

  async function handleConfirmOrder() {
    if (!candidateOrder) {
      return;
    }

    setConfirmOpen(false);
    setError("");
    const detail = await getOrdemServicoV2(candidateOrder.id);
    const diagnosticoAtivo = getActiveDiagnostic(detail);
    setSelectedOrder(detail);
    setDiagnosticoForm({
      descricao: diagnosticoAtivo?.causa_identificada || diagnosticoAtivo?.descricao_tecnica || "",
      pecas_recomendadas: diagnosticoAtivo?.pecas_sugeridas_resumo || "",
      mecanico_principal_id: diagnosticoAtivo?.mecanico_principal_id ? String(diagnosticoAtivo.mecanico_principal_id) : "",
      periodos_estimados: 1,
    });
    setDetailOpen(true);
  }

  function openMechanicAssignment(item) {
    const execucao = getExecucaoForItem(selectedOrder, item.id);
    const selectedIds = [];

    if (execucao?.mecanico_principal_id) {
      selectedIds.push(String(execucao.mecanico_principal_id));
    }

    (execucao?.mecanicos || []).forEach((mecanico) => {
      const mecanicoId = String(mecanico.mecanico_id);

      if (!selectedIds.includes(mecanicoId)) {
        selectedIds.push(mecanicoId);
      }
    });

    setExecucaoForm({
      item_id: String(item.id),
      mecanico_principal_id: selectedIds[0] || "",
      mecanicos_auxiliares_ids: selectedIds.slice(1),
      descricao_execucao: execucao?.descricao_execucao || "",
    });
    setAssigningItem(item);
    setMechanicOpen(true);
  }

  function openPartModal(item) {
    const previsaoAtiva = getActivePartPreview(selectedOrder, item.id);
    setPartItem(item);
    setPartForm({
      descricao_peca: previsaoAtiva?.descricao_peca || item.descricao || "",
      previsao_chegada: formatDateTimeInput(previsaoAtiva?.previsao_chegada || item.previsao_peca_atual || ""),
      observacao: previsaoAtiva?.observacao || "",
    });
    setPartOpen(true);
  }

  async function refreshSelectedOrder(ordemId) {
    const detail = await getOrdemServicoV2(ordemId);
    setSelectedOrder(detail);
    await loadOrdens();
    return detail;
  }

  async function handleMarcarPronto(item) {
    if (item.status_item === "EM_EXECUCAO") {
      await updateItemStatusV2(selectedOrder.id, item.id, "CONCLUIDO");
    }
  }

  async function handleFinalizarMoto() {
    if (!selectedOrder) {
      return;
    }

    const itensAtivos = getOperationalItems(selectedOrder).filter((item) => item.status_item !== "CONCLUIDO");
    const itensBloqueados = itensAtivos.filter((item) => !["PRONTO_PARA_EXECUTAR", "EM_EXECUCAO"].includes(item.status_item));
    const itemSemMecanico = itensAtivos.find((item) => !itemHasResponsibleMechanic(selectedOrder, item.id));

    if (!itensAtivos.length) {
      setError("Nenhum servico ativo encontrado para finalizar.");
      return;
    }

    if (itensBloqueados.length) {
      setError(`Ainda nao da para finalizar: ${itensBloqueados[0].descricao} esta em ${getItemStatusLabel(itensBloqueados[0].status_item).toLowerCase()}.`);
      return;
    }

    if (itemSemMecanico) {
      setError(`Vincule o mecanico ao servico ${itemSemMecanico.descricao} antes de finalizar.`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      for (const item of itensAtivos) {
        if (item.status_item === "PRONTO_PARA_EXECUTAR") {
          await updateItemStatusV2(selectedOrder.id, item.id, "EM_EXECUCAO");
        }
        await updateItemStatusV2(selectedOrder.id, item.id, "CONCLUIDO");
      }

      const ordemAtualizada = await getOrdemServicoV2(selectedOrder.id);
      const pendingAmount = getPendingPaymentTotal(ordemAtualizada);
      const isQuickService = isAtendimentoRapido(ordemAtualizada);

      setOrdens((current) => current.map((ordem) => (ordem.id === ordemAtualizada.id ? ordemAtualizada : ordem)));
      setDetailOpen(false);
      setSelectedOrder(null);

      if (isQuickService && pendingAmount > 0) {
        window.alert("Servico rapido finalizado.\nOrientar o cliente a fazer o pagamento na recepcao.");
      }

      setFeedback(
        ordemAtualizada.status_geral === "PRONTA_PARA_RETIRADA"
          ? isQuickService
            ? pendingAmount > 0
              ? "Servico rapido finalizado e enviado para a recepcao. Oriente o cliente a fazer o pagamento na recepcao."
              : "Servico rapido finalizado e enviado para a recepcao. Pagamento confirmado."
            : "Moto finalizada e enviada para motos prontas."
          : "Moto finalizada com sucesso.",
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel finalizar a moto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSalvarResponsaveis() {
    const selectedMechanicIds = [execucaoForm.mecanico_principal_id, ...execucaoForm.mecanicos_auxiliares_ids].filter(Boolean);

    if (!selectedOrder || !assigningItem || selectedMechanicIds.length === 0) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const [mecanicoPrincipalId, ...mecanicosAuxiliaresIds] = selectedMechanicIds;

      await atribuirExecucaoV2(selectedOrder.id, assigningItem.id, {
        mecanico_principal_id: Number(mecanicoPrincipalId),
        mecanicos_auxiliares_ids: mecanicosAuxiliaresIds.map((id) => Number(id)),
        descricao_execucao: execucaoForm.descricao_execucao.trim() || null,
      });

      if (assigningItem.status_item === "PRONTO_PARA_EXECUTAR") {
        await updateItemStatusV2(selectedOrder.id, assigningItem.id, "EM_EXECUCAO");
      }

      await refreshSelectedOrder(selectedOrder.id);
      setMechanicOpen(false);
      setAssigningItem(null);
      setFeedback("Servico atualizado e enviado para execucao.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel vincular os mecanicos.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSalvarPrevisaoPeca() {
    if (!selectedOrder || !partItem) {
      return;
    }

    if (!partForm.descricao_peca.trim()) {
      setError("Informe qual peca esta aguardando.");
      return;
    }

    if (!partForm.previsao_chegada) {
      setError("Informe a data e hora previstas para chegada da peca.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await registrarPrevisaoPecaV2(selectedOrder.id, partItem.id, {
        descricao_peca: partForm.descricao_peca.trim(),
        previsao_chegada: partForm.previsao_chegada,
        observacao: partForm.observacao.trim() || null,
      });
      await refreshSelectedOrder(selectedOrder.id);
      setPartOpen(false);
      setPartItem(null);
      setFeedback("Item movido para aguardando peca com prazo registrado.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel registrar a previsao da peca.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetomarPeca(item) {
    if (!selectedOrder) {
      return;
    }

    const execucao = getExecucaoForItem(selectedOrder, item.id);
    const statusDestino = execucao ? "EM_EXECUCAO" : "PRONTO_PARA_EXECUTAR";

    setBusy(true);
    setError("");

    try {
      await retomarItemDaPecaV2(selectedOrder.id, item.id, {
        status_destino: statusDestino,
        observacao: "Peca recebida e item retomado.",
      });
      await refreshSelectedOrder(selectedOrder.id);
      setFeedback("Peca recebida e item devolvido ao fluxo da oficina.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel retomar o item apos a chegada da peca.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSalvarDiagnostico() {
    const diagnosticoTexto = diagnosticoForm.descricao.trim();
    const pecasRecomendadas = diagnosticoForm.pecas_recomendadas.trim();
    const mecanicoPrincipalId = diagnosticoForm.mecanico_principal_id;
    const diagnosticoItem = getDiagnosticItem(selectedOrder);

    if (!selectedOrder || !diagnosticoItem || !diagnosticoTexto || !mecanicoPrincipalId) {
      setError("Preencha o diagnostico e assine com o mecanico responsavel antes de salvar.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      let diagnostico = getActiveDiagnostic(selectedOrder);
      const mecanicoNome =
        mecanicos.find((mecanico) => String(mecanico.id) === String(mecanicoPrincipalId))?.nome ||
        diagnostico?.mecanico_principal_nome ||
        "Nao informado";

      if (!diagnostico) {
        const created = await createDiagnosticoV2(selectedOrder.id, {
          item_diagnostico_id: diagnosticoItem.id,
          mecanico_principal_id: Number(mecanicoPrincipalId),
          queixa_avaliada: selectedOrder.queixa_principal || diagnosticoItem.descricao,
          causa_identificada: diagnosticoTexto,
          descricao_tecnica: diagnosticoTexto,
          pecas_sugeridas_resumo: pecasRecomendadas || null,
          observacoes: diagnosticoTexto,
        });
        diagnostico = created.diagnostico;
      }

      await concluirDiagnosticoV2(diagnostico.id, {
        causa_identificada: diagnosticoTexto,
        descricao_tecnica: diagnosticoTexto,
        pecas_sugeridas_resumo: pecasRecomendadas || null,
        observacoes: diagnosticoTexto,
        enviar_orcamentista: true,
      });

      const mensagemPreparada = buildDiagnosticoWhatsappMessage(
        selectedOrder,
        diagnosticoTexto,
        pecasRecomendadas,
        mecanicoNome,
        diagnosticoForm.periodos_estimados,
      );

      await registrarComunicacaoWhatsAppV2(selectedOrder.id, {
        tipo_comunicacao: "OFICINA_ORCAMENTISTA",
        destinatario: ORCAMENTISTA_WHATSAPP,
        finalidade: "Envio do diagnostico da oficina para o orcamentista.",
        mensagem_preparada: mensagemPreparada,
        diagnostico_id: diagnostico.id,
        status_registro: "WHATSAPP_ABERTO",
      });

      const whatsappDigits = ORCAMENTISTA_WHATSAPP.replace(/\D/g, "");
      window.open(`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(mensagemPreparada)}`, "_blank", "noopener,noreferrer");

      await refreshSelectedOrder(selectedOrder.id);
      setDetailOpen(false);
      setSelectedOrder(null);
      setDiagnosticoForm({ descricao: "", pecas_recomendadas: "", mecanico_principal_id: "", periodos_estimados: 1 });
      setFeedback("Diagnostico salvo e enviado para o orcamentista.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel salvar o diagnostico.");
    } finally {
      setBusy(false);
    }
  }

  function toggleMecanico(mecanicoId) {
    const selectedId = String(mecanicoId);

    setExecucaoForm((current) => {
      const currentSelectedIds = [current.mecanico_principal_id, ...current.mecanicos_auxiliares_ids].filter(Boolean);
      const nextSelectedIds = currentSelectedIds.includes(selectedId)
        ? currentSelectedIds.filter((id) => id !== selectedId)
        : [...currentSelectedIds, selectedId];

      return {
        ...current,
        mecanico_principal_id: nextSelectedIds[0] || "",
        mecanicos_auxiliares_ids: nextSelectedIds.slice(1),
      };
    });
  }

  return (
    <section className="page-section operacao-tablet-page operacao-immersive-page">
      <div className="operacao-search-panel">
        <div className="operacao-search-header">
          <div>
            <p className="eyebrow">Operacao</p>
            <h1>Localizar moto</h1>
          </div>
          <button type="button" className="ghost-button operacao-logout-button" onClick={logout}>
            Sair
          </button>
        </div>

        <div className="operacao-search-block">
          <div className="operacao-scope-picker">
            <button type="button" className="ghost-button operacao-scope-button" onClick={() => setScopeMenuOpen((current) => !current)}>
              <AppIcon name="search" size={18} />
              <span>{activeScope ? activeScope.label : "Selecionar busca"}</span>
            </button>

            {scopeMenuOpen ? (
              <div className="operacao-scope-menu">
                {searchScopes.map((scope) => (
                  <button key={scope.id} type="button" className="operacao-scope-option" onClick={() => selectScope(scope.id)}>
                    {scope.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {activeScope?.kind === "text" ? (
            <label className="field-label operacao-search-field">
              {activeScope.id === "placa" ? "Placa" : "Nome do cliente"}
              <input
                value={searchValue}
                placeholder={activeScope.id === "placa" ? "ABC1D23" : "Digite o nome"}
                onChange={(event) => {
                  setError("");
                  setSearchValue(activeScope.id === "placa" ? formatPlate(event.target.value) : event.target.value);
                }}
              />
            </label>
          ) : null}
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {feedback ? <p className="field-note">{feedback}</p> : null}
      </div>

      <div className="operacao-results-panel">
        {!activeScope ? (
          <div className="operacao-empty-state">
            <AppIcon name="search" size={28} />
            <strong>Escolha como voce quer procurar</strong>
            <p>Selecione placa, cliente ou uma fila da oficina.</p>
          </div>
        ) : filteredOrdens.length === 0 ? (
          <div className="operacao-empty-state">
            <AppIcon name="motorcycle" size={28} />
            <strong>Nenhuma moto encontrada</strong>
            <p>Ajuste a busca para localizar a motocicleta certa.</p>
          </div>
        ) : (
          <div className="operacao-card-grid">
            {filteredOrdens.map((ordem) => (
              <article className="operacao-mini-card" key={ordem.id}>
                <div className="operacao-mini-copy">
                  <strong>{getNomeCurto(ordem.cliente_nome)}</strong>
                  <p>
                    {ordem.motocicleta_modelo}
                    {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                  </p>
                  <small>{getResumoItens(ordem) || "Sem itens planejados"}</small>
                </div>
                <div className="operacao-mini-meta">
                  <button type="button" className="icon-button operacao-confirm-icon" onClick={() => handleSelectOrder(ordem)} aria-label={`Selecionar ${ordem.cliente_nome}`}>
                    <AppIcon name="check" size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={candidateOrder ? candidateOrder.cliente_nome : "Confirmar motocicleta"}
        subtitle={candidateOrder ? `${candidateOrder.motocicleta_modelo} - ${candidateOrder.motocicleta_placa || "Sem placa"}` : ""}
        size="small"
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setConfirmOpen(false)}>
              Nao
            </button>
            <button type="button" className="primary-button" onClick={() => void handleConfirmOrder()}>
              Sim
            </button>
          </>
        }
      >
        {candidateOrder ? (
          <article
            className="detail-row operacao-color-card"
            style={(() => {
              const theme = getMotoColorTheme(candidateOrder.motocicleta_cor);
              return {
                background: theme.background,
                color: theme.color,
                borderColor: theme.border,
              };
            })()}
          >
            <strong>Cor da moto</strong>
            <p>{candidateOrder.motocicleta_cor || "Nao informada"}</p>
          </article>
        ) : null}
      </Modal>

      <Modal
        open={mechanicOpen}
        onClose={() => setMechanicOpen(false)}
        title="Equipe da moto"
        subtitle={assigningItem ? assigningItem.descricao : "Selecione um ou mais mecanicos."}
        size="medium"
        zIndex={1100}
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setMechanicOpen(false)} disabled={busy}>
              Fechar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSalvarResponsaveis()}
              disabled={busy || ![execucaoForm.mecanico_principal_id, ...execucaoForm.mecanicos_auxiliares_ids].filter(Boolean).length}
            >
              Salvar servico
            </button>
          </>
        }
      >
        <div className="modal-stack">
          <div className="button-row operacao-mecanicos-grid">
            {mecanicos.map((mecanico) => {
              const selectedMechanicIds = [execucaoForm.mecanico_principal_id, ...execucaoForm.mecanicos_auxiliares_ids].filter(Boolean);
              const isActive = selectedMechanicIds.includes(String(mecanico.id));

              return (
                <button key={mecanico.id} type="button" className={`toggle-chip ${isActive ? "active" : ""}`} onClick={() => toggleMecanico(mecanico.id)}>
                  {mecanico.nome}
                </button>
              );
            })}
          </div>

          <label className="field-label">
            Observacao
            <textarea
              rows={4}
              value={execucaoForm.descricao_execucao}
              onChange={(event) => setExecucaoForm((current) => ({ ...current, descricao_execucao: event.target.value }))}
              placeholder="Relate algo importante sobre este servico"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedOrder ? selectedOrder.cliente_nome : "Prontuario"}
        subtitle={selectedOrder ? `${selectedOrder.motocicleta_modelo} - ${selectedOrder.motocicleta_placa || "Sem placa"}` : ""}
        size="large"
        actions={
          isDiagnosticOrder(selectedOrder) ? (
            <>
              <button type="button" className="ghost-button" onClick={() => setDetailOpen(false)} disabled={busy}>
                Fechar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSalvarDiagnostico()}
                disabled={busy || !diagnosticoForm.descricao.trim() || !diagnosticoForm.mecanico_principal_id}
              >
                Salvar diagnostico
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ghost-button" onClick={() => setDetailOpen(false)} disabled={busy}>
                Fechar
              </button>
              {!canFinalizeOrder(selectedOrder) ? (
                <span className="operacao-finalize-hint">
                  <AppIcon name="clock" size={14} />
                  {getFinalizeBlockReason(selectedOrder)}
                </span>
              ) : null}
              <button type="button" className="primary-button" onClick={() => void handleFinalizarMoto()} disabled={busy || !canFinalizeOrder(selectedOrder)}>
                Finalizar moto
              </button>
            </>
          )
        }
      >
        {selectedOrder ? (
          <div className="modal-stack">
            {isDiagnosticOrder(selectedOrder) ? (
              <>
                <article className="detail-row">
                  <strong>Queixa do cliente</strong>
                  <p>{selectedOrder.queixa_principal || "Nao informada."}</p>
                </article>

                <article className="detail-row">
                  <strong>Servico em diagnostico</strong>
                  <p>{getDiagnosticItem(selectedOrder)?.descricao || "-"}</p>
                </article>

                <label className="field-label">
                  Assinatura do mecanico
                  <select
                    value={diagnosticoForm.mecanico_principal_id}
                    onChange={(event) =>
                      setDiagnosticoForm((current) => ({ ...current, mecanico_principal_id: event.target.value }))
                    }
                  >
                    <option value="">Selecione o mecanico</option>
                    {mecanicos.map((mecanico) => (
                      <option key={mecanico.id} value={mecanico.id}>
                        {mecanico.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-label">
                  Diagnostico encontrado
                  <textarea
                    rows={6}
                    value={diagnosticoForm.descricao}
                    onChange={(event) => setDiagnosticoForm((current) => ({ ...current, descricao: event.target.value }))}
                    placeholder="Descreva o defeito encontrado para enviar ao orcamentista"
                  />
                </label>

                <label className="field-label">
                  Pecas recomendadas
                  <textarea
                    rows={4}
                    value={diagnosticoForm.pecas_recomendadas}
                    onChange={(event) =>
                      setDiagnosticoForm((current) => ({ ...current, pecas_recomendadas: event.target.value }))
                    }
                    placeholder="Liste as pecas que devem entrar no orcamento"
                  />
                </label>

                <div className="diagnostico-time-estimate">
                  <div>
                    <strong>Tempo estimado do servico</strong>
                  </div>
                  <div className="diagnostico-time-controls">
                    <button
                      type="button"
                      className="ghost-button diagnostico-time-button"
                      onClick={() =>
                        setDiagnosticoForm((current) => ({
                          ...current,
                          periodos_estimados: Math.max(1, current.periodos_estimados - 1),
                        }))
                      }
                      disabled={diagnosticoForm.periodos_estimados <= 1}
                      aria-label="Retirar meio periodo"
                    >
                      -
                    </button>
                    <output className="diagnostico-time-value" aria-live="polite">
                      <span>{formatEstimatedServiceTime(diagnosticoForm.periodos_estimados)}</span>
                    </output>
                    <button
                      type="button"
                      className="primary-button diagnostico-time-button"
                      onClick={() =>
                        setDiagnosticoForm((current) => ({
                          ...current,
                          periodos_estimados: Math.min(60, current.periodos_estimados + 1),
                        }))
                      }
                      disabled={diagnosticoForm.periodos_estimados >= 60}
                      aria-label="Adicionar meio periodo"
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <article className="detail-row operacao-modal-summary is-compact">
                  <div className="operacao-modal-summary-metrics">
                    <span className="summary-pill strong" title="Total de servicos no fluxo">
                      <AppIcon name="reports" size={14} />
                      {getOperationalItems(selectedOrder).length}
                    </span>
                    <span className="summary-pill" title="Servicos em execucao">
                      <AppIcon name="workshop" size={14} />
                      {getOperationalItems(selectedOrder).filter((item) => item.status_item === "EM_EXECUCAO").length}
                    </span>
                    {getExternalBudgetLink(selectedOrder) ? (
                      getExternalBudgetLink(selectedOrder).pdfUrl ? (
                        <a
                          className="summary-pill external-budget-link"
                          href={getExternalBudgetLink(selectedOrder).pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir PDF do orcamento"
                        >
                          {getExternalBudgetLink(selectedOrder).label}
                        </a>
                      ) : (
                        <span className="summary-pill" title="Numero externo">
                          {getExternalBudgetLink(selectedOrder).label}
                        </span>
                      )
                    ) : null}
                  </div>
                </article>

                <div className="table-list operacao-service-list operacao-service-board">
                  {getOperationalItems(selectedOrder).map((item) => (
                    <article className="row-card operacao-service-card" key={item.id}>
                      <div className="operacao-service-copy">
                        <div className="operacao-service-topline">
                          <strong>{item.descricao}</strong>
                          <span className={`operacao-status-chip status-${String(item.status_item || "").toLowerCase()}`}>
                            {getItemStatusLabel(item.status_item)}
                          </span>
                        </div>
                        <div className="operacao-service-meta">
                          <span className="operacao-meta-pill" title="Responsavel">
                            <AppIcon name="mechanic" size={14} />
                            {getResponsaveisLabel(selectedOrder, item.id)}
                          </span>
                          <span
                            className={`operacao-meta-pill ${item.pagamento_status === "PAGO" ? "is-paid" : "is-pending"}`}
                            title={item.pagamento_status === "PAGO" ? "Pagamento confirmado" : "Pagamento pendente"}
                          >
                            <AppIcon name="money" size={14} />
                            {item.pagamento_status === "PAGO" ? "Ok" : "Pendente"}
                          </span>
                        </div>
                        {item.status_item === "AGUARDANDO_PECA" ? (
                          <p className="operacao-part-note">
                            <AppIcon name="clock" size={14} />
                            {getActivePartPreview(selectedOrder, item.id)?.descricao_peca || item.descricao} ate{" "}
                            {formatDateTimeLabel(getActivePartPreview(selectedOrder, item.id)?.previsao_chegada || item.previsao_peca_atual)}
                          </p>
                        ) : null}
                        {getExecucaoForItem(selectedOrder, item.id)?.descricao_execucao ? (
                          <p className="operacao-service-observation">{getExecucaoForItem(selectedOrder, item.id)?.descricao_execucao}</p>
                        ) : null}
                      </div>
                      <div className="row-actions operacao-service-actions">
                        <button
                          type="button"
                          className="icon-button operacao-action-icon"
                          onClick={() => openMechanicAssignment(item)}
                          disabled={busy}
                          aria-label="Definir equipe"
                          title="Definir equipe"
                        >
                          <AppIcon name="mechanic" size={18} />
                        </button>
                        {item.status_item === "AGUARDANDO_PECA" ? (
                          <>
                            <button
                              type="button"
                              className="icon-button operacao-action-icon"
                              onClick={() => openPartModal(item)}
                              disabled={busy}
                              aria-label="Editar prazo da peca"
                              title="Editar prazo da peca"
                            >
                              <AppIcon name="clock" size={18} />
                            </button>
                            <button
                              type="button"
                              className="icon-button operacao-action-icon is-success"
                              onClick={() => void handleRetomarPeca(item)}
                              disabled={busy}
                              aria-label="Peca chegou"
                              title="Peca chegou"
                            >
                              <AppIcon name="check" size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="icon-button operacao-action-icon"
                            onClick={() => openPartModal(item)}
                            disabled={busy}
                            aria-label="Colocar em aguardando peca"
                            title="Colocar em aguardando peca"
                          >
                            <AppIcon name="clock" size={18} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={partOpen}
        onClose={() => setPartOpen(false)}
        title="Aguardando peca"
        subtitle={partItem ? partItem.descricao : "Informe qual item ficou pendente e a previsao de chegada."}
        size="medium"
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setPartOpen(false)} disabled={busy}>
              Fechar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSalvarPrevisaoPeca()}
              disabled={busy || !partForm.descricao_peca.trim() || !partForm.previsao_chegada}
            >
              Ok - aguardando peca
            </button>
          </>
        }
      >
        <div className="modal-stack">
          <label className="field-label">
            Peca aguardando
            <input
              value={partForm.descricao_peca}
              placeholder="Ex.: Carburador, relacao, cabo..."
              onChange={(event) => setPartForm((current) => ({ ...current, descricao_peca: event.target.value }))}
            />
          </label>

          <label className="field-label">
            Data e hora previstas
            <input
              type="datetime-local"
              value={partForm.previsao_chegada}
              onChange={(event) => setPartForm((current) => ({ ...current, previsao_chegada: event.target.value }))}
            />
          </label>

          <label className="field-label">
            Observacao
            <textarea
              rows={4}
              value={partForm.observacao}
              onChange={(event) => setPartForm((current) => ({ ...current, observacao: event.target.value }))}
              placeholder="Opcional: fornecedor, urgencia ou algum detalhe"
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}

export default OperacaoV2Page;
