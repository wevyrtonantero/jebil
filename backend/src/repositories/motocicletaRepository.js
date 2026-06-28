const db = require("../database/connection");

function applyMotocicletaFilters(query, filters) {
  if (filters.modelo) {
    query.where("motocicletas.modelo", "like", `%${filters.modelo}%`);
  }

  if (filters.placaNormalizada) {
    query.where("motocicletas.placa_normalizada", filters.placaNormalizada);
  }

  if (filters.proprietario) {
    query.where("clientes.nome", "like", `%${filters.proprietario}%`);
  }

  if (filters.clienteId) {
    query.where("motocicletas.cliente_id", filters.clienteId);
  }

  if (typeof filters.ativo === "boolean") {
    query.where("motocicletas.ativo", filters.ativo);
  }
}

function baseMotocicletaSelect() {
  return db("motocicletas")
    .leftJoin("clientes", "clientes.id", "motocicletas.cliente_id")
    .select(
      "motocicletas.id",
      "motocicletas.cliente_id",
      "motocicletas.marca",
      "motocicletas.modelo",
      "motocicletas.ano",
      "motocicletas.cor",
      "motocicletas.placa",
      "motocicletas.placa_normalizada",
      "motocicletas.km",
      "motocicletas.observacoes",
      "motocicletas.ativo",
      "motocicletas.criado_em",
      "motocicletas.atualizado_em",
      "clientes.nome as cliente_nome",
    );
}

async function list(filters, pagination) {
  const dataQuery = baseMotocicletaSelect().modify((query) => applyMotocicletaFilters(query, filters));
  const countQuery = db("motocicletas")
    .leftJoin("clientes", "clientes.id", "motocicletas.cliente_id")
    .count({ total: "*" })
    .modify((query) => applyMotocicletaFilters(query, filters));

  if (pagination) {
    dataQuery.limit(pagination.limit).offset(pagination.offset);
  }

  dataQuery.orderBy("motocicletas.modelo", "asc").orderBy("motocicletas.id", "asc");

  const [rows, [{ total }]] = await Promise.all([dataQuery, countQuery]);

  return {
    rows,
    total: Number(total),
  };
}

async function findById(id) {
  return baseMotocicletaSelect().where("motocicletas.id", id).first();
}

async function findByClienteId(clienteId) {
  return baseMotocicletaSelect()
    .where("motocicletas.cliente_id", clienteId)
    .andWhere("motocicletas.ativo", true)
    .orderBy("motocicletas.modelo", "asc");
}

async function findByPlacaNormalizada(placaNormalizada) {
  if (!placaNormalizada) {
    return null;
  }

  return baseMotocicletaSelect().where("motocicletas.placa_normalizada", placaNormalizada).first();
}

async function findActiveByPlacaNormalizada(placaNormalizada, ignoredId = null) {
  if (!placaNormalizada) {
    return null;
  }

  const query = baseMotocicletaSelect()
    .where("motocicletas.placa_normalizada", placaNormalizada)
    .andWhere("motocicletas.ativo", true);

  if (ignoredId) {
    query.whereNot("motocicletas.id", ignoredId);
  }

  return query.first();
}

async function insert(payload) {
  const [id] = await db("motocicletas").insert({
    cliente_id: payload.clienteId,
    marca: payload.marca,
    modelo: payload.modelo,
    ano: payload.ano,
    cor: payload.cor,
    placa: payload.placa,
    placa_normalizada: payload.placaNormalizada,
    km: payload.km,
    observacoes: payload.observacoes,
    ativo: true,
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function update(id, payload) {
  await db("motocicletas").where({ id }).update({
    cliente_id: payload.clienteId,
    marca: payload.marca,
    modelo: payload.modelo,
    ano: payload.ano,
    cor: payload.cor,
    placa: payload.placa,
    placa_normalizada: payload.placaNormalizada,
    km: payload.km,
    observacoes: payload.observacoes,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function updateStatus(id, ativo) {
  await db("motocicletas").where({ id }).update({
    ativo,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

module.exports = {
  list,
  findById,
  findByClienteId,
  findByPlacaNormalizada,
  findActiveByPlacaNormalizada,
  insert,
  update,
  updateStatus,
};
