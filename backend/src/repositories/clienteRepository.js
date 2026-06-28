const db = require("../database/connection");

function applyClienteFilters(query, filters) {
  if (filters.nome) {
    query.where("clientes.nome", "like", `%${filters.nome}%`);
  }

  if (filters.telefone) {
    query.where("clientes.telefone", "like", `%${filters.telefone}%`);
  }

  if (filters.cpfNormalizado) {
    query.where("clientes.cpf_normalizado", filters.cpfNormalizado);
  }

  if (typeof filters.ativo === "boolean") {
    query.where("clientes.ativo", filters.ativo);
  }
}

function baseClienteSelect() {
  return db("clientes").select(
    "clientes.id",
    "clientes.nome",
    "clientes.telefone",
    "clientes.cpf",
    "clientes.cpf_normalizado",
    "clientes.observacoes",
    "clientes.ativo",
    "clientes.criado_em",
    "clientes.atualizado_em",
  );
}

async function list(filters, pagination) {
  const dataQuery = baseClienteSelect().modify((query) => applyClienteFilters(query, filters));
  const countQuery = db("clientes").count({ total: "*" }).modify((query) => applyClienteFilters(query, filters));

  if (pagination) {
    dataQuery.limit(pagination.limit).offset(pagination.offset);
  }

  dataQuery.orderBy("clientes.nome", "asc");

  const [rows, [{ total }]] = await Promise.all([dataQuery, countQuery]);

  return {
    rows,
    total: Number(total),
  };
}

async function findById(id) {
  return baseClienteSelect().where("clientes.id", id).first();
}

async function findByCpfNormalizado(cpfNormalizado) {
  if (!cpfNormalizado) {
    return null;
  }

  return baseClienteSelect().where("clientes.cpf_normalizado", cpfNormalizado).first();
}

async function insert(payload) {
  const [id] = await db("clientes").insert({
    nome: payload.nome,
    telefone: payload.telefone,
    cpf: payload.cpf,
    cpf_normalizado: payload.cpfNormalizado,
    observacoes: payload.observacoes,
    ativo: true,
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function update(id, payload) {
  await db("clientes").where({ id }).update({
    nome: payload.nome,
    telefone: payload.telefone,
    cpf: payload.cpf,
    cpf_normalizado: payload.cpfNormalizado,
    observacoes: payload.observacoes,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function updateStatus(id, ativo) {
  await db("clientes").where({ id }).update({
    ativo,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

module.exports = {
  list,
  findById,
  findByCpfNormalizado,
  insert,
  update,
  updateStatus,
};
