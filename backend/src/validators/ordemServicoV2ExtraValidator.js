const { ApiError } = require("../utils/ApiError");

const allowedWhatsappTypes = new Set([
  "RECEPCAO_CLIENTE",
  "OFICINA_ORCAMENTISTA",
  "ORCAMENTISTA_CLIENTE",
  "SERVICO_FINALIZADO",
]);

const allowedWhatsappStatus = new Set(["PREPARADA", "WHATSAPP_ABERTO"]);
const allowedOrcamentoStatus = new Set(["RASCUNHO", "PENDENTE_ENVIO", "ENVIADO", "APROVADO", "PARCIAL", "RECUSADO", "ARQUIVADO"]);
const allowedOrcamentoItemAuthStatus = new Set([
  "NAO_SE_APLICA",
  "AGUARDANDO_RESPOSTA",
  "AUTORIZADO",
  "NAO_AUTORIZADO",
  "PARCIALMENTE_AUTORIZADO",
  "CANCELADO",
]);
const allowedStatusDestinoPeca = new Set(["PRONTO_PARA_EXECUTAR", "EM_EXECUCAO"]);

function validateRegistrarComunicacaoWhatsAppPayload(payload) {
  const tipoComunicacao = String(payload.tipo_comunicacao || "").trim().toUpperCase();
  const destinatario = String(payload.destinatario || "").trim();
  const finalidade = String(payload.finalidade || "").trim();
  const mensagemPreparada = payload.mensagem_preparada ? String(payload.mensagem_preparada).trim() : null;
  const statusRegistro = String(payload.status_registro || "PREPARADA").trim().toUpperCase();
  const diagnosticoId = payload.diagnostico_id ? Number(payload.diagnostico_id) : null;
  const orcamentoId = payload.orcamento_id ? Number(payload.orcamento_id) : null;

  if (!allowedWhatsappTypes.has(tipoComunicacao)) {
    throw new ApiError(400, "tipo_comunicacao invalido.");
  }

  if (!destinatario) {
    throw new ApiError(400, "destinatario e obrigatorio.");
  }

  if (!finalidade) {
    throw new ApiError(400, "finalidade e obrigatoria.");
  }

  if (!allowedWhatsappStatus.has(statusRegistro)) {
    throw new ApiError(400, "status_registro invalido.");
  }

  return {
    tipoComunicacao,
    destinatario,
    finalidade,
    mensagemPreparada,
    statusRegistro,
    diagnosticoId,
    orcamentoId,
  };
}

function validateCreateOrcamentoPayload(payload) {
  const numeroExterno = String(payload.numero_externo || "").trim();
  const statusOrcamento = String(payload.status_orcamento || "RASCUNHO").trim().toUpperCase();
  const observacoes = payload.observacoes ? String(payload.observacoes).trim() : null;
  const dataPrometida = payload.data_prometida ? String(payload.data_prometida).trim() : null;

  if (!/^#.+$/.test(numeroExterno)) {
    throw new ApiError(400, "numero_externo deve comecar com #.");
  }

  if (!allowedOrcamentoStatus.has(statusOrcamento)) {
    throw new ApiError(400, "status_orcamento invalido.");
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ApiError(400, "Informe ao menos um item no orcamento.");
  }

  return {
    numeroExterno,
    statusOrcamento,
    observacoes,
    dataPrometida,
    items: payload.items.map((item, index) => {
      const descricao = String(item.descricao || "").trim();
      const quantidade = Number(item.quantidade || 1);
      const valorPeca = Number(item.valor_peca || 0);
      const valorMaoObra = Number(item.valor_mao_obra || 0);
      const valorTotal = Number(item.valor_total ?? valorPeca + valorMaoObra);
      const observacao = item.observacao ? String(item.observacao).trim() : null;
      const origem = item.origem ? String(item.origem).trim() : null;
      const autorizacaoStatus = String(item.autorizacao_status || "AGUARDANDO_RESPOSTA").trim().toUpperCase();
      const itemOrdemServicoId = item.item_ordem_servico_id ? Number(item.item_ordem_servico_id) : null;

      if (!descricao) {
        throw new ApiError(400, `descricao do item de orcamento ${index + 1} e obrigatoria.`);
      }

      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        throw new ApiError(400, `quantidade invalida no item de orcamento ${index + 1}.`);
      }

      if (![valorPeca, valorMaoObra, valorTotal].every(Number.isFinite)) {
        throw new ApiError(400, `valores invalidos no item de orcamento ${index + 1}.`);
      }

      if (!allowedOrcamentoItemAuthStatus.has(autorizacaoStatus)) {
        throw new ApiError(400, `autorizacao_status invalido no item de orcamento ${index + 1}.`);
      }

      return {
        itemOrdemServicoId,
        descricao,
        quantidade,
        valorPeca,
        valorMaoObra,
        valorTotal,
        observacao,
        origem,
        autorizacaoStatus,
      };
    }),
  };
}

function validateUpdateOrcamentoStatusPayload(payload) {
  const statusOrcamento = String(payload.status_orcamento || "").trim().toUpperCase();
  const observacoes = payload.observacoes ? String(payload.observacoes).trim() : null;

  if (!allowedOrcamentoStatus.has(statusOrcamento)) {
    throw new ApiError(400, "status_orcamento invalido.");
  }

  return {
    statusOrcamento,
    observacoes,
  };
}

function validateRegistrarPrevisaoPecaPayload(payload) {
  const descricaoPeca = String(payload.descricao_peca || "").trim();
  const previsaoChegada = payload.previsao_chegada ? String(payload.previsao_chegada).trim() : null;
  const observacao = payload.observacao ? String(payload.observacao).trim() : null;

  if (!descricaoPeca) {
    throw new ApiError(400, "descricao_peca e obrigatoria.");
  }

  return {
    descricaoPeca,
    previsaoChegada,
    observacao,
  };
}

function validateRetomarItemDaPecaPayload(payload) {
  const statusDestino = String(payload.status_destino || "PRONTO_PARA_EXECUTAR").trim().toUpperCase();
  const observacao = payload.observacao ? String(payload.observacao).trim() : null;

  if (!allowedStatusDestinoPeca.has(statusDestino)) {
    throw new ApiError(400, "status_destino invalido.");
  }

  return {
    statusDestino,
    observacao,
  };
}

function validateAtribuirExecucaoPayload(payload) {
  const mecanicoPrincipalId = Number(payload.mecanico_principal_id);
  const descricaoExecucao = payload.descricao_execucao ? String(payload.descricao_execucao).trim() : null;
  const mecanicosAuxiliaresIds = Array.isArray(payload.mecanicos_auxiliares_ids)
    ? payload.mecanicos_auxiliares_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (!Number.isInteger(mecanicoPrincipalId) || mecanicoPrincipalId <= 0) {
    throw new ApiError(400, "mecanico_principal_id invalido.");
  }

  return {
    mecanicoPrincipalId,
    descricaoExecucao,
    mecanicosAuxiliaresIds,
  };
}

module.exports = {
  validateRegistrarComunicacaoWhatsAppPayload,
  validateCreateOrcamentoPayload,
  validateUpdateOrcamentoStatusPayload,
  validateRegistrarPrevisaoPecaPayload,
  validateRetomarItemDaPecaPayload,
  validateAtribuirExecucaoPayload,
};
