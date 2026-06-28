const { ApiError } = require("../utils/ApiError");
const { normalizePlate } = require("../utils/normalizePlate");
const { parseBoolean } = require("../utils/parseBoolean");
const { validatePlate } = require("../utils/validatePlate");

function validateMotocicletaPayload(payload) {
  const clienteId = Number(payload.cliente_id);
  const marca = payload.marca ? String(payload.marca).trim() : null;
  const modelo = String(payload.modelo || "").trim();
  const ano = payload.ano === undefined || payload.ano === null || payload.ano === "" ? null : Number(payload.ano);
  const cor = payload.cor ? String(payload.cor).trim() : null;
  const placa = payload.placa ? String(payload.placa).trim().toUpperCase() : null;
  const placaNormalizada = normalizePlate(placa);
  const km = payload.km === undefined || payload.km === null || payload.km === "" ? null : Number(payload.km);
  const observacoes = payload.observacoes ? String(payload.observacoes).trim() : null;
  const currentYear = new Date().getFullYear() + 1;

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    throw new ApiError(400, "cliente_id invalido.");
  }

  if (!modelo) {
    throw new ApiError(400, "Modelo da motocicleta e obrigatorio.");
  }

  if (placa && !validatePlate(placa)) {
    throw new ApiError(400, "Placa invalida.");
  }

  if (ano !== null && (!Number.isInteger(ano) || ano < 1950 || ano > currentYear)) {
    throw new ApiError(400, "Ano da motocicleta invalido.");
  }

  if (km !== null && (!Number.isInteger(km) || km < 0)) {
    throw new ApiError(400, "KM deve ser um numero inteiro positivo.");
  }

  return {
    clienteId,
    marca,
    modelo,
    ano,
    cor,
    placa,
    placaNormalizada,
    km,
    observacoes,
  };
}

function validateMotocicletaStatusPayload(payload) {
  const ativo = parseBoolean(payload.ativo);

  if (ativo === null) {
    throw new ApiError(400, "O campo ativo deve ser true ou false.");
  }

  return {
    ativo,
  };
}

module.exports = {
  validateMotocicletaPayload,
  validateMotocicletaStatusPayload,
};
