exports.up = async function up(knex) {
  await knex.schema.alterTable("assinaturas_recebimento", (table) => {
    table.string("pdf_url", 255).nullable().after("assinatura_data_url");
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("assinaturas_recebimento", (table) => {
    table.dropColumn("pdf_url");
  });
};
