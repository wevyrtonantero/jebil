/**
 * Decisao tecnica desta migration:
 * A tabela de controle anual permite gerar OS no formato OS-AAAA-NNNNNN
 * com seguranca transacional e sem depender do front-end.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("controle_sequencias_os", (table) => {
    table.integer("ano").primary();
    table.integer("ultimo_numero").notNullable().defaultTo(0);
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("controle_sequencias_os");
};
