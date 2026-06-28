exports.up = async function up(knex) {
  await knex.schema.alterTable("motocicletas", (table) => {
    table.integer("ano").nullable();
  });

  await knex.schema.alterTable("ordens_servico", (table) => {
    table.boolean("buscar_moto").notNullable().defaultTo(false);
    table.text("endereco_retirada").nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("ordens_servico", (table) => {
    table.dropColumn("endereco_retirada");
    table.dropColumn("buscar_moto");
  });

  await knex.schema.alterTable("motocicletas", (table) => {
    table.dropColumn("ano");
  });
};
