/**
 * Decisao tecnica desta migration:
 * Criamos cpf_normalizado para garantir unicidade de CPF mesmo quando
 * houver mascara na interface, inclusive para clientes inativos.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("clientes", (table) => {
    table.bigIncrements("id").primary();
    table.string("nome", 160).notNullable();
    table.string("telefone", 20).nullable();
    table.string("cpf", 14).nullable();
    table.string("cpf_normalizado", 11).nullable();
    table.text("observacoes").nullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table.unique(["cpf_normalizado"], {
      indexName: "uk_clientes_cpf_normalizado",
    });
    table.index(["nome"], "idx_clientes_nome");
    table.index(["telefone"], "idx_clientes_telefone");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("clientes");
};
