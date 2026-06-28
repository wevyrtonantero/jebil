const db = require("../database/connection");

function baseSelect() {
  return db("usuarios").select(
    "id",
    "nome",
    "email",
    "senha_hash",
    "perfil",
    "ativo",
    "ultimo_login_em",
    "criado_em",
    "atualizado_em",
  );
}

async function findByEmail(email) {
  return baseSelect().where({ email }).first();
}

async function findById(id) {
  return baseSelect().where({ id }).first();
}

async function updateLastLogin(id) {
  await db("usuarios").where({ id }).update({
    ultimo_login_em: db.fn.now(),
    atualizado_em: db.fn.now(),
  });
}

async function findByPerfil(perfil) {
  return baseSelect().where({ perfil }).first();
}

async function updatePassword(id, senhaHash) {
  await db("usuarios").where({ id }).update({
    senha_hash: senhaHash,
    atualizado_em: db.fn.now(),
  });

  return findById(id);
}

module.exports = {
  findByEmail,
  findById,
  findByPerfil,
  updateLastLogin,
  updatePassword,
};
