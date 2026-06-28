/**
 * Decisao tecnica desta migration:
 * Mantemos usuarios separados de mecanicos e definimos perfis fixos
 * diretamente no banco para proteger a regra de permissao no backend.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("usuarios", (table) => {
    table.bigIncrements("id").primary();
    table.string("nome", 120).notNullable();
    table.string("email", 160).notNullable();
    table.string("senha_hash", 255).notNullable();
    table.enu("perfil", ["ADMIN", "RECEPCAO", "OFICINA"], {
      useNative: true,
      enumName: "perfil_usuario_enum",
    }).notNullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    table.dateTime("ultimo_login_em").nullable();
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["email"], {
      indexName: "uk_usuarios_email",
    });
    table.index(["perfil", "ativo"], "idx_usuarios_perfil_ativo");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("usuarios");
};
