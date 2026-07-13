const { ApiError } = require("../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination");
const { normalizePlate } = require("../utils/normalizePlate");
const { parseBoolean } = require("../utils/parseBoolean");
const clienteRepository = require("../repositories/clienteRepository");
const motocicletaRepository = require("../repositories/motocicletaRepository");

function sanitizeMotocicleta(motocicleta) {
  return {
    id: motocicleta.id,
    cliente_id: motocicleta.cliente_id,
    cliente_nome: motocicleta.cliente_nome,
    marca: motocicleta.marca,
    modelo: motocicleta.modelo,
    ano: motocicleta.ano,
    cor: motocicleta.cor,
    placa: motocicleta.placa,
    km: motocicleta.km,
    observacoes: motocicleta.observacoes,
    ativo: Boolean(motocicleta.ativo),
    criado_em: motocicleta.criado_em,
    atualizado_em: motocicleta.atualizado_em,
  };
}

async function ensureClienteExists(clienteId) {
  const cliente = await clienteRepository.findById(clienteId);

  if (!cliente) {
    throw new ApiError(404, "Cliente informado nao foi encontrado.");
  }

  return cliente;
}

async function listMotocicletas(query) {
  const pagination = parsePagination(query);
  const filters = {
    modelo: query.modelo ? String(query.modelo).trim() : null,
    placaNormalizada: query.placa ? normalizePlate(query.placa) : null,
    proprietario: query.proprietario ? String(query.proprietario).trim() : null,
    clienteId: query.cliente_id ? Number(query.cliente_id) : null,
    ativo: parseBoolean(query.ativo),
  };

  const result = await motocicletaRepository.list(filters, pagination);

  return {
    rows: result.rows.map(sanitizeMotocicleta),
    meta: buildPaginationMeta(result.total, pagination),
  };
}

async function getMotocicletaById(id) {
  const motocicleta = await motocicletaRepository.findById(id);

  if (!motocicleta) {
    throw new ApiError(404, "Motocicleta nao encontrada.");
  }

  return sanitizeMotocicleta(motocicleta);
}

async function listMotocicletasByClienteId(clienteId) {
  await ensureClienteExists(clienteId);
  const motocicletas = await motocicletaRepository.findByClienteId(clienteId);

  return motocicletas.map(sanitizeMotocicleta);
}

async function createMotocicleta(payload) {
  await ensureClienteExists(payload.clienteId);

  if (payload.placaNormalizada) {
    const duplicatedPlate = await motocicletaRepository.findByPlacaNormalizada(payload.placaNormalizada);

    if (duplicatedPlate) {
      throw new ApiError(
        409,
        duplicatedPlate.ativo
          ? "Ja existe motocicleta ativa com esta placa."
          : "Ja existe motocicleta inativa com esta placa. Reative o cadastro existente.",
        {
          existingId: duplicatedPlate.id,
          canReactivate: !duplicatedPlate.ativo,
        },
      );
    }
  }

  const motocicleta = await motocicletaRepository.insert(payload);

  return sanitizeMotocicleta(motocicleta);
}

async function updateMotocicleta(id, payload) {
  const existing = await motocicletaRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Motocicleta nao encontrada.");
  }

  await ensureClienteExists(payload.clienteId);

  if (Number(existing.cliente_id) !== Number(payload.clienteId) && await motocicletaRepository.hasActiveOrder(existing.id)) {
    throw new ApiError(409, "Nao e possivel transferir esta motocicleta porque existe uma OS ativa para ela.");
  }

  if (payload.placaNormalizada) {
    const duplicatedPlate = await motocicletaRepository.findByPlacaNormalizada(payload.placaNormalizada);

    if (duplicatedPlate && duplicatedPlate.id !== existing.id) {
      throw new ApiError(
        409,
        duplicatedPlate.ativo
          ? "Ja existe motocicleta ativa com esta placa."
          : "Ja existe motocicleta inativa com esta placa. Reative o cadastro existente.",
        {
          existingId: duplicatedPlate.id,
          canReactivate: !duplicatedPlate.ativo,
        },
      );
    }
  }

  const motocicleta = await motocicletaRepository.update(id, payload);

  return sanitizeMotocicleta(motocicleta);
}

async function updateMotocicletaStatus(id, ativo) {
  const existing = await motocicletaRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Motocicleta nao encontrada.");
  }

  if (ativo && existing.placa_normalizada) {
    const duplicatedActive = await motocicletaRepository.findActiveByPlacaNormalizada(existing.placa_normalizada, existing.id);

    if (duplicatedActive) {
      throw new ApiError(409, "Nao e possivel reativar esta motocicleta porque ja existe outra ativa com a mesma placa.", {
        existingId: duplicatedActive.id,
      });
    }
  }

  const motocicleta = await motocicletaRepository.updateStatus(id, ativo);

  return sanitizeMotocicleta(motocicleta);
}

async function reactivateMotocicleta(id) {
  return updateMotocicletaStatus(id, true);
}

module.exports = {
  listMotocicletas,
  getMotocicletaById,
  listMotocicletasByClienteId,
  createMotocicleta,
  updateMotocicleta,
  updateMotocicletaStatus,
  reactivateMotocicleta,
};
