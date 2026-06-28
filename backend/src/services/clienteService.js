const { ApiError } = require("../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination");
const { normalizeCpf } = require("../utils/normalizeCpf");
const { parseBoolean } = require("../utils/parseBoolean");
const clienteRepository = require("../repositories/clienteRepository");

function sanitizeCliente(cliente) {
  return {
    id: cliente.id,
    nome: cliente.nome,
    telefone: cliente.telefone,
    cpf: cliente.cpf,
    observacoes: cliente.observacoes,
    ativo: Boolean(cliente.ativo),
    criado_em: cliente.criado_em,
    atualizado_em: cliente.atualizado_em,
  };
}

async function listClientes(query) {
  const pagination = parsePagination(query);
  const filters = {
    nome: query.nome ? String(query.nome).trim() : null,
    telefone: query.telefone ? String(query.telefone).trim() : null,
    cpfNormalizado: query.cpf ? normalizeCpf(query.cpf) : null,
    ativo: parseBoolean(query.ativo),
  };

  const result = await clienteRepository.list(filters, pagination);

  return {
    rows: result.rows.map(sanitizeCliente),
    meta: buildPaginationMeta(result.total, pagination),
  };
}

async function getClienteById(id) {
  const cliente = await clienteRepository.findById(id);

  if (!cliente) {
    throw new ApiError(404, "Cliente nao encontrado.");
  }

  return sanitizeCliente(cliente);
}

async function createCliente(payload) {
  const duplicatedCpf = payload.cpfNormalizado
    ? await clienteRepository.findByCpfNormalizado(payload.cpfNormalizado)
    : null;

  if (duplicatedCpf) {
    throw new ApiError(
      409,
      duplicatedCpf.ativo
        ? "Ja existe cliente com este CPF."
        : "Ja existe cliente inativo com este CPF. Reative o cadastro existente.",
      {
        existingId: duplicatedCpf.id,
        canReactivate: !duplicatedCpf.ativo,
      },
    );
  }

  const cliente = await clienteRepository.insert(payload);

  return sanitizeCliente(cliente);
}

async function updateCliente(id, payload) {
  const existing = await clienteRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Cliente nao encontrado.");
  }

  if (payload.cpfNormalizado) {
    const duplicatedCpf = await clienteRepository.findByCpfNormalizado(payload.cpfNormalizado);

    if (duplicatedCpf && duplicatedCpf.id !== existing.id) {
      throw new ApiError(
        409,
        duplicatedCpf.ativo
          ? "Ja existe cliente com este CPF."
          : "Ja existe cliente inativo com este CPF. Reative o cadastro existente.",
        {
          existingId: duplicatedCpf.id,
          canReactivate: !duplicatedCpf.ativo,
        },
      );
    }
  }

  const cliente = await clienteRepository.update(id, payload);

  return sanitizeCliente(cliente);
}

async function updateClienteStatus(id, ativo) {
  const existing = await clienteRepository.findById(id);

  if (!existing) {
    throw new ApiError(404, "Cliente nao encontrado.");
  }

  const cliente = await clienteRepository.updateStatus(id, ativo);

  return sanitizeCliente(cliente);
}

async function reactivateCliente(id) {
  return updateClienteStatus(id, true);
}

module.exports = {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  updateClienteStatus,
  reactivateCliente,
};
