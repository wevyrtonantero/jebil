exports.up = async function up(knex) {
  await knex.schema.createTable("mecanicos", (table) => {
    table.bigIncrements("id").primary();
    table.string("nome", 120).notNullable();
    table.string("foto_url", 255).nullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    table.integer("ordem_exibicao").notNullable().defaultTo(0);
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.index(["ativo", "ordem_exibicao"], "idx_mecanicos_ativo_ordem");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("mecanicos");
};
