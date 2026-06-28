const { ApiError } = require("../utils/ApiError");
const { normalizeCpf } = require("../utils/normalizeCpf");
const { parseBoolean } = require("../utils/parseBoolean");

function validateClientePayload(payload) {
  const nome = String(payload.nome || "").trim();
  const telefone = payload.telefone ? String(payload.telefone).trim() : null;
  const cpf = payload.cpf ? String(payload.cpf).trim() : null;
  const observacoes = payload.observacoes ? String(payload.observacoes).trim() : null;
  const cpfNormalizado = normalizeCpf(cpf);

  if (!nome) {
    throw new ApiError(400, "Nome do cliente e obrigatorio.");
  }

  return {
    nome,
    telefone,
    cpf,
    cpfNormalizado,
    observacoes,
  };
}

function validateClienteStatusPayload(payload) {
  const ativo = parseBoolean(payload.ativo);

  if (ativo === null) {
    throw new ApiError(400, "O campo ativo deve ser true ou false.");
  }

  return {
    ativo,
  };
}

module.exports = {
  validateClientePayload,
  validateClienteStatusPayload,
};
