const db = require("../database/connection");

function baseSelect() {
  return db("mecanicos").select(
    "id",
    "nome",
    "foto_url",
    "ativo",
    "disponivel_hoje",
    "ordem_exibicao",
    "criado_em",
    "atualizado_em",
  );
}

async function list(filters = {}) {
  const query = baseSelect();

  if (typeof filters.ativo === "boolean") {
    query.where("ativo", filters.ativo);
  }

  return query.orderBy("ordem_exibicao", "asc").orderBy("nome", "asc");
}

async function findById(id) {
  return baseSelect().where({ id }).first();
}

async function insert(payload) {
  const [id] = await db("mecanicos").insert({
    nome: payload.nome,
    foto_url: payload.fotoUrl || null,
    ativo: true,
    disponivel_hoje: payload.disponivelHoje ?? true,
    ordem_exibicao: payload.ordemExibicao,
    criado_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function update(id, payload) {
  await db("mecanicos").where({ id }).update({
    nome: payload.nome,
    ordem_exibicao: payload.ordemExibicao,
    disponivel_hoje: payload.disponivelHoje ?? true,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function updateStatus(id, ativo) {
  await db("mecanicos").where({ id }).update({
    ativo,
    disponivel_hoje: ativo ? db.raw("disponivel_hoje") : false,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function updateDisponibilidade(id, disponivelHoje) {
  await db("mecanicos").where({ id }).update({
    disponivel_hoje: disponivelHoje,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

async function updateFoto(id, fotoUrl) {
  await db("mecanicos").where({ id }).update({
    foto_url: fotoUrl,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

module.exports = {
  list,
  findById,
  insert,
  update,
  updateStatus,
  updateDisponibilidade,
  updateFoto,
};
