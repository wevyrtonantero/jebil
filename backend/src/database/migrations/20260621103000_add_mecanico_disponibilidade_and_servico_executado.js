exports.up = async function up(knex) {
  await knex.schema.alterTable("mecanicos", (table) => {
    table.boolean("disponivel_hoje").notNullable().defaultTo(true);
  });

  await knex.schema.alterTable("atendimentos", (table) => {
    table.text("servico_executado").nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("atendimentos", (table) => {
    table.dropColumn("servico_executado");
  });

  await knex.schema.alterTable("mecanicos", (table) => {
    table.dropColumn("disponivel_hoje");
  });
};
