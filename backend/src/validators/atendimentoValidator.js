const { ApiError } = require("../utils/ApiError");

const allowedPaymentStatuses = new Set(["PENDENTE", "PAGO"]);
const allowedOperationalStatuses = new Set(["EM_SERVICO", "AGUARDANDO_PECAS", "SAIDA_PARA_TESTE"]);

function validateAtendimentoPayload(payload) {
  const clienteId = Number(payload.cliente_id);
  const motocicletaId = Number(payload.motocicleta_id);
  const problemaServico = String(payload.problema_servico || "").trim();
  const observacoes = payload.observacoes ? String(payload.observacoes).trim() : null;
  const observacoesInternas = payload.observacoes_internas ? String(payload.observacoes_internas).trim() : null;
  const situacaoPagamento = String(payload.situacao_pagamento || "PENDENTE").trim().toUpperCase();

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    throw new ApiError(400, "cliente_id invalido.");
  }

  if (!Number.isInteger(motocicletaId) || motocicletaId <= 0) {
    throw new ApiError(400, "motocicleta_id invalido.");
  }

  if (!problemaServico) {
    throw new ApiError(400, "problema_servico e obrigatorio.");
  }

  if (!allowedPaymentStatuses.has(situacaoPagamento)) {
    throw new ApiError(400, "situacao_pagamento deve ser PENDENTE ou PAGO.");
  }

  return {
    clienteId,
    motocicletaId,
    problemaServico,
    observacoes,
    observacoesInternas,
    situacaoPagamento,
  };
}

function validateConclusaoPayload(payload) {
  const servicoExecutado = String(payload.servico_executado || "").trim();

  if (!servicoExecutado) {
    throw new ApiError(400, "servico_executado e obrigatorio para concluir o atendimento.");
  }

  return {
    servicoExecutado,
  };
}

function validatePagamentoPayload(payload) {
  const situacaoPagamento = String(payload.situacao_pagamento || "").trim().toUpperCase();

  if (!allowedPaymentStatuses.has(situacaoPagamento)) {
    throw new ApiError(400, "situacao_pagamento deve ser PENDENTE ou PAGO.");
  }

  return {
    situacaoPagamento,
  };
}

function validateRecepcaoUpdatePayload(payload) {
  const problemaServico = payload.problema_servico === undefined ? undefined : String(payload.problema_servico || "").trim();
  const observacoes = payload.observacoes === undefined ? undefined : String(payload.observacoes || "").trim();
  const observacoesInternas =
    payload.observacoes_internas === undefined ? undefined : String(payload.observacoes_internas || "").trim();
  const situacaoPagamento =
    payload.situacao_pagamento === undefined ? undefined : String(payload.situacao_pagamento || "").trim().toUpperCase();

  if (problemaServico !== undefined && !problemaServico) {
    throw new ApiError(400, "problema_servico nao pode ficar vazio.");
  }

  if (situacaoPagamento !== undefined && !allowedPaymentStatuses.has(situacaoPagamento)) {
    throw new ApiError(400, "situacao_pagamento deve ser PENDENTE ou PAGO.");
  }

  if (
    problemaServico === undefined &&
    observacoes === undefined &&
    observacoesInternas === undefined &&
    situacaoPagamento === undefined
  ) {
    throw new ApiError(400, "Informe ao menos um campo para atualizar.");
  }

  return {
    problemaServico,
    observacoes,
    observacoesInternas,
    situacaoPagamento,
  };
}

function validateAssumirPayload(payload) {
  const mecanicoId = Number(payload.mecanico_id);

  if (!Number.isInteger(mecanicoId) || mecanicoId <= 0) {
    throw new ApiError(400, "mecanico_id invalido.");
  }

  return {
    mecanicoId,
  };
}

function validateStatusPayload(payload) {
  const status = String(payload.status || "").trim().toUpperCase();

  if (!allowedOperationalStatuses.has(status)) {
    throw new ApiError(400, "Status operacional invalido.");
  }

  return {
    status,
  };
}

function validateCancelarPayload(payload) {
  const motivo = String(payload.motivo || "").trim();

  if (!motivo) {
    throw new ApiError(400, "Motivo do cancelamento e obrigatorio.");
  }

  return {
    motivo,
  };
}

module.exports = {
  validateAtendimentoPayload,
  validateAssumirPayload,
  validateStatusPayload,
  validateConclusaoPayload,
  validatePagamentoPayload,
  validateRecepcaoUpdatePayload,
  validateCancelarPayload,
};
