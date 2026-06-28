const { ApiError } = require("../utils/ApiError");
const { parseBoolean } = require("../utils/parseBoolean");

function validateMecanicoPayload(payload) {
  const nome = String(payload.nome || "").trim();
  const disponibilidadeInformada = payload.disponivel_hoje !== undefined ? parseBoolean(payload.disponivel_hoje) : true;
  const ordemExibicao =
    payload.ordem_exibicao === undefined || payload.ordem_exibicao === null || payload.ordem_exibicao === ""
      ? 0
      : Number(payload.ordem_exibicao);

  if (!nome) {
    throw new ApiError(400, "Nome do mecanico e obrigatorio.");
  }

  if (!Number.isInteger(ordemExibicao) || ordemExibicao < 0) {
    throw new ApiError(400, "ordem_exibicao deve ser um numero inteiro maior ou igual a zero.");
  }

  if (disponibilidadeInformada === null) {
    throw new ApiError(400, "O campo disponivel_hoje deve ser true ou false.");
  }

  return {
    nome,
    ordemExibicao,
    disponivelHoje: disponibilidadeInformada,
  };
}

function validateMecanicoStatusPayload(payload) {
  const ativo = parseBoolean(payload.ativo);

  if (ativo === null) {
    throw new ApiError(400, "O campo ativo deve ser true ou false.");
  }

  return {
    ativo,
  };
}

function validateMecanicoDisponibilidadePayload(payload) {
  const disponivelHoje = parseBoolean(payload.disponivel_hoje);

  if (disponivelHoje === null) {
    throw new ApiError(400, "O campo disponivel_hoje deve ser true ou false.");
  }

  return {
    disponivelHoje,
  };
}

module.exports = {
  validateMecanicoPayload,
  validateMecanicoStatusPayload,
  validateMecanicoDisponibilidadePayload,
};
