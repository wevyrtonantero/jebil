const { hashPassword } = require("../../utils/hashPassword");

exports.seed = async function seed(knex) {
  const agora = knex.fn.now();
  const usuarios = [
    {
      nome: "Administrador",
      email: process.env.SEED_ADMIN_EMAIL || "admin@jebil.local",
      senha: process.env.SEED_ADMIN_PASSWORD || "123",
      perfil: "ADMIN",
    },
    {
      nome: "Recepcao",
      email: process.env.SEED_RECEPCAO_EMAIL || "recepcao@jebil.local",
      senha: process.env.SEED_RECEPCAO_PASSWORD || "123",
      perfil: "RECEPCAO",
    },
    {
      nome: "Oficina",
      email: process.env.SEED_OFICINA_EMAIL || "oficina@jebil.local",
      senha: process.env.SEED_OFICINA_PASSWORD || "123",
      perfil: "OFICINA",
    },
    {
      nome: "Orcamentista",
      email: process.env.SEED_ORCAMENTISTA_EMAIL || "orcamentista@jebil.local",
      senha: process.env.SEED_ORCAMENTISTA_PASSWORD || "123",
      perfil: "ORCAMENTISTA",
    },
  ];

  for (const usuario of usuarios) {
    const existente = await knex("usuarios").where({ email: usuario.email }).first();

    const payload = {
      nome: usuario.nome,
      email: usuario.email,
      senha_hash: await hashPassword(usuario.senha),
      perfil: usuario.perfil,
      ativo: true,
      atualizado_em: agora,
    };

    if (existente) {
      await knex("usuarios").where({ id: existente.id }).update(payload);
    } else {
      await knex("usuarios").insert({
        ...payload,
        criado_em: agora,
      });
    }
  }
};
