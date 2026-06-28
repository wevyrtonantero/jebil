exports.up = async function up(knex) {
  await knex.schema.alterTable("ordens_servico", (table) => {
    table.boolean("cadastro_fotos_finalizado").notNullable().defaultTo(false);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("ordens_servico", (table) => {
    table.dropColumn("cadastro_fotos_finalizado");
  });
};
