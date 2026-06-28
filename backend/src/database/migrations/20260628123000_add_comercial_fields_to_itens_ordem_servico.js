exports.up = async function up(knex) {
  await knex.schema.alterTable("itens_ordem_servico", (table) => {
    table.decimal("quantidade", 10, 2).notNullable().defaultTo(1);
    table.decimal("valor_unitario", 12, 2).notNullable().defaultTo(0);
    table.decimal("valor_total", 12, 2).notNullable().defaultTo(0);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("itens_ordem_servico", (table) => {
    table.dropColumn("valor_total");
    table.dropColumn("valor_unitario");
    table.dropColumn("quantidade");
  });
};
