const perfisUsuarioV2 = ["DIRETORIA", "RECEPCAO", "OFICINA", "SUPERVISAO", "OPERACAO"];

const prioridadeNiveisV2 = ["NORMAL", "ALTA", "URGENTE"];
const autorizacaoStatusV2 = [
  "NAO_SE_APLICA",
  "AGUARDANDO_RESPOSTA",
  "AUTORIZADO",
  "NAO_AUTORIZADO",
  "PARCIALMENTE_AUTORIZADO",
  "CANCELADO",
];
const pagamentoStatusV2 = ["PENDENTE", "PAGO"];
const itemOrigensV2 = ["SOLICITADO_CLIENTE", "GERADO_DIAGNOSTICO", "INCLUIDO_ORCAMENTISTA", "RETORNO_GARANTIA"];
const itemStatusV2 = [
  "SOLICITADO",
  "AGUARDANDO_DIAGNOSTICO",
  "EM_DIAGNOSTICO",
  "DIAGNOSTICADO",
  "AGUARDANDO_ORCAMENTO",
  "AGUARDANDO_AUTORIZACAO",
  "AGUARDANDO_PECA",
  "PRONTO_PARA_EXECUTAR",
  "EM_EXECUCAO",
  "CONCLUIDO",
  "EM_GARANTIA",
  "CANCELADO",
];
const ordemServicoStatusV2 = [
  "ABERTA",
  "EM_DIAGNOSTICO",
  "EM_ORCAMENTO",
  "AGUARDANDO_CLIENTE",
  "AGUARDANDO_PECA",
  "EM_EXECUCAO",
  "PARCIALMENTE_CONCLUIDA",
  "PRONTA_PARA_RETIRADA",
  "FINALIZADA",
  "ARQUIVADA",
  "CANCELADA",
];

const itemTransitionMap = new Map([
  ["SOLICITADO", new Set(["AGUARDANDO_DIAGNOSTICO", "AGUARDANDO_AUTORIZACAO", "PRONTO_PARA_EXECUTAR", "CANCELADO"])],
  ["AGUARDANDO_DIAGNOSTICO", new Set(["EM_DIAGNOSTICO", "CANCELADO"])],
  ["EM_DIAGNOSTICO", new Set(["DIAGNOSTICADO", "AGUARDANDO_DIAGNOSTICO", "CANCELADO"])],
  ["DIAGNOSTICADO", new Set(["AGUARDANDO_ORCAMENTO", "PRONTO_PARA_EXECUTAR", "CANCELADO"])],
  ["AGUARDANDO_ORCAMENTO", new Set(["AGUARDANDO_AUTORIZACAO", "PRONTO_PARA_EXECUTAR", "CANCELADO"])],
  ["AGUARDANDO_AUTORIZACAO", new Set(["PRONTO_PARA_EXECUTAR", "CANCELADO"])],
  ["AGUARDANDO_PECA", new Set(["PRONTO_PARA_EXECUTAR", "EM_EXECUCAO", "CANCELADO"])],
  ["PRONTO_PARA_EXECUTAR", new Set(["EM_EXECUCAO", "AGUARDANDO_PECA", "CANCELADO"])],
  ["EM_EXECUCAO", new Set(["AGUARDANDO_PECA", "CONCLUIDO", "CANCELADO"])],
  ["CONCLUIDO", new Set(["EM_GARANTIA"])],
  ["EM_GARANTIA", new Set(["PRONTO_PARA_EXECUTAR", "CONCLUIDO", "CANCELADO"])],
  ["CANCELADO", new Set()],
]);

function canTransitionItemStatus(currentStatus, nextStatus) {
  return itemTransitionMap.get(currentStatus)?.has(nextStatus) || false;
}

function resolveInitialItemStatus(item) {
  if (item.execucaoDireta) {
    return ["AUTORIZADO", "NAO_SE_APLICA"].includes(item.autorizacaoStatus) ? "PRONTO_PARA_EXECUTAR" : "AGUARDANDO_AUTORIZACAO";
  }

  if (item.exigeDiagnostico) {
    return "AGUARDANDO_DIAGNOSTICO";
  }

  if (["AUTORIZADO", "NAO_SE_APLICA"].includes(item.autorizacaoStatus)) {
    return "PRONTO_PARA_EXECUTAR";
  }

  return "AGUARDANDO_AUTORIZACAO";
}

function derivePrioridadeAgregada(items = [], fallback = "NORMAL") {
  if (items.some((item) => item.prioridade === "URGENTE")) {
    return "URGENTE";
  }

  if (items.some((item) => item.prioridade === "ALTA")) {
    return "ALTA";
  }

  return fallback;
}

function deriveOrdemServicoStatus(items = [], lifecycle = {}) {
  if (lifecycle.canceladaEm) {
    return "CANCELADA";
  }

  if (lifecycle.arquivadaEm) {
    return "ARQUIVADA";
  }

  if (lifecycle.finalizadaEm) {
    return "FINALIZADA";
  }

  if (!items.length) {
    return "ABERTA";
  }

  const activeItems = items.filter((item) => item.statusItem !== "CANCELADO");

  if (!activeItems.length) {
    return "ARQUIVADA";
  }

  if (activeItems.some((item) => item.statusItem === "EM_EXECUCAO")) {
    return "EM_EXECUCAO";
  }

  if (activeItems.some((item) => item.statusItem === "AGUARDANDO_PECA")) {
    return "AGUARDANDO_PECA";
  }

  if (activeItems.some((item) => item.statusItem === "AGUARDANDO_AUTORIZACAO")) {
    return "AGUARDANDO_CLIENTE";
  }

  if (activeItems.some((item) => item.statusItem === "AGUARDANDO_ORCAMENTO")) {
    return "EM_ORCAMENTO";
  }

  if (activeItems.some((item) => item.statusItem === "EM_DIAGNOSTICO" || item.statusItem === "AGUARDANDO_DIAGNOSTICO")) {
    return "EM_DIAGNOSTICO";
  }

  const hasConcluido = activeItems.some((item) => item.statusItem === "CONCLUIDO");
  const hasOpenWork = activeItems.some((item) => !["CONCLUIDO", "CANCELADO"].includes(item.statusItem));

  if (hasConcluido && hasOpenWork) {
    return "PARCIALMENTE_CONCLUIDA";
  }

  if (activeItems.every((item) => item.statusItem === "CONCLUIDO")) {
    return "PRONTA_PARA_RETIRADA";
  }

  return "ABERTA";
}

module.exports = {
  perfisUsuarioV2,
  prioridadeNiveisV2,
  autorizacaoStatusV2,
  pagamentoStatusV2,
  itemOrigensV2,
  itemStatusV2,
  ordemServicoStatusV2,
  canTransitionItemStatus,
  resolveInitialItemStatus,
  derivePrioridadeAgregada,
  deriveOrdemServicoStatus,
};
