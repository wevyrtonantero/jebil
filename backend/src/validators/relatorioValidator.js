const { ApiError } = require("../utils/ApiError");

function validateDate(dateString, fieldName) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new ApiError(400, `Campo ${fieldName} invalido.`);
  }
}

function validateRelatorioQuery(query) {
  const normalized = {
    dia: query.dia ? String(query.dia).trim() : null,
    mes: query.mes ? String(query.mes).trim() : null,
    dataInicio: query.data_inicio ? String(query.data_inicio).trim() : null,
    dataFim: query.data_fim ? String(query.data_fim).trim() : null,
    status: query.status ? String(query.status).trim().toUpperCase() : null,
    mecanicoId: query.mecanico_id ? Number(query.mecanico_id) : null,
    situacaoPagamento: query.situacao_pagamento ? String(query.situacao_pagamento).trim().toUpperCase() : null,
    numeroOs: query.numero_os ? String(query.numero_os).trim() : null,
  };

  if (normalized.dia) {
    validateDate(normalized.dia, "dia");
  }

  if (normalized.mes && !/^\d{4}-\d{2}$/.test(normalized.mes)) {
    throw new ApiError(400, "Campo mes invalido.");
  }

  if (normalized.dataInicio) {
    validateDate(normalized.dataInicio, "data_inicio");
  }

  if (normalized.dataFim) {
    validateDate(normalized.dataFim, "data_fim");
  }

  if (normalized.mecanicoId !== null && Number.isNaN(normalized.mecanicoId)) {
    throw new ApiError(400, "Campo mecanico_id invalido.");
  }

  return normalized;
}

module.exports = {
  validateRelatorioQuery,
};
