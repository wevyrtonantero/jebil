const { hashPassword } = require("../../utils/hashPassword");

async function setUsuariosPerfilEnum(knex, values) {
  const enumValues = values.map((value) => `'${value}'`).join(", ");
  await knex.raw(`ALTER TABLE usuarios MODIFY COLUMN perfil ENUM(${enumValues}) NOT NULL`);
}

exports.up = async function up(knex) {
  const email = process.env.SEED_OPERACAO_EMAIL || "operacaoo";
  const senha = process.env.SEED_OPERACAO_PASSWORD || "123";

  await setUsuariosPerfilEnum(knex, ["DIRETORIA", "RECEPCAO", "OFICINA", "SUPERVISAO", "OPERACAO"]);

  const existente = await knex("usuarios").where({ email }).first();
  const payload = {
    nome: "Operacao",
    email,
    perfil: "OPERACAO",
    ativo: true,
    atualizado_em: knex.fn.now(),
  };

  if (existente) {
    await knex("usuarios").where({ id: existente.id }).update(payload);
    return;
  }

  await knex("usuarios").insert({
    ...payload,
    senha_hash: await hashPassword(senha),
    criado_em: knex.fn.now(),
  });
};

exports.down = async function down(knex) {
  await knex("usuarios").where({ perfil: "OPERACAO" }).update({
    perfil: "RECEPCAO",
    atualizado_em: knex.fn.now(),
  });

  await setUsuariosPerfilEnum(knex, ["DIRETORIA", "RECEPCAO", "OFICINA", "SUPERVISAO"]);
};
