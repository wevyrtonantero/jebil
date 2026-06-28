/**
 * Decisao tecnica desta migration:
 * Usamos placa_normalizada e unicidade composta com ativo para permitir
 * a regra "placa unica quando preenchida entre motos ativas".
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("motocicletas", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("cliente_id").unsigned().notNullable();
    table.string("marca", 80).nullable();
    table.string("modelo", 120).notNullable();
    table.string("cor", 50).nullable();
    table.string("placa", 10).nullable();
    table.string("placa_normalizada", 10).nullable();
    table.integer("km").nullable();
    table.text("observacoes").nullable();
    table.boolean("ativo").notNullable().defaultTo(true);
    table.dateTime("criado_em").notNullable().defaultTo(knex.fn.now());
    table.dateTime("atualizado_em").notNullable().defaultTo(knex.fn.now());

    table
      .foreign("cliente_id", "fk_motocicletas_cliente_id")
      .references("clientes.id")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE");

    table.unique(["placa_normalizada", "ativo"], {
      indexName: "uk_motocicletas_placa_normalizada_ativo",
    });
    table.index(["cliente_id"], "idx_motocicletas_cliente_id");
    table.index(["modelo"], "idx_motocicletas_modelo");
    table.index(["placa_normalizada"], "idx_motocicletas_placa_normalizada");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("motocicletas");
};
