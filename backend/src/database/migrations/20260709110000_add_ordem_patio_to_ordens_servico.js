exports.up = async function up(knex) {
  await knex.schema.alterTable("ordens_servico", (table) => {
    table.integer("ordem_patio").unsigned().nullable().after("prioridade_agregada");
    table.index(["ordem_patio"], "idx_ordens_servico_ordem_patio");
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("ordens_servico", (table) => {
    table.dropIndex(["ordem_patio"], "idx_ordens_servico_ordem_patio");
    table.dropColumn("ordem_patio");
  });
};
