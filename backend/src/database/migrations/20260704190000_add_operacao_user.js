const { hashPassword } = require("../../utils/hashPassword");

exports.up = async function up(knex) {
  const email = process.env.SEED_OPERACAO_EMAIL || "operacaoo";
  const senha = process.env.SEED_OPERACAO_PASSWORD || "123";
  const senhaHash = await hashPassword(senha);
  const existente = await knex("usuarios").where({ email }).first();

  const payload = {
    nome: "Operacao",
    email,
    senha_hash: senhaHash,
    perfil: "RECEPCAO",
    ativo: true,
    atualizado_em: knex.fn.now(),
  };

  if (existente) {
    await knex("usuarios").where({ id: existente.id }).update(payload);
    return;
  }

  await knex("usuarios").insert({
    ...payload,
    criado_em: knex.fn.now(),
  });
};

exports.down = async function down(knex) {
  const email = process.env.SEED_OPERACAO_EMAIL || "operacaoo";
  await knex("usuarios").where({ email }).del();
};
